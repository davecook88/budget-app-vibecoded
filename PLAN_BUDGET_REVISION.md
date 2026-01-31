# Budget System Revision Plan

**Date:** December 30, 2025  
**Status:** Draft  

## 1. Executive Summary

This document outlines a major revision to the budget system in Presupuesto. The key changes are:

1. **Trips become a type of budget** - No separate trips concept; a "trip" is just a budget with specific characteristics
2. **Tag-based association** - Budgets are associated with tags, not categories. Any transaction with a matching tag is automatically associated with the budget
3. **Scope levels** - Budgets can be **personal** or **household**-level
4. **Flexible periods** - Budgets can be monthly, yearly, weekly, one-time, or custom date ranges

---

## 2. Current State Analysis

### Current Budget System
- Budgets are tied to a **category** (`category_id`)
- Budgets are scoped to a specific **month/year**
- Budgets have an `amount` and `currency`
- Optional `rollover_enabled` flag
- Can be personal (`user_id`) or household (`household_id`)

### Current Trip System
- Separate `trips` table with `name`, `start_date`, `end_date`, `budget`, `budget_currency`
- Transactions have a `trip_id` foreign key
- Only one trip can be "active" at a time (`is_active` flag)
- Used for isolating travel expenses

### Problems with Current Design
1. **Category-based budgets are inflexible** - Can't budget for things that span multiple categories (e.g., "Christmas gifts" could be Food + Shopping + Entertainment)
2. **Trips are a special case** - They're essentially budgets with date ranges and tags, duplicating logic
3. **No support for yearly/custom budgets** - Only monthly periods supported
4. **Active trip is global state** - Awkward UX for managing multiple concurrent trips

---

## 3. New Budget Model

### 3.1 Core Concept

A **Budget** is a spending limit tracked by a **tag**. Any transaction tagged with the budget's tag contributes to that budget's spending.

### 3.2 Database Schema

```sql
-- New budgets table (replaces both budgets and trips)
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identity
  name TEXT NOT NULL,                    -- Display name (e.g., "Groceries", "Japan Trip 2025")
  tag TEXT NOT NULL,                     -- Tag to match transactions (e.g., "groceries", "trip:japan-2025")
  icon TEXT DEFAULT 'wallet',            -- Lucide icon name
  color TEXT DEFAULT '#6366f1',          -- Hex color
  
  -- Budget limits
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN' CHECK (currency IN ('MXN', 'USD')),
  
  -- Period configuration
  period_type TEXT NOT NULL DEFAULT 'monthly' 
    CHECK (period_type IN ('weekly', 'monthly', 'yearly', 'one-time', 'custom')),
  start_date DATE,                       -- Required for one-time/custom
  end_date DATE,                         -- Required for one-time/custom
  
  -- Behavior
  rollover_enabled BOOLEAN DEFAULT FALSE,
  auto_tag_new_transactions BOOLEAN DEFAULT FALSE,  -- When "active", auto-apply tag to new transactions
  
  -- Ownership
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'household')),
  
  -- Metadata
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (
    (period_type NOT IN ('one-time', 'custom')) OR 
    (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date)
  ),
  CONSTRAINT valid_ownership CHECK (
    (scope = 'personal' AND user_id IS NOT NULL) OR
    (scope = 'household' AND household_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_budgets_tag ON budgets(tag);
CREATE INDEX idx_budgets_user ON budgets(user_id);
CREATE INDEX idx_budgets_household ON budgets(household_id);
CREATE INDEX idx_budgets_active ON budgets(is_archived) WHERE is_archived = FALSE;
```

### 3.3 TypeScript Types

```typescript
export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly' | 'one-time' | 'custom';
export type BudgetScope = 'personal' | 'household';

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

export interface BudgetWithSpent extends Budget {
  spent: number;
  remaining: number;
  rollover: number;
  period_start: string;  // Calculated based on period_type
  period_end: string;    // Calculated based on period_type
  percentage: number;
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
```

---

## 4. Tag System

### 4.1 Tag Format

Tags are simple lowercase strings with optional prefixes for organization:

| Tag Example | Use Case |
|-------------|----------|
| `groceries` | Regular monthly budget |
| `dining-out` | Regular monthly budget |
| `trip:japan-2025` | Trip budget (prefix convention) |
| `project:kitchen-reno` | Project-based budget |
| `gift:christmas-2025` | Seasonal budget |

