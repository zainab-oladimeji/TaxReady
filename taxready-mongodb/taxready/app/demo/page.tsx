import { redirect } from "next/navigation";

export default function DemoEntryPage() {
  // The demo=1 flag tells middleware.ts to let an unauthenticated visitor
  // through to /dashboard — DataProvider then serves the fictional demo
  // dataset instead of trying to load a real (nonexistent) session business.
  redirect("/dashboard?demo=1");
}
