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
      const rawTicketTypes = Array.isArray(body?.ticketTypes) ? body.ticketTypes : [];
      const ticketTypes: TicketInput[] = rawTicketTypes.map((ticket: any) => ({
        name: String(ticket?.name ?? "").trim(),
        price: Number(ticket?.price ?? 0),
        available: Math.floor(Number(ticket?.available ?? 0)),
        description: String(ticket?.description ?? "").trim(),
      }));

      if (!title || !description || !location || !date) {
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

      let createdEvent: any[] = [];
      let eventId: number | null = null;

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
      eventId = Number(createdEvent[0]?.id ?? 0) || null;
      if (!eventId) {
        return res.status(500).json({ error: "Event created without id" });
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
      const location = String(body?.location ?? "").trim();
      const date = String(body?.date ?? "").trim();
      const imageUrl = String(body?.imageUrl ?? "").trim();
      const rawTicketTypes = Array.isArray(body?.ticketTypes) ? body.ticketTypes : [];
      const ticketTypes: TicketInput[] = rawTicketTypes.map((ticket: any) => ({
        name: String(ticket?.name ?? "").trim(),
        price: Number(ticket?.price ?? 0),
        available: Math.floor(Number(ticket?.available ?? 0)),
        description: String(ticket?.description ?? "").trim(),
      }));

      if (!title || !description || !location || !date) {
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

      if (hasImage) {
        await sql`
          UPDATE events
          SET
            title = ${title},
            description = ${description},
            location = ${location},
            date = ${parsedDate.toISOString()},
            ticket_price = ${ticketPrice},
            available_tickets = ${availableTickets},
            image = ${imageUrl || null}
          WHERE id = ${idFromQuery}
        `;
      } else if (hasImageUrl) {
        await sql`
          UPDATE events
          SET
            title = ${title},
            description = ${description},
            location = ${location},
            date = ${parsedDate.toISOString()},
            ticket_price = ${ticketPrice},
            available_tickets = ${availableTickets},
            image_url = ${imageUrl || null}
          WHERE id = ${idFromQuery}
        `;
      } else {
        await sql`
          UPDATE events
          SET
            title = ${title},
            description = ${description},
            location = ${location},
            date = ${parsedDate.toISOString()},
            ticket_price = ${ticketPrice},
            available_tickets = ${availableTickets}
          WHERE id = ${idFromQuery}
        `;
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

  return res.status(405).json({ message: "Method not allowed" });
}
