use tauri_plugin_sql::{Migration, MigrationKind};

fn database_url() -> &'static str {
    if cfg!(debug_assertions) {
        "sqlite:vault.dev.db"
    } else {
        "sqlite:vault.db"
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create_initial_schema",
        sql: r#"
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                currency TEXT NOT NULL,
                opening_balance REAL NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL UNIQUE,
                color TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS payment_methods (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL UNIQUE,
                kind TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS budgets (
                id TEXT PRIMARY KEY NOT NULL,
                category_id TEXT NOT NULL,
                year INTEGER NOT NULL,
                annual_amount REAL NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (category_id)
                    REFERENCES categories(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
                UNIQUE (category_id, year)
            );

            CREATE TABLE IF NOT EXISTS transactions (
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

            CREATE TABLE IF NOT EXISTS deadlines (
                id TEXT PRIMARY KEY NOT NULL,
                label TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT NOT NULL,
                account_id TEXT NOT NULL,
                category_id TEXT,
                frequency TEXT NOT NULL CHECK (
                    frequency IN ('monthly', 'quarterly', 'annual')
                ),
                day_of_month INTEGER NOT NULL CHECK (
                    day_of_month BETWEEN 1 AND 31
                ),
                start_date TEXT NOT NULL,
                end_date TEXT,
                auto_create_transaction INTEGER NOT NULL DEFAULT 1,
                last_applied_at TEXT,
                last_transaction_id TEXT,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (account_id)
                    REFERENCES accounts(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
                FOREIGN KEY (category_id)
                    REFERENCES categories(id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE,
                FOREIGN KEY (last_transaction_id)
                    REFERENCES transactions(id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_accounts_name
                ON accounts(name);

            CREATE INDEX IF NOT EXISTS idx_categories_name
                ON categories(name);

            CREATE INDEX IF NOT EXISTS idx_payment_methods_name
                ON payment_methods(name);

            CREATE INDEX IF NOT EXISTS idx_budgets_category_id
                ON budgets(category_id);

            CREATE INDEX IF NOT EXISTS idx_budgets_year
                ON budgets(year);

            CREATE INDEX IF NOT EXISTS idx_transactions_account_id
                ON transactions(account_id);

            CREATE INDEX IF NOT EXISTS idx_transactions_category_id
                ON transactions(category_id);

            CREATE INDEX IF NOT EXISTS idx_transactions_payment_method_id
                ON transactions(payment_method_id);

            CREATE INDEX IF NOT EXISTS idx_transactions_date
                ON transactions(date);

            CREATE INDEX IF NOT EXISTS idx_transactions_cleared_at
                ON transactions(cleared_at);

            CREATE INDEX IF NOT EXISTS idx_transactions_reference
                ON transactions(reference);

            CREATE INDEX IF NOT EXISTS idx_deadlines_account_id
                ON deadlines(account_id);

            CREATE INDEX IF NOT EXISTS idx_deadlines_category_id
                ON deadlines(category_id);

            CREATE INDEX IF NOT EXISTS idx_deadlines_start_date
                ON deadlines(start_date);

            CREATE INDEX IF NOT EXISTS idx_deadlines_end_date
                ON deadlines(end_date);

            CREATE INDEX IF NOT EXISTS idx_deadlines_last_transaction_id
                ON deadlines(last_transaction_id);
        "#,
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(database_url(), migrations)
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}