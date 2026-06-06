import { useEffect, useState } from "react";
import type { Budget } from "../../../types";
import { listBudgets } from "../../../db";

interface UseBudgetDataOptions {
  year: number;
  refreshKey?: number;
  onError?: (message: string) => void;
}

export function useBudgetData({
  year,
  refreshKey = 0,
  onError,
}: UseBudgetDataOptions) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);

  async function reloadBudgets() {
    try {
      setLoading(true);
      const data = await listBudgets(year);
      setBudgets(data);
    } catch (error) {
      onError?.(`Impossible de charger les budgets : ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reloadBudgets();
  }, [year, refreshKey]);

  return {
    budgets,
    loading,
    reloadBudgets,
  };
}