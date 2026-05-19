import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "../lib/db.js";
import { authenticateRequest } from "../lib/auth.js";
import { ensureEventReportsTable } from "../lib/event-reports.js";

const VALID_REASONS = new Set(["spam", "scam", "inappropriate", "duplicate", "other"]);

function parseBody(body: unknown) {
  if (typeof body === "string") {
    return JSON.parse(body);
  }

  return body ?? {};
}

async function getUsersJoinColumn() {
  const userColumns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
  `;
  const userColumnNames = new Set(userColumns.map((column: any) => String(column.column_name)));

  if (userColumnNames.has("user_id")) {
    return "user_id";
  }

  if (userColumnNames.has("id")) {
    return "id";
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const authUser = await authenticateRequest(req);
      if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!authUser.is_admin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await ensureEventReportsTable();
      const userJoinColumn = await getUsersJoinColumn();

      const reports =
        userJoinColumn === "user_id"
          ? await sql`
              SELECT
                er.id,
                er.user_id,
                er.event_id,
                er.reason,
                er.details,
                er.status,
                er.created_at,
                er.updated_at,
                e.title AS event_title,
                e.date AS event_date,
                e.location AS event_location,
                e.city AS event_city,
                e.venue AS event_venue,
                e.created_at AS event_created_at,
                u.username AS reporter_username
              FROM event_reports er
              LEFT JOIN events e ON e.id = er.event_id
              LEFT JOIN users u ON u.user_id = er.user_id
              ORDER BY er.created_at DESC, er.id DESC
            `
          : userJoinColumn === "id"
            ? await sql`
                SELECT
                  er.id,
                  er.user_id,
                  er.event_id,
                  er.reason,
                  er.details,
                  er.status,
                  er.created_at,
                  er.updated_at,
                  e.title AS event_title,
                  e.date AS event_date,
                  e.location AS event_location,
                  e.city AS event_city,
                  e.venue AS event_venue,
                  e.created_at AS event_created_at,
                  u.username AS reporter_username
                FROM event_reports er
                LEFT JOIN events e ON e.id = er.event_id
                LEFT JOIN users u ON u.id = er.user_id
                ORDER BY er.created_at DESC, er.id DESC
              `
            : await sql`
                SELECT
                  er.id,
                  er.user_id,
                  er.event_id,
                  er.reason,
                  er.details,
                  er.status,
                  er.created_at,
                  er.updated_at,
                  e.title AS event_title,
                  e.date AS event_date,
                  e.location AS event_location,
                  e.city AS event_city,
                  e.venue AS event_venue,
                  e.created_at AS event_created_at,
                  NULL::text AS reporter_username
                FROM event_reports er
                LEFT JOIN events e ON e.id = er.event_id
                ORDER BY er.created_at DESC, er.id DESC
              `;

      return res.status(200).json({
        items: reports.map((report: any) => ({
          id: Number(report.id),
          userId: Number(report.user_id),
          eventId: Number(report.event_id),
          reason: String(report.reason),
          details: report.details ? String(report.details) : "",
          status: String(report.status ?? "open"),
          createdAt: report.created_at,
          updatedAt: report.updated_at,
          reporterUsername: report.reporter_username ? String(report.reporter_username) : "Użytkownik",
          event: report.event_title
            ? {
                title: String(report.event_title),
                date: report.event_date,
                location: report.event_location ? String(report.event_location) : "",
                city: report.event_city ? String(report.event_city) : "",
                venue: report.event_venue ? String(report.event_venue) : "",
                createdAt: report.event_created_at,
              }
            : null,
        })),
      });
    } catch (error: any) {
      console.error("EVENT REPORTS GET ERROR:", error);
      return res.status(500).json({ error: error.message ?? "Reports fetch failed" });
    }
  }

  if (req.method === "POST") {
    const authUser = await authenticateRequest(req);
    if (!authUser) {
      return res.status(401).json({ error: "Musisz być zalogowany." });
    }

    try {
      await ensureEventReportsTable();

      const body = parseBody(req.body);
      const eventId = Number(body?.eventId);
      const reason = String(body?.reason ?? "").trim().toLowerCase();
      const details = String(body?.details ?? "").trim();

      if (!Number.isFinite(eventId) || eventId <= 0) {
        return res.status(400).json({ error: "Nieprawidłowe wydarzenie." });
      }

      if (!VALID_REASONS.has(reason)) {
        return res.status(400).json({ error: "Wybierz prawidłowy powód zgłoszenia." });
      }

      const eventRows = await sql`
        SELECT id, title, creator_id
        FROM events
        WHERE id = ${eventId}
        LIMIT 1
      `;
      const event = eventRows[0];
      if (!event) {
        return res.status(404).json({ error: "Wydarzenie nie istnieje." });
      }

      const rows = await sql`
        INSERT INTO event_reports (
          user_id,
          event_id,
          reason,
          details,
          status,
          updated_at
        )
        VALUES (
          ${authUser.userId},
          ${eventId},
          ${reason},
          ${details || null},
          'open',
          NOW()
        )
        ON CONFLICT (user_id, event_id)
        DO UPDATE SET
          reason = EXCLUDED.reason,
          details = EXCLUDED.details,
          status = 'open',
          updated_at = NOW()
        RETURNING id, status, created_at, updated_at
      `;

      return res.status(200).json({
        success: true,
        item: {
          id: Number(rows[0].id),
          eventId,
          reason,
          details,
          status: String(rows[0].status),
          createdAt: rows[0].created_at,
          updatedAt: rows[0].updated_at,
        },
      });
    } catch (error: any) {
      console.error("EVENT REPORTS POST ERROR:", error);
      return res.status(500).json({ error: error.message ?? "Report save failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
