"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ViewMode, Budget, Currency, Trip } from "@/lib/types";
import { useAuth } from "./AuthContext";

interface AppContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  autoTagBudgets: Budget[];
  setAutoTagBudgets: (budgets: Budget[]) => void;
  defaultCurrency: Currency;
  setDefaultCurrency: (currency: Currency) => void;
  isOnline: boolean;
  pendingCount: number;
  refreshPendingCount: () => void;
  activeTrip: Trip | null;
  setActiveTrip: (trip: Trip | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  // Initialize state with values from localStorage or defaults
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "personal";
    const savedMode = localStorage.getItem("viewMode") as ViewMode;
    return savedMode || "personal";
  });

  const [defaultCurrency, setDefaultCurrency] = useState<Currency>(() => {
    // First check profile if available
    if (profile?.default_currency) {
      return profile.default_currency;
    }
    // Then check localStorage
    if (typeof window === "undefined") return "MXN";
    try {
      const savedCurrency = localStorage.getItem("lastCurrency");
      if (savedCurrency) {
        return savedCurrency;
      }
    } catch {
      // Ignore errors
    }
    return "MXN";
  });

  const [autoTagBudgets, setAutoTagBudgets] = useState<Budget[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("autoTagBudgets");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore errors
    }
    return [];
  });

  const [pendingCount, setPendingCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const queue = JSON.parse(localStorage.getItem("syncQueue") || "[]");
      return queue.length;
    } catch {
      return 0;
    }
  });

  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // Save viewMode preference
  useEffect(() => {
    localStorage.setItem("viewMode", viewMode);
  }, [viewMode]);

  // Save currency preference to localStorage
  useEffect(() => {
    localStorage.setItem("lastCurrency", defaultCurrency);
  }, [defaultCurrency]);

  // Save auto-tag budgets to localStorage
  useEffect(() => {
    localStorage.setItem("autoTagBudgets", JSON.stringify(autoTagBudgets));
  }, [autoTagBudgets]);

  const refreshPendingCount = useCallback(() => {
    try {
      const queue = JSON.parse(localStorage.getItem("syncQueue") || "[]");
      setPendingCount(queue.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        viewMode,
        setViewMode,
        autoTagBudgets,
        setAutoTagBudgets,
        defaultCurrency,
        setDefaultCurrency,
        activeTrip,
        setActiveTrip,
        isOnline,
        pendingCount,
        refreshPendingCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
