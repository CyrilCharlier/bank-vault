import "./styles/index.css";
import { useEffect, useRef, useState } from "react";
import type {
  Account,
  AccountType,
  NewAccount,
  Transaction,
  TransactionView,
  Category,
  PaymentMethod,
  PaymentMethodKind,
  Deadline,
  DeadlineFrequency,
} from "./types";
import { AccountsPane } from "./features/finance/components/AccountsPane";
import { DeadlinesPane } from "./features/finance/components/DeadlinesPane";
import { TransactionsPane } from "./features/finance/components/TransactionsPane";
import { AccountModal } from "./features/finance/components/AccountModal";
import { TransactionModal } from "./features/finance/components/TransactionModal";
import { ConfirmDeleteModal } from "./features/finance/components/ConfirmDeleteModal";
import { CategoriesModal } from "./features/finance/components/CategoriesModal";
import { PaymentMethodsModal } from "./features/finance/components/PaymentMethodsModal";
import { BudgetModal } from "./features/finance/components/BudgetModal";
import { useFinanceData } from "./features/finance/hooks/useFinanceData";
import { useTransactionFilters } from "./features/finance/hooks/useTransactionFilters";
import { BudgetPane } from "./features/finance/components/BudgetPane";
import DeadlineModal from "./features/finance/components/DeadlineModal";
import {
  formatAccountType,
  formatCurrency,
  formatDate,
} from "./features/finance/utils/format";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listPaymentMethods,
  createTransaction,
  markDeadlineApplied,
  deleteTransaction,
  clearDeadlineApplied,
} from "./db";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";

type FilterMode = "all" | "account";
type MessageType = "success" | "error" | "info";
type MainView = "transactions" | "budget" | "deadlines";

