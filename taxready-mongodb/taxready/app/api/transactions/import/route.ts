import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { captureError } from "@/lib/monitoring";
import { getOrCreateBusinessForUser, createImportJob, insertQueuedTransactions } from "@/lib/db/repositories";
import { enqueueClassifyChunk, isQStashConfigured } from "@/lib/jobs/qstash";

// businessId is ALWAYS resolved from the authenticated session here —
// never accepted from the request body. See SECURITY.md.
//
// Unlike POST /api/transactions (the original synchronous import, still
// used as a fallback below and kept for imports under its own cap), this
// route never calls the AI provider inline. It saves every row as
// "queued" and returns immediately — classification happens in the
// background via QStash (see lib/jobs/qstash.ts and
// app/api/jobs/classify-chunk). This is what makes it safe to import a
// bank statement of any size in one go instead of splitting it into
// multiple files.

const CHUNK_SIZE = 20;

const importSchema = z.object({
  fileName: z.string().default("import.csv"),
  rows: z
    .array(
      z.object({
        date: z.string(),
        description: z.string().min(1),
        amount: z.number(),
        type: z.enum(["income", "expense"])
      })
    )
    .min(1)
    .max(10000)
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!isQStashConfigured()) {
    // Background imports need QSTASH_TOKEN configured (see
    // lib/jobs/qstash.ts) — without it there's no way to process chunks
    // outside the request/response cycle, so fail clearly instead of
    // silently hanging at 0% forever.
    return NextResponse.json(
      { error: "Background import isn't configured yet. Use the standard import for now." },
      { status: 503 }
    );
  }

  const json = await req.json();
  const parsed = importSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const userId = (session.user as { id: string }).id;
  const business = await getOrCreateBusinessForUser(userId, session.user.email ?? "");

  const job = await createImportJob(business.id, parsed.data.fileName, parsed.data.rows.length);

  const queued = await insertQueuedTransactions(
    business.id,
    job.id,
    parsed.data.rows.map((row) => ({
      date: row.date,
      description: row.description,
      amount: row.amount,
      type: row.type,
      currency: business.currency
    }))
  );

  const chunks: typeof queued[] = [];
  for (let i = 0; i < queued.length; i += CHUNK_SIZE) {
    chunks.push(queued.slice(i, i + CHUNK_SIZE));
  }

  try {
    await Promise.all(
      chunks.map((chunk) =>
        enqueueClassifyChunk({
          jobId: job.id,
          businessId: business.id,
          chunk: chunk.map((t) => ({
            id: t.id,
            description: t.description,
            amount: t.amount,
            type: t.type,
            currency: t.currency
          }))
        })
      )
    );
  } catch (err) {
    // The rows are already saved (status "queued") — a publish failure
    // here means some chunks won't be picked up, not that data was lost.
    // Surface it so the caller knows the job may stall, but don't undo
    // the insert.
    captureError("[api/transactions/import] failed to enqueue one or more chunks", err);
    return NextResponse.json(
      { jobId: job.id, totalRows: queued.length, warning: "Some chunks failed to queue — progress may stall." },
      { status: 207 }
    );
  }

  return NextResponse.json({ jobId: job.id, totalRows: queued.length });
}
