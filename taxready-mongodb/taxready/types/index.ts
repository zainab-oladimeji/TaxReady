// Core domain types for TaxReady.
// These mirror the intended Firestore document shapes described in ARCHITECTURE.md,
// so the same types work whether data comes from Firestore or the in-memory demo store.

export type TransactionType = "income" | "expense";

export type TransactionStatus = "pending" | "reviewed" | "flagged";

export type TaxRelevance =
  | "vat_related"
  | "withholding_tax_related"
  | "potentially_deductible"
  | "needs_documentation"
  | "review_required"
  | "not_tax_relevant";

export interface Transaction {
  id: string;
  businessId: string;
  date: string; // ISO date
  description: string;
  merchant?: string;
  amount: number;
  currency: string;
  type: TransactionType;
  category: string;
  subcategory?: string;
  taxRelevance?: TaxRelevance;
  aiConfidence?: number; // 0-1
  aiReason?: string;
  receiptId?: string;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  businessId: string;
  fileName: string;
  merchant?: string;
  date?: string;
  amount?: number;
  vatAmount?: number;
  currency?: string;
  category?: string;
  paymentMethod?: string;
  aiConfidence?: number;
  transactionId?: string;
  storageUrl?: string;
  status: "processing" | "extracted" | "matched" | "needs_review";
  createdAt: string;
}

export type ReportType =
  | "transaction_report"
  | "expense_report"
  | "revenue_report"
  | "tax_period_summary"
  | "receipt_report"
  | "accountant_review_pack";

export interface Report {
  id: string;
  businessId: string;
  type: ReportType;
  title: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  summary: string;
}

export type BusinessType =
  | "Retail"
  | "Food & Beverage"
  | "Professional Services"
  | "Technology"
  | "Manufacturing"
  | "Other";

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  type: BusinessType;
  country: CountryCode;
  state?: string;
  currency: string;
  createdAt: string;
}

export type CountryCode = "NG" | "GH" | "KE" | "ZA" | "GB";

export interface ReportingPeriod {
  label: string;
  startMonth: number; // 1-12
  endMonth: number;
}

export interface TaxCategory {
  key: string;
  label: string;
  description: string;
}

export interface CountryTaxConfig {
  countryCode: CountryCode;
  countryName: string;
  currency: string;
  currencySymbol: string;
  taxRulesVersion: string;
  vatLabel: string;
  vatRate: number | null;
  withholdingTaxLabel: string;
  reportingPeriods: ReportingPeriod[];
  categories: TaxCategory[];
  complianceChecklist: string[];
  disclaimer: string;
}

export interface Member {
  id: string;
  businessId: string;
  userId: string;
  role: "owner" | "staff" | "accountant";
  email: string;
  invitedAt: string;
  status: "active" | "invited";
}

export interface ClassificationResult {
  category: string;
  subcategory?: string;
  taxRelevance: TaxRelevance;
  confidence: number;
  reason: string;
  requiresReview: boolean;
}

export interface ReceiptExtraction {
  merchant: string;
  date: string;
  amount: number;
  vatAmount?: number;
  currency: string;
  category: string;
  paymentMethod?: string;
  confidence: number;
}

export interface FinancialContext {
  businessId: string;
  transactions: Transaction[];
  receipts: Receipt[];
}

export interface AIResponse {
  answer: string;
  citedTransactionIds?: string[];
  disclaimer?: string;
}

export interface Anomaly {
  transactionId: string;
  reason: string;
  severity: "low" | "medium" | "high";
}

export interface PeriodSummary {
  periodLabel: string;
  totalRevenue: number;
  totalExpenses: number;
  netPosition: number;
  transactionCount: number;
  categorizedCount: number;
  needsReviewCount: number;
  narrative: string;
}

export interface ReadinessBreakdown {
  score: number; // 0-100
  label: string;
  checks: { label: string; passed: boolean; detail: string }[];
}
