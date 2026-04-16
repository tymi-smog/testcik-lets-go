import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "../lib/db.js";
import { authenticateRequest } from "../lib/auth.js";
import { ensureEventSalesColumns } from "../lib/event-sales.js";
import { ensureTicketPurchasesTable } from "../lib/ticket-purchases.js";

const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authUser = await authenticateRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: "Musisz być zalogowany." });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const purchaseId = Number(body?.purchaseId);

  if (!Number.isFinite(purchaseId) || purchaseId <= 0) {
    return res.status(400).json({ error: "Nieprawidłowy identyfikator zakupu." });
  }

  try {
    await ensureEventSalesColumns();
    await ensureTicketPurchasesTable();
    await sql`BEGIN`;

    const purchaseRows = await sql`
      SELECT
        tp.id,
        tp.user_id,
        tp.event_id,
        tp.ticket_type_id,
        tp.quantity,
        tp.refunded_at,
        e.date AS event_date,
        COALESCE(e.allow_ticket_returns, false) AS allow_ticket_returns
      FROM ticket_purchases tp
      JOIN events e ON e.id = tp.event_id
      WHERE tp.id = ${purchaseId}
        AND tp.user_id = ${authUser.userId}
      LIMIT 1
    `;

    const purchase = purchaseRows[0];

    if (!purchase) {
      await sql`ROLLBACK`;
      return res.status(404).json({ error: "Zakup nie został znaleziony." });
    }

    if (purchase.refunded_at) {
      await sql`ROLLBACK`;
      return res.status(409).json({ error: "Ten zakup został już zwrócony." });
    }

    if (!purchase.allow_ticket_returns) {
      await sql`ROLLBACK`;
      return res.status(403).json({ error: "Organizator nie umożliwia zwrotów dla tego wydarzenia." });
    }

    const eventTime = Date.parse(String(purchase.event_date));
    if (Number.isNaN(eventTime)) {
      await sql`ROLLBACK`;
      return res.status(409).json({ error: "Nie udało się ustalić daty wydarzenia." });
    }

    if (eventTime - Date.now() < REFUND_WINDOW_MS) {
      await sql`ROLLBACK`;
      return res.status(403).json({ error: "Zwrot jest możliwy najpóźniej 7 dni przed wydarzeniem." });
    }

    await sql`
      UPDATE events
      SET
        available_tickets = COALESCE(available_tickets, 0) + ${purchase.quantity},
        sold_tickets = GREATEST(COALESCE(sold_tickets, 0) - ${purchase.quantity}, 0)
      WHERE id = ${purchase.event_id}
    `;

    const ticketTypeColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ticket_types'
    `;
    const ticketTypeColumnNames = new Set(
      ticketTypeColumns.map((column: any) => String(column.column_name))
    );
    const hasSoldColumn = ticketTypeColumnNames.has("sold");

    if (hasSoldColumn) {
      await sql`
        UPDATE ticket_types
        SET
          available = available + ${purchase.quantity},
          sold = GREATEST(COALESCE(sold, 0) - ${purchase.quantity}, 0)
        WHERE id = ${purchase.ticket_type_id}
      `;
    } else {
      await sql`
        UPDATE ticket_types
        SET available = available + ${purchase.quantity}
        WHERE id = ${purchase.ticket_type_id}
      `;
    }

    await sql`
      UPDATE ticket_purchases
      SET refunded_at = NOW()
      WHERE id = ${purchaseId}
    `;

    await sql`COMMIT`;
    return res.status(200).json({ success: true });
  } catch (error) {
    try {
      await sql`ROLLBACK`;
    } catch {
      // Ignore rollback errors
    }
    console.error("REFUND TICKET ERROR:", error);
    return res.status(500).json({ error: "Nie udało się zwrócić biletów." });
  }
}
