"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/BottomNav";
import { BudgetCard } from "@/components/BudgetCard";
import { AutoTagBanner } from "@/components/AutoTagBanner";
import { ArrowLeft, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { getBudgetPeriod } from "@/lib/budgetPeriod";
import type { BudgetWithSpent, Budget, BudgetInput } from "@/lib/types";

export default function BudgetsPage() {
  const { user } = useAuth();
  const { defaultCurrency, autoTagBudgets, setAutoTagBudgets } = useApp();
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithSpent | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BudgetInput>({
    name: "",
    tag: "",
    amount: 0,
    currency: defaultCurrency,
    period_type: "monthly",
    scope: "personal",
    icon: "wallet",
    color: "#6366f1",
    rollover_enabled: false,
    auto_tag_new_transactions: false,
  });

  const loadBudgets = useCallback(async () => {
    if (!user) return;

    const { data: budgetData } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (budgetData) {
      const budgetsWithSpent: BudgetWithSpent[] = await Promise.all(
        budgetData.map(async (budget: Budget) => {
          const { start, end } = getBudgetPeriod(budget);
          const startStr = start.toISOString().split("T")[0];
          const endStr = end.toISOString().split("T")[0];

          const { data: spentData } = await supabase
            .from("transactions")
            .select("amount, original_currency, exchange_rate_used")
            .contains("tags", [budget.tag])
            .eq("type", "expense")
            .gte("date", startStr)
            .lte("date", endStr);

          const spent = (spentData || []).reduce((sum, t) => {
            const amount =
              t.original_currency === budget.currency
                ? t.amount
                : t.amount * (t.exchange_rate_used || 1);
            return sum + amount;
          }, 0);

          const remaining = budget.amount - spent;
          const percentage =
            budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

          return {
            ...budget,
            spent,
            rollover: 0,
            remaining,
            percentage,
            period_start: startStr,
            period_end: endStr,
          } as BudgetWithSpent;
        })
      );

      setBudgets(budgetsWithSpent);
    }
  }, [user]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const budgetData: Partial<Budget> = {
        name: formData.name,
        tag: formData.tag,
        amount: parseFloat(formData.amount.toString()),
        currency: formData.currency,
        period_type: formData.period_type,
        scope: formData.scope,
        icon: formData.icon || "wallet",
        color: formData.color || "#6366f1",
        rollover_enabled: formData.rollover_enabled || false,
        auto_tag_new_transactions: formData.auto_tag_new_transactions || false,
        user_id: user.id,
        household_id: null,
      };

      if (
        formData.period_type === "custom" ||
        formData.period_type === "one-time"
      ) {
        if (!formData.start_date || !formData.end_date) {
          throw new Error("Start and end dates are required");
        }
        budgetData.start_date = formData.start_date;
        budgetData.end_date = formData.end_date;
      }

      if (editingBudget) {
        const { error } = await supabase
          .from("budgets")
          .update(budgetData)
          .eq("id", editingBudget.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("budgets").insert([budgetData]);

        if (error) throw error;
      }

      await loadBudgets();
      setShowModal(false);
      setEditingBudget(null);
      resetForm();
    } catch (error) {
      console.error("Error saving budget:", error);
      alert(error instanceof Error ? error.message : "Failed to save budget");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      tag: "",
      amount: 0,
      currency: defaultCurrency,
      period_type: "monthly",
      scope: "personal",
      icon: "wallet",
      color: "#6366f1",
      rollover_enabled: false,
      auto_tag_new_transactions: false,
    });
  };

  const handleEdit = (budget: BudgetWithSpent) => {
    setEditingBudget(budget);
    setFormData({
      name: budget.name,
      tag: budget.tag,
      amount: budget.amount,
      currency: budget.currency,
      period_type: budget.period_type,
      start_date: budget.start_date || undefined,
      end_date: budget.end_date || undefined,
      scope: budget.scope,
      icon: budget.icon,
      color: budget.color,
      rollover_enabled: budget.rollover_enabled,
      auto_tag_new_transactions: budget.auto_tag_new_transactions,
    });
    setShowModal(true);
  };

  const handleDelete = async (budgetId: string) => {
    if (!confirm("Delete this budget?")) return;

    try {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", budgetId);

      if (error) throw error;
      await loadBudgets();
    } catch (error) {
      console.error("Error deleting budget:", error);
      alert("Failed to delete budget");
    }
  };

  const handleDismissAutoTag = (budgetId: string) => {
    setAutoTagBudgets(autoTagBudgets.filter((b) => b.id !== budgetId));
  };

  if (!user) return null;

  const activeBudgets = budgets.filter((b) => !b.is_archived);
  const hasAutoTagBudgets = autoTagBudgets.length > 0;

  return (
    <div className="min-h-screen pb-24 bg-[#FFFDF5]">
      <header className="sticky top-0 z-40 bg-white border-b-2 border-[#050505] shadow-[0px_4px_0px_0px_#050505]">
        <div className="flex items-center gap-4 p-4">
          <Link href="/" className="text-[#050505] hover:bg-[#FFE66D] p-2 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-[#050505] flex-1" style={{ fontFamily: "var(--font-lexend-mega)" }}>Budgets</h1>
          <button
            onClick={() => {
              setEditingBudget(null);
              resetForm();
              setShowModal(true);
            }}
            className="p-2 text-[#050505] hover:bg-[#FF6B6B] hover:text-white rounded-lg transition-colors"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Auto-tag banner */}
        {hasAutoTagBudgets && (
          <AutoTagBanner
            budgets={autoTagBudgets}
            onDismiss={handleDismissAutoTag}
          />
        )}

        {activeBudgets.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-[#050505] opacity-30 mx-auto mb-4" />
            <p className="text-[#050505] mb-2 font-bold" style={{ fontFamily: "var(--font-lexend-mega)" }}>No budgets yet</p>
            <p className="text-sm text-[#050505] opacity-60 mb-6 font-mono">
              Create budgets to track your spending
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#FF6B6B] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] text-white px-6 py-3 rounded-xl font-bold active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
            >
              Create Your First Budget
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeBudgets.map((budget) => (
              <div key={budget.id}>
                <BudgetCard
                  budget={budget}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}

        <div className="bg-[#FFE66D] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4 mt-6">
          <h3 className="font-bold text-[#050505] mb-2" style={{ fontFamily: "var(--font-lexend-mega)" }}>💡 How It Works</h3>
          <ul className="text-sm text-[#050505] space-y-2 font-mono">
            <li>
              • Create budgets with a <strong>tag</strong> (e.g.,
              &ldquo;dining-out&rdquo;)
            </li>
            <li>
              • Tag your transactions (e.g., &ldquo;50 tacos food
              #dining-out&rdquo;)
            </li>
            <li>
              • Spending is automatically tracked against matching budgets
            </li>
            <li>
              • Enable <strong>auto-tag</strong> to automatically add tags to
              new transactions
            </li>
          </ul>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 pb-28">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border-2 border-[#050505] shadow-[6px_6px_0px_0px_#050505] max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-[#050505] mb-6" style={{ fontFamily: "var(--font-lexend-mega)" }}>
              {editingBudget ? "Edit Budget" : "New Budget"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#050505] mb-2 uppercase tracking-wide font-mono">
                  Budget Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Dining Out"
                  className="w-full bg-white border-2 border-[#050505] rounded-xl px-4 py-3 text-[#050505] placeholder:text-[#050505] placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#FFE66D] font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#050505] mb-2 uppercase tracking-wide font-mono">
                  Tag (lowercase, no spaces)
                </label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tag: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                  placeholder="dining-out"
                  className="w-full bg-white border-2 border-[#050505] rounded-xl px-4 py-3 text-[#050505] placeholder:text-[#050505] placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#FFE66D] font-mono"
                  required
                />
                <p className="text-xs text-[#050505] opacity-60 mt-1 font-mono">
                  Use this tag in transactions: #dining-out
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#050505] mb-2 uppercase tracking-wide font-mono">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: parseFloat(e.target.value),
                      })
                    }
                    placeholder="0.00"
                    className="w-full bg-white border-2 border-[#050505] rounded-xl px-4 py-3 text-[#050505] focus:outline-none focus:ring-2 focus:ring-[#FFE66D] font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#050505] mb-2 uppercase tracking-wide font-mono">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currency: e.target.value as "MXN" | "USD",
                      })
                    }
                    className="w-full bg-white border-2 border-[#050505] rounded-xl px-4 py-3 text-[#050505] focus:outline-none focus:ring-2 focus:ring-[#FFE66D] font-mono font-bold"
                  >
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#050505] mb-2 uppercase tracking-wide font-mono">
                  Period
                </label>
                <select
                  value={formData.period_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      period_type: e.target.value as
                        | "weekly"
                        | "monthly"
                        | "yearly"
                        | "custom"
                        | "one-time",
                    })
                  }
                  className="w-full bg-white border-2 border-[#050505] rounded-xl px-4 py-3 text-[#050505] focus:outline-none focus:ring-2 focus:ring-[#FFE66D] font-mono font-bold"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {(formData.period_type === "custom" ||
                formData.period_type === "one-time") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#050505] mb-2 uppercase tracking-wide font-mono">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          start_date: e.target.value,
                        })
                      }
                      className="w-full bg-white border-2 border-[#050505] rounded-xl px-4 py-3 text-[#050505] focus:outline-none focus:ring-2 focus:ring-[#FFE66D] font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#050505] mb-2 uppercase tracking-wide font-mono">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          end_date: e.target.value,
                        })
                      }
                      className="w-full bg-white border-2 border-[#050505] rounded-xl px-4 py-3 text-[#050505] focus:outline-none focus:ring-2 focus:ring-[#FFE66D] font-mono"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="rollover"
                    checked={formData.rollover_enabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rollover_enabled: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded border-2 border-[#050505] bg-white text-[#4ECDC4] focus:ring-2 focus:ring-[#FFE66D]"
                  />
                  <label htmlFor="rollover" className="text-sm text-[#050505] font-mono font-bold">
                    Enable rollover
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="autotag"
                    checked={formData.auto_tag_new_transactions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        auto_tag_new_transactions: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded border-2 border-[#050505] bg-white text-[#4ECDC4] focus:ring-2 focus:ring-[#FFE66D]"
                  />
                  <label htmlFor="autotag" className="text-sm text-[#050505] font-mono font-bold">
                    Auto-tag new transactions
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBudget(null);
                  }}
                  className="flex-1 bg-white border-2 border-[#050505] text-[#050505] py-3 rounded-xl font-bold hover:bg-[#FFFDF5] transition active:translate-x-[2px] active:translate-y-[2px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#4ECDC4] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] text-white py-3 rounded-xl font-bold active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50"
                >
                  {loading ? "Saving..." : editingBudget ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