function App() {
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("info");

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [mainView, setMainView] = useState<MainView>("transactions");

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showPaymentMethodsModal, setShowPaymentMethodsModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showDeleteTransactionModal, setShowDeleteTransactionModal] = useState(false);
  const [budgetRefreshKey, setBudgetRefreshKey] = useState(0);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
  const [deadlineToDelete, setDeadlineToDelete] = useState<Deadline | null>(null);

  const [deadlineLabel, setDeadlineLabel] = useState("");
  const [deadlineAmount, setDeadlineAmount] = useState("");
  const [deadlineCurrency, setDeadlineCurrency] = useState("EUR");
  const [deadlineAccountId, setDeadlineAccountId] = useState("");
  const [deadlineCategoryId, setDeadlineCategoryId] = useState("");
  const [deadlineFrequency, setDeadlineFrequency] =
    useState<DeadlineFrequency>("monthly");
  const [deadlineDayOfMonth, setDeadlineDayOfMonth] = useState("1");
  const [deadlineStartDate, setDeadlineStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [deadlineEndDate, setDeadlineEndDate] = useState("");
  const [deadlineNotes, setDeadlineNotes] = useState("");
  const [deadlineAutoCreateTransaction, setDeadlineAutoCreateTransaction] =
    useState(true);

  const [selectedBudgetYear, setSelectedBudgetYear] = useState(
    new Date().getFullYear()
  );
  const [selectedBudgetCategoryId, setSelectedBudgetCategoryId] = useState<string | null>(null);

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(
    null
  );

  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [transactionToDelete, setTransactionToDelete] =
    useState<TransactionView | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);

  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("checking");
  const [currency, setCurrency] = useState("EUR");
  const [openingBalance, setOpeningBalance] = useState("0");

  const [transactionAccountId, setTransactionAccountId] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionLabel, setTransactionLabel] = useState("");
  const [transactionCategoryId, setTransactionCategoryId] = useState("");
  const [transactionNotes, setTransactionNotes] = useState("");
  const [transactionClearedAt, setTransactionClearedAt] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [transactionPaymentMethodId, setTransactionPaymentMethodId] = useState("");

  const [showBudgetModal, setShowBudgetModal] = useState(false);

  const {
    accounts,
    transactions,
    paymentMethods,
    deadlines,
    loading,
    reloadData,
    createAccountAndReload,
    updateAccountAndReload,
    deleteAccountAndReload,
    createTransactionAndReload,
    updateTransactionAndReload,
    deleteTransactionAndReload,
    createPaymentMethodAndReload,
    updatePaymentMethodAndReload,
    deletePaymentMethodAndReload,
    createDeadlineAndReload,
    updateDeadlineAndReload,
    deleteDeadlineAndReload,
  } = useFinanceData({
    selectedAccountId,
    transactionAccountId,
    onSelectedAccountChange: setSelectedAccountId,
    onTransactionAccountChange: setTransactionAccountId,
    onSuccess: (text) => {
      setMessage(text);
      setMessageType("success");
    },
    onError: (text) => {
      setMessage(text);
      setMessageType("error");
    },
  });

  const {
    searchTerm,
    setSearchTerm,
    periodFilter,
    setPeriodFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    sortField,
    sortDirection,
    toggleSort,
    getAriaSort,
    getSortIndicator,
    clearFilters,
    filteredTransactions,
  } = useTransactionFilters({
    accounts,
    transactions,
    selectedAccountId,
    filterMode,
  });

  const [showManageMenu, setShowManageMenu] = useState(false);
  const manageMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!manageMenuRef.current) return;
      if (!manageMenuRef.current.contains(event.target as Node)) {
        setShowManageMenu(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowManageMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (showDeleteTransactionModal) {
        setShowDeleteTransactionModal(false);
        return;
      }

      if (showDeleteAccountModal) {
        setShowDeleteAccountModal(false);
        return;
      }

      if (showPaymentMethodsModal) {
        setShowPaymentMethodsModal(false);
        return;
      }

      if (showCategoriesModal) {
        setShowCategoriesModal(false);
        return;
      }

      if (showTransactionModal) {
        setShowTransactionModal(false);
        return;
      }

      if (showAccountModal) {
        setShowAccountModal(false);
        return;
      }

      if (showDeadlineModal) {
        setShowDeadlineModal(false);
        return;
      }

      if (deadlineToDelete) {
        setDeadlineToDelete(null);
        return;
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [
    showAccountModal,
    showTransactionModal,
    showCategoriesModal,
    showPaymentMethodsModal,
    showDeleteAccountModal,
    showDeleteTransactionModal,
    showDeadlineModal,
    deadlineToDelete,
  ]);

  async function loadCategories() {
    try {
      const data = await listCategories();
      setCategories(data);
    } catch {
      setMessage("Impossible de charger les catégories.");
      setMessageType("error");
    }
  }

  function resetAccountForm() {
    setEditingAccountId(null);
    setAccountName("");
    setAccountType("checking");
    setCurrency("EUR");
    setOpeningBalance("0");
  }

  function resetTransactionForm() {
    setEditingTransactionId(null);
    setTransactionDate(new Date().toISOString().slice(0, 10));
    setTransactionAmount("");
    setTransactionLabel("");
    setTransactionCategoryId("");
    setTransactionClearedAt("");
    setTransactionReference("");
    setTransactionNotes("");
    setTransactionPaymentMethodId("");
    setTransactionAccountId(selectedAccountId ?? accounts[0]?.id ?? "");
  }

  function openCreateAccountModal() {
    resetAccountForm();
    setShowAccountModal(true);
  }

  function openEditAccountModal(account: Account) {
    setEditingAccountId(account.id);
    setAccountName(account.name);
    setAccountType(account.type);
    setCurrency(account.currency);
    setOpeningBalance(String(account.openingBalance));
    setShowAccountModal(true);
  }

  function openDeleteAccountModal(account: Account) {
    setAccountToDelete(account);
    setShowDeleteAccountModal(true);
  }

  function openBudgetModalForCategory(categoryId?: string | null) {
    setSelectedBudgetCategoryId(categoryId ?? null);
    setShowBudgetModal(true);
  }

  function closeBudgetModal() {
    setShowBudgetModal(false);
    setSelectedBudgetCategoryId(null);
  }

  function normalizeLabel(value: string) {
    return value.trim().toLowerCase();
  }

  function parseFrenchDateToIso(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const [day, month, year] = trimmed.split("/");
    if (!day || !month || !year) return "";
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  function parseAmount(value: string) {
    const normalized = value.replace(",", ".").trim();
    const amount = Number(normalized);
    return Number.isNaN(amount) ? null : amount;
  }

  function openCreateTransactionModal() {
    if (selectedAccountId) {
      setFilterMode("account");
    } else if (accounts.length === 0) {
      setMessage("Crée d'abord un compte avant d'ajouter une opération.");
      setMessageType("info");
      return;
    }

    resetTransactionForm();
    setShowTransactionModal(true);
  }

  function openEditTransactionModal(transaction: TransactionView) {
    setEditingTransactionId(transaction.id);
    setTransactionAccountId(transaction.accountId);
    setTransactionDate(transaction.date);
    setTransactionAmount(String(transaction.amount));
    setTransactionLabel(transaction.label);
    setTransactionCategoryId(transaction.categoryId ?? "");
    setTransactionClearedAt(transaction.clearedAt ?? "");
    setTransactionReference(transaction.reference ?? "");
    setTransactionNotes(transaction.notes ?? "");
    setTransactionPaymentMethodId(transaction.paymentMethodId ?? "");
    setShowTransactionModal(true);
  }

  function openDeleteTransactionModal(transaction: TransactionView) {
    setTransactionToDelete(transaction);
    setShowDeleteTransactionModal(true);
  }

  function resetDeadlineForm() {
    setEditingDeadlineId(null);
    setDeadlineLabel("");
    setDeadlineAmount("");
    setDeadlineCurrency("EUR");
    setDeadlineAccountId(selectedAccountId ?? accounts[0]?.id ?? "");
    setDeadlineCategoryId("");
    setDeadlineFrequency("monthly");
    setDeadlineDayOfMonth("1");
    setDeadlineStartDate(new Date().toISOString().slice(0, 10));
    setDeadlineEndDate("");
    setDeadlineNotes("");
    setDeadlineAutoCreateTransaction(true);
  }

  function openCreateDeadlineModal() {
    resetDeadlineForm();
    setShowDeadlineModal(true);
  }

  function openEditDeadlineModal(deadline: Deadline) {
    setEditingDeadlineId(deadline.id);
    setDeadlineLabel(deadline.label);
    setDeadlineAmount(String(deadline.amount));
    setDeadlineCurrency(deadline.currency);
    setDeadlineAccountId(deadline.accountId);
    setDeadlineCategoryId(deadline.categoryId ?? "");
    setDeadlineFrequency(deadline.frequency);
    setDeadlineDayOfMonth(String(deadline.dayOfMonth));
    setDeadlineStartDate(deadline.startDate);
    setDeadlineEndDate(deadline.endDate ?? "");
    setDeadlineNotes(deadline.notes ?? "");
    setDeadlineAutoCreateTransaction(deadline.autoCreateTransaction ?? true);
    setShowDeadlineModal(true);
  }

  function openDeleteDeadlineModal(deadline: Deadline) {
    setDeadlineToDelete(deadline);
  }

  async function handleImportAccount(account: Account) {
    try {
      setSelectedAccountId(account.id);
      setFilterMode("account");

      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "TSV",
            extensions: ["tsv", "txt"],
          },
        ],
      });

      if (!selected || Array.isArray(selected)) {
        return;
      }

      const content = await readTextFile(selected);
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length <= 1) {
        setMessage("Le fichier TSV ne contient aucune ligne exploitable.");
        setMessageType("error");
        return;
      }

      let categoriesData = await listCategories();
      let paymentMethodsData = await listPaymentMethods();

      let importedCount = 0;
      let skippedCount = 0;

      for (const line of lines.slice(1)) {
        const columns = line.split("\t");

        if (columns.length < 8) {
          skippedCount += 1;
          continue;
        }

        const [
          pointageRaw,
          datePointageRaw,
          dateRaw,
          titreRaw,
          referenceRaw,
          typeRaw,
          montantRaw,
          categorieRaw,
          commentaireRaw = "",
        ] = columns;

        const date = parseFrenchDateToIso(dateRaw);
        const clearedAt =
          normalizeLabel(pointageRaw) === "true"
            ? parseFrenchDateToIso(datePointageRaw)
            : null;

        const amount = parseAmount(montantRaw);
        const label = titreRaw.trim();
        const reference = referenceRaw.trim() || null;
        const notes = commentaireRaw.trim() || undefined;

        if (!date || amount === null || !label) {
          skippedCount += 1;
          continue;
        }

        const categoryId = categorieRaw.trim()
          ? await resolveCategoryId(
              categorieRaw,
              categoriesData,
              async () => {
                categoriesData = await listCategories();
                return categoriesData;
              }
            )
          : null;

        const paymentMethodId = typeRaw.trim()
          ? await resolvePaymentMethodId(
              typeRaw,
              paymentMethodsData,
              async () => {
                paymentMethodsData = await listPaymentMethods();
                return paymentMethodsData;
              },
              async (input) => {
                await createPaymentMethodAndReload(input);
              }
            )
          : null;

        await createTransaction({
          id: crypto.randomUUID(),
          accountId: account.id,
          date,
          amount,
          label,
          categoryId,
          clearedAt,
          reference,
          paymentMethodId,
          notes,
          createdAt: new Date().toISOString(),
        });

        importedCount += 1;
      }

      await reloadData();

      if (importedCount === 0) {
        setMessage("Aucune transaction importée. Vérifie le format du TSV.");
        setMessageType("error");
        return;
      }

      setMessage(
        skippedCount > 0
          ? `${importedCount} transaction(s) importée(s), ${skippedCount} ignorée(s).`
          : `${importedCount} transaction(s) importée(s).`
      );
      setMessageType("success");
    } catch {
      setMessage("Impossible d'importer le fichier TSV.");
      setMessageType("error");
    }
  }

  async function handleAddOrEditAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!accountName.trim()) {
      setMessage("Le nom du compte est obligatoire.");
      setMessageType("error");
      return;
    }

    const parsedOpeningBalance = Number(openingBalance);

    if (Number.isNaN(parsedOpeningBalance)) {
      setMessage("Le solde initial doit être un nombre valide.");
      setMessageType("error");
      return;
    }

    if (editingAccountId) {
      await updateAccountAndReload({
        id: editingAccountId,
        name: accountName.trim(),
        type: accountType,
        currency: currency.trim().toUpperCase(),
        openingBalance: parsedOpeningBalance,
      });
      setShowAccountModal(false);
      resetAccountForm();
      return;
    }

    const newAccount: NewAccount = {
      id: crypto.randomUUID(),
      name: accountName.trim(),
      type: accountType,
      currency: currency.trim().toUpperCase(),
      openingBalance: parsedOpeningBalance,
      createdAt: new Date().toISOString(),
    };

    await createAccountAndReload(newAccount);
    setShowAccountModal(false);
    resetAccountForm();
  }

  async function handleConfirmDeleteAccount() {
    if (!accountToDelete) return;
    await deleteAccountAndReload(accountToDelete.id);
    setShowDeleteAccountModal(false);
    setAccountToDelete(null);
  }

  async function handleAddOrEditTransaction(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (accounts.length === 0) {
      setMessage("Ajoute d'abord un compte.");
      setMessageType("error");
      return;
    }

    if (!transactionAccountId) {
      setMessage("Sélectionne un compte.");
      setMessageType("error");
      return;
    }

    if (!transactionLabel.trim()) {
      setMessage("Le libellé est obligatoire.");
      setMessageType("error");
      return;
    }

    const parsedAmount = Number(transactionAmount);

    if (Number.isNaN(parsedAmount) || parsedAmount === 0) {
      setMessage("Le montant doit être un nombre différent de 0.");
      setMessageType("error");
      return;
    }

    if (editingTransactionId) {
      await updateTransactionAndReload({
        id: editingTransactionId,
        accountId: transactionAccountId,
        date: transactionDate,
        amount: parsedAmount,
        label: transactionLabel.trim(),
        categoryId: transactionCategoryId || null,
        clearedAt: transactionClearedAt || null,
        reference: transactionReference.trim() || null,
        paymentMethodId: transactionPaymentMethodId || null,
        notes: transactionNotes.trim() || undefined,
      });
      setShowTransactionModal(false);
      resetTransactionForm();
      return;
    }

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      accountId: transactionAccountId,
      date: transactionDate,
      amount: parsedAmount,
      label: transactionLabel.trim(),
      categoryId: transactionCategoryId || null,
      clearedAt: transactionClearedAt || null,
      reference: transactionReference.trim() || null,
      paymentMethodId: transactionPaymentMethodId || null,
      notes: transactionNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    await createTransactionAndReload(newTransaction);
    setShowTransactionModal(false);
    resetTransactionForm();
  }

  async function handleConfirmDeleteTransaction() {
    if (!transactionToDelete) return;
    await deleteTransactionAndReload(transactionToDelete.id);
    setShowDeleteTransactionModal(false);
    setTransactionToDelete(null);
  }

  async function handleToggleTransactionCleared(transaction: TransactionView) {
    await updateTransactionAndReload({
      id: transaction.id,
      accountId: transaction.accountId,
      date: transaction.date,
      amount: transaction.amount,
      label: transaction.label,
      categoryId: transaction.categoryId ?? null,
      clearedAt: transaction.clearedAt ? null : new Date().toISOString().slice(0, 10),
      reference: transaction.reference?.trim() || null,
      paymentMethodId: transaction.paymentMethodId ?? null,
      notes: transaction.notes?.trim() || undefined,
    });

    setMessage(
      transaction.clearedAt
        ? "Transaction marquée comme non pointée."
        : "Transaction pointée."
    );
    setMessageType("success");
  }

  async function handleCreateCategory(input: {
    name: string;
    color?: string | null;
  }) {
    try {
      await createCategory({
        id: crypto.randomUUID(),
        name: input.name.trim(),
        color: input.color ?? null,
        createdAt: new Date().toISOString(),
      });
      await loadCategories();
      setMessage("Catégorie créée.");
      setMessageType("success");
    } catch {
      setMessage(
        "Impossible de créer la catégorie. Vérifie qu'elle n'existe pas déjà."
      );
      setMessageType("error");
      throw new Error(
        "Impossible de créer la catégorie. Vérifie qu'elle n'existe pas déjà."
      );
    }
  }

  async function handleUpdateCategory(input: {
    id: string;
    name: string;
    color?: string | null;
  }) {
    try {
      await updateCategory({
        id: input.id,
        name: input.name.trim(),
        color: input.color ?? null,
      });
      await loadCategories();
      setMessage("Catégorie mise à jour.");
      setMessageType("success");
    } catch {
      setMessage("Impossible de modifier la catégorie.");
      setMessageType("error");
      throw new Error("Impossible de modifier la catégorie.");
    }
  }

  async function handleDeleteCategory(category: Category) {
    if ((category.usageCount ?? 0) > 0) {
      const errorMessage = `Impossible de supprimer la catégorie "${category.name}" car elle est utilisée par ${category.usageCount} opération(s).`;
      setMessage(errorMessage);
      setMessageType("error");
      throw new Error(errorMessage);
    }

    try {
      await deleteCategory(category.id);
      await loadCategories();

      if (transactionCategoryId === category.id) {
        setTransactionCategoryId("");
      }

      setMessage("Catégorie supprimée.");
      setMessageType("success");
    } catch {
      setMessage("Suppression impossible.");
      setMessageType("error");
      throw new Error("Suppression impossible.");
    }
  }

  async function handleCreatePaymentMethod(input: {
    name: string;
    kind: PaymentMethod["kind"];
  }) {
    try {
      await createPaymentMethodAndReload({
        id: crypto.randomUUID(),
        name: input.name.trim(),
        kind: input.kind,
        createdAt: new Date().toISOString(),
      });
      setMessage("Moyen de paiement créé.");
      setMessageType("success");
    } catch {
      setMessage(
        "Impossible de créer le moyen de paiement. Vérifie qu'il n'existe pas déjà."
      );
      setMessageType("error");
      throw new Error(
        "Impossible de créer le moyen de paiement. Vérifie qu'il n'existe pas déjà."
      );
    }
  }

  async function handleUpdatePaymentMethod(input: {
    id: string;
    name: string;
    kind: PaymentMethod["kind"];
  }) {
    try {
      await updatePaymentMethodAndReload({
        id: input.id,
        name: input.name.trim(),
        kind: input.kind,
      });
      setMessage("Moyen de paiement mis à jour.");
      setMessageType("success");
    } catch {
      setMessage("Impossible de modifier le moyen de paiement.");
      setMessageType("error");
      throw new Error("Impossible de modifier le moyen de paiement.");
    }
  }

  async function handleDeletePaymentMethod(paymentMethod: PaymentMethod) {
    if ((paymentMethod.usageCount ?? 0) > 0) {
      const errorMessage = `Impossible de supprimer le moyen de paiement "${paymentMethod.name}" car il est utilisé par ${paymentMethod.usageCount} opération(s).`;
      setMessage(errorMessage);
      setMessageType("error");
      throw new Error(errorMessage);
    }

    try {
      await deletePaymentMethodAndReload(paymentMethod.id);

      if (transactionPaymentMethodId === paymentMethod.id) {
        setTransactionPaymentMethodId("");
      }

      setMessage("Moyen de paiement supprimé.");
      setMessageType("success");
    } catch {
      setMessage("Suppression impossible.");
      setMessageType("error");
      throw new Error("Suppression impossible.");
    }
  }

  async function resolveCategoryId(
    name: string,
    categories: Category[],
    refreshCategories: () => Promise<Category[]>
  ): Promise<string | null> {
    const normalized = name.trim();
    if (!normalized) return null;

    const existing = categories.find(
      (category) => category.name.trim().toLowerCase() === normalized.toLowerCase()
    );

    if (existing) return existing.id;

    await createCategory({
      id: crypto.randomUUID(),
      name: normalized,
      color: null,
      createdAt: new Date().toISOString(),
    });

    const updatedCategories = await refreshCategories();
    const created = updatedCategories.find(
      (category) => category.name.trim().toLowerCase() === normalized.toLowerCase()
    );

    return created?.id ?? null;
  }

  function mapPaymentMethodKind(label: string): PaymentMethodKind {
    const normalized = label.trim().toLowerCase();

    if (normalized === "carte") return "card";
    if (normalized === "prélèvement") return "direct_debit";
    if (normalized === "virement") return "transfer";
    if (normalized === "chèque") return "cheque";
    if (normalized === "cheque") return "cheque";
    if (normalized === "espèces") return "cash";
    if (normalized === "especes") return "cash";

    return "other";
  }

  async function resolvePaymentMethodId(
    paymentMethodName: string,
    paymentMethods: PaymentMethod[],
    reloadPaymentMethods: () => Promise<PaymentMethod[]>,
    createPaymentMethod: (input: {
      id: string;
      name: string;
      kind: PaymentMethodKind;
      createdAt: string;
    }) => Promise<void>
  ): Promise<string | null> {
    const normalized = paymentMethodName.trim();
    if (!normalized) return null;

    const existing = paymentMethods.find(
      (paymentMethod) =>
        paymentMethod.name.trim().toLowerCase() === normalized.toLowerCase()
    );

    if (existing) return existing.id;

    await createPaymentMethod({
      id: crypto.randomUUID(),
      name: normalized,
      kind: mapPaymentMethodKind(normalized),
      createdAt: new Date().toISOString(),
    });

    const updatedPaymentMethods = await reloadPaymentMethods();

    const created = updatedPaymentMethods.find(
      (paymentMethod) =>
        paymentMethod.name.trim().toLowerCase() === normalized.toLowerCase()
    );

    return created?.id ?? null;
  }

  async function handleAddOrEditDeadline(event: React.FormEvent) {
    event.preventDefault();

    if (!deadlineLabel.trim()) {
      setMessage("Le libellé de l'échéance est obligatoire.");
      setMessageType("error");
      return;
    }

    if (!deadlineAccountId) {
      setMessage("Sélectionne un compte pour l'échéance.");
      setMessageType("error");
      return;
    }

    const parsedAmount = Number(deadlineAmount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setMessage("Le montant doit être un nombre positif.");
      setMessageType("error");
      return;
    }

    const parsedDay = Number(deadlineDayOfMonth);
    if (Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      setMessage("Le jour du mois doit être compris entre 1 et 31.");
      setMessageType("error");
      return;
    }

    const now = new Date().toISOString();

    const payload: Deadline = {
      id: editingDeadlineId ?? crypto.randomUUID(),
      label: deadlineLabel.trim(),
      amount: parsedAmount,
      currency: deadlineCurrency.trim().toUpperCase(),
      accountId: deadlineAccountId,
      categoryId: deadlineCategoryId || null,
      frequency: deadlineFrequency,
      dayOfMonth: parsedDay,
      startDate: deadlineStartDate,
      endDate: deadlineEndDate || null,
      autoCreateTransaction: deadlineAutoCreateTransaction,
      lastAppliedAt: null,
      lastTransactionId: null,
      notes: deadlineNotes.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    try {
      if (editingDeadlineId) {
        await updateDeadlineAndReload(payload);
        setMessage("Échéance mise à jour.");
      } else {
        await createDeadlineAndReload(payload);
        setMessage("Échéance créée.");
      }

      setMessageType("success");
      setShowDeadlineModal(false);
      resetDeadlineForm();
    } catch (error) {
      setMessage(`Impossible d'enregistrer l'échéance : ${String(error)}`);
      setMessageType("error");
    }
  }

  async function handleConfirmDeleteDeadline() {
    if (!deadlineToDelete) return;

    try {
      await deleteDeadlineAndReload(deadlineToDelete.id);
      setDeadlineToDelete(null);
      setMessage("Échéance supprimée.");
      setMessageType("success");
    } catch (error) {
      setMessage(`Suppression impossible : ${String(error)}`);
      setMessageType("error");
    }
  }

  async function handleApplyDeadline(deadline: Deadline) {
    try {
      const appliedAt = new Date().toISOString().slice(0, 10);
      const transactionId = crypto.randomUUID();

      const newTransaction: Transaction = {
        id: transactionId,
        accountId: deadline.accountId,
        date: appliedAt,
        amount: -Math.abs(deadline.amount),
        label: deadline.label.trim(),
        categoryId: deadline.categoryId ?? null,
        clearedAt: appliedAt,
        reference: `deadline:${deadline.id}`,
        paymentMethodId: null,
        notes: deadline.notes?.trim() || "Échéance appliquée automatiquement",
        createdAt: new Date().toISOString(),
      };

      await createTransaction(newTransaction);

      await markDeadlineApplied({
        id: deadline.id,
        appliedAt,
        transactionId,
      });

      await reloadData();
      setMessage(`Échéance "${deadline.label}" marquée comme payée.`);
      setMessageType("success");
    } catch (error) {
      setMessage(`Impossible de marquer l'échéance comme payée. ${String(error)}`);
      setMessageType("error");
    }
  }

  async function handleUnapplyDeadline(deadline: Deadline) {
    try {
      if (!deadline.lastTransactionId) {
        setMessage("Aucune transaction liée à annuler pour cette échéance.");
        setMessageType("info");
        return;
      }

      await deleteTransaction(deadline.lastTransactionId);
      await clearDeadlineApplied(deadline.id);

      await reloadData();
      setMessage(`Paiement annulé pour l'échéance "${deadline.label}".`);
      setMessageType("success");
    } catch (error) {
      setMessage(`Impossible d'annuler le paiement. ${String(error)}`);
      setMessageType("error");
    }
  }

  return (
    <div className="vault-shell">
      <header className="vault-toolbar">
        <div className="toolbar-brand">
          <div className="brand-chip">
            <span className="brand-logo">€</span>
            <div className="brand-copy">
              <p className="brand-overline">BANK VAULT</p>
              <h1>Comptes & opérations</h1>
            </div>
          </div>

          <nav className="toolbar-nav" aria-label="Navigation principale">
            <button
              className={mainView === "transactions" ? "toolbar-nav-btn is-active" : "toolbar-nav-btn"}
              type="button"
              onClick={() => setMainView("transactions")}
            >
              Transactions
            </button>

            <button
              className={mainView === "budget" ? "toolbar-nav-btn is-active" : "toolbar-nav-btn"}
              type="button"
              onClick={() => setMainView("budget")}
            >
              Budget
            </button>

            <button
              className={
                mainView === "deadlines"
                  ? "toolbar-nav-btn is-active"
                  : "toolbar-nav-btn"
              }
              type="button"
              onClick={() => setMainView("deadlines")}
            >
              Échéances
            </button>
          </nav>
        </div>

        <div className="toolbar-context">
          <div className="toolbar-segment">
            <button
              className={filterMode === "all" ? "toolbar-tab active" : "toolbar-tab"}
              onClick={() => setFilterMode("all")}
              type="button"
            >
              Tous les comptes
            </button>

            <button
              className={filterMode === "account" ? "toolbar-tab active" : "toolbar-tab"}
              onClick={() => setFilterMode("account")}
              disabled={!selectedAccountId}
              type="button"
            >
              Compte sélectionné
            </button>
          </div>
        </div>

        <div className="toolbar-actions">
          <button
            className="toolbar-icon-btn"
            onClick={() => reloadData()}
            type="button"
            title="Actualiser"
            aria-label="Actualiser"
          >
            ↻
          </button>

          <div className="toolbar-menu-wrapper" ref={manageMenuRef}>
            <button
              className="toolbar-secondary-btn"
              type="button"
              aria-haspopup="menu"
              aria-expanded={showManageMenu}
              aria-controls="manage-menu"
              onClick={() => setShowManageMenu((prev) => !prev)}
            >
              Gérer
            </button>

            {showManageMenu && (
              <div className="toolbar-dropdown" id="manage-menu" role="menu">
                <button
                  type="button"
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setShowManageMenu(false);
                    openCreateAccountModal();
                  }}
                >
                  Nouveau compte
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setShowManageMenu(false);
                    setShowCategoriesModal(true);
                  }}
                >
                  Catégories
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setShowManageMenu(false);
                    setShowPaymentMethodsModal(true);
                  }}
                >
                  Moyens de paiement
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setShowManageMenu(false);
                    openBudgetModalForCategory(null);
                  }}
                >
                  Budgets
                </button>
              </div>
            )}
          </div>

          <button className="toolbar-cta" onClick={openCreateTransactionModal} type="button">
            Nouvelle opération
          </button>
        </div>
      </header>

      {message && (
        <div className={`toast-message ${messageType}`} role="status" aria-live="polite">
          <span className="toast-dot" />
          <span>{message}</span>
        </div>
      )}

      <div className="workspace">
        <AccountsPane
          accounts={accounts}
          transactions={transactions}
          deadlines={deadlines}
          loading={loading}
          selectedAccountId={selectedAccountId}
          onSelectAccount={(id) => {
            setSelectedAccountId(id);
            setFilterMode("account");
          }}
          onEditAccount={openEditAccountModal}
          onDeleteAccount={openDeleteAccountModal}
          onImportAccount={handleImportAccount}
          formatAccountType={formatAccountType}
          formatCurrency={formatCurrency}
        />

        {mainView === "transactions" ? (
          <TransactionsPane
            loading={loading}
            filteredTransactions={filteredTransactions}
            searchTerm={searchTerm}
            periodFilter={periodFilter}
            startDate={startDate}
            endDate={endDate}
            sortField={sortField}
            sortDirection={sortDirection}
            onSearchTermChange={setSearchTerm}
            onPeriodFilterChange={setPeriodFilter}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onClearFilters={clearFilters}
            onToggleSort={toggleSort}
            getAriaSort={getAriaSort}
            getSortIndicator={getSortIndicator}
            onEditTransaction={openEditTransactionModal}
            onDeleteTransaction={openDeleteTransactionModal}
            onToggleTransactionCleared={handleToggleTransactionCleared}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        ) : mainView === "budget" ? (
          <BudgetPane
            accounts={accounts}
            categories={categories}
            transactions={
              filterMode === "account" && selectedAccountId
                ? transactions.filter((tx) => tx.accountId === selectedAccountId)
                : transactions
            }
            selectedYear={selectedBudgetYear}
            refreshKey={budgetRefreshKey}
            onYearChange={setSelectedBudgetYear}
            onOpenBudgetEditor={() => openBudgetModalForCategory(null)}
            onOpenBudgetCategory={(categoryId) => openBudgetModalForCategory(categoryId)}
          />
        ) : (
          <DeadlinesPane
            categories={categories}
            transactions={transactions}
            deadlines={deadlines}
            onCreateDeadline={openCreateDeadlineModal}
            onEditDeadline={openEditDeadlineModal}
            onDeleteDeadline={openDeleteDeadlineModal}
            onApplyDeadline={handleApplyDeadline}
            onUnapplyDeadline={handleUnapplyDeadline}
          />
        )}
      </div>

      <AccountModal
        open={showAccountModal}
        editingAccountId={editingAccountId}
        accountName={accountName}
        accountType={accountType}
        currency={currency}
        openingBalance={openingBalance}
        onClose={() => setShowAccountModal(false)}
        onSubmit={handleAddOrEditAccount}
        setAccountName={setAccountName}
        setAccountType={setAccountType}
        setCurrency={setCurrency}
        setOpeningBalance={setOpeningBalance}
      />

      <TransactionModal
        open={showTransactionModal}
        editingTransactionId={editingTransactionId}
        accounts={accounts}
        categories={categories}
        paymentMethods={paymentMethods}
        transactionAccountId={transactionAccountId}
        transactionDate={transactionDate}
        transactionAmount={transactionAmount}
        transactionLabel={transactionLabel}
        transactionCategoryId={transactionCategoryId}
        transactionClearedAt={transactionClearedAt}
        transactionReference={transactionReference}
        transactionPaymentMethodId={transactionPaymentMethodId}
        transactionNotes={transactionNotes}
        onClose={() => setShowTransactionModal(false)}
        onSubmit={handleAddOrEditTransaction}
        onOpenCategoriesManager={() => setShowCategoriesModal(true)}
        onOpenPaymentMethodsManager={() => setShowPaymentMethodsModal(true)}
        setTransactionAccountId={setTransactionAccountId}
        setTransactionDate={setTransactionDate}
        setTransactionAmount={setTransactionAmount}
        setTransactionLabel={setTransactionLabel}
        setTransactionCategoryId={setTransactionCategoryId}
        setTransactionClearedAt={setTransactionClearedAt}
        setTransactionReference={setTransactionReference}
        setTransactionPaymentMethodId={setTransactionPaymentMethodId}
        setTransactionNotes={setTransactionNotes}
      />

      <CategoriesModal
        open={showCategoriesModal}
        categories={categories}
        onClose={() => setShowCategoriesModal(false)}
        onCreate={handleCreateCategory}
        onUpdate={handleUpdateCategory}
        onDelete={handleDeleteCategory}
      />

      <PaymentMethodsModal
        open={showPaymentMethodsModal}
        paymentMethods={paymentMethods}
        onClose={() => setShowPaymentMethodsModal(false)}
        onCreate={handleCreatePaymentMethod}
        onUpdate={handleUpdatePaymentMethod}
        onDelete={handleDeletePaymentMethod}
      />

      <ConfirmDeleteModal
        open={showDeleteAccountModal && !!accountToDelete}
        title="Supprimer le compte"
        description={
          accountToDelete
            ? `Tu vas supprimer ${accountToDelete.name}. Les transactions liées seront supprimées aussi si la base a bien la contrainte ON DELETE CASCADE.`
            : ""
        }
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={handleConfirmDeleteAccount}
      />

      <ConfirmDeleteModal
        open={!!deadlineToDelete}
        title="Supprimer l’échéance"
        description={
          deadlineToDelete
            ? `Tu vas supprimer l’échéance ${deadlineToDelete.label}.`
            : ""
        }
        onClose={() => setDeadlineToDelete(null)}
        onConfirm={handleConfirmDeleteDeadline}
      />

      <ConfirmDeleteModal
        open={showDeleteTransactionModal && !!transactionToDelete}
        title="Supprimer la transaction"
        description={
          transactionToDelete
            ? `Tu vas supprimer ${transactionToDelete.label} du ${formatDate(
                transactionToDelete.date
              )}.`
            : ""
        }
        onClose={() => setShowDeleteTransactionModal(false)}
        onConfirm={handleConfirmDeleteTransaction}
      />

      <BudgetModal
        open={showBudgetModal}
        year={selectedBudgetYear}
        initialCategoryId={selectedBudgetCategoryId}
        onClose={closeBudgetModal}
        onSaved={() => setBudgetRefreshKey((current) => current + 1)}
      />

      <DeadlineModal
        open={showDeadlineModal}
        title={editingDeadlineId ? "Modifier l’échéance" : "Nouvelle échéance"}
        accounts={accounts}
        categories={categories}
        label={deadlineLabel}
        amount={deadlineAmount}
        currency={deadlineCurrency}
        accountId={deadlineAccountId}
        categoryId={deadlineCategoryId}
        frequency={deadlineFrequency}
        dayOfMonth={deadlineDayOfMonth}
        startDate={deadlineStartDate}
        endDate={deadlineEndDate}
        notes={deadlineNotes}
        autoCreateTransaction={deadlineAutoCreateTransaction}
        onClose={() => setShowDeadlineModal(false)}
        onSubmit={handleAddOrEditDeadline}
        setLabel={setDeadlineLabel}
        setAmount={setDeadlineAmount}
        setCurrency={setDeadlineCurrency}
        setAccountId={setDeadlineAccountId}
        setCategoryId={setDeadlineCategoryId}
        setFrequency={setDeadlineFrequency}
        setDayOfMonth={setDeadlineDayOfMonth}
        setStartDate={setDeadlineStartDate}
        setEndDate={setDeadlineEndDate}
        setNotes={setDeadlineNotes}
        setAutoCreateTransaction={setDeadlineAutoCreateTransaction}
      />
    </div>
  );
}

export default App;