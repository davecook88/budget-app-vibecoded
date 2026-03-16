"use client";

import { BudgetWithSpent, Transaction, Category } from "@/lib/types";
import { TransactionList } from "./TransactionList";
import { formatCurrency } from "@/lib/currency";
import { X } from "lucide-react";

interface BudgetDrillDownModalProps {
  budget: BudgetWithSpent | null;
  transactions: Transaction[];
  categories: Category[];
  currency: string;
  onClose: () => void;
}

export function BudgetDrillDownModal({
  budget,
  transactions,
  categories,
  currency,
  onClose,
}: BudgetDrillDownModalProps) {
  if (!budget) return null;

  // Filter transactions by budget tag
  const budgetTransactions = transactions.filter(
    (t) => t.type === "expense" && t.tags?.includes(budget.tag)
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: budget.color + "20" }}
            >
              {budget.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{budget.name}</h2>
              <p className="text-xs text-slate-400">#{budget.tag}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Budget Summary */}
        <div className="p-4 bg-slate-800/30 border-b border-slate-800">
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Spent</p>
              <p className="text-sm font-bold text-white">
                {formatCurrency(budget.spent, currency)}
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Budget</p>
              <p className="text-sm font-bold text-white">
                {formatCurrency(budget.amount, currency)}
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Remaining</p>
              <p
                className={`text-sm font-bold ${
                  budget.remaining >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {formatCurrency(Math.abs(budget.remaining), currency)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(budget.percentage, 100)}%`,
                backgroundColor:
                  budget.percentage > 100
                    ? "#ef4444"
                    : budget.percentage > 80
                    ? "#f59e0b"
                    : "#10b981",
              }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 text-right">
            {budget.percentage.toFixed(0)}% used
          </p>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto p-4">
          <TransactionList
            transactions={budgetTransactions}
            categories={categories}
          />
        </div>
      </div>
    </div>
  );
}
