"use client";

import { Category, Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";
import { useMemo } from "react";

interface CategoryData {
  category: Category;
  amount: number;
  count: number;
  percentage: number;
}

interface CategoryBreakdownProps {
  transactions: Transaction[];
  categories: Category[];
  type: "expense" | "income";
  currency: string;
  onCategoryClick?: (categoryId: string) => void;
}

export function CategoryBreakdown({
  transactions,
  categories,
  type,
  currency,
  onCategoryClick,
}: CategoryBreakdownProps) {
  const categoryData = useMemo(() => {
    // Filter transactions by type
    const filtered = transactions.filter((t) => t.type === type);

    // Calculate total
    const total = filtered.reduce((sum, t) => sum + t.amount, 0);

    // Group by category
    const grouped = filtered.reduce((acc, t) => {
      const catId = t.category_id || "uncategorized";
      if (!acc[catId]) {
        acc[catId] = { amount: 0, count: 0 };
      }
      acc[catId].amount += t.amount;
      acc[catId].count += 1;
      return acc;
    }, {} as Record<string, { amount: number; count: number }>);

    // Convert to array and add category info
    const data: CategoryData[] = Object.entries(grouped).map(
      ([catId, stats]) => {
        const category =
          categories.find((c) => c.id === catId) ||
          ({
            id: catId,
            name: "Uncategorized",
            icon: "❓",
            color: "#64748b",
            type,
          } as Category);

        return {
          category,
          amount: stats.amount,
          count: stats.count,
          percentage: total > 0 ? (stats.amount / total) * 100 : 0,
        };
      }
    );

    // Sort by amount descending
    return data.sort((a, b) => b.amount - a.amount);
  }, [transactions, categories, type]);

  if (categoryData.length === 0) {
    return (
      <div className="text-center py-8 text-[#050505] opacity-60 font-mono">
        <p>No {type === "expense" ? "expenses" : "income"} in this period</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categoryData.map(({ category, amount, count, percentage }) => (
        <button
          key={category.id}
          onClick={() => onCategoryClick?.(category.id)}
          className="w-full bg-white border-2 border-[#050505] rounded-xl p-4 hover:translate-x-[2px] hover:translate-y-[2px] transition-all group"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg border-2 border-[#050505] flex items-center justify-center text-xl"
                style={{ backgroundColor: category.color + "40" }}
              >
                {category.icon}
              </div>
              <div className="text-left">
                <p className="font-bold text-[#050505]">{category.name}</p>
                <p className="text-xs text-[#050505] opacity-60 font-mono">{count} transactions</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-[#050505] font-mono">
                {formatCurrency(amount, currency)}
              </p>
              <p className="text-xs text-[#050505] opacity-60 font-mono font-bold">{percentage.toFixed(1)}%</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-5 bg-white border-2 border-[#050505] rounded-lg overflow-hidden">
            <div
              className="h-full transition-all duration-300 group-hover:opacity-90"
              style={{
                width: `${percentage}%`,
                backgroundColor: category.color,
              }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}
