import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteBudget,
  listBudgets,
  listCategories,
  upsertBudget,
} from "../../../db";
import type { Budget, Category } from "../../../types";

interface BudgetModalProps {
  open: boolean;
  year: number;
  initialCategoryId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

type BudgetDrafts = Record<string, string>;

const userLocales =
  navigator.languages && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];

function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat(userLocales, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function normalizeAmountInput(value: string) {
  return value.replace(",", ".").trim();
}

function parseBudgetAmount(value: string) {
  const normalized = normalizeAmountInput(value);
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;

  return parsed;
}

export function BudgetModal({
  open,
  year,
  initialCategoryId,
  onClose,
  onSaved,
}: BudgetModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetDrafts, setBudgetDrafts] = useState<BudgetDrafts>({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const targetRowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setSelectedCategoryId(initialCategoryId ?? "");
  }, [open, initialCategoryId]);

  useEffect(() => {
    if (!open) return;

    async function loadData() {
      try {
        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        const [categoryRows, budgetRows] = await Promise.all([
          listCategories(),
          listBudgets(year),
        ]);

        setCategories(categoryRows);

        const budgetsByCategory = new Map<string, Budget>(
          budgetRows.map((budget) => [budget.categoryId, budget])
        );

        const nextDrafts: BudgetDrafts = {};
        for (const category of categoryRows) {
          const existingBudget = budgetsByCategory.get(category.id);
          nextDrafts[category.id] =
            existingBudget && Number.isFinite(existingBudget.annualAmount)
              ? String(existingBudget.annualAmount)
              : "";
        }

        setBudgetDrafts(nextDrafts);
      } catch (error) {
        setErrorMessage(
          `Erreur de chargement des catégories : ${String(error)}`
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [open, year]);

  const rows = useMemo(() => {
    return categories.map((category) => {
      const annualRaw = budgetDrafts[category.id] ?? "";
      const annualValue = parseBudgetAmount(annualRaw);
      const monthlyValue = annualValue !== null ? annualValue / 12 : null;
      const isConfigured = annualValue !== null && annualValue > 0;

      return {
        category,
        annualRaw,
        annualValue,
        monthlyValue,
        isConfigured,
      };
    });
  }, [categories, budgetDrafts]);

  useEffect(() => {
    if (!open) return;
    if (!selectedCategoryId) return;
    if (loading) return;

    const timeoutId = window.setTimeout(() => {
      targetRowRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [open, selectedCategoryId, loading, rows.length]);

  const budgetSummary = useMemo(() => {
    const configuredRows = rows.filter((row) => row.isConfigured);
    const totalAnnual = configuredRows.reduce(
      (sum, row) => sum + (row.annualValue ?? 0),
      0
    );
    const totalMonthly = totalAnnual / 12;

    return {
      configuredCount: configuredRows.length,
      totalCount: rows.length,
      totalAnnual,
      totalMonthly,
    };
  }, [rows]);

  async function handleSaveBudgets() {
    try {
        setSaving(true);
        setErrorMessage("");
        setSuccessMessage("");

        const now = new Date().toISOString();

        const existingBudgetsByCategory = new Map<string, Budget>(
        (await listBudgets(year)).map((budget) => [budget.categoryId, budget])
        );

        const operations = categories.map((category) => {
        const rawValue = budgetDrafts[category.id] ?? "";
        const parsed = parseBudgetAmount(rawValue);
        const existingBudget = existingBudgetsByCategory.get(category.id);

        if (parsed === null || parsed === 0) {
            if (!existingBudget) {
            return Promise.resolve();
            }

            return deleteBudget(category.id, year);
        }

        return upsertBudget({
            id: existingBudget?.id ?? `${category.id}-${year}`,
            categoryId: category.id,
            year,
            annualAmount: parsed,
            createdAt: existingBudget?.createdAt ?? now,
            updatedAt: now,
        });
        });

        await Promise.all(operations);

        const refreshedBudgets = await listBudgets(year);
        const refreshedBudgetsByCategory = new Map<string, Budget>(
        refreshedBudgets.map((budget) => [budget.categoryId, budget])
        );

        const nextDrafts: BudgetDrafts = {};
        for (const category of categories) {
        const budget = refreshedBudgetsByCategory.get(category.id);
        nextDrafts[category.id] =
            budget && Number.isFinite(budget.annualAmount)
            ? String(budget.annualAmount)
            : "";
        }

        setBudgetDrafts(nextDrafts);
        setSuccessMessage("Budgets enregistrés avec succès.");
        onSaved();
    } catch (error) {
        setErrorMessage(`Erreur budgets : ${String(error)}`);
    } finally {
        setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card wide budget-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-modal-title"
        aria-describedby="budget-modal-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="pane-kicker">BUDGET</p>
            <h2 id="budget-modal-title">Budgets {year}</h2>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Fermer la modale budget"
            title="Fermer"
          >
            ✕
          </button>
        </div>

        <div id="budget-modal-description" className="stack-form">
          <div className="budget-toolbar">
            <div className="budget-year-card">
              <span className="budget-year-label">Année budgétaire</span>
              <div className="budget-year-value">{year}</div>
            </div>

            <div className="budget-toolbar-hint">
              Saisie annuelle, affichage mensualisé.
            </div>
          </div>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          {successMessage ? <p className="positive">{successMessage}</p> : null}

          <div className="transactions-table-wrap budget-table-wrap">
            <table className="transactions-table budget-table">
              <thead>
                <tr>
                  <th>
                    <span className="th-static">Catégorie</span>
                  </th>
                  <th>
                    <span className="th-static">Budget annuel</span>
                  </th>
                  <th>
                    <span className="th-static">Équivalent mensuel</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3}>
                      <p className="empty-state">Chargement des catégories...</p>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <p className="empty-state">
                        Aucune catégorie disponible. Crée d’abord tes catégories.
                      </p>
                    </td>
                  </tr>
                ) : (
                  rows.map(
                    ({
                      category,
                      annualRaw,
                      annualValue,
                      monthlyValue,
                      isConfigured,
                    }) => {
                      const isTargetCategory =
                        category.id === selectedCategoryId;

                      return (
                        <tr
                          key={category.id}
                          ref={isTargetCategory ? targetRowRef : null}
                          className={[
                            "budget-row",
                            isConfigured ? "budget-row-configured" : "",
                            isTargetCategory ? "budget-row-target" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <td>
                            <div className="budget-category-cell">
                              <span
                                className="category-color"
                                style={{
                                  background:
                                    category.color ||
                                    "rgba(255,255,255,0.18)",
                                }}
                              />

                              <div className="budget-category-copy">
                                <div className="budget-category-topline">
                                  <span className="budget-category-name">
                                    {category.name}
                                  </span>

                                  {isConfigured ? (
                                    <span className="budget-status-badge">
                                      Configuré
                                    </span>
                                  ) : null}
                                </div>

                                <span className="budget-category-meta">
                                  {category.usageCount ?? 0} transaction
                                  {(category.usageCount ?? 0) > 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="budget-annual-field">
                              <input
                                type="text"
                                inputMode="decimal"
                                className="budget-input"
                                placeholder="0.00"
                                value={annualRaw}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setBudgetDrafts((current) => ({
                                    ...current,
                                    [category.id]: value,
                                  }));
                                }}
                              />
                              <span className="budget-input-suffix">€ / an</span>
                            </div>
                          </td>

                          <td>
                            <div className="budget-monthly-cell">
                              <span className="budget-monthly-value">
                                {monthlyValue !== null
                                  ? formatCurrency(monthlyValue)
                                  : "—"}
                              </span>
                              <span className="budget-monthly-meta">
                                {annualValue !== null
                                  ? "mensualisé automatiquement"
                                  : "par mois"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="budget-summary-bar">
          <div className="budget-summary-block">
            <span className="budget-summary-label">Catégories budgétées</span>
            <strong className="budget-summary-value">
              {budgetSummary.configuredCount} / {budgetSummary.totalCount}
            </strong>
          </div>

          <div className="budget-summary-block">
            <span className="budget-summary-label">Total annuel</span>
            <strong className="budget-summary-value">
              {formatCurrency(budgetSummary.totalAnnual)}
            </strong>
          </div>

          <div className="budget-summary-block">
            <span className="budget-summary-label">Mensuel équivalent</span>
            <strong className="budget-summary-value">
              {formatCurrency(budgetSummary.totalMonthly)}
            </strong>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Fermer
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={() => void handleSaveBudgets()}
            disabled={saving || loading}
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}