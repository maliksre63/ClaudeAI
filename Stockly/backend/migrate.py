import sqlite3, os, json

db_path = os.path.join(os.path.dirname(__file__), 'stockly.db')
if not os.path.exists(db_path):
    print('No existing DB — will be created fresh on first run.')
    exit(0)

conn = sqlite3.connect(db_path)
c = conn.cursor()

migrations = [
    ('onboarding_done', 'INTEGER DEFAULT 0'),
    ('interests',       'TEXT DEFAULT "[]"'),
]

for col, definition in migrations:
    try:
        c.execute(f'ALTER TABLE users ADD COLUMN {col} {definition}')
        print(f'  + Added column: {col}')
    except Exception as e:
        print(f'  ~ Skip {col}: already exists')

c.execute('''CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    ticker TEXT NOT NULL,
    name TEXT DEFAULT "",
    asset_type TEXT DEFAULT "stock",
    category TEXT DEFAULT "",
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
)''')
print('  + Watchlist table: OK')

conn.commit()
conn.close()
print('\nMigration complete.')
