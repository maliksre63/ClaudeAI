# -*- coding: utf-8 -*-
VERSION = "2.5.2"
UPDATE_URL = "https://raw.githubusercontent.com/maliksre63/ClaudeAI/master/trading_signals.py"

import warnings, logging, json, os, random, sys, shutil, subprocess, locale
from datetime import datetime, date
warnings.filterwarnings("ignore")
logging.getLogger("yfinance").setLevel(logging.CRITICAL)
logging.getLogger("urllib3").setLevel(logging.CRITICAL)

import yfinance as yf
import pandas as pd
import ta
import requests
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich.columns import Columns
from rich.rule import Rule
from rich.align import Align
from rich.padding import Padding
from colorama import init
init(autoreset=True)

console = Console(highlight=False)

# ---------------------------------------------------------------------------
# Data storage
# ---------------------------------------------------------------------------
APP_NAME = "TradeSignalSystem"
BASE_DIR = os.path.join(os.environ.get("APPDATA", os.path.expanduser("~")), APP_NAME)
os.makedirs(BASE_DIR, exist_ok=True)
USER_FILE = os.path.join(BASE_DIR, "user_data.json")

# ---------------------------------------------------------------------------
# Watchlists
# ---------------------------------------------------------------------------
TOP20_STOCKS = {
    "Apple":"AAPL","Microsoft":"MSFT","Nvidia":"NVDA","Amazon":"AMZN",
    "Alphabet":"GOOGL","Meta":"META","Tesla":"TSLA","Berkshire":"BRK-B",
    "TSMC":"TSM","Broadcom":"AVGO","Eli Lilly":"LLY","JPMorgan":"JPM",
    "Visa":"V","ExxonMobil":"XOM","UnitedHealth":"UNH","Johnson&J":"JNJ",
    "Samsung":"005930.KS","Walmart":"WMT","Mastercard":"MA","Procter&G":"PG",
}
SMALL_CAP_STOCKS = {
    "SoundHound":"SOUN","Joby Aviation":"JOBY","Archer Avn":"ACHR","Lucid Group":"LCID",
    "Cipher Mining":"CIFR","Bit Digital":"BTBT","Mara Holdings":"MARA","Riot Platforms":"RIOT",
    "Redwire":"RDW","Rocket Lab":"RKLB","Intuitive M":"LUNR","Ondas Hold":"ONDS",
    "ProQR":"PRQR","Serve Robot":"SERV","Gorilla Tech":"GRRR","Quantum Corp":"QMCO",
    "BM Tech":"BMTX","Idex Corp":"IDEX","Genie Energy":"GNE","Safe Harbor":"SHFS",
}
TOP_CRYPTOS = [
    "bitcoin","ethereum","binancecoin","solana","ripple","dogecoin","cardano",
    "avalanche-2","shiba-inu","chainlink","polkadot","tron","bitcoin-cash","near",
    "matic-network","litecoin","internet-computer","uniswap","stellar","monero",
]

# ---------------------------------------------------------------------------
# Risk config
# ---------------------------------------------------------------------------
RISK_CONFIG = {
    "konservativ": {"pct":1.5,"stop_loss":5,"take_profit":10},
    "moderat":     {"pct":4.0,"stop_loss":8,"take_profit":20},
    "aggressiv":   {"pct":8.0,"stop_loss":15,"take_profit":40},
}

# ---------------------------------------------------------------------------
# User profile default
# ---------------------------------------------------------------------------
DEFAULT_USER = {
    "name": "",
    "capital": 0.0,
    "risk_level": "moderat",
    "xp": 0,
    "level": 1,
    "streak": 0,
    "last_login": "",
    "total_signals_viewed": 0,
    "lang": "",
    "display_mode": "advanced",
    "done_challenges": [],
}

# ---------------------------------------------------------------------------
# Levels
# ---------------------------------------------------------------------------
LEVELS_XP = {
    1:(0,150),2:(150,400),3:(400,800),4:(800,1500),5:(1500,2500),
    6:(2500,4000),7:(4000,6000),8:(6000,9000),9:(9000,13000),10:(13000,99999)
}

