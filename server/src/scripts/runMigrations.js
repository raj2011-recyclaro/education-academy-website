import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query } from "../db/pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlDir = path.resolve(__dirname, "../../sql");

try {
  const files = (await fs.readdir(sqlDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  if (!files.length) {
    console.log("No migration files found.");
  }

  for (const file of files) {
    const sql = await fs.readFile(path.join(sqlDir, file), "utf8");
    console.log(`Running migration: ${file}`);
    await query(sql);
    console.log(`Finished migration: ${file}`);
  }

  console.log("Migrations complete.");
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
