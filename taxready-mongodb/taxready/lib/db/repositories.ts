import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { Business, Transaction, Receipt, Report, Member, AccountantClient } from "@/types";
import { NEW_BUSINESS_DEFAULTS } from "@/lib/data/defaults";

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
    type: NEW_BUSINESS_DEFAULTS.type,
    country: NEW_BUSINESS_DEFAULTS.country,
    currency: NEW_BUSINESS_DEFAULTS.currency,
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
    type: NEW_BUSINESS_DEFAULTS.type,
    country: NEW_BUSINESS_DEFAULTS.country,
    currency: NEW_BUSINESS_DEFAULTS.currency,
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

// Accountant Dashboard (/dashboard/accountant) — a separate workspace for
// accountants tracking multiple client businesses. Deliberately its own
// simple collection rather than reusing `members`/`businesses`: an
// accountant's client here is a bookkeeping status they're tracking, not
// necessarily a business the accountant has been granted access into (no
// invite-acceptance flow exists yet — see the note on inviteAccountantClient).
export async function listAccountantClients(accountantUserId: string): Promise<AccountantClient[]> {
  const db = await getDb();
  const docs = await db
    .collection("accountant_clients")
    .find({ accountantUserId })
    .sort({ invitedAt: -1 })
    .toArray();
  return docs.map((d) => withId<AccountantClient>(d));
}

export async function inviteAccountantClient(
  accountantUserId: string,
  name: string,
  email: string
): Promise<AccountantClient> {
  const db = await getDb();
  const now = new Date().toISOString();
  // New clients start as "Missing records" — genuinely true, since no
  // transactions/receipts exist for them yet. This is NOT the invite
  // being accepted/linked to the client's own account (that would need a
  // token-based accept flow, similar to email verification, joining this
  // record to the client's business once they sign up) — for now it's a
  // status the accountant tracks manually until that's built.
  const doc = { accountantUserId, name, email, status: "Missing records" as const, invitedAt: now };
  const result = await db.collection("accountant_clients").insertOne(doc);
  return { id: String(result.insertedId), ...doc };
}
