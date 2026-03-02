import { sql } from "./lib/db.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const events = await sql`
      SELECT 
        events.id,
        events.title,
        events.description,
        events.location,
        events.date,
        events.ticket_price,
        events.available_tickets,
        categories.name as category
      FROM events
      LEFT JOIN categories ON events.category_id = categories.id
      ORDER BY events.date ASC
    `;

    const ticketTypes = await sql`
      SELECT 
        id,
        event_id,
        name,
        price,
        available,
        description
      FROM ticket_types
    `;

    const result = events.map((event: any) => ({
      ...event,
      ticketTypes: ticketTypes.filter(
        (ticket: any) => ticket.event_id === event.id
      ),
    }));

    return res.status(200).json(result);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
