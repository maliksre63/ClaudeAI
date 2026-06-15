# -*- coding: utf-8 -*-
"""
Trading Signal System - Trade Republic Assistant
Analysiert Top 20 Aktien + Kryptos und gibt Kauf/Verkauf-Signale
"""

import warnings
import logging
warnings.filterwarnings("ignore")
logging.getLogger("yfinance").setLevel(logging.CRITICAL)

import yfinance as yf
import pandas as pd
import ta
import requests
from datetime import datetime
from colorama import init, Fore, Style

init(autoreset=True)

# ─────────────────────────────────────────────
#  WATCHLISTS
# ─────────────────────────────────────────────

TOP20_STOCKS = {
    "Apple":      "AAPL",
    "Microsoft":  "MSFT",
    "Nvidia":     "NVDA",
    "Amazon":     "AMZN",
    "Alphabet":   "GOOGL",
    "Meta":       "META",
    "Tesla":      "TSLA",
    "Berkshire":  "BRK-B",
    "TSMC":       "TSM",
    "Broadcom":   "AVGO",
    "Eli Lilly":  "LLY",
    "JPMorgan":   "JPM",
    "Visa":       "V",
    "ExxonMobil": "XOM",
    "UnitedHealth":"UNH",
    "Johnson&J":  "JNJ",
    "Samsung":    "005930.KS",
    "Walmart":    "WMT",
    "Mastercard": "MA",
    "Procter&G":  "PG",
}

# Small-Cap Aktien mit Potenzial (Marktkapital ~50M–5B USD)
SMALL_CAP_STOCKS = {
    "SoundHound":     "SOUN",
    "Joby Aviation":  "JOBY",
    "Archer Aviation":"ACHR",
    "Lucid Group":    "LCID",
    "Cipher Mining":  "CIFR",
    "Bit Digital":    "BTBT",
    "Mara Holdings":  "MARA",
    "Riot Platforms": "RIOT",
    "Redwire":        "RDW",
    "Rocket Lab":     "RKLB",
    "Intuitive Mach": "LUNR",
    "Ondas Holdings": "ONDS",
    "ProQR Therap":   "PRQR",
    "Serve Robotics": "SERV",
    "Gorilla Tech":   "GRRR",
    "Quantum Corp":   "QMCO",
    "Inpixon":        "INPX",
    "BM Technologies":"BMTX",
    "Idex Corp":      "IDEX",
    "Pono Music":     "PNTM",
}

TOP_CRYPTOS = [
    "bitcoin", "ethereum", "tether", "binancecoin", "solana",
    "ripple", "usd-coin", "dogecoin", "cardano", "avalanche-2",
    "shiba-inu", "chainlink", "polkadot", "tron", "bitcoin-cash",
    "near", "matic-network", "litecoin", "internet-computer", "uniswap",
]

# ─────────────────────────────────────────────
#  SIGNAL ENGINE
# ─────────────────────────────────────────────

def calculate_signals(ticker: str) -> dict:
    try:
        df = yf.download(ticker, period="3mo", interval="1d", progress=False, auto_adjust=True)
        if df.empty or len(df) < 30:
            return None

        close = df["Close"].squeeze()

        rsi = ta.momentum.RSIIndicator(close, window=14).rsi().iloc[-1]
        macd_obj = ta.trend.MACD(close)
        macd = macd_obj.macd().iloc[-1]
        macd_signal = macd_obj.macd_signal().iloc[-1]
        ma20 = close.rolling(20).mean().iloc[-1]
        ma50 = close.rolling(50).mean().iloc[-1]
        current_price = close.iloc[-1]
        prev_price = close.iloc[-6]
        change_5d = ((current_price - prev_price) / prev_price) * 100

        score = 0
        reasons = []

        if rsi < 35:
            score += 2
            reasons.append(f"RSI {rsi:.0f} (überverkauft)")
        elif rsi < 50:
            score += 1
            reasons.append(f"RSI {rsi:.0f} (neutral-bullish)")
        elif rsi > 70:
            score -= 2
            reasons.append(f"RSI {rsi:.0f} (überkauft)")
        else:
            reasons.append(f"RSI {rsi:.0f} (neutral)")

        if macd > macd_signal:
            score += 2
            reasons.append("MACD bullish Kreuzung")
        else:
            score -= 1
            reasons.append("MACD bearish")

        if current_price > ma20 > ma50:
            score += 2
            reasons.append("Preis über MA20 & MA50 (Aufwärtstrend)")
        elif current_price < ma20 < ma50:
            score -= 2
            reasons.append("Preis unter MA20 & MA50 (Abwärtstrend)")
        else:
            reasons.append("Trend gemischt")

        if score >= 4:
            signal = "KAUFEN"
        elif score <= -2:
            signal = "VERKAUFEN"
        else:
            signal = "HALTEN"

        return {
            "price": current_price,
            "rsi": rsi,
            "change_5d": change_5d,
            "signal": signal,
            "score": score,
            "reasons": reasons,
        }
    except Exception:
        return None


