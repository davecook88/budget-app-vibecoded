
drop schema public cascade;
create schema public;

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calculate_budget_rollover"("p_tag" "text", "p_year" integer, "p_month" integer, "p_user_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_budget_amount DECIMAL;
  v_spent DECIMAL;
  v_prev_rollover DECIMAL;
  v_prev_month INTEGER;
  v_prev_year INTEGER;
BEGIN
  -- Get budget amount for this tag and period
  SELECT amount INTO v_budget_amount
  FROM budgets
  WHERE tag = p_tag 
    AND period_type = 'monthly'
    AND (user_id = p_user_id OR household_id IN (SELECT household_id FROM users WHERE id = p_user_id))
    AND is_archived = FALSE;

  IF v_budget_amount IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate spent this month on this tag
  SELECT COALESCE(SUM(amount), 0) INTO v_spent
  FROM transactions
  WHERE (p_tag = ANY(tags) OR tags @> ARRAY[p_tag])
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
  v_prev_rollover := calculate_budget_rollover(p_tag, v_prev_year, v_prev_month, p_user_id);

  -- Return current rollover: budget - spent + previous rollover
  RETURN v_budget_amount - v_spent + v_prev_rollover;
END;
$$;


ALTER FUNCTION "public"."calculate_budget_rollover"("p_tag" "text", "p_year" integer, "p_month" integer, "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_budget_rollover"("p_category_id" "uuid", "p_year" integer, "p_month" integer, "p_user_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."calculate_budget_rollover"("p_category_id" "uuid", "p_year" integer, "p_month" integer, "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_user_profile"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get email from auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  
  -- Insert profile if it doesn't exist
  INSERT INTO public.users (id, email, name, default_currency)
  VALUES (
    v_user_id,
    v_email,
    split_part(v_email, '@', 1),
    'MXN'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default wallets if they don't exist
  INSERT INTO public.wallets (name, currency, initial_balance, owner_id, is_shared)
  SELECT 'Efectivo MXN', 'MXN', 0, v_user_id, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.wallets WHERE owner_id = v_user_id AND currency = 'MXN'
  );
  
  INSERT INTO public.wallets (name, currency, initial_balance, owner_id, is_shared)
  SELECT 'Cash USD', 'USD', 0, v_user_id, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.wallets WHERE owner_id = v_user_id AND currency = 'USD'
  );
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."ensure_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_latest_exchange_rate"("p_from_currency" "text", "p_to_currency" "text") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_latest_exchange_rate"("p_from_currency" "text", "p_to_currency" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_safe_to_spend"("p_user_id" "uuid", "p_currency" "text" DEFAULT 'MXN'::"text") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_total_budget DECIMAL;
  v_total_spent DECIMAL;
  v_days_left INTEGER;
BEGIN
  -- Get total budget for current month
  SELECT COALESCE(SUM(amount), 0) INTO v_total_budget
  FROM budgets
  WHERE (user_id = p_user_id OR household_id IN (SELECT household_id FROM users WHERE id = p_user_id))
    AND period_type = 'monthly'
    AND currency = p_currency
    AND is_archived = FALSE;

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
$$;


ALTER FUNCTION "public"."get_safe_to_spend"("p_user_id" "uuid", "p_currency" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_currency_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only recalculate if default_currency actually changed
  IF OLD.default_currency IS DISTINCT FROM NEW.default_currency THEN
    PERFORM recalculate_user_transactions(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_currency_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Insert user profile (use ON CONFLICT to handle duplicates)
  INSERT INTO public.users (id, email, name, default_currency)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'default_currency', 'MXN')
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default wallets (only if they don't exist)
  INSERT INTO public.wallets (name, currency, initial_balance, owner_id, is_shared)
  SELECT 'Efectivo MXN', 'MXN', 0, NEW.id, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.wallets WHERE owner_id = NEW.id AND currency = 'MXN'
  );
  
  INSERT INTO public.wallets (name, currency, initial_balance, owner_id, is_shared)
  SELECT 'Cash USD', 'USD', 0, NEW.id, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.wallets WHERE owner_id = NEW.id AND currency = 'USD'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_user_transactions"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_user_default_currency TEXT;
  v_exchange_rate DECIMAL;
  transaction_record RECORD;
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
$$;


ALTER FUNCTION "public"."recalculate_user_transactions"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_transaction_default_currency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_transaction_default_currency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_exchange_rate"("p_from_currency" "text", "p_to_currency" "text", "p_rate" numeric) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."upsert_exchange_rate"("p_from_currency" "text", "p_to_currency" "text", "p_rate" numeric) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."budgets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'MXN'::"text" NOT NULL,
    "rollover_enabled" boolean DEFAULT true NOT NULL,
    "user_id" "uuid",
    "household_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" DEFAULT 'Budget'::"text" NOT NULL,
    "tag" "text" NOT NULL,
    "icon" "text" DEFAULT 'wallet'::"text",
    "color" "text" DEFAULT '#6366f1'::"text",
    "period_type" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "auto_tag_new_transactions" boolean DEFAULT false,
    "scope" "text" DEFAULT 'personal'::"text" NOT NULL,
    "is_archived" boolean DEFAULT false,
    CONSTRAINT "budgets_currency_check" CHECK (("currency" = ANY (ARRAY['MXN'::"text", 'USD'::"text"]))),
    CONSTRAINT "valid_date_range" CHECK ((("period_type" <> ALL (ARRAY['one-time'::"text", 'custom'::"text"])) OR (("start_date" IS NOT NULL) AND ("end_date" IS NOT NULL) AND ("end_date" >= "start_date")))),
    CONSTRAINT "valid_ownership" CHECK (((("scope" = 'personal'::"text") AND ("user_id" IS NOT NULL) AND ("household_id" IS NULL)) OR (("scope" = 'household'::"text") AND ("household_id" IS NOT NULL) AND ("user_id" IS NULL))))
);


ALTER TABLE "public"."budgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text" DEFAULT 'circle'::"text" NOT NULL,
    "color" "text" DEFAULT '#6366f1'::"text" NOT NULL,
    "type" "text" DEFAULT 'expense'::"text" NOT NULL,
    "user_id" "uuid",
    "household_id" "uuid",
    "is_system" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "categories_type_check" CHECK (("type" = ANY (ARRAY['expense'::"text", 'income'::"text"])))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exchange_rates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "from_currency" "text" NOT NULL,
    "to_currency" "text" NOT NULL,
    "rate" numeric(12,6) NOT NULL,
    "fetched_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."exchange_rates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."exchange_rates"."from_currency" IS 'Source currency (3-letter ISO code)';



COMMENT ON COLUMN "public"."exchange_rates"."to_currency" IS 'Target currency (3-letter ISO code)';



CREATE TABLE IF NOT EXISTS "public"."households" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" DEFAULT 'My Household'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."households" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "original_currency" "text" NOT NULL,
    "exchange_rate_used" numeric(10,6) DEFAULT 1.0 NOT NULL,
    "description" "text",
    "category_id" "uuid",
    "wallet_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trip_id" "uuid",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "type" "text" DEFAULT 'expense'::"text" NOT NULL,
    "is_shared" boolean DEFAULT false NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "local_id" "text",
    "synced_at" timestamp with time zone,
    "default_currency_value" numeric(12,2),
    "default_currency" "text",
    CONSTRAINT "transactions_original_currency_check" CHECK (("original_currency" = ANY (ARRAY['MXN'::"text", 'USD'::"text"]))),
    CONSTRAINT "transactions_type_check" CHECK (("type" = ANY (ARRAY['expense'::"text", 'income'::"text", 'transfer'::"text"])))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trips" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "budget" numeric(12,2),
    "budget_currency" "text" DEFAULT 'MXN'::"text",
    "user_id" "uuid" NOT NULL,
    "household_id" "uuid",
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "trips_budget_currency_check" CHECK (("budget_currency" = ANY (ARRAY['MXN'::"text", 'USD'::"text"])))
);


