import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "../lib/db.js";
import { authenticateRequest } from "../lib/auth.js";
import { ensureEventRatingsTable } from "../lib/event-ratings.js";
import { ensureTicketPurchasesTable } from "../lib/ticket-purchases.js";

const RATING_WINDOW_MS = 24 * 60 * 60 * 1000;

function parseBody(body: unknown) {
  if (typeof body === "string") {
    return JSON.parse(body);
  }
  return body ?? {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      await ensureEventRatingsTable();

      const eventId = Number(req.query?.eventId);
      const authUser = await authenticateRequest(req);
      const userColumns = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users'
      `;
      const userColumnNames = new Set(userColumns.map((column: any) => String(column.column_name)));
      const userJoinColumn = userColumnNames.has("user_id")
        ? "user_id"
        : userColumnNames.has("id")
          ? "id"
          : null;

      const summaryRows = Number.isFinite(eventId) && eventId > 0
        ? await sql`
            SELECT
              event_id,
              ROUND(AVG(rating)::numeric, 2) AS average_rating,
              COUNT(*)::integer AS ratings_count
            FROM event_ratings
            WHERE event_id = ${eventId}
            GROUP BY event_id
          `
        : await sql`
            SELECT
              event_id,
              ROUND(AVG(rating)::numeric, 2) AS average_rating,
              COUNT(*)::integer AS ratings_count
            FROM event_ratings
            GROUP BY event_id
          `;

      const reviewsRows = Number.isFinite(eventId) && eventId > 0
        ? userJoinColumn === "user_id"
          ? await sql`
              SELECT
                er.id,
                er.event_id,
                er.rating,
                er.review_text,
                er.created_at,
                u.username
              FROM event_ratings er
              LEFT JOIN users u ON u.user_id = er.user_id
              WHERE er.event_id = ${eventId}
                AND COALESCE(NULLIF(TRIM(er.review_text), ''), NULL) IS NOT NULL
              ORDER BY er.updated_at DESC, er.created_at DESC
            `
          : userJoinColumn === "id"
            ? await sql`
                SELECT
                  er.id,
                  er.event_id,
                  er.rating,
                  er.review_text,
                  er.created_at,
                  u.username
                FROM event_ratings er
                LEFT JOIN users u ON u.id = er.user_id
                WHERE er.event_id = ${eventId}
                  AND COALESCE(NULLIF(TRIM(er.review_text), ''), NULL) IS NOT NULL
                ORDER BY er.updated_at DESC, er.created_at DESC
              `
            : await sql`
                SELECT
                  er.id,
                  er.event_id,
                  er.rating,
                  er.review_text,
                  er.created_at,
                  NULL::text AS username
                FROM event_ratings er
                WHERE er.event_id = ${eventId}
                  AND COALESCE(NULLIF(TRIM(er.review_text), ''), NULL) IS NOT NULL
                ORDER BY er.updated_at DESC, er.created_at DESC
              `
        : [];

      const myRatingsRows =
        authUser
          ? Number.isFinite(eventId) && eventId > 0
            ? await sql`
                SELECT event_id, rating, review_text, updated_at
                FROM event_ratings
                WHERE user_id = ${authUser.userId}
                  AND event_id = ${eventId}
              `
            : await sql`
                SELECT event_id, rating, review_text, updated_at
                FROM event_ratings
                WHERE user_id = ${authUser.userId}
              `
          : [];

      return res.status(200).json({
        summaries: summaryRows.map((row: any) => ({
          eventId: Number(row.event_id),
          averageRating: Number(row.average_rating ?? 0),
          ratingsCount: Number(row.ratings_count ?? 0),
        })),
        reviews: reviewsRows.map((row: any) => ({
          id: Number(row.id),
          eventId: Number(row.event_id),
          rating: Number(row.rating),
          reviewText: String(row.review_text),
          createdAt: row.created_at,
          username: row.username ? String(row.username) : "Użytkownik",
        })),
        myRatings: myRatingsRows.map((row: any) => ({
          eventId: Number(row.event_id),
          rating: Number(row.rating),
          reviewText: row.review_text ? String(row.review_text) : "",
          updatedAt: row.updated_at,
        })),
      });
    } catch (error: any) {
      console.error("EVENT RATINGS GET ERROR:", error);
      return res.status(500).json({ error: error.message ?? "Ratings fetch failed" });
    }
  }

  if (req.method === "POST") {
    const authUser = await authenticateRequest(req);
    if (!authUser) {
      return res.status(401).json({ error: "Musisz być zalogowany." });
    }

    try {
      await ensureEventRatingsTable();
      await ensureTicketPurchasesTable();

      const body = parseBody(req.body);
      const eventId = Number(body?.eventId);
      const rating = Number(body?.rating);
      const reviewText = String(body?.reviewText ?? "").trim();

      if (!Number.isFinite(eventId) || eventId <= 0) {
        return res.status(400).json({ error: "Nieprawidłowe wydarzenie." });
      }

      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Ocena musi być od 1 do 5." });
      }

      const eventRows = await sql`
        SELECT id, date, title
        FROM events
        WHERE id = ${eventId}
        LIMIT 1
      `;
      const event = eventRows[0];
      if (!event) {
        return res.status(404).json({ error: "Wydarzenie nie istnieje." });
      }

      const eventTime = Date.parse(String(event.date));
      if (Number.isNaN(eventTime)) {
        return res.status(409).json({ error: "Nie udało się odczytać daty wydarzenia." });
      }

      const now = Date.now();
      if (now < eventTime) {
        return res.status(403).json({ error: "Wydarzenie jeszcze się nie zakończyło." });
      }

      if (now > eventTime + RATING_WINDOW_MS) {
        return res.status(403).json({ error: "Ocenę można dodać tylko do 24h po zakończeniu wydarzenia." });
      }

      const purchaseRows = await sql`
        SELECT id
        FROM ticket_purchases
        WHERE user_id = ${authUser.userId}
          AND event_id = ${eventId}
          AND refunded_at IS NULL
        LIMIT 1
      `;

      if (!purchaseRows[0]) {
        return res.status(403).json({ error: "Możesz ocenić tylko wydarzenie, na które masz kupiony bilet." });
      }

      const rows = await sql`
        INSERT INTO event_ratings (
          user_id,
          event_id,
          rating,
          review_text,
          updated_at
        )
        VALUES (
          ${authUser.userId},
          ${eventId},
          ${Math.round(rating)},
          ${reviewText || null},
          NOW()
        )
        ON CONFLICT (user_id, event_id)
        DO UPDATE SET
          rating = EXCLUDED.rating,
          review_text = EXCLUDED.review_text,
          updated_at = NOW()
        RETURNING id, rating, review_text, updated_at
      `;

      return res.status(200).json({
        success: true,
        item: {
          id: Number(rows[0].id),
          eventId,
          rating: Number(rows[0].rating),
          reviewText: rows[0].review_text ? String(rows[0].review_text) : "",
          updatedAt: rows[0].updated_at,
        },
      });
    } catch (error: any) {
      console.error("EVENT RATINGS POST ERROR:", error);
      return res.status(500).json({ error: error.message ?? "Rating save failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
