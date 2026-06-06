import { useEffect, useState } from "react";
import type { Account, Deadline, TransactionView } from "../../../types";

interface AccountsPaneProps {
  accounts: Account[];
  transactions: TransactionView[];
  deadlines: Deadline[];
  loading: boolean;
  selectedAccountId: string | null;
  onSelectAccount: (id: string) => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (account: Account) => void;
  onImportAccount: (account: Account) => void;
  formatAccountType: (type: Account["type"]) => string;
  formatCurrency: (amount: number, currency?: string) => string;
}

function sumAmounts(transactions: TransactionView[]) {
  return transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
}

export function AccountsPane({
  accounts,
  transactions,
  deadlines,
  loading,
  selectedAccountId,
  onSelectAccount,
  onEditAccount,
  onDeleteAccount,
  onImportAccount,
  formatCurrency,
}: AccountsPaneProps){
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuId) return;

    const handleClickOutside = () => {
      setOpenMenuId(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenuId]);

  function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function endOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  function monthKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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

  function getRemainingMonthlyDeadlineAmount(
    deadlines: Deadline[],
    accountId: string,
    selectedMonth: Date
  ) {
    return deadlines
      .filter((deadline) => deadline.accountId === accountId)
      .filter((deadline) => occursInMonth(deadline, selectedMonth))
      .filter((deadline) => !wasAppliedThisMonth(deadline, selectedMonth))
      .reduce((sum, deadline) => sum - Math.abs(deadline.amount), 0);
  }

  return (
    <aside className="accounts-pane">
      <div className="pane-header">
        <div>
          <p className="pane-kicker">Comptes</p>
          <h2>Banques & soldes</h2>
        </div>
        <span className="pane-badge">{accounts.length}</span>
      </div>

      <div className="accounts-list">
        {loading ? (
          <p className="empty-state">Chargement des comptes…</p>
        ) : accounts.length === 0 ? (
          <p className="empty-state">Aucun compte pour le moment.</p>
        ) : (

          accounts.map((account) => {
            const accountTransactions = transactions.filter(
              (transaction) => transaction.accountId === account.id
            );

            const clearedTransactions = accountTransactions.filter(
              (transaction) => Boolean(transaction.clearedAt)
            );
            const unclearedTransactions = accountTransactions.filter(
              (transaction) => !transaction.clearedAt
            );

            const currentMonth = new Date();

            const remainingDeadlinesAmount = getRemainingMonthlyDeadlineAmount(
              deadlines,
              account.id,
              currentMonth
            );

            const clearedAmount = sumAmounts(clearedTransactions);
            const forecastAmount = sumAmounts(accountTransactions);
            const upcomingEntries =
              sumAmounts(unclearedTransactions) + remainingDeadlinesAmount;

            const currentBalance = account.openingBalance + clearedAmount;
            const forecastBalance =
              account.openingBalance + forecastAmount + remainingDeadlinesAmount;

            return (
              <div
                key={account.id}
                className={
                  selectedAccountId === account.id
                    ? "account-card active"
                    : "account-card"
                }
              >
                <button
                  className="account-select-btn"
                  onClick={() => onSelectAccount(account.id)}
                  type="button"
                >
                  <div className="account-card-top">
                    <div>
                      <p className="account-name">{account.name}</p>
                    </div>

                    <div className="account-menu-wrapper">
                      <button
                        className="account-menu-trigger"
                        type="button"
                        aria-label="Options du compte"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenuId(
                            openMenuId === account.id ? null : account.id
                          );
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                        >
                          <circle cx="8" cy="3" r="1.5" />
                          <circle cx="8" cy="8" r="1.5" />
                          <circle cx="8" cy="13" r="1.5" />
                        </svg>
                      </button>

                      {openMenuId === account.id && (
                        <div className="account-dropdown">
                          <button
                            className="dropdown-item"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onImportAccount(account);
                              setOpenMenuId(null);
                            }}
                          >
                            Importer un TSV
                          </button>
                          <button
                            className="dropdown-item"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEditAccount(account);
                              setOpenMenuId(null);
                            }}
                          >
                            Modifier
                          </button>
                          <button
                            className="dropdown-item danger"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteAccount(account);
                              setOpenMenuId(null);
                            }}
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="account-totals-row">
                    <div className="account-total-chip is-current">
                      <p className="account-total-label">Actuel</p>
                      <p className="account-total-value highlight">
                        {formatCurrency(currentBalance, account.currency)}
                      </p>
                    </div>

                    <div className="account-total-chip is-forecast">
                      <p className="account-total-label">Prévision</p>
                      <p className="account-total-value">
                        {formatCurrency(forecastBalance, account.currency)}
                      </p>
                    </div>

                    <div className="account-total-chip is-upcoming">
                      <p className="account-total-label">À venir</p>
                      <p
                        className={`account-total-value ${
                          upcomingEntries < 0 ? "negative" : upcomingEntries > 0 ? "positive" : "subtle"
                        }`}
                      >
                        {formatCurrency(upcomingEntries, account.currency)}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}