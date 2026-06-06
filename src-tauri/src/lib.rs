use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_accounts_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS accounts (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    currency TEXT NOT NULL,
                    opening_balance REAL NOT NULL,
                    created_at TEXT NOT NULL
                );
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_transactions_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS transactions (
                    id TEXT PRIMARY KEY NOT NULL,
                    account_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    amount REAL NOT NULL,
                    label TEXT NOT NULL,
                    category TEXT NOT NULL,
                    notes TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(account_id) REFERENCES accounts(id)
                );
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "recreate_transactions_with_on_delete_cascade",
            sql: r#"
                PRAGMA foreign_keys = OFF;

                CREATE TABLE IF NOT EXISTS transactions_new (
                    id TEXT PRIMARY KEY NOT NULL,
                    account_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    amount REAL NOT NULL,
                    label TEXT NOT NULL,
                    category TEXT NOT NULL,
                    notes TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
                );

                INSERT INTO transactions_new (
                    id, account_id, date, amount, label, category, notes, created_at
                )
                SELECT
                    id, account_id, date, amount, label, category, notes, created_at
                FROM transactions;

                DROP TABLE transactions;
                ALTER TABLE transactions_new RENAME TO transactions;

                CREATE INDEX IF NOT EXISTS idx_transactions_account_id
                    ON transactions(account_id);

                CREATE INDEX IF NOT EXISTS idx_transactions_date
                    ON transactions(date);

                PRAGMA foreign_keys = ON;
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_categories_and_recreate_transactions_with_category_fk",
            sql: r#"
                PRAGMA foreign_keys = OFF;

                CREATE TABLE IF NOT EXISTS categories (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL UNIQUE,
                    color TEXT,
                    created_at TEXT NOT NULL
                );

                ALTER TABLE transactions RENAME TO transactions_old;

                CREATE TABLE transactions (
                    id TEXT PRIMARY KEY NOT NULL,
                    account_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    amount REAL NOT NULL,
                    label TEXT NOT NULL,
                    category_id TEXT,
                    notes TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE
                );

                INSERT INTO transactions (
                    id, account_id, date, amount, label, category_id, notes, created_at
                )
                SELECT
                    id, account_id, date, amount, label, NULL, notes, created_at
                FROM transactions_old;

                DROP TABLE transactions_old;

                CREATE INDEX IF NOT EXISTS idx_transactions_account_id
                    ON transactions(account_id);

                CREATE INDEX IF NOT EXISTS idx_transactions_date
                    ON transactions(date);

                CREATE INDEX IF NOT EXISTS idx_transactions_category_id
                    ON transactions(category_id);

                CREATE INDEX IF NOT EXISTS idx_categories_name
                    ON categories(name);

                PRAGMA foreign_keys = ON;
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_cleared_at_and_reference_to_transactions",
            sql: r#"
                ALTER TABLE transactions ADD COLUMN cleared_at TEXT;
                ALTER TABLE transactions ADD COLUMN reference TEXT;

                CREATE INDEX IF NOT EXISTS idx_transactions_cleared_at
                    ON transactions(cleared_at);

                CREATE INDEX IF NOT EXISTS idx_transactions_reference
                    ON transactions(reference);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_payment_methods_and_link_to_transactions",
            sql: r#"
                PRAGMA foreign_keys = OFF;

                CREATE TABLE IF NOT EXISTS payment_methods (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL UNIQUE,
                    kind TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                ALTER TABLE transactions RENAME TO transactions_old;

                CREATE TABLE transactions (
                    id TEXT PRIMARY KEY NOT NULL,
                    account_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    amount REAL NOT NULL,
                    label TEXT NOT NULL,
                    category_id TEXT,
                    cleared_at TEXT,
                    reference TEXT,
                    payment_method_id TEXT,
                    notes TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (account_id)
                        REFERENCES accounts(id)
                        ON DELETE CASCADE
                        ON UPDATE CASCADE,
                    FOREIGN KEY (category_id)
                        REFERENCES categories(id)
                        ON DELETE SET NULL
                        ON UPDATE CASCADE,
                    FOREIGN KEY (payment_method_id)
                        REFERENCES payment_methods(id)
                        ON DELETE RESTRICT
                        ON UPDATE CASCADE
                );

                INSERT INTO transactions (
                    id,
                    account_id,
                    date,
                    amount,
                    label,
                    category_id,
                    cleared_at,
                    reference,
                    payment_method_id,
                    notes,
                    created_at
                )
                SELECT
                    id,
                    account_id,
                    date,
                    amount,
                    label,
                    category_id,
                    cleared_at,
                    reference,
                    NULL AS payment_method_id,
                    notes,
                    created_at
                FROM transactions_old;

                DROP TABLE transactions_old;

                CREATE INDEX IF NOT EXISTS idx_transactions_account_id
                    ON transactions(account_id);

                CREATE INDEX IF NOT EXISTS idx_transactions_category_id
                    ON transactions(category_id);

                CREATE INDEX IF NOT EXISTS idx_transactions_payment_method_id
                    ON transactions(payment_method_id);

                CREATE INDEX IF NOT EXISTS idx_transactions_date
                    ON transactions(date);

                CREATE INDEX IF NOT EXISTS idx_payment_methods_name
                    ON payment_methods(name);

                PRAGMA foreign_keys = ON;
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "add_budget",
            sql: r#"
                CREATE TABLE budgets (
                    id TEXT PRIMARY KEY NOT NULL,
                    category_id TEXT NOT NULL,
                    year INTEGER NOT NULL,
                    annual_amount REAL NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
                    UNIQUE (category_id, year)
                );
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "add_budget",
            sql: r#"
                CREATE TABLE IF NOT EXISTS deadlines (
                    id TEXT PRIMARY KEY,
                    label TEXT NOT NULL,
                    amount REAL NOT NULL,
                    currency TEXT NOT NULL,
                    account_id TEXT NOT NULL,
                    category_id TEXT,
                    frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'annual')),
                    day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
                    start_date TEXT NOT NULL,
                    end_date TEXT,
                    auto_create_transaction INTEGER NOT NULL DEFAULT 1,
                    last_applied_at TEXT,
                    last_transaction_id TEXT,
                    notes TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
                    FOREIGN KEY (last_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
                );

                CREATE INDEX IF NOT EXISTS idx_deadlines_account_id ON deadlines(account_id);
                CREATE INDEX IF NOT EXISTS idx_deadlines_category_id ON deadlines(category_id);
                CREATE INDEX IF NOT EXISTS idx_deadlines_start_date ON deadlines(start_date);
                CREATE INDEX IF NOT EXISTS idx_deadlines_end_date ON deadlines(end_date);
            "#,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:vault.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}