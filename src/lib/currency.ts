// Currency utilities for multi-currency support

import type { Currency } from "./types";
import { getCurrencyInfo } from "./currencies";

export const DEFAULT_EXCHANGE_RATE = parseFloat(
  process.env.NEXT_PUBLIC_DEFAULT_EXCHANGE_RATE || "17.50"
);

export function formatCurrency(
  amount: number,
  currency: Currency,
  options?: { compact?: boolean }
): string {
  const currencyInfo = getCurrencyInfo(currency);
  const locale = currencyInfo?.locale || "en-US";
  const decimalDigits = currencyInfo?.decimalDigits ?? 2;

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: options?.compact ? 0 : decimalDigits,
    maximumFractionDigits: options?.compact ? 0 : decimalDigits,
  });

  return formatter.format(amount);
}

export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  exchangeRate: number = DEFAULT_EXCHANGE_RATE
): number {
  if (fromCurrency === toCurrency) return amount;

  // The rate is: 1 fromCurrency = X toCurrency
  return amount * exchangeRate;
}

export function getCurrencySymbol(currency: Currency): string {
  const currencyInfo = getCurrencyInfo(currency);
  return currencyInfo?.symbol || currency;
}

export function getCurrencyFlag(currency: Currency): string {
  const currencyInfo = getCurrencyInfo(currency);
  return currencyInfo?.flag || "🌍";
}

/**
 * Format a transaction amount with both original and default currency
 */
export function formatTransactionAmount(
  originalAmount: number,
  originalCurrency: Currency,
  defaultAmount: number | null,
  defaultCurrency: Currency | null,
  options?: { compact?: boolean }
): string {
  const formattedOriginal = formatCurrency(
    originalAmount,
    originalCurrency,
    options
  );

  // If same currency or no default value, just show original
  if (
    originalCurrency === defaultCurrency ||
    !defaultAmount ||
    !defaultCurrency
  ) {
    return formattedOriginal;
  }

  // Show both currencies
  const formattedDefault = formatCurrency(
    defaultAmount,
    defaultCurrency,
    options
  );
  return `${formattedOriginal} (${formattedDefault})`;
}

/**
 * Get a short currency code for display
 */
export function getCurrencyCode(currency: Currency): string {
  return currency;
}

/**
 * Check if exchange rate needs refresh (older than 24 hours)
 */
export function needsExchangeRateRefresh(lastUpdated: string | null): boolean {
  if (!lastUpdated) return true;

  const lastUpdatedDate = new Date(lastUpdated);
  const now = new Date();
  const ageMs = now.getTime() - lastUpdatedDate.getTime();
  const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  return ageMs > CACHE_DURATION_MS;
}

/**
 * Format exchange rate for display
 */
export function formatExchangeRate(
  fromCurrency: Currency,
  toCurrency: Currency,
  rate: number
): string {
  if (fromCurrency === toCurrency) {
    return "1:1";
  }

  return `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`;
}
