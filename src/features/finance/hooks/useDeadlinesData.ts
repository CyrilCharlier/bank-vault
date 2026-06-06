import { useMemo } from "react";
import type {
  Category,
  Deadline,
  DeadlineFrequency,
  TransactionView,
} from "../../../types";

export type DeadlineStatus = "upcoming" | "paid" | "late";

export interface DeadlineMonthItem {
  id: string;
  deadlineId: string;
  label: string;
  amount: number;
  currency: string;
  dueDate: string;
  dayOfMonth: number;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  transactionId?: string | null;
  status: DeadlineStatus;
  frequency: DeadlineFrequency;
  notes?: string;
}

interface UseDeadlinesDataOptions {
  deadlines: Deadline[];
  selectedMonth: Date;
  categories: Category[];
  transactions?: TransactionView[];
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function toIsoDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function clampDay(year: number, monthIndex: number, day: number) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(day, lastDay);
}

function occursInMonth(deadline: Deadline, targetMonth: Date) {
  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);
  const start = new Date(`${deadline.startDate}T00:00:00`);
  const end = deadline.endDate ? new Date(`${deadline.endDate}T23:59:59`) : null;

  if (start > monthEnd) return false;
  if (end && end < monthStart) return false;

  const monthsDiff =
    (targetMonth.getFullYear() - start.getFullYear()) * 12 +
    (targetMonth.getMonth() - start.getMonth());

  if (monthsDiff < 0) return false;
  if (deadline.frequency === "monthly") return true;
  if (deadline.frequency === "quarterly") return monthsDiff % 3 === 0;
  return start.getMonth() === targetMonth.getMonth();
}

function wasAppliedThisMonth(deadline: Deadline, selectedMonth: Date) {
  if (!deadline.lastAppliedAt) return false;
  return deadline.lastAppliedAt.slice(0, 7) === monthKey(selectedMonth);
}

function computeStatus(dueDate: string, appliedThisMonth: boolean): DeadlineStatus {
  if (appliedThisMonth) return "paid";

  const today = new Date();
  const due = new Date(`${dueDate}T00:00:00`);
  const todayAtMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  if (due < todayAtMidnight) return "late";
  return "upcoming";
}

export function useDeadlinesData({
  deadlines,
  selectedMonth,
  categories,
  transactions = [],
}: UseDeadlinesDataOptions) {
  const items = useMemo<DeadlineMonthItem[]>(() => {
    const selectedMonthKey = monthKey(selectedMonth);

    return deadlines
      .filter((deadline) => occursInMonth(deadline, selectedMonth))
      .map((deadline) => {
        const category =
          categories.find((item) => item.id === deadline.categoryId) ?? null;

        const safeDay = clampDay(
          selectedMonth.getFullYear(),
          selectedMonth.getMonth(),
          deadline.dayOfMonth
        );

        const dueDate = toIsoDate(
          new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), safeDay)
        );

        const linkedTransaction =
            deadline.lastTransactionId
                ? transactions.find((tx) => tx.id === deadline.lastTransactionId) ?? null
                : null;

        const matchedTransaction =
            linkedTransaction ??
            transactions.find((tx) => {
                return (
                tx.label.trim().toLowerCase() === deadline.label.trim().toLowerCase() &&
                tx.amount === -Math.abs(deadline.amount) &&
                tx.date.slice(0, 7) === selectedMonthKey
                );
            }) ??
            null;

        const linkedTransactionInSelectedMonth =
            linkedTransaction != null &&
            linkedTransaction.date.slice(0, 7) === selectedMonthKey;

        const appliedThisMonth =
            wasAppliedThisMonth(deadline, selectedMonth) ||
            linkedTransactionInSelectedMonth ||
            (!deadline.lastTransactionId && matchedTransaction != null);

        return {
          id: `${deadline.id}:${selectedMonthKey}`,
          deadlineId: deadline.id,
          label: deadline.label,
          amount: deadline.amount,
          currency: deadline.currency,
          dueDate,
          dayOfMonth: safeDay,
          categoryId: category?.id ?? deadline.categoryId ?? null,
          categoryName: category?.name ?? null,
          categoryColor: category?.color ?? null,
          transactionId:
            linkedTransaction?.id ??
            matchedTransaction?.id ??
            deadline.lastTransactionId ??
            null,
          status: computeStatus(dueDate, appliedThisMonth),
          frequency: deadline.frequency,
          notes: deadline.notes,
        };
      })
      .sort((a, b) => {
        const statusOrder: Record<DeadlineStatus, number> = {
          late: 0,
          upcoming: 1,
          paid: 2,
        };

        const byStatus = statusOrder[a.status] - statusOrder[b.status];
        if (byStatus !== 0) return byStatus;

        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [categories, deadlines, selectedMonth, transactions]);

  const summary = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.totalAmount += item.amount;
        acc.totalCount += 1;

        if (item.status === "paid") {
          acc.paidAmount += item.amount;
          acc.paidCount += 1;
        } else if (item.status === "late") {
          acc.lateAmount += item.amount;
          acc.lateCount += 1;
        } else {
          acc.upcomingAmount += item.amount;
          acc.upcomingCount += 1;
        }

        return acc;
      },
      {
        totalAmount: 0,
        totalCount: 0,
        upcomingAmount: 0,
        upcomingCount: 0,
        paidAmount: 0,
        paidCount: 0,
        lateAmount: 0,
        lateCount: 0,
      }
    );
  }, [items]);

  return {
    items,
    summary,
  };
}