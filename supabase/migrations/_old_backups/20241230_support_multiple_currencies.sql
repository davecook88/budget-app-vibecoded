-- ================================================
-- SUPPORT MULTIPLE CURRENCIES
-- Remove CHECK constraints to support any currency code
-- ================================================

-- Update users table
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_default_currency_check;

-- Update wallets table
ALTER TABLE wallets 
DROP CONSTRAINT IF EXISTS wallets_currency_check;

-- Update transactions table
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_original_currency_check;

-- Update budgets table
ALTER TABLE budgets 
DROP CONSTRAINT IF EXISTS budgets_currency_check;

-- Update trips table
ALTER TABLE trips 
DROP CONSTRAINT IF EXISTS trips_budget_currency_check;

-- Update exchange_rates table
ALTER TABLE exchange_rates 
DROP CONSTRAINT IF EXISTS exchange_rates_from_currency_check;

ALTER TABLE exchange_rates 
DROP CONSTRAINT IF EXISTS exchange_rates_to_currency_check;

-- Add comments to document currency fields
COMMENT ON COLUMN users.default_currency IS 'User''s default currency for reporting (3-letter ISO code)';
COMMENT ON COLUMN wallets.currency IS 'Wallet currency (3-letter ISO code)';
COMMENT ON COLUMN transactions.original_currency IS 'Original transaction currency (3-letter ISO code)';
COMMENT ON COLUMN transactions.default_currency IS 'Converted default currency (3-letter ISO code)';
COMMENT ON COLUMN budgets.currency IS 'Budget currency (3-letter ISO code)';
COMMENT ON COLUMN trips.budget_currency IS 'Trip budget currency (3-letter ISO code)';
COMMENT ON COLUMN exchange_rates.from_currency IS 'Source currency (3-letter ISO code)';
COMMENT ON COLUMN exchange_rates.to_currency IS 'Target currency (3-letter ISO code)';

-- ================================================
-- INSERT ADDITIONAL EXCHANGE RATES FOR COMMON PAIRS
-- ================================================

-- USD to major currencies
INSERT INTO exchange_rates (from_currency, to_currency, rate, fetched_at) VALUES
  ('USD', 'EUR', 0.92, NOW()),
  ('USD', 'GBP', 0.79, NOW()),
  ('USD', 'JPY', 149.50, NOW()),
  ('USD', 'CHF', 0.88, NOW()),
  ('USD', 'CAD', 1.36, NOW()),
  ('USD', 'AUD', 1.53, NOW()),
  ('USD', 'CNY', 7.10, NOW()),
  ('USD', 'INR', 83.12, NOW()),
  ('USD', 'SGD', 1.34, NOW()),
  ('USD', 'HKD', 7.82, NOW()),
  ('USD', 'KRW', 1320.00, NOW()),
  ('USD', 'THB', 35.80, NOW()),
  ('USD', 'MYR', 4.72, NOW()),
  ('USD', 'PHP', 55.80, NOW()),
  ('USD', 'IDR', 15600.00, NOW()),
  ('USD', 'VND', 24350.00, NOW()),
  ('USD', 'SAR', 3.75, NOW()),
  ('USD', 'AED', 3.67, NOW()),
  ('USD', 'ILS', 3.65, NOW()),
  ('USD', 'TRY', 32.50, NOW()),
  ('USD', 'QAR', 3.64, NOW()),
  ('USD', 'KWD', 0.31, NOW()),
  ('USD', 'ZAR', 18.50, NOW()),
  ('USD', 'EGP', 30.90, NOW()),
  ('USD', 'NGN', 900.00, NOW()),
  ('USD', 'KES', 153.00, NOW()),
  ('USD', 'NZD', 1.63, NOW()),
  ('USD', 'RUB', 92.50, NOW()),
  ('USD', 'UAH', 37.50, NOW()),
  ('USD', 'BRL', 4.98, NOW()),
  ('USD', 'ARS', 850.00, NOW()),
  ('USD', 'COP', 3950.00, NOW()),
  ('USD', 'CLP', 880.00, NOW()),
  ('USD', 'PEN', 3.72, NOW()),
  ('USD', 'VES', 36.50, NOW()),
  ('USD', 'SEK', 10.50, NOW()),
  ('USD', 'NOK', 10.80, NOW()),
  ('USD', 'DKK', 6.85, NOW()),
  ('USD', 'PLN', 3.95, NOW()),
  ('USD', 'CZK', 22.80, NOW()),
  ('USD', 'HUF', 355.00, NOW()),
  ('USD', 'RON', 4.60, NOW()),
  ('USD', 'BGN', 1.80, NOW()),
  ('USD', 'HRK', 6.95, NOW())
ON CONFLICT (from_currency, to_currency) DO NOTHING;

-- EUR to major currencies
INSERT INTO exchange_rates (from_currency, to_currency, rate, fetched_at) VALUES
  ('EUR', 'USD', 1.09, NOW()),
  ('EUR', 'GBP', 0.86, NOW()),
  ('EUR', 'JPY', 162.50, NOW()),
  ('EUR', 'CHF', 0.96, NOW()),
  ('EUR', 'MXN', 18.90, NOW())
ON CONFLICT (from_currency, to_currency) DO NOTHING;

-- GBP to major currencies
INSERT INTO exchange_rates (from_currency, to_currency, rate, fetched_at) VALUES
  ('GBP', 'USD', 1.27, NOW()),
  ('GBP', 'EUR', 1.16, NOW()),
  ('GBP', 'JPY', 189.00, NOW()),
  ('GBP', 'MXN', 22.00, NOW())
ON CONFLICT (from_currency, to_currency) DO NOTHING;

-- MXN to major currencies
INSERT INTO exchange_rates (from_currency, to_currency, rate, fetched_at) VALUES
  ('MXN', 'USD', 0.057, NOW()),
  ('MXN', 'EUR', 0.053, NOW()),
  ('MXN', 'GBP', 0.045, NOW()),
  ('MXN', 'JPY', 8.50, NOW())
ON CONFLICT (from_currency, to_currency) DO NOTHING;
