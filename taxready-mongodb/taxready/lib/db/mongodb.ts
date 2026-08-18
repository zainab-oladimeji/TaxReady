import { MongoClient, Db } from "mongodb";

/**
 * Single MongoDB connection, created lazily on first use and reused across
 * hot reloads in dev and warm Cloud Run instances in production. This is
 * the ONLY place that should call `new MongoClient(...)` — every API route
 * and server function gets its DB handle via `getDb()`.
 *
 * Deliberately lazy: connecting eagerly at module load would throw during
 * `next build`'s page-data collection (which imports every route module)
 * whenever MONGODB_URI isn't set at build time — e.g. in CI, or when only
 * building the demo-mode parts of the app.
 */

const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME ?? "taxready";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI. Set it in .env.local (see .env.example) — e.g. a MongoDB Atlas connection string."
    );
  }
  const client = new MongoClient(uri);
  return client.connect();
}

export async function getDb(): Promise<Db> {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClientPromise();
  }
  const client = await global._mongoClientPromise;
  return client.db(MONGODB_DB_NAME);
}

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}
