# 💰 Presupuesto

A **Progressive Web App (PWA)** for personal finance tracking, designed specifically for couples living in Mexico with multi-currency needs (MXN/USD). Built with Next.js 14, Supabase, and offline-first architecture.

## ✨ Features

### 🎯 Core Functionality
- **Multi-Currency Support**: Track expenses in both MXN and USD with historical exchange rate storage
- **Offline-First**: Full offline functionality with automatic sync when connection is restored
- **Household Mode**: Toggle between personal and shared expense views
- **Trip Mode**: Activate trip tracking to isolate travel expenses
- **Smart Budgeting**: Monthly budgets with rollover logic (unused budget carries forward)
- **Safe-to-Spend**: Daily budget calculator showing how much you can safely spend

### 📱 User Experience
- **Chat-Style Entry**: Quick transaction input like "200 tacos food"
- **Keypad Interface**: Large, mobile-friendly numeric keypad for easy input
- **PWA Installable**: Install on iOS/Android home screen for native app experience
- **Dark Mode**: Beautiful dark theme optimized for low-light usage
- **Mobile-First**: Designed for smartphones, works great on desktop too

### 💼 Financial Management
- **Multiple Wallets**: Create separate wallets for different accounts/currencies
- **Budget Tracking**: Set monthly limits per category with visual progress indicators
- **Transaction History**: Search, filter, and review all transactions
- **Exchange Rate Tracking**: Store exact exchange rates at transaction time
- **Trip Budgets**: Set spending limits for trips and track progress

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- A Supabase account ([sign up free](https://supabase.com))

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd presupuesto
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings** → **API** and copy your:
   - Project URL
   - Anon/Public Key
3. Run the database schema:
   - Go to **SQL Editor** in Supabase
   - Copy contents from `supabase/schema.sql`
   - Execute the SQL to create all tables, functions, and security policies

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Create Your Account

1. Click **Create Account**
2. Enter your email and password
3. Set up your first wallet
4. Start tracking expenses!

## 📁 Project Structure

```
presupuesto/
├── src/
│   ├── app/                    # Next.js 14 App Router pages
│   │   ├── page.tsx           # Dashboard
│   │   ├── add/               # Add transaction
│   │   ├── wallets/           # Wallet management
│   │   ├── budgets/           # Budget management
│   │   ├── trips/             # Trip mode
│   │   ├── transactions/      # Transaction history
│   │   ├── settings/          # User settings
│   │   ├── login/             # Authentication
│   │   └── register/          # Registration
│   ├── components/            # Reusable UI components
│   │   ├── BottomNav.tsx      # Navigation bar
│   │   ├── QuickAdd.tsx       # Quick transaction entry
│   │   ├── SafeToSpend.tsx    # Budget indicator
│   │   ├── BudgetCard.tsx     # Budget display
│   │   ├── TransactionList.tsx
│   │   └── ...
│   ├── contexts/              # React contexts
│   │   ├── AuthContext.tsx    # Authentication state
│   │   └── AppContext.tsx     # App-wide state
│   └── lib/                   # Utilities
│       ├── supabase.ts        # Supabase client
│       ├── offline.ts         # Offline queue logic
│       ├── parser.ts          # Chat input parser
│       ├── currency.ts        # Currency utilities
│       └── types.ts           # TypeScript types
├── supabase/
│   └── schema.sql             # Database schema
├── public/
│   ├── manifest.json          # PWA manifest
│   └── sw.js                  # Service worker
└── package.json
```

## 🎮 Usage Guide

### Adding Transactions

#### Chat Mode (Quick)
Type natural language:
- `200 tacos food` → 200 MXN for food
- `50 USD gas` → $50 USD for gas
- `1500 rent bills` → 1500 for bills

#### Keypad Mode (Detailed)
1. Tap **Add** button (center of bottom nav)
2. Switch to **Keypad** mode
3. Enter amount using numeric keypad
4. Select category, wallet, and date
5. Add optional description and tags

### Managing Wallets

1. Navigate to **Wallets** tab
2. Tap **+** to create a wallet
3. Choose:
   - Name (e.g., "Cash MXN", "Bank USD")
   - Currency (MXN or USD)
   - Initial balance
   - Personal or Shared

### Setting Budgets

1. Go to **Budgets** tab
2. Tap **+** to create a budget
3. Select category
4. Set monthly amount
5. Enable rollover if desired

### Trip Mode

1. Navigate to **Trips** tab
2. Create a new trip with:
   - Name (e.g., "Tokyo 2024")
   - Start/end dates
   - Optional budget
3. Tap **Play** icon to activate
4. All new transactions will be tagged to this trip
5. Dashboard shows only trip expenses

### Household View

Toggle the **Personal/Household** switch in the header:
- **Personal**: See only your transactions
- **Household**: See all shared transactions

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Icons**: Lucide React
- **PWA**: Custom service worker + manifest
- **Deployment**: Vercel

## 🌐 Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### PWA Installation

After deploying:

**iOS (Safari)**:
1. Open site in Safari
2. Tap Share button
3. Tap "Add to Home Screen"

**Android (Chrome)**:
1. Open site in Chrome
2. Tap menu (⋮)
3. Tap "Install app" or "Add to Home Screen"

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Household members can view shared transactions
- Exchange rates stored at transaction time (no API calls)
- Environment variables for sensitive data

## 📊 Database Schema

Key tables:
- `users` - User profiles and settings
- `households` - Household groupings
- `wallets` - Multi-currency wallets
- `categories` - Expense/income categories
- `transactions` - All financial transactions
- `budgets` - Monthly budget limits
- `trips` - Trip tracking

See `supabase/schema.sql` for complete schema with indexes and RLS policies.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - feel free to use for personal or commercial projects

## 🆘 Support

Issues? Questions? Create an issue on GitHub or contact the maintainers.

## 🎯 Roadmap

- [ ] Recurring transactions
- [ ] Export to CSV/Excel
- [ ] Receipt photo uploads
- [ ] Budget notifications
- [ ] Multi-household support
- [ ] Spending analytics & charts
- [ ] Custom categories
- [ ] Split transactions

---

Made with ❤️ for couples managing finances in Mexico