ALTER TABLE "public"."trips" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "default_currency" "text" DEFAULT 'MXN'::"text" NOT NULL,
    "household_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "users_default_currency_check" CHECK (("default_currency" = ANY (ARRAY['MXN'::"text", 'USD'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "currency" "text" NOT NULL,
    "initial_balance" numeric(12,2) DEFAULT 0 NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "is_shared" boolean DEFAULT false NOT NULL,
    "household_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "wallets_currency_check" CHECK (("currency" = ANY (ARRAY['MXN'::"text", 'USD'::"text"])))
);


ALTER TABLE "public"."wallets" OWNER TO "postgres";


ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_from_currency_to_currency_key" UNIQUE ("from_currency", "to_currency");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."households"
    ADD CONSTRAINT "households_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_budgets_active" ON "public"."budgets" USING "btree" ("is_archived") WHERE ("is_archived" = false);



CREATE INDEX "idx_budgets_household" ON "public"."budgets" USING "btree" ("household_id");



CREATE INDEX "idx_budgets_period" ON "public"."budgets" USING "btree" ("period_type", "start_date", "end_date");



CREATE INDEX "idx_budgets_scope" ON "public"."budgets" USING "btree" ("scope");



CREATE INDEX "idx_budgets_tag" ON "public"."budgets" USING "btree" ("tag");