def signal_color(signal: str) -> str:
    if signal == "KAUFEN":
        return Fore.GREEN + Style.BRIGHT + signal
    elif signal == "VERKAUFEN":
        return Fore.RED + Style.BRIGHT + signal
    return Fore.YELLOW + signal


def print_header(title: str):
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}{Style.RESET_ALL}")


# ─────────────────────────────────────────────
#  AKTIEN ANALYSE
# ─────────────────────────────────────────────

def analyze_stocks():
    print_header("TOP 20 AKTIEN — SIGNALE")
    print(f"{'Name':<14} {'Kurs':>8} {'5T%':>7} {'RSI':>5}  Signal   Begründung")
    print("-" * 80)

    buy_list = []

    for name, ticker in TOP20_STOCKS.items():
        result = calculate_signals(ticker)
        if not result:
            print(f"{name:<14} {'Fehler':>8}")
            continue

        price = result["price"]
        change = result["change_5d"]
        rsi = result["rsi"]
        signal = result["signal"]
        reasons = result["reasons"][0]

        change_str = f"{change:+.1f}%"
        change_color = Fore.GREEN if change > 0 else Fore.RED
        sig_str = signal_color(signal)

        print(f"{name:<14} {price:>8.2f} {change_color}{change_str:>7}{Style.RESET_ALL} {rsi:>5.0f}  {sig_str:<20} {reasons}")

        if signal == "KAUFEN":
            buy_list.append((name, ticker, price, result["score"]))

    if buy_list:
        print(f"\n{Fore.GREEN}* KAUFEMPFEHLUNGEN:{Style.RESET_ALL}")
        for name, ticker, price, score in sorted(buy_list, key=lambda x: -x[3]):
            print(f"  → {name} ({ticker}) bei ${price:.2f}  [Score: {score}/6]")


# ─────────────────────────────────────────────
#  KRYPTO ANALYSE
# ─────────────────────────────────────────────

def analyze_cryptos():
    print_header("TOP KRYPTOS — SIGNALE")

    try:
        url = "https://api.coingecko.com/api/v3/coins/markets"
        params = {
            "vs_currency": "eur",
            "ids": ",".join(TOP_CRYPTOS),
            "order": "market_cap_desc",
            "price_change_percentage": "7d",
        }
        r = requests.get(url, params=params, timeout=15)
        data = r.json()
    except Exception as e:
        print(f"{Fore.RED}Krypto-Daten nicht verfügbar: {e}{Style.RESET_ALL}")
        return

    print(f"{'Name':<16} {'Preis':>12} {'24h%':>7} {'7T%':>7}  Signal")
    print("-" * 60)

    buy_list = []

    for coin in data:
        name = coin.get("name", "?")[:15]
        price = coin.get("current_price", 0)
        change_24h = coin.get("price_change_percentage_24h") or 0
        change_7d = coin.get("price_change_percentage_7d_in_currency") or 0

        score = 0
        if change_24h > 3:
            score += 1
        elif change_24h < -3:
            score -= 1
        if change_7d > 10:
            score += 2
        elif change_7d < -10:
            score -= 2

        rsi_approx = 50 + (change_7d * 0.8)
        rsi_approx = max(10, min(90, rsi_approx))

        if score >= 2:
            signal = "KAUFEN"
        elif score <= -1:
            signal = "VERKAUFEN"
        else:
            signal = "HALTEN"

        c24 = f"{change_24h:+.1f}%"
        c7 = f"{change_7d:+.1f}%"
        c24_col = Fore.GREEN if change_24h > 0 else Fore.RED
        c7_col = Fore.GREEN if change_7d > 0 else Fore.RED
        sig_str = signal_color(signal)

        price_str = f"{price:,.4f} €" if price < 1 else f"{price:,.2f} €"
        print(f"{name:<16} {price_str:>12} {c24_col}{c24:>7}{Style.RESET_ALL} {c7_col}{c7:>7}{Style.RESET_ALL}  {sig_str}")

        if signal == "KAUFEN":
            buy_list.append((name, price, score))

    if buy_list:
        print(f"\n{Fore.GREEN}* KAUFEMPFEHLUNGEN:{Style.RESET_ALL}")
        for name, price, score in sorted(buy_list, key=lambda x: -x[2]):
            price_str = f"{price:,.4f} €" if price < 1 else f"{price:,.2f} €"
            print(f"  → {name} bei {price_str}")


