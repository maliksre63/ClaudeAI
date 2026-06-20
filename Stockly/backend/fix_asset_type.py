import sqlite3

con = sqlite3.connect("stockly.db")
cur = con.cursor()

# Korrigiere alle USD-Ticker auf asset_type='crypto'
cur.execute("UPDATE trades SET asset_type='crypto' WHERE ticker LIKE '%-USD' AND asset_type != 'crypto'")
con.commit()
print(f"Korrigiert: {cur.rowcount} Trades")

# Verifikation
cur.execute("SELECT id, ticker, name, asset_type FROM trades WHERE ticker LIKE '%-USD'")
rows = cur.fetchall()
print("Alle USD-Trades:")
for r in rows:
    print(r)

con.close()
