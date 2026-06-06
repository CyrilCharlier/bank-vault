import type { Account, Category, TransactionView, Budget } from "../../../types";
import { formatCurrency } from "../utils/format";
import { useBudgetData } from "../hooks/useBudgetData";

interface BudgetPaneProps {
  accounts: Account[];
  categories: Category[];
  transactions: TransactionView[];
  selectedYear: number;
  refreshKey: number;
  onYearChange: (year: number) => void;
  onOpenBudgetEditor: () => void;
  onOpenBudgetCategory: (categoryId: string) => void;
}

const userLocales =
  navigator.languages && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];

function getCurrentYear() {
  return new Date().getFullYear();
}

function getReferenceMonthIndex() {
  return new Date().getMonth();
}

function isSameMonth(dateIso: string, year: number, monthIndex: number) {
  const d = new Date(dateIso);
  return d.getFullYear() === year && d.getMonth() === monthIndex;
}

export function BudgetPane({
  accounts,
  categories,
  transactions,
  selectedYear,
  refreshKey,
  onYearChange,
  onOpenBudgetEditor,
  onOpenBudgetCategory,
}: BudgetPaneProps) {
  const year = selectedYear;
  const currentYear = getCurrentYear();
  const referenceMonthIndex = getReferenceMonthIndex();

  const { budgets, loading: budgetsLoading } = useBudgetData({
    year,
    refreshKey,
  });

  const categoriesById = new Map<string, Category>(
    categories.map((category) => [category.id, category])
  );

  const budgetsByCategory = new Map<string, Budget>(
    budgets
      .filter((budget) => budget.year === year)
      .map((budget) => [budget.categoryId, budget])
  );

  const expensesThisMonthByCategory = new Map<string, number>();
  const expensesYearToDateByCategory = new Map<string, number>();
  const totalExpensesThisMonthByCategoryName = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.amount >= 0) continue;

    const txDate = new Date(tx.date);
    if (txDate.getFullYear() !== year) continue;

    const categoryId = tx.categoryId ?? "UNCATEGORIZED";
    const categoryName =
      tx.categoryName?.trim() ||
      categoriesById.get(categoryId)?.name ||
      "Non classée";

    const absoluteAmount = Math.abs(tx.amount);

    const currentYearToDate =
      expensesYearToDateByCategory.get(categoryId) ?? 0;
    expensesYearToDateByCategory.set(
      categoryId,
      currentYearToDate + absoluteAmount
    );

    if (!isSameMonth(tx.date, year, referenceMonthIndex)) continue;

    const currentMonth = expensesThisMonthByCategory.get(categoryId) ?? 0;
    expensesThisMonthByCategory.set(categoryId, currentMonth + absoluteAmount);

    const currentByName =
      totalExpensesThisMonthByCategoryName.get(categoryName) ?? 0;
    totalExpensesThisMonthByCategoryName.set(
      categoryName,
      currentByName + absoluteAmount
    );
  }

  type BudgetCategoryRow = {
    categoryId: string;
    categoryName: string;
    annualBudget: number | null;
    monthlyBudget: number | null;
    spentThisMonth: number;
    spentYearToDate: number;
    monthlyDelta: number | null;
    monthlyUsageRatio: number | null;
  };

  const allCategoryIds = new Set<string>();

  for (const category of categories) {
    allCategoryIds.add(category.id);
  }

  for (const [categoryId] of expensesThisMonthByCategory) {
    allCategoryIds.add(categoryId);
  }

  for (const [categoryId] of expensesYearToDateByCategory) {
    allCategoryIds.add(categoryId);
  }

  for (const budget of budgets) {
    if (budget.year === year) {
      allCategoryIds.add(budget.categoryId);
    }
  }

  const budgetRows: BudgetCategoryRow[] = [];

  for (const categoryId of allCategoryIds) {
    const category = categoriesById.get(categoryId);
    const categoryName =
      category?.name ||
      (categoryId === "UNCATEGORIZED" ? "Non classée" : "Catégorie inconnue");

    const budget = budgetsByCategory.get(categoryId) ?? null;
    const annualBudget = budget ? budget.annualAmount : null;
    const monthlyBudget = annualBudget !== null ? annualBudget / 12 : null;
    const spentThisMonth = expensesThisMonthByCategory.get(categoryId) ?? 0;
    const spentYearToDate = expensesYearToDateByCategory.get(categoryId) ?? 0;

    let monthlyDelta: number | null = null;
    if (monthlyBudget !== null) {
      monthlyDelta = monthlyBudget - spentThisMonth;
    }

    let monthlyUsageRatio: number | null = null;
    if (monthlyBudget !== null && monthlyBudget > 0) {
      monthlyUsageRatio = spentThisMonth / monthlyBudget;
    }

    budgetRows.push({
      categoryId,
      categoryName,
      annualBudget,
      monthlyBudget,
      spentThisMonth,
      spentYearToDate,
      monthlyDelta,
      monthlyUsageRatio,
    });
  }

  budgetRows.sort((a, b) => {
    const aHasBudget = a.monthlyBudget !== null;
    const bHasBudget = b.monthlyBudget !== null;

    if (aHasBudget !== bHasBudget) {
      return aHasBudget ? -1 : 1;
    }

    return a.categoryName.localeCompare(b.categoryName, userLocales[0]);
  });

  const totalAccountsBalance = accounts.reduce(
    (sum, account) => sum + account.currentBalance,
    0
  );

  const totalExpensesThisMonth = Array.from(
    totalExpensesThisMonthByCategoryName.values()
  ).reduce((sum, value) => sum + value, 0);

  const currentMonthLabel = new Intl.DateTimeFormat(userLocales, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, referenceMonthIndex, 1));

  const isCurrentYearView = year === currentYear;

  return (
    <section className="transactions-pane budget-view-shell">
      <div className="budget-topbar">
        <div className="budget-topbar-title">
          <div className="budget-topbar-heading">
            <div>
              <p className="pane-kicker">BUDGET</p>
              <h2>Vue budget {year}</h2>
            </div>

            <div className="budget-topbar-controls">
              <label className="budget-year-control">
                <span>Année</span>
                <select
                  value={year}
                  onChange={(event) => onYearChange(Number(event.target.value))}
                >
                  {Array.from({ length: 5 }, (_, index) => {
                    const optionYear = getCurrentYear() - 2 + index;
                    return (
                      <option key={optionYear} value={optionYear}>
                        {optionYear}
                      </option>
                    );
                  })}
                </select>
              </label>

              <button
                type="button"
                className="toolbar-secondary-btn"
                onClick={onOpenBudgetEditor}
              >
                Gérer les budgets
              </button>
            </div>
          </div>
        </div>

        <div className="budget-kpi-inline-row">
          <div className="panel-card budget-kpi-inline-card">
            <span className="budget-kpi-inline-label">Solde total</span>
            <strong className="budget-kpi-inline-value">
              {formatCurrency(totalAccountsBalance)}
            </strong>
          </div>

          <div className="panel-card budget-kpi-inline-card">
            <span className="budget-kpi-inline-label">
              Dépenses du mois
            </span>
            <strong className="budget-kpi-inline-value negative">
              {formatCurrency(-totalExpensesThisMonth)}
            </strong>
          </div>

          <div className="panel-card budget-kpi-inline-card">
            <span className="budget-kpi-inline-label">Catégories actives</span>
            <strong className="budget-kpi-inline-value">
              {totalExpensesThisMonthByCategoryName.size}
            </strong>
          </div>
        </div>
      </div>

      <div className="panel-card budget-details-card">
        <div className="budget-details-header">
          <div>
            <h3>Détails par catégorie</h3>
            <p>
              Pour {currentMonthLabel}. Le budget mensuel est calculé à partir du
              budget annuel / 12, et tous les indicateurs affichés pilotent le
              mois de référence.
              {!isCurrentYearView
                ? ` Ici, tu compares ${currentMonthLabel} avec les budgets de ${year}.`
                : ""}
            </p>
          </div>
        </div>

        <div className="budget-table-wrap">
          <table className="transactions-table budget-table" tabIndex={0}>
            <thead>
              <tr>
                <th>Catégorie</th>
                <th>Budget annuel</th>
                <th>Budget mensuel</th>
                <th>Dépensé ce mois</th>
                <th>Écart mensuel</th>
                <th>Consommé du mois</th>
              </tr>
            </thead>

            <tbody>
              {budgetsLoading ? (
                <tr>
                  <td colSpan={6}>
                    <p className="empty-state">Chargement des budgets...</p>
                  </td>
                </tr>
              ) : budgetRows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <p className="empty-state">
                      Aucune donnée disponible pour le moment. Configure d’abord
                      des budgets et/ou enregistre des opérations.
                    </p>
                  </td>
                </tr>
              ) : (
                budgetRows.map((row) => {
                  const hasBudget = row.monthlyBudget !== null;
                  const isOver =
                    row.monthlyDelta !== null && row.monthlyDelta < 0;

                  const usagePercent =
                    row.monthlyUsageRatio !== null
                      ? Math.round(row.monthlyUsageRatio * 100)
                      : null;

                  let usageFillClass = "budget-usage-fill";
                  if (row.monthlyUsageRatio !== null && row.monthlyUsageRatio >= 1) {
                    usageFillClass = "budget-usage-fill is-over";
                  } else if (
                    row.monthlyUsageRatio !== null &&
                    row.monthlyUsageRatio >= 0.8
                  ) {
                    usageFillClass = "budget-usage-fill is-warning";
                  }

                  let monthlyUsageStatus: "none" | "ok" | "warning" | "over" =
                    "none";

                  if (row.monthlyUsageRatio !== null) {
                    if (row.monthlyUsageRatio >= 1) {
                      monthlyUsageStatus = "over";
                    } else if (row.monthlyUsageRatio >= 0.8) {
                      monthlyUsageStatus = "warning";
                    } else {
                      monthlyUsageStatus = "ok";
                    }
                  }

                  return (
                    <tr
                      key={row.categoryId}
                      className={[
                        "budget-row",
                        row.categoryId !== "UNCATEGORIZED"
                          ? "budget-row-clickable"
                          : "",
                        hasBudget ? "budget-row-configured" : "",
                        isOver ? "budget-row-target" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        if (row.categoryId === "UNCATEGORIZED") return;
                        onOpenBudgetCategory(row.categoryId);
                      }}
                    >
                      <td>
                        <div className="budget-category-cell">
                          <div className="budget-category-copy">
                            <div className="budget-category-topline">
                              <span
                                className={
                                  hasBudget
                                    ? "budget-category-name"
                                    : "budget-category-name budget-category-name-muted"
                                }
                              >
                                {row.categoryName}
                              </span>

                              {isOver ? (
                                <span className="budget-inline-badge is-over">
                                  Dépassé
                                </span>
                              ) : hasBudget ? (
                                <span className="budget-inline-badge">
                                  Budget défini
                                </span>
                              ) : (
                                <span className="budget-inline-badge is-muted">
                                  À configurer
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        {row.annualBudget !== null
                          ? formatCurrency(row.annualBudget)
                          : "—"}
                      </td>

                      <td>
                        {row.monthlyBudget !== null
                          ? formatCurrency(row.monthlyBudget)
                          : "—"}
                      </td>

                      <td className="budget-cell-negative">
                        {row.spentThisMonth > 0
                          ? formatCurrency(-row.spentThisMonth)
                          : "0,00 €"}
                      </td>

                      <td className={isOver ? "budget-cell-over" : "budget-cell-ok"}>
                        {row.monthlyDelta !== null
                          ? formatCurrency(row.monthlyDelta)
                          : "—"}
                      </td>

                      <td>
                        <div className="budget-usage-cell">
                          <div className="budget-usage-topline">
                            <span className="budget-cell-negative">
                              {row.spentThisMonth > 0
                                ? formatCurrency(-row.spentThisMonth)
                                : "0,00 €"}
                            </span>

                            <div className="budget-usage-status-group">
                              {monthlyUsageStatus !== "none" ? (
                                <span
                                  className={[
                                    "budget-usage-badge",
                                    monthlyUsageStatus === "warning"
                                      ? "is-warning"
                                      : monthlyUsageStatus === "over"
                                      ? "is-over"
                                      : "is-ok",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                >
                                  {monthlyUsageStatus === "over"
                                    ? "Dépassé"
                                    : monthlyUsageStatus === "warning"
                                    ? "Vigilance"
                                    : "OK"}
                                </span>
                              ) : null}

                              <span
                                className={[
                                  "budget-usage-percent",
                                  monthlyUsageStatus === "warning"
                                    ? "is-warning"
                                    : monthlyUsageStatus === "over"
                                    ? "is-over"
                                    : monthlyUsageStatus === "ok"
                                    ? "is-ok"
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {usagePercent !== null ? `${usagePercent} %` : "—"}
                              </span>
                            </div>
                          </div>

                          {row.monthlyUsageRatio !== null ? (
                            <div className="budget-usage-bar">
                              <div
                                className={usageFillClass}
                                style={{
                                  width: `${Math.min(
                                    row.monthlyUsageRatio * 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}