import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Allow tests to set DATABASE_URL later; do not throw at import time.
  console.warn('[db] DATABASE_URL is not set at import time');
}

export const pool = new Pool({
  connectionString
});
