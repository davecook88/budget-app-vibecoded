// Database Types for Presupuesto
// Generated from schema.sql

export type Currency = string;
export type TransactionType = "expense" | "income" | "transfer";
export type CategoryType = "expense" | "income";

export interface User {
  id: string;
  email: string;
  name: string;
  default_currency: Currency;
  household_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  name: string;
  currency: Currency;
  initial_balance: number;
  owner_id: string;
  is_shared: boolean;
  household_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  user_id: string | null;
  household_id: string | null;
  is_system: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  amount: number;
  original_currency: Currency;
  exchange_rate_used: number;
  description: string | null;
  category_id: string | null;
  wallet_id: string;
  user_id: string;
  tags: string[];
  type: TransactionType;
  is_shared: boolean;
  date: string;
  created_at: string;
  updated_at: string;
  local_id: string | null;
  synced_at: string | null;
  // Default currency conversion (for reporting)
  default_currency_value: number | null;
  default_currency: Currency | null;
  // Joined data
  category?: Category;
  wallet?: Wallet;
}

export type BudgetPeriod =
  | "weekly"
  | "monthly"
  | "yearly"
  | "one-time"
  | "custom";
export type BudgetScope = "personal" | "household";

export interface Budget {
  id: string;
  name: string;
  tag: string;
  icon: string;
  color: string;
  amount: number;
  currency: Currency;
  period_type: BudgetPeriod;
  start_date: string | null;
  end_date: string | null;
  rollover_enabled: boolean;
  auto_tag_new_transactions: boolean;
  user_id: string | null;
  household_id: string | null;
  scope: BudgetScope;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

// Form types for creating/editing
export interface TransactionInput {
  amount: number;
  original_currency: Currency;
  exchange_rate_used: number;
  description?: string;
  category_id?: string;
  wallet_id: string;
  tags?: string[];
  type: TransactionType;
  is_shared?: boolean;
  date: string;
}

export interface WalletInput {
  name: string;
  currency: Currency;
  initial_balance?: number;
  is_shared?: boolean;
}

export interface BudgetInput {
  name: string;
  tag: string;
  icon?: string;
  color?: string;
  amount: number;
  currency: Currency;
  period_type: BudgetPeriod;
  start_date?: string;
  end_date?: string;
  rollover_enabled?: boolean;
  auto_tag_new_transactions?: boolean;
  scope: BudgetScope;
}

// Offline sync types
export interface PendingTransaction extends TransactionInput {
  local_id: string;
  created_at: string;
  pending: true;
}

export interface SyncQueueItem {
  id: string;
  type: "transaction" | "wallet" | "budget" | "trip";
  action: "create" | "update" | "delete";
  data: unknown;
  created_at: string;
  retries: number;
}

// Dashboard types
export interface DashboardStats {
  totalSpentThisMonth: number;
  safeToSpendDaily: number;
  safeToSpendTotal: number;
  daysLeftInMonth: number;
  currency: Currency;
}

export interface BudgetWithSpent extends Budget {
  spent: number;
  rollover: number;
  remaining: number;
  period_start: string;
  period_end: string;
  percentage: number;
}

// View modes
export type ViewMode = "personal" | "household";

export interface Trip {
  id: string;
  name: string;
  description?: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget_amount: number;
  currency: Currency;
  user_id: string;
  created_at: string;
  updated_at: string;
}
