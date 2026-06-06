import { useEffect, useMemo, useState } from "react";
import type { PaymentMethod, PaymentMethodKind } from "../../../types";

interface PaymentMethodsModalProps {
  open: boolean;
  paymentMethods: PaymentMethod[];
  onClose: () => void;
  onCreate: (input: {
    name: string;
    kind: PaymentMethodKind;
  }) => Promise<void>;
  onUpdate: (input: {
    id: string;
    name: string;
    kind: PaymentMethodKind;
  }) => Promise<void>;
  onDelete: (paymentMethod: PaymentMethod) => Promise<void>;
}

const PAYMENT_METHOD_KIND_OPTIONS: Array<{
  value: PaymentMethodKind;
  label: string;
}> = [
  { value: "card", label: "Carte" },
  { value: "cash", label: "Espèces" },
  { value: "transfer", label: "Virement" },
  { value: "direct_debit", label: "Prélèvement" },
  { value: "cheque", label: "Chèque" },
  { value: "internal", label: "Interne" },
  { value: "other", label: "Autre" },
];

function getKindLabel(kind: PaymentMethodKind) {
  return (
    PAYMENT_METHOD_KIND_OPTIONS.find((option) => option.value === kind)?.label ??
    kind
  );
}

export function PaymentMethodsModal({
  open,
  paymentMethods,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: PaymentMethodsModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<PaymentMethodKind>("card");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sortedPaymentMethods = useMemo(
    () =>
      [...paymentMethods].sort((a, b) =>
        a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
      ),
    [paymentMethods]
  );

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setKind("card");
    setError("");
    setSubmitting(false);
  }

  function startEdit(paymentMethod: PaymentMethod) {
    setEditingId(paymentMethod.id);
    setName(paymentMethod.name);
    setKind(paymentMethod.kind);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Le nom du moyen de paiement est obligatoire.");
      return;
    }

    const duplicate = paymentMethods.find(
      (item) =>
        item.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        item.id !== editingId
    );

    if (duplicate) {
      setError("Un moyen de paiement avec ce nom existe déjà.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (editingId) {
        await onUpdate({
          id: editingId,
          name: trimmedName,
          kind,
        });
      } else {
        await onCreate({
          name: trimmedName,
          kind,
        });
      }

      resetForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de l'enregistrement."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(paymentMethod: PaymentMethod) {
    setError("");

    try {
      await onDelete(paymentMethod);

      if (editingId === paymentMethod.id) {
        resetForm();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de la suppression."
      );
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card wide categories-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-methods-modal-title"
      >
        <div className="modal-header">
          <div>
            <p className="pane-kicker">Référentiel</p>
            <h3 id="payment-methods-modal-title">Moyens de paiement</h3>
          </div>

          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="categories-layout">
          <form className="stack-form" onSubmit={handleSubmit}>
            <label>
              Nom
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Carte bancaire, Virement SEPA..."
                autoFocus
              />
            </label>

            <label>
              Type
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as PaymentMethodKind)}
              >
                {PAYMENT_METHOD_KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <div className="modal-actions">
              {editingId ? (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Annuler l’édition
                </button>
              ) : null}

              <button type="submit" className="primary-btn" disabled={submitting}>
                {editingId ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </form>

          <div className="categories-list" aria-label="Liste des moyens de paiement">
            {sortedPaymentMethods.length === 0 ? (
              <p className="empty-state">
                Aucun moyen de paiement enregistré pour le moment.
              </p>
            ) : (
              sortedPaymentMethods.map((paymentMethod) => (
                <div key={paymentMethod.id} className="category-row">
                  <div className="category-main">
                    <div className="ledger-cell">
                      <span className="ledger-main">{paymentMethod.name}</span>
                      <span className="ledger-sub">
                        {getKindLabel(paymentMethod.kind)} ·{" "}
                        {paymentMethod.usageCount ?? 0} utilisation(s)
                      </span>
                    </div>
                  </div>

                  <div className="category-actions">
                    <button
                      type="button"
                      className="ghost-btn small"
                      onClick={() => startEdit(paymentMethod)}
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      className="danger-btn small"
                      onClick={() => void handleDelete(paymentMethod)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}