import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "../lib/db.js";
import { authenticateRequest } from "../lib/auth.js";
import { ensureTicketPurchasesTable } from "../lib/ticket-purchases.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authUser = await authenticateRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: "Musisz byc zalogowany." });
  }

  try {
    await ensureTicketPurchasesTable();

    const rows = await sql`
      SELECT
        id,
        event_id,
        event_title,
        ticket_type_id,
        ticket_type_name,
        quantity,
        unit_price,
        line_total,
        purchased_at
      FROM ticket_purchases
      WHERE user_id = ${authUser.userId}
      ORDER BY purchased_at DESC, id DESC
    `;

    const items = rows.map((row: any) => ({
      id: Number(row.id),
      eventId: Number(row.event_id),
      eventTitle: String(row.event_title),
      ticketTypeId: Number(row.ticket_type_id),
      ticketTypeName: String(row.ticket_type_name),
      quantity: Number(row.quantity),
      unitPrice: Number(row.unit_price),
      lineTotal: Number(row.line_total),
      purchasedAt: row.purchased_at,
    }));

    return res.status(200).json({ items });
  } catch (error) {
    console.error("MY TICKETS ERROR:", error);
    return res.status(500).json({ error: "Nie udalo sie pobrac biletow." });
  }
}
