import { CountryCode, CountryTaxConfig } from "@/types";

// Country tax configuration is intentionally data, not code branching.
// Nothing elsewhere in the app should special-case "Nigeria" directly —
// it should read from the active CountryTaxConfig instead.
// This is what lets TaxReady expand to Ghana, Kenya, South Africa and the UK
// without rewriting the transaction/reporting logic.

const NIGERIA: CountryTaxConfig = {
  countryCode: "NG",
  countryName: "Nigeria",
  currency: "NGN",
  currencySymbol: "₦",
  taxRulesVersion: "2026.1",
  vatLabel: "VAT",
  vatRate: 0.075,
  withholdingTaxLabel: "Withholding Tax (WHT)",
  reportingPeriods: [
    { label: "Q1", startMonth: 1, endMonth: 3 },
    { label: "Q2", startMonth: 4, endMonth: 6 },
    { label: "Q3", startMonth: 7, endMonth: 9 },
    { label: "Q4", startMonth: 10, endMonth: 12 }
  ],
  categories: [
    { key: "sales", label: "Sales", description: "Revenue from goods sold" },
    { key: "service_revenue", label: "Service Revenue", description: "Revenue from services rendered" },
    { key: "other_income", label: "Other Income", description: "Non-core income" },
    { key: "inventory", label: "Inventory", description: "Stock and raw materials" },
    { key: "rent", label: "Rent", description: "Business premises rent" },
    { key: "utilities", label: "Utilities", description: "Electricity, water, internet" },
    { key: "salaries", label: "Salaries", description: "Staff compensation" },
    { key: "transportation", label: "Transportation", description: "Logistics and travel" },
    { key: "marketing", label: "Marketing", description: "Advertising and promotion" },
    { key: "software", label: "Software", description: "Subscriptions and tools" },
    { key: "office_supplies", label: "Office Supplies", description: "Consumables and equipment" },
    { key: "professional_services", label: "Professional Services", description: "Legal, accounting, consulting" },
    { key: "banking_fees", label: "Banking Fees", description: "Transaction and bank charges" },
    { key: "other_expense", label: "Other Business Expenses", description: "Uncategorized expenses" }
  ],
  complianceChecklist: [
    "Transactions categorized",
    "Receipts attached to major expenses",
    "VAT-relevant transactions flagged",
    "Withholding tax transactions flagged",
    "Uncategorized transactions reviewed",
    "Tax-period summary reviewed"
  ],
  disclaimer:
    "This information is for preparation purposes and should be reviewed by a qualified tax professional. TaxReady does not file taxes or provide legal advice."
};

const GHANA: CountryTaxConfig = {
  ...NIGERIA,
  countryCode: "GH",
  countryName: "Ghana",
  currency: "GHS",
  currencySymbol: "₵",
  vatRate: null,
  taxRulesVersion: "not_configured"
};

const KENYA: CountryTaxConfig = {
  ...NIGERIA,
  countryCode: "KE",
  countryName: "Kenya",
  currency: "KES",
  currencySymbol: "KSh",
  vatRate: null,
  taxRulesVersion: "not_configured"
};

const SOUTH_AFRICA: CountryTaxConfig = {
  ...NIGERIA,
  countryCode: "ZA",
  countryName: "South Africa",
  currency: "ZAR",
  currencySymbol: "R",
  vatRate: null,
  taxRulesVersion: "not_configured"
};

const UNITED_KINGDOM: CountryTaxConfig = {
  ...NIGERIA,
  countryCode: "GB",
  countryName: "United Kingdom",
  currency: "GBP",
  currencySymbol: "£",
  vatLabel: "VAT",
  vatRate: null,
  withholdingTaxLabel: "Withholding Tax",
  taxRulesVersion: "not_configured"
};

export const COUNTRY_TAX_CONFIGS: Record<CountryCode, CountryTaxConfig> = {
  NG: NIGERIA,
  GH: GHANA,
  KE: KENYA,
  ZA: SOUTH_AFRICA,
  GB: UNITED_KINGDOM
};

export function getCountryTaxConfig(countryCode: CountryCode): CountryTaxConfig {
  return COUNTRY_TAX_CONFIGS[countryCode] ?? NIGERIA;
}

export function isCountryFullyConfigured(countryCode: CountryCode): boolean {
  return COUNTRY_TAX_CONFIGS[countryCode]?.taxRulesVersion !== "not_configured";
}
