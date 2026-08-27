import { MongoClient, Db } from "mongodb";
import { constants as cryptoConstants } from "crypto";
import { createSecureContext } from "tls";

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

  const client = new MongoClient(uri, {
    secureContext: createSecureContext({
      secureOptions: cryptoConstants.SSL_OP_LEGACY_SERVER_CONNECT
    }),
    // Every Vercel serverless function instance that touches MongoDB
    // opens its OWN connection pool — the driver defaults to up to 100
    // connections per pool if this isn't set. On an Atlas M0 (free tier)
    // cluster, whose hard cap is 500 total connections, that's enough for
    // a handful of concurrent function instances to exhaust the limit
    // entirely (this is exactly what triggered MongoDB's "nearing
    // maximum connections" alert — see the email that prompted this
    // comment). A single serverless instance only ever runs one request
    // at a time, so it never needs more than a few connections; capping
    // this low keeps total usage bounded no matter how many instances
    // Vercel spins up concurrently — including the QStash-triggered
    // classify-chunk workers (app/api/jobs/classify-chunk), which can run
    // many instances in parallel during a large statement import.
    maxPoolSize: 5,
    minPoolSize: 0,
    // Release idle connections quickly rather than holding them open —
    // serverless instances often go idle between invocations and then
    // get frozen/reused or torn down, so there's no benefit to keeping a
    // connection warm the way there would be on a long-lived server.
    maxIdleTimeMS: 30_000
  });
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