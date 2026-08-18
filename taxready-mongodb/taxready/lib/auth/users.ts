import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db/mongodb";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
}

/**
 * The `users` collection here is managed by us directly rather than via
 * @auth/mongodb-adapter — this keeps the schema simple and lets the
 * Credentials provider (email/password) and Google OAuth share one
 * collection without adapter-specific constraints. Auth.js sessions use
 * the JWT strategy (see auth.ts) since Credentials providers can't use
 * database sessions.
 */

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const db = await getDb();
  const doc = await db.collection("users").findOne({ email: email.toLowerCase() });
  if (!doc) return null;
  return { id: String(doc._id), email: doc.email, name: doc.name, passwordHash: doc.passwordHash };
}

export async function createUserWithPassword(email: string, password: string, name: string): Promise<UserRecord> {
  const db = await getDb();
  const existing = await db.collection("users").findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();
  const result = await db.collection("users").insertOne({
    email: email.toLowerCase(),
    name,
    passwordHash,
    createdAt: now
  });
  return { id: String(result.insertedId), email: email.toLowerCase(), name };
}

export async function upsertOAuthUser(email: string, name: string): Promise<void> {
  const db = await getDb();
  await db.collection("users").updateOne(
    { email: email.toLowerCase() },
    { $setOnInsert: { email: email.toLowerCase(), name, createdAt: new Date().toISOString() } },
    { upsert: true }
  );
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