# ─────────────────────────────────────────────
#  KLEINE KRYPTOS MIT POTENZIAL
# ─────────────────────────────────────────────

def analyze_small_cap_stocks():
    print_header("KLEINE AKTIEN MIT POTENZIAL (Spekulativ!)")
    print(f"{Fore.YELLOW}WARNUNG: Hochspekulativ. Nur mit Kapital investieren, dessen Verlust du verkraften kannst.{Style.RESET_ALL}\n")

    candidates = []
    for name, ticker in SMALL_CAP_STOCKS.items():
        result = calculate_signals(ticker)
        if not result:
            continue

        price = result["price"]
        change_5d = result["change_5d"]
        rsi = result["rsi"]
        score = result["score"]
        signal = result["signal"]

        if signal == "KAUFEN" or score >= 2:
            try:
                info = yf.Ticker(ticker).fast_info
                mcap = getattr(info, "market_cap", None) or 0
            except Exception:
                mcap = 0

            volatility = abs(change_5d) * 2.5
            min_gain = max(5, volatility * 0.5)
            max_gain = volatility * 3.0

            candidates.append({
                "name": name,
                "ticker": ticker,
                "price": price,
                "mcap": mcap,
                "change_5d": change_5d,
                "rsi": rsi,
                "score": score,
                "signal": signal,
                "min_gain": min_gain,
                "max_gain": max_gain,
            })

    candidates = sorted(candidates, key=lambda x: -x["score"])[:10]

    if not candidates:
        print("Keine Kaufkandidaten unter den Small-Cap-Aktien gefunden.")
        return

    for c in candidates:
        mcap_str = f"{c['mcap']/1_000_000:.0f} Mio $" if c["mcap"] > 0 else "unbekannt"
        c5 = c["change_5d"]
        risk = "SEHR HOCH" if c["score"] < 4 else "HOCH"
        risk_color = Fore.RED if risk == "SEHR HOCH" else Fore.YELLOW

        print(f"{Fore.CYAN}{c['name']} ({c['ticker']}){Style.RESET_ALL}")
        print(f"  Preis:        ${c['price']:.4f}")
        print(f"  Marktkapital: {mcap_str}")
        print(f"  5-Tage:       {Fore.GREEN if c5 > 0 else Fore.RED}{c5:+.1f}%{Style.RESET_ALL}  |  RSI: {c['rsi']:.0f}")
        print(f"  Signal:       {signal_color(c['signal'])}")
        print(f"  Einstieg:     25-500 $  (empfohlen)")
        print(f"  Potenzial:    +{c['min_gain']:.0f}% bis +{c['max_gain']:.0f}%  (basierend auf Volatilität — KEINE Garantie)")
        print(f"  Risiko:       {risk_color}{risk}{Style.RESET_ALL}")
        print()


