# -*- coding: utf-8 -*-
"""
Trade Signal System - All-in-One Trading Assistant
"""

VERSION = "2.1.0"
UPDATE_URL = "https://raw.githubusercontent.com/maliksre63/ClaudeAI/master/trading_signals.py"

import warnings
import logging
import json
import os
import random
import sys
import shutil
import subprocess
from datetime import datetime, date

warnings.filterwarnings("ignore")
logging.getLogger("yfinance").setLevel(logging.CRITICAL)
logging.getLogger("urllib3").setLevel(logging.CRITICAL)

import yfinance as yf
import pandas as pd
import ta
import requests
from colorama import init, Fore, Back, Style

init(autoreset=True)

# ─────────────────────────────────────────────────────────────────
#  DATEI-PFADE
# ─────────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(sys.argv[0]))
USER_FILE = os.path.join(BASE_DIR, "user_data.json")

# ─────────────────────────────────────────────────────────────────
#  WATCHLISTS
# ─────────────────────────────────────────────────────────────────

TOP20_STOCKS = {
    "Apple":       "AAPL",  "Microsoft":  "MSFT",
    "Nvidia":      "NVDA",  "Amazon":     "AMZN",
    "Alphabet":    "GOOGL", "Meta":       "META",
    "Tesla":       "TSLA",  "Berkshire":  "BRK-B",
    "TSMC":        "TSM",   "Broadcom":   "AVGO",
    "Eli Lilly":   "LLY",   "JPMorgan":   "JPM",
    "Visa":        "V",     "ExxonMobil": "XOM",
    "UnitedHealth":"UNH",   "Johnson&J":  "JNJ",
    "Samsung":     "005930.KS", "Walmart":"WMT",
    "Mastercard":  "MA",    "Procter&G":  "PG",
}

SMALL_CAP_STOCKS = {
    "SoundHound":  "SOUN",  "Joby Aviation":"JOBY",
    "Archer Avn":  "ACHR",  "Lucid Group": "LCID",
    "Cipher Mining":"CIFR", "Bit Digital":  "BTBT",
    "Mara Holdings":"MARA", "Riot Platforms":"RIOT",
    "Redwire":     "RDW",   "Rocket Lab":  "RKLB",
    "Intuitive M": "LUNR",  "Ondas Hold":  "ONDS",
    "ProQR":       "PRQR",  "Serve Robot": "SERV",
    "Gorilla Tech":"GRRR",  "Quantum Corp":"QMCO",
    "BM Tech":     "BMTX",  "Idex Corp":   "IDEX",
    "Genie Energy":"GNE",   "Safe Harbor": "SHFS",
}

TOP_CRYPTOS = [
    "bitcoin", "ethereum", "binancecoin", "solana", "ripple",
    "dogecoin", "cardano", "avalanche-2", "shiba-inu", "chainlink",
    "polkadot", "tron", "bitcoin-cash", "near", "matic-network",
    "litecoin", "internet-computer", "uniswap", "stellar", "monero",
]

# ─────────────────────────────────────────────────────────────────
#  NUTZERPROFIL
# ─────────────────────────────────────────────────────────────────

DEFAULT_USER = {
    "name": "",
    "capital": 0.0,
    "risk_level": "moderat",   # konservativ / moderat / aggressiv
    "xp": 0,
    "level": 1,
    "streak": 0,
    "last_login": "",
    "challenges_done": [],
    "total_signals_viewed": 0,
    "achievements": [],
}

LEVELS = {
    1:  (0,    150,  "Anfaenger"),
    2:  (150,  400,  "Beobachter"),
    3:  (400,  800,  "Analyst"),
    4:  (800,  1500, "Trader"),
    5:  (1500, 2500, "Profi-Trader"),
    6:  (2500, 4000, "Marktkenner"),
    7:  (4000, 6000, "Stratege"),
    8:  (6000, 9000, "Experte"),
    9:  (9000, 13000,"Meister"),
    10: (13000,99999,"Legende"),
}

RISK_CONFIG = {
    "konservativ": {
        "pct":        1.5,
        "label":      "Konservativ",
        "color":      Fore.GREEN,
        "desc":       "1-2% des Kapitals pro Trade. Kapitalerhalt steht im Vordergrund.",
        "stop_loss":  5,
        "take_profit":10,
    },
    "moderat": {
        "pct":        4.0,
        "label":      "Moderat",
        "color":      Fore.YELLOW,
        "desc":       "3-5% des Kapitals pro Trade. Ausgewogenes Chance-Risiko-Verhaeltnis.",
        "stop_loss":  8,
        "take_profit":20,
    },
    "aggressiv": {
        "pct":        8.0,
        "label":      "Aggressiv",
        "color":      Fore.RED,
        "desc":       "6-10% des Kapitals pro Trade. Hoehere Chancen, hoehere Verlustgefahr.",
        "stop_loss":  15,
        "take_profit":40,
    },
}

# ─────────────────────────────────────────────────────────────────
#  TAEGL. HERAUSFORDERUNGEN
# ─────────────────────────────────────────────────────────────────

