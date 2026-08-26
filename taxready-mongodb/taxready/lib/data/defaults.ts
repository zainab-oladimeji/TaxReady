import { BusinessType, CountryCode } from "@/types";

/**
 * Defaults used when creating a REAL user's starter business on first
 * sign-in (see getOrCreateBusinessForUser in lib/db/repositories.ts).
 *
 * These happen to match the demo business's country/currency/type today
 * because Nigeria/NGN/Retail is the app's initial target market — but they
 * are deliberately their own constant, not imported from
 * lib/data/demo-data.ts. Real business records must never be coupled to
 * the demo dataset: importing from demo-data.ts here would mean a future
 * change to the demo business (e.g. renaming it, changing its country for
 * a demo scenario) could silently change what real new users get.
 */
export const NEW_BUSINESS_DEFAULTS: { type: BusinessType; country: CountryCode; currency: string } = {
  type: "Retail",
  country: "NG",
  currency: "NGN"
};
