import { sql } from "./lib/db.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const events = await sql`
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
        categories.name AS category
      FROM events
      LEFT JOIN categories ON events.category_id = categories.id
      ORDER BY events.date ASC
    `;

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

    const result = events.map((event: any) => {
      const eventTicketTypes = ticketTypes.filter(
        (ticket: any) => Number(ticket.event_id) === Number(event.id)
      );

      return {
        ...event,
        // image is optional in DB schema shared by user; frontend handles fallback.
        image: null,
        ticketTypes: eventTicketTypes,
      };
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
