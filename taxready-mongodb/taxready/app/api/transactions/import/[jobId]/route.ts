import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrCreateBusinessForUser, getImportJob } from "@/lib/db/repositories";

// Polled by the frontend (see components/dashboard/import-csv-modal.tsx)
// while a background import is in progress. businessId is resolved from
// the session, then getImportJob scopes the lookup to it — a user can
// never poll another business's job by guessing/enumerating jobId.
export async function GET(_req: Request, { params }: { params: { jobId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const business = await getOrCreateBusinessForUser(userId, session.user.email ?? "");

  const job = await getImportJob(business.id, params.jobId);
  if (!job) return NextResponse.json({ error: "Import job not found" }, { status: 404 });

  return NextResponse.json({ job });
}
