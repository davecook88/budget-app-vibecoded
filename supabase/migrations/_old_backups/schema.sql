-- ================================================
-- PRESUPUESTO - Personal Finance PWA Schema
-- Multi-currency support for couples in Mexico
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- USERS TABLE
-- Stores user profile information
-- ================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  default_currency TEXT NOT NULL DEFAULT 'MXN' CHECK (default_currency IN ('MXN', 'USD')),
  household_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- HOUSEHOLDS TABLE
-- Groups users together for shared expense tracking
-- ================================================
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'My Household',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key for household
ALTER TABLE users ADD CONSTRAINT fk_household 
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL;

-- ================================================
-- WALLETS TABLE
-- Supports multiple currencies (MXN, USD)
-- ================================================
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('MXN', 'USD')),
  initial_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- CATEGORIES TABLE
-- Expense/income categories
-- ================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'circle',
  color TEXT NOT NULL DEFAULT '#6366f1',
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- TRANSACTIONS TABLE
-- Core financial transactions with exchange rate storage
-- ================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount DECIMAL(12, 2) NOT NULL,
  original_currency TEXT NOT NULL CHECK (original_currency IN ('MXN', 'USD')),
  exchange_rate_used DECIMAL(10, 6) NOT NULL DEFAULT 1.0,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id UUID,
  tags TEXT[] DEFAULT '{}',
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income', 'transfer')),
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Offline sync support
  local_id TEXT,
  synced_at TIMESTAMPTZ
);

-- ================================================
-- BUDGETS TABLE
-- Monthly budget limits per category with rollover
-- ================================================
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN' CHECK (currency IN ('MXN', 'USD')),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  rollover_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, month, year, user_id)
);

-- ================================================
-- TRIPS TABLE
-- Trip mode for travel expense tracking
-- ================================================
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  budget DECIMAL(12, 2),
  budget_currency TEXT DEFAULT 'MXN' CHECK (budget_currency IN ('MXN', 'USD')),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key for trip in transactions
ALTER TABLE transactions ADD CONSTRAINT fk_trip 
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL;

-- ================================================
-- INDEXES
-- ================================================
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_trip ON transactions(trip_id);
CREATE INDEX idx_transactions_local_id ON transactions(local_id);
CREATE INDEX idx_wallets_owner ON wallets(owner_id);
CREATE INDEX idx_budgets_category_period ON budgets(category_id, year, month);
CREATE INDEX idx_trips_user ON trips(user_id);
CREATE INDEX idx_trips_active ON trips(is_active) WHERE is_active = TRUE;

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY users_select ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = id);

-- Household access
CREATE POLICY households_select ON households FOR SELECT USING (
  id IN (SELECT household_id FROM users WHERE id = auth.uid())
);

-- Wallets - own or shared household wallets
CREATE POLICY wallets_select ON wallets FOR SELECT USING (
  owner_id = auth.uid() OR 
  (is_shared = TRUE AND household_id IN (SELECT household_id FROM users WHERE id = auth.uid()))
);
CREATE POLICY wallets_insert ON wallets FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY wallets_update ON wallets FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY wallets_delete ON wallets FOR DELETE USING (owner_id = auth.uid());

-- Categories - own, household, or system
CREATE POLICY categories_select ON categories FOR SELECT USING (
  user_id = auth.uid() OR 
  is_system = TRUE OR
  household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
);
CREATE POLICY categories_insert ON categories FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY categories_update ON categories FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY categories_delete ON categories FOR DELETE USING (user_id = auth.uid() AND is_system = FALSE);

-- Transactions - own or shared
CREATE POLICY transactions_select ON transactions FOR SELECT USING (
  user_id = auth.uid() OR 
  (is_shared = TRUE AND wallet_id IN (
    SELECT id FROM wallets WHERE household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
  ))
);
CREATE POLICY transactions_insert ON transactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY transactions_update ON transactions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY transactions_delete ON transactions FOR DELETE USING (user_id = auth.uid());

-- Budgets - own or household
CREATE POLICY budgets_select ON budgets FOR SELECT USING (
  user_id = auth.uid() OR 
  household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
);
CREATE POLICY budgets_insert ON budgets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY budgets_update ON budgets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY budgets_delete ON budgets FOR DELETE USING (user_id = auth.uid());

-- Trips - own or household
CREATE POLICY trips_select ON trips FOR SELECT USING (
  user_id = auth.uid() OR 
  household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
);
CREATE POLICY trips_insert ON trips FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY trips_update ON trips FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY trips_delete ON trips FOR DELETE USING (user_id = auth.uid());

