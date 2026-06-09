import { useMemo } from "react";
import type {
  Account,
  Category,
  Deadline,
  Transaction,
  PaymentMethod,
} from "../../../types";

type FilterMode = "all" | "account";

type StatisticsPaneProps = {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  deadlines: Deadline[];
  paymentMethods: PaymentMethod[];
  filterMode: FilterMode;
  selectedAccountId: string | null;
  formatCurrency: (value: number) => string;
};

type CategoryStat = {
  id: string;
  name: string;
  color: string;
  amount: number;
  count: number;
};

type UpcomingDeadlineStat = {
  id: string;
  label: string;
  amount: number;
  dateLabel: string;
  accountName: string;
  categoryName: string;
  nextDate: Date;
};

type PaymentMethodStat = {
  id: string;
  name: string;
  amount: number;
  count: number;
};

const FALLBACK_CATEGORY_COLOR = "#5B8DEF";

function clampPercent(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatShortDate(value: Date) {
  return value.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function getNextDeadlineDate(deadline: Deadline, now: Date): Date | null {
  const start = toDate(deadline.startDate);
  const end = deadline.endDate ? toDate(deadline.endDate) : null;

  if (deadline.frequency !== "monthly") {
    return null;
  }

  const year = now.getFullYear();
  const month = now.getMonth();

  const buildCandidate = (y: number, m: number) => {
    const lastDay = new Date(y, m + 1, 0).getDate();
    const day = Math.min(deadline.dayOfMonth, lastDay);
    return new Date(y, m, day);
  };

  let candidate = buildCandidate(year, month);
  if (candidate < now) {
    candidate = buildCandidate(year, month + 1);
  }

  if (candidate < start) {
    candidate = buildCandidate(start.getFullYear(), start.getMonth());
  }

  if (end && candidate > end) {
    return null;
  }

  return candidate;
}

export function StatisticsPane({
  accounts,
  categories,
  transactions,
  deadlines,
  paymentMethods,
  filterMode,
  selectedAccountId,
  formatCurrency,
}: StatisticsPaneProps) {
  const now = new Date();

  const stats = useMemo(() => {
    const effectiveSelectedAccountId =
      filterMode === "account" ? selectedAccountId : null;

    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const paymentMethodMap = new Map(
      paymentMethods.map((method) => [method.id, method])
    );

    const filteredAccounts = effectiveSelectedAccountId
      ? accounts.filter((account) => account.id === effectiveSelectedAccountId)
      : accounts;

    const filteredTransactions = effectiveSelectedAccountId
      ? transactions.filter((tx) => tx.accountId === effectiveSelectedAccountId)
      : transactions;

    const filteredDeadlines = effectiveSelectedAccountId
      ? deadlines.filter((deadline) => deadline.accountId === effectiveSelectedAccountId)
      : deadlines;

    const accountMap = new Map(filteredAccounts.map((account) => [account.id, account]));

    const monthTransactions = filteredTransactions.filter((tx) => {
      const txDate = toDate(tx.date);
      return txDate >= monthStart && txDate <= monthEnd;
    });

    let incomeMonth = 0;
    let expenseMonth = 0;

    for (const tx of monthTransactions) {
      if (tx.amount > 0) {
        incomeMonth += tx.amount;
      } else {
        expenseMonth += Math.abs(tx.amount);
      }
    }

    const netMonth = incomeMonth - expenseMonth;

    const totalBalance = filteredAccounts.reduce(
      (sum, account) => sum + account.currentBalance,
      0
    );

    const totalTransactions = filteredTransactions.length;
    const clearedTransactions = filteredTransactions.filter((tx) => !!tx.clearedAt).length;
    const clearedRate =
      totalTransactions > 0 ? Math.round((clearedTransactions / totalTransactions) * 100) : 0;

    const expenseByCategory = new Map<string, CategoryStat>();
    const expensesByPaymentMethod = new Map<string, PaymentMethodStat>();

    for (const tx of monthTransactions) {
      if (tx.amount >= 0) continue;

      const method = tx.paymentMethodId
        ? paymentMethodMap.get(tx.paymentMethodId)
        : null;

      const methodKey = method?.id ?? "unknown";
      const currentMethod = expensesByPaymentMethod.get(methodKey);

      if (currentMethod) {
        currentMethod.amount += Math.abs(tx.amount);
        currentMethod.count += 1;
      } else {
        expensesByPaymentMethod.set(methodKey, {
          id: methodKey,
          name: method?.name ?? "Non renseigné",
          amount: Math.abs(tx.amount),
          count: 1,
        });
      }

      const category = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
      const categoryKey = category?.id ?? "uncategorized";
      const currentCategory = expenseByCategory.get(categoryKey);

      if (currentCategory) {
        currentCategory.amount += Math.abs(tx.amount);
        currentCategory.count += 1;
      } else {
        expenseByCategory.set(categoryKey, {
          id: categoryKey,
          name: category?.name ?? "Non catégorisé",
          color: category?.color ?? FALLBACK_CATEGORY_COLOR,
          amount: Math.abs(tx.amount),
          count: 1,
        });
      }
    }

    const topPaymentMethods = Array.from(expensesByPaymentMethod.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const topExpenseCategories = Array.from(expenseByCategory.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    const biggestCategoryAmount = topExpenseCategories[0]?.amount ?? 0;

    const upcomingDeadlines: UpcomingDeadlineStat[] = filteredDeadlines
      .map((deadline) => {
        const nextDate = getNextDeadlineDate(deadline, now);
        if (!nextDate) return null;

        const account = accountMap.get(deadline.accountId);
        const category = deadline.categoryId ? categoryMap.get(deadline.categoryId) : null;

        return {
          id: deadline.id,
          label: deadline.label,
          amount: deadline.amount,
          dateLabel: formatShortDate(nextDate),
          accountName: account?.name ?? "Compte inconnu",
          categoryName: category?.name ?? "Non catégorisé",
          nextDate,
        };
      })
      .filter((item): item is UpcomingDeadlineStat => !!item)
      .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())
      .slice(0, 6);

    const selectedAccount = effectiveSelectedAccountId
      ? accounts.find((account) => account.id === effectiveSelectedAccountId) ?? null
      : null;

    const scopeLabel = selectedAccount ? selectedAccount.name : "Tous les comptes";

    return {
      totalBalance,
      incomeMonth,
      expenseMonth,
      netMonth,
      totalTransactions,
      clearedRate,
      topExpenseCategories,
      biggestCategoryAmount,
      upcomingDeadlines,
      topPaymentMethods,
      scopeLabel,
      isFilteredOnAccount: !!selectedAccount,
    };
  }, [
    accounts,
    categories,
    deadlines,
    filterMode,
    paymentMethods,
    selectedAccountId,
    transactions,
  ]);

  return (
    <section className="statistics-pane">
      <div className="statistics-pane__header">
        <div>
          <h1 className="statistics-pane__title">Statistiques {stats.scopeLabel}</h1>
          <p className="statistics-pane__subtitle">
            Vue synthétique de tes soldes, flux du mois et postes de dépense.
          </p>
        </div>

        <div className="statistics-pane__meta">
          <div className="statistics-pill">
            <span className="statistics-pill__label">Transactions</span>
            <strong>{stats.totalTransactions}</strong>
          </div>
          <div className="statistics-pill">
            <span className="statistics-pill__label">Pointées</span>
            <strong>{stats.clearedRate}%</strong>
          </div>
        </div>
      </div>

      <div className="statistics-kpis">
        <article className="statistics-card statistics-kpi">
          <span className="statistics-kpi__label">Solde total</span>
          <strong className="statistics-kpi__value">
            {formatCurrency(stats.totalBalance)}
          </strong>
          <span className="statistics-kpi__hint">
            {stats.isFilteredOnAccount
              ? "Solde actuel du compte sélectionné"
              : "Somme des soldes actuels des comptes"}
          </span>
        </article>

        <article className="statistics-card statistics-kpi">
          <span className="statistics-kpi__label">Entrées du mois</span>
          <strong className="statistics-kpi__value statistics-kpi__value--positive">
            {formatCurrency(stats.incomeMonth)}
          </strong>
          <span className="statistics-kpi__hint">
            Transactions positives du mois courant
          </span>
        </article>

        <article className="statistics-card statistics-kpi">
          <span className="statistics-kpi__label">Sorties du mois</span>
          <strong className="statistics-kpi__value statistics-kpi__value--negative">
            {formatCurrency(stats.expenseMonth)}
          </strong>
          <span className="statistics-kpi__hint">
            Transactions négatives du mois courant
          </span>
        </article>

        <article className="statistics-card statistics-kpi">
          <span className="statistics-kpi__label">Net du mois</span>
          <strong
            className={[
              "statistics-kpi__value",
              stats.netMonth >= 0
                ? "statistics-kpi__value--positive"
                : "statistics-kpi__value--negative",
            ].join(" ")}
          >
            {formatCurrency(stats.netMonth)}
          </strong>
          <span className="statistics-kpi__hint">
            Entrées moins sorties sur le mois
          </span>
        </article>
      </div>

      <div className="statistics-grid">
        <article className="statistics-card">
          <div className="statistics-card__header">
            <div>
              <p className="statistics-card__eyebrow">MOYENS DE PAIEMENT</p>
              <h2 className="statistics-card__title">Dépenses par moyen</h2>
            </div>
          </div>

          {stats.topPaymentMethods.length === 0 ? (
            <p className="statistics-empty">Aucune dépense sur le mois courant.</p>
          ) : (
            <div className="statistics-table">
              <div className="statistics-table__head">
                <span>Moyen</span>
                <span>Opérations</span>
                <span>Montant</span>
              </div>

              <div className="statistics-table__body">
                {stats.topPaymentMethods.map((method) => (
                  <div key={method.id} className="statistics-table__row">
                    <span className="statistics-table__cell">{method.name}</span>
                    <span className="statistics-table__cell">{method.count}</span>
                    <span className="statistics-table__cell statistics-table__cell--amount">
                      {formatCurrency(method.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        <article className="statistics-card">
          <div className="statistics-card__header">
            <div>
              <p className="statistics-card__eyebrow">DÉPENSES</p>
              <h2 className="statistics-card__title">Top catégories du mois</h2>
            </div>
          </div>

          <div className="statistics-bars">
            {stats.topExpenseCategories.length === 0 ? (
              <p className="statistics-empty">Aucune dépense sur le mois courant.</p>
            ) : (
              stats.topExpenseCategories.map((category) => {
                const width =
                  stats.biggestCategoryAmount > 0
                    ? clampPercent((category.amount / stats.biggestCategoryAmount) * 100)
                    : 0;

                return (
                  <div key={category.id} className="statistics-bars__row">
                    <div className="statistics-bars__topline">
                      <span className="statistics-bars__label statistics-bars__label--with-dot">
                        <span
                          className="statistics-dot"
                          style={{ background: category.color || FALLBACK_CATEGORY_COLOR }}
                        />
                        {category.name}
                      </span>
                      <span className="statistics-bars__value">
                        {formatCurrency(category.amount)}
                      </span>
                    </div>

                    <div className="statistics-bars__track">
                      <div
                        className="statistics-bars__fill"
                        style={{
                          width: `${width}%`,
                          background: category.color || FALLBACK_CATEGORY_COLOR,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <article className="statistics-card">
          <div className="statistics-card__header">
            <div>
              <p className="statistics-card__eyebrow">POSTES PRINCIPAUX</p>
              <h2 className="statistics-card__title">Catégories les plus dépensières</h2>
            </div>
          </div>

          {stats.topExpenseCategories.length === 0 ? (
            <p className="statistics-empty">Aucune donnée à afficher.</p>
          ) : (
            <div className="statistics-table">
              <div className="statistics-table__head">
                <span>Catégorie</span>
                <span>Opérations</span>
                <span>Montant</span>
              </div>

              <div className="statistics-table__body">
                {stats.topExpenseCategories.map((category) => (
                  <div key={category.id} className="statistics-table__row">
                    <span className="statistics-table__cell statistics-table__cell--label">
                      <span
                        className="statistics-dot"
                        style={{ background: category.color || FALLBACK_CATEGORY_COLOR }}
                      />
                      {category.name}
                    </span>
                    <span className="statistics-table__cell">{category.count}</span>
                    <span className="statistics-table__cell statistics-table__cell--amount">
                      {formatCurrency(category.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        <article className="statistics-card">
          <div className="statistics-card__header">
            <div>
              <p className="statistics-card__eyebrow">ÉCHÉANCES</p>
              <h2 className="statistics-card__title">À venir</h2>
            </div>
          </div>

          {stats.upcomingDeadlines.length === 0 ? (
            <p className="statistics-empty">Aucune échéance mensuelle à venir.</p>
          ) : (
            <div className="statistics-table">
              <div className="statistics-table__head">
                <span>Libellé</span>
                <span>Date</span>
                <span>Montant</span>
              </div>

              <div className="statistics-table__body">
                {stats.upcomingDeadlines.map((deadline) => (
                  <div key={deadline.id} className="statistics-table__row">
                    <div className="statistics-table__cell statistics-table__cell--stack">
                      <strong>{deadline.label}</strong>
                      <small>
                        {deadline.accountName} · {deadline.categoryName}
                      </small>
                    </div>
                    <span className="statistics-table__cell">{deadline.dateLabel}</span>
                    <span className="statistics-table__cell statistics-table__cell--amount">
                      {formatCurrency(deadline.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}