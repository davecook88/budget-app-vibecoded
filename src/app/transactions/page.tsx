"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { TransactionList } from "@/components/TransactionList";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, Filter, Calendar, Search } from "lucide-react";
import Link from "next/link";
import type { Transaction } from "@/lib/types";

export default function TransactionsPage() {
  const { user, categories } = useAuth();
  const { viewMode } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

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
            className={`p-2 transition cursor-pointer ${
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
              className="w-full py-2 text-sm text-slate-400 hover:text-white transition cursor-pointer"
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
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
}
