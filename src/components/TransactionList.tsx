"use client";

import { formatTransactionAmount } from "@/lib/currency";
import type { Transaction, Category } from "@/lib/types";
import * as LucideIcons from "lucide-react";
import { Clock, Trash2, Edit } from "lucide-react";

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

export function TransactionList({
  transactions,
  categories,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const getCategoryIcon = (categoryId: string | null) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return <LucideIcons.CircleDot className="w-5 h-5" />;

    const iconName =
      category.icon.charAt(0).toUpperCase() +
      category.icon.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const Icon =
      (
        LucideIcons as unknown as Record<
          string,
          React.ComponentType<{ className?: string }>
        >
      )[iconName] || LucideIcons.CircleDot;
    return <Icon className="w-5 h-5" />;
  };

  const getCategoryColor = (categoryId: string | null) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || "#6b7280";
  };

  const getCategoryName = (categoryId: string | null) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "Uncategorized";
  };

  const groupByDate = (txns: Transaction[]) => {
    const groups: Record<string, Transaction[]> = {};
    txns.forEach((t) => {
      const date = t.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(t);
    });
    return groups;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === yesterday.getTime()) return "Yesterday";

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const grouped = groupByDate(transactions);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-[#050505]">
        <LucideIcons.Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-bold">No transactions yet</p>
        <p className="text-sm opacity-70">
          Add your first expense to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date}>
          <h3 className="text-sm font-bold text-[#050505] mb-3 uppercase tracking-wide font-mono">
            {formatDate(date)}
          </h3>
          <div className="space-y-3">
            {grouped[date].map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center gap-3 p-4 bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#050505] transition-all group"
              >
                {/* Category Icon in Neo-Brutalist Box */}
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center border-2 border-[#050505] shrink-0"
                  style={{
                    backgroundColor:
                      getCategoryColor(transaction.category_id) + "40",
                  }}
                >
                  <span
                    style={{ color: getCategoryColor(transaction.category_id) }}
                  >
                    {getCategoryIcon(transaction.category_id)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[#050505] truncate">
                      {transaction.description ||
                        getCategoryName(transaction.category_id)}
                    </p>
                    {!transaction.synced_at && (
                      <Clock className="w-3 h-3 text-[#FFE66D] shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#050505] opacity-60 font-mono">
                    <span>{getCategoryName(transaction.category_id)}</span>
                    {transaction.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-[#FF6B6B] font-bold">
                          #{transaction.tags[0]}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right flex items-center gap-2">
                  <div>
                    <p
                      className={`font-bold font-mono text-lg ${
                        transaction.type === "income"
                          ? "text-[#4ECDC4]"
                          : "text-[#050505]"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatTransactionAmount(
                        transaction.amount,
                        transaction.original_currency,
                        transaction.default_currency_value,
                        transaction.default_currency
                      )}
                    </p>
                    {/* Show exchange rate info if currencies differ */}
                    {transaction.original_currency !==
                      transaction.default_currency &&
                      transaction.default_currency_value && (
                        <p className="text-xs text-[#050505] opacity-50 font-mono">
                          @ {transaction.exchange_rate_used.toFixed(4)}
                        </p>
                      )}
                  </div>

                  {/* Action buttons */}
                  {(onEdit || onDelete) && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(transaction);
                          }}
                          className="p-1.5 rounded-lg border-2 border-[#050505] bg-white hover:bg-[#4ECDC4] text-[#050505] transition active:translate-x-[2px] active:translate-y-[2px] cursor-pointer"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(transaction);
                          }}
                          className="p-1.5 rounded-lg border-2 border-[#050505] bg-white hover:bg-[#FF6B6B] hover:text-white text-[#050505] transition active:translate-x-[2px] active:translate-y-[2px] cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
