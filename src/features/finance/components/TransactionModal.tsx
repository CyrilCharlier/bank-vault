import type { Account, Category, PaymentMethod } from "../../../types";

interface TransactionModalProps {
  open: boolean;
  editingTransactionId: string | null;
  accounts: Account[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  transactionAccountId: string;
  transactionDate: string;
  transactionAmount: string;
  transactionLabel: string;
  transactionCategoryId: string;
  transactionClearedAt: string;
  transactionReference: string;
  transactionPaymentMethodId: string;
  transactionNotes: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onOpenCategoriesManager: () => void;
  onOpenPaymentMethodsManager: () => void;
  setTransactionAccountId: (value: string) => void;
  setTransactionDate: (value: string) => void;
  setTransactionAmount: (value: string) => void;
  setTransactionLabel: (value: string) => void;
  setTransactionCategoryId: (value: string) => void;
  setTransactionClearedAt: (value: string) => void;
  setTransactionReference: (value: string) => void;
  setTransactionPaymentMethodId: (value: string) => void;
  setTransactionNotes: (value: string) => void;
}

export function TransactionModal({
  open,
  editingTransactionId,
  accounts,
  categories,
  paymentMethods,
  transactionAccountId,
  transactionDate,
  transactionAmount,
  transactionLabel,
  transactionCategoryId,
  transactionClearedAt,
  transactionReference,
  transactionPaymentMethodId,
  transactionNotes,
  onClose,
  onSubmit,
  onOpenCategoriesManager,
  onOpenPaymentMethodsManager,
  setTransactionAccountId,
  setTransactionDate,
  setTransactionAmount,
  setTransactionLabel,
  setTransactionCategoryId,
  setTransactionClearedAt,
  setTransactionReference,
  setTransactionPaymentMethodId,
  setTransactionNotes,
}: TransactionModalProps) {
  if (!open) return null;

  const isCleared = transactionClearedAt.trim() !== "";

  function getToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function handleClearedToggle() {
    if (isCleared) {
      setTransactionClearedAt("");
      return;
    }

    setTransactionClearedAt(getToday());
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-modal-title"
      >
        <div className="modal-header">
          <div>
            <p className="pane-kicker">
              {editingTransactionId ? "Édition" : "Création"}
            </p>
            <h3 id="transaction-modal-title">
              {editingTransactionId
                ? "Modifier la transaction"
                : "Nouvelle transaction"}
            </h3>
          </div>

          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <form className="stack-form" onSubmit={onSubmit}>
          <div className="form-row">
            <label>
              Compte
              <select
                value={transactionAccountId}
                onChange={(e) => setTransactionAccountId(e.target.value)}
                autoFocus
              >
                <option value="">Sélectionner un compte</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Date
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Montant
              <input
                type="number"
                step="0.01"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                placeholder="-42.50 ou 1500"
              />
            </label>

            <div className="label-with-action">
              <label>
                Catégorie
                <select
                  value={transactionCategoryId}
                  onChange={(e) => setTransactionCategoryId(e.target.value)}
                >
                  <option value="">Aucune catégorie</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="ghost-btn inline-action"
                onClick={onOpenCategoriesManager}
              >
                Gérer
              </button>
            </div>
          </div>

          <label>
            Libellé
            <input
              type="text"
              value={transactionLabel}
              onChange={(e) => setTransactionLabel(e.target.value)}
              placeholder="Courses, salaire, loyer..."
            />
          </label>

          <div className="form-row align-start">
            <div className="label-with-action">
              <label>
                Moyen de paiement
                <select
                  value={transactionPaymentMethodId}
                  onChange={(e) => setTransactionPaymentMethodId(e.target.value)}
                >
                  <option value="">Non renseigné</option>
                  {paymentMethods.map((paymentMethod) => (
                    <option key={paymentMethod.id} value={paymentMethod.id}>
                      {paymentMethod.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="ghost-btn inline-action"
                onClick={onOpenPaymentMethodsManager}
              >
                Gérer
              </button>
            </div>

            <div className="cleared-field-wrap">
              <span className="cleared-field-label">Pointage</span>

                <div
                  className={`cleared-field ${isCleared ? "is-active" : "is-inactive"}`}
                >
                  <button
                    type="button"
                    className={`cleared-indicator ${isCleared ? "is-active" : "is-inactive"}`}
                    onClick={handleClearedToggle}
                    aria-pressed={isCleared}
                    aria-label={
                      isCleared
                        ? "Désactiver le pointage"
                        : "Activer le pointage"
                    }
                    title={isCleared ? "Désactiver le pointage" : "Activer le pointage"}
                  >
                    {isCleared ? "✓" : ""}
                  </button>

                  <input
                    className={`cleared-date-input ${isCleared ? "is-active" : "is-inactive"}`}
                    type={isCleared ? "date" : "text"}
                    value={isCleared ? transactionClearedAt : ""}
                    onChange={(e) => setTransactionClearedAt(e.target.value)}
                    placeholder="Non pointée"
                    readOnly={!isCleared}
                    aria-label="Date de pointage"
                  />

                  <button
                    type="button"
                    className="cleared-calendar-btn"
                    onClick={() => {
                      if (!isCleared) {
                        setTransactionClearedAt(getToday());
                      }
                    }}
                    aria-label="Activer le pointage"
                    title="Activer le pointage"
                  >
                  </button>
                </div>
            </div>
          </div>

          <div className="form-row">
            <label>
              Référence
              <input
                type="text"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                placeholder="CAPTUR, CHQ123, VIR..."
              />
            </label>

            <label>
              Notes
              <input
                type="text"
                value={transactionNotes}
                onChange={(e) => setTransactionNotes(e.target.value)}
                placeholder="Optionnel"
              />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={onClose}>
              Annuler
            </button>

            <button type="submit" className="primary-btn">
              {editingTransactionId ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}