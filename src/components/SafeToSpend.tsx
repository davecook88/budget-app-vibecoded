"use client";

import { formatCurrency } from "@/lib/currency";
import type { Currency } from "@/lib/types";
import { TrendingDown, Calendar } from "lucide-react";

interface SafeToSpendProps {
  dailyAmount: number;
  totalRemaining: number;
  daysLeft: number;
  currency: Currency;
  spent: number;
  budget: number;
}

export function SafeToSpend({
  dailyAmount,
  totalRemaining,
  daysLeft,
  currency,
  spent,
  budget,
}: SafeToSpendProps) {
  const percentSpent = budget > 0 ? (spent / budget) * 100 : 0;
  const isOverBudget = spent > budget;

  return (
    <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[#050505] text-sm font-bold uppercase tracking-wide">
          Safe to Spend Today
        </span>
        <div className="flex items-center gap-1.5 text-[#050505] text-sm font-mono">
          <Calendar className="w-4 h-4" />
          <span>{daysLeft} days left</span>
        </div>
      </div>

      <div className="mb-4 text-center">
        <div
          className={`text-5xl font-mono font-bold mb-2 ${
            isOverBudget ? "text-[#FF6B6B]" : "text-[#050505]"
          }`}
        >
          {formatCurrency(Math.max(0, dailyAmount), currency)}
        </div>
        <div className="text-[#050505] text-sm font-mono">
          {formatCurrency(Math.max(0, totalRemaining), currency)} remaining this
          month
        </div>
      </div>

      {/* Hard Progress bar */}
      <div className="space-y-3">
        <div className="flex justify-between text-xs font-mono text-[#050505] font-bold">
          <span>SPENT: {formatCurrency(spent, currency)}</span>
          <span>BUDGET: {formatCurrency(budget, currency)}</span>
        </div>
        <div className="h-5 border-2 border-[#050505] rounded-lg overflow-hidden bg-white">
          <div
            className={`h-full transition-all ${
              isOverBudget ? "bg-[#FF6B6B]" : "bg-[#FFE66D]"
            }`}
            style={{ width: `${Math.min(100, percentSpent)}%` }}
          />
        </div>
        {isOverBudget && (
          <div className="flex items-center justify-center gap-2 bg-[#050505] text-white px-3 py-2 rounded-lg">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-bold font-mono uppercase">
              Over budget by {formatCurrency(spent - budget, currency)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
