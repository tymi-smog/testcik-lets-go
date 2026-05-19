import { sql } from "./db.js";

let ensureUserBanColumnsPromise = null;

export async function ensureUserBanColumns() {
  if (!ensureUserBanColumnsPromise) {
    ensureUserBanColumnsPromise = (async () => {
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS ban_until TIMESTAMPTZ NULL
      `;

      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS ban_reason TEXT NULL
      `;

      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ NULL
      `;
    })().catch((error) => {
      ensureUserBanColumnsPromise = null;
      throw error;
    });
  }

  return ensureUserBanColumnsPromise;
}
