import Database from "@tauri-apps/plugin-sql";
import type {
  NewAccount,
  Account,
  Transaction,
  TransactionView,
  AccountType,
  Category,
  PaymentMethod,
  PaymentMethodKind,
  Budget,
  Deadline,
} from "./types";

let dbPromise: Promise<Database> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:vault.db");
  }

  const db = await dbPromise;
  await db.execute("PRAGMA foreign_keys = ON");
  return db;
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();

  return db.select<Category[]>(
    `
    SELECT
      c.id,
      c.name,
      c.color,
      c.created_at AS createdAt,
      COUNT(t.id) AS usageCount
    FROM categories c
    LEFT JOIN transactions t ON t.category_id = c.id
    GROUP BY c.id, c.name, c.color, c.created_at
    ORDER BY c.name ASC
    `
  );
}

export async function createCategory(category: Category) {
  const db = await getDb();

  await db.execute(
    `
    INSERT INTO categories (
      id, name, color, created_at
    ) VALUES ($1, $2, $3, $4)
    `,
    [
      category.id,
      category.name.trim(),
      category.color ?? null,
      category.createdAt,
    ]
  );
}

export async function updateCategory(category: {
  id: string;
  name: string;
  color?: string | null;
}) {
  const db = await getDb();

  await db.execute(
    `
    UPDATE categories
    SET
      name = $1,
      color = $2
    WHERE id = $3
    `,
    [
      category.name.trim(),
      category.color ?? null,
      category.id,
    ]
  );
}

export async function deleteCategory(categoryId: string) {
  const db = await getDb();

  await db.execute(
    `
    DELETE FROM categories
    WHERE id = $1
    `,
    [categoryId]
  );
}

export async function listAccounts(): Promise<Account[]> {
  const db = await getDb();

  return db.select<Account[]>(
    `
    SELECT
      a.id,
      a.name,
      a.type,
      a.currency,
      a.opening_balance AS openingBalance,
      a.created_at AS createdAt,
      a.opening_balance + COALESCE(SUM(t.amount), 0) AS currentBalance
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id
    GROUP BY
      a.id,
      a.name,
      a.type,
      a.currency,
      a.opening_balance,
      a.created_at
    ORDER BY a.created_at DESC
    `
  );
}

