// Comprehensive list of supported currencies with metadata

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  locale: string;
  decimalDigits: number;
}

export const CURRENCIES: CurrencyInfo[] = [
  // Major Currencies
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    flag: "🇺🇸",
    locale: "en-US",
    decimalDigits: 2,
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    flag: "🇪🇺",
    locale: "de-DE",
    decimalDigits: 2,
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    flag: "🇬🇧",
    locale: "en-GB",
    decimalDigits: 2,
  },
  {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    flag: "🇯🇵",
    locale: "ja-JP",
    decimalDigits: 0,
  },
  {
    code: "CHF",
    name: "Swiss Franc",
    symbol: "Fr",
    flag: "🇨🇭",
    locale: "de-CH",
    decimalDigits: 2,
  },
  {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "C$",
    flag: "🇨🇦",
    locale: "en-CA",
    decimalDigits: 2,
  },
  {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    flag: "🇦🇺",
    locale: "en-AU",
    decimalDigits: 2,
  },

  // Americas
  {
    code: "MXN",
    name: "Mexican Peso",
    symbol: "$",
    flag: "🇲🇽",
    locale: "es-MX",
    decimalDigits: 2,
  },
  {
    code: "BRL",
    name: "Brazilian Real",
    symbol: "R$",
    flag: "🇧🇷",
    locale: "pt-BR",
    decimalDigits: 2,
  },
  {
    code: "ARS",
    name: "Argentine Peso",
    symbol: "$",
    flag: "🇦🇷",
    locale: "es-AR",
    decimalDigits: 2,
  },
  {
    code: "COP",
    name: "Colombian Peso",
    symbol: "$",
    flag: "🇨🇴",
    locale: "es-CO",
    decimalDigits: 2,
  },
  {
    code: "CLP",
    name: "Chilean Peso",
    symbol: "$",
    flag: "🇨🇱",
    locale: "es-CL",
    decimalDigits: 0,
  },
  {
    code: "PEN",
    name: "Peruvian Sol",
    symbol: "S/",
    flag: "🇵🇪",
    locale: "es-PE",
    decimalDigits: 2,
  },
  {
    code: "VES",
    name: "Venezuelan Bolívar",
    symbol: "Bs",
    flag: "🇻🇪",
    locale: "es-VE",
    decimalDigits: 2,
  },

  // Europe
  {
    code: "SEK",
    name: "Swedish Krona",
    symbol: "kr",
    flag: "🇸🇪",
    locale: "sv-SE",
    decimalDigits: 2,
  },
  {
    code: "NOK",
    name: "Norwegian Krone",
    symbol: "kr",
    flag: "🇳🇴",
    locale: "nb-NO",
    decimalDigits: 2,
  },
  {
    code: "DKK",
    name: "Danish Krone",
    symbol: "kr",
    flag: "🇩🇰",
    locale: "da-DK",
    decimalDigits: 2,
  },
  {
    code: "PLN",
    name: "Polish Złoty",
    symbol: "zł",
    flag: "🇵🇱",
    locale: "pl-PL",
    decimalDigits: 2,
  },
  {
    code: "CZK",
    name: "Czech Koruna",
    symbol: "Kč",
    flag: "🇨🇿",
    locale: "cs-CZ",
    decimalDigits: 2,
  },
  {
    code: "HUF",
    name: "Hungarian Forint",
    symbol: "Ft",
    flag: "🇭🇺",
    locale: "hu-HU",
    decimalDigits: 2,
  },
  {
    code: "RON",
    name: "Romanian Leu",
    symbol: "lei",
    flag: "🇷🇴",
    locale: "ro-RO",
    decimalDigits: 2,
  },
  {
    code: "BGN",
    name: "Bulgarian Lev",
    symbol: "лв",
    flag: "🇧🇬",
    locale: "bg-BG",
    decimalDigits: 2,
  },
  {
    code: "HRK",
    name: "Croatian Kuna",
    symbol: "kn",
    flag: "🇭🇷",
    locale: "hr-HR",
    decimalDigits: 2,
  },

  // Asia
  {
    code: "CNY",
    name: "Chinese Yuan",
    symbol: "¥",
    flag: "🇨🇳",
    locale: "zh-CN",
    decimalDigits: 2,
  },
  {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    flag: "🇮🇳",
    locale: "en-IN",
    decimalDigits: 2,
  },
  {
    code: "KRW",
    name: "South Korean Won",
    symbol: "₩",
    flag: "🇰🇷",
    locale: "ko-KR",
    decimalDigits: 0,
  },
  {
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "S$",
    flag: "🇸🇬",
    locale: "en-SG",
    decimalDigits: 2,
  },
  {
    code: "HKD",
    name: "Hong Kong Dollar",
    symbol: "HK$",
    flag: "🇭🇰",
    locale: "zh-HK",
    decimalDigits: 2,
  },
  {
    code: "THB",
    name: "Thai Baht",
    symbol: "฿",
    flag: "🇹🇭",
    locale: "th-TH",
    decimalDigits: 2,
  },
  {
    code: "IDR",
    name: "Indonesian Rupiah",
    symbol: "Rp",
    flag: "🇮🇩",
    locale: "id-ID",
    decimalDigits: 0,
  },
  {
    code: "MYR",
    name: "Malaysian Ringgit",
    symbol: "RM",
    flag: "🇲🇾",
    locale: "ms-MY",
    decimalDigits: 2,
  },
  {
    code: "PHP",
    name: "Philippine Peso",
    symbol: "₱",
    flag: "🇵🇭",
    locale: "en-PH",
    decimalDigits: 2,
  },
  {
    code: "VND",
    name: "Vietnamese Dong",
    symbol: "₫",
    flag: "🇻🇳",
    locale: "vi-VN",
    decimalDigits: 0,
  },

  // Middle East
  {
    code: "SAR",
    name: "Saudi Riyal",
    symbol: "﷼",
    flag: "🇸🇦",
    locale: "ar-SA",
    decimalDigits: 2,
  },
  {
    code: "AED",
    name: "UAE Dirham",
    symbol: "د.إ",
    flag: "🇦🇪",
    locale: "ar-AE",
    decimalDigits: 2,
  },
  {
    code: "ILS",
    name: "Israeli Shekel",
    symbol: "₪",
    flag: "🇮🇱",
    locale: "he-IL",
    decimalDigits: 2,
  },
  {
    code: "TRY",
    name: "Turkish Lira",
    symbol: "₺",
    flag: "🇹🇷",
    locale: "tr-TR",
    decimalDigits: 2,
  },
  {
    code: "QAR",
    name: "Qatari Riyal",
    symbol: "﷼",
    flag: "🇶🇦",
    locale: "ar-QA",
    decimalDigits: 2,
  },
  {
    code: "KWD",
    name: "Kuwaiti Dinar",
    symbol: "د.ك",
    flag: "🇰🇼",
    locale: "ar-KW",
    decimalDigits: 3,
  },

  // Africa
  {
    code: "ZAR",
    name: "South African Rand",
    symbol: "R",
    flag: "🇿🇦",
    locale: "en-ZA",
    decimalDigits: 2,
  },
  {
    code: "EGP",
    name: "Egyptian Pound",
    symbol: "E£",
    flag: "🇪🇬",
    locale: "ar-EG",
    decimalDigits: 2,
  },
  {
    code: "NGN",
    name: "Nigerian Naira",
    symbol: "₦",
    flag: "🇳🇬",
    locale: "en-NG",
    decimalDigits: 2,
  },
  {
    code: "KES",
    name: "Kenyan Shilling",
    symbol: "KSh",
    flag: "🇰🇪",
    locale: "en-KE",
    decimalDigits: 2,
  },

  // Oceania
  {
    code: "NZD",
    name: "New Zealand Dollar",
    symbol: "NZ$",
    flag: "🇳🇿",
    locale: "en-NZ",
    decimalDigits: 2,
  },
  {
    code: "FJD",
    name: "Fiji Dollar",
    symbol: "FJ$",
    flag: "🇫🇯",
    locale: "en-FJ",
    decimalDigits: 2,
  },

  // Others
  {
    code: "RUB",
    name: "Russian Ruble",
    symbol: "₽",
    flag: "🇷🇺",
    locale: "ru-RU",
    decimalDigits: 2,
  },
  {
    code: "UAH",
    name: "Ukrainian Hryvnia",
    symbol: "₴",
    flag: "🇺🇦",
    locale: "uk-UA",
    decimalDigits: 2,
  },
];

