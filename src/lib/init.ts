// Initialization utilities
// Call these when the app starts to ensure data is up to date

import { refreshExchangeRates } from "./exchangeRates";

/**
 * Initialize the app with fresh data
 * Call this when the app starts or when the user logs in
 */
export async function initializeApp() {
  try {
    // Refresh exchange rates if they're older than 24 hours
    await refreshExchangeRates();
  } catch (error) {
    console.error("Error initializing app:", error);
  }
}

/**
 * Initialize app with a timeout to avoid blocking startup
 */
export function initializeAppAsync() {
  // Initialize in the background after a short delay
  setTimeout(() => {
    initializeApp();
  }, 1000);
}