# ---------------------------------------------------------------------------
# Translations
# ---------------------------------------------------------------------------
TRANSLATIONS = {
    "de": {
        "greeting": "Willkommen zurueck",
        "welcome_title": "Willkommen beim Trade Signal System!",
        "welcome_intro": "Dein persoenlicher Boersen-Assistent mit KI-Signalen.",
        "ask_name": "Wie heisst du? ",
        "ask_capital": "Wie viel Kapital moechtest du einsetzen? (EUR, z.B. 1000): ",
        "ask_risk": "Risikoprofil waehlen:",
        "risk_1": "[1] Konservativ - Sicher & stabil",
        "risk_2": "[2] Moderat - Ausgewogen",
        "risk_3": "[3] Aggressiv - Hohe Chance, hohes Risiko",
        "risk_choice": "Deine Wahl (1-3): ",
        "profile_saved": "Profil gespeichert!",
        "press_enter": "Enter druecken um fortzufahren...",
        "capital_label": "Kapital",
        "profile_label": "Profil",
        "challenges_label": "Challenges",
        "streak_label": "Streak",
        "days_label": "Tage",
        "menu_1": "[1] Top 20 Aktien analysieren",
        "menu_2": "[2] Small Caps analysieren",
        "menu_3": "[3] Kryptowaehrungen analysieren",
        "menu_h": "[H] Herausforderungen",
        "menu_t": "[T] Tutorial / FAQ",
        "menu_p": "[P] Profil bearbeiten",
        "menu_0": "[0] Beenden",
        "choice": "Deine Wahl: ",
        "goodbye": "Auf Wiedersehen! Viel Erfolg beim Traden!",
        "buy": "KAUFEN",
        "hold": "HALTEN",
        "sell": "VERKAUFEN",
        "buy_signals": "Kaufsignale",
        "no_data": "Keine Daten",
        "error": "Fehler",
        "warning_spec": "ACHTUNG: Spekulative Werte!",
        "no_candidates": "Keine Kaufkandidaten gefunden.",
        "trade_advice": "Handelsempfehlung",
        "invest_label": "Empfohlenes Investment",
        "units_label": "Einheiten",
        "stop_loss_label": "Stop-Loss",
        "take_profit_label": "Take-Profit",
        "chance_label": "Chance",
        "risk_label": "Risiko",
        "trade_hint": "Nur als Information, kein Finanzrat!",
        "strong": "Stark",
        "medium": "Mittel",
        "weak": "Schwach",
        "none": "Kein Signal",
        "back": "Zurueck",
        "back_menu": "Enter = Zurueck zum Menue",
        "levelup": "LEVEL UP!",
        "xp_gained": "XP erhalten",
        "all_done": "Alle Challenges erledigt!",
        "come_back": "Morgen gibt es neue Challenges.",
        "tutorial_title": "Tutorial & FAQ",
        "tutorial_intro": "Haeufig gestellte Fragen:",
        "faq_read": "Antwort lesen",
        "profile_title": "Profil bearbeiten",
        "name_label": "Name",
        "not_set": "Nicht gesetzt",
        "change_capital": "[1] Kapital aendern",
        "change_risk_menu": "[3] Risikoprofil aendern",
        "change_name": "[4] Name aendern",
        "capital_saved": "Kapital gespeichert!",
        "invalid": "Ungueltige Eingabe.",
        "risk_set": "Risikoprofil gesetzt:",
        "name_saved": "Name gespeichert!",
        "update_available": "Update verfuegbar",
        "downloading": "Lade Update...",
        "update_done": "Update erfolgreich!",
        "first_login": "Erster Login heute!",
        "streak_bonus": "Streak-Bonus",
        "profile_created": "Profil erstellt!",
        "capital_set": "Kapital gesetzt",
        "risk_updated": "Risiko aktualisiert",
        "challenge_done": "Challenge abgeschlossen!",
        "risk_very_high": "Sehr hohes Risiko",
        "risk_high": "Hohes Risiko",
        "risk_moderate": "Moderates Risiko",
        "spec_warning_small": "Diese Werte sind hochspekulativ.",
        "potential": "Potenzial",
        "no_guarantee": "Keine Garantie.",
        "market_cap": "Marktkapitalisierung",
        "price_label": "Kurs",
        "signal_label": "Signal",
        "reason_label": "Grund",
        "recommended_invest": "Empfohlenes Investment",
        "risk_name_k": "Konservativ",
        "risk_name_m": "Moderat",
        "risk_name_a": "Aggressiv",
        "risk_desc_k": "Niedrige Verlustgefahr, stabiles Wachstum",
        "risk_desc_m": "Ausgewogenes Chance-Risiko-Verhaeltnis",
        "risk_desc_a": "Hohe Gewinnchance, hohes Verlustrisiko",
        "display_mode_label": "Anzeigemodus",
        "toggle_mode": "[2] Anzeigemodus wechseln",
        "mode_simple": "Einfach",
        "mode_advanced": "Erweitert",
        "mode_toggled": "Modus gewechselt: {mode}",
        "simple_buy": "Starkes Kaufsignal! Kurs steigt.",
        "simple_hold": "Abwarten. Kein klares Signal.",
        "simple_sell": "Vorsicht! Kurs faellt.",
        "simple_buy_hint": "Mehrere Indikatoren zeigen nach oben. Guter Einstiegszeitpunkt.",
        "simple_hold_hint": "Der Markt ist unklar. Besser warten und beobachten.",
        "simple_sell_hint": "Kurs zeigt nach unten. Investitionen besser absichern.",
        "challenges": [
            {"id":"view_stocks","text":"Top 20 Aktien analysieren","xp":30},
            {"id":"view_crypto","text":"Kryptos analysieren","xp":30},
            {"id":"view_small_c","text":"Small Caps Kryptos ansehen","xp":25},
            {"id":"view_small_s","text":"Small Cap Aktien analysieren","xp":25},
            {"id":"set_capital","text":"Kapital eintragen","xp":50},
            {"id":"change_risk","text":"Risikoprofil anpassen","xp":40},
            {"id":"use_tutorial","text":"Tutorial lesen","xp":35},
            {"id":"view_all","text":"Alle 3 Maerkte analysieren","xp":60},
        ],
        "faq": [
            {"q":"Was ist RSI?","a":"Der RSI (Relative Strength Index) misst, ob ein Wert ueberkauft (>70) oder ueberverkauft (<30) ist."},
            {"q":"Was ist MACD?","a":"MACD zeigt Trendstaerke und -richtung. Ein positiver MACD deutet auf einen Aufwaertstrend hin."},
            {"q":"Was bedeuten die Signale?","a":"KAUFEN = mehrere Indikatoren positiv. HALTEN = unklar. VERKAUFEN = negative Indikatoren."},
            {"q":"Wie viel soll ich investieren?","a":"Nie mehr als 5-10% des Kapitals in einen Wert. Das System rechnet automatisch nach Risikoprofil."},
            {"q":"Was ist Stop-Loss?","a":"Ein Stop-Loss begrenzt Verluste, indem automatisch verkauft wird, wenn der Kurs faellt."},
            {"q":"Was sind Small Caps?","a":"Kleine Unternehmen mit hohem Wachstumspotenzial, aber auch hohem Risiko."},
            {"q":"Wie nutze ich das taeglich?","a":"Jeden Tag einloggen, Signale pruefen, Streak aufbauen und XP sammeln!"},
            {"q":"Was bedeuten die Sterne?","a":"*** = starkes Signal, ** = mittleres Signal, * = schwaches Signal."},
        ],
        "levels": {
            1:"Einsteiger",2:"Beobachter",3:"Analyst",4:"Trader",5:"Profi",
            6:"Experte",7:"Stratege",8:"Meister",9:"Guru",10:"Legende"
        },
    },
    "en": {
        "greeting": "Welcome back",
        "welcome_title": "Welcome to Trade Signal System!",
        "welcome_intro": "Your personal stock assistant with AI signals.",
        "ask_name": "What is your name? ",
        "ask_capital": "How much capital do you want to use? (EUR, e.g. 1000): ",
        "ask_risk": "Choose risk profile:",
        "risk_1": "[1] Conservative - Safe & stable",
        "risk_2": "[2] Moderate - Balanced",
        "risk_3": "[3] Aggressive - High chance, high risk",
        "risk_choice": "Your choice (1-3): ",
        "profile_saved": "Profile saved!",
        "press_enter": "Press Enter to continue...",
        "capital_label": "Capital",
        "profile_label": "Profile",
        "challenges_label": "Challenges",
        "streak_label": "Streak",
        "days_label": "Days",
        "menu_1": "[1] Analyze Top 20 Stocks",
        "menu_2": "[2] Analyze Small Caps",
        "menu_3": "[3] Analyze Cryptocurrencies",
        "menu_h": "[H] Challenges",
        "menu_t": "[T] Tutorial / FAQ",
        "menu_p": "[P] Edit Profile",
        "menu_0": "[0] Exit",
        "choice": "Your choice: ",
        "goodbye": "Goodbye! Good luck trading!",
        "buy": "BUY",
        "hold": "HOLD",
        "sell": "SELL",
        "buy_signals": "Buy Signals",
        "no_data": "No data",
        "error": "Error",
        "warning_spec": "WARNING: Speculative values!",
        "no_candidates": "No buy candidates found.",
        "trade_advice": "Trade Recommendation",
        "invest_label": "Recommended Investment",
        "units_label": "Units",
        "stop_loss_label": "Stop-Loss",
        "take_profit_label": "Take-Profit",
        "chance_label": "Chance",
        "risk_label": "Risk",
        "trade_hint": "For information only, not financial advice!",
        "strong": "Strong",
        "medium": "Medium",
        "weak": "Weak",
        "none": "No Signal",
        "back": "Back",
        "back_menu": "Enter = Back to menu",
        "levelup": "LEVEL UP!",
        "xp_gained": "XP gained",
        "all_done": "All challenges completed!",
        "come_back": "New challenges tomorrow.",
        "tutorial_title": "Tutorial & FAQ",
        "tutorial_intro": "Frequently asked questions:",
        "faq_read": "Read answer",
        "profile_title": "Edit Profile",
        "name_label": "Name",
        "not_set": "Not set",
        "change_capital": "[1] Change capital",
        "change_risk_menu": "[3] Change risk profile",
        "change_name": "[4] Change name",
        "capital_saved": "Capital saved!",
        "invalid": "Invalid input.",
        "risk_set": "Risk profile set:",
        "name_saved": "Name saved!",
        "update_available": "Update available",
        "downloading": "Downloading update...",
        "update_done": "Update successful!",
        "first_login": "First login today!",
        "streak_bonus": "Streak bonus",
        "profile_created": "Profile created!",
        "capital_set": "Capital set",
        "risk_updated": "Risk updated",
        "challenge_done": "Challenge completed!",
        "risk_very_high": "Very high risk",
        "risk_high": "High risk",
        "risk_moderate": "Moderate risk",
        "spec_warning_small": "These values are highly speculative.",
        "potential": "Potential",
        "no_guarantee": "No guarantee.",
        "market_cap": "Market cap",
        "price_label": "Price",
        "signal_label": "Signal",
        "reason_label": "Reason",
        "recommended_invest": "Recommended Investment",
        "risk_name_k": "Conservative",
        "risk_name_m": "Moderate",
        "risk_name_a": "Aggressive",
        "risk_desc_k": "Low risk, stable growth",
        "risk_desc_m": "Balanced risk-reward ratio",
        "risk_desc_a": "High reward potential, high loss risk",
        "display_mode_label": "Display mode",
        "toggle_mode": "[2] Toggle display mode",
        "mode_simple": "Simple",
        "mode_advanced": "Advanced",
        "mode_toggled": "Mode switched: {mode}",
        "simple_buy": "Strong buy signal! Price rising.",
        "simple_hold": "Wait. No clear signal.",
        "simple_sell": "Caution! Price falling.",
        "simple_buy_hint": "Multiple indicators point upward. Good entry point.",
        "simple_hold_hint": "Market is unclear. Better to wait and observe.",
        "simple_sell_hint": "Price trending down. Better to protect investments.",
        "challenges": [
            {"id":"view_stocks","text":"Analyze Top 20 Stocks","xp":30},
            {"id":"view_crypto","text":"Analyze Cryptos","xp":30},
            {"id":"view_small_c","text":"View Small Cap Cryptos","xp":25},
            {"id":"view_small_s","text":"Analyze Small Cap Stocks","xp":25},
            {"id":"set_capital","text":"Enter your capital","xp":50},
            {"id":"change_risk","text":"Adjust risk profile","xp":40},
            {"id":"use_tutorial","text":"Read tutorial","xp":35},
            {"id":"view_all","text":"Analyze all 3 markets","xp":60},
        ],
        "faq": [
            {"q":"What is RSI?","a":"RSI (Relative Strength Index) measures if a value is overbought (>70) or oversold (<30)."},
            {"q":"What is MACD?","a":"MACD shows trend strength and direction. A positive MACD indicates an uptrend."},
            {"q":"What do signals mean?","a":"BUY = multiple positive indicators. HOLD = unclear. SELL = negative indicators."},
            {"q":"How much should I invest?","a":"Never more than 5-10% of capital per asset. The system calculates automatically by risk profile."},
            {"q":"What is Stop-Loss?","a":"A stop-loss limits losses by automatically selling when the price drops."},
            {"q":"What are Small Caps?","a":"Small companies with high growth potential but also high risk."},
            {"q":"How to use this daily?","a":"Log in every day, check signals, build your streak and earn XP!"},
            {"q":"What do the stars mean?","a":"*** = strong signal, ** = medium signal, * = weak signal."},
        ],
        "levels": {
            1:"Beginner",2:"Observer",3:"Analyst",4:"Trader",5:"Pro",
            6:"Expert",7:"Strategist",8:"Master",9:"Guru",10:"Legend"
        },
    },
    "tr": {
        "greeting": "Tekrar hosgeldin",
        "welcome_title": "Ticaret Sinyal Sistemine Hosgeldiniz!",
        "welcome_intro": "Yapay zeka sinyalleri ile kisisel borsa asistanin.",
        "ask_name": "Adiniz nedir? ",
        "ask_capital": "Ne kadar sermaye kullanmak istiyorsunuz? (EUR): ",
        "ask_risk": "Risk profili secin:",
        "risk_1": "[1] Muhafazakar - Guvenli ve istikrarli",
        "risk_2": "[2] Orta - Dengeli",
        "risk_3": "[3] Agresif - Yuksek sans, yuksek risk",
        "risk_choice": "Seciminiz (1-3): ",
        "buy": "AL",
        "hold": "BEKLE",
        "sell": "SAT",
        "menu_1": "[1] Top 20 Hisseleri Analiz Et",
        "menu_2": "[2] Kucuk Sermayeleri Analiz Et",
        "menu_3": "[3] Kripto Para Analiz Et",
        "menu_h": "[H] Gorevler",
        "menu_t": "[T] Ogretici / SSS",
        "menu_p": "[P] Profili Duzenle",
        "menu_0": "[0] Cikis",
        "choice": "Seciminiz: ",
        "goodbye": "Guule guule! Iyi islemler!",
        "simple_buy": "Guclu satin alma sinyali! Fiyat yukseliyor.",
        "simple_hold": "Bekleyin. Net sinyal yok.",
        "simple_sell": "Dikkat! Fiyat dusuyor.",
    },
    "ru": {
        "greeting": "Dobro pozhalovat obratno",
        "welcome_title": "Dobro pozhalovat v sistemu torgovykh signalov!",
        "welcome_intro": "Vash personalnyy birzhevoy assistent s signalami ИИ.",
        "ask_name": "Kak vas zovut? ",
        "ask_capital": "Skolko kapitala khotite ispolzovat? (EUR): ",
        "ask_risk": "Vyberte risk-profil:",
        "risk_1": "[1] Konservativnyy - Bezopasno i stabilno",
        "risk_2": "[2] Umerennyy - Sbalansirovanno",
        "risk_3": "[3] Agressivnyy - Vysokiy shans, vysokiy risk",
        "risk_choice": "Vash vybor (1-3): ",
        "buy": "KUPIT",
        "hold": "ZHDAT",
        "sell": "PRODAT",
        "menu_1": "[1] Analizirovat Top 20 akciy",
        "menu_2": "[2] Analizirovat Small Caps",
        "menu_3": "[3] Analizirovat kriptovalyuty",
        "menu_h": "[H] Zadaniya",
        "menu_t": "[T] Uchebnik / FAQ",
        "menu_p": "[P] Redaktirovat profil",
        "menu_0": "[0] Vykhodit",
        "choice": "Vash vybor: ",
        "goodbye": "Do svidaniya! Udachi v torgovle!",
        "simple_buy": "Silnyy signal na pokupku! Tsena rastet.",
        "simple_hold": "Zhdite. Net chetkogo signala.",
        "simple_sell": "Ostorozhno! Tsena padaet.",
    },
}