export async function createAccount(account: NewAccount) {
  const db = await getDb();

  await db.execute(
    `
    INSERT INTO accounts (
      id, name, type, currency, opening_balance, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      account.id,
      account.name,
      account.type,
      account.currency,
      account.openingBalance,
      account.createdAt,
    ]
  );
}

export async function updateAccount(account: {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: number;
}) {
  const db = await getDb();

  await db.execute(
    `
    UPDATE accounts
    SET
      name = $1,
      type = $2,
      currency = $3,
      opening_balance = $4
    WHERE id = $5
    `,
    [
      account.name,
      account.type,
      account.currency,
      account.openingBalance,
      account.id,
    ]
  );
}

export async function deleteAccount(accountId: string) {
  const db = await getDb();

  await db.execute(
    `
    DELETE FROM accounts
    WHERE id = $1
    `,
    [accountId]
  );
}

export async function listTransactions(): Promise<TransactionView[]> {
  const db = await getDb();

  return db.select<TransactionView[]>(
    `
    WITH ordered_transactions AS (
      SELECT
        t.id,
        t.account_id AS accountId,
        a.name AS accountName,
        a.currency AS currency,
        a.opening_balance AS openingBalance,
        t.date,
        t.amount,
        t.label,
        t.category_id AS categoryId,
        c.name AS categoryName,
        c.color AS categoryColor,
        t.cleared_at AS clearedAt,
        t.reference AS reference,
        t.payment_method_id AS paymentMethodId,
        pm.name AS paymentMethodName,
        pm.kind AS paymentMethodKind,
        t.notes,
        t.created_at AS createdAt,
        SUM(t.amount) OVER (
          PARTITION BY t.account_id
          ORDER BY t.date ASC, t.created_at ASC, t.id ASC
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS runningAmount
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
    )
    SELECT
      id,
      accountId,
      accountName,
      currency,
      date,
      amount,
      label,
      categoryId,
      categoryName,
      categoryColor,
      clearedAt,
      reference,
      notes,
      paymentMethodId,
      paymentMethodName,
      paymentMethodKind,
      createdAt,
      openingBalance + runningAmount AS runningBalance
    FROM ordered_transactions
    ORDER BY date DESC, createdAt DESC, id DESC
    `
  );
}

export async function createTransaction(transaction: Transaction) {
  const db = await getDb();

  await db.execute(
    `
    INSERT INTO transactions (
      id, account_id, date, amount, label, category_id, cleared_at, reference, payment_method_id, notes, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
    [
      transaction.id,
      transaction.accountId,
      transaction.date,
      transaction.amount,
      transaction.label,
      transaction.categoryId ?? null,
      transaction.clearedAt ?? null,
      transaction.reference ?? null,
      transaction.paymentMethodId ?? null,
      transaction.notes ?? null,
      transaction.createdAt,
    ]
  );
}

export async function updateTransaction(transaction: {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  label: string;
  clearedAt?: string | null;
  reference?: string | null;
  categoryId?: string | null;
  paymentMethodId?: string | null;
  notes?: string;
}) {
  const db = await getDb();

  await db.execute(
    `
    UPDATE transactions
    SET
      account_id = $1,
      date = $2,
      amount = $3,
      label = $4,
      category_id = $5,
      cleared_at = $6,
      reference = $7,
      payment_method_id = $8,
      notes = $9
    WHERE id = $10
    `,
    [
      transaction.accountId,
      transaction.date,
      transaction.amount,
      transaction.label,
      transaction.categoryId ?? null,
      transaction.clearedAt ?? null,
      transaction.reference ?? null,
      transaction.paymentMethodId ?? null,
      transaction.notes ?? null,
      transaction.id,
    ]
  );
}

export async function deleteTransaction(transactionId: string) {
  const db = await getDb();

  await db.execute(
    `
    DELETE FROM transactions
    WHERE id = $1
    `,
    [transactionId]
  );
}

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const db = await getDb();

  return db.select<PaymentMethod[]>(
    `
    SELECT
      p.id,
      p.name,
      p.kind,
      p.created_at AS createdAt,
      COUNT(t.id) AS usageCount
    FROM payment_methods p
    LEFT JOIN transactions t ON t.payment_method_id = p.id
    GROUP BY p.id, p.name, p.kind, p.created_at
    ORDER BY p.name ASC
    `
  );
}

export async function createPaymentMethod(pm: PaymentMethod) {
  const db = await getDb();
  await db.execute(
    `
    INSERT INTO payment_methods (
      id, name, kind, created_at
    ) VALUES ($1, $2, $3, $4)
    `,
    [pm.id, pm.name.trim(), pm.kind, pm.createdAt]
  );
}

export async function updatePaymentMethod(pm: {
  id: string;
  name: string;
  kind: PaymentMethodKind;
}) {
  const db = await getDb();
  await db.execute(
    `
    UPDATE payment_methods
    SET name = $1, kind = $2
    WHERE id = $3
    `,
    [pm.name.trim(), pm.kind, pm.id]
  );
}

export async function deletePaymentMethod(id: string) {
  const db = await getDb();
  await db.execute(
    `
    DELETE FROM payment_methods
    WHERE id = $1
    `,
    [id]
  );
}

export async function listBudgets(year?: number): Promise<Budget[]> {
  const db = await getDb();

  if (typeof year === "number") {
    return db.select(
      `
        SELECT
          id,
          category_id AS categoryId,
          year,
          annual_amount AS annualAmount,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM budgets
        WHERE year = $1
        ORDER BY year ASC, created_at ASC
      `,
      [year]
    );
  }

  return db.select(
    `
      SELECT
        id,
        category_id AS categoryId,
        year,
        annual_amount AS annualAmount,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM budgets
      ORDER BY year ASC, created_at ASC
    `
  );
}

export async function upsertBudget(budget: {
  id: string;
  categoryId: string;
  year: number;
  annualAmount: number;
  createdAt: string;
  updatedAt: string;
}) {
  const db = await getDb();

  await db.execute(
    `
      INSERT INTO budgets (
        id,
        category_id,
        year,
        annual_amount,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT(category_id, year)
      DO UPDATE SET
        annual_amount = excluded.annual_amount,
        updated_at = excluded.updated_at
    `,
    [
      budget.id,
      budget.categoryId,
      budget.year,
      budget.annualAmount,
      budget.createdAt,
      budget.updatedAt,
    ]
  );
}

export async function deleteBudget(categoryId: string, year: number) {
  const db = await getDb();

  await db.execute(
    `
      DELETE FROM budgets
      WHERE category_id = $1 AND year = $2
    `,
    [categoryId, year]
  );
}

export async function listDeadlines(): Promise<Deadline[]> {
  const db = await getDb();

  return db.select(
    `
    SELECT
      id,
      label,
      amount,
      currency,
      account_id AS accountId,
      category_id AS categoryId,
      frequency,
      day_of_month AS dayOfMonth,
      start_date AS startDate,
      end_date AS endDate,
      auto_create_transaction AS autoCreateTransaction,
      last_applied_at AS lastAppliedAt,
      last_transaction_id AS lastTransactionId,
      notes,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM deadlines
    ORDER BY label ASC, created_at ASC
    `
  );
}

export async function createDeadline(deadline: Deadline) {
  const db = await getDb();

  await db.execute(
    `
    INSERT INTO deadlines (
      id,
      label,
      amount,
      currency,
      account_id,
      category_id,
      frequency,
      day_of_month,
      start_date,
      end_date,
      auto_create_transaction,
      last_applied_at,
      last_transaction_id,
      notes,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `,
    [
      deadline.id,
      deadline.label.trim(),
      deadline.amount,
      deadline.currency.trim().toUpperCase(),
      deadline.accountId,
      deadline.categoryId ?? null,
      deadline.frequency,
      deadline.dayOfMonth,
      deadline.startDate,
      deadline.endDate ?? null,
      deadline.autoCreateTransaction ? 1 : 0,
      deadline.lastAppliedAt ?? null,
      deadline.lastTransactionId ?? null,
      deadline.notes ?? null,
      deadline.createdAt,
      deadline.updatedAt,
    ]
  );
}

export async function updateDeadline(deadline: Deadline) {
  const db = await getDb();

  await db.execute(
    `
    UPDATE deadlines
    SET
      label = $1,
      amount = $2,
      currency = $3,
      account_id = $4,
      category_id = $5,
      frequency = $6,
      day_of_month = $7,
      start_date = $8,
      end_date = $9,
      auto_create_transaction = $10,
      last_applied_at = $11,
      last_transaction_id = $12,
      notes = $13,
      updated_at = $14
    WHERE id = $15
    `,
    [
      deadline.label.trim(),
      deadline.amount,
      deadline.currency.trim().toUpperCase(),
      deadline.accountId,
      deadline.categoryId ?? null,
      deadline.frequency,
      deadline.dayOfMonth,
      deadline.startDate,
      deadline.endDate ?? null,
      deadline.autoCreateTransaction ? 1 : 0,
      deadline.lastAppliedAt ?? null,
      deadline.lastTransactionId ?? null,
      deadline.notes ?? null,
      deadline.updatedAt,
      deadline.id,
    ]
  );
}

export async function deleteDeadline(deadlineId: string) {
  const db = await getDb();

  await db.execute(
    `
    DELETE FROM deadlines
    WHERE id = $1
    `,
    [deadlineId]
  );
}

export async function markDeadlineApplied(input: {
  id: string;
  appliedAt: string;
  transactionId: string;
}) {
  const db = await getDb();

  await db.execute(
    `
    UPDATE deadlines
    SET
      last_applied_at = $1,
      last_transaction_id = $2,
      updated_at = $3
    WHERE id = $4
    `,
    [input.appliedAt, input.transactionId, input.appliedAt, input.id]
  );
}

export async function clearDeadlineApplied(deadlineId: string) {
  const db = await getDb();

  await db.execute(
    `
    UPDATE deadlines
    SET
      last_applied_at = NULL,
      last_transaction_id = NULL,
      updated_at = $1
    WHERE id = $2
    `,
    [new Date().toISOString(), deadlineId]
  );
}