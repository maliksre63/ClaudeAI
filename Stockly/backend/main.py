from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import io, csv

import models, auth, market, ai_mentor, assets as asset_db
from database import engine, get_db, Base
import json as _json

Base.metadata.create_all(bind=engine)

# ── Per-user AI provider keys (stored in user_keys.json) ─────────────────────
_USER_KEYS_FILE = __import__('os').path.join(__import__('os').path.dirname(__file__), "user_keys.json")

def _load_user_keys() -> dict:
    try:
        with open(_USER_KEYS_FILE) as f:
            return _json.load(f)
    except Exception:
        return {}

def _save_user_keys(data: dict):
    with open(_USER_KEYS_FILE, "w") as f:
        _json.dump(data, f, indent=2)

def _get_user_keys(user_id: int) -> dict:
    return _load_user_keys().get(str(user_id), {})

app = FastAPI(title="Stockly API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "app://./index.html"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schemas ────────────────────────────────────────────────────────────────────
class RegisterSchema(BaseModel):
    email:    str
    username: str
    password: str

class TradeSchema(BaseModel):
    ticker:    str
    name:      str = ""
    asset_type:str = "stock"
    action:    str
    shares:    float
    price:     float
    emotion:   str = ""
    note:      str = ""

class ChatSchema(BaseModel):
    messages:     list
    context:      str = "general"
    provider:     str = "auto"    # auto | anthropic | openai | gemini | mistral

class ProfileSchema(BaseModel):
    risk_profile:    Optional[str] = None
    lang:            Optional[str] = None
    onboarding_done: Optional[bool] = None
    interests:       Optional[List[str]] = None

class LessonDoneSchema(BaseModel):
    slug: str
    xp:   int = 50

class GameXPSchema(BaseModel):
    amount: int
    reason: str = ""

class AlertSchema(BaseModel):
    ticker:    str
    name:      str = ""
    direction: str  # "below" | "above"
    target:    float

class WatchlistSchema(BaseModel):
    ticker:    str
    name:      str = ""
    asset_type:str = "stock"
    category:  str = ""

class SettingsSchema(BaseModel):
    api_key:            Optional[str] = None
    anthropic_api_key:  Optional[str] = None
    openai_api_key:     Optional[str] = None
    gemini_api_key:     Optional[str] = None
    mistral_api_key:    Optional[str] = None
    preferred_provider: Optional[str] = None

# ── Helper ─────────────────────────────────────────────────────────────────────
def _user_out(u: models.User) -> dict:
    return {
        "id": u.id, "email": u.email, "username": u.username,
        "plan": u.plan,
        "xp": u.xp, "level": u.level, "streak": u.streak,
        "risk_profile": u.risk_profile, "lang": u.lang,
        "badges": u.badges or [], "done_lessons": u.done_lessons or [],
        "onboarding_done": u.onboarding_done,
        "interests": u.interests or [],
        "created_at": str(u.created_at),
    }

def _calc_level(xp: int) -> int:
    for i, t in reversed(list(enumerate([0,150,400,800,1500,2500,4000,6000,9000,13000]))):
        if xp >= t: return i + 1
    return 1

# ── Auth ───────────────────────────────────────────────────────────────────────
@app.post("/api/auth/register")
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(400, "E-Mail bereits registriert")
    if db.query(models.User).filter(models.User.username == data.username).first():
        raise HTTPException(400, "Benutzername bereits vergeben")
    user = models.User(
        email=data.email, username=data.username,
        hashed_pw=auth.hash_password(data.password),
        virtual_cash=999999.0,
    )
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token": auth.create_token({"sub": str(user.id)}), "token_type": "bearer", "user": _user_out(user)}

@app.post("/api/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form.username).first()
    if not user or not auth.verify_password(form.password, user.hashed_pw):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Falsche E-Mail oder Passwort")
    today = str(date.today())
    if user.last_login != today:
        try:
            last = date.fromisoformat(user.last_login) if user.last_login else None
            diff = (date.today() - last).days if last else 999
            user.streak = (user.streak + 1) if diff == 1 else 1
        except Exception:
            user.streak = 1
        user.last_login = today
        db.commit()
    return {"access_token": auth.create_token({"sub": str(user.id)}), "token_type": "bearer", "user": _user_out(user)}

@app.get("/api/auth/me")
def me(user: models.User = Depends(auth.get_current_user)):
    return _user_out(user)

# ── User / Profile ─────────────────────────────────────────────────────────────
@app.patch("/api/user/profile")
def update_profile(data: ProfileSchema, user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if data.risk_profile is not None: user.risk_profile = data.risk_profile
    if data.lang is not None:         user.lang = data.lang
    if data.onboarding_done is not None: user.onboarding_done = data.onboarding_done
    if data.interests is not None:    user.interests = data.interests
    db.commit(); db.refresh(user)
    return _user_out(user)

@app.post("/api/user/lesson-done")
def lesson_done(data: LessonDoneSchema, user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    done = list(user.done_lessons or [])
    if data.slug not in done:
        done.append(data.slug); user.done_lessons = done
        user.xp += data.xp; user.level = _calc_level(user.xp)
        db.commit()
    return _user_out(user)

@app.post("/api/game/xp")
def award_game_xp(data: GameXPSchema, user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    amount = max(0, min(int(data.amount), 250))
    user.xp += amount
    user.level = _calc_level(user.xp)
    db.add(user); db.commit(); db.refresh(user)
    return _user_out(user)

@app.post("/api/user/settings")
def save_settings(data: SettingsSchema, user: models.User = Depends(auth.get_current_user)):
    import os
    keys = _load_user_keys()
    uid  = str(user.id)
    if uid not in keys:
        keys[uid] = {}

    # Handle per-provider keys
    provider_map = {
        'anthropic': data.api_key or data.anthropic_api_key,
        'openai':    data.openai_api_key,
        'gemini':    data.gemini_api_key,
        'mistral':   data.mistral_api_key,
    }
    for provider, key in provider_map.items():
        if key is not None:
            if key.strip():
                keys[uid][provider] = key.strip()
            else:
                keys[uid].pop(provider, None)  # empty string = remove key

    if data.preferred_provider is not None:
        keys[uid]['preferred'] = data.preferred_provider

    _save_user_keys(keys)

    # Also update global Anthropic key for backward compat
    ant_key = provider_map.get('anthropic')
    if ant_key:
        env_path = os.path.join(os.path.dirname(__file__), ".env")
        lines = []; found = False
        try:
            with open(env_path) as f:
                for line in f:
                    if line.startswith("ANTHROPIC_API_KEY"):
                        lines.append(f"ANTHROPIC_API_KEY={ant_key}\n"); found = True
                    else:
                        lines.append(line)
        except FileNotFoundError:
            pass
        if not found:
            lines.append(f"ANTHROPIC_API_KEY={ant_key}\n")
        with open(env_path, "w") as f:
            f.writelines(lines)
        os.environ["ANTHROPIC_API_KEY"] = ant_key
        ai_mentor.API_KEY = ant_key
        ai_mentor._client = None

    return {"success": True}

@app.get("/api/user/ai-providers")
def get_ai_providers(user: models.User = Depends(auth.get_current_user)):
    """Return which providers the user has configured (keys masked)."""
    uk = _get_user_keys(user.id)
    result = {}
    for pid, meta in ai_mentor.PROVIDERS.items():
        key = uk.get(pid, "")
        result[pid] = {
            **meta,
            'configured': bool(key),
            'key_preview': f"{key[:8]}…" if key else "",
        }
    return {"providers": result, "preferred": uk.get("preferred", "auto")}

# ── Portfolio & Trades ─────────────────────────────────────────────────────────
@app.get("/api/portfolio/value")
def portfolio_value(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    positions = db.query(models.Position).filter(models.Position.user_id == user.id).all()
    result = []
    for p in positions:
        cur = market.get_live_price(p.ticker)
        invested = p.shares * p.avg_price
        current  = p.shares * cur if cur else None
        pnl      = current - invested if current else None
        pnl_pct  = pnl / invested * 100 if pnl is not None and invested else None
        result.append({
            "id": p.id, "ticker": p.ticker, "name": p.name,
            "asset_type": p.asset_type, "shares": p.shares,
            "avg_price": p.avg_price, "current_price": cur,
            "invested": invested, "current_value": current,
            "pnl": pnl, "pnl_pct": pnl_pct,
        })
    total_inv = sum(r["invested"] for r in result)
    total_cur = sum(r["current_value"] for r in result if r["current_value"])
    return {
        "positions": result,
        "total_invested": total_inv,
        "total_current": total_cur,
        "total_pnl": total_cur - total_inv if total_cur else None,
        "position_count": len(result),
    }

@app.post("/api/trade")
def execute_trade(data: TradeSchema, user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    total = data.shares * data.price

    if data.action == "buy":
        pos = db.query(models.Position).filter(
            models.Position.user_id == user.id,
            models.Position.ticker  == data.ticker
        ).first()
        if pos:
            total_shares = pos.shares + data.shares
            pos.avg_price = (pos.shares * pos.avg_price + total) / total_shares
            pos.shares    = total_shares
        else:
            pos = models.Position(
                user_id=user.id, ticker=data.ticker, name=data.name,
                asset_type=data.asset_type, shares=data.shares, avg_price=data.price
            )
            db.add(pos)

    elif data.action == "sell":
        pos = db.query(models.Position).filter(
            models.Position.user_id == user.id,
            models.Position.ticker  == data.ticker
        ).first()
        if not pos or pos.shares < data.shares:
            raise HTTPException(400, "Nicht genug Anteile")
        pos.shares -= data.shares
        if pos.shares <= 0.0001:
            db.delete(pos)

    trade = models.Trade(
        user_id=user.id, ticker=data.ticker, name=data.name,
        asset_type=data.asset_type, action=data.action,
        shares=data.shares, price=data.price, total=total,
        emotion=data.emotion, note=data.note,
    )
    db.add(trade)
    user.xp += 10; user.level = _calc_level(user.xp)
    db.commit(); db.refresh(user)

    emotion_feedback = ""
    if data.emotion:
        try: emotion_feedback = ai_mentor.analyze_emotion(data.dict(), user)
        except Exception: pass

    return {"success": True, "user": _user_out(user), "emotion_feedback": emotion_feedback}

@app.get("/api/trades")
def get_trades(limit: int = 50, user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    trades = db.query(models.Trade).filter(
        models.Trade.user_id == user.id
    ).order_by(models.Trade.created_at.desc()).limit(limit).all()
    return [{"id":t.id,"ticker":t.ticker,"name":t.name,"action":t.action,
             "shares":t.shares,"price":t.price,"total":t.total,
             "emotion":t.emotion,"note":t.note,"created_at":str(t.created_at)} for t in trades]

@app.get("/api/trades/export")
def export_trades(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    trades = db.query(models.Trade).filter(models.Trade.user_id == user.id).order_by(models.Trade.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["Datum","Typ","Asset","Ticker","Stück","Preis","Gesamt","Emotion","Notiz"])
    for t in trades:
        writer.writerow([str(t.created_at)[:16],t.action.upper(),t.name,t.ticker,
                         f"{t.shares:.4f}",f"{t.price:.2f}",f"{t.total:.2f}",t.emotion,t.note])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=stockly_trades_{user.username}.csv"}
    )

@app.get("/api/statistics")
def get_statistics(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    trades = db.query(models.Trade).filter(models.Trade.user_id == user.id).all()
    if not trades:
        return {
            "total_trades":0,"buy_count":0,"sell_count":0,"total_volume":0,
            "wins":0,"win_rate":0,"avg_return":0,
            "emotions":{},"categories":{},"monthly_volume":[],
        }
    buy_trades  = [t for t in trades if t.action == "buy"]
    sell_trades = [t for t in trades if t.action == "sell"]
    total_vol   = sum(t.total for t in trades)

    # Emotions breakdown
    emotions = {}
    for t in trades:
        if t.emotion: emotions[t.emotion] = emotions.get(t.emotion, 0) + 1

    # Category breakdown (by asset_type)
    categories = {}
    for t in trades:
        cat = t.asset_type or "Sonstige"
        categories[cat] = categories.get(cat, 0) + 1

    # Monthly volume (all trades, grouped by month)
    monthly = {}
    for t in trades:
        m = str(t.created_at)[:7]
        monthly[m] = monthly.get(m, 0) + t.total
    monthly_volume = [{"month": k.replace("-", "/"), "volume": round(v, 2)} for k, v in sorted(monthly.items())]

    # Win rate: compare positions current vs invested
    positions = db.query(models.Position).filter(models.Position.user_id == user.id).all()
    wins, total_return_pct = 0, []
    for p in positions:
        cur = market.get_live_price(p.ticker)
        if cur and p.avg_price > 0:
            ret = (cur - p.avg_price) / p.avg_price * 100
            total_return_pct.append(ret)
            if ret > 0: wins += 1
    n_pos = len(positions) or 1
    win_rate  = round((wins / n_pos) * 100, 1)
    avg_return = round(sum(total_return_pct) / len(total_return_pct), 2) if total_return_pct else 0.0

    # Asset breakdown by volume
    asset_vol = {}
    for t in trades:
        asset_vol[t.ticker] = asset_vol.get(t.ticker, 0) + t.total
    top_assets = sorted(asset_vol.items(), key=lambda x: -x[1])[:5]

    return {
        "total_trades": len(trades),
        "buy_count":    len(buy_trades),
        "sell_count":   len(sell_trades),
        "total_volume": round(total_vol, 2),
        "avg_trade_size": round(total_vol / len(trades), 2),
        "wins":         wins,
        "win_rate":     win_rate,
        "avg_return":   avg_return,
        "emotions":     emotions,
        "categories":   categories,
        "monthly_volume": monthly_volume,
        "top_assets":   [{"ticker":k,"volume":round(v,2)} for k,v in top_assets],
    }

# ── Market & Assets ────────────────────────────────────────────────────────────
@app.get("/api/assets/search")
def search_assets(q: str = "", category: str = "", limit: int = 20):
    if q:
        results = asset_db.search(q, limit)
    elif category:
        results = asset_db.get_by_category(category)[:limit]
    else:
        # Return popular defaults
        popular = ["AAPL","NVDA","MSFT","TSLA","BTC-USD","ETH-USD","SAP.DE","VWCE.DE","VOW3.DE","AMZN"]
        results = [asset_db.get_by_ticker(t) for t in popular if asset_db.get_by_ticker(t)]
    return {"results": results, "total": len(results)}

@app.get("/api/assets/categories")
def get_categories():
    return {"categories": asset_db.get_categories()}

@app.get("/api/assets/{ticker}")
def get_asset(ticker: str):
    a = asset_db.get_by_ticker(ticker)
    if not a: raise HTTPException(404, "Asset nicht gefunden")
    return a

@app.get("/api/market/{segment}")
def get_market(segment: str, force: bool = False):
    key = f"mkt_{segment}"
    if force:
        import market as m
        with m._lock: m._cache.pop(key, None)
    data = market.fetch_crypto_market() if segment == "crypto" else market.fetch_market(segment)
    return {"data": data, "timestamp": datetime.now().strftime("%H:%M:%S")}

@app.get("/api/market/price/{ticker}")
def get_price(ticker: str):
    price = market.get_live_price(ticker)
    if price is None: raise HTTPException(404, "Kurs nicht gefunden")
    return {"ticker": ticker, "price": price}

@app.get("/api/price/{ticker}")
def get_price_short(ticker: str):
    price = market.get_live_price(ticker)
    if price is None: raise HTTPException(404, "Kurs nicht gefunden")
    return {"ticker": ticker, "price": price, "change_pct": None}

@app.get("/api/chart/{ticker}")
def get_chart(ticker: str, period: str = "1mo"):
    """Return OHLC history for charting."""
    try:
        import yfinance as yf
        t = yf.Ticker(ticker)
        if period in ["3mo","6mo","1y","2y","5y"]:
            interval = "1d"
        elif period == "7d":
            interval = "1h"
        else:
            interval = "1h"
        hist = t.history(period=period, interval=interval)
        if hist.empty: raise HTTPException(404, "Keine Daten")
        data = []
        for ts, row in hist.iterrows():
            try:
                ts_local = ts.tz_localize(None) if ts.tzinfo else ts
                date_str = ts_local.strftime("%d.%m.%y %H:%M") if interval != "1d" else ts_local.strftime("%d.%m.%y")
            except Exception:
                date_str = str(ts)[:10]
            data.append({
                "time":  int(ts.timestamp()),
                "date":  date_str,
                "open":  round(float(row["Open"]),4),
                "high":  round(float(row["High"]),4),
                "low":   round(float(row["Low"]),4),
                "close": round(float(row["Close"]),4),
                "volume":int(row.get("Volume",0)),
            })
        return {"ticker": ticker, "period": period, "data": data}
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(500, str(e))

# ── Watchlist ──────────────────────────────────────────────────────────────────
@app.get("/api/watchlist")
def get_watchlist(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    items = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user.id).all()
    result = []
    for item in items:
        price = market.get_live_price(item.ticker)
        result.append({
            "id": item.id, "ticker": item.ticker, "name": item.name,
            "asset_type": item.asset_type, "category": item.category,
            "price": price, "added_at": str(item.added_at),
        })
    return result

@app.post("/api/watchlist")
def add_to_watchlist(data: WatchlistSchema, user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    existing = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.user_id == user.id,
        models.WatchlistItem.ticker  == data.ticker
    ).first()
    if existing: raise HTTPException(400, "Bereits in Watchlist")
    item = models.WatchlistItem(
        user_id=user.id, ticker=data.ticker, name=data.name,
        asset_type=data.asset_type, category=data.category,
    )
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.id, "ticker": item.ticker}

@app.delete("/api/watchlist/{item_id}")
def remove_from_watchlist(item_id: int, user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    item = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.id == item_id,
        models.WatchlistItem.user_id == user.id
    ).first()
    if not item: raise HTTPException(404, "Nicht gefunden")
    db.delete(item); db.commit()
    return {"success": True}

# ── AI Mentor ──────────────────────────────────────────────────────────────────
@app.post("/api/mentor/chat")
def mentor_chat(data: ChatSchema, user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    uk       = _get_user_keys(user.id)
    provider = data.provider if data.provider != "auto" else uk.get("preferred", "auto")
    pkey     = uk.get(provider, "") if provider != "auto" else ""
    reply    = ai_mentor.chat(data.messages, user, data.context, provider=provider, provider_key=pkey)
    session = db.query(models.ChatSession).filter(models.ChatSession.user_id == user.id).order_by(models.ChatSession.created_at.desc()).first()
    if not session:
        session = models.ChatSession(user_id=user.id, messages=[], context=data.context)
        db.add(session)
    msgs = list(data.messages)
    msgs.append({"role": "assistant", "content": reply})
    session.messages = msgs[-40:]
    db.commit()
    return {"reply": reply}

@app.get("/api/mentor/history")
def mentor_history(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    session = db.query(models.ChatSession).filter(models.ChatSession.user_id == user.id).order_by(models.ChatSession.created_at.desc()).first()
    return {"messages": session.messages if session else []}

# ── Lessons ────────────────────────────────────────────────────────────────────
LESSONS_DATA = [
    {"slug":"was-ist-eine-aktie","title":"Was ist eine Aktie?","level_req":1,"xp_reward":50,"order_index":1,
     "description":"Lerne was eine Aktie ist und warum Menschen sie kaufen.",
     "content":"Eine Aktie ist ein kleiner Anteil an einem Unternehmen. Wenn du eine Apple-Aktie kaufst, gehört dir ein winziger Teil von Apple. Wenn Apple wächst, wächst dein Anteil mit. Das nennt man Kapitalrendite.\n\nBeispiel: Du kaufst 10 Apple-Aktien zu je 150€. Steigt Apple um 20%, sind deine Aktien 180€ wert — du hast 300€ gewonnen, ohne einen Finger zu rühren."},
    {"slug":"was-ist-rsi","title":"RSI verstehen","level_req":1,"xp_reward":60,"order_index":2,
     "description":"Der RSI zeigt ob eine Aktie überverkauft oder überkauft ist.",
     "content":"RSI steht für Relative Strength Index und geht von 0 bis 100.\n\nUnter 30: die Aktie wurde zu stark verkauft — mögliches Kaufsignal.\nÜber 70: zu stark gekauft — Vorsicht, Rücksetzer möglich.\n\nStell dir vor: ein Gummiband das zu weit gedehnt wird, springt zurück. Genau so reagiert oft der Kurs."},
    {"slug":"was-ist-macd","title":"MACD erklärt","level_req":2,"xp_reward":70,"order_index":3,
     "description":"MACD zeigt die Stärke und Richtung eines Trends.",
     "content":"MACD vergleicht zwei gleitende Durchschnitte (12-Tage vs. 26-Tage).\n\nMACD über Signallinie → Aufwärtstrend (bullish).\nMACD unter Signallinie → Abwärtstrend (bearish).\n\nEinfach gesagt: MACD zeigt ob mehr Leute kaufen oder verkaufen — und wie stark."},
    {"slug":"stop-loss","title":"Stop-Loss: Verluste begrenzen","level_req":2,"xp_reward":80,"order_index":4,
     "description":"Ein Stop-Loss schützt dich vor großen Verlusten.",
     "content":"Ein Stop-Loss ist ein automatischer Verkaufsauftrag.\n\nBeispiel: Du kaufst Apple für 150€ und setzt Stop-Loss bei 135€. Fällt der Kurs auf 135€, wird automatisch verkauft — du verlierst max. 10%.\n\nOhne Stop-Loss: Hoffnung auf Erholung → oft noch größere Verluste."},
    {"slug":"diversifikation","title":"Diversifikation","level_req":3,"xp_reward":90,"order_index":5,
     "description":"Warum du nie alles auf eine Karte setzen solltest.",
     "content":"Lege nicht alle Eier in einen Korb!\n\nMit einer Aktie: fällt die, verlierst du alles.\nMit 20 Aktien aus verschiedenen Branchen: fällt eine, halten die anderen dagegen.\n\nFaustregel: Keine einzelne Position über 5-10% deines Gesamtdepots."},
    {"slug":"etf-grundlagen","title":"ETFs — Einfach erklärt","level_req":2,"xp_reward":75,"order_index":6,
     "description":"Was sind ETFs und warum sind sie für Anfänger perfekt?",
     "content":"Ein ETF (Exchange Traded Fund) bündelt viele Aktien in einem Produkt.\n\nMSCI World ETF = Anteile an ~1600 Unternehmen aus 23 Ländern — in einer Transaktion!\n\nVorteile: Geringe Kosten (0,1-0,3% p.a.), automatische Diversifikation, transparente Zusammensetzung.\n\nStudien zeigen: 85% der aktiv gemanagten Fonds schneiden langfristig schlechter ab als ein einfacher ETF."},
    {"slug":"trading-psychologie","title":"Trading-Psychologie","level_req":3,"xp_reward":100,"order_index":7,
     "description":"Warum Emotionen dein größter Feind an der Börse sind.",
     "content":"Die zwei größten Fehler:\n\n1. Panikverkauf: Kurs fällt → sofort verkaufen aus Angst. Ergebnis: du verkaufst genau am Tiefpunkt.\n\n2. Gier: Kurs steigt → zu lange halten. Ergebnis: Gewinne werden wieder abgegeben.\n\nProfis haben feste Regeln (Stop-Loss, Take-Profit) und halten sich daran — egal wie sich die Situation anfühlt."},
    {"slug":"kgv-verstehen","title":"KGV — Was ist eine Aktie wert?","level_req":3,"xp_reward":80,"order_index":8,
     "description":"Das Kurs-Gewinn-Verhältnis erklärt.",
     "content":"KGV = Aktienkurs ÷ Gewinn je Aktie.\n\nKGV 10 bedeutet: Du zahlst 10€ für 1€ Jahresgewinn.\n\nFaustregel:\n< 15: oft günstig bewertet\n15-25: faire Bewertung\n> 30: teuer — meist bei Wachstumsunternehmen\n\nWichtig: Vergleiche KGV immer innerhalb der gleichen Branche! Tech-Firmen haben oft KGV 30-50, Banken 8-12."},
]

@app.get("/api/lessons")
def get_lessons(user: models.User = Depends(auth.get_current_user)):
    done = user.done_lessons or []
    return [{"slug":l["slug"],"title":l["title"],"description":l["description"],
             "level_req":l["level_req"],"xp_reward":l["xp_reward"],"order_index":l["order_index"],
             "completed": l["slug"] in done,
             "locked": user.level < l["level_req"]} for l in LESSONS_DATA]

@app.get("/api/lessons/{slug}")
def get_lesson(slug: str, user: models.User = Depends(auth.get_current_user)):
    for l in LESSONS_DATA:
        if l["slug"] == slug:
            if user.level < l["level_req"]: raise HTTPException(403, "Level zu niedrig")
            return {**l, "completed": slug in (user.done_lessons or [])}
    raise HTTPException(404, "Lektion nicht gefunden")

# ── Heatmap ────────────────────────────────────────────────────────────────────
HEATMAP_TICKERS = [
    # ── Tech USA ─────────────────────────────────────────────────────────────
    {"ticker":"AAPL",  "name":"Apple",       "type":"Tech"},
    {"ticker":"MSFT",  "name":"Microsoft",   "type":"Tech"},
    {"ticker":"NVDA",  "name":"NVIDIA",      "type":"Tech"},
    {"ticker":"GOOGL", "name":"Alphabet",    "type":"Tech"},
    {"ticker":"AMZN",  "name":"Amazon",      "type":"Tech"},
    {"ticker":"META",  "name":"Meta",        "type":"Tech"},
    {"ticker":"TSLA",  "name":"Tesla",       "type":"Tech"},
    {"ticker":"AMD",   "name":"AMD",         "type":"Tech"},
    {"ticker":"INTC",  "name":"Intel",       "type":"Tech"},
    {"ticker":"CRM",   "name":"Salesforce",  "type":"Tech"},
    {"ticker":"ORCL",  "name":"Oracle",      "type":"Tech"},
    {"ticker":"ADBE",  "name":"Adobe",       "type":"Tech"},
    {"ticker":"NFLX",  "name":"Netflix",     "type":"Tech"},
    {"ticker":"UBER",  "name":"Uber",        "type":"Tech"},
    {"ticker":"PLTR",  "name":"Palantir",    "type":"Tech"},
    {"ticker":"COIN",  "name":"Coinbase",    "type":"Tech"},
    {"ticker":"SHOP",  "name":"Shopify",     "type":"Tech"},
    {"ticker":"SQ",    "name":"Block (SQ)",  "type":"Tech"},
    {"ticker":"PYPL",  "name":"PayPal",      "type":"Tech"},
    {"ticker":"SNAP",  "name":"Snapchat",    "type":"Tech"},
    # ── Tech Europa ───────────────────────────────────────────────────────────
    {"ticker":"SAP.DE",  "name":"SAP",       "type":"Tech"},
    {"ticker":"ASML.AS", "name":"ASML",      "type":"Tech"},
    {"ticker":"IFX.DE",  "name":"Infineon",  "type":"Tech"},
    # ── Crypto ───────────────────────────────────────────────────────────────
    {"ticker":"BTC-USD",  "name":"Bitcoin",      "type":"Crypto"},
    {"ticker":"ETH-USD",  "name":"Ethereum",     "type":"Crypto"},
    {"ticker":"BNB-USD",  "name":"BNB",          "type":"Crypto"},
    {"ticker":"SOL-USD",  "name":"Solana",       "type":"Crypto"},
    {"ticker":"XRP-USD",  "name":"XRP",          "type":"Crypto"},
    {"ticker":"DOGE-USD", "name":"Dogecoin",     "type":"Crypto"},
    {"ticker":"ADA-USD",  "name":"Cardano",      "type":"Crypto"},
    {"ticker":"AVAX-USD", "name":"Avalanche",    "type":"Crypto"},
    {"ticker":"LINK-USD", "name":"Chainlink",    "type":"Crypto"},
    {"ticker":"DOT-USD",  "name":"Polkadot",     "type":"Crypto"},
    {"ticker":"LTC-USD",  "name":"Litecoin",     "type":"Crypto"},
    {"ticker":"BCH-USD",  "name":"Bitcoin Cash", "type":"Crypto"},
    {"ticker":"UNI-USD",  "name":"Uniswap",      "type":"Crypto"},
    {"ticker":"XLM-USD",  "name":"Stellar",      "type":"Crypto"},
    {"ticker":"TRX-USD",  "name":"TRON",         "type":"Crypto"},
    {"ticker":"SHIB-USD", "name":"Shiba Inu",    "type":"Crypto"},
    {"ticker":"NEAR-USD", "name":"NEAR Protocol","type":"Crypto"},
    {"ticker":"XMR-USD",  "name":"Monero",       "type":"Crypto"},
    {"ticker":"ICP-USD",  "name":"Internet Comp","type":"Crypto"},
    {"ticker":"POL-USD",  "name":"Polygon",      "type":"Crypto"},
    {"ticker":"ATOM-USD", "name":"Cosmos",       "type":"Crypto"},
    {"ticker":"PEPE-USD", "name":"PEPE",         "type":"Crypto"},
    {"ticker":"ARB-USD",  "name":"Arbitrum",     "type":"Crypto"},
    {"ticker":"HBAR-USD", "name":"Hedera",       "type":"Crypto"},
    {"ticker":"SUI-USD",  "name":"Sui",          "type":"Crypto"},
    {"ticker":"APT-USD",  "name":"Aptos",        "type":"Crypto"},
    {"ticker":"RENDER-USD","name":"Render",      "type":"Crypto"},
    {"ticker":"FIL-USD",  "name":"Filecoin",     "type":"Crypto"},
    {"ticker":"HYPE-USD", "name":"Hyperliquid",  "type":"Crypto"},
    # ── ETF ──────────────────────────────────────────────────────────────────
    {"ticker":"SPY",     "name":"S&P 500 ETF",   "type":"ETF"},
    {"ticker":"QQQ",     "name":"Nasdaq 100 ETF","type":"ETF"},
    {"ticker":"IWM",     "name":"Russell 2000",  "type":"ETF"},
    {"ticker":"DIA",     "name":"Dow Jones ETF", "type":"ETF"},
    {"ticker":"VTI",     "name":"Vanguard Total","type":"ETF"},
    {"ticker":"ARKK",    "name":"ARK Innovation","type":"ETF"},
    {"ticker":"VWCE.DE", "name":"MSCI World",    "type":"ETF"},
    {"ticker":"EWG",     "name":"iShares Germany","type":"ETF"},
    {"ticker":"EXXT.DE", "name":"Nasdaq DE ETF", "type":"ETF"},
    # ── Finance ──────────────────────────────────────────────────────────────
    {"ticker":"JPM",   "name":"JPMorgan",     "type":"Finance"},
    {"ticker":"GS",    "name":"Goldman Sachs","type":"Finance"},
    {"ticker":"MS",    "name":"Morgan Stanley","type":"Finance"},
    {"ticker":"BAC",   "name":"Bank of America","type":"Finance"},
    {"ticker":"V",     "name":"Visa",         "type":"Finance"},
    {"ticker":"MA",    "name":"Mastercard",   "type":"Finance"},
    {"ticker":"ALV.DE","name":"Allianz",      "type":"Finance"},
    {"ticker":"DBK.DE","name":"Deutsche Bank","type":"Finance"},
    {"ticker":"AXP",   "name":"Amex",         "type":"Finance"},
    # ── Energie ──────────────────────────────────────────────────────────────
    {"ticker":"XOM",   "name":"ExxonMobil",   "type":"Energie"},
    {"ticker":"CVX",   "name":"Chevron",      "type":"Energie"},
    {"ticker":"SHEL",  "name":"Shell",        "type":"Energie"},
    {"ticker":"RWE.DE","name":"RWE",          "type":"Energie"},
    {"ticker":"ENEL.MI","name":"Enel",        "type":"Energie"},
    # ── Healthcare ───────────────────────────────────────────────────────────
    {"ticker":"JNJ",   "name":"Johnson & J",  "type":"Healthcare"},
    {"ticker":"UNH",   "name":"UnitedHealth", "type":"Healthcare"},
    {"ticker":"PFE",   "name":"Pfizer",       "type":"Healthcare"},
    {"ticker":"LLY",   "name":"Eli Lilly",    "type":"Healthcare"},
    {"ticker":"ABBV",  "name":"AbbVie",       "type":"Healthcare"},
    {"ticker":"MRK",   "name":"Merck",        "type":"Healthcare"},
    # ── Deutsche Aktien ──────────────────────────────────────────────────────
    {"ticker":"BMW.DE",    "name":"BMW",          "type":"Deutschland"},
    {"ticker":"MBG.DE",    "name":"Mercedes",     "type":"Deutschland"},
    {"ticker":"VOW3.DE",   "name":"Volkswagen",   "type":"Deutschland"},
    {"ticker":"SIE.DE",    "name":"Siemens",      "type":"Deutschland"},
    {"ticker":"BASFN.DE",  "name":"BASF",         "type":"Deutschland"},
    {"ticker":"BAYN.DE",   "name":"Bayer",        "type":"Deutschland"},
    {"ticker":"DHL.DE",    "name":"DHL Group",    "type":"Deutschland"},
    {"ticker":"AIR.PA",    "name":"Airbus",       "type":"Deutschland"},
    {"ticker":"ADS.DE",    "name":"Adidas",       "type":"Deutschland"},
    {"ticker":"MUV2.DE",   "name":"Munich Re",    "type":"Deutschland"},
    {"ticker":"MTX.DE",    "name":"MTU Aero",     "type":"Deutschland"},
    {"ticker":"CON.DE",    "name":"Continental",  "type":"Deutschland"},
    {"ticker":"EOAN.DE",   "name":"E.ON",         "type":"Deutschland"},
    {"ticker":"ZAL.DE",    "name":"Zalando",      "type":"Deutschland"},
    {"ticker":"DB1.DE",    "name":"Dt. Börse",    "type":"Deutschland"},
    {"ticker":"ENR.DE",    "name":"Siemens Ener.","type":"Deutschland"},
    {"ticker":"CBK.DE",    "name":"Commerzbank",  "type":"Deutschland"},
    {"ticker":"HNR1.DE",   "name":"Hannover Re",  "type":"Deutschland"},
    {"ticker":"P911.DE",   "name":"Porsche AG",   "type":"Deutschland"},
    {"ticker":"VNA.DE",    "name":"Vonovia",      "type":"Deutschland"},
    {"ticker":"SHL.DE",    "name":"Siemens Hlth.","type":"Deutschland"},
    {"ticker":"BNR.DE",    "name":"Brenntag",     "type":"Deutschland"},
    {"ticker":"HEN3.DE",   "name":"Henkel",       "type":"Deutschland"},
    # ── Europa ───────────────────────────────────────────────────────────────
    {"ticker":"OR.PA",   "name":"L'Oréal",      "type":"Europa"},
    {"ticker":"MC.PA",   "name":"LVMH",         "type":"Europa"},
    {"ticker":"SAN.PA",  "name":"Sanofi",       "type":"Europa"},
    {"ticker":"TTE.PA",  "name":"TotalEnergies","type":"Europa"},
    {"ticker":"BNPP.PA", "name":"BNP Paribas",  "type":"Europa"},
    {"ticker":"NESN.SW", "name":"Nestlé",       "type":"Europa"},
    {"ticker":"NOVN.SW", "name":"Novartis",     "type":"Europa"},
    {"ticker":"ROG.SW",  "name":"Roche",        "type":"Europa"},
    {"ticker":"AZN",     "name":"AstraZeneca",  "type":"Europa"},
    {"ticker":"HSBC",    "name":"HSBC",         "type":"Europa"},
    {"ticker":"UL",      "name":"Unilever",     "type":"Europa"},
    {"ticker":"BP",      "name":"BP",           "type":"Europa"},
    {"ticker":"SNY",     "name":"Sanofi ADR",   "type":"Europa"},
    # ── Rohstoffe ────────────────────────────────────────────────────────────
    {"ticker":"GLD",   "name":"Gold ETF",     "type":"Rohstoffe"},
    {"ticker":"SLV",   "name":"Silber ETF",   "type":"Rohstoffe"},
    {"ticker":"USO",   "name":"Öl ETF",       "type":"Rohstoffe"},
    {"ticker":"WEAT",  "name":"Weizen ETF",   "type":"Rohstoffe"},
    # ── Indizes ──────────────────────────────────────────────────────────────
    {"ticker":"^GDAXI","name":"DAX",          "type":"Index"},
    {"ticker":"^GSPC", "name":"S&P 500",      "type":"Index"},
    {"ticker":"^IXIC", "name":"Nasdaq",       "type":"Index"},
    {"ticker":"^DJI",  "name":"Dow Jones",    "type":"Index"},
    {"ticker":"^STOXX50E","name":"Euro Stoxx 50","type":"Index"},
]

@app.get("/api/heatmap")
def get_heatmap(user: models.User = Depends(auth.get_current_user)):
    import yfinance as yf
    from concurrent.futures import ThreadPoolExecutor, as_completed as _as_completed

    def fetch_one(a):
        try:
            fi = yf.Ticker(a["ticker"]).fast_info
            price_raw = float(fi.last_price)
            currency  = getattr(fi, "currency", None) or "USD"
            price_eur = market._fx_to_eur(price_raw, currency)
            prev      = getattr(fi, "previous_close", None)
            chg = ((price_raw - float(prev)) / float(prev) * 100) if prev and float(prev) > 0 else 0.0
            p = price_eur
            price_out = round(p,8) if p<0.001 else round(p,4) if p<1 else round(p,2)
            return {**a, "price": price_out, "chg_1d": round(chg, 2)}
        except Exception:
            return {**a, "price": None, "chg_1d": 0.0}

    results = []
    with ThreadPoolExecutor(max_workers=12) as ex:
        futs = {ex.submit(fetch_one, a): a for a in HEATMAP_TICKERS}
        for f in _as_completed(futs):
            results.append(f.result())
    results.sort(key=lambda x: (x["type"], x["name"]))
    return results

# ── Price Alerts ────────────────────────────────────────────────────────────────
@app.get("/api/alerts")
def get_alerts(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    alerts = db.query(models.PriceAlert).filter(models.PriceAlert.user_id == user.id, models.PriceAlert.active == True).all()
    return [{"id":a.id,"ticker":a.ticker,"name":a.name,"direction":a.direction,"target":a.target,"triggered":a.triggered} for a in alerts]

@app.post("/api/alerts")
def create_alert(data: AlertSchema, user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    alert = models.PriceAlert(
        user_id=user.id, ticker=data.ticker, name=data.name,
        direction=data.direction, target=data.target,
    )
    db.add(alert); db.commit(); db.refresh(alert)
    return {"id": alert.id, "ticker": alert.ticker}

@app.delete("/api/alerts/{alert_id}")
def delete_alert(alert_id: int, user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    a = db.query(models.PriceAlert).filter(models.PriceAlert.id == alert_id, models.PriceAlert.user_id == user.id).first()
    if not a: raise HTTPException(404, "Alert nicht gefunden")
    db.delete(a); db.commit()
    return {"success": True}

@app.get("/api/alerts/check")
def check_alerts(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    alerts = db.query(models.PriceAlert).filter(models.PriceAlert.user_id == user.id, models.PriceAlert.active == True, models.PriceAlert.triggered == False).all()
    triggered = []
    for a in alerts:
        price = market.get_live_price(a.ticker)
        if price is None: continue
        hit = (a.direction == "below" and price <= a.target) or (a.direction == "above" and price >= a.target)
        if hit:
            a.triggered = True
            triggered.append({"ticker": a.ticker, "name": a.name, "direction": a.direction, "target": a.target, "current": price})
    if triggered: db.commit()
    return triggered

# ── Geheimtipps ────────────────────────────────────────────────────────────────
import time as _time, threading as _threading, requests as _req, xml.etree.ElementTree as _ET

_TIPS_CACHE: dict = {"data": None, "ts": 0.0}
_TIPS_LOCK = _threading.Lock()

GEHEIM_SECTORS = {
    "Krieg & Ruestung": {
        "icon": "swords", "display": "Krieg & Rüstung",
        "keywords": ["war","military","attack","conflict","nato","troops","weapons","missile","ukraine","russia","israel","taiwan","gaza","krieg"],
        "profiteur": [{"ticker":"RTX","name":"Raytheon"},{"ticker":"LMT","name":"Lockheed Martin"},{"ticker":"NOC","name":"Northrop Grumman"},{"ticker":"RHM.DE","name":"Rheinmetall"},{"ticker":"GD","name":"General Dynamics"}],
        "verlierer": [{"ticker":"UAL","name":"United Airlines"},{"ticker":"MAR","name":"Marriott"},{"ticker":"RCL","name":"Royal Caribbean"},{"ticker":"EXPE","name":"Expedia"}],
        "risk": "mittel",
        "erklaerung": "Rüstungskonzerne profitieren von erhöhten Verteidigungsbudgets und Waffenlieferungen. Reise- und Tourismussektoren leiden unter geopolitischer Unsicherheit."
    },
    "Oelpreis-Anstieg": {
        "icon": "barrel", "display": "Ölpreis-Anstieg",
        "keywords": ["oil price","crude","opec","petroleum","energy crisis","oil supply","brent","wti","oil surge"],
        "profiteur": [{"ticker":"XOM","name":"ExxonMobil"},{"ticker":"CVX","name":"Chevron"},{"ticker":"SHEL","name":"Shell"},{"ticker":"RWE.DE","name":"RWE"},{"ticker":"TTE.PA","name":"TotalEnergies"}],
        "verlierer": [{"ticker":"AAL","name":"American Airlines"},{"ticker":"DAL","name":"Delta"},{"ticker":"UAL","name":"United Airlines"},{"ticker":"UPS","name":"UPS"}],
        "risk": "mittel",
        "erklaerung": "Steigende Ölpreise sind gut für Energieproduzenten, belasten aber stark transportabhängige Branchen wie Airlines und Logistik durch höhere Treibstoffkosten."
    },
    "Zinserhoehung": {
        "icon": "rate", "display": "Zinsentscheidung",
        "keywords": ["interest rate","fed","federal reserve","rate hike","central bank","ecb","inflation","zinsen","rate cut","rate decision"],
        "profiteur": [{"ticker":"JPM","name":"JPMorgan"},{"ticker":"GS","name":"Goldman Sachs"},{"ticker":"BAC","name":"Bank of America"},{"ticker":"ALV.DE","name":"Allianz"},{"ticker":"MS","name":"Morgan Stanley"}],
        "verlierer": [{"ticker":"MSFT","name":"Microsoft"},{"ticker":"AMZN","name":"Amazon"},{"ticker":"TSLA","name":"Tesla"},{"ticker":"VNA.DE","name":"Vonovia"}],
        "risk": "mittel",
        "erklaerung": "Banken profitieren von höheren Zinsen durch bessere Margen. Wachstumsaktien (Tech) verlieren, da zukünftige Gewinne stärker abgezinst werden. Immobilien leiden unter teurerem Kredit."
    },
    "AI & Tech-Boom": {
        "icon": "robot", "display": "AI & Tech-Boom",
        "keywords": ["artificial intelligence","ai","chatgpt","llm","machine learning","nvidia","semiconductor","chip","openai","gemini"],
        "profiteur": [{"ticker":"NVDA","name":"NVIDIA"},{"ticker":"MSFT","name":"Microsoft"},{"ticker":"GOOGL","name":"Alphabet"},{"ticker":"AMD","name":"AMD"},{"ticker":"AVGO","name":"Broadcom"}],
        "verlierer": [{"ticker":"INTC","name":"Intel"},{"ticker":"IBM","name":"IBM"}],
        "risk": "niedrig",
        "erklaerung": "Der KI-Boom treibt die Nachfrage nach Hochleistungs-GPUs und Cloud-Infrastruktur. Chip-Designer und Cloud-Anbieter profitieren enorm vom KI-Investitionszyklus."
    },
    "Inflation & Konsumflaute": {
        "icon": "chart", "display": "Inflation & Konsumflaute",
        "keywords": ["inflation","consumer spending","recession","gdp","retail sales","cpi","cost of living","consumer confidence"],
        "profiteur": [{"ticker":"WMT","name":"Walmart"},{"ticker":"COST","name":"Costco"},{"ticker":"PG","name":"Procter & Gamble"},{"ticker":"KO","name":"Coca-Cola"}],
        "verlierer": [{"ticker":"AMZN","name":"Amazon"},{"ticker":"SHOP","name":"Shopify"},{"ticker":"LVMH","name":"LVMH"},{"ticker":"NKE","name":"Nike"}],
        "risk": "mittel",
        "erklaerung": "Bei Inflation verlagern sich Ausgaben zu Discountern und Gütern des täglichen Bedarfs. Luxus- und Freizeitunternehmen leiden unter gesunkener Kaufkraft."
    },
    "Naturkatastrophe": {
        "icon": "storm", "display": "Naturkatastrophe",
        "keywords": ["earthquake","hurricane","flood","wildfire","tsunami","disaster","storm","drought","tornado"],
        "profiteur": [{"ticker":"CAT","name":"Caterpillar"},{"ticker":"DE","name":"John Deere"},{"ticker":"PWR","name":"Quanta Services"},{"ticker":"CARR","name":"Carrier Global"}],
        "verlierer": [{"ticker":"ALL","name":"Allstate"},{"ticker":"TRV","name":"Travelers"},{"ticker":"PGR","name":"Progressive"}],
        "risk": "hoch",
        "erklaerung": "Bau- und Infrastrukturunternehmen profitieren vom Wiederaufbau. Versicherungskonzerne leiden unter hohen Schadensforderungen und möglichen Eigenkapitalverlusten."
    },
    "Tech-Regulierung": {
        "icon": "law", "display": "Tech-Regulierung",
        "keywords": ["antitrust","regulation","ban","gdpr","privacy","dma","monopoly","big tech","lawsuit","fine"],
        "profiteur": [{"ticker":"V","name":"Visa"},{"ticker":"MA","name":"Mastercard"},{"ticker":"ORCL","name":"Oracle"},{"ticker":"SAP.DE","name":"SAP"}],
        "verlierer": [{"ticker":"META","name":"Meta"},{"ticker":"GOOGL","name":"Alphabet"},{"ticker":"AMZN","name":"Amazon"},{"ticker":"AAPL","name":"Apple"}],
        "risk": "niedrig",
        "erklaerung": "Regulierungen treffen primär die großen Tech-Plattformen. Traditionelle Software-Anbieter und Zahlungsdienstleister können von einer Aufspaltung profitieren."
    },
    "Krypto-Bewegung": {
        "icon": "bitcoin", "display": "Krypto-Bewegung",
        "keywords": ["bitcoin","crypto","ethereum","blockchain","btc","eth","halving","defi","nft","digital asset","web3"],
        "profiteur": [{"ticker":"COIN","name":"Coinbase"},{"ticker":"MARA","name":"MARA Holdings"},{"ticker":"RIOT","name":"Riot Platforms"},{"ticker":"BTC-USD","name":"Bitcoin"},{"ticker":"ETH-USD","name":"Ethereum"}],
        "verlierer": [{"ticker":"GLD","name":"Gold ETF"},{"ticker":"V","name":"Visa"}],
        "risk": "hoch",
        "erklaerung": "Bitcoin-Anstiege ziehen oft den gesamten Kryptosektor mit. Krypto-Börsen und Mining-Unternehmen profitieren überproportional. Gold verliert als alternativer Safe-Haven."
    },
    "Rohstoff-Boom": {
        "icon": "mine", "display": "Rohstoff-Boom",
        "keywords": ["gold","copper","lithium","mining","commodity","silver","iron ore","rare earth","metal price"],
        "profiteur": [{"ticker":"GLD","name":"Gold ETF"},{"ticker":"SLV","name":"Silber ETF"},{"ticker":"FCX","name":"Freeport-McMoRan"},{"ticker":"NEM","name":"Newmont"}],
        "verlierer": [{"ticker":"TSLA","name":"Tesla"},{"ticker":"F","name":"Ford"},{"ticker":"GM","name":"General Motors"}],
        "risk": "mittel",
        "erklaerung": "Rohstoffunternehmen profitieren direkt von steigenden Preisen. Autohersteller leiden unter teureren Materialien für Batterien und Fahrzeugproduktion."
    },
    "Pharma & Gesundheit": {
        "icon": "health", "display": "Pharma & Gesundheit",
        "keywords": ["pandemic","virus","vaccine","drug approval","fda","outbreak","health","pharma","disease","clinical trial","cancer"],
        "profiteur": [{"ticker":"PFE","name":"Pfizer"},{"ticker":"MRNA","name":"Moderna"},{"ticker":"JNJ","name":"Johnson & J."},{"ticker":"LLY","name":"Eli Lilly"},{"ticker":"ABBV","name":"AbbVie"}],
        "verlierer": [{"ticker":"UAL","name":"United Airlines"},{"ticker":"CCL","name":"Carnival"},{"ticker":"MAR","name":"Marriott"}],
        "risk": "mittel",
        "erklaerung": "Pharmaunternehmen und Healthcare-Konzerne profitieren bei Krankheitsausbrüchen. Reise, Hospitality und Veranstaltungsbranche leiden unter möglichen Einschränkungen."
    },
    "Dollar-Staerke": {
        "icon": "dollar", "display": "Dollar-Stärke",
        "keywords": ["dollar","usd strong","currency","exchange rate","dollar rally","weak euro","strong dollar"],
        "profiteur": [{"ticker":"WMT","name":"Walmart"},{"ticker":"XOM","name":"ExxonMobil"},{"ticker":"JNJ","name":"Johnson & J."}],
        "verlierer": [{"ticker":"AAPL","name":"Apple"},{"ticker":"MSFT","name":"Microsoft"},{"ticker":"NVDA","name":"NVIDIA"},{"ticker":"SAP.DE","name":"SAP"}],
        "risk": "niedrig",
        "erklaerung": "Ein starker Dollar schadet US-Unternehmen mit hohen Auslandseinnahmen. Europäische Exporteure werden günstiger für US-Käufer — profitieren kurzfristig."
    },
    "Handelskrieg & Zölle": {
        "icon": "trade", "display": "Handelskrieg & Zölle",
        "keywords": ["tariff","trade war","import duty","china trade","sanctions","export ban","trade deficit","protectionism"],
        "profiteur": [{"ticker":"CAT","name":"Caterpillar"},{"ticker":"LMT","name":"Lockheed Martin"},{"ticker":"DE","name":"John Deere"}],
        "verlierer": [{"ticker":"AAPL","name":"Apple"},{"ticker":"NVDA","name":"NVIDIA"},{"ticker":"TSM","name":"TSMC"},{"ticker":"BMW.DE","name":"BMW"},{"ticker":"MBG.DE","name":"Mercedes"}],
        "risk": "hoch",
        "erklaerung": "Handelszölle belasten globale Lieferketten. Tech-Konzerne mit China-Abhängigkeit und Autohersteller sind besonders betroffen. Domestic-fokussierte Unternehmen profitieren."
    },
}

import re as _re

def _strip_html(text: str) -> str:
    return _re.sub(r'<[^>]+>', '', text or '').strip()

def _parse_rss_date(pub_date: str) -> str:
    try:
        from email.utils import parsedate_to_datetime
        dt = parsedate_to_datetime(pub_date)
        months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
        return f"{dt.day}. {months[dt.month-1]} {dt.year}"
    except Exception:
        return pub_date[:10] if pub_date else ""

def _fetch_news_articles() -> list[dict]:
    """Fetch full article objects from multiple RSS feeds."""
    feeds = [
        ("Reuters",     "https://feeds.reuters.com/reuters/businessNews"),
        ("Reuters",     "https://feeds.reuters.com/Reuters/worldNews"),
        ("Yahoo Finance","https://finance.yahoo.com/rss/topstories"),
        ("BBC",         "https://feeds.bbci.co.uk/news/world/rss.xml"),
        ("Tagesschau",  "https://www.tagesschau.de/xml/rss2/"),
        ("DW",          "https://rss.dw.com/rdf/rss-de-all"),
    ]
    articles = []
    for source, url in feeds:
        try:
            r = _req.get(url, timeout=6, headers={"User-Agent": "Mozilla/5.0"})
            root = _ET.fromstring(r.content)
            for item in root.iter("item"):
                title = _strip_html(item.findtext("title", "")).strip()
                # <link> in some feeds is a text node after an empty element
                link = ""
                for child in item:
                    tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                    if tag == "link":
                        link = (child.text or "").strip()
                        break
                if not link:
                    link = item.findtext("link", "").strip()
                desc = _strip_html(item.findtext("description", "")).strip()
                pub_date = item.findtext("pubDate", "")
                if title and link and link.startswith("http"):
                    articles.append({
                        "headline":  title,
                        "url":       link,
                        "source":    source,
                        "published": _parse_rss_date(pub_date),
                        "summary":   desc[:220] if desc else "",
                        "_match":    (title + " " + desc).lower(),
                    })
        except Exception:
            pass
    return articles

@app.get("/api/geheimtipps")
def get_geheimtipps(user: models.User = Depends(auth.get_current_user)):
    global _TIPS_CACHE
    with _TIPS_LOCK:
        if _TIPS_CACHE["data"] and _time.time() - _TIPS_CACHE["ts"] < 1800:
            return _TIPS_CACHE["data"]

    articles = _fetch_news_articles()

    scored = []
    for key, sector in GEHEIM_SECTORS.items():
        matched_news, seen_urls = [], set()
        for art in articles:
            if any(kw in art["_match"] for kw in sector["keywords"]):
                if art["url"] not in seen_urls:
                    seen_urls.add(art["url"])
                    matched_news.append({k: v for k, v in art.items() if k != "_match"})
                    if len(matched_news) >= 3:
                        break
        scored.append((len(matched_news), key, sector, matched_news))

    scored.sort(key=lambda x: -x[0])

    result = []
    seen = set()
    for score, key, sector, news_items in scored:
        if key in seen: continue
        seen.add(key)
        result.append({
            "title":      sector["display"],
            "icon":       sector["icon"],
            "profiteur":  sector["profiteur"][:4],
            "verlierer":  sector["verlierer"][:3],
            "risk":       sector["risk"],
            "erklaerung": sector["erklaerung"],
            "aktuell":    score > 0,
            "score":      score,
            "news":       news_items,
        })

    with _TIPS_LOCK:
        _TIPS_CACHE = {"data": result, "ts": _time.time()}
    return result

# ─── Kalender: Dividenden + Earnings ─────────────────────────────────────────
@app.get("/api/calendar")
def get_calendar(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    import yfinance as yf
    from datetime import timezone
    items   = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user.id).all()
    tickers = [w.ticker for w in items][:15]
    out = []
    for tk in tickers:
        try:
            t    = yf.Ticker(tk)
            info = t.info
            dy   = info.get('dividendYield') or 0
            dr   = info.get('dividendRate') or 0
            ex_ts= info.get('exDividendDate')
            ex_date = None
            if ex_ts:
                try:
                    from datetime import datetime as _dt
                    ex_date = _dt.fromtimestamp(int(ex_ts), tz=timezone.utc).strftime('%d.%m.%Y')
                except: pass
            earn_date = eps_est = None
            try:
                cal = t.calendar
                if cal is not None:
                    if isinstance(cal, dict):
                        dates = cal.get('Earnings Date', [])
                        earn_date = str(dates[0])[:10] if dates else None
                        ev = cal.get('Earnings Average')
                        eps_est = round(float(ev), 2) if ev is not None else None
                    elif hasattr(cal, 'loc'):
                        if 'Earnings Date' in cal.index:
                            v = cal.loc['Earnings Date']
                            earn_date = str(v.iloc[0] if hasattr(v,'iloc') else v)[:10]
                        if 'Earnings Average' in cal.index:
                            v2 = cal.loc['Earnings Average']
                            eps_est = round(float(v2.iloc[0] if hasattr(v2,'iloc') else v2), 2)
            except: pass
            out.append({
                'ticker': tk, 'name': info.get('shortName', tk),
                'div_yield_pct': round(dy * 100, 2),
                'div_rate': round(float(dr), 2),
                'ex_div_date': ex_date,
                'currency': info.get('currency', 'USD'),
                'earnings_date': earn_date, 'eps_estimate': eps_est,
                'sector': info.get('sector') or '',
                'is_crypto': '-USD' in tk or '-EUR' in tk,
            })
        except Exception:
            out.append({'ticker': tk, 'name': tk, 'div_yield_pct': 0, 'div_rate': 0,
                        'ex_div_date': None, 'earnings_date': None, 'eps_estimate': None,
                        'sector': '', 'is_crypto': '-USD' in tk, 'error': True})
    return out

# ─── Sektoren-Rotation ────────────────────────────────────────────────────────
_SECTOR_CACHE: dict = {"data": None, "ts": 0.0}
_SECTOR_LOCK  = _threading.Lock()

_SECTOR_ETFS = {
    "Technologie":       "XLK",
    "Finanzen":          "XLF",
    "Energie":           "XLE",
    "Gesundheit":        "XLV",
    "Konsum (Basis)":    "XLP",
    "Konsum (Zyklisch)": "XLY",
    "Industrie":         "XLI",
    "Materialien":       "XLB",
    "Immobilien":        "XLRE",
    "Versorger":         "XLU",
    "Kommunikation":     "XLC",
}

@app.get("/api/sectors")
def get_sectors():
    import yfinance as yf
    global _SECTOR_CACHE
    with _SECTOR_LOCK:
        if _SECTOR_CACHE["data"] and _time.time() - _SECTOR_CACHE["ts"] < 900:
            return _SECTOR_CACHE["data"]
    results = []
    for name, etf in _SECTOR_ETFS.items():
        try:
            hist = yf.Ticker(etf).history(period="1mo")
            if hist.empty or len(hist) < 2: continue
            latest = float(hist['Close'].iloc[-1])
            p1d    = float(hist['Close'].iloc[-2])
            p5d    = float(hist['Close'].iloc[-6]) if len(hist) >= 6 else float(hist['Close'].iloc[0])
            first  = float(hist['Close'].iloc[0])
            vr     = float(hist['Volume'].iloc[-5:].mean()) if len(hist) >= 5 else float(hist['Volume'].mean())
            va     = float(hist['Volume'].mean())
            rv     = round(vr / va, 2) if va > 0 else 1.0
            results.append({
                'name': name, 'etf': etf,
                'price':      round(latest, 2),
                'change_1d':  round((latest - p1d) / p1d * 100, 2),
                'change_5d':  round((latest - p5d) / p5d * 100, 2),
                'change_1m':  round((latest - first) / first * 100, 2),
                'rel_volume': rv,
                'flow': 'rein' if rv > 1.1 else ('raus' if rv < 0.9 else 'neutral'),
            })
        except Exception: pass
    results.sort(key=lambda x: x['change_5d'], reverse=True)
    with _SECTOR_LOCK:
        _SECTOR_CACHE = {"data": results, "ts": _time.time()}
    return results

# ─── Portfolio Risiko-Score ───────────────────────────────────────────────────
@app.get("/api/portfolio/risk")
def get_portfolio_risk(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    import yfinance as yf, math
    import numpy as _np
    trades = db.query(models.Trade).filter(models.Trade.user_id == user.id).all()
    pos: dict = {}
    for t in trades:
        pos.setdefault(t.ticker, {'qty': 0.0})
        pos[t.ticker]['qty'] += t.shares if t.action == 'buy' else -t.shares
    active = {tk: v for tk, v in pos.items() if v['qty'] > 0.0001}
    if not active:
        return {'score': 0, 'rating': 'Kein Portfolio', 'details': {}, 'weights': {}}
    tickers = list(active.keys())[:10]
    cur_vals: dict = {}; daily_rets: dict = {}
    for tk in tickers:
        try:
            hist = yf.Ticker(tk).history(period="30d")
            if hist.empty: continue
            cur_vals[tk]    = float(hist['Close'].iloc[-1]) * active[tk]['qty']
            rets            = hist['Close'].pct_change().dropna().values
            if len(rets) >= 5: daily_rets[tk] = rets
        except: pass
    if not cur_vals:
        return {'score': 50, 'rating': 'Keine Daten', 'details': {}, 'weights': {}}
    tot = sum(cur_vals.values())
    wts = {tk: v/tot for tk, v in cur_vals.items()}
    hhi       = sum(w**2 for w in wts.values())
    hhi_score = min(40.0, hhi * 40.0)
    vc        = [wts[tk] * float(_np.std(daily_rets[tk])) * math.sqrt(252)
                 for tk in wts if tk in daily_rets]
    total_vol = sum(vc) if vc else 0.25
    vol_score = min(40.0, total_vol * 80.0)
    n         = len(active)
    div_pen   = 0 if n >= 10 else (10 if n >= 5 else (15 if n >= 3 else 20))
    score     = min(100, max(0, round(hhi_score + vol_score + div_pen)))
    rating    = ('Sehr Hoch' if score >= 75 else 'Hoch' if score >= 55 else 'Mittel' if score >= 30 else 'Niedrig')
    return {
        'score': score, 'rating': rating,
        'details': {
            'konzentration':  round(hhi_score, 1),
            'volatilitaet':   round(vol_score, 1),
            'diversifikation': div_pen,
            'num_assets':     n,
            'jahres_vol':     round(total_vol * 100, 1),
        },
        'weights': {tk: round(w * 100, 1) for tk, w in wts.items()},
    }

# ─── Korrelationsmatrix ───────────────────────────────────────────────────────
@app.get("/api/portfolio/correlation")
def get_correlation(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    import yfinance as yf
    import pandas as _pd
    trades = db.query(models.Trade).filter(models.Trade.user_id == user.id).all()
    pos: dict = {}
    for t in trades:
        pos[t.ticker] = pos.get(t.ticker, 0.0) + (t.shares if t.action == 'buy' else -t.shares)
    tickers = [tk for tk, qty in pos.items() if qty > 0.0001][:8]
    if len(tickers) < 2:
        return {'tickers': tickers, 'matrix': [], 'names': {}}
    price_data: dict = {}; names: dict = {}
    for tk in tickers:
        try:
            t    = yf.Ticker(tk)
            hist = t.history(period="3mo")
            if not hist.empty:
                price_data[tk] = hist['Close'].pct_change().dropna()
                try: names[tk] = t.info.get('shortName', tk)
                except: names[tk] = tk
        except: pass
    valid = [tk for tk in tickers if tk in price_data]
    if len(valid) < 2:
        return {'tickers': [], 'matrix': [], 'names': {}}
    df   = _pd.DataFrame({tk: price_data[tk] for tk in valid}).dropna()
    corr = df.corr().round(3)
    matrix = [[float(corr.loc[r, c]) if r in corr.index and c in corr.columns else None for c in valid] for r in valid]
    return {'tickers': valid, 'matrix': matrix, 'names': {tk: names.get(tk, tk) for tk in valid}}

# ─── Backtesting ──────────────────────────────────────────────────────────────
class BacktestReq(BaseModel):
    ticker:          str
    strategy:        str   = "rsi"
    rsi_buy:         float = 30.0
    rsi_sell:        float = 70.0
    initial_capital: float = 10000.0

@app.post("/api/backtesting")
def run_backtest(data: BacktestReq, user: models.User = Depends(auth.get_current_user)):
    import yfinance as yf
    import numpy as _np
    try:
        hist = yf.Ticker(data.ticker).history(period="1y")
        if hist.empty or len(hist) < 30:
            raise HTTPException(400, "Nicht genug historische Daten.")
        closes = hist['Close'].values
        dates  = [str(d)[:10] for d in hist.index]

        def _rsi(p, period=14):
            d  = _np.diff(p.astype(float))
            g  = _np.where(d > 0, d, 0.0); l = _np.where(d < 0, -d, 0.0)
            ag = _np.zeros(len(p)); al = _np.zeros(len(p))
            ag[period] = _np.mean(g[:period]); al[period] = _np.mean(l[:period])
            for i in range(period+1, len(p)):
                ag[i] = (ag[i-1]*(period-1)+g[i-1])/period
                al[i] = (al[i-1]*(period-1)+l[i-1])/period
            rs = _np.where(al == 0, 100.0, ag/al)
            r  = 100 - 100/(1+rs); r[:period] = 50.0
            return r

        rsi = _rsi(closes)
        capital = float(data.initial_capital); shares = 0.0; trades_log = []; equity_curve = []
        for i in range(14, len(closes)):
            pr = float(closes[i]); r = float(rsi[i])
            if r < data.rsi_buy and capital >= pr:
                qty = capital // pr
                if qty > 0:
                    shares += qty; capital -= qty * pr
                    trades_log.append({'date': dates[i], 'type': 'Kauf', 'price': round(pr,2), 'qty': int(qty), 'rsi': round(r,1)})
            elif r > data.rsi_sell and shares > 0:
                capital += shares * pr
                trades_log.append({'date': dates[i], 'type': 'Verkauf', 'price': round(pr,2), 'qty': int(shares), 'rsi': round(r,1)})
                shares = 0.0
            equity_curve.append({'date': dates[i], 'value': round(capital + shares * pr, 2)})
        if shares > 0: capital += shares * float(closes[-1])
        total_ret = (capital - data.initial_capital) / data.initial_capital * 100
        bh_ret    = (float(closes[-1]) - float(closes[14])) / float(closes[14]) * 100
        step = max(1, len(equity_curve)//120)
        name = data.ticker
        try: name = yf.Ticker(data.ticker).info.get('shortName', data.ticker)
        except: pass
        return {
            'name': name,
            'total_return':    round(total_ret, 2),
            'buy_hold_return': round(bh_ret, 2),
            'num_trades':      len(trades_log),
            'final_capital':   round(capital, 2),
            'equity_curve':    equity_curve[::step],
            'trades':          trades_log[-20:],
            'outperformed':    total_ret > bh_ret,
        }
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(400, f"Backtesting-Fehler: {str(e)}")

# ─── KI-Autopilot ─────────────────────────────────────────────────────────────
_PILOT_CACHE: dict = {}
_PILOT_LOCK  = _threading.Lock()

@app.get("/api/ai/autopilot")
def get_autopilot(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db), refresh: int = 0):
    import yfinance as yf
    import numpy as _np
    uid = user.id
    items   = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user.id).all()
    tickers = [w.ticker for w in items][:12]
    # Use cache only if not forced refresh and watchlist size matches cached state
    if not refresh:
        with _PILOT_LOCK:
            cached = _PILOT_CACHE.get(uid)
            if cached and _time.time() - cached['ts'] < 900 and cached.get('wl_count') == len(tickers):
                return cached['data']
    if not tickers:
        return {'recommendations': [], 'generated_at': _time.strftime('%d.%m.%Y %H:%M')}
    recs = []
    for tk in tickers:
        try:
            hist = yf.Ticker(tk).history(period="3mo")
            if hist.empty or len(hist) < 20: continue
            closes = hist['Close'].values.astype(float)
            latest = closes[-1]
            d  = _np.diff(closes[-15:])
            ag = float(_np.mean(_np.where(d > 0, d, 0.0))) or 0.0
            al = float(_np.mean(_np.where(d < 0, -d, 0.0))) or 0.001
            rsi   = round(100 - 100/(1 + ag/al), 1)
            sma20 = float(_np.mean(closes[-20:]))
            sma50 = float(_np.mean(closes[-50:])) if len(closes) >= 50 else sma20
            trend = 'Aufwärts' if sma20 > sma50*1.01 else ('Abwärts' if sma20 < sma50*0.99 else 'Seitwärts')
            p5d   = round((closes[-1]-closes[-6])/closes[-6]*100, 2) if len(closes) >= 6 else 0.0
            if rsi < 32 and trend != 'Abwärts':
                action, conf = 'KAUFEN', 'hoch'
                reason = f'RSI überverkauft ({rsi}), Trend positiv'
            elif rsi < 42 and trend == 'Aufwärts':
                action, conf = 'KAUFEN', 'mittel'
                reason = f'RSI günstig ({rsi}), Aufwärtstrend bestätigt'
            elif rsi > 72:
                action, conf = 'VERKAUFEN', 'hoch'
                reason = f'RSI überkauft ({rsi}), Gewinnmitnahme empfohlen'
            elif rsi > 65 and trend == 'Abwärts':
                action, conf = 'VERKAUFEN', 'mittel'
                reason = f'RSI erhöht ({rsi}) + Abwärtstrend'
            elif trend == 'Abwärts' and p5d < -5:
                action, conf = 'WARTEN', 'hoch'
                reason = f'Abwärtstrend, {p5d}% in 5 Tagen — noch nicht einsteigen'
            else:
                action, conf = 'HALTEN', 'mittel'
                reason = f'RSI neutral ({rsi}), kein klares Signal'
            name = tk
            try: name = yf.Ticker(tk).info.get('shortName', tk)
            except: pass
            recs.append({'ticker': tk, 'name': name, 'price': round(float(latest), 2),
                         'rsi': rsi, 'trend': trend, 'perf_5d': float(p5d),
                         'action': action, 'confidence': conf, 'reason': reason})
        except: pass
    order = {'KAUFEN':0, 'VERKAUFEN':1, 'WARTEN':2, 'HALTEN':3}
    recs.sort(key=lambda x: (order.get(x['action'], 9), x['confidence'] != 'hoch'))
    result = {'recommendations': recs, 'generated_at': _time.strftime('%d.%m.%Y %H:%M')}
    with _PILOT_LOCK:
        _PILOT_CACHE[uid] = {'data': result, 'ts': _time.time(), 'wl_count': len(tickers)}
    return result

# ─── Trading-Psychologie ──────────────────────────────────────────────────────
@app.get("/api/psychology")
def get_psychology(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    trades = db.query(models.Trade).filter(models.Trade.user_id == user.id).all()
    if not trades:
        return {'emotions': [], 'best_emotion': None, 'worst_emotion': None, 'total_trades': 0, 'insights': [], 'timeline': [], 'trade_results': []}
    positions = {}
    trade_results = []
    for t in sorted(trades, key=lambda x: x.created_at):
        if t.action == 'buy':
            positions.setdefault(t.ticker, []).append({'price': t.price, 'shares': t.shares, 'emotion': t.emotion or 'Neutral'})
        elif t.action == 'sell' and positions.get(t.ticker):
            buys = positions[t.ticker]
            avg_buy = sum(p['price']*p['shares'] for p in buys) / sum(p['shares'] for p in buys)
            pnl_pct = (t.price - avg_buy) / avg_buy * 100
            trade_results.append({'ticker': t.ticker, 'emotion': t.emotion or 'Neutral', 'pnl_pct': round(pnl_pct,2), 'date': str(t.created_at)[:10]})
    emotion_stats = {}
    for t in trades:
        em = t.emotion or 'Neutral'
        emotion_stats.setdefault(em, {'count':0,'wins':0,'total_pnl':0.0,'trades':[]})
        emotion_stats[em]['count'] += 1
    for r in trade_results:
        em = r['emotion']
        emotion_stats.setdefault(em, {'count':0,'wins':0,'total_pnl':0.0,'trades':[]})
        emotion_stats[em]['total_pnl'] += r['pnl_pct']
        if r['pnl_pct'] > 0: emotion_stats[em]['wins'] += 1
        emotion_stats[em]['trades'].append(r)
    result = []
    for em, s in emotion_stats.items():
        closed = len(s['trades'])
        avg_pnl = s['total_pnl'] / closed if closed else 0
        win_rate = s['wins'] / closed * 100 if closed else 0
        result.append({'emotion': em, 'count': s['count'], 'closed_trades': closed, 'avg_pnl': round(avg_pnl,2), 'win_rate': round(win_rate,1)})
    result.sort(key=lambda x: x['avg_pnl'], reverse=True)
    insights = []
    for r in result:
        if r['closed_trades'] > 0:
            if r['avg_pnl'] > 5:   insights.append(f"Mit '{r['emotion']}' machst du im Schnitt +{r['avg_pnl']}% – deine stärkste Emotion!")
            elif r['avg_pnl'] < -3: insights.append(f"'{r['emotion']}' kostet dich ø{abs(r['avg_pnl'])}% pro Trade – Vorsicht!")
    emotion_counts = {}
    for t in trades: emotion_counts[t.emotion or 'Neutral'] = emotion_counts.get(t.emotion or 'Neutral', 0) + 1
    most_common = max(emotion_counts, key=emotion_counts.get) if emotion_counts else 'Neutral'
    insights.append(f"Häufigste Emotion beim Traden: '{most_common}' ({emotion_counts.get(most_common,0)} mal)")
    timeline = [{'date': str(t.created_at)[:10], 'emotion': t.emotion or 'Neutral', 'action': t.action, 'ticker': t.ticker} for t in sorted(trades, key=lambda x: x.created_at)]
    return {
        'emotions': result, 'best_emotion': result[0]['emotion'] if result else None,
        'worst_emotion': result[-1]['emotion'] if len(result)>1 else None,
        'total_trades': len(trades), 'closed_trades': len(trade_results),
        'insights': insights[:5], 'timeline': timeline[-40:], 'trade_results': trade_results[-20:],
    }

# ─── Aktien-Screener ──────────────────────────────────────────────────────────
@app.get("/api/screener")
def get_screener(
    type:     str = "",
    region:   str = "",
    category: str = "",
    q:        str = "",
    limit:    int = 50,
    user: models.User = Depends(auth.get_current_user)
):
    all_assets = asset_db.ASSETS
    filtered = all_assets
    if type:     filtered = [a for a in filtered if a.get('type','') == type]
    if region:   filtered = [a for a in filtered if a.get('region','') == region]
    if category: filtered = [a for a in filtered if a.get('category','') == category]
    if q:
        q_lower = q.lower()
        filtered = [a for a in filtered if q_lower in a.get('ticker','').lower() or q_lower in a.get('name','').lower()]
    total = len(filtered)
    filtered = filtered[:limit]
    categories = sorted(set(a.get('category','') for a in all_assets if a.get('category')))
    regions    = sorted(set(a.get('region','')   for a in all_assets if a.get('region')))
    types      = sorted(set(a.get('type','')     for a in all_assets if a.get('type')))
    return {'results': filtered, 'total': total, 'categories': categories, 'regions': regions, 'types': types}

# ─── Steuer-Simulator ─────────────────────────────────────────────────────────
@app.get("/api/tax")
def get_tax(year: int = 0, user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    from datetime import datetime as _dt
    target_year = year or _dt.now().year
    trades = db.query(models.Trade).filter(models.Trade.user_id == user.id).all()
    positions = {}
    yearly = {}
    for t in sorted(trades, key=lambda x: x.created_at):
        yr = t.created_at.year if t.created_at else target_year
        if t.action == 'buy':
            positions.setdefault(t.ticker, []).append({'price': t.price, 'shares': t.shares, 'year': yr})
        elif t.action == 'sell' and positions.get(t.ticker):
            buys = positions[t.ticker]
            avg_buy = sum(p['price']*p['shares'] for p in buys) / sum(p['shares'] for p in buys)
            gain = (t.price - avg_buy) * t.shares
            yearly.setdefault(yr, {'gains': 0.0, 'losses': 0.0, 'trades': []})
            if gain >= 0:
                yearly[yr]['gains'] += gain
                yearly[yr]['trades'].append({'ticker': t.ticker, 'gain': round(gain,2), 'date': str(t.created_at)[:10], 'type': 'Gewinn'})
            else:
                yearly[yr]['losses'] += abs(gain)
                yearly[yr]['trades'].append({'ticker': t.ticker, 'gain': round(gain,2), 'date': str(t.created_at)[:10], 'type': 'Verlust'})
    FREIBETRAG = 1000.0
    TAX_RATE   = 0.26375
    years_result = []
    for yr, data in sorted(yearly.items()):
        net_gain   = data['gains'] - data['losses']
        taxable    = max(0.0, net_gain - FREIBETRAG)
        steuer     = taxable * TAX_RATE
        abgelt     = taxable * 0.25
        soli       = abgelt * 0.055
        verlust_topf = max(0.0, data['losses'] - data['gains'])
        years_result.append({
            'year': yr, 'gains': round(data['gains'],2), 'losses': round(data['losses'],2),
            'net_gain': round(net_gain,2), 'taxable': round(taxable,2),
            'steuer': round(steuer,2), 'abgeltungssteuer': round(abgelt,2), 'soli': round(soli,2),
            'freibetrag_used': round(min(FREIBETRAG, max(0, net_gain)),2),
            'verlustverrechnungstopf': round(verlust_topf,2),
            'trades': data['trades'],
        })
    cur = next((y for y in years_result if y['year'] == target_year), None) or {
        'year': target_year, 'gains': 0, 'losses': 0, 'net_gain': 0,
        'taxable': 0, 'steuer': 0, 'abgeltungssteuer': 0, 'soli': 0,
        'freibetrag_used': 0, 'verlustverrechnungstopf': 0, 'trades': []
    }
    return {'current_year': cur, 'all_years': years_result, 'freibetrag': FREIBETRAG, 'tax_rate': TAX_RATE}

# ─── Challenges ───────────────────────────────────────────────────────────────
_CHALLENGES = [
    {'id':'trade5','title':'5 Trades diese Woche','desc':'Führe 5 Trades in 7 Tagen durch','xp':100,'icon':'⚡','type':'weekly'},
    {'id':'profit3','title':'3% Gewinn in einem Trade','desc':'Verkaufe mit mindestens 3% Gewinn','xp':150,'icon':'📈','type':'achievement'},
    {'id':'watchlist10','title':'Watchlist Profi','desc':'Füge 10 Assets zur Watchlist hinzu','xp':80,'icon':'👀','type':'achievement'},
    {'id':'etf_buy','title':'ETF-Investor','desc':'Kaufe einen ETF','xp':60,'icon':'🌍','type':'achievement'},
    {'id':'crypto_buy','title':'Krypto-Pionier','desc':'Kaufe eine Kryptowährung','xp':60,'icon':'₿','type':'achievement'},
    {'id':'diversify5','title':'Diversifizierer','desc':'Handle 5 verschiedene Tickers','xp':120,'icon':'🎯','type':'achievement'},
    {'id':'streak7','title':'7-Tage Streak','desc':'Logge 7 Tage in Folge ein','xp':200,'icon':'🔥','type':'streak'},
    {'id':'first_sell','title':'Erster Verkauf','desc':'Schließe deinen ersten Trade','xp':50,'icon':'💰','type':'achievement'},
    {'id':'big_win','title':'Großer Gewinn','desc':'Mache +10% in einem Trade','xp':300,'icon':'🚀','type':'achievement'},
    {'id':'trade20','title':'Aktiver Trader','desc':'Führe insgesamt 20 Trades durch','xp':150,'icon':'🏆','type':'milestone'},
]

def _check_challenges(user: models.User, db: Session) -> list:
    from datetime import timedelta
    trades = db.query(models.Trade).filter(models.Trade.user_id == user.id).all()
    watchlist = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user.id).all()
    week_ago  = datetime.now() - timedelta(days=7)
    week_trades = [t for t in trades if t.created_at and t.created_at >= week_ago]
    positions = {}
    max_gain_pct = 0.0
    for t in sorted(trades, key=lambda x: x.created_at):
        if t.action == 'buy':
            positions.setdefault(t.ticker, []).append({'price': t.price, 'shares': t.shares})
        elif t.action == 'sell' and positions.get(t.ticker):
            avg = sum(p['price']*p['shares'] for p in positions[t.ticker]) / sum(p['shares'] for p in positions[t.ticker])
            pct = (t.price - avg) / avg * 100
            if pct > max_gain_pct: max_gain_pct = pct
    tickers_traded = set(t.ticker for t in trades)
    has_etf    = any(t.asset_type == 'etf'    for t in trades if t.action == 'buy')
    has_crypto = any(t.asset_type == 'crypto'  for t in trades if t.action == 'buy')
    has_sell   = any(t.action == 'sell'         for t in trades)
    done = set(user.done_lessons or [])
    checks = {
        'trade5':     len(week_trades) >= 5,
        'profit3':    max_gain_pct >= 3.0,
        'watchlist10':len(watchlist) >= 10,
        'etf_buy':    has_etf,
        'crypto_buy': has_crypto,
        'diversify5': len(tickers_traded) >= 5,
        'streak7':    (user.streak or 0) >= 7,
        'first_sell': has_sell,
        'big_win':    max_gain_pct >= 10.0,
        'trade20':    len(trades) >= 20,
    }
    result = []
    for c in _CHALLENGES:
        cid = c['id']
        completed = checks.get(cid, False)
        already_claimed = f"challenge_{cid}" in done
        progress = 0
        current_val, target_val = 0, 1
        if cid == 'trade5':
            current_val, target_val = min(len(week_trades), 5), 5
            progress = min(100, current_val * 20)
        elif cid == 'watchlist10':
            current_val, target_val = min(len(watchlist), 10), 10
            progress = min(100, current_val * 10)
        elif cid == 'diversify5':
            current_val, target_val = min(len(tickers_traded), 5), 5
            progress = min(100, current_val * 20)
        elif cid == 'trade20':
            current_val, target_val = min(len(trades), 20), 20
            progress = min(100, current_val * 5)
        elif cid == 'streak7':
            current_val, target_val = min(user.streak or 0, 7), 7
            progress = min(100, current_val * 100 // 7)
        elif cid == 'profit3':
            current_val, target_val = round(max_gain_pct, 1), 3.0
            progress = min(100, int(max_gain_pct / 3 * 100))
        elif cid == 'big_win':
            current_val, target_val = round(max_gain_pct, 1), 10.0
            progress = min(100, int(max_gain_pct / 10 * 100))
        elif completed:
            progress = 100
            current_val, target_val = 1, 1
        result.append({**c, 'completed': completed, 'claimed': already_claimed,
                        'progress': progress, 'current': current_val, 'target': target_val})
    return result

@app.get("/api/challenges")
def get_challenges(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return {'challenges': _check_challenges(user, db)}

@app.post("/api/challenges/{cid}/claim")
def claim_challenge(cid: str, user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    challenge = next((c for c in _CHALLENGES if c['id'] == cid), None)
    if not challenge: raise HTTPException(404, "Challenge nicht gefunden")
    checks = _check_challenges(user, db)
    ch = next((c for c in checks if c['id'] == cid), None)
    if not ch or not ch['completed']: raise HTTPException(400, "Challenge noch nicht abgeschlossen")
    if ch['claimed']: raise HTTPException(400, "Bereits beansprucht")
    done = list(user.done_lessons or [])
    done.append(f"challenge_{cid}")
    user.done_lessons = done
    user.xp += challenge['xp']
    user.level = _calc_level(user.xp)
    db.commit()
    return {**_user_out(user), 'xp_earned': challenge['xp']}

# ─── News & Sentiment ─────────────────────────────────────────────────────────
@app.get("/api/news/{ticker}")
def get_news(ticker: str, user: models.User = Depends(auth.get_current_user)):
    import yfinance as yf
    BULL = ['steigt','wächst','übertrifft','rekord','positiv','gewinnt','wachstum','prognose erhöht',
            'beat','rises','gains','growth','record','upgrade','strong','bullish','rally','buy']
    BEAR = ['fällt','verlust','warnung','negativ','rückgang','enttäuscht','prognose gesenkt',
            'falls','drops','loss','warning','downgrade','weak','bearish','sell','miss','cut']
    try:
        news_raw = yf.Ticker(ticker).news or []
    except Exception:
        news_raw = []
    articles = []
    bull_count = 0; bear_count = 0
    for n in news_raw[:12]:
        title   = n.get('title', '') or ''
        summary = n.get('summary','') or n.get('description','') or ''
        url     = n.get('link','') or n.get('url','') or '#'
        text    = (title + ' ' + summary).lower()
        b = sum(1 for w in BULL if w in text)
        be= sum(1 for w in BEAR if w in text)
        if b > be:   sentiment, score = 'bullish', min(100, b*25)
        elif be > b: sentiment, score = 'bearish', min(100, be*25)
        else:        sentiment, score = 'neutral',  50
        bull_count += (1 if sentiment=='bullish' else 0)
        bear_count += (1 if sentiment=='bearish' else 0)
        ts = n.get('providerPublishTime') or n.get('published') or 0
        articles.append({'title': title, 'summary': summary[:160], 'url': url,
                         'sentiment': sentiment, 'score': score,
                         'source': n.get('publisher','') or n.get('source',''),
                         'date': _time.strftime('%d.%m.%Y', _time.localtime(ts)) if ts else ''})
    total = len(articles)
    overall = 'bullish' if bull_count > bear_count else ('bearish' if bear_count > bull_count else 'neutral')
    pct = bull_count/total*100 if total else 50
    return {'ticker': ticker, 'articles': articles, 'overall_sentiment': overall, 'bullish_pct': round(pct,1), 'total': total}

# ─── Chartmuster-Erkennung ────────────────────────────────────────────────────
@app.get("/api/patterns/{ticker}")
def get_patterns(ticker: str, user: models.User = Depends(auth.get_current_user)):
    import yfinance as yf
    import numpy as _np
    try:
        hist = yf.Ticker(ticker).history(period="6mo")
        if hist.empty or len(hist) < 30:
            return {'ticker': ticker, 'patterns': [], 'signals': [], 'support': None, 'resistance': None}
        closes = hist['Close'].values.astype(float)
        highs  = hist['High'].values.astype(float)
        lows   = hist['Low'].values.astype(float)
        n = len(closes)
        patterns = []
        # Golden/Death Cross (SMA50 vs SMA200 — use shorter for 6mo data)
        if n >= 50:
            sma20 = float(_np.mean(closes[-20:]))
            sma50 = float(_np.mean(closes[-50:]))
            prev_sma20 = float(_np.mean(closes[-21:-1]))
            prev_sma50 = float(_np.mean(closes[-51:-1]))
            if prev_sma20 < prev_sma50 and sma20 > sma50:
                patterns.append({'name':'Goldenes Kreuz','type':'bullish','desc':'SMA20 kreuzt SMA50 von unten — starkes Kaufsignal','confidence':85})
            elif prev_sma20 > prev_sma50 and sma20 < sma50:
                patterns.append({'name':'Todeskreuz','type':'bearish','desc':'SMA20 kreuzt SMA50 von oben — Verkaufssignal','confidence':80})
        # Support & Resistance
        recent = closes[-30:]
        support    = round(float(_np.percentile(recent, 10)), 2)
        resistance = round(float(_np.percentile(recent, 90)), 2)
        current    = closes[-1]
        near_support    = abs(current - support)    / support    < 0.03
        near_resistance = abs(current - resistance) / resistance < 0.03
        if near_support:    patterns.append({'name':'Support-Zone','type':'bullish','desc':f'Kurs nahe Unterstützung {support:.2f} — mögliche Erholung','confidence':70})
        if near_resistance: patterns.append({'name':'Widerstand','type':'bearish','desc':f'Kurs nahe Widerstand {resistance:.2f} — möglicher Rücksetzer','confidence':65})
        # Double Top
        if n >= 40:
            seg = highs[-40:]
            p1i = int(_np.argmax(seg[:20]))
            p2i = int(_np.argmax(seg[20:])) + 20
            p1, p2 = seg[p1i], seg[p2i]
            if abs(p1-p2)/max(p1,p2) < 0.03 and min(seg[p1i:p2i]) < p1*0.97:
                patterns.append({'name':'Doppel-Top','type':'bearish','desc':'Zwei ähnliche Hochpunkte — mögliche Trendwende nach unten','confidence':72})
        # Oversold / Overbought RSI
        d  = _np.diff(closes[-15:])
        ag = float(_np.mean(_np.where(d>0,d,0.0))) or 0
        al = float(_np.mean(_np.where(d<0,-d,0.0))) or 0.001
        rsi = round(100 - 100/(1+ag/al), 1)
        if rsi < 30:   patterns.append({'name':'Überverkauft (RSI)','type':'bullish','desc':f'RSI {rsi} — Aktie stark überverkauft, Erholung möglich','confidence':75})
        elif rsi > 70: patterns.append({'name':'Überkauft (RSI)','type':'bearish','desc':f'RSI {rsi} — Aktie überkauft, Rücksetzer möglich','confidence':70})
        # Trend
        sma10 = float(_np.mean(closes[-10:]))
        sma30 = float(_np.mean(closes[-30:]))
        if sma10 > sma30*1.02:   patterns.append({'name':'Aufwärtstrend','type':'bullish','desc':'Kurzfristiger Aufwärtstrend aktiv','confidence':68})
        elif sma10 < sma30*0.98: patterns.append({'name':'Abwärtstrend','type':'bearish','desc':'Kurzfristiger Abwärtstrend aktiv','confidence':68})
        chart_data = [{'date': str(d)[:10], 'close': round(float(c),2)} for d, c in zip(hist.index[-60:], closes[-60:])]
        return {'ticker': ticker, 'patterns': patterns, 'rsi': rsi, 'support': support, 'resistance': resistance, 'sma20': round(sma20 if n>=20 else closes[-1],2), 'chart': chart_data}
    except Exception as e:
        return {'ticker': ticker, 'patterns': [], 'signals': [], 'support': None, 'resistance': None}

# ─── Portfolio-Rebalancing ────────────────────────────────────────────────────
@app.get("/api/portfolio/rebalancing")
def get_rebalancing(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    import yfinance as yf
    trades = db.query(models.Trade).filter(models.Trade.user_id == user.id).all()
    positions = {}
    asset_types = {}
    for t in sorted(trades, key=lambda x: x.created_at):
        if t.action == 'buy':
            positions.setdefault(t.ticker, {'shares':0,'type':t.asset_type or 'stock'})
            positions[t.ticker]['shares'] += t.shares
        elif t.action == 'sell':
            positions.setdefault(t.ticker, {'shares':0,'type':t.asset_type or 'stock'})
            positions[t.ticker]['shares'] -= t.shares
    active = {tk: v for tk, v in positions.items() if v['shares'] > 0.0001}
    if not active:
        return {'positions': [], 'allocation': {}, 'suggestions': [], 'total_value': 0}
    values = {}
    total = 0.0
    for tk, v in active.items():
        try:
            price = float(yf.Ticker(tk).fast_info.last_price or 0)
            val   = price * v['shares']
            values[tk] = {'value': round(val,2), 'price': round(price,2), 'shares': v['shares'], 'type': v['type']}
            total += val
        except: pass
    TARGET = {'stock': 50.0, 'etf': 30.0, 'crypto': 15.0, 'bond': 5.0}
    type_alloc = {}
    for tk, v in values.items():
        t = v['type']
        type_alloc[t] = type_alloc.get(t,0.0) + v['value']
    current_pct = {t: round(v/total*100,1) if total else 0 for t,v in type_alloc.items()}
    suggestions = []
    for t, target in TARGET.items():
        cur = current_pct.get(t, 0)
        diff = target - cur
        if abs(diff) > 5:
            suggestions.append({'type': t, 'current_pct': cur, 'target_pct': target, 'diff': round(diff,1),
                                 'action': 'kaufen' if diff>0 else 'reduzieren', 'amount': round(abs(diff)/100*total,2)})
    pos_list = [{'ticker':tk,'value':v['value'],'price':v['price'],'shares':v['shares'],'type':v['type'],'pct':round(v['value']/total*100,1) if total else 0} for tk,v in values.items()]
    pos_list.sort(key=lambda x: x['value'], reverse=True)
    return {'positions': pos_list, 'total_value': round(total,2), 'current_allocation': current_pct, 'target_allocation': TARGET, 'suggestions': suggestions}

# ─── Makro-Dashboard ──────────────────────────────────────────────────────────
_MACRO_CACHE: dict = {}
_MACRO_TS: float = 0.0

@app.get("/api/macro")
def get_macro(user: models.User = Depends(auth.get_current_user)):
    import yfinance as yf
    global _MACRO_TS
    if _time.time() - _MACRO_TS < 300 and _MACRO_CACHE:
        return _MACRO_CACHE
    tickers = {
        'sp500':   '^GSPC', 'dax':     '^GDAXI', 'gold':    'GC=F',
        'oil':     'CL=F',  'btc':     'BTC-USD', 'vix':   '^VIX',
        'bonds':   'TLT',   'dollar':  'UUP',
    }
    result = {}
    for key, sym in tickers.items():
        try:
            t  = yf.Ticker(sym)
            fi = t.fast_info
            price = float(fi.last_price or 0)
            prev  = float(fi.previous_close or price)
            chg   = round((price-prev)/prev*100, 2) if prev else 0.0
            result[key] = {'symbol':sym,'price':round(price,2),'change_pct':chg,'name':{'sp500':'S&P 500','dax':'DAX','gold':'Gold ($/oz)','oil':'Rohöl WTI ($/barrel)','btc':'Bitcoin','vix':'Volatilität (VIX)','bonds':'US-Anleihen (TLT)','dollar':'US-Dollar (UUP)'}.get(key,key)}
        except: result[key] = {'symbol':sym,'price':0,'change_pct':0,'name':key}
    # Fear & Greed proxy: VIX-based
    vix = result.get('vix',{}).get('price',20)
    if   vix > 40: fg = {'value':10,'label':'Extreme Angst','color':'#e74c3c'}
    elif vix > 30: fg = {'value':25,'label':'Angst','color':'#e67e22'}
    elif vix > 20: fg = {'value':45,'label':'Neutral','color':'#f1c40f'}
    elif vix > 15: fg = {'value':65,'label':'Gier','color':'#2ecc71'}
    else:          fg = {'value':80,'label':'Extreme Gier','color':'#27ae60'}
    result['fear_greed'] = fg
    _MACRO_CACHE.update(result)
    _MACRO_TS = _time.time()
    return result

# ─── Was-wäre-wenn Simulator ──────────────────────────────────────────────────
@app.get("/api/whatif")
def get_whatif(
    ticker: str = "AAPL",
    amount: float = 1000.0,
    from_date: str = "",
    user: models.User = Depends(auth.get_current_user)
):
    import yfinance as yf
    from datetime import datetime as _dt, timedelta as _td
    if not from_date:
        from_date = (_dt.now() - _td(days=365)).strftime('%Y-%m-%d')
    try:
        hist = yf.Ticker(ticker).history(start=from_date)
        if hist.empty: raise HTTPException(400, "Keine Daten für diesen Ticker/Zeitraum")
        p_start = float(hist['Close'].iloc[0])
        p_end   = float(hist['Close'].iloc[-1])
        shares  = amount / p_start
        value_now = shares * p_end
        gain      = value_now - amount
        gain_pct  = gain / amount * 100
        curve = [{'date': str(d)[:10], 'value': round(amount/p_start*float(c),2)} for d, c in zip(hist.index[::max(1,len(hist)//100)], hist['Close'].values[::max(1,len(hist)//100)])]
        # Compare with SPY
        spy_hist = yf.Ticker('SPY').history(start=from_date)
        spy_gain_pct = 0.0
        if not spy_hist.empty:
            sp = float(spy_hist['Close'].iloc[0]); se = float(spy_hist['Close'].iloc[-1])
            spy_gain_pct = (se-sp)/sp*100
        return {
            'ticker': ticker, 'amount': amount, 'from_date': from_date,
            'price_start': round(p_start,2), 'price_end': round(p_end,2),
            'shares': round(shares,4), 'value_now': round(value_now,2),
            'gain': round(gain,2), 'gain_pct': round(gain_pct,2),
            'vs_spy': round(gain_pct - spy_gain_pct, 2),
            'spy_gain_pct': round(spy_gain_pct,2),
            'curve': curve,
        }
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(400, f"Fehler: {str(e)}")

# ── Migrate DB: add group_name to watchlist ──────────────────────
try:
    from sqlalchemy import text
    with engine.connect() as _conn:
        _conn.execute(text("ALTER TABLE watchlist ADD COLUMN group_name TEXT DEFAULT 'Beobachte ich'"))
        _conn.commit()
except Exception:
    pass

# ── Portfolio Timeline + Benchmark ───────────────────────────────
@app.get("/api/portfolio/timeline")
def portfolio_timeline(
    user: models.User = Depends(auth.get_current_user),
    db:   Session     = Depends(get_db)
):
    try:
        import yfinance as yf
        import pandas as pd

        trades = db.query(models.Trade).filter_by(user_id=user.id).order_by(models.Trade.created_at).all()
        if not trades:
            return {"timeline": []}

        first_date = trades[0].created_at[:10]
        tickers_list = list(set(t.ticker for t in trades))

        history = {}
        for tk in tickers_list + ['^GSPC', '^GDAXI']:
            try:
                h = yf.Ticker(tk).history(start=first_date, interval='1d')
                if not h.empty:
                    history[tk] = h['Close']
            except Exception:
                pass

        dates = pd.bdate_range(start=first_date, end=pd.Timestamp.now())
        positions: dict = {}
        trade_idx = 0
        trades_sorted = sorted(trades, key=lambda t: t.created_at)

        sp_start = dax_start = None
        timeline = []

        for date in dates:
            while trade_idx < len(trades_sorted):
                td = pd.to_datetime(trades_sorted[trade_idx].created_at[:10])
                if td <= date:
                    t = trades_sorted[trade_idx]
                    delta = t.shares if t.action == 'buy' else -t.shares
                    positions[t.ticker] = positions.get(t.ticker, 0) + delta
                    trade_idx += 1
                else:
                    break

            total = 0.0
            for ticker, shares in positions.items():
                if shares > 0 and ticker in history:
                    try:
                        p = history[ticker].asof(date)
                        if pd.notna(p) and p > 0:
                            total += shares * float(p)
                    except Exception:
                        pass

            if total > 0:
                entry: dict = {'date': date.strftime('%d.%m.'), 'portfolio': round(total, 2)}
                if '^GSPC' in history:
                    try:
                        sp = float(history['^GSPC'].asof(date))
                        if pd.notna(sp):
                            if sp_start is None: sp_start = sp
                            entry['sp500'] = round((sp / sp_start - 1) * 100, 2)
                    except Exception:
                        pass
                if '^GDAXI' in history:
                    try:
                        dx = float(history['^GDAXI'].asof(date))
                        if pd.notna(dx):
                            if dax_start is None: dax_start = dx
                            entry['dax'] = round((dx / dax_start - 1) * 100, 2)
                    except Exception:
                        pass
                timeline.append(entry)

        if timeline:
            fv = timeline[0]['portfolio']
            for e in timeline:
                e['portfolio_pct'] = round((e['portfolio'] / fv - 1) * 100, 2) if fv else 0

        return {"timeline": timeline[-120:]}
    except Exception as e:
        return {"timeline": [], "error": str(e)}


# ── News Feed ────────────────────────────────────────────────────
@app.get("/api/news/{ticker}")
def get_ticker_news(ticker: str):
    try:
        import yfinance as yf, time as _t
        raw = yf.Ticker(ticker).news or []
        return {"ticker": ticker, "news": [
            {"title": n.get("title",""), "publisher": n.get("publisher",""),
             "link": n.get("link",""), "time": n.get("providerPublishTime", 0)}
            for n in raw[:8]
        ]}
    except Exception:
        return {"ticker": ticker, "news": []}


@app.get("/api/portfolio/news")
def portfolio_news(
    user: models.User = Depends(auth.get_current_user),
    db:   Session     = Depends(get_db)
):
    try:
        import yfinance as yf
        positions = db.query(models.Position).filter_by(user_id=user.id).all()
        all_news = []
        for pos in positions[:5]:
            try:
                raw = yf.Ticker(pos.ticker).news or []
                for n in raw[:2]:
                    all_news.append({
                        "ticker": pos.ticker, "name": pos.name,
                        "title": n.get("title",""), "publisher": n.get("publisher",""),
                        "link": n.get("link",""), "time": n.get("providerPublishTime", 0),
                    })
            except Exception:
                pass
        all_news.sort(key=lambda x: x["time"], reverse=True)
        return all_news[:12]
    except Exception:
        return []


# ── Analyst Ratings ──────────────────────────────────────────────
@app.get("/api/analyst/{ticker}")
def get_analyst(ticker: str):
    try:
        import yfinance as yf
        t = yf.Ticker(ticker)
        targets = {}
        try:
            pt = t.analyst_price_targets
            if pt:
                targets = {k: round(float(v), 2) for k, v in pt.items() if v is not None}
        except Exception:
            pass
        rec = {}
        try:
            rs = t.recommendations_summary
            if rs is not None and not rs.empty:
                row = rs.iloc[0]
                rec = {k: int(row.get(k, 0)) for k in ["strongBuy","buy","hold","sell","strongSell"]}
        except Exception:
            pass
        return {"ticker": ticker, "price_targets": targets, "recommendations": rec}
    except Exception:
        return {"ticker": ticker, "price_targets": {}, "recommendations": {}}


# ── Daily KI Briefing ────────────────────────────────────────────
@app.get("/api/briefing")
def daily_briefing(
    user: models.User = Depends(auth.get_current_user),
    db:   Session     = Depends(get_db)
):
    try:
        import yfinance as yf
        positions = db.query(models.Position).filter_by(user_id=user.id).all()
        items = []
        for pos in positions[:6]:
            try:
                fi = yf.Ticker(pos.ticker).fast_info
                price = float(fi.last_price or 0)
                prev  = float(fi.previous_close or price)
                chg   = (price - prev) / prev * 100 if prev else 0
                items.append({"ticker": pos.ticker, "name": pos.name,
                               "price": round(price, 2), "change_pct": round(chg, 2)})
            except Exception:
                pass
        macro = []
        for tk, name in {'^VIX':'VIX','^GSPC':'S&P 500','GC=F':'Gold','BTC-USD':'Bitcoin'}.items():
            try:
                fi = yf.Ticker(tk).fast_info
                price = float(fi.last_price or 0)
                prev  = float(fi.previous_close or price)
                chg   = (price - prev) / prev * 100 if prev else 0
                macro.append({"name": name, "price": round(price, 2), "change_pct": round(chg, 2)})
            except Exception:
                pass
        return {"portfolio_items": items, "macro": macro,
                "date": datetime.now().strftime('%d.%m.%Y %H:%M')}
    except Exception:
        return {"portfolio_items": [], "macro": [], "date": ""}


# ── Sparplan / DCA Simulator ─────────────────────────────────────
class SparplanIn(BaseModel):
    ticker: str
    monthly: float
    years: int

@app.post("/api/sparplan")
def calc_sparplan(data: SparplanIn):
    try:
        import yfinance as yf
        avg_r = 0.007  # default ~8.4% p.a.
        try:
            hist = yf.Ticker(data.ticker).history(period="5y")
            if not hist.empty:
                pr = hist["Close"]
                total_r = float(pr.iloc[-1] / pr.iloc[0]) - 1
                yrs = len(pr) / 252
                if yrs > 0:
                    avg_r = (1 + total_r) ** (1 / yrs) - 1
                    avg_r = (1 + avg_r) ** (1/12) - 1
        except Exception:
            pass

        months = min(data.years, 50) * 12
        value = invested = 0.0
        curve = []
        for m in range(1, months + 1):
            value = (value + data.monthly) * (1 + avg_r)
            invested += data.monthly
            if m % 12 == 0:
                curve.append({"year": m // 12, "invested": round(invested, 2), "value": round(value, 2)})

        return {
            "ticker": data.ticker, "monthly": data.monthly, "years": data.years,
            "final_value": round(value, 2), "total_invested": round(invested, 2),
            "gain": round(value - invested, 2),
            "gain_pct": round((value / invested - 1) * 100, 2) if invested else 0,
            "annual_return_pct": round(((1 + avg_r) ** 12 - 1) * 100, 2),
            "curve": curve,
        }
    except Exception as e:
        raise HTTPException(400, str(e))


# ── Portfolio Stress / Crash Test ────────────────────────────────
@app.get("/api/portfolio/stress")
def stress_test(
    user: models.User = Depends(auth.get_current_user),
    db:   Session     = Depends(get_db)
):
    try:
        positions = db.query(models.Position).filter_by(user_id=user.id).all()
        if not positions:
            return {"scenarios": [], "total_value": 0}

        total_value = sum(p.shares * p.avg_price for p in positions)
        SCENARIOS = [
            {"name": "Leichter Rückgang", "crash_pct": -10, "color": "#f59e0b"},
            {"name": "Korrektur",          "crash_pct": -20, "color": "#fb923c"},
            {"name": "COVID-Crash",        "crash_pct": -35, "color": "#f87171"},
            {"name": "Bärenmarkt",         "crash_pct": -40, "color": "#ef4444"},
            {"name": "Crash 2008",         "crash_pct": -55, "color": "#dc2626"},
        ]
        result = []
        for s in SCENARIOS:
            pos_after = []
            total_after = 0.0
            for pos in positions:
                extra = 1.5 if pos.asset_type == "crypto" else 1.0
                pct = s["crash_pct"] * extra
                before = pos.shares * pos.avg_price
                after  = before * (1 + pct / 100)
                total_after += after
                pos_after.append({"ticker": pos.ticker, "name": pos.name,
                                   "before": round(before, 2), "after": round(after, 2),
                                   "change_pct": round(pct, 1)})
            result.append({**s,
                "before": round(total_value, 2), "after": round(total_after, 2),
                "loss": round(total_after - total_value, 2),
                "positions": pos_after,
            })
        return {"scenarios": result, "total_value": round(total_value, 2)}
    except Exception as e:
        return {"scenarios": [], "total_value": 0, "error": str(e)}


# ── Trading Journal ───────────────────────────────────────────────
@app.get("/api/trades/journal")
def trading_journal(
    user: models.User = Depends(auth.get_current_user),
    db:   Session     = Depends(get_db)
):
    trades = db.query(models.Trade).filter_by(user_id=user.id).order_by(models.Trade.created_at.desc()).all()
    return {"trades": [{
        "id": t.id, "date": t.created_at[:10],
        "time": t.created_at[11:16] if len(t.created_at) > 11 else "",
        "ticker": t.ticker, "name": t.name, "type": t.asset_type,
        "action": "Kauf" if t.action == "buy" else "Verkauf",
        "shares": round(t.shares, 4), "price": round(t.price, 4),
        "total": round(t.total, 2),
        "emotion": t.emotion or "–", "note": t.note or "–",
    } for t in trades], "count": len(trades)}


# ── Watchlist Groups ─────────────────────────────────────────────
@app.put("/api/watchlist/{item_id}/group")
def update_watchlist_group(
    item_id: int,
    data: dict,
    user: models.User = Depends(auth.get_current_user),
    db:   Session     = Depends(get_db)
):
    item = db.query(models.WatchlistItem).filter_by(id=item_id, user_id=user.id).first()
    if not item:
        raise HTTPException(404, "Nicht gefunden")
    item.group_name = data.get("group_name", "Beobachte ich")
    db.commit()
    return {"ok": True}


# ── 52-Week High/Low ─────────────────────────────────────────────
@app.get("/api/assets/{ticker}/extended")
def get_asset_extended(ticker: str):
    try:
        import yfinance as yf
        t = yf.Ticker(ticker)
        fi = t.fast_info
        base = asset_db.get_by_ticker(ticker) or {"ticker": ticker}
        return {
            **base,
            "week52_high": round(float(fi.year_high), 2) if fi.year_high else None,
            "week52_low":  round(float(fi.year_low),  2) if fi.year_low  else None,
            "price":       round(float(fi.last_price), 2) if fi.last_price else None,
        }
    except Exception:
        return asset_db.get_by_ticker(ticker) or {"ticker": ticker}


if __name__ == "__main__":
    import uvicorn
    print("\n  Stockly API v2.0 — http://localhost:8000\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
