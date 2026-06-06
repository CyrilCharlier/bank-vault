import { useEffect, useMemo, useState } from "react";
import type { Category } from "../../../types";

interface CategoriesModalProps {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onCreate: (input: { name: string; color?: string | null }) => Promise<void>;
  onUpdate: (input: { id: string; name: string; color?: string | null }) => Promise<void>;
  onDelete: (category: Category) => Promise<void>;
}

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
];

const DEFAULT_COLOR = "#94a3b8";

function normalizeColor(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

export function CategoriesModal({
  open,
  categories,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: CategoriesModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const editingCategory = useMemo(
    () => categories.find((category) => category.id === editingId) ?? null,
    [categories, editingId]
  );

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setName("");
      setColor(DEFAULT_COLOR);
      setError("");
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!editingCategory) return;
    setName(editingCategory.name);
    setColor(editingCategory.color ?? DEFAULT_COLOR);
  }, [editingCategory]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const normalizedColor = normalizeColor(color);

    if (!trimmedName) {
      setError("Le nom de la catégorie est obligatoire.");
      return;
    }

    try {
      setBusy(true);

      if (editingCategory) {
        await onUpdate({
          id: editingCategory.id,
          name: trimmedName,
          color: normalizedColor || null,
        });
      } else {
        await onCreate({
          name: trimmedName,
          color: normalizedColor || null,
        });
      }

      setEditingId(null);
      setName("");
      setColor(DEFAULT_COLOR);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(category: Category) {
    setError("");

    try {
      setBusy(true);
      await onDelete(category);

      if (editingId === category.id) {
        setEditingId(null);
        setName("");
        setColor(DEFAULT_COLOR);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setName(category.name);
    setColor(category.color ?? DEFAULT_COLOR);
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setColor(DEFAULT_COLOR);
    setError("");
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card wide categories-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="categories-modal-title"
      >
        <div className="modal-header">
          <div>
            <p className="pane-kicker">Paramétrage</p>
            <h3 id="categories-modal-title">Gestion des catégories</h3>
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
                placeholder="Alimentation"
                autoFocus
              />
            </label>

            <div className="color-field">
              <label htmlFor="category-color-picker">Couleur</label>

              <div className="color-input-row">
                <input
                  id="category-color-picker"
                  type="color"
                  value={normalizeColor(color) || DEFAULT_COLOR}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label="Choisir une couleur"
                />

                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(normalizeColor(e.target.value))}
                  placeholder="#22c55e"
                />

                <div
                  className="category-color-preview"
                  style={{
                    backgroundColor: normalizeColor(color) || DEFAULT_COLOR,
                  }}
                  aria-label={`Aperçu de la couleur ${normalizeColor(color) || DEFAULT_COLOR}`}
                />
              </div>

              <div className="color-swatches" role="list" aria-label="Couleurs suggérées">
                {PRESET_COLORS.map((preset) => {
                  const isActive =
                    (normalizeColor(color) || DEFAULT_COLOR).toLowerCase() ===
                    preset.toLowerCase();

                  return (
                    <button
                      key={preset}
                      type="button"
                      className={`color-swatch ${isActive ? "active" : ""}`}
                      style={{ backgroundColor: preset }}
                      onClick={() => setColor(preset)}
                      aria-label={`Choisir la couleur ${preset}`}
                      aria-pressed={isActive}
                    />
                  );
                })}
              </div>
            </div>

            {error ? <p className="form-error">{error}</p> : null}

            <div className="modal-actions">
              {editingCategory ? (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={resetForm}
                  disabled={busy}
                >
                  Annuler l’édition
                </button>
              ) : (
                <span />
              )}

              <button type="submit" className="primary-btn" disabled={busy}>
                {editingCategory ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </form>

          <div className="categories-list">
            {categories.length === 0 ? (
              <p className="empty-hint">Aucune catégorie pour le moment.</p>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="category-row">
                  <div className="category-main">
                    <div
                      className="category-color"
                      style={{ backgroundColor: category.color || DEFAULT_COLOR }}
                      aria-hidden="true"
                    />
                    <div>
                      <strong>{category.name}</strong>
                      <p className="muted-text">
                        {category.usageCount ?? 0} utilisation
                        {(category.usageCount ?? 0) > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="category-actions">
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => startEdit(category)}
                      disabled={busy}
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => handleDelete(category)}
                      disabled={busy}
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