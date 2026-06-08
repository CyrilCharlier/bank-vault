import { useEffect, useRef, useState } from "react";
import type {
  Account,
  Deadline,
  NewAccount,
  PaymentMethod,
  Transaction,
  TransactionView,
} from "../../../types";
import {
  createAccount,
  createDeadline,
  createPaymentMethod,
  createTransaction,
  deleteAccount,
  deleteDeadline,
  deletePaymentMethod,
  deleteTransaction,
  listAccounts,
  listDeadlines,
  listPaymentMethods,
  listTransactions,
  updateAccount,
  updateDeadline,
  updatePaymentMethod,
  updateTransaction,
} from "../../../db";

interface UseFinanceDataOptions {
  selectedAccountId: string | null;
  transactionAccountId: string;
  onSelectedAccountChange: (id: string | null) => void;
  onTransactionAccountChange: (id: string) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function useFinanceData({
  selectedAccountId,
  transactionAccountId,
  onSelectedAccountChange,
  onTransactionAccountChange,
  onSuccess,
  onError,
}: UseFinanceDataOptions) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<TransactionView[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedAccountIdRef = useRef(selectedAccountId);
  const transactionAccountIdRef = useRef(transactionAccountId);

  useEffect(() => {
    selectedAccountIdRef.current = selectedAccountId;
  }, [selectedAccountId]);

  useEffect(() => {
    transactionAccountIdRef.current = transactionAccountId;
  }, [transactionAccountId]);

  async function reloadData(successMessage?: string) {
    try {
      setLoading(true);

      const [
        accountsData,
        transactionsData,
        paymentMethodsData,
        deadlinesData,
      ] = await Promise.all([
        listAccounts(),
        listTransactions(),
        listPaymentMethods(),
        listDeadlines(),
      ]);

      setAccounts(accountsData);
      setTransactions(transactionsData);
      setPaymentMethods(paymentMethodsData);
      setDeadlines(deadlinesData);

      const currentSelectedAccountId = selectedAccountIdRef.current;
      const currentTransactionAccountId = transactionAccountIdRef.current;

      if (accountsData.length > 0) {
        const stillExists = accountsData.some(
          (account) => account.id === currentSelectedAccountId
        );

        const nextSelectedId =
          stillExists && currentSelectedAccountId
            ? currentSelectedAccountId
            : accountsData[0].id;

        if (nextSelectedId !== currentSelectedAccountId) {
          onSelectedAccountChange(nextSelectedId);
        }

        const transactionAccountStillExists = accountsData.some(
          (account) => account.id === currentTransactionAccountId
        );

        if (
          !currentTransactionAccountId ||
          !transactionAccountStillExists
        ) {
          onTransactionAccountChange(nextSelectedId);
        }
      } else {
        if (currentSelectedAccountId !== null) {
          onSelectedAccountChange(null);
        }

        if (currentTransactionAccountId) {
          onTransactionAccountChange("");
        }
      }

      if (successMessage) {
        onSuccess(successMessage);
      }
    } catch (error) {
      onError(`Erreur de chargement : ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reloadData();
  }, []);

  async function createAccountAndReload(account: NewAccount) {
    try {
      await createAccount(account);
      await reloadData("Compte ajouté avec succès.");
    } catch (error) {
      onError(`Erreur compte : ${String(error)}`);
    }
  }

  async function updateAccountAndReload(account: {
    id: string;
    name: string;
    type: Account["type"];
    currency: string;
    openingBalance: number;
  }) {
    try {
      await updateAccount(account);
      await reloadData("Compte modifié avec succès.");
    } catch (error) {
      onError(`Erreur compte : ${String(error)}`);
    }
  }

  async function deleteAccountAndReload(accountId: string) {
    try {
      await deleteAccount(accountId);
      await reloadData("Compte supprimé avec succès.");
    } catch (error) {
      onError(`Erreur suppression compte : ${String(error)}`);
    }
  }

  async function createTransactionAndReload(transaction: Transaction) {
    try {
      await createTransaction(transaction);
      await reloadData("Transaction ajoutée avec succès.");
    } catch (error) {
      onError(`Erreur transaction : ${String(error)}`);
    }
  }

  async function updateTransactionAndReload(transaction: {
    id: string;
    accountId: string;
    date: string;
    amount: number;
    label: string;
    categoryId?: string | null;
    clearedAt?: string | null;
    reference?: string | null;
    paymentMethodId?: string | null;
    notes?: string;
  }) {
    try {
      await updateTransaction(transaction);
      await reloadData("Transaction modifiée avec succès.");
    } catch (error) {
      onError(`Erreur transaction : ${String(error)}`);
    }
  }

  async function deleteTransactionAndReload(transactionId: string) {
    try {
      await deleteTransaction(transactionId);
      await reloadData("Transaction supprimée avec succès.");
    } catch (error) {
      onError(`Erreur suppression transaction : ${String(error)}`);
    }
  }

  async function createPaymentMethodAndReload(paymentMethod: PaymentMethod) {
    try {
      await createPaymentMethod(paymentMethod);
      await reloadData("Moyen de paiement ajouté avec succès.");
    } catch (error) {
      onError(`Erreur moyen de paiement : ${String(error)}`);
    }
  }

  async function updatePaymentMethodAndReload(paymentMethod: {
    id: string;
    name: string;
    kind: PaymentMethod["kind"];
  }) {
    try {
      await updatePaymentMethod(paymentMethod);
      await reloadData("Moyen de paiement modifié avec succès.");
    } catch (error) {
      onError(`Erreur moyen de paiement : ${String(error)}`);
    }
  }

  async function deletePaymentMethodAndReload(paymentMethodId: string) {
    try {
      await deletePaymentMethod(paymentMethodId);
      await reloadData("Moyen de paiement supprimé avec succès.");
    } catch (error) {
      onError(`Erreur suppression moyen de paiement : ${String(error)}`);
    }
  }

  async function createDeadlineAndReload(deadline: Deadline) {
    try {
      await createDeadline(deadline);
      await reloadData("Échéance ajoutée avec succès.");
    } catch (error) {
      onError(`Erreur échéance : ${String(error)}`);
    }
  }

  async function updateDeadlineAndReload(deadline: Deadline) {
    try {
      await updateDeadline(deadline);
      await reloadData("Échéance modifiée avec succès.");
    } catch (error) {
      onError(`Erreur échéance : ${String(error)}`);
    }
  }

  async function deleteDeadlineAndReload(deadlineId: string) {
    try {
      await deleteDeadline(deadlineId);
      await reloadData("Échéance supprimée avec succès.");
    } catch (error) {
      onError(`Erreur suppression échéance : ${String(error)}`);
    }
  }

  return {
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
  };
}