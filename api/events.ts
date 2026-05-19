import { sql } from "../lib/db.js";
import { authenticateRequest } from "../lib/auth.js";
import { ensureEventSalesColumns } from "../lib/event-sales.js";
import { ensureTicketPurchasesTable } from "../lib/ticket-purchases.js";
import { ensureEventRatingsTable } from "../lib/event-ratings.js";
import { ensureEventReportsTable } from "../lib/event-reports.js";

const VALID_REPORT_REASONS = new Set(["spam", "scam", "inappropriate", "duplicate", "other"]);
const VALID_BULK_ACTIONS = new Set(["bulk-delete", "bulk-move-category"]);

type EventRow = {
  id: number | string;
  creator_id?: number | string | null;
  category_id?: number | string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  city?: string | null;
  venue?: string | null;
  date: string;
  ticket_price?: number | string | null;
  available_tickets?: number | string | null;
  sold_tickets?: number | string | null;
  allow_ticket_returns?: boolean | null;
  created_at?: string | null;
  image_url?: string | null;
  category?: string | null;
};

type TicketInput = {
  name: string;
  price: number;
  available: number;
  description: string;
};

function parseRequestBody(body: unknown): any {
  if (typeof body === "string") {
    return JSON.parse(body);
  }
  return body ?? {};
}

