"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import {
  CURRENCIES,
  POPULAR_CURRENCIES,
  getCurrencyInfo,
  getRecentCurrencies,
  addRecentCurrency,
  searchCurrencies,
  type CurrencyInfo,
} from "@/lib/currencies";

interface CurrencySelectorProps {
  selectedCurrency: string;
  onSelect: (currency: string) => void;
  label?: string;
  showRecent?: boolean;
  showPopular?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export function CurrencySelector({
  selectedCurrency,
  onSelect,
  label = "Currency",
  showRecent = true,
  showPopular = true,
  disabled = false,
  compact = false,
}: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCurrencyInfo = getCurrencyInfo(selectedCurrency);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter currencies based on search
  const filteredCurrencies = useMemo(() => {
    if (searchQuery.trim() === "") {
      return CURRENCIES;
    } else {
      return searchCurrencies(searchQuery);
    }
  }, [searchQuery]);

  const handleSelect = (currency: string) => {
    onSelect(currency);
    addRecentCurrency(currency);
    setIsOpen(false);
    setSearchQuery("");
  };

  const recentCurrencies = getRecentCurrencies(5);
  const popularCurrencies = showPopular
    ? CURRENCIES.filter((c) => POPULAR_CURRENCIES.includes(c.code))
    : [];

  return (
    <div className="relative w-max" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 rounded-xl border transition
          ${
            compact
              ? "px-4 py-2 bg-slate-800/50 border-slate-600 hover:border-slate-500 hover:bg-slate-700/50"
              : "px-4 py-3 w-full bg-slate-800 border-slate-700 hover:border-slate-500"
          }
          ${disabled ? "text-slate-500 cursor-not-allowed" : "text-white"}
        `}
      >
        {selectedCurrencyInfo && (
          <span className={compact ? "text-xl" : "text-2xl"}>
            {selectedCurrencyInfo.flag}
          </span>
        )}
        {compact ? (
          <>
            <div className="font-semibold">
              {selectedCurrencyInfo?.code || selectedCurrency}
            </div>
            <div className="font-mono text-sm text-slate-400">
              {selectedCurrencyInfo?.symbol || selectedCurrency}
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 text-left">
              {label && <div className="text-sm text-slate-400">{label}</div>}
              <div className="font-semibold">
                {selectedCurrencyInfo?.name || selectedCurrency}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-lg">
                {selectedCurrencyInfo?.symbol || selectedCurrency}
              </div>
              <div className="text-xs text-slate-500">{selectedCurrency}</div>
            </div>
          </>
        )}
        {!disabled && (
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 w-max mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-96 overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search currencies..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-10 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Currency List */}
          <div className="overflow-y-auto flex-1">
            {searchQuery.trim() === "" ? (
              <>
                {/* Recent Currencies */}
                {showRecent && recentCurrencies.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900/50">
                      Recent
                    </div>
                    {recentCurrencies.map((code) => {
                      const currency = getCurrencyInfo(code);
                      if (!currency) return null;
                      return (
                        <CurrencyOption
                          key={code}
                          currency={currency}
                          isSelected={code === selectedCurrency}
                          onSelect={handleSelect}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Popular Currencies */}
                {showPopular && popularCurrencies.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900/50">
                      Popular
                    </div>
                    {popularCurrencies.map((currency) => (
                      <CurrencyOption
                        key={currency.code}
                        currency={currency}
                        isSelected={currency.code === selectedCurrency}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                )}

                {/* All Currencies */}
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900/50">
                    All Currencies
                  </div>
                  {CURRENCIES.map((currency) => (
                    <CurrencyOption
                      key={currency.code}
                      currency={currency}
                      isSelected={currency.code === selectedCurrency}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              </>
            ) : (
              /* Search Results */
              <div>
                {filteredCurrencies.length > 0 ? (
                  filteredCurrencies.map((currency) => (
                    <CurrencyOption
                      key={currency.code}
                      currency={currency}
                      isSelected={currency.code === selectedCurrency}
                      onSelect={handleSelect}
                    />
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-slate-500">
                    No currencies found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface CurrencyOptionProps {
  currency: CurrencyInfo;
  isSelected: boolean;
  onSelect: (code: string) => void;
}

function CurrencyOption({
  currency,
  isSelected,
  onSelect,
}: CurrencyOptionProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(currency.code)}
      className={`
        w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition
        ${isSelected ? "bg-indigo-600/20 border-l-4 border-indigo-500" : ""}
      `}
    >
      <span className="text-2xl">{currency.flag}</span>
      <div className="flex-1 text-left">
        <div className="font-medium text-white">{currency.name}</div>
        <div className="text-sm text-slate-400">{currency.code}</div>
      </div>
      <div className="text-right">
        <div className="font-mono font-bold text-white">{currency.symbol}</div>
      </div>
    </button>
  );
}