# ---------------------------------------------------------------------------
# ASCII Logo
# ---------------------------------------------------------------------------
LOGO = """
 _____ ____      _    ____  _____   ____ ___ ____ _   _    _    _
|_   _|  _ \\    / \\  |  _ \\| ____| / ___|_ _/ ___| \\ | |  / \\  | |
  | | | |_) |  / _ \\ | | | |  _|   \\___ \\| | |  _|  \\| | / _ \\ | |
  | | |  _ <  / ___ \\| |_| | |___   ___) | | |_| | |\\  |/ ___ \\| |___
  |_| |_| \\_\\/_/   \\_\\____/|_____| |____/___\\____|_| \\_/_/   \\_\\_____|
"""

# ---------------------------------------------------------------------------
# Language detection
# ---------------------------------------------------------------------------
def detect_language() -> str:
    try:
        import ctypes
        lcid = ctypes.windll.kernel32.GetUserDefaultUILanguage()
        if lcid in (0x0407, 0x0807, 0x0C07):
            return "de"
        if lcid in (0x0409, 0x0809):
            return "en"
        if lcid == 0x041F:
            return "tr"
        if lcid == 0x0419:
            return "ru"
    except Exception:
        pass
    try:
        loc = locale.getdefaultlocale()[0] or ""
        if loc.startswith("de"):
            return "de"
        if loc.startswith("en"):
            return "en"
        if loc.startswith("tr"):
            return "tr"
        if loc.startswith("ru"):
            return "ru"
    except Exception:
        pass
    return "de"

