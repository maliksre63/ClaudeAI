import yfinance as yf
import requests
import pandas as pd
import ta
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

_cache = {}
_lock  = threading.Lock()
CACHE_TTL = 300  # 5 min for heavy signal computation (RSI/MACD/history)

# Lightweight price-only cache — 30 second TTL so displayed prices stay current
_pcache: dict = {}
_plock  = threading.Lock()
PRICE_TTL = 30

def _cached(key, fn):
    with _lock:
        e = _cache.get(key)
        if e and time.time() - e["ts"] < CACHE_TTL:
            return e["data"]
    data = fn()
    with _lock:
        _cache[key] = {"data": data, "ts": time.time()}
    return data

def _fx_to_eur(price: float, currency: str) -> float:
    if not currency or currency == "EUR":
        return price
    try:
        fi = yf.Ticker(f"{currency}EUR=X").fast_info
        rate = float(fi.last_price)
        if rate > 0:
            return price * rate
    except Exception:
        pass
    fallbacks = {"USD": 0.92, "KRW": 0.00069, "GBP": 1.17}
    return price * fallbacks.get(currency, 0.92)

def _calc_signals(ticker: str) -> dict | None:
    try:
        df = yf.download(ticker, period="3mo", interval="1d", progress=False, auto_adjust=True)
        if df is None or df.empty or len(df) < 30:
            return None
        close = df["Close"].squeeze().dropna()
        if len(close) < 30:
            return None

        rsi  = float(ta.momentum.RSIIndicator(close=close, window=14).rsi().iloc[-1])
        macd = ta.trend.MACD(close=close)
        macd_val = float(macd.macd().iloc[-1])
        macd_sig = float(macd.macd_signal().iloc[-1])
        ma20 = float(close.rolling(20).mean().iloc[-1])
        ma50 = float(close.rolling(50).mean().iloc[-1])

        try:
            fi       = yf.Ticker(ticker).fast_info
            price_raw = float(fi.last_price)
            currency  = getattr(fi, "currency", None) or "USD"
            price     = _fx_to_eur(price_raw, currency)
        except Exception:
            price = float(close.iloc[-1])

        chg5d = ((price - float(close.iloc[-6])) / float(close.iloc[-6]) * 100) if len(close) >= 6 else 0.0

        score, reasons = 0, []
        if rsi < 40:   score += 1; reasons.append(f"RSI {rsi:.1f} überverkauft")
        elif rsi > 65: score -= 1; reasons.append(f"RSI {rsi:.1f} überkauft")
        if macd_val > macd_sig: score += 1; reasons.append("MACD bullish")
        else:                   score -= 1; reasons.append("MACD bearish")
        if price > ma20: score += 1; reasons.append("Kurs > MA20")
        else:            score -= 1; reasons.append("Kurs < MA20")
        if ma20 > ma50:  score += 1; reasons.append("Aufwärtstrend MA20>MA50")
        else:            score -= 1; reasons.append("Abwärtstrend MA20<MA50")

        signal = "buy" if score >= 2 else "sell" if score <= -2 else "hold"
        history = close.tail(30).tolist()

        return {"price": price, "rsi": rsi, "change_5d": chg5d,
                "signal": signal, "score": max(0, score),
                "reasons": reasons, "history": history}
    except Exception:
        return None

def _get_price_fresh(ticker: str) -> float | None:
    """Current price with 30s cache — separates price freshness from heavy signal TTL."""
    with _plock:
        e = _pcache.get(ticker)
        if e and time.time() - e["ts"] < PRICE_TTL:
            return e["p"]
    p = get_live_price(ticker)
    if p is not None:
        with _plock:
            _pcache[ticker] = {"p": p, "ts": time.time()}
    return p

def get_stock_signal(ticker: str) -> dict | None:
    result = _cached(f"stock_{ticker}", lambda: _calc_signals(ticker))
    if result is None:
        return None
    # Always overlay a fresh price so charts show current value, not cached one
    fresh = _get_price_fresh(ticker)
    if fresh is not None:
        return {**result, "price": fresh}
    return result

