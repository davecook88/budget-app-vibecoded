-- ================================================
-- FUNCTION TO RECALCULATE DEFAULT CURRENCY VALUES
-- Call this when a user changes their default currency
-- ================================================

CREATE OR REPLACE FUNCTION recalculate_user_transactions(
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_user_default_currency TEXT;
  v_exchange_rate DECIMAL;
BEGIN
  -- Get user's default currency
  SELECT default_currency INTO v_user_default_currency
  FROM users
  WHERE id = p_user_id;

  -- Update all transactions for this user
  FOR transaction_record IN
    SELECT id, amount, original_currency, exchange_rate_used
    FROM transactions
    WHERE user_id = p_user_id
  LOOP
    -- If original currency is the same as default, use original amount
    IF transaction_record.original_currency = v_user_default_currency THEN
      UPDATE transactions
      SET 
        default_currency_value = transaction_record.amount,
        default_currency = v_user_default_currency
      WHERE id = transaction_record.id;
    ELSE
      -- Get latest exchange rate
      v_exchange_rate := get_latest_exchange_rate(
        transaction_record.original_currency,
        v_user_default_currency
      );

      -- If no recent exchange rate, use the stored exchange_rate_used
      IF v_exchange_rate IS NULL THEN
        v_exchange_rate := transaction_record.exchange_rate_used;
      END IF;

      -- Calculate default currency value
      IF transaction_record.original_currency = 'USD' AND v_user_default_currency = 'MXN' THEN
        UPDATE transactions
        SET 
          default_currency_value = ROUND((transaction_record.amount * v_exchange_rate)::NUMERIC, 2),
          default_currency = v_user_default_currency
        WHERE id = transaction_record.id;
      ELSE
        UPDATE transactions
        SET 
          default_currency_value = ROUND((transaction_record.amount / v_exchange_rate)::NUMERIC, 2),
          default_currency = v_user_default_currency
        WHERE id = transaction_record.id;
      END IF;
    END IF;

    v_updated_count := v_updated_count + 1;
  END LOOP;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- TRIGGER TO RECALCULATE TRANSACTIONS ON CURRENCY CHANGE
-- ================================================

CREATE OR REPLACE FUNCTION handle_currency_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate if default_currency actually changed
  IF OLD.default_currency IS DISTINCT FROM NEW.default_currency THEN
    PERFORM recalculate_user_transactions(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for users table
DROP TRIGGER IF EXISTS user_currency_change ON users;
CREATE TRIGGER user_currency_change
  AFTER UPDATE OF default_currency ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_currency_change();
