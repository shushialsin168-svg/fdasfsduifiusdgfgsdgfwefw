import { db } from '@/db';
import { sql } from 'drizzle-orm';

let ensured = false;

/**
 * Self-healing bootstrap: creates tables if missing AND adds any missing
 * columns (handles databases created with an older schema version).
 * Runs once per server process.
 */
export async function ensureTables() {
  if (ensured) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS downloads (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text NOT NULL,
      price numeric NOT NULL,
      file_url text NOT NULL
    )
  `);

  // Add columns that may be missing from older versions of the table
  await db.execute(sql`ALTER TABLE downloads ADD COLUMN IF NOT EXISTS image_url text`);
  await db.execute(sql`ALTER TABLE downloads ADD COLUMN IF NOT EXISTS category text`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      md5 text,
      amount numeric,
      currency text NOT NULL DEFAULT 'USD',
      status text NOT NULL DEFAULT 'pending',
      created_at timestamp NOT NULL DEFAULT now(),
      paid_at timestamp,
      download_unlocked boolean NOT NULL DEFAULT false
    )
  `);

  // Repair older payments tables missing columns
  await db.execute(sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS md5 text`);
  await db.execute(sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount numeric`);
  await db.execute(sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD'`);
  await db.execute(sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'`);
  await db.execute(sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now()`);
  await db.execute(sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at timestamp`);
  await db.execute(sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS download_unlocked boolean NOT NULL DEFAULT false`);

  // Ensure unique index on md5 (needed for ON CONFLICT). Ignore failure if
  // duplicate values already exist in an old table.
  try {
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS payments_md5_unique ON payments (md5)`);
  } catch {
    // non-fatal: conflict target may not work, but inserts still succeed
  }

  ensured = true;
}