### 4.2 Transaction Tags

Transactions already have a `tags TEXT[]` field. No schema change needed.

```typescript
// Example transaction
{
  amount: 150.00,
  description: "Sushi dinner",
  tags: ["dining-out", "trip:japan-2025"],  // Counts toward both budgets
  // ...
}
```

### 4.3 Auto-Tagging (Trip Mode Replacement)

When a budget has `auto_tag_new_transactions = true`:
- It acts like the current "active trip" 
- New transactions are automatically tagged with the budget's tag
- UI shows a banner indicating auto-tagging is enabled
- Multiple budgets can have auto-tagging enabled simultaneously

---

## 5. Period Calculations

### 5.1 Period Logic

```typescript
function getBudgetPeriod(budget: Budget, referenceDate: Date = new Date()): { start: Date, end: Date } {
  switch (budget.period_type) {
    case 'weekly':
      // Start of current week (Monday) to end of week (Sunday)
      return getWeekBounds(referenceDate);
      
    case 'monthly':
      // Start of current month to end of month
      return getMonthBounds(referenceDate);
      
    case 'yearly':
      // Start of current year to end of year
      return getYearBounds(referenceDate);
      
    case 'one-time':
    case 'custom':
      // Use explicit dates
      return { 
        start: new Date(budget.start_date!), 
        end: new Date(budget.end_date!) 
      };
  }
}
```

### 5.2 Spent Calculation

```typescript
async function calculateBudgetSpent(budget: Budget): Promise<number> {
  const { start, end } = getBudgetPeriod(budget);
  
  const { data } = await supabase
    .from('transactions')
    .select('amount, original_currency, exchange_rate_used')
    .contains('tags', [budget.tag])  // PostgreSQL array contains
    .eq('type', 'expense')
    .gte('date', start.toISOString().split('T')[0])
    .lte('date', end.toISOString().split('T')[0]);
    
  return convertAndSum(data, budget.currency);
}
```

---

## 6. Migration Strategy

### 6.1 Database Migration

```sql
-- Step 1: Create new budgets table (as defined above)

-- Step 2: Migrate existing budgets (category-based → tag-based)
INSERT INTO budgets_new (
  name, tag, icon, color, amount, currency, 
  period_type, rollover_enabled, user_id, household_id, scope
)
SELECT 
  c.name,
  LOWER(REPLACE(c.name, ' ', '-')),  -- Generate tag from category name
  c.icon,
  c.color,
  b.amount,
  b.currency,
  'monthly',
  b.rollover_enabled,
  b.user_id,
  b.household_id,
  CASE WHEN b.household_id IS NOT NULL THEN 'household' ELSE 'personal' END
FROM budgets b
JOIN categories c ON b.category_id = c.id;

-- Step 3: Migrate trips to budgets
INSERT INTO budgets_new (
  name, tag, icon, color, amount, currency,
  period_type, start_date, end_date, 
  auto_tag_new_transactions, user_id, household_id, scope
)
SELECT 
  name,
  CONCAT('trip:', LOWER(REPLACE(name, ' ', '-'))),
  'plane',
  '#f59e0b',  -- Amber color for trips
  COALESCE(budget, 0),
  COALESCE(budget_currency, 'MXN'),
  'custom',
  start_date,
  COALESCE(end_date, start_date + INTERVAL '7 days'),
  is_active,
  user_id,
  household_id,
  CASE WHEN household_id IS NOT NULL THEN 'household' ELSE 'personal' END
FROM trips;

-- Step 4: Update transactions to have tags from trip associations
UPDATE transactions t
SET tags = array_append(tags, CONCAT('trip:', LOWER(REPLACE(tr.name, ' ', '-'))))
FROM trips tr
WHERE t.trip_id = tr.id AND NOT (tags @> ARRAY[CONCAT('trip:', LOWER(REPLACE(tr.name, ' ', '-')))]);

-- Step 5: Update transactions to have tags from category-based budgets
-- (This adds the category name as a tag for existing transactions)
UPDATE transactions t
SET tags = array_append(tags, LOWER(REPLACE(c.name, ' ', '-')))
FROM categories c
WHERE t.category_id = c.id 
  AND t.type = 'expense'
  AND NOT (tags @> ARRAY[LOWER(REPLACE(c.name, ' ', '-'))]);

-- Step 6: Drop old tables and constraints
ALTER TABLE transactions DROP CONSTRAINT fk_trip;
ALTER TABLE transactions DROP COLUMN trip_id;
DROP TABLE trips;
DROP TABLE budgets;
ALTER TABLE budgets_new RENAME TO budgets;
```

