"use client";

import { formatCurrency } from "@/lib/currency";
import { formatBudgetPeriod } from "@/lib/budgetPeriod";
import type { BudgetWithSpent } from "@/lib/types";
import * as LucideIcons from "lucide-react";

interface BudgetCardProps {
  budget: BudgetWithSpent;
  onEdit?: (budget: BudgetWithSpent) => void;
  onDelete?: (budgetId: string) => void;
}

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const percentSpent =
    budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
  const isOverBudget = budget.spent > budget.amount;

  const getIcon = () => {
    if (!budget.icon) return <LucideIcons.Wallet className="w-5 h-5" />;
    const iconName =
      budget.icon.charAt(0).toUpperCase() +
      budget.icon.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const Icon =
      (
        LucideIcons as unknown as Record<
          string,
          React.ComponentType<{ className?: string }>
        >
      )[iconName] || LucideIcons.Wallet;
    return <Icon className="w-5 h-5" />;
  };

  const periodStr = formatBudgetPeriod(budget);
  const autoTagIndicator = budget.auto_tag_new_transactions && (
    <span className="text-xs bg-amber-900/40 text-amber-200 px-2 py-1 rounded">
      🏷️ Auto
    </span>
  );
  const scopeIndicator = (
    <span
      className={`text-xs px-2 py-1 rounded font-mono font-bold ${
        budget.scope === "household"
          ? "bg-[#4ECDC4] text-white"
          : "bg-[#FFE66D] text-[#050505]"
      }`}
    >
      {budget.scope === "household" ? "Household" : "Personal"}
    </span>
  );

  return (
    <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-12 h-12 rounded-lg border-2 border-[#050505] flex items-center justify-center shrink-0"
            style={{ backgroundColor: (budget.color || "#6b7280") + "40" }}
          >
            <span style={{ color: budget.color || "#6b7280" }}>
              {getIcon()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#050505] truncate">{budget.name}</p>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <p className="text-xs text-[#FF6B6B] font-mono font-bold">
                #{budget.tag}
              </p>
              {scopeIndicator}
            </div>
          </div>
        </div>
      </div>

      {/* Period and auto-tag indicator */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-xs text-[#050505] opacity-60 font-mono">
          {periodStr}
        </p>
        {autoTagIndicator}
      </div>

      {/* Progress bar */}
      <div className="h-5 bg-white border-2 border-[#050505] rounded-lg overflow-hidden mb-3">
        <div
          className={`h-full transition-all ${
            isOverBudget
              ? "bg-[#FF6B6B]"
              : percentSpent > 80
              ? "bg-[#FFE66D]"
              : "bg-[#4ECDC4]"
          }`}
          style={{ width: `${Math.min(100, percentSpent)}%` }}
        />
      </div>

      {/* Budget info */}
      <div className="flex justify-between items-end mb-3">
        <div>
          <p className="text-xs text-[#050505] opacity-60 mb-1 font-mono uppercase font-bold">
            Spent
          </p>
          <p className="text-sm font-bold text-[#050505] font-mono">
            {formatCurrency(budget.spent, budget.currency)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#050505] opacity-60 mb-1 font-mono uppercase font-bold">
            Remaining
          </p>
          <p
            className={`text-sm font-bold font-mono ${
              isOverBudget ? "text-[#FF6B6B]" : "text-[#4ECDC4]"
            }`}
          >
            {formatCurrency(Math.max(0, budget.remaining), budget.currency)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#050505] opacity-60 mb-1 font-mono uppercase font-bold">
            Budget
          </p>
          <p className="text-sm font-bold text-[#050505] font-mono">
            {formatCurrency(budget.amount, budget.currency)}
          </p>
        </div>
      </div>

      {/* Percentage indicator */}
      <p className="text-xs text-slate-400 text-center">
        {percentSpent.toFixed(0)}% spent
      </p>

      {/* Rollover info */}
      {budget.rollover > 0 && budget.rollover_enabled && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-xs text-green-400">
            ✨ {formatCurrency(budget.rollover, budget.currency)} rollover
          </p>
        </div>
      )}

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div className="mt-3 pt-3 border-t border-slate-700 flex gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(budget)}
              className="flex-1 px-3 py-2 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors cursor-pointer"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(budget.id)}
              className="flex-1 px-3 py-2 text-xs font-medium bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors cursor-pointer"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
