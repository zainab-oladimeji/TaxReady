import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { Business, Transaction, Receipt, Report, Member, AccountantClient, ImportJob } from "@/types";
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
  const users = db.collection("users");

  // Respect the user's chosen active business (see setActiveBusinessForUser)
  // if they have more than one and it's still valid — falls back to "first
  // membership found" below for the common single-business case, so this
  // never changes behavior for anyone who's never touched multi-business.
  const userDoc = await users.findOne({ _id: new ObjectId(userId) });
  if (userDoc?.activeBusinessId) {
    const activeMembership = await members.findOne({ userId, businessId: userDoc.activeBusinessId });
    if (activeMembership) {
      const biz = await businesses.findOne({ _id: new ObjectId(userDoc.activeBusinessId) });
      if (biz) return withId<Business>(biz);
    }
  }

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
  updates: Partial<
    Pick<Transaction, "category" | "status" | "subcategory" | "taxRelevance" | "aiConfidence" | "aiReason">
  >
): Promise<void> {
  const db = await getDb();
  await db.collection("transactions").updateOne(
    { _id: new ObjectId(transactionId), businessId },
    { $set: { ...updates, updatedAt: new Date().toISOString() } }
  );
}

// Background import pipeline (app/api/transactions/import, app/api/jobs/classify-chunk).
// getBusinessById has no membership check, unlike everything else in this
// file — it's called only from the QStash-signed background worker, which
// runs with no user session at all (see SECURITY.md's note on this route).
export async function getBusinessById(businessId: string): Promise<Business | null> {
  const db = await getDb();
  const doc = await db.collection("businesses").findOne({ _id: new ObjectId(businessId) });
  return doc ? withId<Business>(doc) : null;
}

export async function createImportJob(businessId: string, fileName: string, totalRows: number): Promise<ImportJob> {
  const db = await getDb();
  const now = new Date().toISOString();
  const doc = {
    businessId,
    fileName,
    totalRows,
    processedRows: 0,
    reviewRows: 0,
    status: "processing" as const,
    createdAt: now,
    updatedAt: now
  };
  const result = await db.collection("import_jobs").insertOne(doc);
  return { id: String(result.insertedId), ...doc };
}

export async function getImportJob(businessId: string, jobId: string): Promise<ImportJob | null> {
  const db = await getDb();
  const doc = await db.collection("import_jobs").findOne({ _id: new ObjectId(jobId), businessId });
  return doc ? withId<ImportJob>(doc) : null;
}

// Atomic — many chunk workers can report progress on the same job
// concurrently, so this must be a single $inc, never a read-modify-write.
export async function advanceImportJob(
  jobId: string,
  processedDelta: number,
  reviewDelta: number
): Promise<ImportJob | null> {
  const db = await getDb();
  const result = await db.collection("import_jobs").findOneAndUpdate(
    { _id: new ObjectId(jobId) },
    { $inc: { processedRows: processedDelta, reviewRows: reviewDelta }, $set: { updatedAt: new Date().toISOString() } },
    { returnDocument: "after" }
  );
  const doc = result && "value" in result ? result.value : result;
  if (!doc) return null;
  const job = withId<ImportJob>(doc);
  if (job.status === "processing" && job.processedRows >= job.totalRows) {
    await db
      .collection("import_jobs")
      .updateOne({ _id: new ObjectId(jobId) }, { $set: { status: "completed", updatedAt: new Date().toISOString() } });
    job.status = "completed";
  }
  return job;
}

// Inserted immediately on upload with status "queued" and a placeholder
// category, so the row exists (and the upload response is instant) before
// any AI classification has run. Chunk workers fill in the real category
// via updateTransaction once classified.
export async function insertQueuedTransactions(
  businessId: string,
  importJobId: string,
  rows: { date: string; description: string; amount: number; currency: string; type: Transaction["type"] }[]
): Promise<Transaction[]> {
  const db = await getDb();
  const now = new Date().toISOString();
  const docs = rows.map((row) => ({
    ...row,
    businessId,
    importJobId,
    category: "Uncategorized",
    status: "queued" as const,
    createdAt: now,
    updatedAt: now
  }));
  const result = await db.collection("transactions").insertMany(docs);
  return docs.map((d, i) => ({ id: String(result.insertedIds[i]), ...d }) as Transaction);
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

// Multi-business support (/dashboard/businesses). A user can be a member
// of more than one business (e.g. they run two separate SMEs); which one
// is "active" — the one every other route (transactions, receipts,
// reports, AI) operates on — is stored on the user document and read by
// getOrCreateBusinessForUser above. Switching business never deletes or
// touches data in the business being switched away from.

export async function listBusinessesForUser(userId: string): Promise<Business[]> {
  const db = await getDb();
  const memberships = await db.collection("members").find({ userId }).toArray();
  if (memberships.length === 0) return [];
  const businessIds = memberships.map((m) => new ObjectId(m.businessId));
  const docs = await db.collection("businesses").find({ _id: { $in: businessIds } }).toArray();
  return docs.map((d) => withId<Business>(d));
}

export async function createAdditionalBusinessForUser(
  userId: string,
  email: string,
  fields: { name: string; type: Business["type"]; country: Business["country"]; currency: string }
): Promise<Business> {
  const db = await getDb();
  const now = new Date().toISOString();
  const insertResult = await db.collection("businesses").insertOne({
    ownerId: userId,
    name: fields.name,
    type: fields.type,
    country: fields.country,
    currency: fields.currency,
    createdAt: now
  });
  await db.collection("members").insertOne({
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
    name: fields.name,
    type: fields.type,
    country: fields.country,
    currency: fields.currency,
    createdAt: now
  };
}

export async function setActiveBusinessForUser(userId: string, businessId: string): Promise<boolean> {
  const db = await getDb();
  // Only allow switching to a business the user is actually a member of —
  // otherwise a manipulated businessId could redirect someone else's data
  // into view.
  const membership = await db.collection("members").findOne({ userId, businessId });
  if (!membership) return false;
  await db.collection("users").updateOne({ _id: new ObjectId(userId) }, { $set: { activeBusinessId: businessId } });
  return true;
}
