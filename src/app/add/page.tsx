"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { useState, useEffect, useRef, useMemo } from "react";
import { addTransaction } from "@/lib/offline";
import { getExchangeRate } from "@/lib/exchangeRates";
import * as LucideIcons from "lucide-react";
import {
  ChevronDown,
  Check,
  ChevronUp,
  Hash,
  MessageSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/types";
import { CurrencySelector } from "@/components/CurrencySelector";
import { getLastUsedCurrency, setLastUsedCurrency } from "@/lib/currencies";

// Helper to get Lucide icon component from icon name
function getCategoryIcon(iconName: string, className: string = "w-4 h-4") {
  const formattedName =
    iconName.charAt(0).toUpperCase() +
    iconName.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  const Icon =
    (
      LucideIcons as unknown as Record<
        string,
        React.ComponentType<{ className?: string }>
      >
    )[formattedName] || LucideIcons.CircleDot;
  return <Icon className={className} />;
}

export default function AddTransactionPage() {
  const router = useRouter();
  const { user, wallets, categories } = useAuth();
  const { autoTagBudgets, defaultCurrency, refreshPendingCount } = useApp();

  const [loading, setLoading] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState("");
  const descriptionRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currency, setCurrency] = useState(() =>
    getLastUsedCurrency(defaultCurrency)
  );

  // Get wallet for selected currency
  const selectedWallet =
    wallets.find((w) => w.currency === currency) || wallets[0];

  // Filter categories by type (default: expense)
  const expenseCategories = categories.filter((c) => c.type === "expense");

  // Category usage tracking
  const [categoryUsage, setCategoryUsage] = useState<Record<string, number>>(
    {}
  );

  // Tag usage tracking
  const [tagUsage, setTagUsage] = useState<Record<string, number>>({});

  // Get common tags from localStorage
  const [commonTags, setCommonTags] = useState<string[]>([]);

  // Load category usage and common tags on mount
  useEffect(() => {
    try {
      const savedUsage = localStorage.getItem("categoryUsage");
      if (savedUsage) {
        setCategoryUsage(JSON.parse(savedUsage));
      }
      const savedTagUsage = localStorage.getItem("tagUsage");
      if (savedTagUsage) {
        setTagUsage(JSON.parse(savedTagUsage));
      }
      const savedTags = localStorage.getItem("commonTags");
      if (savedTags) {
        const tags = JSON.parse(savedTags);
        setCommonTags(Array.isArray(tags) ? tags : []);
      }
    } catch {
      // Ignore parsing errors
    }
  }, []);

  // Sort categories by usage
  const sortedCategories = useMemo(() => {
    return [...expenseCategories].sort((a, b) => {
      const usageA = categoryUsage[a.id] || 0;
      const usageB = categoryUsage[b.id] || 0;
      return usageB - usageA;
    });
  }, [expenseCategories, categoryUsage]);

  // Sort tags by usage
  const sortedTags = useMemo(() => {
    return [...commonTags].sort((a, b) => {
      const usageA = tagUsage[a] || 0;
      const usageB = tagUsage[b] || 0;
      return usageB - usageA;
    });
  }, [commonTags, tagUsage]);

  // Show first 5 or all
  const visibleCategories = showAllCategories
    ? sortedCategories
    : sortedCategories.slice(0, 5);
  const hasMoreCategories = sortedCategories.length > 5;

  // Save currency when it changes
  useEffect(() => {
    setLastUsedCurrency(currency);
  }, [currency]);

  // Add keypad number
  const appendToAmount = (digit: string) => {
    if (digit === "." && amount.includes(".")) return;
    // Limit decimal places to 2
    const parts = amount.split(".");
    if (parts[1] && parts[1].length >= 2 && digit !== ".") return;
    if (amount === "" && digit === ".") {
      setAmount("0.");
    } else {
      setAmount(amount + digit);
    }
  };

  // Backspace
  const backspace = () => {
    setAmount(amount.slice(0, -1));
  };

  // Toggle tag
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Track tag usage
  const trackTagUsage = (tags: string[]) => {
    const newUsage = { ...tagUsage };
    tags.forEach((tag) => {
      newUsage[tag] = (newUsage[tag] || 0) + 1;
    });
    setTagUsage(newUsage);
    localStorage.setItem("tagUsage", JSON.stringify(newUsage));
  };

  // Add new tag
  const addNewTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags((prev) => [...prev, tag]);
      // Save to common tags
      const allTags = Array.from(new Set([...commonTags, tag]));
      localStorage.setItem("commonTags", JSON.stringify(allTags));
      setCommonTags(allTags);
    }
    setNewTag("");
    setShowTagInput(false);
  };

  // Track category usage
  const trackCategoryUsage = (categoryId: string) => {
    const newUsage = {
      ...categoryUsage,
      [categoryId]: (categoryUsage[categoryId] || 0) + 1,
    };
    setCategoryUsage(newUsage);
    localStorage.setItem("categoryUsage", JSON.stringify(newUsage));
  };

  // Quick submit - just amount, category optional
  const handleSubmit = async () => {
    if (!user || !amount || !selectedWallet || loading) {
      console.log("Submit blocked:", {
        user: !!user,
        amount,
        selectedWallet: !!selectedWallet,
        loading,
      });
      return;
    }

    setLoading(true);

    try {
      // Track category usage for sorting
      if (selectedCategoryId) {
        trackCategoryUsage(selectedCategoryId);
      }

      // Track tag usage for sorting
      if (selectedTags.length > 0) {
        trackTagUsage(selectedTags);
      }

      // Get exchange rate if currency differs from default
      let exchangeRate = 1.0;
      if (currency !== defaultCurrency) {
        try {
          exchangeRate = await getExchangeRate(currency, defaultCurrency);
        } catch (error) {
          console.error("Error getting exchange rate:", error);
          // Use default rate if fetch fails
          exchangeRate = currency === "USD" ? 17.5 : 0.05714;
        }
      }

      const transaction = {
        amount: parseFloat(amount),
        original_currency: currency,
        exchange_rate_used: exchangeRate,
        description: description || undefined,
        category_id: selectedCategoryId || undefined,
        wallet_id: selectedWallet.id,
        type: "expense" as const,
        is_shared: false,
        date: new Date().toISOString().split("T")[0],
        tags: selectedTags,
      };

      const result = await addTransaction(transaction, user.id);

      if (result.error) {
        throw result.error;
      }

      if (result.pending) {
        refreshPendingCount();
      }

      router.push("/");
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert("Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  // Show loading/error if no wallet available
  if (!selectedWallet) {
    return (
      <div className="h-dvh bg-[#FFFDF5] flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">💰</div>
          <h2 className="text-xl font-bold text-[#050505] mb-2" style={{ fontFamily: 'var(--font-lexend-mega)' }}>
            Setting up your wallets...
          </h2>
          <p className="text-[#050505] opacity-60 text-sm mb-4 font-mono">
            Please wait while we create your default wallets.
          </p>
          <button
            onClick={() => router.back()}
            className="text-[#FF6B6B] hover:bg-[#FF6B6B] hover:text-white px-4 py-2 rounded-lg font-bold transition-colors border-2 border-[#050505] cursor-pointer"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const selectedCategory = expenseCategories.find(
    (c) => c.id === selectedCategoryId
  );

  return (
    <div className="h-dvh bg-[#FFFDF5] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-3 pb-1 safe-area-top">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => router.back()}
            className="text-[#050505] hover:bg-[#FF6B6B] hover:text-white text-sm font-bold border-2 border-[#050505] rounded-xl px-4 py-2 transition-colors cursor-pointer active:translate-x-[2px] active:translate-y-[2px]"
          >
            Cancel
          </button>
          {autoTagBudgets.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              {autoTagBudgets.map((budget) => (
                <span
                  key={budget.id}
                  className="text-xs text-[#050505] bg-[#FFE66D] border-2 border-[#050505] px-3 py-1 rounded-lg font-bold"
                >
                  🏷️ {budget.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Amount Display */}
      <div className="px-4 py-4 w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="text-6xl font-bold text-[#050505] tabular-nums font-mono">
            {amount || "0"}
          </div>
          <CurrencySelector
            selectedCurrency={currency}
            onSelect={setCurrency}
            label=""
            showRecent={true}
            showPopular={false}
            compact={true}
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="shrink-0 px-4 py-2">
        <div className="flex flex-wrap gap-2 justify-center">
          {visibleCategories.map((cat) => (
            <CategoryPill
              key={cat.id}
              category={cat}
              isSelected={selectedCategoryId === cat.id}
              onSelect={() =>
                setSelectedCategoryId(
                  selectedCategoryId === cat.id ? "" : cat.id
                )
              }
            />
          ))}
          {hasMoreCategories && (
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs bg-white text-[#050505] border-2 border-[#050505] hover:bg-[#FFE66D] transition-colors font-bold cursor-pointer"
            >
              {showAllCategories ? (
                <>
                  Less <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  {sortedCategories.length - 5} more{" "}
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tags Section - Prominent */}
      <div className="shrink-0 px-4 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#050505] opacity-60 font-bold uppercase font-mono">Tags:</span>
          {sortedTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold transition-all border-2 border-[#050505] ${
                selectedTags.includes(tag)
                  ? "bg-[#4ECDC4] text-white shadow-[2px_2px_0px_0px_#050505]"
                  : "bg-white text-[#050505] hover:bg-[#FFE66D]"
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              {tag}
            </button>
          ))}
          {/* Add Tag Button */}
          <button
            onClick={() => {
              setShowTagInput(!showTagInput);
              if (!showTagInput)
                setTimeout(() => tagInputRef.current?.focus(), 100);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors border-2 cursor-pointer ${
              showTagInput
                ? "bg-[#4ECDC4] text-white border-[#050505]"
                : "bg-white text-[#050505] border-dashed border-[#050505] hover:bg-[#FFE66D]"
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            {sortedTags.length === 0 ? "Add tag" : "+"}
          </button>
        </div>
      </div>

      {/* Tag Input (expandable) */}
      {showTagInput && (
        <div className="shrink-0 px-4 pb-2">
          <div className="flex gap-2">
            <input
              ref={tagInputRef}
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNewTag();
                }
              }}
              placeholder="Tag name..."
              className="flex-1 bg-white border-2 border-[#050505] rounded-xl px-4 py-2 text-[#050505] placeholder-[#050505] placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#FFE66D] text-sm font-mono"
              autoComplete="off"
            />
            <button
              onClick={addNewTag}
              className="bg-[#4ECDC4] border-2 border-[#050505] shadow-[2px_2px_0px_0px_#050505] text-white px-4 py-2 rounded-xl text-sm font-bold active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Note toggle */}
      <div className="shrink-0 px-4 py-1">
        <button
          onClick={() => {
            setShowNotes(!showNotes);
            if (!showNotes)
              setTimeout(() => descriptionRef.current?.focus(), 100);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-colors border-2 font-bold cursor-pointer ${
            description || showNotes
              ? "bg-[#FFE66D] text-[#050505] border-[#050505]"
              : "bg-white text-[#050505] opacity-60 border-[#050505] hover:opacity-100"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {description
            ? description.slice(0, 20) + (description.length > 20 ? "..." : "")
            : "Add note"}
        </button>
      </div>

      {/* Note Input (expandable) */}
      {showNotes && (
        <div className="shrink-0 px-4 py-2">
          <input
            ref={descriptionRef}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
            className="w-full bg-white border-2 border-[#050505] rounded-xl px-4 py-2.5 text-[#050505] placeholder-[#050505] placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#FFE66D] text-sm font-mono"
            autoComplete="off"
            onBlur={() => !description && setShowNotes(false)}
          />
        </div>
      )}

      {/* Keypad */}
      <div className="flex-1 flex flex-col px-3 pb-3 pt-2 min-h-0">
        <div className="grid grid-cols-4 gap-1.5 flex-1">
          {/* Row 1 */}
          <KeypadButton onClick={() => appendToAmount("1")}>1</KeypadButton>
          <KeypadButton onClick={() => appendToAmount("2")}>2</KeypadButton>
          <KeypadButton onClick={() => appendToAmount("3")}>3</KeypadButton>
          <KeypadButton onClick={backspace} variant="secondary">
            ⌫
          </KeypadButton>

          {/* Row 2 */}
          <KeypadButton onClick={() => appendToAmount("4")}>4</KeypadButton>
          <KeypadButton onClick={() => appendToAmount("5")}>5</KeypadButton>
          <KeypadButton onClick={() => appendToAmount("6")}>6</KeypadButton>
          <KeypadButton
            onClick={() => setCurrency(currency === "MXN" ? "USD" : "MXN")}
            variant={currency === "MXN" ? "mxn" : "usd"}
          >
            {currency}
          </KeypadButton>

          {/* Row 3 */}
          <KeypadButton onClick={() => appendToAmount("7")}>7</KeypadButton>
          <KeypadButton onClick={() => appendToAmount("8")}>8</KeypadButton>
          <KeypadButton onClick={() => appendToAmount("9")}>9</KeypadButton>
          <KeypadButton
            onClick={() => router.back()}
            variant="secondary"
            className="text-sm"
          >
            Cancel
          </KeypadButton>

          {/* Row 4 */}
          <KeypadButton
            onClick={() => appendToAmount("00")}
            className="text-xl"
          >
            00
          </KeypadButton>
          <KeypadButton onClick={() => appendToAmount("0")}>0</KeypadButton>
          <KeypadButton onClick={() => appendToAmount(".")}>.</KeypadButton>
          <button
            onClick={handleSubmit}
            disabled={!amount || loading}
            className="bg-[#4ECDC4] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] text-white font-bold rounded-xl active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
          >
            {loading ? "..." : <Check className="w-7 h-7" />}
          </button>
        </div>

        {/* Selected category indicator */}
        {selectedCategory && (
          <div
            className="flex items-center justify-center gap-2 text-xs pt-2"
            style={{ color: selectedCategory.color }}
          >
            {getCategoryIcon(selectedCategory.icon, "w-4 h-4")}
            <span>{selectedCategory.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Category pill component
function CategoryPill({
  category,
  isSelected,
  onSelect,
}: {
  category: Category;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 border-[#050505] cursor-pointer ${
        isSelected
          ? "text-white shadow-[2px_2px_0px_0px_#050505]"
          : "bg-white text-[#050505] hover:translate-x-[1px] hover:translate-y-[1px]"
      }`}
      style={{
        backgroundColor: isSelected ? category.color : undefined,
      }}
    >
      {getCategoryIcon(category.icon, "w-3.5 h-3.5")}
      <span>{category.name}</span>
    </button>
  );
}

// Keypad button component
function KeypadButton({
  children,
  onClick,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "secondary" | "mxn" | "usd";
  className?: string;
}) {
  const baseClass =
    "rounded-xl font-bold transition-all flex items-center justify-center border-2 border-[#050505]";
  const variantClasses = {
    default: "bg-white text-[#050505] text-2xl font-mono active:translate-x-[2px] active:translate-y-[2px]",
    secondary: "bg-[#FFFDF5] text-[#050505] text-xl active:translate-x-[2px] active:translate-y-[2px]",
    mxn: "bg-[#4ECDC4] text-white text-sm shadow-[2px_2px_0px_0px_#050505] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
    usd: "bg-[#FFE66D] text-[#050505] text-sm shadow-[2px_2px_0px_0px_#050505] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClass} ${variantClasses[variant]} ${className} cursor-pointer`}
    >
      {children}
    </button>
  );
}
