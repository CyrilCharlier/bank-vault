interface CategoryPaneProps {
  topCategories: [string, number][];
  currency: string;
  formatCurrency: (amount: number, currency?: string) => string;
}

export function CategoryPane({
  topCategories,
  currency,
  formatCurrency,
}: CategoryPaneProps) {
  return (
    <aside className="category-pane">
      <div className="category-pane-header">
        <p className="pane-kicker">Catégories</p>
        <h3>Sorties principales</h3>
      </div>

      {topCategories.length === 0 ? (
        <p className="empty-state">Aucune dépense sur cette sélection.</p>
      ) : (
        <div className="category-list">
          {topCategories.map(([category, amount]) => {
            const max = topCategories[0]?.[1] ?? 1;
            const percent = Math.max(8, Math.round((amount / max) * 100));

            return (
              <div key={category} className="category-item">
                <div className="category-row">
                  <span>{category}</span>
                  <strong>{formatCurrency(amount, currency)}</strong>
                </div>
                <div className="category-bar">
                  <div
                    className="category-bar-fill"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}