interface KpiGridProps {
  netFlow: number;
  topCategoryName?: string;
  topCategoryAmount?: number;
  transactionCount: number;
  currency: string;
  formatCurrency: (amount: number, currency?: string) => string;
}

export function KpiGrid({
  netFlow,
  topCategoryName,
  topCategoryAmount,
  transactionCount,
  currency,
  formatCurrency,
}: KpiGridProps) {
  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Flux net</span>
          <strong className={netFlow >= 0 ? "positive" : "negative"}>
            {formatCurrency(netFlow, currency)}
          </strong>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Transactions visibles</span>
          <strong>{transactionCount}</strong>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Top catégorie</span>
          <strong>{topCategoryName ?? "—"}</strong>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Montant top catégorie</span>
          <strong>
            {topCategoryAmount ? formatCurrency(topCategoryAmount, currency) : "—"}
          </strong>
        </div>
      </div>
    </>
  );
}