def analyze_small_caps():
    print_header("KLEINE KRYPTOS MIT POTENZIAL (Spekulativ!)")
    print(f"{Fore.YELLOW}WARNUNG: Hochspekulativ. Nur mit Kapital investieren, dessen Verlust du verkraften kannst.{Style.RESET_ALL}\n")

    try:
        url = "https://api.coingecko.com/api/v3/coins/markets"
        params = {
            "vs_currency": "eur",
            "order": "volume_desc",
            "per_page": 250,
            "page": 1,
            "price_change_percentage": "7d,30d",
        }
        r = requests.get(url, params=params, timeout=15)
        data = r.json()
    except Exception as e:
        print(f"{Fore.RED}Daten nicht verfügbar: {e}{Style.RESET_ALL}")
        return

    candidates = []
    for coin in data:
        mcap = coin.get("market_cap") or 0
        vol = coin.get("total_volume") or 0
        price = coin.get("current_price") or 0
        change_7d = coin.get("price_change_percentage_7d_in_currency") or 0
        change_24h = coin.get("price_change_percentage_24h") or 0

        if mcap < 5_000_000 or mcap > 500_000_000:
            continue
        if vol < 500_000:
            continue
        if price <= 0:
            continue

        vol_mcap_ratio = vol / mcap if mcap > 0 else 0

        score = 0
        if change_7d > 15:
            score += 2
        elif change_7d > 5:
            score += 1
        if change_24h > 5:
            score += 1
        if vol_mcap_ratio > 0.3:
            score += 2

        if score >= 3:
            candidates.append({
                "name": coin.get("name", "?"),
                "symbol": coin.get("symbol", "?").upper(),
                "price": price,
                "mcap": mcap,
                "change_7d": change_7d,
                "change_24h": change_24h,
                "vol_mcap": vol_mcap_ratio,
                "score": score,
            })

    candidates = sorted(candidates, key=lambda x: -x["score"])[:10]

    if not candidates:
        print("Keine geeigneten Kandidaten gefunden.")
        return

    for c in candidates:
        name = c["name"]
        sym = c["symbol"]
        price = c["price"]
        mcap_m = c["mcap"] / 1_000_000
        c7 = c["change_7d"]
        c24 = c["change_24h"]

        volatility = abs(c7) * 1.5
        min_gain = volatility * 0.5
        max_gain = volatility * 3.0
        min_invest = 25
        max_invest = 200

        risk = "SEHR HOCH" if c["score"] < 4 else "EXTREM HOCH"
        risk_color = Fore.RED if risk == "EXTREM HOCH" else Fore.YELLOW

        price_str = f"{price:.6f} €" if price < 0.01 else f"{price:.4f} €"

        print(f"{Fore.CYAN}{name} ({sym}){Style.RESET_ALL}")
        print(f"  Preis:        {price_str}")
        print(f"  Marktkapital: {mcap_m:.1f} Mio €")
        print(f"  7-Tage:       {Fore.GREEN if c7 > 0 else Fore.RED}{c7:+.1f}%{Style.RESET_ALL}  |  24h: {c24:+.1f}%")
        print(f"  Einstieg:     {min_invest}–{max_invest} €  (empfohlen)")
        print(f"  Potenzial:    +{min_gain:.0f}% bis +{max_gain:.0f}%  (historische Volatilität — KEINE Garantie)")
        print(f"  Risiko:       {risk_color}{risk}{Style.RESET_ALL}")
        print()


# ─────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────

def main():
    print(f"\n{Fore.CYAN}{Style.BRIGHT}")
    print("  =========================================")
    print("       TRADE SIGNAL SYSTEM")
    print(f"       {datetime.now().strftime('%d.%m.%Y %H:%M')}")
    print(f"  ========================================={Style.RESET_ALL}")

    print("\nWas möchtest du analysieren?")
    print("  [1] Top 20 Aktien")
    print("  [2] Top Kryptos")
    print("  [3] Kleine Kryptos mit Potenzial")
    print("  [4] Kleine Aktien mit Potenzial")
    print("  [5] Alles anzeigen")
    print("  [0] Beenden")

    choice = input("\nAuswahl: ").strip()

    if choice == "1":
        analyze_stocks()
    elif choice == "2":
        analyze_cryptos()
    elif choice == "3":
        analyze_small_caps()
    elif choice == "4":
        analyze_small_cap_stocks()
    elif choice == "5":
        analyze_stocks()
        analyze_cryptos()
        analyze_small_caps()
        analyze_small_cap_stocks()
    elif choice == "0":
        print("Bis bald!")
        return
    else:
        print("Ungültige Auswahl.")

    print(f"\n{Fore.CYAN}-----------------------------------------------------")
    print(f"  Alle Signale dienen nur zur Information.")
    print(f"  Fuehre Trades manuell in Trade Republic durch.")
    print(f"-----------------------------------------------------{Style.RESET_ALL}\n")


if __name__ == "__main__":
    main()
