import type { AccountType } from "../../../types";

interface AccountModalProps {
  open: boolean;
  editingAccountId: string | null;
  accountName: string;
  accountType: AccountType;
  currency: string;
  openingBalance: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  setAccountName: (value: string) => void;
  setAccountType: (value: AccountType) => void;
  setCurrency: (value: string) => void;
  setOpeningBalance: (value: string) => void;
}

export function AccountModal({
  open,
  editingAccountId,
  accountName,
  accountType,
  currency,
  openingBalance,
  onClose,
  onSubmit,
  setAccountName,
  setAccountType,
  setCurrency,
  setOpeningBalance,
}: AccountModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
      >
        <div className="modal-header">
          <div>
            <p className="pane-kicker">{editingAccountId ? "Édition" : "Création"}</p>
            <h3 id="account-modal-title">
              {editingAccountId ? "Modifier le compte" : "Nouveau compte"}
            </h3>
          </div>

          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <form className="stack-form" onSubmit={onSubmit}>
          <label>
            Nom du compte
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Compte courant"
              autoFocus
            />
          </label>

          <label>
            Type
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as AccountType)}
            >
              <option value="checking">Compte courant</option>
              <option value="savings">Épargne</option>
              <option value="cash">Espèces</option>
              <option value="credit">Crédit</option>
            </select>
          </label>

          <div className="form-row">
            <label>
              Devise
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="EUR"
              />
            </label>

            <label>
              Solde initial
              <input
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={onClose}>
              Annuler
            </button>

            <button type="submit" className="primary-btn">
              {editingAccountId ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}