CREATE INDEX "idx_budgets_user" ON "public"."budgets" USING "btree" ("user_id");



CREATE INDEX "idx_exchange_rates_currencies" ON "public"."exchange_rates" USING "btree" ("from_currency", "to_currency");



CREATE INDEX "idx_exchange_rates_fetched" ON "public"."exchange_rates" USING "btree" ("fetched_at" DESC);



CREATE INDEX "idx_exchange_rates_pair" ON "public"."exchange_rates" USING "btree" ("from_currency", "to_currency");



CREATE INDEX "idx_transactions_category" ON "public"."transactions" USING "btree" ("category_id");



CREATE INDEX "idx_transactions_local_id" ON "public"."transactions" USING "btree" ("local_id");



CREATE INDEX "idx_transactions_trip" ON "public"."transactions" USING "btree" ("trip_id");



CREATE INDEX "idx_transactions_user_date" ON "public"."transactions" USING "btree" ("user_id", "date" DESC);



CREATE INDEX "idx_transactions_wallet" ON "public"."transactions" USING "btree" ("wallet_id");



CREATE INDEX "idx_trips_active" ON "public"."trips" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_trips_user" ON "public"."trips" USING "btree" ("user_id");



CREATE INDEX "idx_wallets_owner" ON "public"."wallets" USING "btree" ("owner_id");



CREATE OR REPLACE TRIGGER "budgets_updated_at" BEFORE UPDATE ON "public"."budgets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "households_updated_at" BEFORE UPDATE ON "public"."households" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "transaction_update_default_currency" BEFORE INSERT OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_transaction_default_currency"();



CREATE OR REPLACE TRIGGER "transactions_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trips_updated_at" BEFORE UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "user_currency_change" AFTER UPDATE OF "default_currency" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_currency_change"();



