import { useMemo, useState } from "react";
import type { Account, TransactionView } from "../../../types";
import { parseDateOnly } from "../utils/format";

type FilterMode = "all" | "account";
type PeriodFilter = "all" | "30d" | "90d" | "year" | "custom";
type SortField = "date" | "label" | "accountName" | "category" | "amount";
type SortDirection = "asc" | "desc";

interface UseTransactionFiltersOptions {
  accounts: Account[];
  transactions: TransactionView[];
  selectedAccountId: string | null;
  filterMode: FilterMode;
}

const userLocales =
  navigator.languages && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];

const UNCATEGORIZED_LABEL = "Non classée";

function getCategoryLabel(transaction: TransactionView) {
  return transaction.categoryName?.trim() || UNCATEGORIZED_LABEL;
}

export function useTransactionFilters({
  accounts,
  transactions,
  selectedAccountId,
  filterMode,
}: UseTransactionFiltersOptions) {
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  const accountScopedTransactions = useMemo(() => {
    if (filterMode === "account" && selectedAccountId) {
      return transactions.filter(
        (transaction) => transaction.accountId === selectedAccountId
      );
    }

    return transactions;
  }, [transactions, filterMode, selectedAccountId]);

  function getPresetStartDate(period: Exclude<PeriodFilter, "all" | "custom">) {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === "30d") {
      base.setDate(base.getDate() - 30);
      return base;
    }

    if (period === "90d") {
      base.setDate(base.getDate() - 90);
      return base;
    }

    return new Date(now.getFullYear(), 0, 1);
  }

  function clearFilters() {
    setSearchTerm("");
    setPeriodFilter("all");
    setStartDate("");
    setEndDate("");
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "date" || field === "amount" ? "desc" : "asc");
  }

  function getAriaSort(field: SortField) {
    if (sortField !== field) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  }

  function getSortIndicator(field: SortField) {
    if (sortField !== field) return "◇";
    return sortDirection === "asc" ? "▲" : "▼";
  }

  const filteredTransactions = useMemo(() => {
    let rows = [...accountScopedTransactions];
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase();

    if (normalizedSearch) {
      rows = rows.filter((transaction) => {
        const haystack = [
          transaction.label,
          transaction.accountName,
          getCategoryLabel(transaction),
          transaction.reference ?? "",
          transaction.notes ?? "",
          transaction.amount.toString(),
          transaction.date,
        ]
          .join(" ")
          .toLocaleLowerCase();

        return haystack.includes(normalizedSearch);
      });
    }

    if (periodFilter !== "all") {
      let minDate: Date | null = null;
      let maxDate: Date | null = null;

      if (periodFilter === "custom") {
        minDate = startDate ? parseDateOnly(startDate) : null;
        maxDate = endDate ? parseDateOnly(endDate) : null;
      } else {
        minDate = getPresetStartDate(periodFilter);
      }

      rows = rows.filter((transaction) => {
        const current = parseDateOnly(transaction.date);

        if (Number.isNaN(current.getTime())) {
          return false;
        }

        if (minDate && current < minDate) {
          return false;
        }

        if (maxDate) {
          const inclusiveMax = new Date(
            maxDate.getFullYear(),
            maxDate.getMonth(),
            maxDate.getDate(),
            23,
            59,
            59,
            999
          );

          if (current > inclusiveMax) {
            return false;
          }
        }

        return true;
      });
    }

    rows.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "date":
          comparison =
            parseDateOnly(a.date).getTime() - parseDateOnly(b.date).getTime();
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "label":
          comparison = a.label.localeCompare(b.label, userLocales[0]);
          break;
        case "accountName":
          comparison = a.accountName.localeCompare(b.accountName, userLocales[0]);
          break;
        case "category":
          comparison = getCategoryLabel(a).localeCompare(
            getCategoryLabel(b),
            userLocales[0]
          );
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return rows;
  }, [
    accountScopedTransactions,
    searchTerm,
    periodFilter,
    startDate,
    endDate,
    sortField,
    sortDirection,
  ]);

  const totalBalance = accounts.reduce(
    (sum, account) => sum + account.currentBalance,
    0
  );

  const displayedExpenses = filteredTransactions
    .filter((transaction) => transaction.amount < 0)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

  const displayedIncomes = filteredTransactions
    .filter((transaction) => transaction.amount > 0)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const netFlow = displayedIncomes - displayedExpenses;

  const topCategories = useMemo(() => {
    const totals = new Map<string, number>();

    for (const transaction of filteredTransactions) {
      if (transaction.amount >= 0) continue;

      const categoryLabel = getCategoryLabel(transaction);
      const current = totals.get(categoryLabel) ?? 0;
      totals.set(categoryLabel, current + Math.abs(transaction.amount));
    }

    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filteredTransactions]);

  return {
    searchTerm,
    setSearchTerm,
    periodFilter,
    setPeriodFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    sortField,
    sortDirection,
    toggleSort,
    getAriaSort,
    getSortIndicator,
    clearFilters,
    selectedAccount,
    filteredTransactions,
    totalBalance,
    netFlow,
    topCategories,
  };
}