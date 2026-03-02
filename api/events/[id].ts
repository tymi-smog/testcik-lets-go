import { sql } from "../../lib/db";

export default async function handler(req: any, res: any) {
  const { id } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const events = await sql`
      SELECT 
        e.id,
        e.title,
        e.description,
        e.location,
        e.date,
        e.ticket_price,
        e.available_tickets,
        c.name as category
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ${id}
    `;

    if (events.length === 0) {
      return res.status(404).json({ message: "Not found" });
    }

    const ticketTypes = await sql`
      SELECT id, event_id, name, price, available, description
      FROM ticket_types
      WHERE event_id = ${id}
    `;

    const result = {
      ...events[0],
      ticketTypes,
    };

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}