// Natural language parser for quick transaction entry
// Examples: "200 tacos food", "50 uber transport", "$30 coffee"

import type { TransactionInput, Category, Currency } from "@/lib/types";

interface ParsedTransaction {
  amount: number | null;
  description: string;
  suggestedCategory: string | null;
  currency: Currency | null;
  tags: string[];
}

// Common category keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Food & Dining": [
    "food",
    "restaurant",
    "dinner",
    "lunch",
    "breakfast",
    "comida",
    "cena",
    "desayuno",
    "tacos",
    "pizza",
    "sushi",
    "coffee",
    "cafe",
    "café",
  ],
  Transportation: [
    "uber",
    "taxi",
    "didi",
    "bus",
    "metro",
    "gas",
    "gasolina",
    "parking",
    "estacionamiento",
    "toll",
    "peaje",
    "transport",
  ],
  Shopping: [
    "shopping",
    "clothes",
    "ropa",
    "amazon",
    "mercado libre",
    "store",
    "tienda",
    "mall",
  ],
  Entertainment: [
    "movie",
    "cine",
    "netflix",
    "spotify",
    "game",
    "juego",
    "concert",
    "concierto",
    "entertainment",
    "fun",
  ],
  "Bills & Utilities": [
    "electricity",
    "luz",
    "water",
    "agua",
    "internet",
    "phone",
    "teléfono",
    "celular",
    "rent",
    "renta",
    "bill",
  ],
  Health: [
    "doctor",
    "medicine",
    "medicina",
    "pharmacy",
    "farmacia",
    "hospital",
    "dentist",
    "gym",
    "health",
  ],
  Travel: [
    "flight",
    "vuelo",
    "hotel",
    "airbnb",
    "trip",
    "viaje",
    "travel",
    "vacation",
  ],
  Groceries: [
    "grocery",
    "groceries",
    "super",
    "supermarket",
    "oxxo",
    "soriana",
    "walmart",
    "costco",
    "supermercado",
  ],
  "Fun Money": [
    "fun",
    "hobby",
    "game",
    "beer",
    "cerveza",
    "bar",
    "drinks",
    "party",
  ],
};

export function parseTransactionInput(
  input: string,
  categories: Category[]
): ParsedTransaction {
  const result: ParsedTransaction = {
    amount: null,
    description: "",
    suggestedCategory: null,
    currency: null,
    tags: [],
  };

  // Normalize input
  let text = input.trim().toLowerCase();

  // Extract tags (words starting with #)
  const tagMatches = text.match(/#\w+/g);
  if (tagMatches) {
    result.tags = tagMatches.map((t) => t.substring(1));
    text = text.replace(/#\w+/g, "").trim();
  }

  // Extract currency hint
  if (
    text.includes("usd") ||
    text.includes("dollars") ||
    text.includes("dólares")
  ) {
    result.currency = "USD";
    text = text.replace(/usd|dollars|dólares/g, "").trim();
  } else if (text.includes("mxn") || text.includes("pesos")) {
    result.currency = "MXN";
    text = text.replace(/mxn|pesos/g, "").trim();
  }

  // Extract amount (supports formats: 200, $200, 200.50, 1,500)
  const amountMatch = text.match(/\$?[\d,]+\.?\d*/);
  if (amountMatch) {
    const amountStr = amountMatch[0].replace(/[$,]/g, "");
    result.amount = parseFloat(amountStr);
    text = text.replace(amountMatch[0], "").trim();
  }

  // Rest is description
  result.description = text.charAt(0).toUpperCase() + text.slice(1);

  // Try to match category
  const words = text.split(/\s+/);
  for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const word of words) {
      if (keywords.includes(word)) {
        // Find matching category from available categories
        const category = categories.find(
          (c) => c.name.toLowerCase() === categoryName.toLowerCase()
        );
        if (category) {
          result.suggestedCategory = category.id;
          break;
        }
      }
    }
    if (result.suggestedCategory) break;
  }

  return result;
}

export function buildTransactionFromParsed(
  parsed: ParsedTransaction,
  defaults: {
    wallet_id: string;
    currency: Currency;
    exchange_rate: number;
    date?: string;
  }
): Partial<TransactionInput> {
  return {
    amount: parsed.amount || 0,
    original_currency: parsed.currency || defaults.currency,
    exchange_rate_used: defaults.exchange_rate,
    description: parsed.description,
    category_id: parsed.suggestedCategory || undefined,
    wallet_id: defaults.wallet_id,
    tags: parsed.tags,
    type: "expense",
    is_shared: false,
    date: defaults.date || new Date().toISOString().split("T")[0],
  };
}
