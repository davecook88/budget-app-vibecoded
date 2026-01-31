# Currency System Documentation

## Overview

The currency system has been enhanced to provide robust multi-currency support with automatic exchange rate management and conversion. All transactions are stored with both their original currency value and a converted value in the user's default currency, enabling accurate reporting even when the default currency changes.

## Key Features

### 1. Exchange Rate Management
- **Automatic Refresh**: Exchange rates are automatically refreshed when they're older than 24 hours
- **Caching**: Rates are cached in the database to minimize API calls
- **Fallback**: If the API is unavailable, a default rate is used
- **API Integration**: Uses the free exchangerate-api.com service for real-time rates

### 2. Transaction Storage
Each transaction now stores:
- `amount`: Original amount in the transaction's currency
- `original_currency`: The currency of the original amount (MXN or USD)
- `exchange_rate_used`: The exchange rate used at the time of transaction
- `default_currency_value`: Amount converted to user's default currency
- `default_currency`: The user's default currency at the time of transaction

### 3. Default Currency Management
- User's default currency is stored in their profile
- Can be changed at any time via Settings
- When changed, all historical transactions are recalculated
- Reporting always uses the current default currency

## Database Schema

### New Tables

#### `exchange_rates`
Stores exchange rates with timestamps:
```sql
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY,
  from_currency TEXT NOT NULL CHECK (from_currency IN ('MXN', 'USD')),
  to_currency TEXT NOT NULL CHECK (to_currency IN ('MXN', 'USD')),
  rate DECIMAL(10, 6) NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_currency, to_currency)
);
```

### Updated Tables

#### `transactions`
Added columns for default currency conversion:
```sql
ALTER TABLE transactions 
ADD COLUMN default_currency_value DECIMAL(12, 2),
ADD COLUMN default_currency TEXT CHECK (default_currency IN ('MXN', 'USD'));
```

## API Functions

### Exchange Rate Service (`src/lib/exchangeRates.ts`)

#### `getExchangeRate(fromCurrency, toCurrency)`
Gets the current exchange rate, fetching from API if cached rate is older than 24 hours.

```typescript
const rate = await getExchangeRate('USD', 'MXN');
// Returns: 17.50 (or current rate)
```

#### `convertAmount(amount, fromCurrency, toCurrency)`
Converts an amount from one currency to another.

```typescript
const mxnAmount = await convertAmount(100, 'USD', 'MXN');
// Returns: 1750.00
```

#### `refreshExchangeRates()`
Refreshes exchange rates if they're older than 24 hours. Called automatically on app startup.

#### `getExchangeRateInfo(fromCurrency, toCurrency)`
Gets exchange rate info including last update time.

```typescript
const info = await getExchangeRateInfo('USD', 'MXN');
// Returns: { rate: 17.50, lastUpdated: '2024-12-30T10:00:00Z' }
```

### Currency Utilities (`src/lib/currency.ts`)

#### `formatTransactionAmount(originalAmount, originalCurrency, defaultAmount, defaultCurrency)`
Formats a transaction amount showing both original and default currency.

```typescript
const formatted = formatTransactionAmount(
  100, 'USD', 
  1750, 'MXN'
);
// Returns: "$100.00 ($1,750.00)"
```

#### `formatExchangeRate(fromCurrency, toCurrency, rate)`
Formats an exchange rate for display.

```typescript
const formatted = formatExchangeRate('USD', 'MXN', 17.50);
// Returns: "1 USD = 17.5000 MXN"
```

#### `needsExchangeRateRefresh(lastUpdated)`
Checks if an exchange rate needs to be refreshed (older than 24 hours).

## Database Functions

### `get_latest_exchange_rate(from_currency, to_currency)`
Returns the most recent exchange rate, or NULL if older than 24 hours.

### `upsert_exchange_rate(from_currency, to_currency, rate)`
Inserts or updates an exchange rate with the current timestamp.

### `recalculate_user_transactions(user_id)`
Recalculates all `default_currency_value` fields for a user's transactions based on their current default currency.

