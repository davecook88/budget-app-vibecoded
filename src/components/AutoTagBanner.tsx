"use client";

import { X } from "lucide-react";
import type { Budget } from "@/lib/types";

interface AutoTagBannerProps {
  budgets: Budget[];
  onDismiss: (budgetId: string) => void;
}

export function AutoTagBanner({ budgets, onDismiss }: AutoTagBannerProps) {
  if (budgets.length === 0) return null;

  return (
    <div className="space-y-2 px-4 py-2">
      {budgets.map((budget) => (
        <div
          key={budget.id}
          className="bg-amber-900/30 border border-amber-700/50 rounded-lg px-3 py-2 flex items-center justify-between"
        >
          <div className="flex items-center gap-2 flex-1">
            <span className="text-lg">🏷️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-100 truncate">
                Auto-tagging: {budget.name}
              </p>
              <p className="text-xs text-amber-200">
                New expenses tagged #{budget.tag}
              </p>
            </div>
          </div>
          <button
            onClick={() => onDismiss(budget.id)}
            className="p-1 text-amber-400 hover:text-amber-300 shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
