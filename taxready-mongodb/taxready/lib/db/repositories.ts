import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { Business, Transaction, Receipt, Report, Member } from "@/types";
import { DEMO_BUSINESS } from "@/lib/data/demo-data";

/**
 * Every function here scopes reads/writes by businessId, and every
 * business is reached only through a membership check first
 * (getBusinessForUser / assertMembership). API routes should never query
 * these collections with a businessId taken from the request body alone —
 * always resolve it via the authenticated session first. See SECURITY.md.
 */

function withId<T extends { id: string }>(doc: any): T {
  const { _id, ...rest } = doc;
  return { id: String(_id), ...rest } as T;
}

export async function getOrCreateBusinessForUser(userId: string, email: string): Promise<Business> {
  const db = await getDb();
  const businesses = db.collection("businesses");
  const members = db.collection("members");

  const membership = await members.findOne({ userId });
  if (membership) {
    const biz = await businesses.findOne({ _id: new ObjectId(membership.businessId) });
    if (biz) return withId<Business>(biz);
  }

  // First sign-in: create a starter business owned by this user, seeded
  // from the same shape as the demo business so onboarding has sane
  // defaults the user can rename in Settings.
  const now = new Date().toISOString();
  const insertResult = await businesses.insertOne({
    ownerId: userId,
    name: "My Business",
    type: DEMO_BUSINESS.type,
    country: DEMO_BUSINESS.country,
    currency: DEMO_BUSINESS.currency,
    createdAt: now
  });

  await members.insertOne({
    businessId: String(insertResult.insertedId),
    userId,
    role: "owner",
    email,
    invitedAt: now,
    status: "active"
  });

  return {
    id: String(insertResult.insertedId),
    ownerId: userId,
    name: "My Business",
    type: DEMO_BUSINESS.type,
    country: DEMO_BUSINESS.country,
    currency: DEMO_BUSINESS.currency,
    createdAt: now
  };
}

export async function assertMembership(businessId: string, userId: string): Promise<boolean> {
  const db = await getDb();
  const membership = await db.collection("members").findOne({ businessId, userId });
  return Boolean(membership);
}

export async function listTransactions(businessId: string): Promise<Transaction[]> {
  const db = await getDb();
  const docs = await db.collection("transactions").find({ businessId }).sort({ date: -1 }).limit(2000).toArray();
  return docs.map((d) => withId<Transaction>(d));
}

export async function insertTransactions(businessId: string, transactions: Omit<Transaction, "id">[]): Promise<Transaction[]> {
  const db = await getDb();
  const docs = transactions.map((t) => ({ ...t, businessId }));
  const result = await db.collection("transactions").insertMany(docs);
  return docs.map((d, i) => ({ id: String(result.insertedIds[i]), ...d }) as Transaction);
}

export async function updateTransaction(
  businessId: string,
  transactionId: string,
  updates: Partial<Pick<Transaction, "category" | "status" | "subcategory">>
): Promise<void> {
  const db = await getDb();
  await db.collection("transactions").updateOne(
    { _id: new ObjectId(transactionId), businessId },
    { $set: { ...updates, updatedAt: new Date().toISOString() } }
  );
}

export async function listReceipts(businessId: string): Promise<Receipt[]> {
  const db = await getDb();
  const docs = await db.collection("receipts").find({ businessId }).sort({ createdAt: -1 }).limit(1000).toArray();
  return docs.map((d) => withId<Receipt>(d));
}

export async function insertReceipt(businessId: string, receipt: Omit<Receipt, "id">): Promise<Receipt> {
  const db = await getDb();
  const doc = { ...receipt, businessId };
  const result = await db.collection("receipts").insertOne(doc);
  return { id: String(result.insertedId), ...doc } as Receipt;
}

export async function listReports(businessId: string): Promise<Report[]> {
  const db = await getDb();
  const docs = await db.collection("reports").find({ businessId }).sort({ createdAt: -1 }).limit(200).toArray();
  return docs.map((d) => withId<Report>(d));
}

export async function insertReport(businessId: string, report: Omit<Report, "id">): Promise<Report> {
  const db = await getDb();
  const doc = { ...report, businessId };
  const result = await db.collection("reports").insertOne(doc);
  return { id: String(result.insertedId), ...doc } as Report;
}

export async function listMembers(businessId: string): Promise<Member[]> {
  const db = await getDb();
  const docs = await db.collection("members").find({ businessId }).toArray();
  return docs.map((d) => withId<Member>(d));
}
