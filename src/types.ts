export type AccountType = "checking" | "savings" | "cash" | "credit";
export type DeadlineFrequency = "monthly" | "quarterly" | "annual";
export type PaymentMethodKind =
  | "card"
  | "cash"
  | "transfer"
  | "direct_debit"
  | "cheque"
  | "internal"
  | "other";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  createdAt: string;
}

export interface NewAccount {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  color?: string | null;
  createdAt: string;
  usageCount?: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  kind: PaymentMethodKind;
  createdAt: string;
  usageCount?: number;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  label: string;
  categoryId?: string | null;
  clearedAt?: string | null;
  reference?: string | null;
  paymentMethodId?: string | null;
  notes?: string;
  createdAt: string;
}

export interface TransactionView {
  id: string;
  accountId: string;
  accountName: string;
  currency: string;
  date: string;
  amount: number;
  label: string;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  clearedAt?: string | null;
  reference?: string | null;
  paymentMethodId?: string | null;
  paymentMethodName?: string | null;
  paymentMethodKind?: PaymentMethodKind | null;
  runningBalance?: number | null;
  notes?: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  year: number;
  annualAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Deadline {
  id: string;
  label: string;
  amount: number;
  currency: string;
  accountId: string;
  categoryId?: string | null;
  frequency: DeadlineFrequency;
  dayOfMonth: number;          // 1–31
  startDate: string;           // ISO yyyy-mm-dd
  endDate?: string | null;
  autoCreateTransaction: boolean;
  lastAppliedAt?: string | null;
  lastTransactionId?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