### 6.2 Code Migration Phases

#### Phase 1: Backend & Types
- [ ] Create new migration file
- [ ] Update `types.ts` with new Budget types
- [ ] Remove Trip types
- [ ] Update Supabase queries

#### Phase 2: Context Updates  
- [ ] Update `AppContext.tsx`:
  - Remove `activeTrip` state
  - Add `autoTagBudgets: Budget[]` (budgets with auto-tagging enabled)
- [ ] Add budget-related functions to context

#### Phase 3: UI Components
- [ ] Create new `BudgetCard.tsx` (enhanced version)
- [ ] Update `QuickAdd.tsx` to use tag-based auto-tagging
- [ ] Remove `TripBanner.tsx` → Replace with `AutoTagBanner.tsx`
- [ ] Update transaction forms to show budget tag suggestions

#### Phase 4: Pages
- [ ] Rewrite `/budgets` page with new functionality
- [ ] Remove `/trips` page
- [ ] Update bottom nav (remove trips icon)
- [ ] Update dashboard to show active budgets

#### Phase 5: Cleanup
- [ ] Remove all trip-related code
- [ ] Update `CONTEXT.md`
- [ ] Update README

---

## 7. UI/UX Changes

### 7.1 Budgets Page

```
┌─────────────────────────────────────┐
│ ←  Budgets                     [+]  │
├─────────────────────────────────────┤
│ [Personal ▼] [All Periods ▼]        │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🍕 Dining Out        #dining-out│ │
│ │ $450 / $600 monthly             │ │
│ │ ████████████░░░░░░  75%         │ │
│ │ $150 remaining                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ✈️ Japan 2025    #trip:japan    │ │
│ │ $2,100 / $5,000  [🏷️ Auto-tag] │ │
│ │ ████████░░░░░░░░░░  42%         │ │
│ │ Jan 15 - Feb 1, 2025            │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 7.2 Create/Edit Budget Modal

```
┌─────────────────────────────────────┐
│ Create Budget                    ✕  │
├─────────────────────────────────────┤
│ Name                                │
│ ┌─────────────────────────────────┐ │
│ │ Japan Trip 2025                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Tag                                 │
│ ┌─────────────────────────────────┐ │
│ │ trip:japan-2025                 │ │
│ └─────────────────────────────────┘ │
│ ℹ️ Transactions with this tag count │
│    toward this budget               │
│                                     │
│ Amount                              │
│ ┌──────────────┐ ┌────────────────┐ │
│ │ 5000         │ │ USD ▼         │ │
│ └──────────────┘ └────────────────┘ │
│                                     │
│ Period                              │
│ ○ Weekly  ○ Monthly  ○ Yearly       │
│ ● Custom Date Range                 │
│                                     │
│ ┌───────────────┐ ┌───────────────┐ │
│ │ Jan 15, 2025  │ │ Feb 1, 2025   │ │
│ └───────────────┘ └───────────────┘ │
│                                     │
│ Scope                               │
│ ○ Personal  ● Household             │
│                                     │
│ ☑ Auto-tag new transactions         │
│ ☐ Enable rollover                   │
│                                     │
│ [Icon: ✈️] [Color: 🟠]              │
│                                     │
│        [ Cancel ]  [ Save ]         │
└─────────────────────────────────────┘
```

### 7.3 Auto-Tag Banner

When any budget has `auto_tag_new_transactions = true`, show a banner:

```
┌─────────────────────────────────────┐
│ 🏷️ Auto-tagging: Japan 2025         │
│ New expenses will be tagged         │
│ #trip:japan-2025               [✕]  │
└─────────────────────────────────────┘
```

### 7.4 Transaction Tag Input

Enhanced tag input with budget suggestions:

```
Tags: [trip:japan-2025 ✕] [dining-out ✕] [___________]
      ┌─────────────────────────────────┐
      │ Suggested (from budgets):       │
      │   #groceries                    │
      │   #entertainment                │
      │   #trip:japan-2025 ✓            │
      └─────────────────────────────────┘