-- ================================================
-- DEFAULT SYSTEM CATEGORIES
-- ================================================
INSERT INTO categories (name, icon, color, type, is_system) VALUES
  ('Food & Dining', 'utensils', '#ef4444', 'expense', TRUE),
  ('Transportation', 'car', '#f97316', 'expense', TRUE),
  ('Shopping', 'shopping-bag', '#eab308', 'expense', TRUE),
  ('Entertainment', 'film', '#22c55e', 'expense', TRUE),
  ('Bills & Utilities', 'zap', '#06b6d4', 'expense', TRUE),
  ('Health', 'heart', '#ec4899', 'expense', TRUE),
  ('Travel', 'plane', '#8b5cf6', 'expense', TRUE),
  ('Education', 'book', '#6366f1', 'expense', TRUE),
  ('Personal Care', 'smile', '#14b8a6', 'expense', TRUE),
  ('Groceries', 'shopping-cart', '#84cc16', 'expense', TRUE),
  ('Fun Money', 'gamepad-2', '#f472b6', 'expense', TRUE),
  ('Home', 'home', '#a855f7', 'expense', TRUE),
  ('Salary', 'briefcase', '#10b981', 'income', TRUE),
  ('Freelance', 'laptop', '#3b82f6', 'income', TRUE),
  ('Investments', 'trending-up', '#6366f1', 'income', TRUE),
  ('Other Income', 'plus-circle', '#8b5cf6', 'income', TRUE);

-- ================================================
-- FUNCTIONS
-- ================================================

-- Function to calculate budget rollover
CREATE OR REPLACE FUNCTION calculate_budget_rollover(
  p_category_id UUID,
  p_year INTEGER,
  p_month INTEGER,
  p_user_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  v_budget_amount DECIMAL;
  v_spent DECIMAL;
  v_prev_rollover DECIMAL;
  v_prev_month INTEGER;
  v_prev_year INTEGER;
BEGIN
  -- Get budget amount
  SELECT amount INTO v_budget_amount
  FROM budgets
  WHERE category_id = p_category_id 
    AND year = p_year 
    AND month = p_month
    AND (user_id = p_user_id OR household_id IN (SELECT household_id FROM users WHERE id = p_user_id));

  IF v_budget_amount IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate spent this month
  SELECT COALESCE(SUM(amount), 0) INTO v_spent
  FROM transactions
  WHERE category_id = p_category_id
    AND EXTRACT(YEAR FROM date) = p_year
    AND EXTRACT(MONTH FROM date) = p_month
    AND type = 'expense'
    AND (user_id = p_user_id OR is_shared = TRUE);

  -- Calculate previous month
  IF p_month = 1 THEN
    v_prev_month := 12;
    v_prev_year := p_year - 1;
  ELSE
    v_prev_month := p_month - 1;
    v_prev_year := p_year;
  END IF;

  -- Get previous month rollover (recursive)
  v_prev_rollover := calculate_budget_rollover(p_category_id, v_prev_year, v_prev_month, p_user_id);

  -- Return current rollover: budget - spent + previous rollover
  RETURN v_budget_amount - v_spent + v_prev_rollover;
END;
$$ LANGUAGE plpgsql;

-- Function to get safe-to-spend amount
CREATE OR REPLACE FUNCTION get_safe_to_spend(
  p_user_id UUID,
  p_currency TEXT DEFAULT 'MXN'
) RETURNS DECIMAL AS $$
DECLARE
  v_total_budget DECIMAL;
  v_total_spent DECIMAL;
  v_days_left INTEGER;
BEGIN
  -- Get total budget for current month
  SELECT COALESCE(SUM(amount), 0) INTO v_total_budget
  FROM budgets
  WHERE (user_id = p_user_id OR household_id IN (SELECT household_id FROM users WHERE id = p_user_id))
    AND year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND month = EXTRACT(MONTH FROM CURRENT_DATE)
    AND currency = p_currency;

  -- Get total spent this month
  SELECT COALESCE(SUM(
    CASE WHEN original_currency = p_currency THEN amount
         ELSE amount * exchange_rate_used
    END
  ), 0) INTO v_total_spent
  FROM transactions
  WHERE (user_id = p_user_id OR is_shared = TRUE)
    AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND type = 'expense';

  -- Calculate days left in month
  v_days_left := DATE_PART('day', 
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'
  ) - DATE_PART('day', CURRENT_DATE) + 1;

  -- Return daily safe-to-spend
  IF v_days_left > 0 THEN
    RETURN (v_total_budget - v_total_spent) / v_days_left;
  ELSE
    RETURN v_total_budget - v_total_spent;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER households_updated_at BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