ALL_CHALLENGES = [
    {"id": "view_stocks",   "text": "Analysiere die Top 20 Aktien",          "xp": 30,  "action": "1"},
    {"id": "view_crypto",   "text": "Analysiere die Top Kryptos",             "xp": 30,  "action": "2"},
    {"id": "view_small_c",  "text": "Schau dir kleine Kryptos an",            "xp": 25,  "action": "3"},
    {"id": "view_small_s",  "text": "Schau dir kleine Aktien an",             "xp": 25,  "action": "4"},
    {"id": "set_capital",   "text": "Lege dein Handelskapital fest",          "xp": 50,  "action": "P"},
    {"id": "change_risk",   "text": "Passe dein Risikoprofil an",             "xp": 40,  "action": "P"},
    {"id": "use_tutorial",  "text": "Lese den Tutorial-Chat",                 "xp": 35,  "action": "T"},
    {"id": "view_all",      "text": "Lass alle Analysen auf einmal laufen",   "xp": 60,  "action": "5"},
]

# ─────────────────────────────────────────────────────────────────
#  TUTORIAL / FAQ CHAT
# ─────────────────────────────────────────────────────────────────

FAQ = [
    {
        "q": "Was ist der RSI und wie lese ich ihn?",
        "a": (
            "Der RSI (Relative Strength Index) misst, ob eine Aktie/Krypto gerade\n"
            "ueberkauft oder ueberverkauft ist. Er geht von 0 bis 100.\n\n"
            "  RSI < 35  -> Ueberverkauft  -> oft guenstiger Einstiegszeitpunkt\n"
            "  RSI 35-65 -> Neutrale Zone  -> kein klares Signal\n"
            "  RSI > 70  -> Ueberkauft     -> Kurs koennte bald fallen\n\n"
            "Beispiel: Tesla hat RSI 28 -> System sagt KAUFEN, weil der Kurs\n"
            "statistisch oft nach solchen Tiefstwerten wieder steigt."
        ),
    },
    {
        "q": "Was bedeutet MACD?",
        "a": (
            "MACD steht fuer Moving Average Convergence Divergence.\n"
            "Es zeigt, ob der kurzfristige Trend staerker ist als der langfristige.\n\n"
            "  MACD > Signal-Linie -> Bullish (Aufwaertsdruck)\n"
            "  MACD < Signal-Linie -> Bearish (Abwaertsdruck)\n\n"
            "Das System kombiniert MACD mit RSI und Moving Averages,\n"
            "um zuverlaessigere Signale zu geben als ein einzelner Indikator."
        ),
    },
    {
        "q": "Was bedeuten die Signale KAUFEN / HALTEN / VERKAUFEN?",
        "a": (
            "Das System vergibt Punkte (Score) aus 3 Indikatoren:\n\n"
            "  Score >= 4  -> KAUFEN   (mehrere Indikatoren zeigen Aufwaerts)\n"
            "  Score <= -2 -> VERKAUFEN (mehrere Indikatoren zeigen Abwaerts)\n"
            "  Dazwischen  -> HALTEN   (kein klares Bild)\n\n"
            "WICHTIG: Diese Signale sind Hinweise, keine Garantien.\n"
            "Kombiniere sie immer mit deiner eigenen Einschaetzung!"
        ),
    },
    {
        "q": "Wie viel soll ich pro Trade investieren?",
        "a": (
            "Das haengt von deinem Risikoprofil ab:\n\n"
            "  Konservativ: 1-2% deines Kapitals pro Trade\n"
            "  Moderat:     3-5% deines Kapitals pro Trade\n"
            "  Aggressiv:   6-10% deines Kapitals pro Trade\n\n"
            "Beispiel: Du hast 1000 EUR Kapital, Profil 'Moderat'\n"
            "-> Pro Trade riskierst du ca. 40 EUR (4% von 1000 EUR)\n\n"
            "Das System berechnet das automatisch unter 'Profil & Einstellungen'."
        ),
    },
    {
        "q": "Was ist Stop-Loss und Take-Profit?",
        "a": (
            "Stop-Loss: Kurs, bei dem du automatisch verkaufst, um Verluste zu begrenzen.\n"
            "Take-Profit: Kurs, bei dem du automatisch verkaufst, um Gewinne zu sichern.\n\n"
            "Beispiel (Moderat-Profil, Kauf bei 100 EUR):\n"
            "  Stop-Loss   = 92 EUR  (-8%)  -> du verlierst maximal 8 EUR\n"
            "  Take-Profit = 120 EUR (+20%) -> du nimmst Gewinn bei +20 EUR\n\n"
            "In Trade Republic setzt du diese Limits manuell bei der Order."
        ),
    },
    {
        "q": "Was sind kleine Kryptos / Small Caps und warum sind sie riskant?",
        "a": (
            "Small Caps sind Unternehmen oder Coins mit kleiner Marktkapitalisierung\n"
            "(z.B. unter 500 Mio EUR). Sie sind volatiler, weil:\n\n"
            "  - Weniger Handelsteilnehmer -> Kurs schwankt staerker\n"
            "  - Weniger Transparenz -> hoehere Insolvenzgefahr\n"
            "  - Nachrichten treffen den Kurs haerter\n\n"
            "Das Chancen-Potenzial ist groesser, aber ein Totalverlust\n"
            "ist ebenso moeglich. Investiere hier maximal 5-10% deines Gesamtkapitals."
        ),
    },
    {
        "q": "Wie nutze ich dieses Programm taeglich am besten?",
        "a": (
            "Empfohlene Tagesroutine (ca. 10 Minuten):\n\n"
            "  1. Programm starten -> Tagesherausforderungen ansehen\n"
            "  2. Option [5] 'Alles anzeigen' ausfuehren\n"
            "  3. KAUFEN-Signale notieren\n"
            "  4. In Trade Republic nachschauen ob der Kurs stimmt\n"
            "  5. Bei Interesse: kleinen Betrag investieren\n\n"
            "Wichtig: Nie alles auf einmal investieren.\n"
            "Verteile dein Kapital auf mehrere Positionen!"
        ),
    },
    {
        "q": "Was bedeuten die Sterne bei den Signalen?",
        "a": (
            "Die Sterne zeigen die Chance-Staerke des Signals:\n\n"
            "  * (1 Stern)   -> Schwaches Signal, Score 2-3\n"
            "  ** (2 Sterne) -> Mittleres Signal, Score 4\n"
            "  ***(3 Sterne) -> Starkes Signal,   Score 5-6\n\n"
            "Ein 3-Sterne-Signal bedeutet, dass alle 3 Indikatoren\n"
            "(RSI + MACD + Moving Average) gleichzeitig bullish sind.\n"
            "Das passiert selten - aber dann lohnt genaueres Hinschauen."
        ),
    },
    {
        "q": "Kann ich das Programm als App auf dem Handy nutzen?",
        "a": (
            "Aktuell laeuft das Programm als Desktop-App (EXE auf Windows).\n\n"
            "Fuer Android/iOS braucht man eine andere Technologie (z.B. Kivy).\n"
            "Das ist als naechster Schritt geplant.\n\n"
            "Als EXE starten: python trading_signals.py -> dann mit PyInstaller\n"
            "eine EXE erstellen (Anleitung im Hauptmenue unter 'EXE erstellen')."
        ),
    },
    {
        "q": "Ist dieses System eine Finanzberatung?",
        "a": (
            "NEIN. Dieses System ist ein WERKZEUG zur eigenen Analyse.\n\n"
            "Es ersetzt keine professionelle Finanzberatung.\n"
            "Alle Signale basieren auf mathematischen Indikatoren,\n"
            "nicht auf fundamentaler Unternehmensanalyse.\n\n"
            "Investiere niemals Geld, dessen Verlust du dir nicht leisten kannst.\n"
            "Gewinne aus der Vergangenheit garantieren keine zukuenftigen Gewinne."
        ),
    },
]

