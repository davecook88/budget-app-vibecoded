"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { TransactionList } from "@/components/TransactionList";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, Filter, Calendar, Search, X, Save } from "lucide-react";
import Link from "next/link";
import type { Transaction } from "@/lib/types";
import { CurrencySelector } from "@/components/CurrencySelector";
import * as LucideIcons from "lucide-react";
import { getExchangeRate } from "@/lib/exchangeRates";

export default function TransactionsPage() {
  const { user, categories } = useAuth();
  const { viewMode, defaultCurrency } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Edit modal state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
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

    setLoading(true);

    try {
      let query = supabase
        .from("transactions")
        .select("*, category:categories(*), wallet:wallets(*)")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (viewMode === "personal") {
        query = query.eq("user_id", user.id);
      }

      const { data } = await query;
      setTransactions(data || []);
      setFilteredTransactions(data || []);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [user, viewMode]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    let filtered = [...transactions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.description?.toLowerCase().includes(query) ||
          t.category?.name.toLowerCase().includes(query) ||
          t.wallet?.name.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((t) => t.category_id === selectedCategory);
    }

    // Month filter
    if (selectedMonth !== "all") {
      const [year, month] = selectedMonth.split("-");
      filtered = filtered.filter((t) => {
        const date = new Date(t.date);
        return (
          date.getFullYear() === parseInt(year) &&
          date.getMonth() + 1 === parseInt(month)
        );
      });
    }

    setFilteredTransactions(filtered);
  }, [searchQuery, selectedCategory, selectedMonth, transactions]);

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
          exchangeRate = await getExchangeRate(editForm.original_currency, defaultCurrency);
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

      // Reload transactions
      await loadTransactions();
      setEditingTransaction(null);
    } catch (error) {
      console.error("Error updating transaction:", error);
      alert("Failed to update transaction");
    }
  };

  // Handle delete transaction
  const handleDelete = async (transaction: Transaction) => {
    if (!confirm(`Delete transaction: ${transaction.description || "Unnamed"} for ${transaction.amount} ${transaction.original_currency}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id);

      if (error) throw error;

      // Reload transactions
      await loadTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Failed to delete transaction");
    }
  };

  // Get category icon
  const getCategoryIcon = (categoryId: string | null) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return null;
    
    const iconName = category.icon.charAt(0).toUpperCase() + 
      category.icon.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || LucideIcons.CircleDot;
    return <Icon className="w-4 h-4" />;
  };

  // Get unique months from transactions
  const availableMonths = Array.from(
    new Set(
      transactions.map((t) => {
        const date = new Date(t.date);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
      })
    )
  )
    .sort()
    .reverse();

  const stats = {
    total: filteredTransactions.length,
    expenses: filteredTransactions.filter((t) => t.type === "expense").length,
    income: filteredTransactions.filter((t) => t.type === "income").length,
    totalAmount: filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0),
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="flex items-center gap-4 p-4">
          <Link href="/" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-white flex-1">Transactions</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 transition ${
              showFilters
                ? "text-indigo-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="px-4 pb-4 space-y-3 border-t border-slate-800 pt-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Time</option>
                {availableMonths.map((month) => {
                  const [year, monthNum] = month.split("-");
                  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                  const label = date.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  });
                  return (
                    <option key={month} value={month}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedMonth("all");
              }}
              className="w-full py-2 text-sm text-slate-400 hover:text-white transition"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="px-4 pb-4 grid grid-cols-3 gap-2">
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-slate-400">Total</div>
          </div>
          <div className="bg-red-500/10 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-red-400">
              {stats.expenses}
            </div>
            <div className="text-xs text-slate-400">Expenses</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-green-400">
              {stats.income}
            </div>
            <div className="text-xs text-slate-400">Income</div>
          </div>
        </div>
      </header>

      <main className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No transactions found</p>
            {(searchQuery ||
              selectedCategory !== "all" ||
              selectedMonth !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setSelectedMonth("all");
                }}
                className="mt-4 text-indigo-400 text-sm hover:text-indigo-300"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <TransactionList
            transactions={filteredTransactions}
            categories={categories}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </main>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-700 shadow-xl">
            {/* Header */}
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Edit Transaction</h2>
              <button
                onClick={() => setEditingTransaction(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-4 space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                  <div className="w-32">
                    <CurrencySelector
                      selectedCurrency={editForm.original_currency}
                      onSelect={(currency) =>
                        setEditForm({ ...editForm, original_currency: currency })
                      }
                      label=""
                      showRecent={true}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional description"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
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
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
                          editForm.category_id === cat.id
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500"
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
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, date: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {editForm.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                    >
                      #{tag}
                      <button
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            tags: editForm.tags.filter((t) => t !== tag),
                          })
                        }
                        className="hover:text-emerald-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add tag..."
                    className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-4 py-3 flex gap-3">
              <button
                onClick={() => setEditingTransaction(null)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
