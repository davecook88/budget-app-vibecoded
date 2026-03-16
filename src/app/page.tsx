"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getPendingTransactions, setupAutoSync } from "@/lib/offline";
import { BottomNav } from "@/components/BottomNav";
import { SafeToSpend } from "@/components/SafeToSpend";
import { TransactionList } from "@/components/TransactionList";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { QuickAdd } from "@/components/QuickAdd";
import { BudgetCard } from "@/components/BudgetCard";
import type { Transaction, BudgetWithSpent } from "@/lib/types";
import { LogOut, Settings, X, Save } from "lucide-react";
import Link from "next/link";
import { CurrencySelector } from "@/components/CurrencySelector";
import * as LucideIcons from "lucide-react";
import { getExchangeRate } from "@/lib/exchangeRates";

export default function HomePage() {
  const { user, profile, wallets, categories, loading, isConfigured, signOut } =
    useAuth();
  const { viewMode, defaultCurrency, refreshPendingCount } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [stats, setStats] = useState({
    spent: 0,
    budget: 0,
    dailyAmount: 0,
    totalRemaining: 0,
    daysLeft: 0,
  });

  // Edit modal state
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    amount: "",
    description: "",
    category_id: "",
    tags: [] as string[],
    date: "",
    original_currency: "",
  });

  const loadTransactions = useCallback(async () => {
    if (!user) return;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    // Build query based on view mode
    let query = supabase
      .from("transactions")
      .select("*, category:categories(*), wallet:wallets(*)")
      .gte("date", startOfMonth)
      .lte("date", endOfMonth)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (viewMode === "personal") {
      query = query.eq("user_id", user.id);
    }

    const { data } = await query;

    // Merge with pending transactions
    const pending = getPendingTransactions();
    const allTransactions = [...(data || []), ...pending] as Transaction[];

    // Remove duplicates (prefer synced versions - they come first now)
    const seen = new Set<string>();
    const unique = allTransactions.filter((t) => {
      const key = t.local_id || t.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setTransactions(unique);
  }, [user, viewMode]);

  const loadBudgets = useCallback(async () => {
    if (!user) return;

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const { data: budgetData } = await supabase
      .from("budgets")
      .select("*, category:categories(*)")
      .eq("month", month)
      .eq("year", year);

    if (budgetData) {
      // Calculate spent for each budget
      const budgetsWithSpent: BudgetWithSpent[] = await Promise.all(
        budgetData.map(async (budget) => {
          const { data: spentData } = await supabase
            .from("transactions")
            .select("amount, original_currency, exchange_rate_used")
            .eq("category_id", budget.category_id)
            .eq("type", "expense")
            .gte("date", `${year}-${String(month).padStart(2, "0")}-01`)
            .lte("date", `${year}-${String(month).padStart(2, "0")}-31`);

          const spent = (spentData || []).reduce((sum, t) => {
            const amount =
              t.original_currency === budget.currency
                ? t.amount
                : t.amount * (t.exchange_rate_used || 1);
            return sum + amount;
          }, 0);

          // TODO: Calculate actual rollover from previous months
          const rollover = 0;
          const remaining = budget.amount - spent + rollover;

          return {
            ...budget,
            spent,
            rollover,
            remaining,
          } as BudgetWithSpent;
        })
      );

      setBudgets(budgetsWithSpent);
    }
  }, [user]);

  const calculateStats = useCallback(() => {
    const now = new Date();
    const lastDay = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();
    const daysLeft = lastDay - now.getDate() + 1;

    const totalSpent = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalRemaining = totalBudget - totalSpent;
    const dailyAmount = daysLeft > 0 ? totalRemaining / daysLeft : 0;

    return {
      spent: totalSpent,
      budget: totalBudget,
      dailyAmount: Math.max(0, dailyAmount),
      totalRemaining,
      daysLeft,
    };
  }, [transactions, budgets]);

  useEffect(() => {
    if (user && isConfigured) {
      loadTransactions();
      loadBudgets();
    }
  }, [user, isConfigured, loadTransactions, loadBudgets]);

  useEffect(() => {
    setStats(calculateStats());
  }, [calculateStats]);

  // Handle edit transaction
  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      amount: transaction.amount.toString(),
      description: transaction.description || "",
      category_id: transaction.category_id || "",
      tags: transaction.tags || [],
      date: transaction.date,
      original_currency: transaction.original_currency,
    });
  };

  // Handle save edited transaction
  const handleSaveEdit = async () => {
    if (!editingTransaction || !editForm.amount) return;

    try {
      // Get exchange rate if currency changed
      let exchangeRate = editingTransaction.exchange_rate_used;
      if (editForm.original_currency !== editingTransaction.original_currency) {
        try {
          exchangeRate = await getExchangeRate(
            editForm.original_currency,
            defaultCurrency
          );
        } catch (error) {
          console.error("Error getting exchange rate:", error);
        }
      }

      const { error } = await supabase
        .from("transactions")
        .update({
          amount: parseFloat(editForm.amount),
          description: editForm.description || null,
          category_id: editForm.category_id || null,
          tags: editForm.tags,
          date: editForm.date,
          original_currency: editForm.original_currency,
          exchange_rate_used: exchangeRate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingTransaction.id);

      if (error) throw error;

      // Reload transactions and budgets
      await Promise.all([loadTransactions(), loadBudgets()]);
      setEditingTransaction(null);
    } catch (error) {
      console.error("Error updating transaction:", error);
      alert("Failed to update transaction");
    }
  };

  // Handle delete transaction
  const handleDelete = async (transaction: Transaction) => {
    if (
      !confirm(
        `Delete transaction: ${transaction.description || "Unnamed"} for ${
          transaction.amount
        } ${transaction.original_currency}?`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id);

      if (error) throw error;

      // Reload transactions and budgets
      await Promise.all([loadTransactions(), loadBudgets()]);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Failed to delete transaction");
    }
  };

  // Get category icon
  const getCategoryIcon = (categoryId: string | null) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return null;

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
    return <Icon className="w-4 h-4" />;
  };

  useEffect(() => {
    const cleanup = setupAutoSync((result) => {
      if (result.synced > 0) {
        loadTransactions();
        refreshPendingCount();
      }
    });
    return cleanup;
  }, [loadTransactions, refreshPendingCount]);

  const handleTransactionAdded = () => {
    loadTransactions();
    loadBudgets();
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFDF5]">
        <div className="animate-spin w-8 h-8 border-2 border-[#050505] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FFFDF5]">
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-bold text-[#050505] mb-2"
            style={{ fontFamily: "var(--font-lexend-mega)" }}
          >
            Presupuesto
          </h1>
          <p className="text-[#050505] opacity-70 font-mono">
            Personal finance for couples in Mexico
          </p>
        </div>

        {!isConfigured && (
          <div className="bg-[#FFE66D] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-lg p-4 mb-6 max-w-sm">
            <p className="text-[#050505] text-sm text-center font-bold">
              Supabase not configured. Add your credentials to .env.local to
              enable cloud sync.
            </p>
          </div>
        )}

        <Link
          href="/login"
          className="w-full max-w-sm bg-[#FF6B6B] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] text-white py-3 rounded-xl font-bold text-center active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="w-full max-w-sm mt-3 border-2 border-[#050505] bg-white shadow-[4px_4px_0px_0px_#050505] text-[#050505] py-3 rounded-xl font-bold text-center active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
        >
          Create Account
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 bg-[#FFFDF5]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-[#050505] shadow-[0px_4px_0px_0px_#050505]">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-[#050505] text-xs font-mono uppercase opacity-60">
              Welcome back,
            </p>
            <h1
              className="text-xl font-bold text-[#050505]"
              style={{ fontFamily: "var(--font-lexend-mega)" }}
            >
              {profile?.name || "User"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ViewModeToggle />
            <Link
              href="/settings"
              className="p-2 text-[#050505] hover:bg-[#FFE66D] rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </Link>
            <button
              onClick={signOut}
              className="p-2 text-[#050505] hover:bg-[#FF6B6B] hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Trip Banner */}
        {/* Safe to Spend Card */}
        <SafeToSpend
          dailyAmount={stats.dailyAmount}
          totalRemaining={stats.totalRemaining}
          daysLeft={stats.daysLeft}
          currency={defaultCurrency}
          spent={stats.spent}
          budget={stats.budget}
        />

        {/* Budgets Overview */}
        {budgets.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-lg font-bold text-[#050505]"
                style={{ fontFamily: "var(--font-lexend-mega)" }}
              >
                Budgets
              </h2>
              <Link
                href="/budgets"
                className="text-sm text-[#FF6B6B] font-bold font-mono uppercase"
              >
                See all →
              </Link>
            </div>
            <div className="space-y-3">
              {budgets.slice(0, 3).map((budget) => (
                <BudgetCard key={budget.id} budget={budget} />
              ))}
            </div>
          </section>
        )}

        {/* Recent Transactions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-lg font-bold text-[#050505]"
              style={{ fontFamily: "var(--font-lexend-mega)" }}
            >
              Recent Transactions
            </h2>
          </div>
          <TransactionList
            transactions={transactions.slice(0, 10)}
            categories={categories}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </section>
      </main>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-[#050505]/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border-2 border-[#050505] shadow-[8px_8px_0px_0px_#050505]">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b-2 border-[#050505] px-4 py-3 flex items-center justify-between">
              <h2
                className="text-lg font-bold text-[#050505]"
                style={{ fontFamily: "var(--font-lexend-mega)" }}
              >
                Edit Transaction
              </h2>
              <button
                onClick={() => setEditingTransaction(null)}
                className="text-[#050505] hover:bg-[#FF6B6B] hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-4 space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-bold text-[#050505] mb-2 uppercase tracking-wide font-mono">
                  Amount
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.amount}
                    onChange={(e) =>
                      setEditForm({ ...editForm, amount: e.target.value })
                    }
                    className="flex-1 bg-white border-2 border-[#050505] rounded-xl px-4 py-3 text-[#050505] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#FFE66D]"
                    placeholder="0.00"
                  />
                  <div className="w-64">
                    <CurrencySelector
                      selectedCurrency={editForm.original_currency}
                      onSelect={(currency) =>
                        setEditForm({
                          ...editForm,
                          original_currency: currency,
                        })
                      }
                      label=""
                      showRecent={true}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-[#050505] mb-2 uppercase tracking-wide font-mono">
                  Description
                </label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="w-full bg-white border-2 border-[#050505] rounded-xl px-4 py-3 text-[#050505] focus:outline-none focus:ring-2 focus:ring-[#FFE66D]"
                  placeholder="Optional description"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-bold text-[#050505] mb-2 uppercase tracking-wide font-mono">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories
                    .filter((c) => c.type === editingTransaction.type)
                    .map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() =>
                          setEditForm({ ...editForm, category_id: cat.id })
                        }
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border-2 border-[#050505] transition-all cursor-pointer ${
                          editForm.category_id === cat.id
                            ? "bg-[#FFE66D] text-[#050505] shadow-[2px_2px_0px_0px_#050505]"
                            : "bg-white text-[#050505] hover:translate-x-[2px] hover:translate-y-[2px]"
                        }`}
                      >
                        <span style={{ color: cat.color }}>
                          {getCategoryIcon(cat.id)}
                        </span>
                        {cat.name}
                      </button>
                    ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-bold text-[#050505] mb-2 uppercase tracking-wide font-mono">
                  Date
                </label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, date: e.target.value })
                  }
                  className="w-full bg-white border-2 border-[#050505] rounded-xl px-4 py-3 text-[#050505] font-mono focus:outline-none focus:ring-2 focus:ring-[#FFE66D]"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-bold text-[#050505] mb-2 uppercase tracking-wide font-mono">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {editForm.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm bg-[#4ECDC4] text-white border-2 border-[#050505] font-bold"
                    >
                      #{tag}
                      <button
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            tags: editForm.tags.filter((t) => t !== tag),
                          })
                        }
                        className="hover:text-[#050505]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add tag..."
                    className="px-3 py-1 bg-white border-2 border-[#050505] rounded-lg text-sm text-[#050505] font-mono focus:outline-none focus:ring-2 focus:ring-[#FFE66D]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const tag = e.currentTarget.value.trim().toLowerCase();
                        if (tag && !editForm.tags.includes(tag)) {
                          setEditForm({
                            ...editForm,
                            tags: [...editForm.tags, tag],
                          });
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-white border-t-2 border-[#050505] px-4 py-3 flex gap-3">
              <button
                onClick={() => setEditingTransaction(null)}
                className="flex-1 px-4 py-3 rounded-xl bg-white border-2 border-[#050505] text-[#050505] font-bold hover:bg-[#FFFDF5] transition active:translate-x-[2px] active:translate-y-[2px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-3 rounded-xl bg-[#4ECDC4] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] text-white font-bold active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <OfflineIndicator />
      <BottomNav />
    </div>
  );
}
