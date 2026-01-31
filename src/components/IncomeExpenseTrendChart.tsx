"use client";

import { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface IncomeExpenseTrendChartProps {
  transactions: Transaction[];
  currency: string;
  dateRange: { start: Date; end: Date };
}

export function IncomeExpenseTrendChart({
  transactions,
  currency,
  dateRange,
}: IncomeExpenseTrendChartProps) {
  // Aggregate transactions by day
  const dailyData: Record<
    string,
    { expenses: number; income: number; date: string }
  > = {};

  // Initialize all days in range
  const current = new Date(dateRange.start);
  while (current <= dateRange.end) {
    const dateStr = current.toISOString().split("T")[0];
    dailyData[dateStr] = { expenses: 0, income: 0, date: dateStr };
    current.setDate(current.getDate() + 1);
  }

  // Aggregate transactions
  transactions.forEach((t) => {
    if (dailyData[t.date]) {
      if (t.type === "expense") {
        dailyData[t.date].expenses += t.amount;
      } else if (t.type === "income") {
        dailyData[t.date].income += t.amount;
      }
    }
  });

  // Convert to array and calculate cumulative values
  const chartData = Object.values(dailyData)
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce(
      (acc, day, index) => {
        const prev = index > 0 ? acc[index - 1] : { cumExpense: 0, cumIncome: 0 };
        acc.push({
          date: day.date,
          shortDate: new Date(day.date + "T00:00:00").toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric" }
          ),
          income: day.income,
          expenses: day.expenses,
          cumIncome: prev.cumIncome + day.income,
          cumExpense: prev.cumExpense + day.expenses,
        });
        return acc;
      },
      [] as Array<{
        date: string;
        shortDate: string;
        income: number;
        expenses: number;
        cumIncome: number;
        cumExpense: number;
      }>
    );

  if (chartData.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-4">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <TrendingDown className="w-5 h-5 text-red-400" />
          Income vs. Expense
        </h2>
        <div className="text-center py-8 text-slate-400">
          No transaction data for this period
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-green-400" />
        <TrendingDown className="w-5 h-5 text-red-400" />
        Income vs. Expense Trend
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis
            dataKey="shortDate"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            stroke="#475569"
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            stroke="#475569"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#f1f5f9" }}
            formatter={(value) => formatCurrency(value as number, currency)}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Line
            type="monotone"
            dataKey="cumIncome"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="Cumulative Income"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="cumExpense"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            name="Cumulative Expenses"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
