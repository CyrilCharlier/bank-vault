type PeriodFilter = "all" | "30d" | "90d" | "year" | "custom";

interface FiltersBarProps {
  searchTerm: string;
  periodFilter: PeriodFilter;
  startDate: string;
  endDate: string;
  onSearchTermChange: (value: string) => void;
  onPeriodFilterChange: (value: PeriodFilter) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClearFilters: () => void;
}

export function FiltersBar({
  searchTerm,
  periodFilter,
  startDate,
  endDate,
  onSearchTermChange,
  onPeriodFilterChange,
  onStartDateChange,
  onEndDateChange,
  onClearFilters,
}: FiltersBarProps) {
  return (
    <div className="filters-bar">
      <div className="search-box compact">
        <label htmlFor="transaction-search" className="sr-only">
          Rechercher
        </label>
        <input
          id="transaction-search"
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          placeholder="Rechercher"
        />
      </div>

      <div className="period-controls enhanced">
        <div className="select-wrap">
          <select
            value={periodFilter}
            onChange={(e) => onPeriodFilterChange(e.target.value as PeriodFilter)}
            aria-label="Choisir une période"
          >
            <option value="all">Toute période</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
            <option value="year">Année en cours</option>
            <option value="custom">Période personnalisée</option>
          </select>
        </div>

        {periodFilter === "custom" && (
          <div className="date-range-group" role="group" aria-label="Filtre de dates">
            <label className="date-field">
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                aria-label="Date de début"
              />
            </label>
            -&gt;
            <label className="date-field">
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                aria-label="Date de fin"
              />
            </label>
          </div>
        )}

        <button className="ghost-btn" onClick={onClearFilters} type="button">
          Réinitialiser
        </button>
      </div>
    </div>
  );
}