/**
 * Manual database backup script.
 *
 * MongoDB Atlas's free (M0) tier doesn't include automated backups — that
 * only starts at the paid M10 tier. This script is the practical stand-in:
 * run it now and then (weekly is a reasonable habit) to export every
 * collection to timestamped JSON files you can restore from if something
 * ever goes wrong.
 *
 * Usage:
 *   node scripts/backup.js
 *
 * Reads MONGODB_URI / MONGODB_DB_NAME the same way the app does. Works
 * with a plain `node scripts/backup.js` — no extra packages needed, and no
 * need to remember command-line flags — because it loads .env.local
 * itself (see loadEnvLocal below) if those variables aren't already set
 * in your shell.
 */

const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

// Every collection the app actually writes to (see lib/db/repositories.ts
// and lib/auth/*.ts). auth_tokens is deliberately excluded — those are
// short-lived, self-expiring verification/reset tokens with no lasting
// value to back up.
const COLLECTIONS = ["users", "businesses", "members", "transactions", "receipts", "reports", "accountant_clients"];

function loadEnvFile(fileName) {
  const envPath = path.join(__dirname, "..", fileName);
  if (!fs.existsSync(envPath)) return false;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip matching surrounding quotes, if present.
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
  return true;
}

function loadEnvLocal() {
  // Checks both — this project's local setup uses a plain .env rather
  // than .env.local, so both are supported instead of assuming one.
  const loadedLocal = loadEnvFile(".env.local");
  const loadedEnv = loadEnvFile(".env");
  if (loadedLocal) console.log("Loaded .env.local");
  else if (loadedEnv) console.log("Loaded .env");
}

async function main() {
  loadEnvLocal();

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || "taxready";
  if (!uri) {
    console.error("Missing MONGODB_URI. Add it to .env or .env.local, or set it in your shell before running this.");
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(__dirname, "..", "backups", timestamp);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Connecting to database "${dbName}"...`);
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  let totalDocs = 0;
  for (const name of COLLECTIONS) {
    const docs = await db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(docs, null, 2));
    console.log(`  ${name}: ${docs.length} document(s)`);
    totalDocs += docs.length;
  }

  await client.close();
  console.log(`\nDone. ${totalDocs} total documents backed up to backups/${timestamp}/`);
  console.log("Keep this folder somewhere safe — it's not committed to git (see .gitignore).");
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
