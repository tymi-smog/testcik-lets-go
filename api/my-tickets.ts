import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "../lib/db.js";
import { authenticateRequest } from "../lib/auth.js";
import { ensureEventSalesColumns } from "../lib/event-sales.js";
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
    await ensureEventSalesColumns();
    await ensureTicketPurchasesTable();

    const rows = await sql`
      SELECT
        tp.id,
        tp.event_id,
        tp.event_title,
        tp.ticket_type_id,
        tp.ticket_type_name,
        tp.quantity,
        tp.unit_price,
        tp.line_total,
        tp.purchased_at,
        e.date AS event_date,
        COALESCE(e.allow_ticket_returns, false) AS allow_ticket_returns
      FROM ticket_purchases tp
      LEFT JOIN events e ON e.id = tp.event_id
      WHERE tp.user_id = ${authUser.userId}
        AND tp.refunded_at IS NULL
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
      eventDate: row.event_date ?? null,
      allowTicketReturns: Boolean(row.allow_ticket_returns),
    }));

    return res.status(200).json({ items });
  } catch (error) {
    console.error("MY TICKETS ERROR:", error);
    return res.status(500).json({ error: "Nie udalo sie pobrac biletow." });
  }
}
