-- ================================================
-- EXCHANGE RATES TABLE
-- Stores exchange rates with timestamps for automatic refresh
-- ================================================
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_currency TEXT NOT NULL CHECK (from_currency IN ('MXN', 'USD')),
  to_currency TEXT NOT NULL CHECK (to_currency IN ('MXN', 'USD')),
  rate DECIMAL(10, 6) NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_currency, to_currency)
);

-- ================================================
-- UPDATE TRANSACTIONS TABLE
-- Add columns for storing converted values in default currency
-- ================================================
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS default_currency_value DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS default_currency TEXT CHECK (default_currency IN ('MXN', 'USD'));

-- ================================================
-- INDEXES
-- ================================================
CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_fetched ON exchange_rates(fetched_at DESC);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read exchange rates
CREATE POLICY exchange_rates_select ON exchange_rates FOR SELECT USING (auth.role() = 'authenticated');

-- Only allow service role to insert/update exchange rates
CREATE POLICY exchange_rates_insert ON exchange_rates FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY exchange_rates_update ON exchange_rates FOR UPDATE WITH CHECK (auth.role() = 'service_role');
CREATE POLICY exchange_rates_delete ON exchange_rates FOR DELETE WITH CHECK (auth.role() = 'service_role');

-- ================================================
-- FUNCTION TO GET LATEST EXCHANGE RATE
-- Returns the most recent exchange rate (max 24 hours old)
-- ================================================
CREATE OR REPLACE FUNCTION get_latest_exchange_rate(
  p_from_currency TEXT,
  p_to_currency TEXT
) RETURNS DECIMAL AS $$
DECLARE
  v_rate DECIMAL;
  v_fetched_at TIMESTAMPTZ;
BEGIN
  -- Get the most recent exchange rate
  SELECT rate, fetched_at INTO v_rate, v_fetched_at
  FROM exchange_rates
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
  ORDER BY fetched_at DESC
  LIMIT 1;

  -- Check if rate is older than 24 hours
  IF v_fetched_at IS NULL OR v_fetched_at < NOW() - INTERVAL '24 hours' THEN
    -- Return NULL to indicate rate needs to be refreshed
    RETURN NULL;
  END IF;

  RETURN v_rate;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- FUNCTION TO INSERT OR UPDATE EXCHANGE RATE
-- ================================================
CREATE OR REPLACE FUNCTION upsert_exchange_rate(
  p_from_currency TEXT,
  p_to_currency TEXT,
  p_rate DECIMAL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO exchange_rates (from_currency, to_currency, rate, fetched_at)
  VALUES (p_from_currency, p_to_currency, p_rate, NOW())
  ON CONFLICT (from_currency, to_currency)
  DO UPDATE SET
    rate = EXCLUDED.rate,
    fetched_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- TRIGGER TO UPDATE DEFAULT CURRENCY VALUES
-- Automatically updates default_currency_value when transaction is inserted/updated
-- ================================================
CREATE OR REPLACE FUNCTION update_transaction_default_currency()
RETURNS TRIGGER AS $$
DECLARE
  v_user_default_currency TEXT;
  v_exchange_rate DECIMAL;
  v_default_value DECIMAL;
BEGIN
  -- Get user's default currency
  SELECT default_currency INTO v_user_default_currency
  FROM users
  WHERE id = NEW.user_id;

  -- If original currency is the same as default, use original amount
  IF NEW.original_currency = v_user_default_currency THEN
    NEW.default_currency_value := NEW.amount;
    NEW.default_currency := v_user_default_currency;
  ELSE
    -- Get exchange rate
    v_exchange_rate := get_latest_exchange_rate(NEW.original_currency, v_user_default_currency);
    
    -- If no recent exchange rate, use the stored exchange_rate_used
    IF v_exchange_rate IS NULL THEN
      v_exchange_rate := NEW.exchange_rate_used;
    END IF;

    -- Calculate default currency value
    IF NEW.original_currency = 'USD' AND v_user_default_currency = 'MXN' THEN
      v_default_value := NEW.amount * v_exchange_rate;
    ELSE
      v_default_value := NEW.amount / v_exchange_rate;
    END IF;

    NEW.default_currency_value := ROUND(v_default_value::NUMERIC, 2);
    NEW.default_currency := v_user_default_currency;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transactions
DROP TRIGGER IF EXISTS transaction_update_default_currency ON transactions;
CREATE TRIGGER transaction_update_default_currency
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_default_currency();

-- ================================================
-- MIGRATE EXISTING TRANSACTIONS
-- Update existing transactions to have default currency values
-- ================================================
UPDATE transactions t
SET 
  default_currency_value = t.amount,
  default_currency = t.original_currency
WHERE t.default_currency_value IS NULL;

-- ================================================
-- INSERT DEFAULT EXCHANGE RATE
-- Insert a default exchange rate if none exists
-- ================================================
INSERT INTO exchange_rates (from_currency, to_currency, rate, fetched_at)
VALUES ('USD', 'MXN', 17.50, NOW())
ON CONFLICT (from_currency, to_currency) DO NOTHING;

INSERT INTO exchange_rates (from_currency, to_currency, rate, fetched_at)
VALUES ('MXN', 'USD', 0.05714, NOW())
ON CONFLICT (from_currency, to_currency) DO NOTHING;
