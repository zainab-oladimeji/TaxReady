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
    })
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