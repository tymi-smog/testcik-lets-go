import { sql } from "../lib/db.js";
import { authenticateRequest } from "../lib/auth.js";

type EventRow = {
  id: number | string;
  creator_id?: number | string | null;
  category_id?: number | string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  date: string;
  ticket_price?: number | string | null;
  available_tickets?: number | string | null;
  created_at?: string | null;
  image_url?: string | null;
  category?: string | null;
};

function parseRequestBody(body: unknown): any {
  if (typeof body === "string") {
    return JSON.parse(body);
  }
  return body ?? {};
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    try {
      const columns = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'events'
      `;

      const columnNames = new Set(columns.map((column: any) => String(column.column_name)));
      const hasImage = columnNames.has("image");
      const hasImageUrl = columnNames.has("image_url");

      let events: EventRow[] = [];

      if (hasImage) {
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
            events.created_at,
            events.image AS image_url,
            categories.name AS category
          FROM events
          LEFT JOIN categories ON events.category_id = categories.id
          ORDER BY events.date ASC
        `;
      } else if (hasImageUrl) {
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
            events.location,
            events.date,
            events.ticket_price,
            events.available_tickets,
            events.created_at,
            NULL::text AS image_url,
            categories.name AS category
          FROM events
          LEFT JOIN categories ON events.category_id = categories.id
          ORDER BY events.date ASC
        `;
      }

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
        ticketTypes = await sql`
          SELECT
            id,
            event_id,
            name,
            price,
            available,
            description
          FROM ticket_types
        `;
      } catch (ticketTypesError) {
        console.warn("ticket_types query skipped:", ticketTypesError);
      }

      const result = events.map((event: EventRow) => {
        const eventTicketTypes = ticketTypes.filter(
          (ticket: any) => Number(ticket.event_id) === Number(event.id)
        );

        return {
          ...event,
          creator_username: userMap.get(Number(event.creator_id)) ?? null,
          image_url: event.image_url || null,
          image: event.image_url || `https://picsum.photos/seed/event-${event.id}/1200/675`,
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
      const authUser = await authenticateRequest(req);
      if (!authUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const body = parseRequestBody(req.body);
      const title = String(body?.title ?? "").trim();
      const description = String(body?.description ?? "").trim();
      const location = String(body?.location ?? "").trim();
      const date = String(body?.date ?? "").trim();
      const imageUrl = String(body?.imageUrl ?? "").trim();

      const parsedTicketPrice = Number(body?.ticketPrice ?? 0);
      const ticketPrice = Number.isFinite(parsedTicketPrice) && parsedTicketPrice >= 0 ? parsedTicketPrice : 0;

      const parsedAvailable = Number(body?.availableTickets ?? 0);
      const availableTickets =
        Number.isFinite(parsedAvailable) && parsedAvailable >= 0 ? Math.floor(parsedAvailable) : 0;

      if (!title || !description || !location || !date) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "Invalid date" });
      }

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

      let createdEvent: any[] = [];

      if (hasImage) {
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
            ${imageUrl || null}
          )
          RETURNING id
        `;
      } else if (hasImageUrl) {
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
            location,
            date,
            ticket_price,
            available_tickets
          )
          VALUES (
            ${authUser.userId},
            ${categoryId},
            ${title},
            ${description},
            ${location},
            ${parsedDate.toISOString()},
            ${ticketPrice},
            ${availableTickets}
          )
          RETURNING id
        `;
      }

      return res.status(201).json({
        message: "Event created",
        id: createdEvent[0]?.id ?? null,
      });
    } catch (error: any) {
      console.error("EVENT CREATE ERROR:", error);
      return res.status(500).json({ error: error.message ?? "Create failed" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
