"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase";
import { Transaction, Budget, BudgetWithSpent } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";
import { BottomNav } from "@/components/BottomNav";
import { DateRangePicker } from "@/components/DateRangePicker";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { IncomeExpenseTrendChart } from "@/components/IncomeExpenseTrendChart";
import { BudgetSlider } from "@/components/BudgetSlider";
import { BudgetDrillDownModal } from "@/components/BudgetDrillDownModal";
import {
  DateRangePreset,
  getDateRangeBounds,
  getBudgetPeriod,
} from "@/lib/budgetPeriod";
import {
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  DollarSign,
  PieChart as PieChartIcon,
} from "lucide-react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { renderAppIcon } from "@/lib/icons";

export default function ReportsPage() {
  const { user, categories } = useAuth();
  const { viewMode, defaultCurrency } = useApp();

  // Date range state
  const [preset, setPreset] = useState<DateRangePreset>("month");
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();

  // Data state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [selectedBudget, setSelectedBudget] = useState<BudgetWithSpent | null>(
    null
  );

  // Get current date range - memoize to prevent infinite loops
  const dateRange = useMemo(() => {
    return getDateRangeBounds(preset, referenceDate, customStart, customEnd);
  }, [preset, referenceDate, customStart, customEnd]);

  const { start, end } = dateRange;

  // Load transactions and budgets
  const loadData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load transactions
      let txQuery = supabase
        .from("transactions")
        .select("*, category:categories(*), wallet:wallets(*)")
        .gte("date", start.toISOString().split("T")[0])
        .lte("date", end.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (viewMode === "personal") {
        txQuery = txQuery.eq("user_id", user.id);
      }

      const { data: txData } = await txQuery;
      setTransactions(txData || []);

      // Load budgets with spending calculations
      let budgetQuery = supabase
        .from("budgets")
        .select("*")
        .eq("is_archived", false);

      if (viewMode === "personal") {
        budgetQuery = budgetQuery
          .eq("scope", "personal")
          .eq("user_id", user.id);
      } else {
        budgetQuery = budgetQuery.eq("scope", "household");
      }

      const { data: budgetData } = await budgetQuery;

      // Calculate spending for each budget
      const budgetsWithSpent: BudgetWithSpent[] = await Promise.all(
        (budgetData || []).map(async (budget: Budget) => {
          const period = getBudgetPeriod(budget, referenceDate);

          let spentQuery = supabase
            .from("transactions")
            .select("amount")
            .eq("type", "expense")
            .gte("date", period.start.toISOString().split("T")[0])
            .lte("date", period.end.toISOString().split("T")[0])
            .contains("tags", [budget.tag]);

          if (viewMode === "personal") {
            spentQuery = spentQuery.eq("user_id", user.id);
          }

          const { data: spentData } = await spentQuery;
          const spent = spentData?.reduce((sum, t) => sum + t.amount, 0) || 0;

          return {
            ...budget,
            spent,
            rollover: 0,
            remaining: budget.amount - spent,
            period_start: period.start.toISOString(),
            period_end: period.end.toISOString(),
            percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
          };
        })
      );

      setBudgets(budgetsWithSpent);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, viewMode, referenceDate, start, end]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate stats
  const expenses = transactions.filter((t) => t.type === "expense");
  const income = transactions.filter((t) => t.type === "income");
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
  const net = totalIncome - totalExpenses;

  // Prepare chart data for budgets
  const budgetChartData = budgets
    .filter((b) => b.spent > 0)
    .map((b) => ({
      name: b.name,
      value: b.spent,
      color: b.color,
    }));

  const COLORS = budgetChartData.map((d) => d.color);

  if (loading) {
    return (
      <div className="min-h-screen pb-24 bg-[#FFFDF5] flex items-center justify-center">
        <div className="text-[#050505] font-mono font-bold">
          Loading reports...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-[#FFFDF5]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-[#050505]">
        <div className="flex items-center gap-4 p-4">
          <Link
            href="/"
            className="text-[#050505] hover:bg-[#FFE66D] p-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1
            className="text-xl font-bold text-[#050505] flex-1"
            style={{ fontFamily: "var(--font-lexend-mega)" }}
          >
            Reports
          </h1>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Date Range Picker */}
        <DateRangePicker
          preset={preset}
          referenceDate={referenceDate}
          customStart={customStart}
          customEnd={customEnd}
          onPresetChange={setPreset}
          onReferenceDateChange={setReferenceDate}
          onCustomRangeChange={(start, end) => {
            setCustomStart(start);
            setCustomEnd(end);
          }}
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingDown className="w-4 h-4 text-[#FF6B6B]" />
            </div>
            <div className="text-lg font-bold text-[#050505] font-mono">
              {formatCurrency(totalExpenses, defaultCurrency)}
            </div>
            <div className="text-xs text-[#050505] opacity-60 font-mono uppercase font-bold">
              Expenses
            </div>
          </div>

          <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-[#4ECDC4]" />
            </div>
            <div className="text-lg font-bold text-[#050505] font-mono">
              {formatCurrency(totalIncome, defaultCurrency)}
            </div>
            <div className="text-xs text-[#050505] opacity-60 font-mono uppercase font-bold">
              Income
            </div>
          </div>

          <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <DollarSign className="w-4 h-4 text-[#FFE66D]" />
            </div>
            <div
              className={`text-lg font-bold font-mono ${
                net >= 0 ? "text-[#4ECDC4]" : "text-[#FF6B6B]"
              }`}
            >
              {formatCurrency(Math.abs(net), defaultCurrency)}
            </div>
            <div className="text-xs text-[#050505] opacity-60 font-mono uppercase font-bold">
              Net
            </div>
          </div>
        </div>

        {/* Income vs. Expense Trend */}
        <IncomeExpenseTrendChart
          transactions={transactions}
          currency={defaultCurrency}
          dateRange={{ start, end }}
        />

        {/* Expense Category Breakdown */}
        <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4">
          <h2
            className="text-lg font-bold text-[#050505] mb-4 flex items-center gap-2"
            style={{ fontFamily: "var(--font-lexend-mega)" }}
          >
            <PieChartIcon className="w-5 h-5 text-[#FF6B6B]" />
            Expenses by Category
          </h2>
          <CategoryBreakdown
            transactions={transactions}
            categories={categories}
            type="expense"
            currency={defaultCurrency}
          />
        </div>

        {/* Budget Slider */}
        {budgets.length > 0 && (
          <BudgetSlider budgets={budgets} onBudgetClick={setSelectedBudget} />
        )}

        {/* Budget Performance Chart */}
        {budgetChartData.length > 0 && (
          <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4">
            <h2
              className="text-lg font-bold text-[#050505] mb-4 flex items-center gap-2"
              style={{ fontFamily: "var(--font-lexend-mega)" }}
            >
              <PieChartIcon className="w-5 h-5 text-[#4ECDC4]" />
              Budget Spending Distribution
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={budgetChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {budgetChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Income Category Breakdown */}
        {income.length > 0 && (
          <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4">
            <h2
              className="text-lg font-bold text-[#050505] mb-4"
              style={{ fontFamily: "var(--font-lexend-mega)" }}
            >
              Income by Category
            </h2>
            <CategoryBreakdown
              transactions={transactions}
              categories={categories}
              type="income"
              currency={defaultCurrency}
            />
          </div>
        )}

        {/* Budget Performance List */}
        {budgets.length > 0 && (
          <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4">
            <h2
              className="text-lg font-bold text-[#050505] mb-4"
              style={{ fontFamily: "var(--font-lexend-mega)" }}
            >
              Budget Details
            </h2>
            <div className="space-y-3">
              {budgets
                .sort((a, b) => b.percentage - a.percentage)
                .map((budget) => (
                  <div
                    key={budget.id}
                    className="bg-[#FFFDF5] border-2 border-[#050505] rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg border-2 border-[#050505] flex items-center justify-center text-lg"
                          style={{ backgroundColor: budget.color + "40" }}
                        >
                          <span style={{ color: budget.color }}>
                            {renderAppIcon(budget.icon, {
                              className: "w-5 h-5",
                              fallback: "Wallet",
                              textClassName: "text-lg leading-none",
                            })}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-[#050505]">
                            {budget.name}
                          </p>
                          <p className="text-xs text-[#FF6B6B] font-mono font-bold">
                            {budget.tag}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#050505] font-mono">
                          {formatCurrency(budget.spent, defaultCurrency)}
                        </p>
                        <p className="text-xs text-[#050505] opacity-60 font-mono">
                          of {formatCurrency(budget.amount, defaultCurrency)}
                        </p>
                      </div>
                    </div>

                    <div className="h-5 bg-white border-2 border-[#050505] rounded-lg overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${Math.min(budget.percentage, 100)}%`,
                          backgroundColor:
                            budget.percentage > 100
                              ? "#FF6B6B"
                              : budget.percentage > 80
                              ? "#FFE66D"
                              : "#4ECDC4",
                        }}
                      />
                    </div>

                    <div className="mt-2 flex justify-between text-xs font-mono font-bold">
                      <span className="text-[#050505] opacity-60">
                        {budget.percentage.toFixed(0)}% used
                      </span>
                      <span
                        className={
                          budget.remaining >= 0
                            ? "text-[#4ECDC4]"
                            : "text-[#FF6B6B]"
                        }
                      >
                        {formatCurrency(
                          Math.abs(budget.remaining),
                          defaultCurrency
                        )}{" "}
                        {budget.remaining >= 0 ? "remaining" : "over"}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* Budget Drill-Down Modal */}
      <BudgetDrillDownModal
        budget={selectedBudget}
        transactions={transactions}
        categories={categories}
        currency={defaultCurrency}
        onClose={() => setSelectedBudget(null)}
      />

      <BottomNav />
    </div>
  );
}
