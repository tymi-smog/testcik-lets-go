import { sql } from "./db.js";

let ensureTablePromise = null;

export async function ensureTicketPurchasesTable() {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS ticket_purchases (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL,
          event_id BIGINT NOT NULL,
          event_title TEXT NOT NULL,
          ticket_type_id BIGINT NOT NULL,
          ticket_type_name TEXT NOT NULL,
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          unit_price NUMERIC(12, 2) NOT NULL,
          line_total NUMERIC(12, 2) NOT NULL,
          purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        ALTER TABLE ticket_purchases
        ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ NULL
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_ticket_purchases_user_purchased_at
        ON ticket_purchases (user_id, purchased_at DESC)
      `;
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  return ensureTablePromise;
}