def _calc_crypto(coin_id: str) -> dict | None:
    for attempt in range(3):
        try:
            r = requests.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={"ids": coin_id, "vs_currencies": "eur", "include_24hr_change": "true"},
                timeout=8
            )
            current_price, change_24h = None, 0.0
            if r.status_code == 200 and coin_id in r.json():
                d = r.json()[coin_id]
                current_price = d.get("eur")
                change_24h    = d.get("eur_24h_change") or 0.0

            hist = requests.get(
                f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart",
                params={"vs_currency": "eur", "days": "90", "interval": "daily"},
                timeout=10
            )
            if hist.status_code != 200:
                continue
            prices = [p[1] for p in hist.json().get("prices", [])]
            if len(prices) < 30:
                continue

            close    = pd.Series(prices)
            rsi      = float(ta.momentum.RSIIndicator(close=close, window=14).rsi().iloc[-1])
            macd     = ta.trend.MACD(close=close)
            macd_val = float(macd.macd().iloc[-1])
            macd_sig = float(macd.macd_signal().iloc[-1])
            ma20     = float(close.rolling(20).mean().iloc[-1])
            ma50     = float(close.rolling(50).mean().iloc[-1])
            price    = float(current_price) if current_price else float(close.iloc[-1])
            chg5d    = ((float(close.iloc[-1]) - float(close.iloc[-6])) / float(close.iloc[-6]) * 100) if len(close) >= 6 else change_24h

            score, reasons = 0, []
            if rsi < 40:   score += 1; reasons.append(f"RSI {rsi:.1f}")
            elif rsi > 65: score -= 1; reasons.append(f"RSI {rsi:.1f}")
            if macd_val > macd_sig: score += 1; reasons.append("MACD bullish")
            else:                   score -= 1; reasons.append("MACD bearish")
            if price > ma20: score += 1; reasons.append("Kurs > MA20")
            else:            score -= 1; reasons.append("Kurs < MA20")
            if ma20 > ma50:  score += 1; reasons.append("MA20 > MA50")
            else:            score -= 1; reasons.append("MA20 < MA50")

            signal  = "buy" if score >= 2 else "sell" if score <= -2 else "hold"
            history = close.tail(30).tolist()

            # get name
            name = coin_id.replace("-", " ").title()
            try:
                mr = requests.get("https://api.coingecko.com/api/v3/coins/markets",
                                   params={"vs_currency": "eur", "ids": coin_id}, timeout=5)
                if mr.status_code == 200 and mr.json():
                    name = mr.json()[0].get("name", name)
            except Exception:
                pass

            return {"price": price, "rsi": rsi, "change_5d": chg5d,
                    "signal": signal, "score": max(0, score),
                    "reasons": reasons, "history": history, "name": name}
        except Exception:
            if attempt < 2:
                time.sleep(1.5 ** attempt)
    return None

def get_crypto_signal(coin_id: str) -> dict | None:
    return _cached(f"crypto_{coin_id}", lambda: _calc_crypto(coin_id))

TOP20 = {
    "Apple":"AAPL","Microsoft":"MSFT","Nvidia":"NVDA","Amazon":"AMZN",
    "Alphabet":"GOOGL","Meta":"META","Tesla":"TSLA","TSMC":"TSM",
    "Broadcom":"AVGO","Eli Lilly":"LLY","JPMorgan":"JPM","Visa":"V",
    "ExxonMobil":"XOM","UnitedHealth":"UNH","Johnson&J":"JNJ",
    "Walmart":"WMT","Mastercard":"MA","Procter&G":"PG","Berkshire":"BRK-B","Samsung":"005930.KS",
}
SMALL_CAPS = {
    "SoundHound":"SOUN","Joby Aviation":"JOBY","Archer Aviation":"ACHR","Lucid Group":"LCID",
    "Mara Holdings":"MARA","Riot Platforms":"RIOT","Rocket Lab":"RKLB","Redwire":"RDW",
    "Cipher Mining":"CIFR","Bit Digital":"BTBT","Ondas Hold":"ONDS","Serve Robot":"SERV",
    "Gorilla Tech":"GRRR","Quantum Corp":"QMCO","Genie Energy":"GNE","Idex Corp":"IDEX",
    "ProQR":"PRQR","BM Tech":"BMTX","Safe Harbor":"SHFS","Intuitive M":"LUNR",
}
CRYPTOS = [
    "bitcoin","ethereum","binancecoin","solana","ripple","dogecoin","cardano",
    "avalanche-2","shiba-inu","chainlink","polkadot","tron","bitcoin-cash","near",
    "matic-network","litecoin","internet-computer","uniswap","stellar","monero",
]

DAX40 = {
    "Adidas":         "ADS.DE",
    "Airbus":         "AIR.PA",
    "Allianz":        "ALV.DE",
    "BASF":           "BASFN.DE",
    "Bayer":          "BAYN.DE",
    "BMW":            "BMW.DE",
    "Brenntag":       "BNR.DE",
    "Commerzbank":    "CBK.DE",
    "Continental":    "CON.DE",
    "Daimler Truck":  "DTG.DE",
    "Deutsche Bank":  "DBK.DE",
    "Deutsche Börse": "DB1.DE",
    "DHL Group":      "DHL.DE",
    "E.ON":           "EOAN.DE",
    "Fresenius":      "FRE.DE",
    "Hannover Re":    "HNR1.DE",
    "Henkel":         "HEN3.DE",
    "Infineon":       "IFX.DE",
    "Mercedes":       "MBG.DE",
    "Merck KGaA":     "MRK.DE",
    "MTU Aero":       "MTX.DE",
    "Munich Re":      "MUV2.DE",
    "Porsche AG":     "P911.DE",
    "Porsche SE":     "PAH3.DE",
    "Qiagen":         "QIA.DE",
    "RWE":            "RWE.DE",
    "SAP":            "SAP.DE",
    "Sartorius":      "SRT3.DE",
    "Siemens":        "SIE.DE",
    "Siemens Energy": "ENR.DE",
    "Siemens Hlth.":  "SHL.DE",
    "Symrise":        "SY1.DE",
    "Volkswagen":     "VOW3.DE",
    "Vonovia":        "VNA.DE",
    "Zalando":        "ZAL.DE",
}

