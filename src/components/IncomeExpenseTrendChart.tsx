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
      <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4">
        <h2
          className="text-lg font-bold text-[#050505] mb-4 flex items-center gap-2"
          style={{ fontFamily: "var(--font-lexend-mega)" }}
        >
          <TrendingUp className="w-5 h-5 text-[#4ECDC4]" />
          <TrendingDown className="w-5 h-5 text-[#FF6B6B]" />
          Income vs. Expense
        </h2>
        <div className="text-center py-8 text-[#050505] opacity-60 font-mono">
          No transaction data for this period
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4">
      <h2
        className="text-lg font-bold text-[#050505] mb-4 flex items-center gap-2"
        style={{ fontFamily: "var(--font-lexend-mega)" }}
      >
        <TrendingUp className="w-5 h-5 text-[#4ECDC4]" />
        <TrendingDown className="w-5 h-5 text-[#FF6B6B]" />
        Income vs. Expense Trend
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="4 4" stroke="#050505" strokeOpacity={0.15} />
          <XAxis
            dataKey="shortDate"
            tick={{ fill: "#050505", fontSize: 12 }}
            stroke="#050505"
            tickLine={false}
            axisLine={{ strokeWidth: 2 }}
          />
          <YAxis
            tick={{ fill: "#050505", fontSize: 12 }}
            stroke="#050505"
            tickLine={false}
            axisLine={{ strokeWidth: 2 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFDF5",
              border: "2px solid #050505",
              borderRadius: "8px",
              color: "#050505",
            }}
            cursor={{ stroke: "#050505", strokeDasharray: "4 4", strokeOpacity: 0.35 }}
            labelStyle={{ color: "#050505", fontWeight: 700 }}
            formatter={(value) => formatCurrency(value as number, currency)}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend wrapperStyle={{ paddingTop: "20px", color: "#050505" }} />
          <Line
            type="monotone"
            dataKey="cumIncome"
            stroke="#4ECDC4"
            strokeWidth={3}
            dot={false}
            name="Cumulative Income"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="cumExpense"
            stroke="#FF6B6B"
            strokeWidth={3}
            dot={false}
            name="Cumulative Expenses"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
