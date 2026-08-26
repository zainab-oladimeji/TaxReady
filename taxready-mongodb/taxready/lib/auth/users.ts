import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  emailVerified?: boolean;
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
  return {
    id: String(doc._id),
    email: doc.email,
    name: doc.name,
    passwordHash: doc.passwordHash,
    emailVerified: Boolean(doc.emailVerified)
  };
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const db = await getDb();
  const doc = await db.collection("users").findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  return {
    id: String(doc._id),
    email: doc.email,
    name: doc.name,
    passwordHash: doc.passwordHash,
    emailVerified: Boolean(doc.emailVerified)
  };
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
    emailVerified: false,
    createdAt: now
  });
  return { id: String(result.insertedId), email: email.toLowerCase(), name, emailVerified: false };
}

export async function markEmailVerified(userId: string): Promise<void> {
  const db = await getDb();
  await db.collection("users").updateOne({ _id: new ObjectId(userId) }, { $set: { emailVerified: true } });
}

export async function updatePasswordHash(userId: string, newPassword: string): Promise<void> {
  const db = await getDb();
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.collection("users").updateOne({ _id: new ObjectId(userId) }, { $set: { passwordHash } });
}

export async function upsertOAuthUser(email: string, name: string): Promise<void> {
  const db = await getDb();
  // Google-verified emails are trustworthy without our own verification
  // step, so OAuth sign-ins are marked verified on creation.
  await db.collection("users").updateOne(
    { email: email.toLowerCase() },
    { $setOnInsert: { email: email.toLowerCase(), name, emailVerified: true, createdAt: new Date().toISOString() } },
    { upsert: true }
  );
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
