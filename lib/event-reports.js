import { sql } from "./db.js";

let ensureReportsTablePromise = null;

export async function ensureEventReportsTable() {
  if (!ensureReportsTablePromise) {
    ensureReportsTablePromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS event_reports (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL,
          event_id BIGINT NOT NULL,
          reason TEXT NOT NULL,
          details TEXT NULL,
          status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (user_id, event_id)
        )
      `;

      await sql`
        ALTER TABLE event_reports
        ADD COLUMN IF NOT EXISTS details TEXT NULL
      `;

      await sql`
        ALTER TABLE event_reports
        ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open'
      `;

      await sql`
        ALTER TABLE event_reports
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_event_reports_event_status
        ON event_reports (event_id, status, created_at DESC)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_event_reports_user_event
        ON event_reports (user_id, event_id)
      `;
    })().catch((error) => {
      ensureReportsTablePromise = null;
      throw error;
    });
  }

  return ensureReportsTablePromise;
}
