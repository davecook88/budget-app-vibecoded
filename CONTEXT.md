# Project Context: Presupuesto

This document provides a comprehensive overview of the "Presupuesto" application, designed to help AI assistants and new developers understand the project's architecture, features, and codebase.

## 1. Project Overview

"Presupuesto" is a **Progressive Web App (PWA)** for personal finance tracking, designed specifically for couples living in Mexico with multi-currency needs (MXN/USD). It is built with a modern tech stack including Next.js 14 and Supabase, and features a robust offline-first architecture.

### Core Features:
- **Multi-Currency Support**: Track expenses in both MXN and USD.
- **Offline-First**: Full offline functionality with automatic background sync.
- **Household Mode**: Toggle between personal and shared expense views.
- **Tag-Based Budgeting**: Create budgets with tags; transactions tagged with a budget's tag automatically count toward it.
- **Flexible Budget Periods**: Support for weekly, monthly, yearly, or custom date ranges.
- **Auto-Tagging**: Automatically apply budget tags to new transactions.
- **Smart Budgeting**: Optional rollover logic for budgets.
- **Safe-to-Spend**: A daily budget calculator.
- **PWA Installable**: Can be installed on iOS/Android home screens.

## 2. Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Database & Auth**: Supabase (PostgreSQL with RLS)
- **Styling**: Tailwind CSS
- **UI Components**: Custom React components, `lucide-react` for icons.
- **State Management**: React Context (`AuthContext`, `AppContext`).
- **PWA**: Custom Service Worker (`public/sw.js`) and `next-pwa`.
- **Language**: TypeScript

## 3. Project Structure

The project follows a standard Next.js App Router structure.

```
presupuesto/
├── src/
│   ├── app/                    # Next.js 14 App Router pages
│   │   ├── page.tsx           # Dashboard
│   │   ├── add/               # Add transaction page
│   │   ├── wallets/           # Wallet management
│   │   ├── budgets/           # Budget management (tag-based)
│   │   ├── transactions/      # Transaction history
│   │   ├── settings/          # User settings
│   │   ├── login/             # Authentication page
│   │   └── register/          # Registration page
│   ├── components/            # Reusable UI components
│   │   ├── BottomNav.tsx      # Main navigation bar
│   │   ├── QuickAdd.tsx       # Chat-style transaction entry
│   │   ├── SafeToSpend.tsx    # Daily spending indicator
│   │   ├── BudgetCard.tsx     # Budget display card
│   │   ├── AutoTagBanner.tsx  # Banner for auto-tagging budgets
│   │   └── ...
│   ├── contexts/              # React contexts for global state
│   │   ├── AuthContext.tsx    # Manages user authentication, profile, wallets, categories
│   │   └── AppContext.tsx     # Manages app-wide state like view mode, online status, active trip
│   └── lib/                   # Utility functions and libraries
│       ├── supabase.ts        # Supabase client initialization
│       ├── offline.ts         # Offline queue and sync logic
│       ├── parser.ts          # Parser for natural language transaction input
│       ├── currency.ts        # Currency formatting and conversion utilities
│       └── types.ts           # Core TypeScript types
├── supabase/
│   ├── schema.sql             # Full database schema, including tables, RLS, and functions
│   └── migrations/            # Database migrations
├── public/
│   ├── manifest.json          # PWA manifest file
│   └── sw.js                  # Service worker for offline capabilities
└── package.json               # Project dependencies and scripts
```

## 4. State Management

Global state is managed via two primary React Contexts:

### `AuthContext.tsx`
- **Purpose**: Handles all aspects of user authentication and user-specific data.
- **State Managed**:
    - `user`: The current Supabase authenticated user object.
    - `profile`: The user's profile data from the `users` table.
    - `wallets`: The user's financial wallets.
    - `categories`: The available expense/income categories.
    - `session`: The current auth session.
- **Key Functions**: `signIn`, `signUp`, `signOut`, and functions to refresh user data (`refreshProfile`, `refreshWallets`, `refreshCategories`).

### `AppContext.tsx`
- **Purpose**: Manages UI state and application-wide settings.
- **State Managed**:
    - `viewMode`: The current view mode (`personal` or `household`).
    - `autoTagBudgets`: Array of budgets with auto-tagging enabled.
    - `defaultCurrency`: The user's preferred default currency.
    - `isOnline`: A boolean indicating the network status.
    - `pendingCount`: The number of items in the offline sync queue.
- **Key Functions**: Provides setters for its state, a function to `refreshPendingCount`, and manages auto-tag budgets.

## 5. Backend & Database

The backend is powered by Supabase.

### Supabase Client
- The Supabase client is initialized in `src/lib/supabase.ts`.
- It uses environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- A helper `isSupabaseConfigured()` is available to check if credentials are set.

### Database Schema (`supabase/schema.sql`)

The full database schema is defined in `supabase/schema.sql`. It includes tables, indexes, functions, and Row Level Security (RLS) policies to ensure data privacy.

Key Tables:
- `users`: Stores user profiles.
- `households`: Groups users for shared finances.
- `wallets`: Multi-currency accounts.
- `categories`: Expense/income categories.
- `transactions`: The core table for all financial entries with tags array.
- `budgets`: Tag-based budgets with flexible period types (weekly, monthly, yearly, custom).

Below is the complete SQL schema for reference:

```sql
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


-- ================================================
-- AUTH TRIGGERS
-- ================================================

-- Function to create a user profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_household_id UUID;
BEGIN
  -- Create a new household for the user
  INSERT INTO households (name) VALUES (new.raw_user_meta_data->>'name' || '''s Household')
  RETURNING id INTO v_household_id;

  -- Create the user profile
  INSERT INTO public.users (id, email, name, household_id, default_currency)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    v_household_id,
    new.raw_user_meta_data->>'default_currency'
  );

  -- Create default wallets for the new user
  INSERT INTO public.wallets (name, currency, owner_id, household_id, is_shared)
  VALUES
    ('Efectivo MXN', 'MXN', new.id, v_household_id, false),
    ('Cash USD', 'USD', new.id, v_household_id, false);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================
-- END OF SCHEMA
-- ================================================
```

## 6. Getting Started

To run the project locally:

1.  **Clone and Install**:
    ```bash
    git clone <your-repo-url>
    cd presupuesto
    npm install
    ```

2.  **Set Up Supabase**:
    - Create a new project on [supabase.com](https://supabase.com).
    - Go to the **SQL Editor** and execute the contents of `supabase/schema.sql`.

3.  **Configure Environment**:
    - Create a `.env.local` file.
    - Add your Supabase Project URL and Anon Key to `.env.local`.
      ```
      NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
      NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
      ```

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```
