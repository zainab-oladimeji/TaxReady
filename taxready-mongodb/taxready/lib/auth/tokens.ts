import { randomBytes, createHash } from "crypto";
import { getDb } from "@/lib/db/mongodb";

/**
 * Verification and password-reset tokens, stored as SHA-256 hashes (never
 * the raw token) so a database read/leak alone can't be used to take over
 * an account — same principle as storing a password hash instead of the
 * password. The raw token only ever exists in the URL we email out.
 *
 * Both token kinds share one collection distinguished by `purpose`, with
 * a MongoDB TTL index on `expiresAt` so expired tokens clean themselves
 * up — see ensureAuthTokenIndexes(), called once from lib/db/repositories.ts.
 */

export type TokenPurpose = "email-verify" | "password-reset";

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

let indexesEnsured: Promise<void> | null = null;

/**
 * Called automatically before the first read/write in this module (see
 * createAuthToken/consumeAuthToken below) rather than requiring a manual
 * startup hook elsewhere — createIndex is idempotent and cheap once the
 * index already exists, and this keeps token support self-contained in
 * this one file.
 */
function ensureAuthTokenIndexes(): Promise<void> {
  if (!indexesEnsured) {
    indexesEnsured = (async () => {
      const db = await getDb();
      await db.collection("auth_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await db.collection("auth_tokens").createIndex({ tokenHash: 1, purpose: 1 }, { unique: true });
    })();
  }
  return indexesEnsured;
}

export async function createAuthToken(userId: string, purpose: TokenPurpose): Promise<string> {
  await ensureAuthTokenIndexes();
  const db = await getDb();
  const rawToken = randomBytes(32).toString("hex");
  const ttl = purpose === "email-verify" ? EMAIL_VERIFY_TTL_MS : PASSWORD_RESET_TTL_MS;

  // Invalidate any earlier outstanding tokens of the same purpose for this
  // user first, so only the most recently requested link/reset works.
  await db.collection("auth_tokens").deleteMany({ userId, purpose });
  await db.collection("auth_tokens").insertOne({
    userId,
    purpose,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + ttl),
    createdAt: new Date()
  });

  return rawToken;
}

/**
 * Verifies a raw token and, if valid, consumes it (deletes it) so it can't
 * be replayed. Returns the associated userId, or null if the token is
 * missing, expired, or already used.
 */
export async function consumeAuthToken(rawToken: string, purpose: TokenPurpose): Promise<string | null> {
  const db = await getDb();
  const tokenHash = hashToken(rawToken);
  const doc = await db.collection("auth_tokens").findOneAndDelete({ tokenHash, purpose });
  if (!doc) return null;
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) return null;
  return doc.userId as string;
}