CREATE OR REPLACE TRIGGER "users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "wallets_updated_at" BEFORE UPDATE ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "fk_household" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "fk_trip" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."budgets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "budgets_delete" ON "public"."budgets" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "budgets_delete_household" ON "public"."budgets" FOR DELETE USING ((("scope" = 'household'::"text") AND ("household_id" IN ( SELECT "users"."household_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."household_id" IS NOT NULL))))));



CREATE POLICY "budgets_delete_personal" ON "public"."budgets" FOR DELETE USING ((("scope" = 'personal'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "budgets_insert" ON "public"."budgets" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "budgets_insert_household" ON "public"."budgets" FOR INSERT WITH CHECK ((("scope" = 'household'::"text") AND ("household_id" IN ( SELECT "users"."household_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."household_id" IS NOT NULL))))));



CREATE POLICY "budgets_insert_personal" ON "public"."budgets" FOR INSERT WITH CHECK ((("scope" = 'personal'::"text") AND ("user_id" = "auth"."uid"()) AND ("household_id" IS NULL)));



CREATE POLICY "budgets_select" ON "public"."budgets" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("household_id" IN ( SELECT "users"."household_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))));



CREATE POLICY "budgets_select_household" ON "public"."budgets" FOR SELECT USING ((("scope" = 'household'::"text") AND ("household_id" IN ( SELECT "users"."household_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."household_id" IS NOT NULL))))));



CREATE POLICY "budgets_select_personal" ON "public"."budgets" FOR SELECT USING ((("scope" = 'personal'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "budgets_update" ON "public"."budgets" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "budgets_update_household" ON "public"."budgets" FOR UPDATE USING ((("scope" = 'household'::"text") AND ("household_id" IN ( SELECT "users"."household_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."household_id" IS NOT NULL)))))) WITH CHECK ((("scope" = 'household'::"text") AND ("household_id" IN ( SELECT "users"."household_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."household_id" IS NOT NULL))))));



CREATE POLICY "budgets_update_personal" ON "public"."budgets" FOR UPDATE USING ((("scope" = 'personal'::"text") AND ("user_id" = "auth"."uid"()))) WITH CHECK ((("scope" = 'personal'::"text") AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_delete" ON "public"."categories" FOR DELETE USING ((("user_id" = "auth"."uid"()) AND ("is_system" = false)));



CREATE POLICY "categories_insert" ON "public"."categories" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "categories_select" ON "public"."categories" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("is_system" = true) OR ("household_id" IN ( SELECT "users"."household_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))));



CREATE POLICY "categories_update" ON "public"."categories" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."exchange_rates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exchange_rates_delete" ON "public"."exchange_rates" FOR DELETE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "exchange_rates_insert" ON "public"."exchange_rates" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "exchange_rates_select" ON "public"."exchange_rates" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "exchange_rates_update" ON "public"."exchange_rates" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."households" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "households_select" ON "public"."households" FOR SELECT USING (("id" IN ( SELECT "users"."household_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transactions_delete" ON "public"."transactions" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "transactions_insert" ON "public"."transactions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "transactions_select" ON "public"."transactions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (("is_shared" = true) AND ("wallet_id" IN ( SELECT "wallets"."id"
   FROM "public"."wallets"
  WHERE ("wallets"."household_id" IN ( SELECT "users"."household_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))))))));



CREATE POLICY "transactions_update" ON "public"."transactions" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."trips" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trips_delete" ON "public"."trips" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "trips_insert" ON "public"."trips" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "trips_select" ON "public"."trips" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("household_id" IN ( SELECT "users"."household_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))));



CREATE POLICY "trips_update" ON "public"."trips" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_insert" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users_select" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "users_update" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."wallets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wallets_delete" ON "public"."wallets" FOR DELETE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "wallets_insert" ON "public"."wallets" FOR INSERT WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "wallets_select" ON "public"."wallets" FOR SELECT USING ((("owner_id" = "auth"."uid"()) OR (("is_shared" = true) AND ("household_id" IN ( SELECT "users"."household_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))))));



CREATE POLICY "wallets_update" ON "public"."wallets" FOR UPDATE USING (("owner_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."calculate_budget_rollover"("p_tag" "text", "p_year" integer, "p_month" integer, "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_budget_rollover"("p_tag" "text", "p_year" integer, "p_month" integer, "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_budget_rollover"("p_tag" "text", "p_year" integer, "p_month" integer, "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_budget_rollover"("p_category_id" "uuid", "p_year" integer, "p_month" integer, "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_budget_rollover"("p_category_id" "uuid", "p_year" integer, "p_month" integer, "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_budget_rollover"("p_category_id" "uuid", "p_year" integer, "p_month" integer, "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_exchange_rate"("p_from_currency" "text", "p_to_currency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_exchange_rate"("p_from_currency" "text", "p_to_currency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_exchange_rate"("p_from_currency" "text", "p_to_currency" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_safe_to_spend"("p_user_id" "uuid", "p_currency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_safe_to_spend"("p_user_id" "uuid", "p_currency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_safe_to_spend"("p_user_id" "uuid", "p_currency" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_currency_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_currency_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_currency_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_user_transactions"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_user_transactions"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_user_transactions"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_transaction_default_currency"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_transaction_default_currency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_transaction_default_currency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_exchange_rate"("p_from_currency" "text", "p_to_currency" "text", "p_rate" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_exchange_rate"("p_from_currency" "text", "p_to_currency" "text", "p_rate" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_exchange_rate"("p_from_currency" "text", "p_to_currency" "text", "p_rate" numeric) TO "service_role";


















GRANT ALL ON TABLE "public"."budgets" TO "anon";
GRANT ALL ON TABLE "public"."budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."budgets" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."exchange_rates" TO "anon";
GRANT ALL ON TABLE "public"."exchange_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_rates" TO "service_role";



GRANT ALL ON TABLE "public"."households" TO "anon";
GRANT ALL ON TABLE "public"."households" TO "authenticated";
GRANT ALL ON TABLE "public"."households" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."trips" TO "anon";
GRANT ALL ON TABLE "public"."trips" TO "authenticated";
GRANT ALL ON TABLE "public"."trips" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."wallets" TO "anon";
GRANT ALL ON TABLE "public"."wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."wallets" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































