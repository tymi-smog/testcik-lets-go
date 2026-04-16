import { sql } from "./db.js";

let ensureEventSalesColumnsPromise = null;

export async function ensureEventSalesColumns() {
  if (!ensureEventSalesColumnsPromise) {
    ensureEventSalesColumnsPromise = (async () => {
      await sql`
        ALTER TABLE events
        ADD COLUMN IF NOT EXISTS sold_tickets INTEGER NOT NULL DEFAULT 0
      `;
    })().catch((error) => {
      ensureEventSalesColumnsPromise = null;
      throw error;
    });
  }

  return ensureEventSalesColumnsPromise;
}