// Popular currencies for quick access
export const POPULAR_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "MXN",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
];

// Get currency info by code
export function getCurrencyInfo(code: string): CurrencyInfo | undefined {
  return CURRENCIES.find((c) => c.code === code);
}

// Get currency symbol
export function getCurrencySymbol(code: string): string {
  const currency = getCurrencyInfo(code);
  return currency?.symbol || code;
}

// Get currency flag
export function getCurrencyFlag(code: string): string {
  const currency = getCurrencyInfo(code);
  return currency?.flag || "🌍";
}

// Get currency name
export function getCurrencyName(code: string): string {
  const currency = getCurrencyInfo(code);
  return currency?.name || code;
}

// Get currency locale for formatting
export function getCurrencyLocale(code: string): string {
  const currency = getCurrencyInfo(code);
  return currency?.locale || "en-US";
}

// Get decimal digits for currency
export function getCurrencyDecimalDigits(code: string): number {
  const currency = getCurrencyInfo(code);
  return currency?.decimalDigits ?? 2;
}

// Search currencies by name or code
export function searchCurrencies(query: string): CurrencyInfo[] {
  const lowerQuery = query.toLowerCase();
  return CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(lowerQuery) ||
      c.name.toLowerCase().includes(lowerQuery)
  );
}

// Get recently used currencies from localStorage
export function getRecentCurrencies(limit: number = 5): string[] {
  if (typeof window === "undefined") return [];
  try {
    const recent = localStorage.getItem("recentCurrencies");
    return recent ? JSON.parse(recent).slice(0, limit) : [];
  } catch {
    return [];
  }
}

// Add currency to recent usage
export function addRecentCurrency(code: string): void {
  if (typeof window === "undefined") return;

  try {
    let recent = getRecentCurrencies(10);
    // Remove if already exists
    recent = recent.filter((c) => c !== code);
    // Add to front
    recent.unshift(code);
    // Limit to 10
    recent = recent.slice(0, 10);
    localStorage.setItem("recentCurrencies", JSON.stringify(recent));
  } catch (error) {
    console.error("Error saving recent currency:", error);
  }
}

// Get last used currency
export function getLastUsedCurrency(defaultCurrency: string): string {
  if (typeof window === "undefined") return defaultCurrency;
  try {
    const last = localStorage.getItem("lastUsedCurrency");
    return last && getCurrencyInfo(last) ? last : defaultCurrency;
  } catch {
    return defaultCurrency;
  }
}

// Set last used currency
export function setLastUsedCurrency(code: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("lastUsedCurrency", code);
    addRecentCurrency(code);
  } catch (error) {
    console.error("Error saving last used currency:", error);
  }
}
