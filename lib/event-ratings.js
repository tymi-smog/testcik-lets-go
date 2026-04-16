import { sql } from "./db.js";

let ensureRatingsTablePromise = null;

export async function ensureEventRatingsTable() {
  if (!ensureRatingsTablePromise) {
    ensureRatingsTablePromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS event_ratings (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL,
          event_id BIGINT NOT NULL,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          review_text TEXT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (user_id, event_id)
        )
      `;

      await sql`
        ALTER TABLE event_ratings
        ADD COLUMN IF NOT EXISTS review_text TEXT NULL
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_event_ratings_user_event
        ON event_ratings (user_id, event_id)
      `;
    })().catch((error) => {
      ensureRatingsTablePromise = null;
      throw error;
    });
  }

  return ensureRatingsTablePromise;
}