function parseLocationParts(input: { city?: string; venue?: string; location?: string }) {
  const city = String(input.city ?? "").trim();
  const venue = String(input.venue ?? "").trim();
  const location = String(input.location ?? "").trim();

  if (city && venue) {
    return { city, venue };
  }

  if (location.includes(",")) {
    const split = location.split(",");
    const parsedVenue = split.slice(0, split.length - 1).join(",").trim();
    const parsedCity = split[split.length - 1].trim();
    return {
      city: city || parsedCity,
      venue: venue || parsedVenue,
    };
  }

  return {
    city,
    venue: venue || location,
  };
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

function parseIds(input: unknown) {
  return Array.isArray(input)
    ? input
        .map((item) => Number(item))
        .filter((value) => Number.isFinite(value) && value > 0)
    : [];
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET" && String(req.query?.reports) === "1") {
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
                CASE
                  WHEN e.venue IS NOT NULL AND e.city IS NOT NULL THEN e.venue || ', ' || e.city
                  ELSE COALESCE(e.venue, e.city, NULL::text)
                END AS event_location,
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
                  CASE
                    WHEN e.venue IS NOT NULL AND e.city IS NOT NULL THEN e.venue || ', ' || e.city
                    ELSE COALESCE(e.venue, e.city, NULL::text)
                  END AS event_location,
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
                  CASE
                    WHEN e.venue IS NOT NULL AND e.city IS NOT NULL THEN e.venue || ', ' || e.city
                    ELSE COALESCE(e.venue, e.city, NULL::text)
                  END AS event_location,
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

  if (req.method === "POST" && String(req.query?.report) === "1") {
    const authUser = await authenticateRequest(req);
    if (!authUser) {
      return res.status(401).json({ error: "Musisz być zalogowany." });
    }

    try {
      await ensureEventReportsTable();

      const body = parseRequestBody(req.body);
      const eventId = Number(body?.eventId);
      const reason = String(body?.reason ?? "").trim().toLowerCase();
      const details = String(body?.details ?? "").trim();

      if (!Number.isFinite(eventId) || eventId <= 0) {
        return res.status(400).json({ error: "Nieprawidłowe wydarzenie." });
      }

      if (!VALID_REPORT_REASONS.has(reason)) {
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

  if (req.method === "POST" && VALID_BULK_ACTIONS.has(String(req.query?.action ?? ""))) {
    try {
      await ensureEventSalesColumns();
      await ensureTicketPurchasesTable();
      await ensureEventRatingsTable();
      await ensureEventReportsTable();

      const authUser = await authenticateRequest(req);
      if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!authUser.is_admin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const body = parseRequestBody(req.body);
      const ids = parseIds(body?.ids);
      if (ids.length === 0) {
        return res.status(400).json({ error: "Nie wybrano żadnych wydarzeń." });
      }

      if (String(req.query?.action) === "bulk-delete") {
        await sql`BEGIN`;

        await sql`
          DELETE FROM event_reports
          WHERE event_id = ANY(${ids}::int[])
        `;
        await sql`
          DELETE FROM event_ratings
          WHERE event_id = ANY(${ids}::int[])
        `;
        await sql`
          DELETE FROM ticket_purchases
          WHERE event_id = ANY(${ids}::int[])
        `;
        await sql`
          DELETE FROM ticket_types
          WHERE event_id = ANY(${ids}::int[])
        `;
        await sql`
          DELETE FROM events
          WHERE id = ANY(${ids}::int[])
        `;

        await sql`COMMIT`;

        return res.status(200).json({ success: true, deletedIds: ids });
      }

      const category = String(body?.category ?? "").trim();
      if (!category) {
        return res.status(400).json({ error: "Wybierz kategorię docelową." });
      }

      await sql`BEGIN`;

      const categoryRows = await sql`
        SELECT id, name
        FROM categories
        WHERE LOWER(name) = LOWER(${category})
        LIMIT 1
      `;
      let categoryId = categoryRows[0]?.id ? Number(categoryRows[0].id) : null;

      if (!categoryId) {
        const created = await sql`
          INSERT INTO categories (name)
          VALUES (${category})
          RETURNING id
        `;
        categoryId = Number(created[0].id);
      }

      await sql`
        UPDATE events
        SET category_id = ${categoryId}
        WHERE id = ANY(${ids}::int[])
      `;

      await sql`COMMIT`;

      return res.status(200).json({ success: true, movedIds: ids, category });
    } catch (error: any) {
      try {
        await sql`ROLLBACK`;
      } catch {
        // ignore rollback errors
      }
      console.error("EVENT BULK ACTION ERROR:", error);
      return res.status(500).json({ error: error.message ?? "Bulk action failed" });
    }
  }

  if (req.method === "GET") {
    try {
      await ensureEventSalesColumns();
      const columns = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'events'
      `;

      const columnNames = new Set(columns.map((column: any) => String(column.column_name)));
      const hasImage = columnNames.has("image");
      const hasImageUrl = columnNames.has("image_url");
      const hasLocation = columnNames.has("location");
      const hasCity = columnNames.has("city");
      const hasVenue = columnNames.has("venue");
      const hasSoldTickets = columnNames.has("sold_tickets");
      const hasAllowTicketReturns = columnNames.has("allow_ticket_returns");

      let events: EventRow[] = [];

      if (hasImage) {
        if (hasLocation) {
          events = await sql`
            SELECT
              events.id,
              events.creator_id,
              events.category_id,
              events.title,
              events.description,
              events.location,
              events.date,
              events.ticket_price,
              events.available_tickets,
              events.sold_tickets,
              events.allow_ticket_returns,
              events.created_at,
              events.image AS image_url,
              categories.name AS category
            FROM events
            LEFT JOIN categories ON events.category_id = categories.id
            ORDER BY events.date ASC
          `;
        } else {
          events = await sql`
            SELECT
              events.id,
              events.creator_id,
              events.category_id,
              events.title,
              events.description,
              NULL::text AS location,
              events.date,
              events.ticket_price,
              events.available_tickets,
              events.sold_tickets,
              events.allow_ticket_returns,
              events.created_at,
              events.image AS image_url,
              categories.name AS category
            FROM events
            LEFT JOIN categories ON events.category_id = categories.id
            ORDER BY events.date ASC
          `;
        }
      } else if (hasImageUrl) {
        if (hasLocation) {
          events = await sql`
            SELECT
              events.id,
              events.creator_id,
              events.category_id,
              events.title,
              events.description,
              events.location,
              events.date,
              events.ticket_price,
              events.available_tickets,
              events.sold_tickets,
              events.allow_ticket_returns,
              events.created_at,
              events.image_url AS image_url,
              categories.name AS category
            FROM events
            LEFT JOIN categories ON events.category_id = categories.id
            ORDER BY events.date ASC
          `;
        } else {
          events = await sql`
            SELECT
              events.id,
              events.creator_id,
              events.category_id,
              events.title,
              events.description,
              NULL::text AS location,
              events.date,
              events.ticket_price,
              events.available_tickets,
              events.sold_tickets,
              events.allow_ticket_returns,
              events.created_at,
              events.image_url AS image_url,
              categories.name AS category
            FROM events
            LEFT JOIN categories ON events.category_id = categories.id
            ORDER BY events.date ASC
          `;
        }
      } else {
        if (hasLocation) {
          events = await sql`
            SELECT
              events.id,
              events.creator_id,
              events.category_id,
              events.title,
              events.description,
              events.location,
              events.date,
              events.ticket_price,
              events.available_tickets,
              events.sold_tickets,
              events.allow_ticket_returns,
              events.created_at,
              NULL::text AS image_url,
              categories.name AS category
            FROM events
            LEFT JOIN categories ON events.category_id = categories.id
            ORDER BY events.date ASC
          `;
        } else {
          events = await sql`
            SELECT
              events.id,
              events.creator_id,
              events.category_id,
              events.title,
              events.description,
              NULL::text AS location,
              events.date,
              events.ticket_price,
              events.available_tickets,
              events.sold_tickets,
              events.allow_ticket_returns,
              events.created_at,
              NULL::text AS image_url,
              categories.name AS category
            FROM events
            LEFT JOIN categories ON events.category_id = categories.id
            ORDER BY events.date ASC
          `;
        }
      }

      let eventLocationRows: Array<{ id: number | string; city?: string | null; venue?: string | null }> = [];
      if (hasCity || hasVenue) {
        if (hasCity && hasVenue) {
          eventLocationRows = await sql`
            SELECT id, city, venue
            FROM events
          `;
        } else if (hasCity) {
          eventLocationRows = await sql`
            SELECT id, city, NULL::text AS venue
            FROM events
          `;
        } else {
          eventLocationRows = await sql`
            SELECT id, NULL::text AS city, venue
            FROM events
          `;
        }
      }
      const eventLocationMap = new Map(
        eventLocationRows.map((row) => [
          Number(row.id),
          {
            city: row.city ?? null,
            venue: row.venue ?? null,
          },
        ])
      );

      let userMap = new Map<number, string>();
      try {
        const userColumns = await sql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users'
        `;

        const userColumnNames = new Set(userColumns.map((column: any) => String(column.column_name)));
        const hasUserId = userColumnNames.has("user_id");
        const hasId = userColumnNames.has("id");

        if (hasUserId) {
          const users = await sql`
            SELECT user_id, username
            FROM users
          `;
          userMap = new Map(users.map((user: any) => [Number(user.user_id), String(user.username)]));
        } else if (hasId) {
          const users = await sql`
            SELECT id, username
            FROM users
          `;
          userMap = new Map(users.map((user: any) => [Number(user.id), String(user.username)]));
        }
      } catch (usersError) {
        console.warn("users query skipped:", usersError);
      }

      // ticket_types may not exist in every deployment schema;
      // fallback to empty array to keep frontend stable.
      let ticketTypes: any[] = [];
      try {
        const ticketTypeColumns = await sql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'ticket_types'
        `;
        const ticketTypeColumnNames = new Set(
          ticketTypeColumns.map((column: any) => String(column.column_name))
        );
        const hasSoldColumn = ticketTypeColumnNames.has("sold");
        const hasInitialAvailableColumn = ticketTypeColumnNames.has("initial_available");

        if (hasSoldColumn && hasInitialAvailableColumn) {
          ticketTypes = await sql`
            SELECT
              id,
              event_id,
              name,
              price,
              available,
              description,
              sold,
              initial_available
            FROM ticket_types
          `;
        } else if (hasSoldColumn) {
          ticketTypes = await sql`
            SELECT
              id,
              event_id,
              name,
              price,
              available,
              description,
              sold,
              NULL::integer AS initial_available
            FROM ticket_types
          `;
        } else if (hasInitialAvailableColumn) {
          ticketTypes = await sql`
            SELECT
              id,
              event_id,
              name,
              price,
              available,
              description,
              NULL::integer AS sold,
              initial_available
            FROM ticket_types
          `;
        } else {
          ticketTypes = await sql`
            SELECT
              id,
              event_id,
              name,
              price,
              available,
              description,
              NULL::integer AS sold,
              NULL::integer AS initial_available
            FROM ticket_types
          `;
        }
      } catch (ticketTypesError) {
        console.warn("ticket_types query skipped:", ticketTypesError);
      }

      const result = events.map((event: EventRow) => {
        const eventTicketTypes = ticketTypes.filter(
          (ticket: any) => Number(ticket.event_id) === Number(event.id)
        );

        return {
          ...event,
          city: eventLocationMap.get(Number(event.id))?.city ?? null,
          venue: eventLocationMap.get(Number(event.id))?.venue ?? null,
          location:
            (eventLocationMap.get(Number(event.id))?.venue && eventLocationMap.get(Number(event.id))?.city)
              ? `${eventLocationMap.get(Number(event.id))?.venue}, ${eventLocationMap.get(Number(event.id))?.city}`
              : eventLocationMap.get(Number(event.id))?.venue || event.location || null,
          creator_username: userMap.get(Number(event.creator_id)) ?? null,
          image_url: event.image_url || null,
          image: event.image_url || `https://picsum.photos/seed/event-${event.id}/1200/675`,
          sold_tickets: hasSoldTickets ? Number(event.sold_tickets ?? 0) : 0,
          allow_ticket_returns: hasAllowTicketReturns ? Boolean(event.allow_ticket_returns) : false,
          ticketTypes: eventTicketTypes,
        };
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "POST") {
    try {
      await ensureEventSalesColumns();
      const authUser = await authenticateRequest(req);
      if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (!authUser.is_verified) {
        return res.status(403).json({ error: "Email not verified" });
      }

      const body = parseRequestBody(req.body);
      const title = String(body?.title ?? "").trim();
      const description = String(body?.description ?? "").trim();
      const parsedLocation = parseLocationParts({
        city: body?.city,
        venue: body?.venue,
        location: body?.location,
      });
      const city = parsedLocation.city;
      const venue = parsedLocation.venue;
      const location = city && venue ? `${venue}, ${city}` : venue;
      const date = String(body?.date ?? "").trim();
      const imageUrl = String(body?.imageUrl ?? "").trim();
      const allowTicketReturns = body?.allowTicketReturns === true;
      const rawTicketTypes = Array.isArray(body?.ticketTypes) ? body.ticketTypes : [];
      const ticketTypes: TicketInput[] = rawTicketTypes.map((ticket: any) => ({
        name: String(ticket?.name ?? "").trim(),
        price: Number(ticket?.price ?? 0),
        available: Math.floor(Number(ticket?.available ?? 0)),
        description: String(ticket?.description ?? "").trim(),
      }));

      if (!title || !description || !venue || !city || !date) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (ticketTypes.length === 0) {
        return res.status(400).json({ error: "At least one ticket type is required" });
      }
      const hasInvalidTicket = ticketTypes.some(
        (ticket) =>
          !ticket.name ||
          !Number.isFinite(ticket.price) ||
          ticket.price < 0 ||
          !Number.isFinite(ticket.available) ||
          ticket.available < 1
      );
      if (hasInvalidTicket) {
        return res.status(400).json({ error: "Invalid ticket types payload" });
      }

      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "Invalid date" });
      }
      const ticketPrice = Math.min(...ticketTypes.map((ticket) => ticket.price));
      const availableTickets = ticketTypes.reduce((sum, ticket) => sum + ticket.available, 0);

      let categoryId: number | null = null;
      try {
        const preferred = await sql`
          SELECT id
          FROM categories
          WHERE LOWER(name) = 'inne'
          LIMIT 1
        `;

        if (preferred[0]?.id) {
          categoryId = Number(preferred[0].id);
        } else {
          const anyCategory = await sql`
            SELECT id
            FROM categories
            ORDER BY id ASC
            LIMIT 1
          `;
          if (anyCategory[0]?.id) {
            categoryId = Number(anyCategory[0].id);
          }
        }
      } catch (categoryError) {
        console.warn("category fallback skipped:", categoryError);
      }

      const columns = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'events'
      `;
      const columnNames = new Set(columns.map((column: any) => String(column.column_name)));
      const hasImage = columnNames.has("image");
      const hasImageUrl = columnNames.has("image_url");
      const hasLocation = columnNames.has("location");
      const hasCity = columnNames.has("city");
      const hasVenue = columnNames.has("venue");

      let createdEvent: any[] = [];
      let eventId: number | null = null;

      if (hasImage) {
        if (hasLocation) {
          createdEvent = await sql`
            INSERT INTO events (
              creator_id,
              category_id,
              title,
              description,
              location,
              date,
              ticket_price,
              available_tickets,
              sold_tickets,
              allow_ticket_returns,
              image
            )
            VALUES (
              ${authUser.userId},
              ${categoryId},
              ${title},
              ${description},
              ${location},
              ${parsedDate.toISOString()},
              ${ticketPrice},
              ${availableTickets},
              0,
              ${allowTicketReturns},
              ${imageUrl || null}
            )
            RETURNING id
          `;
        } else {
          createdEvent = await sql`
            INSERT INTO events (
              creator_id,
              category_id,
              title,
              description,
              date,
              ticket_price,
              available_tickets,
              sold_tickets,
              allow_ticket_returns,
              image
            )
            VALUES (
              ${authUser.userId},
              ${categoryId},
              ${title},
              ${description},
              ${parsedDate.toISOString()},
              ${ticketPrice},
              ${availableTickets},
              0,
              ${allowTicketReturns},
              ${imageUrl || null}
            )
            RETURNING id
          `;
        }
      } else if (hasImageUrl) {
        if (hasLocation) {
          createdEvent = await sql`
            INSERT INTO events (
              creator_id,
              category_id,
              title,
              description,
              location,
              date,
              ticket_price,
              available_tickets,
              sold_tickets,
              allow_ticket_returns,
              image_url
            )
            VALUES (
              ${authUser.userId},
              ${categoryId},
              ${title},
              ${description},
              ${location},
              ${parsedDate.toISOString()},
              ${ticketPrice},
              ${availableTickets},
              0,
              ${allowTicketReturns},
              ${imageUrl || null}
            )
            RETURNING id
          `;
        } else {
          createdEvent = await sql`
            INSERT INTO events (
              creator_id,
              category_id,
              title,
              description,
              date,
              ticket_price,
              available_tickets,
              sold_tickets,
              allow_ticket_returns,
              image_url
            )
            VALUES (
              ${authUser.userId},
              ${categoryId},
              ${title},
              ${description},
              ${parsedDate.toISOString()},
              ${ticketPrice},
              ${availableTickets},
              0,
              ${allowTicketReturns},
              ${imageUrl || null}
            )
            RETURNING id
          `;
        }
      } else {
        if (hasLocation) {
          createdEvent = await sql`
            INSERT INTO events (
              creator_id,
              category_id,
              title,
              description,
              location,
              date,
              ticket_price,
              available_tickets,
              sold_tickets,
              allow_ticket_returns
            )
            VALUES (
              ${authUser.userId},
              ${categoryId},
              ${title},
              ${description},
              ${location},
              ${parsedDate.toISOString()},
              ${ticketPrice},
              ${availableTickets},
              0,
              ${allowTicketReturns}
            )
            RETURNING id
          `;
        } else {
          createdEvent = await sql`
            INSERT INTO events (
              creator_id,
              category_id,
              title,
              description,
              date,
              ticket_price,
              available_tickets,
              sold_tickets,
              allow_ticket_returns
            )
            VALUES (
              ${authUser.userId},
              ${categoryId},
              ${title},
              ${description},
              ${parsedDate.toISOString()},
              ${ticketPrice},
              ${availableTickets},
              0,
              ${allowTicketReturns}
            )
            RETURNING id
          `;
        }
      }
      eventId = Number(createdEvent[0]?.id ?? 0) || null;
      if (!eventId) {
        return res.status(500).json({ error: "Event created without id" });
      }

      if (hasCity || hasVenue) {
        if (hasCity && hasVenue) {
          await sql`
            UPDATE events
            SET city = ${city}, venue = ${venue}
            WHERE id = ${eventId}
          `;
        } else if (hasCity) {
          await sql`
            UPDATE events
            SET city = ${city}
            WHERE id = ${eventId}
          `;
        } else {
          await sql`
            UPDATE events
            SET venue = ${venue}
            WHERE id = ${eventId}
          `;
        }
      }

      const ticketColumns = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ticket_types'
      `;
      const ticketColumnNames = new Set(ticketColumns.map((column: any) => String(column.column_name)));
      const hasTicketTypes = ticketColumnNames.size > 0;
      if (!hasTicketTypes) {
        await sql`
          DELETE FROM events
          WHERE id = ${eventId}
        `;
        return res.status(500).json({ error: "ticket_types table is missing" });
      }

      try {
        for (const ticket of ticketTypes) {
          await sql`
            INSERT INTO ticket_types (
              event_id,
              name,
              price,
              available,
              description
            )
            VALUES (
              ${eventId},
              ${ticket.name},
              ${ticket.price},
              ${ticket.available},
              ${ticket.description || null}
            )
          `;
        }
      } catch (ticketInsertError: any) {
        await sql`
          DELETE FROM events
          WHERE id = ${eventId}
        `;
        throw ticketInsertError;
      }

      return res.status(201).json({
        message: "Event created",
        id: eventId,
      });
    } catch (error: any) {
      console.error("EVENT CREATE ERROR:", error);
      return res.status(500).json({ error: error.message ?? "Create failed" });
    }
  }

  if (req.method === "PUT") {
    try {
      await ensureEventSalesColumns();
      const authUser = await authenticateRequest(req);
      if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const idFromQuery = Number(req.query?.id);
      if (!Number.isFinite(idFromQuery) || idFromQuery <= 0) {
        return res.status(400).json({ error: "Invalid event id" });
      }

      const body = parseRequestBody(req.body);
      const title = String(body?.title ?? "").trim();
      const description = String(body?.description ?? "").trim();
      const parsedLocation = parseLocationParts({
        city: body?.city,
        venue: body?.venue,
        location: body?.location,
      });
      const city = parsedLocation.city;
      const venue = parsedLocation.venue;
      const location = city && venue ? `${venue}, ${city}` : venue;
      const date = String(body?.date ?? "").trim();
      const imageUrl = String(body?.imageUrl ?? "").trim();
      const allowTicketReturns = body?.allowTicketReturns === true;
      const rawTicketTypes = Array.isArray(body?.ticketTypes) ? body.ticketTypes : [];
      const ticketTypes: TicketInput[] = rawTicketTypes.map((ticket: any) => ({
        name: String(ticket?.name ?? "").trim(),
        price: Number(ticket?.price ?? 0),
        available: Math.floor(Number(ticket?.available ?? 0)),
        description: String(ticket?.description ?? "").trim(),
      }));

      if (!title || !description || !venue || !city || !date) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (ticketTypes.length === 0) {
        return res.status(400).json({ error: "At least one ticket type is required" });
      }
      const hasInvalidTicket = ticketTypes.some(
        (ticket) =>
          !ticket.name ||
          !Number.isFinite(ticket.price) ||
          ticket.price < 0 ||
          !Number.isFinite(ticket.available) ||
          ticket.available < 1
      );
      if (hasInvalidTicket) {
        return res.status(400).json({ error: "Invalid ticket types payload" });
      }

      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "Invalid date" });
      }

      const ticketPrice = Math.min(...ticketTypes.map((ticket) => ticket.price));
      const availableTickets = ticketTypes.reduce((sum, ticket) => sum + ticket.available, 0);

      const eventRows = await sql`
        SELECT id, creator_id
        FROM events
        WHERE id = ${idFromQuery}
        LIMIT 1
      `;
      const eventRow = eventRows[0];
      if (!eventRow) {
        return res.status(404).json({ error: "Event not found" });
      }

      const isOwner = Number(eventRow.creator_id) === Number(authUser.userId);
      const isAdmin = authUser.is_admin === true;
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const eventColumns = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'events'
      `;
      const eventColumnNames = new Set(eventColumns.map((column: any) => String(column.column_name)));
      const hasImage = eventColumnNames.has("image");
      const hasImageUrl = eventColumnNames.has("image_url");
      const hasLocation = eventColumnNames.has("location");
      const hasCity = eventColumnNames.has("city");
      const hasVenue = eventColumnNames.has("venue");

      if (hasImage) {
        if (hasLocation) {
          await sql`
            UPDATE events
            SET
              title = ${title},
              description = ${description},
              location = ${location},
              date = ${parsedDate.toISOString()},
              ticket_price = ${ticketPrice},
              available_tickets = ${availableTickets},
              allow_ticket_returns = ${allowTicketReturns},
              image = ${imageUrl || null}
            WHERE id = ${idFromQuery}
          `;
        } else {
          await sql`
            UPDATE events
            SET
              title = ${title},
              description = ${description},
              date = ${parsedDate.toISOString()},
              ticket_price = ${ticketPrice},
              available_tickets = ${availableTickets},
              allow_ticket_returns = ${allowTicketReturns},
              image = ${imageUrl || null}
            WHERE id = ${idFromQuery}
          `;
        }
      } else if (hasImageUrl) {
        if (hasLocation) {
          await sql`
            UPDATE events
            SET
              title = ${title},
              description = ${description},
              location = ${location},
              date = ${parsedDate.toISOString()},
              ticket_price = ${ticketPrice},
              available_tickets = ${availableTickets},
              allow_ticket_returns = ${allowTicketReturns},
              image_url = ${imageUrl || null}
            WHERE id = ${idFromQuery}
          `;
        } else {
          await sql`
            UPDATE events
            SET
              title = ${title},
              description = ${description},
              date = ${parsedDate.toISOString()},
              ticket_price = ${ticketPrice},
              available_tickets = ${availableTickets},
              allow_ticket_returns = ${allowTicketReturns},
              image_url = ${imageUrl || null}
            WHERE id = ${idFromQuery}
          `;
        }
      } else {
        if (hasLocation) {
          await sql`
            UPDATE events
            SET
              title = ${title},
              description = ${description},
              location = ${location},
              date = ${parsedDate.toISOString()},
              ticket_price = ${ticketPrice},
              available_tickets = ${availableTickets},
              allow_ticket_returns = ${allowTicketReturns}
            WHERE id = ${idFromQuery}
          `;
        } else {
          await sql`
            UPDATE events
            SET
              title = ${title},
              description = ${description},
              date = ${parsedDate.toISOString()},
              ticket_price = ${ticketPrice},
              available_tickets = ${availableTickets},
              allow_ticket_returns = ${allowTicketReturns}
            WHERE id = ${idFromQuery}
          `;
        }
      }

      if (hasCity || hasVenue) {
        if (hasCity && hasVenue) {
          await sql`
            UPDATE events
            SET city = ${city}, venue = ${venue}
            WHERE id = ${idFromQuery}
          `;
        } else if (hasCity) {
          await sql`
            UPDATE events
            SET city = ${city}
            WHERE id = ${idFromQuery}
          `;
        } else {
          await sql`
            UPDATE events
            SET venue = ${venue}
            WHERE id = ${idFromQuery}
          `;
        }
      }

      const ticketColumns = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ticket_types'
      `;
      const ticketColumnNames = new Set(ticketColumns.map((column: any) => String(column.column_name)));
      const hasTicketTypes = ticketColumnNames.size > 0;
      if (!hasTicketTypes) {
        return res.status(500).json({ error: "ticket_types table is missing" });
      }

      await sql`
        DELETE FROM ticket_types
        WHERE event_id = ${idFromQuery}
      `;

      for (const ticket of ticketTypes) {
        await sql`
          INSERT INTO ticket_types (
            event_id,
            name,
            price,
            available,
            description
          )
          VALUES (
            ${idFromQuery},
            ${ticket.name},
            ${ticket.price},
            ${ticket.available},
            ${ticket.description || null}
          )
        `;
      }

      return res.status(200).json({ message: "Event updated" });
    } catch (error: any) {
      console.error("EVENT UPDATE ERROR:", error);
      return res.status(500).json({ error: error.message ?? "Update failed" });
    }
  }

  if (req.method === "DELETE") {
    try {
      await ensureEventSalesColumns();
      await ensureTicketPurchasesTable();
      await ensureEventRatingsTable();
      await ensureEventReportsTable();

      const authUser = await authenticateRequest(req);
      if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const idFromQuery = Number(req.query?.id);
      if (!Number.isFinite(idFromQuery) || idFromQuery <= 0) {
        return res.status(400).json({ error: "Invalid event id" });
      }

      const eventRows = await sql`
        SELECT id, creator_id
        FROM events
        WHERE id = ${idFromQuery}
        LIMIT 1
      `;
      const eventRow = eventRows[0];
      if (!eventRow) {
        return res.status(404).json({ error: "Event not found" });
      }

      const isOwner = Number(eventRow.creator_id) === Number(authUser.userId);
      const isAdmin = authUser.is_admin === true;
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await sql`BEGIN`;

      await sql`
        DELETE FROM event_reports
        WHERE event_id = ${idFromQuery}
      `;

      await sql`
        DELETE FROM event_ratings
        WHERE event_id = ${idFromQuery}
      `;

      await sql`
        DELETE FROM ticket_purchases
        WHERE event_id = ${idFromQuery}
      `;

      await sql`
        DELETE FROM ticket_types
        WHERE event_id = ${idFromQuery}
      `;

      await sql`
        DELETE FROM events
        WHERE id = ${idFromQuery}
      `;

      await sql`COMMIT`;

      return res.status(200).json({ message: "Event deleted" });
    } catch (error: any) {
      try {
        await sql`ROLLBACK`;
      } catch {
        // ignore rollback errors
      }
      console.error("EVENT DELETE ERROR:", error);
      return res.status(500).json({ error: error.message ?? "Delete failed" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
