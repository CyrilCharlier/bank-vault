import type { Account, Category, DeadlineFrequency } from "../../../types";

type DeadlineModalProps = {
  open: boolean;
  title: string;
  accounts: Account[];
  categories: Category[];
  label: string;
  amount: string;
  currency: string;
  accountId: string;
  categoryId: string;
  frequency: DeadlineFrequency;
  dayOfMonth: string;
  startDate: string;
  endDate: string;
  notes: string;
  autoCreateTransaction: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  setLabel: (value: string) => void;
  setAmount: (value: string) => void;
  setCurrency: (value: string) => void;
  setAccountId: (value: string) => void;
  setCategoryId: (value: string) => void;
  setFrequency: (value: DeadlineFrequency) => void;
  setDayOfMonth: (value: string) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setNotes: (value: string) => void;
  setAutoCreateTransaction: (value: boolean) => void;
};

export default function DeadlineModal({
  open,
  title,
  accounts,
  categories,
  label,
  amount,
  currency,
  accountId,
  categoryId,
  frequency,
  dayOfMonth,
  startDate,
  endDate,
  notes,
  onClose,
  onSubmit,
  setLabel,
  setAmount,
  setCurrency,
  setAccountId,
  setCategoryId,
  setFrequency,
  setDayOfMonth,
  setStartDate,
  setEndDate,
  setNotes,
}: DeadlineModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card deadline-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header deadline-modal__header">
          <div>
            <p className="modal-eyebrow">Échéances</p>
            <h2>{title}</h2>
            <p className="deadline-modal-subtitle">
              Définis le rythme, le compte associé et la période d’application de
              cette échéance.
            </p>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <form className="deadline-modal__form" onSubmit={onSubmit}>
          <div className="deadline-modal__body">
            <div className="deadline-form-grid deadline-form-grid--identity">
              <label className="field deadline-field deadline-field--label">
                <span>Libellé</span>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex. Loyer"
                  required
                />
              </label>

              <label className="field deadline-field deadline-field--amount">
                <span>Montant</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  required
                />
              </label>

              <label className="field deadline-field deadline-field--currency">
                <span>Devise</span>
                <input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  maxLength={3}
                  placeholder="EUR"
                  required
                />
              </label>
            </div>

            <div className="deadline-form-grid deadline-form-grid--details">
              <label className="field deadline-field">
                <span>Compte</span>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                >
                  <option value="">Sélectionner un compte</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field deadline-field">
                <span>Catégorie</span>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Aucune</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field deadline-field">
                <span>Fréquence</span>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as DeadlineFrequency)}
                >
                  <option value="monthly">Mensuelle</option>
                  <option value="quarterly">Trimestrielle</option>
                  <option value="annual">Annuelle</option>
                </select>
              </label>
            </div>

            <div className="deadline-form-grid deadline-form-grid--dates">
              <label className="field deadline-field deadline-field--day">
                <span>Jour du mois</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  required
                />
              </label>

              <label className="field deadline-field">
                <span>Date de début</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onKeyDown={(e) => e.preventDefault()}
                  required
                />
              </label>

              <label className="field deadline-field">
                <span>Date de fin</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onKeyDown={(e) => e.preventDefault()}
                />
              </label>
            </div>

            <label className="field deadline-field deadline-field--notes">
              <span>Notes</span>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex. Appartement, contrat annuel, échéance bancaire…"
              />
            </label>
          </div>

          <div className="modal-actions deadline-modal__footer">
            <button
              type="button"
              className="toolbar-secondary-btn"
              onClick={onClose}
            >
              Annuler
            </button>
            <button type="submit" className="toolbar-cta">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}