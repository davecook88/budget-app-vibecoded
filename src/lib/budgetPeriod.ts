import type { Budget } from "./types";

/**
 * Calculate the start and end dates for a budget's period
 */
export function getBudgetPeriod(
  budget: Budget,
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  switch (budget.period_type) {
    case "weekly":
      return getWeekBounds(referenceDate);

    case "monthly":
      return getMonthBounds(referenceDate);

    case "yearly":
      return getYearBounds(referenceDate);

    case "one-time":
    case "custom":
      if (!budget.start_date || !budget.end_date) {
        throw new Error(
          "Custom/one-time budgets must have start_date and end_date"
        );
      }
      return {
        start: new Date(budget.start_date),
        end: new Date(budget.end_date),
      };

    default:
      throw new Error(`Unknown period type: ${budget.period_type}`);
  }
}

/**
 * Get start and end of current week (Monday-Sunday)
 */
export function getWeekBounds(date: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday

  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Get start and end of current month
 */
export function getMonthBounds(date: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const year = date.getFullYear();
  const month = date.getMonth();

  const start = new Date(year, month, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(year, month + 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Get start and end of current year
 */
export function getYearBounds(date: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const year = date.getFullYear();

  const start = new Date(year, 0, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(year, 11, 31);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Format period as human-readable string
 */
export function formatBudgetPeriod(
  budget: Budget,
  referenceDate: Date = new Date()
): string {
  const { start, end } = getBudgetPeriod(budget, referenceDate);

  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  switch (budget.period_type) {
    case "weekly":
      return `${startStr} - ${endStr}`;
    case "monthly":
      return start.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    case "yearly":
      return start.getFullYear().toString();
    case "one-time":
    case "custom":
      return `${startStr} - ${endStr}`;
    default:
      return "";
  }
}

/**
 * Get days remaining in budget period
 */
export function getDaysRemaining(
  budget: Budget,
  referenceDate: Date = new Date()
): number {
  const { end } = getBudgetPeriod(budget, referenceDate);
  const daysMs = end.getTime() - referenceDate.getTime();
  return Math.ceil(daysMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if a budget period has ended
 */
export function isBudgetPeriodEnded(
  budget: Budget,
  referenceDate: Date = new Date()
): boolean {
  const { end } = getBudgetPeriod(budget, referenceDate);
  return referenceDate > end;
}

/**
 * Check if we're currently within a budget period
 */
export function isInBudgetPeriod(
  budget: Budget,
  referenceDate: Date = new Date()
): boolean {
  const { start, end } = getBudgetPeriod(budget, referenceDate);
  return referenceDate >= start && referenceDate <= end;
}

/**
 * Date range preset types for reporting
 */
export type DateRangePreset = "week" | "month" | "year" | "custom";

/**
 * Get date range bounds based on preset type
 */
export function getDateRangeBounds(
  preset: DateRangePreset,
  referenceDate: Date = new Date(),
  customStart?: Date,
  customEnd?: Date
): { start: Date; end: Date } {
  switch (preset) {
    case "week":
      return getWeekBounds(referenceDate);
    case "month":
      return getMonthBounds(referenceDate);
    case "year":
      return getYearBounds(referenceDate);
    case "custom":
      if (!customStart || !customEnd) {
        throw new Error("Custom date range requires start and end dates");
      }
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    default:
      throw new Error(`Unknown preset: ${preset}`);
  }
}

/**
 * Format date range as human-readable string
 */
export function formatDateRange(start: Date, end: Date): string {
  const isSameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();

  if (isSameMonth) {
    // Same month: "January 2026"
    return start.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  const isSameYear = start.getFullYear() === end.getFullYear();

  if (isSameYear) {
    // Same year: "Jan 1 - Feb 28, 2026"
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  // Different years: "Dec 1, 2025 - Jan 31, 2026"
  return `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} - ${end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

/**
 * Get previous period based on preset
 */
export function getPreviousPeriod(
  preset: DateRangePreset,
  currentDate: Date
): Date {
  const d = new Date(currentDate);
  switch (preset) {
    case "week":
      d.setDate(d.getDate() - 7);
      return d;
    case "month":
      d.setMonth(d.getMonth() - 1);
      return d;
    case "year":
      d.setFullYear(d.getFullYear() - 1);
      return d;
    default:
      return d;
  }
}

/**
 * Get next period based on preset
 */
export function getNextPeriod(preset: DateRangePreset, currentDate: Date): Date {
  const d = new Date(currentDate);
  switch (preset) {
    case "week":
      d.setDate(d.getDate() + 7);
      return d;
    case "month":
      d.setMonth(d.getMonth() + 1);
      return d;
    case "year":
      d.setFullYear(d.getFullYear() + 1);
      return d;
    default:
      return d;
  }
}