```

---

## 8. Edge Cases & Considerations

### 8.1 Multiple Budgets with Same Tag
- **Decision:** Allow it. Same tag can belong to multiple budgets (e.g., monthly and yearly tracking)
- Show warning in UI when creating duplicate tags

### 8.2 Transaction Matching Multiple Budgets
- **Decision:** Transaction counts toward ALL matching budgets
- This is a feature: track "Dining" monthly AND as part of "Japan Trip"

### 8.3 Changing Budget Tags
- Old transactions keep old tags (won't retroactively match)
- New transactions use new tag
- Consider: Add "re-tag transactions" feature for bulk updates

### 8.4 Archived Budgets
- Don't show in main list
- Still calculate historical data
- Accessible via "Show Archived" toggle

### 8.5 Rollover Logic for Different Periods
- Weekly: Rollover resets each week
- Monthly: Rollover carries month-to-month
- Yearly: Rollover carries year-to-year
- One-time/Custom: No rollover (doesn't make sense)

---

## 9. API Changes

### Removed Endpoints/Queries
- All `/trips` related operations
- `trip_id` from transaction queries

### Modified Endpoints
- `GET /budgets` - Returns new budget format
- `POST /budgets` - Creates new budget with tag
- `PUT /budgets/:id` - Updates budget
- `DELETE /budgets/:id` - Deletes budget

### New Queries
```typescript
// Get all active budgets with spent amounts
const { data: budgets } = await supabase
  .from('budgets')
  .select('*')
  .eq('is_archived', false)
  .order('created_at', { ascending: false });

// Get budget spending
const { data: transactions } = await supabase
  .from('transactions')
  .select('amount, original_currency, exchange_rate_used')
  .contains('tags', [budgetTag])
  .eq('type', 'expense')
  .gte('date', periodStart)
  .lte('date', periodEnd);
```

---

## 10. Testing Plan

### Unit Tests
- [ ] Period calculation functions
- [ ] Tag matching logic
- [ ] Currency conversion in spending calculation
- [ ] Rollover calculations

### Integration Tests
- [ ] Budget CRUD operations
- [ ] Transaction → Budget association via tags
- [ ] Auto-tagging functionality
- [ ] Migration script (on test data)

### Manual Testing
- [ ] Create budgets of all period types
- [ ] Add transactions with matching tags
- [ ] Verify spending calculations
- [ ] Test household vs personal scope
- [ ] Test auto-tag feature
- [ ] Verify rollover behavior

---

## 11. Timeline Estimate

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Backend & Types | 2 hours | None |
| Phase 2: Context Updates | 1 hour | Phase 1 |
| Phase 3: UI Components | 3 hours | Phase 2 |
| Phase 4: Pages | 3 hours | Phase 3 |
| Phase 5: Cleanup | 1 hour | Phase 4 |
| Testing | 2 hours | Phase 4 |
| **Total** | **~12 hours** | |

---

## 12. Open Questions

1. **Tag naming convention** - Should we enforce a specific format (e.g., lowercase, hyphens)?
2. **Default budgets** - Should we auto-create any budgets for new users?
3. **Budget templates** - Should we offer pre-made budget templates (e.g., "50/30/20 rule")?
4. **Notifications** - Should we add budget alerts (e.g., "80% spent")?
5. **Historical view** - How do we show past periods for recurring budgets?

---

## 13. Appendix: Files to Modify

### Delete
- `src/app/trips/page.tsx`
- `src/components/TripBanner.tsx`

### Major Rewrites
- `src/app/budgets/page.tsx`
- `src/components/BudgetCard.tsx`
- `src/lib/types.ts` (Budget/Trip types)
- `src/contexts/AppContext.tsx`
- `supabase/schema.sql`

### Minor Updates
- `src/app/page.tsx` (dashboard)
- `src/app/add/page.tsx` (transaction form)
- `src/components/QuickAdd.tsx`
- `src/components/BottomNav.tsx`
- `CONTEXT.md`