def fetch_market(market: str) -> list:
    if market == "top20":
        watchlist = TOP20
    elif market == "dax":
        watchlist = DAX40
    elif market == "smallcap":
        watchlist = SMALL_CAPS
    else:
        return []
    results = {}
    with ThreadPoolExecutor(max_workers=10) as ex:
        futures = {ex.submit(get_stock_signal, ticker): (name, ticker)
                   for name, ticker in watchlist.items()}
        for f in as_completed(futures):
            name, ticker = futures[f]
            sig = f.result()
            results[name] = {"name": name, "ticker": ticker,
                              **(sig or {"signal":"hold","price":None,"rsi":None,
                                         "change_5d":None,"score":0,"reasons":[],"history":[]})}
    return [results[n] for n in watchlist if n in results]

CRYPTO_YF = {
    "bitcoin":            ("BTC-USD",   "Bitcoin"),
    "ethereum":           ("ETH-USD",   "Ethereum"),
    "binancecoin":        ("BNB-USD",   "BNB"),
    "solana":             ("SOL-USD",   "Solana"),
    "ripple":             ("XRP-USD",   "XRP"),
    "dogecoin":           ("DOGE-USD",  "Dogecoin"),
    "cardano":            ("ADA-USD",   "Cardano"),
    "avalanche-2":        ("AVAX-USD",  "Avalanche"),
    "shiba-inu":          ("SHIB-USD",  "Shiba Inu"),
    "chainlink":          ("LINK-USD",  "Chainlink"),
    "polkadot":           ("DOT-USD",   "Polkadot"),
    "tron":               ("TRX-USD",   "TRON"),
    "bitcoin-cash":       ("BCH-USD",   "Bitcoin Cash"),
    "near":               ("NEAR-USD",  "NEAR Protocol"),
    "matic-network":      ("POL-USD",   "Polygon"),
    "litecoin":           ("LTC-USD",   "Litecoin"),
    "internet-computer":  ("ICP-USD",   "Internet Computer"),
    "uniswap":            ("UNI-USD",   "Uniswap"),
    "stellar":            ("XLM-USD",   "Stellar"),
    "monero":             ("XMR-USD",   "Monero"),
    "atom":               ("ATOM-USD",  "Cosmos"),
    "aptos":              ("APT-USD",   "Aptos"),
    "sui":                ("SUI-USD",   "Sui"),
    "arbitrum":           ("ARB-USD",   "Arbitrum"),
    "hedera-hashgraph":   ("HBAR-USD",  "Hedera"),
    "filecoin":           ("FIL-USD",   "Filecoin"),
    "vechain":            ("VET-USD",   "VeChain"),
    "pepe":               ("PEPE-USD",  "PEPE"),
    "sei-network":        ("SEI-USD",   "Sei"),
    "kaspa":              ("KAS-USD",   "Kaspa"),
    "algorand":           ("ALGO-USD",  "Algorand"),
    "render-token":       ("RENDER-USD","Render"),
}

def fetch_crypto_market() -> list:
    results = {}
    with ThreadPoolExecutor(max_workers=12) as ex:
        futures = {ex.submit(_calc_signals, ticker): (coin_id, ticker, name)
                   for coin_id, (ticker, name) in CRYPTO_YF.items()}
        for f in as_completed(futures):
            coin_id, ticker, name = futures[f]
            sig = f.result()
            if sig:
                sig["name"] = name
            results[coin_id] = {
                "id": coin_id, "ticker": ticker,
                **(sig or {"name": name, "signal": "hold", "price": None,
                           "rsi": None, "change_5d": None, "score": 0,
                           "reasons": [], "history": []})
            }
    return [results[c] for c in CRYPTO_YF if c in results]

def get_live_price(ticker: str) -> float | None:
    try:
        fi = yf.Ticker(ticker).fast_info
        price = float(fi.last_price)
        currency = getattr(fi, "currency", "USD") or "USD"
        return _fx_to_eur(price, currency)
    except Exception:
        return None