# ---------------------------------------------------------------------------
# Load / save user
# ---------------------------------------------------------------------------
def load_user() -> dict:
    if os.path.exists(USER_FILE):
        try:
            with open(USER_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            for k, v in DEFAULT_USER.items():
                if k not in data:
                    data[k] = v
            return data
        except Exception:
            pass
    return dict(DEFAULT_USER)

def save_user(u: dict):
    with open(USER_FILE, "w", encoding="utf-8") as f:
        json.dump(u, f, ensure_ascii=False, indent=2)

# ---------------------------------------------------------------------------
# Translation
# ---------------------------------------------------------------------------
def get_lang(u: dict) -> str:
    return u.get("lang") or detect_language()

def T(u: dict, key: str, **kwargs) -> str:
    lang = get_lang(u)
    tr = TRANSLATIONS.get(lang, {})
    de = TRANSLATIONS["de"]
    val = tr.get(key, de.get(key, key))
    if kwargs:
        try:
            val = val.format(**kwargs)
        except Exception:
            pass
    return val

# ---------------------------------------------------------------------------
# Levels / XP
# ---------------------------------------------------------------------------
def get_level_title(u: dict, lvl: int = None) -> str:
    if lvl is None:
        lvl = u.get("level", 1)
    lang = get_lang(u)
    tr = TRANSLATIONS.get(lang, {})
    de = TRANSLATIONS["de"]
    levels = tr.get("levels", de.get("levels", {}))
    return levels.get(lvl, f"Lvl {lvl}")

def add_xp(u: dict, amount: int, reason: str = ""):
    u["xp"] = u.get("xp", 0) + amount
    cur_level = u.get("level", 1)
    new_level = cur_level
    for lvl in range(10, 0, -1):
        lo, hi = LEVELS_XP[lvl]
        if u["xp"] >= lo:
            new_level = lvl
            break
    if new_level > cur_level:
        u["level"] = new_level
        title = get_level_title(u, new_level)
        console.print(Panel(
            f"[bold yellow]{T(u,'levelup')}[/]\n"
            f"[cyan]Level {new_level}: {title}[/]",
            border_style="yellow", padding=(0, 2)
        ))
    if reason:
        console.print(f"  [green]+{amount} {T(u,'xp_gained')}[/] [dim]({reason})[/]")
    save_user(u)

def xp_bar(u: dict) -> Text:
    lvl = u.get("level", 1)
    xp = u.get("xp", 0)
    lo, hi = LEVELS_XP.get(lvl, (0, 150))
    progress = xp - lo
    total = hi - lo
    if total <= 0:
        pct = 1.0
    else:
        pct = min(1.0, max(0.0, progress / total))
    width = 20
    filled = int(pct * width)
    empty = width - filled
    bar = chr(9608) * filled + chr(9617) * empty
    title = get_level_title(u, lvl)
    t = Text()
    t.append(bar, style="cyan")
    t.append(f" {xp}/{hi} XP | Lvl {lvl}: {title}", style="white")
    return t

# ---------------------------------------------------------------------------
# Signal / display helpers
# ---------------------------------------------------------------------------
def stars(score: int) -> str:
    if score >= 3:
        return "[green]***[/]"
    if score == 2:
        return "[yellow]** [/]"
    if score == 1:
        return "[white]*  [/]"
    return "   "

def sig_color(signal: str) -> str:
    return {"buy": "green", "sell": "red", "hold": "yellow"}.get(signal, "white")

def trade_size(u: dict) -> float:
    cap = u.get("capital", 0.0)
    rl = u.get("risk_level", "moderat")
    pct = RISK_CONFIG.get(rl, RISK_CONFIG["moderat"])["pct"]
    return cap * pct / 100

def risk_label_str(u: dict) -> str:
    rl = u.get("risk_level", "moderat")
    names = {
        "konservativ": T(u, "risk_name_k"),
        "moderat": T(u, "risk_name_m"),
        "aggressiv": T(u, "risk_name_a"),
    }
    colors = {"konservativ": "green", "moderat": "yellow", "aggressiv": "red"}
    return f"[{colors.get(rl,'white')}]{names.get(rl,rl)}[/]"

def risk_desc_str(u: dict) -> str:
    rl = u.get("risk_level", "moderat")
    return {
        "konservativ": T(u, "risk_desc_k"),
        "moderat": T(u, "risk_desc_m"),
        "aggressiv": T(u, "risk_desc_a"),
    }.get(rl, "")

def chance_label_str(u: dict, score: int) -> str:
    if score >= 3:
        return f"[green]{T(u,'strong')}[/]"
    if score == 2:
        return f"[yellow]{T(u,'medium')}[/]"
    if score == 1:
        return f"[white]{T(u,'weak')}[/]"
    return f"[dim]{T(u,'none')}[/]"

# ---------------------------------------------------------------------------
# Challenges
# ---------------------------------------------------------------------------
def get_today_challenges(u: dict) -> list:
    lang = get_lang(u)
    tr = TRANSLATIONS.get(lang, {})
    de = TRANSLATIONS["de"]
    return tr.get("challenges", de.get("challenges", []))

def done_challenge(u: dict, cid: str):
    done = u.get("done_challenges", [])
    if cid not in done:
        challenges = get_today_challenges(u)
        xp_amt = 0
        for c in challenges:
            if c["id"] == cid:
                xp_amt = c["xp"]
                break
        done.append(cid)
        u["done_challenges"] = done
        if xp_amt > 0:
            console.print(f"  [green]{T(u,'challenge_done')}[/] [dim](+{xp_amt} XP)[/]")
            add_xp(u, xp_amt, T(u, "challenge_done"))
        save_user(u)

# ---------------------------------------------------------------------------
# UI helpers
# ---------------------------------------------------------------------------
def clear():
    os.system("cls")

def pause(u: dict):
    console.input(f"\n  [cyan]{T(u,'back_menu')}[/]")

def print_header(title: str):
    console.print(Rule(title, style="cyan"))

# ---------------------------------------------------------------------------
# Signal engine
# ---------------------------------------------------------------------------
def calculate_signals(ticker: str) -> dict:
    try:
        df = yf.download(ticker, period="3mo", interval="1d", progress=False, auto_adjust=True)
        if df is None or df.empty or len(df) < 30:
            return None
        close = df["Close"].squeeze()
        if close is None or close.isnull().all():
            return None
        close = close.dropna()
        if len(close) < 30:
            return None

        rsi_ind = ta.momentum.RSIIndicator(close=close, window=14)
        rsi = float(rsi_ind.rsi().iloc[-1])

        macd_ind = ta.trend.MACD(close=close)
        macd_val = float(macd_ind.macd().iloc[-1])
        macd_sig = float(macd_ind.macd_signal().iloc[-1])

        ma20 = float(close.rolling(20).mean().iloc[-1])
        ma50 = float(close.rolling(50).mean().iloc[-1])
        price = float(close.iloc[-1])

        change_5d = 0.0
        if len(close) >= 6:
            change_5d = (price - float(close.iloc[-6])) / float(close.iloc[-6]) * 100

        score = 0
        reasons = []

        if rsi < 40:
            score += 1
            reasons.append(f"RSI {rsi:.1f} (ueberverkauft)")
        elif rsi > 65:
            score -= 1
            reasons.append(f"RSI {rsi:.1f} (ueberkauft)")

        if macd_val > macd_sig:
            score += 1
            reasons.append("MACD bullish")
        else:
            score -= 1
            reasons.append("MACD bearish")

        if price > ma20:
            score += 1
            reasons.append("Kurs > MA20")
        else:
            score -= 1
            reasons.append("Kurs < MA20")

        if ma20 > ma50:
            score += 1
            reasons.append("MA20 > MA50 (Aufwaertstrend)")
        else:
            score -= 1
            reasons.append("MA20 < MA50 (Abwaertstrend)")

        if score >= 2:
            signal = "buy"
        elif score <= -2:
            signal = "sell"
        else:
            signal = "hold"

        return {
            "price": price,
            "rsi": rsi,
            "change_5d": change_5d,
            "signal": signal,
            "score": max(0, score),
            "reasons": reasons,
        }
    except Exception:
        return None

def calculate_crypto_signal(coin_id: str) -> dict:
    try:
        # Aktuellen Preis + 24h/7d Daten holen
        markets_url = "https://api.coingecko.com/api/v3/coins/markets"
        mr = requests.get(markets_url, params={
            "vs_currency": "eur", "ids": coin_id,
            "price_change_percentage": "7d"
        }, timeout=10)
        current_price = None
        change_24h = 0.0
        coin_name = coin_id
        if mr.status_code == 200 and mr.json():
            md = mr.json()[0]
            current_price = md.get("current_price")
            change_24h = md.get("price_change_percentage_24h") or 0.0
            coin_name = md.get("name", coin_id)

        # Historische Daten fuer Indikatoren
        url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
        params = {"vs_currency": "eur", "days": "90", "interval": "daily"}
        r = requests.get(url, params=params, timeout=10)
        if r.status_code != 200:
            return None
        data = r.json()
        prices = [p[1] for p in data.get("prices", [])]
        if len(prices) < 30:
            return None

        close = pd.Series(prices)
        rsi_ind = ta.momentum.RSIIndicator(close=close, window=14)
        rsi = float(rsi_ind.rsi().iloc[-1])
        macd_ind = ta.trend.MACD(close=close)
        macd_val = float(macd_ind.macd().iloc[-1])
        macd_sig_val = float(macd_ind.macd_signal().iloc[-1])
        ma20 = float(close.rolling(20).mean().iloc[-1])
        ma50 = float(close.rolling(50).mean().iloc[-1])
        # Aktuellen Preis bevorzugen, sonst letzten historischen Wert
        price = float(current_price) if current_price is not None else float(close.iloc[-1])
        change_5d = (float(close.iloc[-1]) - float(close.iloc[-6])) / float(close.iloc[-6]) * 100 if len(close) >= 6 else change_24h

        score = 0
        reasons = []
        if rsi < 40:
            score += 1
            reasons.append(f"RSI {rsi:.1f}")
        elif rsi > 65:
            score -= 1
            reasons.append(f"RSI {rsi:.1f}")
        if macd_val > macd_sig_val:
            score += 1
            reasons.append("MACD bullish")
        else:
            score -= 1
            reasons.append("MACD bearish")
        if price > ma20:
            score += 1
            reasons.append("Kurs > MA20")
        else:
            score -= 1
            reasons.append("Kurs < MA20")
        if ma20 > ma50:
            score += 1
            reasons.append("MA20 > MA50")
        else:
            score -= 1
            reasons.append("MA20 < MA50")

        if score >= 2:
            signal = "buy"
        elif score <= -2:
            signal = "sell"
        else:
            signal = "hold"

        return {
            "price": price,
            "rsi": rsi,
            "change_5d": change_5d,
            "signal": signal,
            "score": max(0, score),
            "reasons": reasons,
            "name": coin_name,
        }
    except Exception:
        return None

# ---------------------------------------------------------------------------
# Display: advanced table
# ---------------------------------------------------------------------------
def show_advanced_table(u: dict, title: str, results: list, speculative: bool = False):
    if speculative:
        console.print(Panel(
            f"[bold red]{T(u,'warning_spec')}[/]\n[dim]{T(u,'spec_warning_small')}[/]",
            border_style="red", padding=(0, 2)
        ))

    tbl = Table(title=f"[bold cyan]{title}[/]", show_lines=True, border_style="cyan")
    tbl.add_column("Name", style="white", min_width=14)
    tbl.add_column(T(u, "price_label"), justify="right", min_width=10)
    tbl.add_column("5T%", justify="right", min_width=7)
    tbl.add_column("RSI", justify="right", min_width=6)
    tbl.add_column(T(u, "signal_label"), justify="center", min_width=10)
    tbl.add_column(T(u, "chance_label"), justify="center", min_width=8)

    buy_list = []
    for name, sig in results:
        if sig is None:
            tbl.add_row(
                name,
                f"[dim]{T(u,'no_data')}[/]",
                "[dim]-[/]",
                "[dim]-[/]",
                f"[dim]{T(u,'hold')}[/]",
                "[dim]-[/]",
            )
            continue
        price = sig["price"]
        rsi = sig["rsi"]
        chg = sig["change_5d"]
        signal = sig["signal"]
        score = sig["score"]
        color = sig_color(signal)
        sig_text = T(u, signal) if signal in ("buy", "hold", "sell") else signal

        rsi_color = "green" if rsi < 40 else ("red" if rsi > 65 else "white")
        chg_color = "green" if chg >= 0 else "red"

        tbl.add_row(
            name,
            f"{price:.2f}",
            f"[{chg_color}]{chg:+.1f}%[/]",
            f"[{rsi_color}]{rsi:.1f}[/]",
            f"[{color}]{sig_text}[/]",
            chance_label_str(u, score),
        )
        if signal == "buy":
            buy_list.append((name, sig))

    console.print(tbl)

    if buy_list:
        console.print()
        for name, sig in buy_list:
            price = sig["price"]
            score = sig["score"]
            size = trade_size(u)
            rl = u.get("risk_level", "moderat")
            cfg = RISK_CONFIG.get(rl, RISK_CONFIG["moderat"])
            sl = price * (1 - cfg["stop_loss"] / 100)
            tp = price * (1 + cfg["take_profit"] / 100)
            units = size / price if price > 0 else 0
            content = (
                f"[bold white]{name}[/]   {stars(score)}\n"
                f"{T(u,'price_label')}: [cyan]{price:.2f} EUR[/]   "
                f"{T(u,'chance_label')}: {chance_label_str(u, score)}\n"
            )
            if u.get("capital", 0) > 0:
                content += (
                    f"{T(u,'invest_label')}: [green]{size:.2f} EUR[/]   "
                    f"{T(u,'units_label')}: {units:.4f}\n"
                    f"{T(u,'stop_loss_label')}: [red]{sl:.2f}[/]   "
                    f"{T(u,'take_profit_label')}: [green]{tp:.2f}[/]\n"
                )
            content += f"[dim]{T(u,'trade_hint')}[/]"
            console.print(Panel(
                content,
                border_style="green",
                title=f"[bold green]{T(u,'trade_advice')}[/]",
                padding=(0, 2)
            ))
    else:
        console.print(f"\n  [dim]{T(u,'no_candidates')}[/]")

# ---------------------------------------------------------------------------
# Display: simple mode
# ---------------------------------------------------------------------------
def show_simple_signals(u: dict, results: list, speculative: bool = False):
    if speculative:
        console.print(Panel(f"[bold red]{T(u,'warning_spec')}[/]", border_style="red", padding=(0, 2)))

    shown = 0
    for name, sig in results:
        if sig is None:
            continue
        signal = sig["signal"]
        price = sig["price"]
        chg = sig["change_5d"]

        if signal == "buy":
            color = "green"
            sig_text = f"[bold green]>>> {T(u,'buy')} <<<[/]"
            info_text = T(u, "simple_buy")
            hint_text = T(u, "simple_buy_hint")
        elif signal == "sell":
            color = "red"
            sig_text = f"[bold red]>>> {T(u,'sell')} <<<[/]"
            info_text = T(u, "simple_sell")
            hint_text = T(u, "simple_sell_hint")
        else:
            color     = "yellow"
            sig_text  = f"[bold yellow]-- {T(u,'hold')} --[/]"
            info_text = T(u, "simple_hold")
            hint_text = T(u, "simple_hold_hint")

        content = (
            f"[bold]{name}[/]\n"
            f"{T(u,'price_label')}: {price:.2f} EUR  |  {chg:+.1f}%\n\n"
            f"{sig_text}\n"
            f"{info_text}\n\n"
            f"[dim]{hint_text}[/]"
        )
        if u.get("capital", 0) > 0 and signal == "buy":
            size = trade_size(u)
            content += f"\n\n[green]{T(u,'recommended_invest')}: {size:.2f} EUR[/]"

        console.print(Panel(content, border_style=color, padding=(1, 2)))
        shown += 1

    if shown == 0:
        console.print(f"\n  [dim]{T(u,'no_candidates')}[/]")

# ---------------------------------------------------------------------------
# Market analysis screens
# ---------------------------------------------------------------------------
def analyze_stocks(u: dict, watchlist: dict, title: str, speculative: bool = False, challenge_id: str = None):
    clear()
    print_header(title)
    console.print(f"  [dim]Lade Daten...[/]\n")
    results = []
    for name, ticker in watchlist.items():
        sig = calculate_signals(ticker)
        results.append((name, sig))
        u["total_signals_viewed"] = u.get("total_signals_viewed", 0) + 1

    mode = u.get("display_mode", "advanced")
    if mode == "simple":
        show_simple_signals(u, results, speculative=speculative)
    else:
        show_advanced_table(u, title, results, speculative=speculative)

    if challenge_id:
        done_challenge(u, challenge_id)
    add_xp(u, 5, "Analyse")
    save_user(u)
    pause(u)

def analyze_crypto(u: dict):
    clear()
    print_header("Kryptowaehrungen")
    console.print(f"  [dim]Lade Krypto-Daten von CoinGecko...[/]\n")
    results = []
    for coin in TOP_CRYPTOS:
        sig = calculate_crypto_signal(coin)
        # Echten Namen aus API-Antwort nehmen, sonst Coin-ID umwandeln
        name = sig["name"] if sig and sig.get("name") else coin.replace("-", " ").title()
        results.append((name, sig))
        u["total_signals_viewed"] = u.get("total_signals_viewed", 0) + 1

    mode = u.get("display_mode", "advanced")
    if mode == "simple":
        show_simple_signals(u, results)
    else:
        show_advanced_table(u, "Top Kryptos", results)

    done_challenge(u, "view_crypto")
    add_xp(u, 5, "Krypto-Analyse")
    save_user(u)
    pause(u)

# ---------------------------------------------------------------------------
# Challenges screen
# ---------------------------------------------------------------------------
def show_challenges(u: dict):
    clear()
    print_header(T(u, "challenges_label"))
    challenges = get_today_challenges(u)
    done = u.get("done_challenges", [])

    tbl = Table(show_lines=True, border_style="cyan")
    tbl.add_column("Status", justify="center", min_width=6)
    tbl.add_column("Aufgabe", min_width=30)
    tbl.add_column("XP", justify="right", min_width=5)

    all_done = True
    for c in challenges:
        is_done = c["id"] in done
        if not is_done:
            all_done = False
        status = "[green]OK[/]" if is_done else "[dim]--[/]"
        task_text = f"[dim]{c['text']}[/]" if is_done else c["text"]
        tbl.add_row(status, task_text, str(c["xp"]))

    console.print(tbl)
    if all_done:
        console.print(f"\n  [green]{T(u,'all_done')}[/]")
        console.print(f"  [dim]{T(u,'come_back')}[/]")

    pause(u)

# ---------------------------------------------------------------------------
# Tutorial / FAQ
# ---------------------------------------------------------------------------
def show_tutorial(u: dict):
    clear()
    print_header(T(u, "tutorial_title"))
    console.print(f"\n  [cyan]{T(u,'tutorial_intro')}[/]\n")
    lang = get_lang(u)
    tr = TRANSLATIONS.get(lang, {})
    de = TRANSLATIONS["de"]
    faq = tr.get("faq", de.get("faq", []))

    for i, item in enumerate(faq, 1):
        console.print(f"  [bold cyan]{i}.[/] {item['q']}")

    console.print()
    while True:
        try:
            choice = console.input(
                f"  [cyan]{T(u,'faq_read')} (1-{len(faq)}, 0={T(u,'back')}): [/]"
            ).strip()
        except (EOFError, KeyboardInterrupt):
            break
        if choice == "0" or choice == "":
            break
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(faq):
                q = faq[idx]["q"]
                a = faq[idx]["a"]
                console.print(Panel(
                    f"[bold cyan]{q}[/]\n\n{a}",
                    border_style="cyan", padding=(1, 2)
                ))
        except ValueError:
            pass

    done_challenge(u, "use_tutorial")
    add_xp(u, 3, "Tutorial")
    save_user(u)

# ---------------------------------------------------------------------------
# Profile menu
# ---------------------------------------------------------------------------
def show_profile(u: dict):
    while True:
        clear()
        print_header(T(u, "profile_title"))
        mode = u.get("display_mode", "advanced")
        mode_label = T(u, "mode_simple") if mode == "simple" else T(u, "mode_advanced")
        console.print(Panel(
            f"{T(u,'name_label')}: [cyan]{u.get('name') or T(u,'not_set')}[/]\n"
            f"{T(u,'capital_label')}: [green]{u.get('capital', 0):.2f} EUR[/]\n"
            f"{T(u,'profile_label')}: {risk_label_str(u)}\n"
            f"{T(u,'display_mode_label')}: [yellow]{mode_label}[/]\n"
            f"XP: {u.get('xp', 0)} | Level {u.get('level', 1)}: {get_level_title(u)}",
            border_style="blue", padding=(0, 2)
        ))
        console.print(f"  {T(u,'change_capital')}")
        console.print(f"  {T(u,'toggle_mode')}")
        console.print(f"  {T(u,'change_risk_menu')}")
        console.print(f"  {T(u,'change_name')}")
        console.print(f"  [dim][0] {T(u,'back')}[/]")

        try:
            ch = console.input(f"\n  [cyan]{T(u,'choice')}[/]").strip().lower()
        except (EOFError, KeyboardInterrupt):
            break

        if ch == "0" or ch == "":
            break
        elif ch == "1":
            try:
                val = console.input(f"  {T(u,'ask_capital')}").strip()
                cap = float(val.replace(",", "."))
                u["capital"] = cap
                save_user(u)
                done_challenge(u, "set_capital")
                add_xp(u, 10, T(u, "capital_set"))
                console.print(f"  [green]{T(u,'capital_saved')}[/]")
            except Exception:
                console.print(f"  [red]{T(u,'invalid')}[/]")
            console.input(f"  [dim]{T(u,'press_enter')}[/]")
        elif ch == "2":
            cur = u.get("display_mode", "advanced")
            u["display_mode"] = "simple" if cur == "advanced" else "advanced"
            new_label = T(u, "mode_simple") if u["display_mode"] == "simple" else T(u, "mode_advanced")
            console.print(f"  [green]{T(u,'mode_toggled', mode=new_label)}[/]")
            save_user(u)
            console.input(f"  [dim]{T(u,'press_enter')}[/]")
        elif ch == "3":
            console.print(f"\n  {T(u,'ask_risk')}")
            console.print(f"  {T(u,'risk_1')}")
            console.print(f"  {T(u,'risk_2')}")
            console.print(f"  {T(u,'risk_3')}")
            rc = console.input(f"  {T(u,'risk_choice')}").strip()
            rm = {"1": "konservativ", "2": "moderat", "3": "aggressiv"}
            if rc in rm:
                u["risk_level"] = rm[rc]
                save_user(u)
                done_challenge(u, "change_risk")
                add_xp(u, 5, T(u, "risk_updated"))
                console.print(f"  [green]{T(u,'risk_set')} {risk_label_str(u)}[/]")
            else:
                console.print(f"  [red]{T(u,'invalid')}[/]")
            console.input(f"  [dim]{T(u,'press_enter')}[/]")
        elif ch == "4":
            name = console.input(f"  {T(u,'ask_name')}").strip()
            if name:
                u["name"] = name
                save_user(u)
                console.print(f"  [green]{T(u,'name_saved')}[/]")
            else:
                console.print(f"  [red]{T(u,'invalid')}[/]")
            console.input(f"  [dim]{T(u,'press_enter')}[/]")

# ---------------------------------------------------------------------------
# First setup
# ---------------------------------------------------------------------------
def first_setup() -> dict:
    u = dict(DEFAULT_USER)
    lang = detect_language()
    u["lang"] = lang

    clear()
    console.print(Panel(
        Align.center(
            f"[bold cyan]{T(u,'welcome_title')}[/]\n\n"
            f"[white]{T(u,'welcome_intro')}[/]\n\n"
            f"[dim]v{VERSION}[/]"
        ),
        border_style="cyan", padding=(2, 4)
    ))
    console.print()

    while True:
        try:
            name = console.input(f"  [cyan]{T(u,'ask_name')}[/]").strip()
        except (EOFError, KeyboardInterrupt):
            name = "Trader"
        if name:
            break
        console.print(f"  [red]{T(u,'invalid')}[/]")

    u["name"] = name

    greetings = {
        "de": f"Hallo, {name}! Schoen, dich kennenzulernen.",
        "en": f"Hello, {name}! Great to meet you.",
        "tr": f"Merhaba, {name}! Seninle tanismak guzel.",
        "ru": f"Privet, {name}! Priyatno poznakomitsya.",
    }
    greeting_text = greetings.get(lang, greetings["de"])
    console.print(Panel(f"[bold cyan]{greeting_text}[/]", border_style="cyan", padding=(0, 2)))
    console.print()

    try:
        val = console.input(f"  [cyan]{T(u,'ask_capital')}[/]").strip()
        u["capital"] = float(val.replace(",", "."))
    except Exception:
        u["capital"] = 0.0

    console.print(f"\n  {T(u,'ask_risk')}")
    console.print(f"  {T(u,'risk_1')}")
    console.print(f"  {T(u,'risk_2')}")
    console.print(f"  {T(u,'risk_3')}")
    try:
        rc = console.input(f"  [cyan]{T(u,'risk_choice')}[/]").strip()
    except (EOFError, KeyboardInterrupt):
        rc = "2"
    rm = {"1": "konservativ", "2": "moderat", "3": "aggressiv"}
    u["risk_level"] = rm.get(rc, "moderat")

    u["last_login"] = str(date.today())
    u["streak"] = 1
    save_user(u)

    console.print(Panel(f"[green]{T(u,'profile_saved')}[/]", border_style="green", padding=(0, 2)))
    console.input(f"  [dim]{T(u,'press_enter')}[/]")
    return u

# ---------------------------------------------------------------------------
# Login / streak
# ---------------------------------------------------------------------------
def handle_login(u: dict):
    today = str(date.today())
    last = u.get("last_login", "")
    if last == today:
        return
    try:
        last_date = date.fromisoformat(last) if last else None
    except Exception:
        last_date = None

    if last_date is None:
        u["streak"] = 1
    else:
        diff = (date.today() - last_date).days
        if diff == 1:
            u["streak"] = u.get("streak", 0) + 1
        elif diff > 1:
            u["streak"] = 1

    u["last_login"] = today
    streak = u.get("streak", 1)
    bonus = min(streak * 5, 50)
    console.print(f"  [cyan]{T(u,'first_login')}[/] [dim]{T(u,'streak_label')}: {streak}[/]")
    add_xp(u, bonus, T(u, "streak_bonus"))
    save_user(u)

# ---------------------------------------------------------------------------
# Main menu
# ---------------------------------------------------------------------------
def show_main_menu(u: dict):
    clear()
    console.print(Panel(
        Align.center(Text(LOGO, style="bold cyan")),
        border_style="cyan", padding=(0, 2)
    ))

    cap = u.get("capital", 0.0)
    mode = u.get("display_mode", "advanced")
    mode_label = T(u, "mode_simple") if mode == "simple" else T(u, "mode_advanced")

    col1 = Panel(
        f"[dim]{T(u,'capital_label')}[/]\n[bold green]{cap:.2f} EUR[/]",
        border_style="green", padding=(0, 1)
    )
    col2 = Panel(
        f"[dim]{T(u,'profile_label')}[/]\n{risk_label_str(u)}",
        border_style="yellow", padding=(0, 1)
    )
    col3 = Panel(
        f"[dim]XP[/]\n{xp_bar(u)}",
        border_style="blue", padding=(0, 1)
    )
    console.print(Columns([col1, col2, col3]))
    console.print()

    name = u.get("name", "")
    streak = u.get("streak", 0)
    challenges = get_today_challenges(u)
    done = u.get("done_challenges", [])
    done_count = sum(1 for c in challenges if c["id"] in done)

    menu_content = (
        f"[bold white]{T(u,'greeting')}, {name}![/]  "
        f"[dim]{T(u,'streak_label')}: {streak} {T(u,'days_label')}  |  "
        f"{T(u,'challenges_label')}: {done_count}/{len(challenges)}  |  "
        f"{T(u,'display_mode_label')}: {mode_label}[/]\n\n"
        f"  {T(u,'menu_1')}\n"
        f"  {T(u,'menu_2')}\n"
        f"  {T(u,'menu_3')}\n\n"
        f"  {T(u,'menu_h')}\n"
        f"  {T(u,'menu_t')}\n"
        f"  {T(u,'menu_p')}\n\n"
        f"  [dim]{T(u,'menu_0')}[/]"
    )
    console.print(Panel(menu_content, border_style="bright_cyan", title="[bold yellow]MENU[/]", padding=(0, 2)))
    console.print()

# ---------------------------------------------------------------------------
# Auto-update
# ---------------------------------------------------------------------------
def check_for_update():
    try:
        r = requests.get(UPDATE_URL, timeout=8)
        if r.status_code != 200:
            return
        code = r.text
        rv = None
        for line in code.splitlines():
            if line.startswith("VERSION = "):
                rv = line.split('"')[1]
                break
        if not rv:
            return

        def vt(v):
            return tuple(int(x) for x in v.split("."))

        if vt(rv) <= vt(VERSION):
            return  # don't downgrade

        console.print(f"[cyan]Update: {VERSION} -> {rv}[/]")
        this = os.path.abspath(sys.argv[0])
        shutil.copy2(this, this + ".bak")
        with open(this, "w", encoding="utf-8") as f:
            f.write(code)
        console.print("[green]Update erfolgreich! Neustart...[/]")
        subprocess.Popen([sys.executable, this] + sys.argv[1:])
        sys.exit(0)
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    u = load_user()

    if not u.get("name"):
        u = first_setup()
    else:
        handle_login(u)

    while True:
        show_main_menu(u)
        try:
            ch = console.input(f"  [cyan]{T(u,'choice')}[/]").strip().lower()
        except (EOFError, KeyboardInterrupt):
            ch = "0"

        if ch == "1":
            analyze_stocks(u, TOP20_STOCKS, "Top 20 Aktien", speculative=False, challenge_id="view_stocks")
        elif ch == "2":
            analyze_stocks(u, SMALL_CAP_STOCKS, "Small Cap Aktien", speculative=True, challenge_id="view_small_s")
        elif ch == "3":
            analyze_crypto(u)
        elif ch == "h":
            show_challenges(u)
        elif ch == "t":
            show_tutorial(u)
            pause(u)
        elif ch == "p":
            show_profile(u)
        elif ch == "0":
            clear()
            console.print(Panel(
                Align.center(f"[bold cyan]{T(u,'goodbye')}[/]"),
                border_style="cyan", padding=(1, 4)
            ))
            break
        else:
            console.print(f"  [red]{T(u,'invalid')}[/]")
            import time
            time.sleep(0.8)


if __name__ == "__main__":
    check_for_update()
    main()