### `update_transaction_default_currency()`
Trigger function that automatically updates `default_currency_value` when a transaction is inserted or updated.

## Usage Examples

### Adding a Transaction

```typescript
import { getExchangeRate } from '@/lib/exchangeRates';

// Get exchange rate if currency differs from default
let exchangeRate = 1.0;
if (currency !== defaultCurrency) {
  exchangeRate = await getExchangeRate(currency, defaultCurrency);
}

const transaction = {
  amount: 100,
  original_currency: 'USD',
  exchange_rate_used: exchangeRate,
  // ... other fields
};

// The database trigger will automatically set:
// - default_currency_value = 1750.00
// - default_currency = 'MXN'
```

### Changing Default Currency

```typescript
// Update user's default currency
await supabase
  .from('users')
  .update({ default_currency: 'USD' })
  .eq('id', userId);

// The database trigger will automatically recalculate all
// transactions' default_currency_value fields
```

### Displaying Transactions

```typescript
import { formatTransactionAmount } from '@/lib/currency';

<TransactionList
  transactions={transactions}
  categories={categories}
  defaultCurrency={defaultCurrency}
/>
```

Each transaction will show:
- Original amount: "$100.00"
- Converted amount: "($1,750.00)" if currencies differ

## Migration

To apply the currency system changes to an existing database:

1. Run the migration files in order:
   ```bash
   # Apply exchange rates table and transaction updates
   psql -f supabase/migrations/20241230_add_exchange_rates.sql
   
   # Apply recalculation functions
   psql -f supabase/migrations/20241230_recalculate_default_currency.sql
   ```

2. Existing transactions will be automatically migrated:
   - `default_currency_value` will be set to the original amount
   - `default_currency` will be set to the original currency

3. Default exchange rates will be inserted if none exist

## Testing

### Test Exchange Rate Refresh

```typescript
import { refreshExchangeRates, getExchangeRateInfo } from '@/lib/exchangeRates';

// Refresh rates
await refreshExchangeRates();

// Check last update
const info = await getExchangeRateInfo('USD', 'MXN');
console.log('Last updated:', info.lastUpdated);
```

### Test Currency Conversion

```typescript
import { convertAmount } from '@/lib/exchangeRates';

const mxn = await convertAmount(100, 'USD', 'MXN');
console.log('100 USD =', mxn, 'MXN');
```

### Test Default Currency Change

```typescript
// Change default currency
await supabase
  .from('users')
  .update({ default_currency: 'USD' })
  .eq('id', userId);

// Verify transactions were recalculated
const { data } = await supabase
  .from('transactions')
  .select('default_currency_value, default_currency')
  .eq('user_id', userId);

console.log('All transactions now in USD:', data);
```

## Best Practices

1. **Always use `getExchangeRate()`** instead of hardcoding rates
2. **Let the database trigger handle conversion** - don't manually calculate `default_currency_value`
3. **Refresh rates on app startup** - this is done automatically via `initializeAppAsync()`
4. **Display both currencies** when they differ for clarity
5. **Use `formatTransactionAmount()`** for consistent formatting

## Troubleshooting

### Exchange rates not updating
- Check that the API endpoint is accessible
- Verify the `fetched_at` timestamp in the `exchange_rates` table
- Check browser console for API errors

### Transactions showing wrong converted values
- Verify the user's `default_currency` in the `users` table
- Check that the `exchange_rate_used` is correct
- Ensure the database trigger `transaction_update_default_currency` is active

### Default currency change not updating transactions
- Verify the trigger `user_currency_change` is active on the `users` table
- Check that the function `recalculate_user_transactions` exists
- Look for errors in the database logs

## Future Enhancements

Potential improvements for the currency system:

1. **Support for more currencies**: Extend beyond MXN/USD
2. **Historical exchange rates**: Store rates for each transaction date
3. **Multiple rate providers**: Fallback to alternative APIs
4. **Manual rate override**: Allow users to set custom rates
5. **Rate alerts**: Notify users when rates change significantly
6. **Currency conversion history**: Track when and why conversions happened
