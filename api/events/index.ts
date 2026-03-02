import { sql } from "../../lib/db";

export default async function handler(req: any, res: any) {
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
      ORDER BY e.date ASC
    `;

    res.status(200).json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}