# Copilot Instructions — Presupuesto

## Project snapshot
- Next.js 14 App Router app in src/app with client components and Tailwind styling.
- Data + auth via Supabase; client initialized in src/lib/supabase.ts and used directly in pages and utilities.
- Global state flows through two React contexts: src/contexts/AuthContext.tsx (user, wallets, categories) and src/contexts/AppContext.tsx (view mode, pending sync, default currency).

## Architecture & data flow
- Transactions are created via offline-first helper src/lib/offline.ts (`addTransaction`) and queued in localStorage for sync.
- Quick entry uses natural language parsing in src/lib/parser.ts; detailed entry lives in src/app/add/page.tsx (keypad + category pills + tags).
- Category data is fetched in AuthContext and passed to pages/components (e.g., src/components/TransactionList.tsx, src/components/QuickAdd.tsx).
- Budgets are tag-based (see CONTEXT.md); auto-tagging surfaces in AppContext (`autoTagBudgets`) and UI banners.
- PWA behavior handled by public/sw.js and manifest.json; service worker registered in src/app/layout.tsx.

## Database & migrations
- Supabase schema/migrations live in supabase/migrations (see 20260130000000_squashed_schema.sql).
- Default categories are seeded via migrations; don’t rely on client-side seeding.
- RLS policies are enforced; queries typically filter by user_id or household context.

## Conventions to follow
- Use Supabase directly in page components for reads/updates (see src/app/page.tsx and src/app/transactions/page.tsx).
- Use `addTransaction` from src/lib/offline.ts for creates to preserve offline sync behavior.
- Prefer category IDs from AuthContext; map to name/icon/color in UI (example: src/components/TransactionList.tsx).
- Currency selection is handled with src/components/CurrencySelector.tsx and exchange rates via src/lib/exchangeRates.ts.

## Developer workflows
- Local dev: npm run dev (Next.js).
- Database: supabase db push to apply migrations.
- Env vars required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (see README).

## Key references
- Overview: CONTEXT.md and README.md
- Types: src/lib/types.ts
- Offline sync: src/lib/offline.ts
- Parser: src/lib/parser.ts
- Add flow: src/app/add/page.tsx + src/components/QuickAdd.tsx


## Login
You can use the puppeteer mcp server to log in using the following credentials:
dave@mamalon.dev
!Qwerty7