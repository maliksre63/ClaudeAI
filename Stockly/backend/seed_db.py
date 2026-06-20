"""
Seed 10 test accounts with realistic trade histories.
Run: python seed_db.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from database import engine, get_db, Base, SessionLocal
import models, auth
from datetime import datetime, timedelta
import random

Base.metadata.create_all(bind=engine)

USERS = [
    {"username":"max_mueller",    "email":"max@stockly.de",      "password":"test1234", "risk_profile":"moderat",     "xp":320,  "level":3, "interests":["tech","etf"]},
    {"username":"sophie_k",       "email":"sophie@stockly.de",   "password":"test1234", "risk_profile":"moderat",     "xp":780,  "level":4, "interests":["tech","usa"]},
    {"username":"trading_pro",    "email":"pro@stockly.de",      "password":"test1234", "risk_profile":"aggressiv",   "xp":2800, "level":6, "interests":["tech","krypto"]},
    {"username":"krypto_fan",     "email":"krypto@stockly.de",   "password":"test1234", "risk_profile":"aggressiv",   "xp":1600, "level":5, "interests":["krypto"]},
    {"username":"dividend_dave",  "email":"dave@stockly.de",     "password":"test1234", "risk_profile":"konservativ", "xp":450,  "level":3, "interests":["etf","dividenden"]},
    {"username":"anna_invest",    "email":"anna@stockly.de",     "password":"test1234", "risk_profile":"konservativ", "xp":120,  "level":1, "interests":["etf"]},
    {"username":"felix_dax",      "email":"felix@stockly.de",    "password":"test1234", "risk_profile":"moderat",     "xp":900,  "level":4, "interests":["dax","deutschland"]},
    {"username":"luna_trades",    "email":"luna@stockly.de",     "password":"test1234", "risk_profile":"aggressiv",   "xp":3200, "level":7, "interests":["tech","krypto","usa"]},
    {"username":"demo_user",      "email":"demo@stockly.de",     "password":"demo1234", "risk_profile":"moderat",     "xp":0,    "level":1, "interests":[]},
    {"username":"admin_test",     "email":"admin@stockly.de",    "password":"admin1234","risk_profile":"aggressiv",   "xp":8500, "level":9, "interests":["tech","krypto","etf","dividenden"]},
]

# Trade templates per profile type
TRADES_TECH = [
    ("AAPL", "Apple Inc.", "stock", "buy",  10, 168.50),
    ("MSFT", "Microsoft", "stock", "buy",    5, 415.00),
    ("NVDA", "NVIDIA", "stock", "buy",       3, 875.00),
    ("TSLA", "Tesla", "stock", "buy",        8, 195.00),
    ("AAPL", "Apple Inc.", "stock", "sell",  3, 185.00),
    ("META", "Meta Platforms", "stock", "buy", 4, 520.00),
    ("GOOG", "Alphabet", "stock", "buy",     2, 175.00),
    ("NVDA", "NVIDIA", "stock", "sell",      1, 950.00),
]
TRADES_CRYPTO = [
    ("BTC-USD", "Bitcoin", "crypto", "buy",  0.05, 42000),
    ("ETH-USD", "Ethereum", "crypto", "buy", 0.5,  2200),
    ("SOL-USD", "Solana", "crypto", "buy",   5,    95.0),
    ("BNB-USD", "BNB", "crypto", "buy",      2,    310.0),
    ("ETH-USD", "Ethereum", "crypto", "sell",0.2,  2800),
    ("SOL-USD", "Solana", "crypto", "buy",   10,   130.0),
    ("DOGE-USD","Dogecoin", "crypto", "buy", 500,  0.08),
    ("BTC-USD", "Bitcoin", "crypto", "sell", 0.02, 65000),
]
TRADES_ETF = [
    ("VWCE.DE", "Vanguard FTSE All-World", "etf", "buy", 5, 105.0),
    ("EUNL.DE", "iShares MSCI World", "etf", "buy",      8, 68.0),
    ("SPY", "SPDR S&P 500 ETF", "etf", "buy",            3, 480.0),
    ("QQQ", "Invesco NASDAQ 100", "etf", "buy",          2, 425.0),
    ("VWCE.DE", "Vanguard FTSE All-World", "etf", "buy", 3, 112.0),
    ("XLK", "Technology ETF", "etf", "buy",              4, 205.0),
]
TRADES_DAX = [
    ("SAP.DE",  "SAP SE", "stock", "buy",   5, 172.0),
    ("SIE.DE",  "Siemens AG", "stock", "buy", 3, 168.0),
    ("ALV.DE",  "Allianz SE", "stock", "buy", 4, 265.0),
    ("BMW.DE",  "BMW AG", "stock", "buy",    6, 92.0),
    ("RHM.DE",  "Rheinmetall AG", "stock", "buy", 2, 520.0),
    ("DBK.DE",  "Deutsche Bank", "stock", "buy", 20, 14.5),
    ("SAP.DE",  "SAP SE", "stock", "sell",   2, 192.0),
    ("DTE.DE",  "Deutsche Telekom", "stock", "buy", 15, 22.5),
]

EMOTIONS = ["calm", "confident", "calm", "", "greed", "fear", "", "calm", "confident", ""]

def make_trades(db, user_id: int, trade_list: list, days_back: int = 90):
    now = datetime.now()
    for i, t in enumerate(trade_list):
        ticker, name, atype, action, shares, price = t
        noise = random.uniform(0.95, 1.05)
        actual_price = price * noise
        total = shares * actual_price
        days_ago = random.randint(1, days_back)
        created = now - timedelta(days=days_ago, hours=random.randint(0,8))
        trade = models.Trade(
            user_id=user_id, ticker=ticker, name=name, asset_type=atype,
            action=action, shares=shares, price=round(actual_price,2),
            total=round(total,2), emotion=EMOTIONS[i % len(EMOTIONS)],
            created_at=created,
        )
        db.add(trade)
    # Build positions from buy trades
    positions = {}
    for ticker, name, atype, action, shares, price in trade_list:
        if action == "buy":
            if ticker not in positions:
                positions[ticker] = {"name":name,"atype":atype,"shares":0,"total":0}
            positions[ticker]["shares"] += shares
            positions[ticker]["total"] += shares * price
        elif action == "sell" and ticker in positions:
            positions[ticker]["shares"] = max(0, positions[ticker]["shares"] - shares)
    for ticker, d in positions.items():
        if d["shares"] > 0.0001:
            avg = d["total"] / (d["shares"] + sum(s for t,n,a,ac,s,p in trade_list if t==ticker and ac=="buy"))
            pos = models.Position(
                user_id=user_id, ticker=ticker, name=d["name"],
                asset_type=d["atype"], shares=d["shares"],
                avg_price=round(avg, 4),
            )
            db.add(pos)

def seed():
    db = SessionLocal()
    try:
        for u in USERS:
            if db.query(models.User).filter(models.User.email == u["email"]).first():
                print(f"  --  {u['username']} bereits vorhanden")
                continue
            user = models.User(
                email=u["email"], username=u["username"],
                hashed_pw=auth.hash_password(u["password"]),
                virtual_cash=999999.0,
                xp=u["xp"], level=u["level"],
                risk_profile=u["risk_profile"],
                interests=u["interests"],
                onboarding_done=True,
                streak=random.randint(0,14),
            )
            db.add(user); db.flush()

            # Assign trades based on interests
            trade_list = []
            interests = u["interests"]
            if "tech" in interests or "usa" in interests:
                trade_list += TRADES_TECH
            if "krypto" in interests:
                trade_list += TRADES_CRYPTO
            if "etf" in interests or "dividenden" in interests:
                trade_list += TRADES_ETF
            if "dax" in interests or "deutschland" in interests:
                trade_list += TRADES_DAX
            if u["username"] == "admin_test":
                trade_list = TRADES_TECH + TRADES_CRYPTO + TRADES_ETF + TRADES_DAX
            if u["username"] == "luna_trades":
                trade_list = TRADES_TECH * 2 + TRADES_CRYPTO
            if trade_list:
                make_trades(db, user.id, trade_list)

            db.commit()
            print(f"  OK  {u['username']} ({u['email']}) -- {len(trade_list)} Trades")
        print("\nSeed abgeschlossen!")
    finally:
        db.close()

if __name__ == "__main__":
    print("Erstelle 10 Test-Accounts...\n")
    seed()
