import { useLayoutEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { TransactionView } from "../../../types";
import { FiltersBar } from "./FiltersBar";

type PeriodFilter = "all" | "30d" | "90d" | "year" | "custom";
type SortField = "date" | "label" | "accountName" | "category" | "amount";
type SortDirection = "asc" | "desc";

interface TransactionsPaneProps {
  loading: boolean;
  filteredTransactions: TransactionView[];
  searchTerm: string;
  periodFilter: PeriodFilter;
  startDate: string;
  endDate: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSearchTermChange: (value: string) => void;
  onPeriodFilterChange: (value: PeriodFilter) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClearFilters: () => void;
  onToggleSort: (field: SortField) => void;
  getAriaSort: (field: SortField) => "none" | "ascending" | "descending";
  getSortIndicator: (field: SortField) => string;
  onEditTransaction: (transaction: TransactionView) => void;
  onDeleteTransaction: (transaction: TransactionView) => void;
  onToggleTransactionCleared: (transaction: TransactionView) => void | Promise<void>;
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (value: string) => string;
}

function getCategoryLabel(transaction: TransactionView) {
  return transaction.categoryName?.trim() || "Non classée";
}

export function TransactionsPane({
  loading,
  filteredTransactions,
  searchTerm,
  periodFilter,
  startDate,
  endDate,
  onSearchTermChange,
  onPeriodFilterChange,
  onStartDateChange,
  onEndDateChange,
  onClearFilters,
  onToggleSort,
  getAriaSort,
  getSortIndicator,
  onEditTransaction,
  onDeleteTransaction,
  onToggleTransactionCleared,
  formatCurrency,
  formatDate,
}: TransactionsPaneProps) {
  // ← ref sur le div scrollable, PAS sur le tableau lui-même
  const scrollRef = useRef<HTMLDivElement>(null);
  const savedScrollTopRef = useRef(0);
  const shouldRestoreScrollRef = useRef(false);

  const virtualizer = useVirtualizer({
    count: filteredTransactions.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 56, // hauteur estimée d'une ligne (ajuste si tes lignes sont plus hautes)
    overscan: 8,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useLayoutEffect(() => {
    if (!shouldRestoreScrollRef.current) {
      return;
    }

    const scrollElement = scrollRef.current;
    if (!scrollElement) {
      return;
    }

    scrollElement.scrollTop = savedScrollTopRef.current;
    shouldRestoreScrollRef.current = false;
  }, [filteredTransactions]);

  // Espaceurs pour maintenir la hauteur totale du tableau
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <section className="transactions-pane">
      <FiltersBar
        searchTerm={searchTerm}
        periodFilter={periodFilter}
        startDate={startDate}
        endDate={endDate}
        onSearchTermChange={onSearchTermChange}
        onPeriodFilterChange={onPeriodFilterChange}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onClearFilters={onClearFilters}
      />

      <div className="results-bar">
        <p className="results-text">
          {filteredTransactions.length} transaction
          {filteredTransactions.length > 1 ? "s" : ""} affichée
          {filteredTransactions.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* ← c'est ce div qui scroll, pas le tableau */}
      <div className="transactions-table-wrap" ref={scrollRef} tabIndex={0}>
        {loading ? (
          <p className="empty-state">Chargement des transactions…</p>
        ) : filteredTransactions.length === 0 ? (
          <p className="empty-state">Aucune transaction à afficher pour cette vue.</p>
        ) : (
          <table className="transactions-table ledger-table">
            <thead>
              <tr>
                <th aria-sort={getAriaSort("date")}>
                  <button type="button" className="sort-button" onClick={() => onToggleSort("date")}>
                    <span>Date / Pointage</span>
                    <span className="sort-indicator">{getSortIndicator("date")}</span>
                  </button>
                </th>
                <th aria-sort={getAriaSort("label")}>
                  <button type="button" className="sort-button" onClick={() => onToggleSort("label")}>
                    <span>Libellé / Catégorie</span>
                    <span className="sort-indicator">{getSortIndicator("label")}</span>
                  </button>
                </th>
                <th>
                  <span className="th-static">Moyen / Référence</span>
                </th>
                <th aria-sort={getAriaSort("amount")}>
                  <button type="button" className="sort-button align-right" onClick={() => onToggleSort("amount")}>
                    <span>Montant / Solde</span>
                    <span className="sort-indicator">{getSortIndicator("amount")}</span>
                  </button>
                </th>
                <th>Suppression</th>
              </tr>
            </thead>

            <tbody>
              {/* Spacer haut — maintient le scroll position correct */}
              {paddingTop > 0 && (
                <tr style={{ height: paddingTop }}>
                  <td colSpan={5} />
                </tr>
              )}

              {virtualItems.map((virtualRow) => {
                const transaction = filteredTransactions[virtualRow.index];
                const categoryLabel = getCategoryLabel(transaction);
                const isCleared = Boolean(transaction.clearedAt);
                const runningBalance = transaction.runningBalance ?? null;
                const balancePositive = runningBalance !== null && runningBalance >= 0;
                const balanceDirectionUp = transaction.amount >= 0;

                return (
                  <tr
                    key={transaction.id}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    onDoubleClick={() => {
                      savedScrollTopRef.current = scrollRef.current?.scrollTop ?? 0;
                      shouldRestoreScrollRef.current = true;
                      onEditTransaction(transaction);
                    }}
                    className="transaction-row"
                  >
                    <td>
                      <div className="ledger-cell">
                        <div className="ledger-main">{formatDate(transaction.date)}</div>
                        <div className="ledger-sub">
                          <button
                            type="button"
                            className={`status-pill status-pill-toggle ${isCleared ? "is-cleared" : "is-pending"}`}
                            onDoubleClick={(event) => {
                              event.stopPropagation();
                              savedScrollTopRef.current = scrollRef.current?.scrollTop ?? 0;
                              shouldRestoreScrollRef.current = true;
                              onToggleTransactionCleared(transaction);
                            }}
                            title="Double-clique pour changer l'état de pointage"
                          >
                            {isCleared ? "Pointée" : "À pointer"}
                          </button>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="ledger-cell">
                        <div className="ledger-main">{transaction.label}</div>
                        <div className="ledger-sub category-inline">
                          <span
                            className="category-dot"
                            style={{ backgroundColor: transaction.categoryColor || "#94a3b8" }}
                            aria-hidden="true"
                          />
                          <span>{categoryLabel}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="ledger-cell">
                        <div className="ledger-main">
                          {transaction.paymentMethodName || "Moyen à définir"}
                        </div>
                        <div className="ledger-sub muted-italic">
                          {transaction.reference?.trim() || "écriture sans référence"}
                        </div>
                      </div>
                    </td>

                    <td className="amount-balance-cell">
                      <div className="ledger-cell align-end">
                        <div className={transaction.amount >= 0 ? "ledger-main amount-positive" : "ledger-main amount-negative"}>
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </div>
                        <div className={`ledger-sub balance-line ${
                          runningBalance === null ? "" : balancePositive ? "balance-positive" : "balance-negative"
                        }`}>
                          {runningBalance === null ? (
                            <span>—</span>
                          ) : (
                            <>
                              <span className={`balance-arrow ${balanceDirectionUp ? "up" : "down"}`} aria-hidden="true">
                                {balanceDirectionUp ? "▲" : "▼"}
                              </span>
                              <span>{formatCurrency(runningBalance, transaction.currency)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-btn danger-icon-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            savedScrollTopRef.current = scrollRef.current?.scrollTop ?? 0;
                            shouldRestoreScrollRef.current = true;
                            onDeleteTransaction(transaction);
                          }}
                          onDoubleClick={(event) => event.stopPropagation()}
                          title="Supprimer la transaction"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Spacer bas */}
              {paddingBottom > 0 && (
                <tr style={{ height: paddingBottom }}>
                  <td colSpan={5} />
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}