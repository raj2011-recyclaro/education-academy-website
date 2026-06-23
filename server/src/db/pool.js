import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : false,
});

export async function query(text, params) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing.");
  }
  return pool.query(text, params);
}
