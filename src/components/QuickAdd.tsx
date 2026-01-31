"use client";

import { useState } from "react";
import { Send, Calculator, X } from "lucide-react";
import {
  parseTransactionInput,
  buildTransactionFromParsed,
} from "@/lib/parser";
import { addTransaction } from "@/lib/offline";
import { formatCurrency, DEFAULT_EXCHANGE_RATE } from "@/lib/currency";
import type { Category, Wallet, Currency } from "@/lib/types";
import { useApp } from "@/contexts/AppContext";

interface QuickAddProps {
  categories: Category[];
  wallets: Wallet[];
  userId: string;
  onSuccess: () => void;
}

export function QuickAdd({
  categories,
  wallets,
  userId,
  onSuccess,
}: QuickAddProps) {
  const { defaultCurrency, refreshPendingCount } = useApp();
  const [input, setInput] = useState("");
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadAmount, setKeypadAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const expenseCategories = categories.filter((c) => c.type === "expense");

  const defaultWallet =
    wallets.find((w) => w.currency === defaultCurrency) || wallets[0];

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isSubmitting) return;

    setIsSubmitting(true);

    const parsed = parseTransactionInput(input, categories);
    const transaction = buildTransactionFromParsed(parsed, {
      wallet_id: defaultWallet?.id || "",
      currency: defaultWallet?.currency || defaultCurrency,
      exchange_rate: DEFAULT_EXCHANGE_RATE,
    });

    const finalCategoryId = selectedCategoryId || transaction.category_id;

    if (transaction.amount && transaction.amount > 0 && transaction.wallet_id) {
      await addTransaction(
        {
          amount: transaction.amount,
          original_currency: transaction.original_currency as Currency,
          exchange_rate_used:
            transaction.exchange_rate_used || DEFAULT_EXCHANGE_RATE,
          description: transaction.description,
          category_id: finalCategoryId,
          wallet_id: transaction.wallet_id,
          tags: transaction.tags || [],
          type: transaction.type || "expense",
          is_shared: transaction.is_shared || false,
          date: transaction.date || new Date().toISOString().split("T")[0],
        },
        userId
      );
      refreshPendingCount();
      onSuccess();
    }

    setInput("");
    setSelectedCategoryId("");
    setIsSubmitting(false);
  };

  const handleKeypadPress = (key: string) => {
    if (key === "C") {
      setKeypadAmount("");
    } else if (key === "⌫") {
      setKeypadAmount((prev) => prev.slice(0, -1));
    } else if (key === ".") {
      if (!keypadAmount.includes(".")) {
        setKeypadAmount((prev) => prev + ".");
      }
    } else {
      setKeypadAmount((prev) => prev + key);
    }
  };

  const handleKeypadSubmit = () => {
    if (keypadAmount) {
      setInput(keypadAmount);
      setShowKeypad(false);
      setKeypadAmount("");
    }
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-30">
      {/* Keypad overlay */}
      {showKeypad && (
        <div className="absolute bottom-full left-0 right-0 bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowKeypad(false)}
              className="text-[#050505] p-2 hover:bg-[#FF6B6B] hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-2xl font-bold text-[#050505] font-mono">
              {keypadAmount
                ? formatCurrency(parseFloat(keypadAmount), defaultCurrency)
                : formatCurrency(0, defaultCurrency)}
            </div>
            <button
              onClick={handleKeypadSubmit}
              disabled={!keypadAmount}
              className="text-white bg-[#4ECDC4] p-2 rounded-lg disabled:opacity-50 border-2 border-[#050505]"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map(
              (key) => (
                <button
                  key={key}
                  onClick={() => handleKeypadPress(key)}
                  className="h-14 text-xl font-bold bg-white border-2 border-[#050505] text-[#050505] rounded-xl 
                  active:translate-x-[2px] active:translate-y-[2px] transition-all font-mono"
                >
                  {key}
                </button>
              )
            )}
          </div>
          <button
            onClick={() => handleKeypadPress("C")}
            className="w-full mt-2 h-12 text-lg font-bold bg-[#FF6B6B] border-2 border-[#050505] text-white rounded-xl"
          >
            Clear
          </button>
        </div>
      )}

      {/* Chat-style input */}
      <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowKeypad(true)}
            className="p-3 bg-white border-2 border-[#050505] rounded-xl text-[#050505] hover:bg-[#FFE66D] transition-colors active:translate-x-[2px] active:translate-y-[2px]"
          >
            <Calculator className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="200 tacos food #lunch"
            className="flex-1 bg-white border-2 border-[#050505] rounded-xl px-5 py-3 text-[#050505] 
              placeholder:text-[#050505] placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#FFE66D] font-mono"
          />

          <button
            type="submit"
            disabled={!input.trim() || isSubmitting}
            className="p-3 bg-[#4ECDC4] border-2 border-[#050505] shadow-[2px_2px_0px_0px_#050505] rounded-xl text-white
              disabled:opacity-50 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

        <p className="text-center text-xs text-[#050505] opacity-60 mt-2 font-mono">
          Try: &ldquo;200 tacos food&rdquo; or &ldquo;50 uber transport
          #work&rdquo;
        </p>

        {/* Category selector */}
        <div className="mt-3 flex items-center gap-2">
          <label className="text-xs text-[#050505] font-mono font-bold uppercase">
            Category
          </label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="flex-1 bg-white border-2 border-[#050505] rounded-xl px-4 py-2 text-sm text-[#050505] focus:outline-none focus:ring-2 focus:ring-[#FFE66D] font-mono font-bold"
          >
            <option value="">Auto / None</option>
            {expenseCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
