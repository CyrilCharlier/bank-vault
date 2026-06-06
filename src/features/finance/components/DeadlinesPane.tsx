import { useState } from "react";
import type { Category, Deadline, TransactionView } from "../../../types";
import {
  useDeadlinesData,
  type DeadlineMonthItem,
  type DeadlineStatus,
} from "../hooks/useDeadlinesData";

type DeadlinesPaneProps = {
  categories: Category[];
  transactions: TransactionView[];
  deadlines: Deadline[];
  onCreateDeadline: () => void;
  onEditDeadline: (deadline: Deadline) => void;
  onDeleteDeadline: (deadline: Deadline) => void;
  onApplyDeadline: (deadline: Deadline) => void | Promise<void>;
  onUnapplyDeadline: (deadline: Deadline) => void | Promise<void>;
};

function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getStatusLabel(status: DeadlineStatus) {
  if (status === "paid") return "Payé";
  if (status === "late") return "En retard";
  return "À venir";
}

function getFrequencyLabel(frequency: Deadline["frequency"]) {
  if (frequency === "monthly") return "Mensuelle";
  if (frequency === "quarterly") return "Trimestrielle";
  return "Annuelle";
}

function shiftMonthDate(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function findSourceDeadline(
  item: DeadlineMonthItem,
  deadlines: Deadline[]
): Deadline | undefined {
  return deadlines.find((deadline) => deadline.id === item.deadlineId);
}

export function DeadlinesPane({
  categories,
  transactions,
  deadlines,
  onCreateDeadline,
  onEditDeadline,
  onDeleteDeadline,
  onApplyDeadline,
  onUnapplyDeadline,
}: DeadlinesPaneProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const monthLabel = selectedMonth.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const { items, summary } = useDeadlinesData({
    deadlines,
    selectedMonth,
    categories,
    transactions,
  });

  function shiftMonth(offset: number) {
    setSelectedMonth((current) => shiftMonthDate(current, offset));
  }

  return (
    <section className="transactions-pane deadlines-view-shell">
      <div className="deadlines-topbar">
        <div className="deadlines-topbar-title">
          <p className="pane-kicker">Échéances</p>
          <h2>Vue mensuelle</h2>
          <p className="deadlines-topbar-subtitle">
            Suivi du mois sélectionné, avec mise en avant des retards, des paiements
            détectés et des échéances encore à venir.
          </p>
        </div>

        <div className="deadlines-topbar-controls">
          <div className="deadlines-month-nav">
            <button
              type="button"
              className="toolbar-secondary-btn"
              onClick={() => shiftMonth(-1)}
            >
              ← Mois précédent
            </button>

            <div className="deadlines-month-pill">{monthLabel}</div>

            <button
              type="button"
              className="toolbar-secondary-btn"
              onClick={() => shiftMonth(1)}
            >
              Mois suivant →
            </button>
          </div>

          <button
            type="button"
            className="toolbar-cta"
            onClick={onCreateDeadline}
          >
            Nouvelle échéance
          </button>
        </div>
      </div>

      <div className="budget-kpi-inline-row deadlines-kpi-row">
        <article className="transactions-pane-card budget-kpi-inline-card deadlines-kpi-card">
          <span className="budget-kpi-inline-label">Total du mois</span>
          <strong className="budget-kpi-inline-value">
            {formatCurrency(summary.totalAmount)}
          </strong>
          <span className="deadlines-kpi-meta">
            {summary.totalCount} échéance{summary.totalCount > 1 ? "s" : ""} prévue
            {summary.totalCount > 1 ? "s" : ""} sur la période affichée
          </span>
        </article>

        <article className="transactions-pane-card budget-kpi-inline-card deadlines-kpi-card">
          <span className="budget-kpi-inline-label">À venir</span>
          <strong className="budget-kpi-inline-value">
            {formatCurrency(summary.upcomingAmount)}
          </strong>
          <span className="deadlines-kpi-meta">
            {summary.upcomingCount} échéance
            {summary.upcomingCount > 1 ? "s" : ""} encore attendue
            {summary.upcomingCount > 1 ? "s" : ""}
          </span>
        </article>

        <article className="transactions-pane-card budget-kpi-inline-card deadlines-kpi-card">
          <span className="budget-kpi-inline-label">Déjà payé</span>
          <strong className="budget-kpi-inline-value">
            {formatCurrency(summary.paidAmount)}
          </strong>
          <span className="deadlines-kpi-meta">
            {summary.paidCount} échéance{summary.paidCount > 1 ? "s" : ""} marquée
            {summary.paidCount > 1 ? "s" : ""} comme réglée
          </span>
        </article>
      </div>

      <section className="transactions-pane-card deadlines-table-card">
        <div className="deadlines-details-header">
          <div>
            <h3>Échéances du mois</h3>
            <p>
              Le tableau reste centré sur le mois affiché, avec tri par statut puis
              par date d’échéance.
            </p>
          </div>

          <div className="deadlines-legend">
            <span className="deadline-status-badge is-upcoming">À venir</span>
            <span className="deadline-status-badge is-paid">Payé</span>
            <span className="deadline-status-badge is-late">En retard</span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="deadlines-empty-state">
            Aucune échéance à afficher sur ce mois.
          </div>
        ) : (
          <div className="deadlines-table-wrap">
            <table className="deadlines-details-table">
              <thead>
                <tr>
                  <th>Jour</th>
                  <th>Libellé</th>
                  <th>Catégorie</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => {
                  const sourceDeadline = findSourceDeadline(item, deadlines);

                  const canUnapply =
                    item.status === "paid" &&
                    sourceDeadline != null &&
                    sourceDeadline.lastTransactionId != null;

                  return (
                    <tr
                      key={item.id}
                      className={`deadline-row is-${item.status}`}
                    >
                      <td className="deadline-day-cell">{item.dayOfMonth}</td>

                      <td>
                        <div className="deadline-label-cell">
                          <span className="deadline-label">{item.label}</span>
                          <span className="deadline-subtext">
                            {getFrequencyLabel(item.frequency)}
                            {item.notes ? ` · ${item.notes}` : ""}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="deadline-category-chip">
                          {item.categoryName ?? "Non catégorisé"}
                        </span>
                      </td>

                      <td className="deadline-amount-cell">
                        {formatCurrency(item.amount, item.currency)}
                      </td>

                      <td>
                        <span className={`deadline-status-badge is-${item.status}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </td>

                      <td className="deadlines-table__actions">
                        {canUnapply ? (
                            <button
                            type="button"
                            className="table-action-btn table-action-btn--warning"
                            onClick={() => {
                                if (!sourceDeadline) return;
                                void onUnapplyDeadline(sourceDeadline);
                            }}
                            >
                            Annuler paiement
                            </button>
                        ) : item.status !== "paid" ? (
                            <button
                            type="button"
                            className="table-action-btn table-action-btn--primary"
                            onClick={() => {
                                if (!sourceDeadline) return;
                                void onApplyDeadline(sourceDeadline);
                            }}
                            disabled={!sourceDeadline}
                            >
                            Marquer payé
                            </button>
                        ) : (
                            <span className="table-action-static">Payé</span>
                        )}

                        <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => {
                            if (!sourceDeadline) return;
                            onEditDeadline(sourceDeadline);
                            }}
                            disabled={!sourceDeadline}
                        >
                            Modifier
                        </button>

                        <button
                            type="button"
                            className="table-action-btn table-action-btn--danger"
                            onClick={() => {
                            if (!sourceDeadline) return;
                            onDeleteDeadline(sourceDeadline);
                            }}
                            disabled={!sourceDeadline}
                        >
                            Supprimer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan={6} className="deadline-summary-foot">
                    En retard : {formatCurrency(summary.lateAmount)} · Total :{" "}
                    {formatCurrency(summary.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}