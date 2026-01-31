// Exchange Rate Service
// Handles fetching, caching, and validating exchange rates (max 24 hours old)

import { supabase } from "./supabase";
import type { Currency } from "./types";

export interface ExchangeRate {
  from_currency: Currency;
  to_currency: Currency;
  rate: number;
  fetched_at: string;
}

const EXCHANGE_RATE_API_URL = "https://api.exchangerate-api.com/v4/latest/";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch exchange rate from external API
 * Supports all currencies via exchangerate-api.com
 */
async function fetchExchangeRateFromAPI(
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number | null> {
  try {
    // Use exchangerate-api.com which supports all currencies
    const response = await fetch(`${EXCHANGE_RATE_API_URL}${fromCurrency}`);
    if (!response.ok) throw new Error("API request failed");

    const data = await response.json();
    const rate = data.rates?.[toCurrency];

    if (rate === undefined) {
      console.error(
        `Exchange rate not found for ${fromCurrency} to ${toCurrency}`
      );
      return null;
    }

    return rate;
  } catch (error) {
    console.error("Error fetching exchange rate from API:", error);
    return null;
  }
}

/**
 * Get cached exchange rate from database
 */
export async function getCachedExchangeRate(
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<ExchangeRate | null> {
  try {
    const { data, error } = await supabase
      .from("exchange_rates")
      .select("*")
      .eq("from_currency", fromCurrency)
      .eq("to_currency", toCurrency)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // Table might not exist or no data - return null to trigger fresh fetch
      return null;
    }

    if (!data) return null;

    // Check if rate is older than 24 hours
    const fetchedAt = new Date(data.fetched_at);
    const now = new Date();
    const ageMs = now.getTime() - fetchedAt.getTime();

    if (ageMs > CACHE_DURATION_MS) {
      console.log(
        `Exchange rate for ${fromCurrency} to ${toCurrency} is older than 24 hours`
      );
      return null;
    }

    return data as ExchangeRate;
  } catch {
    // Silently fail - will fetch fresh rate
    return null;
  }
}

/**
 * Get exchange rate (from cache or fetch fresh)
 * Ensures rate is no older than 24 hours
 */
export async function getExchangeRate(
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number> {
  // Same currency, rate is 1
  if (fromCurrency === toCurrency) {
    return 1.0;
  }

  // Try to get cached rate
  const cached = await getCachedExchangeRate(fromCurrency, toCurrency);
  if (cached) {
    return cached.rate;
  }

  // Fetch fresh rate from API
  const freshRate = await fetchExchangeRateFromAPI(fromCurrency, toCurrency);

  if (freshRate) {
    // Cache the fresh rate
    await cacheExchangeRate(fromCurrency, toCurrency, freshRate);
    return freshRate;
  }

  // Fallback to default rate if API fails
  console.warn(
    `Using fallback exchange rate for ${fromCurrency} to ${toCurrency}`
  );
  const defaultRate =
    fromCurrency === "USD" && toCurrency === "MXN" ? 17.5 : 0.05714;

  // Cache the fallback rate
  await cacheExchangeRate(fromCurrency, toCurrency, defaultRate);
  return defaultRate;
}

/**
 * Cache exchange rate in database
 */
export async function cacheExchangeRate(
  fromCurrency: Currency,
  toCurrency: Currency,
  rate: number
): Promise<void> {
  try {
    // Use upsert to insert or update the exchange rate
    const { error } = await supabase.from("exchange_rates").upsert(
      {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: rate,
        fetched_at: new Date().toISOString(),
      },
      {
        onConflict: "from_currency,to_currency",
      }
    );

    if (error) {
      // If table doesn't exist, just log and continue - rates will be fetched each time
      console.warn("Could not cache exchange rate:", error.message);
    }
  } catch (error) {
    console.warn("Could not cache exchange rate:", error);
  }
}

/**
 * Refresh exchange rates if they're older than 24 hours
 * Call this periodically or when the app starts
 */
export async function refreshExchangeRates(): Promise<void> {
  try {
    // Check USD to MXN rate
    const usdToMxn = await getCachedExchangeRate("USD", "MXN");
    if (!usdToMxn) {
      const rate = await fetchExchangeRateFromAPI("USD", "MXN");
      if (rate) {
        await cacheExchangeRate("USD", "MXN", rate);
      }
    }

    // Check MXN to USD rate
    const mxnToUsd = await getCachedExchangeRate("MXN", "USD");
    if (!mxnToUsd) {
      const rate = await fetchExchangeRateFromAPI("MXN", "USD");
      if (rate) {
        await cacheExchangeRate("MXN", "USD", rate);
      }
    }
  } catch (error) {
    console.error("Error refreshing exchange rates:", error);
  }
}

/**
 * Convert amount from one currency to another
 * Uses cached exchange rates (max 24 hours old)
 */
export async function convertAmount(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rate = await getExchangeRate(fromCurrency, toCurrency);

  // The rate from the API is: 1 fromCurrency = X toCurrency
  // So we multiply by the rate
  return amount * rate;
}

/**
 * Get exchange rate info for display
 */
export async function getExchangeRateInfo(
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<{ rate: number; lastUpdated: string | null } | null> {
  if (fromCurrency === toCurrency) {
    return { rate: 1.0, lastUpdated: null };
  }

  const cached = await getCachedExchangeRate(fromCurrency, toCurrency);
  if (cached) {
    return {
      rate: cached.rate,
      lastUpdated: cached.fetched_at,
    };
  }

  // Try to get fresh rate
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  const freshCached = await getCachedExchangeRate(fromCurrency, toCurrency);

  return {
    rate,
    lastUpdated: freshCached?.fetched_at || null,
  };
}