# ─────────────────────────────────────────────────────────────────
#  HILFSFUNKTIONEN
# ─────────────────────────────────────────────────────────────────

def clear():
    os.system("cls" if os.name == "nt" else "clear")

def load_user() -> dict:
    if os.path.exists(USER_FILE):
        with open(USER_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        for k, v in DEFAULT_USER.items():
            data.setdefault(k, v)
        return data
    return DEFAULT_USER.copy()

def save_user(u: dict):
    with open(USER_FILE, "w", encoding="utf-8") as f:
        json.dump(u, f, ensure_ascii=False, indent=2)

def add_xp(u: dict, amount: int, reason: str = ""):
    u["xp"] += amount
    old_level = u["level"]
    for lvl, (lo, hi, title) in LEVELS.items():
        if lo <= u["xp"] < hi:
            u["level"] = lvl
            break
    if u["level"] > old_level:
        title = LEVELS[u["level"]][2]
        print(f"\n{Back.YELLOW}{Fore.BLACK}  LEVEL UP! Du bist jetzt Level {u['level']}: {title}  {Style.RESET_ALL}")
    if reason:
        print(f"  {Fore.GREEN}+{amount} XP{Style.RESET_ALL} - {reason}")

def xp_bar(u: dict) -> str:
    lvl = u["level"]
    lo, hi, title = LEVELS.get(lvl, (0, 100, "?"))
    current = u["xp"] - lo
    needed  = hi - lo
    filled  = int((current / needed) * 20) if needed > 0 else 20
    bar = "#" * filled + "-" * (20 - filled)
    return f"[{bar}] {current}/{needed} XP  |  Level {lvl}: {title}"

def stars(score: int) -> str:
    if score >= 5:
        return Fore.GREEN + "***" + Style.RESET_ALL
    elif score >= 4:
        return Fore.YELLOW + "** " + Style.RESET_ALL
    elif score >= 2:
        return Fore.WHITE + "*  " + Style.RESET_ALL
    return "   "

def chance_label(score: int) -> str:
    if score >= 5:
        return Fore.GREEN + "Stark " + Style.RESET_ALL
    elif score >= 4:
        return Fore.YELLOW + "Mittel" + Style.RESET_ALL
    elif score >= 2:
        return Fore.WHITE + "Schwach" + Style.RESET_ALL
    return Fore.RED + "Kein  " + Style.RESET_ALL

def risk_pct_label(score: int) -> str:
    if score >= 4:
        return Fore.GREEN + "25%" + Style.RESET_ALL
    elif score >= 2:
        return Fore.YELLOW + "45%" + Style.RESET_ALL
    return Fore.RED + "70%" + Style.RESET_ALL

def trade_size(u: dict) -> float:
    cfg = RISK_CONFIG.get(u["risk_level"], RISK_CONFIG["moderat"])
    return round(u["capital"] * cfg["pct"] / 100, 2)

def print_header(title: str):
    print(f"\n{Fore.CYAN}{'='*62}")
    print(f"  {title}")
    print(f"{'='*62}{Style.RESET_ALL}")

def divider():
    print(f"{Fore.CYAN}{'-'*62}{Style.RESET_ALL}")

def pause():
    input(f"\n{Fore.CYAN}[Enter] Zurueck zum Menue...{Style.RESET_ALL}")

# ─────────────────────────────────────────────────────────────────
#  SIGNAL ENGINE
# ─────────────────────────────────────────────────────────────────

def calculate_signals(ticker: str) -> dict | None:
    try:
        df = yf.download(ticker, period="3mo", interval="1d",
                         progress=False, auto_adjust=True)
        if df.empty or len(df) < 30:
            return None
        close = df["Close"].squeeze()
        rsi = ta.momentum.RSIIndicator(close, window=14).rsi().iloc[-1]
        macd_obj = ta.trend.MACD(close)
        macd = macd_obj.macd().iloc[-1]
        macd_sig = macd_obj.macd_signal().iloc[-1]
        ma20 = close.rolling(20).mean().iloc[-1]
        ma50 = close.rolling(50).mean().iloc[-1]
        price = close.iloc[-1]
        change_5d = ((price - close.iloc[-6]) / close.iloc[-6]) * 100

        score = 0
        reasons = []
        if rsi < 35:
            score += 2; reasons.append(f"RSI {rsi:.0f} (ueberverkauft)")
        elif rsi < 50:
            score += 1; reasons.append(f"RSI {rsi:.0f} (neutral-bullish)")
        elif rsi > 70:
            score -= 2; reasons.append(f"RSI {rsi:.0f} (ueberkauft)")
        else:
            reasons.append(f"RSI {rsi:.0f} (neutral)")

        if macd > macd_sig:
            score += 2; reasons.append("MACD bullish")
        else:
            score -= 1; reasons.append("MACD bearish")

        if price > ma20 > ma50:
            score += 2; reasons.append("Aufwaertstrend (MA20>MA50)")
        elif price < ma20 < ma50:
            score -= 2; reasons.append("Abwaertstrend")
        else:
            reasons.append("Trend gemischt")

        signal = "KAUFEN" if score >= 4 else ("VERKAUFEN" if score <= -2 else "HALTEN")
        return {"price": price, "rsi": rsi, "change_5d": change_5d,
                "signal": signal, "score": score, "reasons": reasons}
    except Exception:
        return None

def signal_color(signal: str) -> str:
    if signal == "KAUFEN":
        return Fore.GREEN + Style.BRIGHT + signal + Style.RESET_ALL
    elif signal == "VERKAUFEN":
        return Fore.RED + Style.BRIGHT + signal + Style.RESET_ALL
    return Fore.YELLOW + signal + Style.RESET_ALL

# ─────────────────────────────────────────────────────────────────
#  KAPITAL-EMPFEHLUNG AUSGEBEN
# ─────────────────────────────────────────────────────────────────

def print_trade_advice(u: dict, price: float, score: int, name: str):
    if u["capital"] <= 0:
        return
    cfg  = RISK_CONFIG[u["risk_level"]]
    size = trade_size(u)
    units = size / price if price > 0 else 0
    sl   = price * (1 - cfg["stop_loss"] / 100)
    tp   = price * (1 + cfg["take_profit"] / 100)

    print(f"\n  {Fore.CYAN}--- Handelsempfehlung ({cfg['label']}) ---{Style.RESET_ALL}")
    print(f"  Einsatz:      {size:.2f} EUR  ({cfg['pct']}% deines Kapitals)")
    print(f"  Anteile:      ca. {units:.4f} Stueck bei {price:.2f} EUR")
    print(f"  Stop-Loss:    {sl:.2f} EUR  (-{cfg['stop_loss']}%)")
    print(f"  Take-Profit:  {tp:.2f} EUR  (+{cfg['take_profit']}%)")
    print(f"  Chance:       {chance_label(score)}  {stars(score)}")
    print(f"  Verlustrisiko:{risk_pct_label(score)}")
    print(f"  {Fore.YELLOW}-> Setze in Trade Republic eine Limit-Order bei {price:.2f} EUR{Style.RESET_ALL}")

# ─────────────────────────────────────────────────────────────────
#  ANALYSEN
# ─────────────────────────────────────────────────────────────────

def analyze_stocks(u: dict):
    print_header("TOP 20 AKTIEN - SIGNALE")
    print(f"{'Name':<14} {'Kurs':>8} {'5T%':>7} {'RSI':>5}  {'Ch':>6}  Signal")
    divider()
    buys = []
    for name, ticker in TOP20_STOCKS.items():
        r = calculate_signals(ticker)
        if not r:
            print(f"{name:<14}  Keine Daten")
            continue
        cc = Fore.GREEN if r["change_5d"] > 0 else Fore.RED
        s = stars(r["score"])
        print(f"{name:<14} {r['price']:>8.2f} {cc}{r['change_5d']:>+6.1f}%{Style.RESET_ALL}"
              f" {r['rsi']:>5.0f}  {s}  {signal_color(r['signal'])}")
        if r["signal"] == "KAUFEN":
            buys.append((name, ticker, r["price"], r["score"], r))

    if buys:
        print(f"\n{Fore.GREEN}* KAUFSIGNALE:{Style.RESET_ALL}")
        for name, ticker, price, score, r in sorted(buys, key=lambda x: -x[3]):
            print(f"\n  {Fore.GREEN}{name} ({ticker}){Style.RESET_ALL}  {stars(score)}")
            print(f"  Begruendung: {', '.join(r['reasons'])}")
            print_trade_advice(u, price, score, name)
    pause()

def analyze_cryptos(u: dict):
    print_header("TOP KRYPTOS - SIGNALE")
    try:
        params = {"vs_currency": "eur", "ids": ",".join(TOP_CRYPTOS),
                  "order": "market_cap_desc", "price_change_percentage": "7d"}
        data = requests.get("https://api.coingecko.com/api/v3/coins/markets",
                            params=params, timeout=15).json()
    except Exception as e:
        print(f"{Fore.RED}Fehler: {e}{Style.RESET_ALL}"); pause(); return

    print(f"{'Name':<16} {'Preis':>12} {'24h':>7} {'7T':>7}  {'Ch':>5}  Signal")
    divider()
    buys = []
    for coin in data:
        name  = coin.get("name", "?")[:15]
        price = coin.get("current_price", 0) or 0
        c24   = coin.get("price_change_percentage_24h") or 0
        c7    = coin.get("price_change_percentage_7d_in_currency") or 0
        score = 0
        if c24 > 3:  score += 1
        elif c24 < -3: score -= 1
        if c7 > 10:  score += 2
        elif c7 < -10: score -= 2
        sig = "KAUFEN" if score >= 2 else ("VERKAUFEN" if score <= -1 else "HALTEN")
        ps  = f"{price:,.4f} E" if price < 1 else f"{price:,.2f} E"
        c24c = Fore.GREEN if c24 > 0 else Fore.RED
        c7c  = Fore.GREEN if c7  > 0 else Fore.RED
        s    = stars(score)
        print(f"{name:<16} {ps:>12} {c24c}{c24:>+6.1f}%{Style.RESET_ALL}"
              f" {c7c}{c7:>+6.1f}%{Style.RESET_ALL}  {s}  {signal_color(sig)}")
        if sig == "KAUFEN":
            buys.append((name, price, score))

    if buys:
        print(f"\n{Fore.GREEN}* KAUFSIGNALE:{Style.RESET_ALL}")
        for name, price, score in sorted(buys, key=lambda x: -x[2]):
            print(f"\n  {Fore.GREEN}{name}{Style.RESET_ALL}  {stars(score)}")
            print_trade_advice(u, price, score, name)
    pause()

def analyze_small_cap_cryptos(u: dict):
    print_header("KLEINE KRYPTOS MIT POTENZIAL (Spekulativ!)")
    print(f"{Fore.YELLOW}WARNUNG: Hochspekulativ. Nur Kapital einsetzen, dessen Verlust du verkraften kannst.{Style.RESET_ALL}\n")
    try:
        params = {"vs_currency": "eur", "order": "volume_desc",
                  "per_page": 250, "page": 1, "price_change_percentage": "7d,30d"}
        data = requests.get("https://api.coingecko.com/api/v3/coins/markets",
                            params=params, timeout=15).json()
    except Exception as e:
        print(f"{Fore.RED}Fehler: {e}{Style.RESET_ALL}"); pause(); return

    candidates = []
    for coin in data:
        mcap = coin.get("market_cap") or 0
        vol  = coin.get("total_volume") or 0
        price = coin.get("current_price") or 0
        c7   = coin.get("price_change_percentage_7d_in_currency") or 0
        c24  = coin.get("price_change_percentage_24h") or 0
        if not (5_000_000 <= mcap <= 500_000_000) or vol < 500_000 or price <= 0:
            continue
        score = 0
        if c7  > 15: score += 2
        elif c7 > 5: score += 1
        if c24 > 5:  score += 1
        if vol / mcap > 0.3: score += 2
        if score >= 3:
            candidates.append({"name": coin.get("name","?"),
                                "sym": coin.get("symbol","?").upper(),
                                "price": price, "mcap": mcap,
                                "c7": c7, "c24": c24, "score": score})

    for c in sorted(candidates, key=lambda x: -x["score"])[:10]:
        vola = abs(c["c7"]) * 1.5
        ps = f"{c['price']:.6f} E" if c["price"] < 0.01 else f"{c['price']:.4f} E"
        risk = Fore.RED + "EXTREM HOCH" + Style.RESET_ALL
        print(f"{Fore.CYAN}{c['name']} ({c['sym']}){Style.RESET_ALL}  {stars(c['score'])}")
        print(f"  Preis:       {ps}")
        print(f"  Marktkapital:{c['mcap']/1e6:.1f} Mio E")
        print(f"  7-Tage:      {Fore.GREEN if c['c7']>0 else Fore.RED}{c['c7']:+.1f}%{Style.RESET_ALL}"
              f"  24h: {c['c24']:+.1f}%")
        print(f"  Chance:      {chance_label(c['score'])}")
        print(f"  Verlustrisiko:{risk_pct_label(c['score'])}")
        print(f"  Potenzial:   +{vola*0.5:.0f}% bis +{vola*3:.0f}%  (Volatilitaet, KEINE Garantie)")
        print(f"  Risiko:      {risk}")
        if u["capital"] > 0:
            einsatz = min(trade_size(u), u["capital"] * 0.05)
            print(f"  Empf. Einsatz: {einsatz:.2f} EUR (max. 5% deines Kapitals bei Small Caps)")
        print()
    pause()

def analyze_small_cap_stocks(u: dict):
    print_header("KLEINE AKTIEN MIT POTENZIAL (Spekulativ!)")
    print(f"{Fore.YELLOW}WARNUNG: Hochspekulativ. Nur Kapital einsetzen, dessen Verlust du verkraften kannst.{Style.RESET_ALL}\n")
    candidates = []
    for name, ticker in SMALL_CAP_STOCKS.items():
        r = calculate_signals(ticker)
        if not r or r["score"] < 2:
            continue
        try:
            mcap = yf.Ticker(ticker).fast_info.market_cap or 0
        except Exception:
            mcap = 0
        candidates.append({"name": name, "ticker": ticker,
                            "price": r["price"], "mcap": mcap,
                            "c5": r["change_5d"], "rsi": r["rsi"],
                            "score": r["score"], "signal": r["signal"]})

    if not candidates:
        print("Heute keine Kaufkandidaten unter Small-Cap-Aktien.")
        pause(); return

    for c in sorted(candidates, key=lambda x: -x["score"])[:10]:
        mcap_s = f"{c['mcap']/1e6:.0f} Mio $" if c["mcap"] > 0 else "unbekannt"
        vola   = abs(c["c5"]) * 2.5
        print(f"{Fore.CYAN}{c['name']} ({c['ticker']}){Style.RESET_ALL}  {stars(c['score'])}")
        print(f"  Preis:       ${c['price']:.4f}")
        print(f"  Marktkapital:{mcap_s}")
        print(f"  5-Tage:      {Fore.GREEN if c['c5']>0 else Fore.RED}{c['c5']:+.1f}%{Style.RESET_ALL}"
              f"  RSI: {c['rsi']:.0f}")
        print(f"  Signal:      {signal_color(c['signal'])}")
        print(f"  Chance:      {chance_label(c['score'])}")
        print(f"  Potenzial:   +{max(5,vola*0.5):.0f}% bis +{vola*3:.0f}%  (KEINE Garantie)")
        print_trade_advice(u, c["price"], c["score"], c["name"])
        print()
    pause()

# ─────────────────────────────────────────────────────────────────
#  PROFIL & EINSTELLUNGEN
# ─────────────────────────────────────────────────────────────────

def profile_menu(u: dict):
    while True:
        clear()
        print_header("PROFIL & EINSTELLUNGEN")
        cfg = RISK_CONFIG[u["risk_level"]]
        print(f"  Name:         {u['name'] or 'nicht gesetzt'}")
        print(f"  Kapital:      {u['capital']:.2f} EUR")
        print(f"  Risikoprofil: {cfg['color']}{cfg['label']}{Style.RESET_ALL}")
        print(f"  Pro Trade:    ~{trade_size(u):.2f} EUR  ({cfg['pct']}% des Kapitals)")
        print(f"  Stop-Loss:    -{cfg['stop_loss']}%   Take-Profit: +{cfg['take_profit']}%")
        print(f"  {cfg['desc']}")
        divider()
        print("  [1] Kapital aendern")
        print("  [2] Risikoprofil aendern")
        print("  [3] Name aendern")
        print("  [0] Zurueck")
        ch = input("\nAuswahl: ").strip()

        if ch == "1":
            try:
                val = float(input("Dein Handelskapital in EUR: ").replace(",", "."))
                if val > 0:
                    u["capital"] = val
                    save_user(u)
                    add_xp(u, 50, "Kapital hinterlegt")
                    save_user(u)
                    done_challenge(u, "set_capital")
                    print(f"{Fore.GREEN}Gespeichert: {val:.2f} EUR{Style.RESET_ALL}")
            except ValueError:
                print(f"{Fore.RED}Ungueltige Eingabe.{Style.RESET_ALL}")
            input("\n[Enter] weiter...")

        elif ch == "2":
            print("\n  [1] Konservativ  (1-2% pro Trade, niedriges Risiko)")
            print("  [2] Moderat      (3-5% pro Trade, ausgewogen)")
            print("  [3] Aggressiv    (6-10% pro Trade, hohes Risiko)")
            rc = input("Auswahl: ").strip()
            mapping = {"1": "konservativ", "2": "moderat", "3": "aggressiv"}
            if rc in mapping:
                u["risk_level"] = mapping[rc]
                save_user(u)
                add_xp(u, 40, "Risikoprofil aktualisiert")
                done_challenge(u, "change_risk")
                save_user(u)
                print(f"{Fore.GREEN}Risikoprofil gesetzt: {mapping[rc]}{Style.RESET_ALL}")
            input("\n[Enter] weiter...")

        elif ch == "3":
            name = input("Dein Name: ").strip()
            if name:
                u["name"] = name
                save_user(u)
                print(f"{Fore.GREEN}Name gespeichert: {name}{Style.RESET_ALL}")
            input("\n[Enter] weiter...")

        elif ch == "0":
            break

# ─────────────────────────────────────────────────────────────────
#  TAEGL. HERAUSFORDERUNGEN
# ─────────────────────────────────────────────────────────────────

def get_today_challenges(u: dict) -> list:
    today = str(date.today())
    key   = f"challenges_{today}"
    if key not in u:
        random.seed(today + str(u.get("level", 1)))
        chosen = random.sample(ALL_CHALLENGES, min(3, len(ALL_CHALLENGES)))
        u[key] = [c["id"] for c in chosen]
        save_user(u)
    ids = u[key]
    return [c for c in ALL_CHALLENGES if c["id"] in ids]

def done_challenge(u: dict, cid: str):
    today = str(date.today())
    done_key = f"done_{today}"
    if done_key not in u:
        u[done_key] = []
    if cid not in u[done_key]:
        u[done_key].append(cid)
        for c in ALL_CHALLENGES:
            if c["id"] == cid:
                add_xp(u, c["xp"], f"Herausforderung abgeschlossen: {c['text']}")
                break
        save_user(u)

def show_challenges(u: dict):
    clear()
    print_header("TAGESHERAUSFORDERUNGEN")
    today     = str(date.today())
    done_key  = f"done_{today}"
    done_list = u.get(done_key, [])
    challenges = get_today_challenges(u)

    all_done = True
    for c in challenges:
        status = f"{Fore.GREEN}[OK]{Style.RESET_ALL}" if c["id"] in done_list else f"{Fore.RED}[ ]{Style.RESET_ALL}"
        print(f"  {status} {c['text']}  (+{c['xp']} XP)")
        if c["id"] not in done_list:
            all_done = False

    if all_done:
        print(f"\n{Back.GREEN}{Fore.BLACK}  Alle Herausforderungen heute abgeschlossen!  {Style.RESET_ALL}")
        print(f"  {Fore.YELLOW}Komm morgen wieder fuer neue Aufgaben.{Style.RESET_ALL}")

    divider()
    print(f"  {xp_bar(u)}")
    print(f"  Streak: {u['streak']} Tag(e) in Folge")
    pause()

# ─────────────────────────────────────────────────────────────────
#  TUTORIAL CHAT
# ─────────────────────────────────────────────────────────────────

def tutorial_chat(u: dict):
    done_challenge(u, "use_tutorial")
    while True:
        clear()
        print_header("TUTORIAL CHAT")
        print(f"  {Fore.CYAN}Waehle eine Frage - ich erklaere dir alles:{Style.RESET_ALL}\n")
        for i, faq in enumerate(FAQ, 1):
            print(f"  [{i:>2}] {faq['q']}")
        print(f"\n  [ 0] Zurueck\n")
        ch = input("Deine Auswahl: ").strip()
        if ch == "0":
            break
        try:
            idx = int(ch) - 1
            if 0 <= idx < len(FAQ):
                clear()
                print_header(FAQ[idx]["q"])
                print()
                for line in FAQ[idx]["a"].split("\n"):
                    print(f"  {line}")
                add_xp(u, 5, "FAQ gelesen")
                save_user(u)
                pause()
        except ValueError:
            pass

# ─────────────────────────────────────────────────────────────────
#  EXE ANLEITUNG
# ─────────────────────────────────────────────────────────────────


# ─────────────────────────────────────────────────────────────────
#  LOGIN / STREAK
# ─────────────────────────────────────────────────────────────────

def handle_login(u: dict):
    today = str(date.today())
    if u["last_login"] == today:
        return
    if u["last_login"]:
        from datetime import timedelta
        last = date.fromisoformat(u["last_login"])
        if (date.today() - last).days == 1:
            u["streak"] += 1
            streak_xp = min(u["streak"] * 10, 100)
            add_xp(u, streak_xp, f"{u['streak']}-Tage-Streak Bonus")
        elif (date.today() - last).days > 1:
            u["streak"] = 1
    else:
        u["streak"] = 1
        add_xp(u, 20, "Erster Login")
    u["last_login"] = today
    save_user(u)

def first_setup(u: dict):
    clear()
    print_header("WILLKOMMEN BEIM TRADE SIGNAL SYSTEM")
    print("\n  Ich helfe dir dabei, bessere Handelsentscheidungen zu treffen.")
    print("  Lass uns kurz dein Profil einrichten.\n")
    name = input("  Wie heisst du? ").strip()
    if name:
        u["name"] = name
    try:
        cap = float(input("  Wie viel EUR moechtest du handeln (dein Kapital)? ").replace(",","."))
        if cap > 0:
            u["capital"] = cap
    except ValueError:
        pass
    print("\n  Risikoprofil:")
    print("  [1] Konservativ - wenig Risiko, ruhiger Schlaf")
    print("  [2] Moderat     - ausgewogen (empfohlen fuer Einsteiger)")
    print("  [3] Aggressiv   - hoehere Chancen, hoehere Verluste moeglich")
    rc = input("\n  Auswahl [1/2/3]: ").strip()
    mapping = {"1": "konservativ", "2": "moderat", "3": "aggressiv"}
    u["risk_level"] = mapping.get(rc, "moderat")
    add_xp(u, 100, "Profil erstellt")
    save_user(u)
    print(f"\n  {Fore.GREEN}Perfekt! Dein Profil ist gespeichert.{Style.RESET_ALL}")
    input("\n  [Enter] Starten...")

# ─────────────────────────────────────────────────────────────────
#  HAUPT-MENUE
# ─────────────────────────────────────────────────────────────────

def main():
    u = load_user()

    if not u["name"]:
        first_setup(u)

    handle_login(u)

    while True:
        clear()
        cfg  = RISK_CONFIG[u["risk_level"]]
        today = str(date.today())
        done_today = len(u.get(f"done_{today}", []))
        challenges_today = len(get_today_challenges(u))

        print(f"\n{Fore.CYAN}  ============================================")
        print(f"       TRADE SIGNAL SYSTEM")
        print(f"       {datetime.now().strftime('%d.%m.%Y  %H:%M')}")
        print(f"  ============================================{Style.RESET_ALL}")
        print(f"  Hallo {u['name'] or 'Trader'}!  Kapital: {Fore.GREEN}{u['capital']:.2f} EUR{Style.RESET_ALL}"
              f"  |  Profil: {cfg['color']}{cfg['label']}{Style.RESET_ALL}")
        print(f"  {xp_bar(u)}")
        print(f"  Herausforderungen heute: {done_today}/{challenges_today} abgeschlossen"
              f"  |  Streak: {u['streak']} Tag(e)")
        divider()
        print("  [1] Top 20 Aktien analysieren")
        print("  [2] Top Kryptos analysieren")
        print("  [3] Kleine Kryptos mit Potenzial")
        print("  [4] Kleine Aktien mit Potenzial")
        print("  [5] Alles auf einmal anzeigen")
        divider()
        print("  [H] Tagesherausforderungen anzeigen")
        print("  [T] Tutorial Chat (FAQ)")
        print("  [P] Profil & Einstellungen")
        print("  [0] Beenden")
        divider()

        ch = input("\n  Auswahl: ").strip().upper()

        if ch == "1":
            done_challenge(u, "view_stocks")
            u["total_signals_viewed"] += 1
            save_user(u)
            analyze_stocks(u)
        elif ch == "2":
            done_challenge(u, "view_crypto")
            u["total_signals_viewed"] += 1
            save_user(u)
            analyze_cryptos(u)
        elif ch == "3":
            done_challenge(u, "view_small_c")
            u["total_signals_viewed"] += 1
            save_user(u)
            analyze_small_cap_cryptos(u)
        elif ch == "4":
            done_challenge(u, "view_small_s")
            u["total_signals_viewed"] += 1
            save_user(u)
            analyze_small_cap_stocks(u)
        elif ch == "5":
            done_challenge(u, "view_all")
            u["total_signals_viewed"] += 1
            save_user(u)
            analyze_stocks(u)
            analyze_cryptos(u)
            analyze_small_cap_cryptos(u)
            analyze_small_cap_stocks(u)
        elif ch == "H":
            show_challenges(u)
        elif ch == "T":
            tutorial_chat(u)
        elif ch == "P":
            profile_menu(u)
        elif ch == "0":
            print(f"\n  {Fore.CYAN}Bis morgen! Dein Streak: {u['streak']} Tag(e){Style.RESET_ALL}\n")
            break

# ─────────────────────────────────────────────────────────────────
#  AUTO-UPDATE
# ─────────────────────────────────────────────────────────────────

def check_for_update():
    """Prueft beim Start ob eine neuere Version auf GitHub verfuegbar ist."""
    try:
        response = requests.get(UPDATE_URL, timeout=8)
        if response.status_code != 200:
            return

        remote_code = response.text

        # Versionsnummer aus dem heruntergeladenen Code lesen
        remote_version = None
        for line in remote_code.splitlines():
            if line.startswith("VERSION = "):
                remote_version = line.split('"')[1]
                break

        if not remote_version or remote_version == VERSION:
            return

        # Versionen vergleichen (z.B. "2.1.0" vs "2.2.0")
        def ver_tuple(v):
            return tuple(int(x) for x in v.split("."))

        if ver_tuple(remote_version) <= ver_tuple(VERSION):
            return

        print(f"\n{Fore.CYAN}  Update verfuegbar: {VERSION} -> {remote_version}{Style.RESET_ALL}")
        print(f"  Lade neue Version herunter...")

        this_file = os.path.abspath(sys.argv[0])
        backup    = this_file + ".bak"

        # Backup der aktuellen Version anlegen
        shutil.copy2(this_file, backup)

        # Neue Version schreiben
        with open(this_file, "w", encoding="utf-8") as f:
            f.write(remote_code)

        print(f"  {Fore.GREEN}Update erfolgreich! Starte neu...{Style.RESET_ALL}\n")

        # Neustart
        subprocess.Popen([sys.executable, this_file] + sys.argv[1:])
        sys.exit(0)

    except Exception:
        # Kein Internet oder Fehler -> still weiterlaufen
        pass


if __name__ == "__main__":
    check_for_update()
    main()
