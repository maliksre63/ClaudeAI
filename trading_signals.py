# -*- coding: utf-8 -*-
"""
Trade Signal System - All-in-One Trading Assistant
"""

VERSION = "2.4.0"
UPDATE_URL = "https://raw.githubusercontent.com/maliksre63/ClaudeAI/master/trading_signals.py"

import warnings
import logging
import json
import os
import random
import sys
import shutil
import subprocess
import locale
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

# =================================================================
#  SPRACHERKENNUNG
# =================================================================

def detect_language() -> str:
    try:
        import ctypes
        lang_id = ctypes.windll.kernel32.GetUserDefaultUILanguage()
        # LCID -> Sprachcode
        mapping = {
            0x0407: "de", 0x0807: "de", 0x0C07: "de",  # Deutsch (DE/AT/CH)
            0x0409: "en", 0x0809: "en", 0x0C09: "en",  # Englisch
            0x041F: "tr",                                # Tuerkisch
            0x0419: "ru",                                # Russisch
            0x040C: "fr", 0x080C: "fr",                 # Franzoesisch
            0x0C0A: "es", 0x040A: "es",                 # Spanisch
            0x0410: "it",                                # Italienisch
            0x0415: "pl",                                # Polnisch
            0x0401: "ar", 0x0801: "ar",                 # Arabisch
            0x0413: "nl",                                # Niederlaendisch
        }
        lang = mapping.get(lang_id)
        if lang:
            return lang
    except Exception:
        pass
    # Fallback: locale
    try:
        lc = locale.getdefaultlocale()[0] or ""
        return lc[:2].lower()
    except Exception:
        return "de"

# =================================================================
#  UEBERSETZUNGEN
# =================================================================

TRANSLATIONS = {
    # ── Deutsch ──────────────────────────────────────────────────
    "de": {
        "greeting":         "Hallo, {name}! Schoen, dich wieder zu sehen.",
        "welcome_title":    "WILLKOMMEN BEIM TRADE SIGNAL SYSTEM",
        "welcome_intro":    "Ich helfe dir bessere Handelsentscheidungen zu treffen.",
        "ask_name":         "Wie moechtest du heissen? ",
        "ask_capital":      "Wie viel EUR moechtest du handeln (dein Kapital)? ",
        "ask_risk":         "Waehle dein Risikoprofil:",
        "risk_1":           "[1] Konservativ  - wenig Risiko, ruhiger Schlaf",
        "risk_2":           "[2] Moderat      - ausgewogen (empfohlen)",
        "risk_3":           "[3] Aggressiv    - hohe Chancen, hoehere Verluste moeglich",
        "risk_choice":      "Auswahl [1/2/3]: ",
        "profile_saved":    "Perfekt! Dein Profil ist gespeichert.",
        "press_enter":      "[Enter] weiter...",
        "capital_label":    "Kapital",
        "profile_label":    "Profil",
        "challenges_label": "Herausforderungen heute",
        "streak_label":     "Streak",
        "days_label":       "Tag(e)",
        "menu_1":           "[1] Top 20 Aktien analysieren",
        "menu_2":           "[2] Top Kryptos analysieren",
        "menu_3":           "[3] Kleine Kryptos mit Potenzial",
        "menu_4":           "[4] Kleine Aktien mit Potenzial",
        "menu_5":           "[5] Alles auf einmal anzeigen",
        "menu_h":           "[H] Tagesherausforderungen",
        "menu_t":           "[T] Tutorial Chat",
        "menu_p":           "[P] Profil & Einstellungen",
        "menu_0":           "[0] Beenden",
        "choice":           "Auswahl: ",
        "goodbye":          "Bis morgen! Dein Streak: {streak} Tag(e)",
        "buy":              "KAUFEN",
        "hold":             "HALTEN",
        "sell":             "VERKAUFEN",
        "buy_signals":      "* KAUFSIGNALE:",
        "no_data":          "Keine Daten",
        "error":            "Fehler",
        "warning_spec":     "WARNUNG: Hochspekulativ. Nur Kapital einsetzen, dessen Verlust du verkraften kannst.",
        "no_candidates":    "Heute keine Kaufkandidaten gefunden.",
        "trade_advice":     "--- Handelsempfehlung ({profile}) ---",
        "invest_label":     "Einsatz",
        "units_label":      "Anteile",
        "stop_loss_label":  "Stop-Loss",
        "take_profit_label":"Take-Profit",
        "chance_label":     "Chance",
        "risk_label":       "Verlustrisiko",
        "trade_hint":       "-> Setze in Trade Republic eine Limit-Order bei {price:.2f} EUR",
        "strong":           "Stark",
        "medium":           "Mittel",
        "weak":             "Schwach",
        "none":             "Kein",
        "back":             "[0] Zurueck",
        "back_menu":        "[Enter] Zurueck zum Menue...",
        "levelup":          "LEVEL UP! Du bist jetzt Level {lvl}: {title}",
        "xp_gained":        "+{xp} XP - {reason}",
        "all_done":         "Alle Herausforderungen heute abgeschlossen!",
        "come_back":        "Komm morgen wieder fuer neue Aufgaben.",
        "tutorial_title":   "TUTORIAL CHAT",
        "tutorial_intro":   "Waehle eine Frage - ich erklaere dir alles:",
        "faq_read":         "FAQ gelesen",
        "profile_title":    "PROFIL & EINSTELLUNGEN",
        "name_label":       "Name",
        "not_set":          "nicht gesetzt",
        "change_capital":   "[1] Kapital aendern",
        "change_risk_menu": "[2] Risikoprofil aendern",
        "change_name":      "[3] Name aendern",
        "capital_saved":    "Gespeichert: {val:.2f} EUR",
        "invalid":          "Ungueltige Eingabe.",
        "risk_set":         "Risikoprofil gesetzt: {r}",
        "name_saved":       "Name gespeichert: {name}",
        "update_available": "Update verfuegbar: {old} -> {new}",
        "downloading":      "Lade neue Version herunter...",
        "update_done":      "Update erfolgreich! Starte neu...",
        "first_login":      "Erster Login",
        "streak_bonus":     "{s}-Tage-Streak Bonus",
        "profile_created":  "Profil erstellt",
        "capital_set":      "Kapital hinterlegt",
        "risk_updated":     "Risikoprofil aktualisiert",
        "challenge_done":   "Herausforderung abgeschlossen: {text}",
        "risk_very_high":   "EXTREM HOCH",
        "risk_high":        "SEHR HOCH",
        "risk_moderate":    "HOCH",
        "spec_warning_small":"max. 5% deines Kapitals bei Small Caps empfohlen",
        "potential":        "Potenzial",
        "no_guarantee":     "(Volatilitaet, KEINE Garantie)",
        "market_cap":       "Marktkapital",
        "price_label":      "Preis",
        "signal_label":     "Signal",
        "reason_label":     "Begruendung",
        "recommended_invest":"Empf. Einsatz",
        "risk_name_k":      "Konservativ",
        "risk_name_m":      "Moderat",
        "risk_name_a":      "Aggressiv",
        "risk_desc_k":      "1-2% des Kapitals pro Trade. Kapitalerhalt im Vordergrund.",
        "risk_desc_m":      "3-5% des Kapitals pro Trade. Ausgewogenes Chance-Risiko.",
        "risk_desc_a":      "6-10% des Kapitals pro Trade. Hoehere Chancen, hoehere Verluste.",
        "challenges": [
            {"id": "view_stocks",  "text": "Analysiere die Top 20 Aktien",        "xp": 30},
            {"id": "view_crypto",  "text": "Analysiere die Top Kryptos",           "xp": 30},
            {"id": "view_small_c", "text": "Schau dir kleine Kryptos an",          "xp": 25},
            {"id": "view_small_s", "text": "Schau dir kleine Aktien an",           "xp": 25},
            {"id": "set_capital",  "text": "Lege dein Handelskapital fest",        "xp": 50},
            {"id": "change_risk",  "text": "Passe dein Risikoprofil an",           "xp": 40},
            {"id": "use_tutorial", "text": "Lese den Tutorial-Chat",               "xp": 35},
            {"id": "view_all",     "text": "Lass alle Analysen laufen",            "xp": 60},
        ],
        "faq": [
            {
                "q": "Was ist der RSI und wie lese ich ihn?",
                "a": (
                    "Der RSI (Relative Strength Index) misst, ob eine Aktie/Krypto\n"
                    "gerade ueberkauft oder ueberverkauft ist. Er geht von 0 bis 100.\n\n"
                    "  RSI < 35  -> Ueberverkauft -> oft guenstiger Einstiegszeitpunkt\n"
                    "  RSI 35-65 -> Neutrale Zone -> kein klares Signal\n"
                    "  RSI > 70  -> Ueberkauft    -> Kurs koennte bald fallen\n\n"
                    "Beispiel: Tesla hat RSI 28 -> System sagt KAUFEN."
                ),
            },
            {
                "q": "Was bedeutet MACD?",
                "a": (
                    "MACD = Moving Average Convergence Divergence.\n"
                    "Zeigt ob der kurzfristige Trend staerker ist als der langfristige.\n\n"
                    "  MACD > Signal-Linie -> Bullish (Aufwaertsdruck)\n"
                    "  MACD < Signal-Linie -> Bearish (Abwaertsdruck)"
                ),
            },
            {
                "q": "Was bedeuten KAUFEN / HALTEN / VERKAUFEN?",
                "a": (
                    "Das System vergibt Punkte aus 3 Indikatoren:\n\n"
                    "  Score >= 4  -> KAUFEN    (mehrere Indikatoren bullish)\n"
                    "  Score <= -2 -> VERKAUFEN (mehrere Indikatoren bearish)\n"
                    "  Dazwischen  -> HALTEN    (kein klares Bild)\n\n"
                    "WICHTIG: Signale sind Hinweise, keine Garantien!"
                ),
            },
            {
                "q": "Wie viel soll ich pro Trade investieren?",
                "a": (
                    "Abhaengig von deinem Risikoprofil:\n\n"
                    "  Konservativ: 1-2% deines Kapitals\n"
                    "  Moderat:     3-5% deines Kapitals\n"
                    "  Aggressiv:   6-10% deines Kapitals\n\n"
                    "Beispiel: 1000 EUR Kapital, Moderat -> ca. 40 EUR pro Trade."
                ),
            },
            {
                "q": "Was ist Stop-Loss und Take-Profit?",
                "a": (
                    "Stop-Loss:   Kurs, bei dem du verkaufst um Verluste zu begrenzen.\n"
                    "Take-Profit: Kurs, bei dem du verkaufst um Gewinne zu sichern.\n\n"
                    "Beispiel (Moderat, Kauf bei 100 EUR):\n"
                    "  Stop-Loss   = 92 EUR  (-8%)\n"
                    "  Take-Profit = 120 EUR (+20%)"
                ),
            },
            {
                "q": "Was sind Small Caps und warum sind sie riskant?",
                "a": (
                    "Small Caps = Unternehmen/Coins mit kleiner Marktkapitalisierung.\n\n"
                    "Riskanter weil:\n"
                    "  - Weniger Handelsteilnehmer -> starkere Schwankungen\n"
                    "  - Weniger Transparenz\n"
                    "  - Nachrichten treffen den Kurs haerter\n\n"
                    "Max. 5-10% des Gesamtkapitals in Small Caps investieren!"
                ),
            },
            {
                "q": "Wie nutze ich dieses Programm taeglich am besten?",
                "a": (
                    "Empfohlene Tagesroutine (ca. 10 Min.):\n\n"
                    "  1. Programm starten -> Herausforderungen ansehen\n"
                    "  2. Option 5 'Alles anzeigen' ausfuehren\n"
                    "  3. KAUFEN-Signale notieren\n"
                    "  4. In Trade Republic nachschauen\n"
                    "  5. Nie alles auf einmal investieren!"
                ),
            },
            {
                "q": "Was bedeuten die Sterne bei den Signalen?",
                "a": (
                    "  *   (1 Stern)  -> Schwaches Signal  (Score 2-3)\n"
                    "  **  (2 Sterne) -> Mittleres Signal  (Score 4)\n"
                    "  *** (3 Sterne) -> Starkes Signal    (Score 5-6)\n\n"
                    "3 Sterne = alle Indikatoren gleichzeitig bullish.\n"
                    "Passiert selten - dann besonders aufmerksam sein!"
                ),
            },
        ],
        "levels": {
            1: "Anfaenger", 2: "Beobachter", 3: "Analyst", 4: "Trader",
            5: "Profi-Trader", 6: "Marktkenner", 7: "Stratege",
            8: "Experte", 9: "Meister", 10: "Legende",
        },
    },

    # ── English ──────────────────────────────────────────────────
    "en": {
        "greeting":         "Hello, {name}! Great to see you again.",
        "welcome_title":    "WELCOME TO THE TRADE SIGNAL SYSTEM",
        "welcome_intro":    "I help you make better trading decisions.",
        "ask_name":         "What would you like to be called? ",
        "ask_capital":      "How much EUR do you want to trade (your capital)? ",
        "ask_risk":         "Choose your risk profile:",
        "risk_1":           "[1] Conservative - low risk, sleep well",
        "risk_2":           "[2] Moderate     - balanced (recommended)",
        "risk_3":           "[3] Aggressive   - higher chances, higher losses possible",
        "risk_choice":      "Choice [1/2/3]: ",
        "profile_saved":    "Perfect! Your profile has been saved.",
        "press_enter":      "[Enter] continue...",
        "capital_label":    "Capital",
        "profile_label":    "Profile",
        "challenges_label": "Today's challenges",
        "streak_label":     "Streak",
        "days_label":       "day(s)",
        "menu_1":           "[1] Analyze Top 20 Stocks",
        "menu_2":           "[2] Analyze Top Cryptos",
        "menu_3":           "[3] Small Cryptos with Potential",
        "menu_4":           "[4] Small Stocks with Potential",
        "menu_5":           "[5] Show Everything",
        "menu_h":           "[H] Daily Challenges",
        "menu_t":           "[T] Tutorial Chat",
        "menu_p":           "[P] Profile & Settings",
        "menu_0":           "[0] Exit",
        "choice":           "Choice: ",
        "goodbye":          "See you tomorrow! Your streak: {streak} day(s)",
        "buy":              "BUY",
        "hold":             "HOLD",
        "sell":             "SELL",
        "buy_signals":      "* BUY SIGNALS:",
        "no_data":          "No data",
        "error":            "Error",
        "warning_spec":     "WARNING: Highly speculative. Only invest capital you can afford to lose.",
        "no_candidates":    "No buy candidates found today.",
        "trade_advice":     "--- Trade Recommendation ({profile}) ---",
        "invest_label":     "Investment",
        "units_label":      "Units",
        "stop_loss_label":  "Stop-Loss",
        "take_profit_label":"Take-Profit",
        "chance_label":     "Chance",
        "risk_label":       "Loss risk",
        "trade_hint":       "-> Place a limit order in Trade Republic at {price:.2f} EUR",
        "strong":           "Strong",
        "medium":           "Medium",
        "weak":             "Weak",
        "none":             "None",
        "back":             "[0] Back",
        "back_menu":        "[Enter] Back to menu...",
        "levelup":          "LEVEL UP! You are now Level {lvl}: {title}",
        "xp_gained":        "+{xp} XP - {reason}",
        "all_done":         "All challenges completed today!",
        "come_back":        "Come back tomorrow for new tasks.",
        "tutorial_title":   "TUTORIAL CHAT",
        "tutorial_intro":   "Choose a question - I will explain everything:",
        "faq_read":         "FAQ read",
        "profile_title":    "PROFILE & SETTINGS",
        "name_label":       "Name",
        "not_set":          "not set",
        "change_capital":   "[1] Change capital",
        "change_risk_menu": "[2] Change risk profile",
        "change_name":      "[3] Change name",
        "capital_saved":    "Saved: {val:.2f} EUR",
        "invalid":          "Invalid input.",
        "risk_set":         "Risk profile set: {r}",
        "name_saved":       "Name saved: {name}",
        "update_available": "Update available: {old} -> {new}",
        "downloading":      "Downloading new version...",
        "update_done":      "Update successful! Restarting...",
        "first_login":      "First login",
        "streak_bonus":     "{s}-day streak bonus",
        "profile_created":  "Profile created",
        "capital_set":      "Capital saved",
        "risk_updated":     "Risk profile updated",
        "challenge_done":   "Challenge completed: {text}",
        "risk_very_high":   "EXTREMELY HIGH",
        "risk_high":        "VERY HIGH",
        "risk_moderate":    "HIGH",
        "spec_warning_small":"max. 5% of your capital recommended for Small Caps",
        "potential":        "Potential",
        "no_guarantee":     "(volatility, NO guarantee)",
        "market_cap":       "Market cap",
        "price_label":      "Price",
        "signal_label":     "Signal",
        "reason_label":     "Reason",
        "recommended_invest":"Rec. investment",
        "risk_name_k":      "Conservative",
        "risk_name_m":      "Moderate",
        "risk_name_a":      "Aggressive",
        "risk_desc_k":      "1-2% of capital per trade. Capital preservation is priority.",
        "risk_desc_m":      "3-5% of capital per trade. Balanced risk-reward ratio.",
        "risk_desc_a":      "6-10% of capital per trade. Higher chance, higher risk.",
        "challenges": [
            {"id": "view_stocks",  "text": "Analyze the Top 20 Stocks",           "xp": 30},
            {"id": "view_crypto",  "text": "Analyze the Top Cryptos",             "xp": 30},
            {"id": "view_small_c", "text": "Check out small cryptos",             "xp": 25},
            {"id": "view_small_s", "text": "Check out small stocks",              "xp": 25},
            {"id": "set_capital",  "text": "Set your trading capital",            "xp": 50},
            {"id": "change_risk",  "text": "Adjust your risk profile",            "xp": 40},
            {"id": "use_tutorial", "text": "Read the tutorial chat",              "xp": 35},
            {"id": "view_all",     "text": "Run all analyses at once",            "xp": 60},
        ],
        "faq": [
            {"q": "What is RSI and how do I read it?",
             "a": ("RSI (Relative Strength Index) measures if an asset is\n"
                   "overbought or oversold. Range: 0 to 100.\n\n"
                   "  RSI < 35  -> Oversold  -> often a good entry point\n"
                   "  RSI 35-65 -> Neutral zone\n"
                   "  RSI > 70  -> Overbought -> price may fall soon")},
            {"q": "What is MACD?",
             "a": ("MACD = Moving Average Convergence Divergence.\n"
                   "Shows if short-term trend is stronger than long-term.\n\n"
                   "  MACD > Signal line -> Bullish\n"
                   "  MACD < Signal line -> Bearish")},
            {"q": "What do BUY / HOLD / SELL mean?",
             "a": ("The system scores 3 indicators:\n\n"
                   "  Score >= 4  -> BUY  (multiple indicators bullish)\n"
                   "  Score <= -2 -> SELL (multiple indicators bearish)\n"
                   "  In between  -> HOLD (no clear picture)\n\n"
                   "IMPORTANT: Signals are hints, not guarantees!")},
            {"q": "How much should I invest per trade?",
             "a": ("Depends on your risk profile:\n\n"
                   "  Conservative: 1-2% of capital\n"
                   "  Moderate:     3-5% of capital\n"
                   "  Aggressive:   6-10% of capital")},
            {"q": "What is Stop-Loss and Take-Profit?",
             "a": ("Stop-Loss:   Price at which you sell to limit losses.\n"
                   "Take-Profit: Price at which you sell to lock in gains.\n\n"
                   "Example (Moderate, buy at 100 EUR):\n"
                   "  Stop-Loss   = 92 EUR  (-8%)\n"
                   "  Take-Profit = 120 EUR (+20%)")},
            {"q": "What are Small Caps and why are they risky?",
             "a": ("Small caps = companies/coins with small market cap.\n\n"
                   "Riskier because:\n"
                   "  - Fewer traders -> bigger swings\n"
                   "  - Less transparency\n"
                   "  - News hits the price harder\n\n"
                   "Max. 5-10% of total capital in Small Caps!")},
            {"q": "How do I best use this program daily?",
             "a": ("Recommended daily routine (approx. 10 min.):\n\n"
                   "  1. Start program -> check challenges\n"
                   "  2. Run option 5 'Show everything'\n"
                   "  3. Note BUY signals\n"
                   "  4. Check in Trade Republic\n"
                   "  5. Never invest everything at once!")},
            {"q": "What do the stars next to signals mean?",
             "a": ("  *   (1 star)  -> Weak signal   (score 2-3)\n"
                   "  **  (2 stars) -> Medium signal  (score 4)\n"
                   "  *** (3 stars) -> Strong signal  (score 5-6)\n\n"
                   "3 stars = all indicators bullish at once. Rare but powerful!")},
        ],
        "levels": {
            1: "Beginner", 2: "Observer", 3: "Analyst", 4: "Trader",
            5: "Pro Trader", 6: "Market Expert", 7: "Strategist",
            8: "Expert", 9: "Master", 10: "Legend",
        },
    },

    # ── Tuerkisch ─────────────────────────────────────────────────
    "tr": {
        "greeting":         "Merhaba, {name}! Tekrar gormek guzel.",
        "welcome_title":    "TRADE SINYAL SISTEMINE HOSGELDINIZ",
        "welcome_intro":    "Daha iyi ticaret kararlari almaniza yardimci oluyorum.",
        "ask_name":         "Adiniz ne olmali? ",
        "ask_capital":      "Ne kadar EUR ile islem yapmak istiyorsunuz? ",
        "ask_risk":         "Risk profilinizi secin:",
        "risk_1":           "[1] Muhafazakar - dusuk risk",
        "risk_2":           "[2] Orta        - dengeli (tavsiye edilir)",
        "risk_3":           "[3] Agresif     - yuksek sans, yuksek risk",
        "risk_choice":      "Secim [1/2/3]: ",
        "profile_saved":    "Harika! Profiliniz kaydedildi.",
        "press_enter":      "[Enter] devam...",
        "capital_label":    "Sermaye",
        "profile_label":    "Profil",
        "challenges_label": "Bugunun gorevleri",
        "streak_label":     "Seri",
        "days_label":       "gun",
        "menu_1":           "[1] En Iyi 20 Hisseyi Analiz Et",
        "menu_2":           "[2] En Iyi Kriptolari Analiz Et",
        "menu_3":           "[3] Potansiyelli Kucuk Kripto",
        "menu_4":           "[4] Potansiyelli Kucuk Hisse",
        "menu_5":           "[5] Hepsini Goster",
        "menu_h":           "[H] Gunluk Gorevler",
        "menu_t":           "[T] Egitim Sohbeti",
        "menu_p":           "[P] Profil & Ayarlar",
        "menu_0":           "[0] Cikis",
        "choice":           "Secim: ",
        "goodbye":          "Yarin gorusuruz! Seriniz: {streak} gun",
        "buy":              "AL",
        "hold":             "TUT",
        "sell":             "SAT",
        "buy_signals":      "* ALIS SINYALLERI:",
        "no_data":          "Veri yok",
        "error":            "Hata",
        "warning_spec":     "UYARI: Cok spekulatif. Yalnizca kaybetmeyi goze aldabildiginiz sermayeyi yatirin.",
        "no_candidates":    "Bugunku alis adayi bulunamadi.",
        "trade_advice":     "--- Islem Tavsiyesi ({profile}) ---",
        "invest_label":     "Yatirim",
        "units_label":      "Adet",
        "stop_loss_label":  "Stop-Loss",
        "take_profit_label":"Take-Profit",
        "chance_label":     "Sans",
        "risk_label":       "Kayip riski",
        "trade_hint":       "-> Trade Republic'te {price:.2f} EUR limit emri verin",
        "strong":           "Guclu",
        "medium":           "Orta",
        "weak":             "Zayif",
        "none":             "Yok",
        "back":             "[0] Geri",
        "back_menu":        "[Enter] Menuye don...",
        "levelup":          "SEVIYE ATLADI! Simdi Seviye {lvl}: {title}",
        "xp_gained":        "+{xp} XP - {reason}",
        "all_done":         "Bugunun tum gorevleri tamamlandi!",
        "come_back":        "Yeni gorevler icin yarin gelin.",
        "tutorial_title":   "EGITIM SOHBETI",
        "tutorial_intro":   "Bir soru secin - her seyi aciklayayim:",
        "faq_read":         "SSS okundu",
        "profile_title":    "PROFIL & AYARLAR",
        "name_label":       "Ad",
        "not_set":          "ayarlanmamis",
        "change_capital":   "[1] Sermayeyi degistir",
        "change_risk_menu": "[2] Risk profilini degistir",
        "change_name":      "[3] Adi degistir",
        "capital_saved":    "Kaydedildi: {val:.2f} EUR",
        "invalid":          "Gecersiz giris.",
        "risk_set":         "Risk profili ayarlandi: {r}",
        "name_saved":       "Ad kaydedildi: {name}",
        "update_available": "Guncelleme mevcut: {old} -> {new}",
        "downloading":      "Yeni surum indiriliyor...",
        "update_done":      "Guncelleme basarili! Yeniden baslatiliyor...",
        "first_login":      "Ilk giris",
        "streak_bonus":     "{s}-gun seri bonusu",
        "profile_created":  "Profil olusturuldu",
        "capital_set":      "Sermaye kaydedildi",
        "risk_updated":     "Risk profili guncellendi",
        "challenge_done":   "Gorev tamamlandi: {text}",
        "risk_very_high":   "SON DERECE YUKSEK",
        "risk_high":        "COK YUKSEK",
        "risk_moderate":    "YUKSEK",
        "spec_warning_small":"Small Cap icin maks. sermayenin %5'i tavsiye edilir",
        "potential":        "Potansiyel",
        "no_guarantee":     "(volatilite, GARANTI DEGIL)",
        "market_cap":       "Piyasa deger",
        "price_label":      "Fiyat",
        "signal_label":     "Sinyal",
        "reason_label":     "Neden",
        "recommended_invest":"Tavsiye yatirim",
        "risk_name_k":      "Muhafazakar",
        "risk_name_m":      "Orta",
        "risk_name_a":      "Agresif",
        "risk_desc_k":      "Islem basina sermayenin %1-2'si.",
        "risk_desc_m":      "Islem basina sermayenin %3-5'i.",
        "risk_desc_a":      "Islem basina sermayenin %6-10'u.",
        "challenges": [
            {"id": "view_stocks",  "text": "En iyi 20 hisseyi analiz et",         "xp": 30},
            {"id": "view_crypto",  "text": "En iyi kriptolari analiz et",          "xp": 30},
            {"id": "view_small_c", "text": "Kucuk kriptolara bak",                 "xp": 25},
            {"id": "view_small_s", "text": "Kucuk hisselere bak",                  "xp": 25},
            {"id": "set_capital",  "text": "Islem sermayeni belirle",              "xp": 50},
            {"id": "change_risk",  "text": "Risk profilini ayarla",                "xp": 40},
            {"id": "use_tutorial", "text": "Egitim sohbetini oku",                 "xp": 35},
            {"id": "view_all",     "text": "Tum analizleri calistir",              "xp": 60},
        ],
        "faq": [
            {"q": "RSI nedir ve nasil okurum?",
             "a": ("RSI (Goreli Guc Endeksi) bir varligin asiri alim veya\n"
                   "asiri satim durumunda olup olmadigini olcer. 0-100 arasi.\n\n"
                   "  RSI < 35  -> Asiri satim -> genellikle iyi giris noktasi\n"
                   "  RSI 35-65 -> Notr bolge\n"
                   "  RSI > 70  -> Asiri alim  -> fiyat dusebilir")},
            {"q": "MACD ne anlama gelir?",
             "a": ("MACD = Hareketli Ortalama Yakinsamasi-Iraksama.\n"
                   "Kisa vadeli trendin uzun vadeliye gore guclu olup olmadigini gosterir.\n\n"
                   "  MACD > Sinyal cizgisi -> Yukselen piyasa\n"
                   "  MACD < Sinyal cizgisi -> Dusen piyasa")},
            {"q": "AL / TUT / SAT ne anlama geliyor?",
             "a": ("Sistem 3 gostergeden puan verir:\n\n"
                   "  Puan >= 4  -> AL  (birden fazla gosterge yukselis isaret ediyor)\n"
                   "  Puan <= -2 -> SAT (birden fazla gosterge dusus isaret ediyor)\n"
                   "  Arada      -> TUT (net bir goruntu yok)\n\n"
                   "ONEMLI: Sinyaller ipucu, garanti degil!")},
            {"q": "Islem basina ne kadar yatirmaliyim?",
             "a": ("Risk profilinize bagli:\n\n"
                   "  Muhafazakar: sermayenin %1-2'si\n"
                   "  Orta:        sermayenin %3-5'i\n"
                   "  Agresif:     sermayenin %6-10'u")},
            {"q": "Stop-Loss ve Take-Profit nedir?",
             "a": ("Stop-Loss:   Kayiplari sinirlamak icin sattiginiz fiyat.\n"
                   "Take-Profit: Karari kilitlemek icin sattiginiz fiyat.\n\n"
                   "Ornek (Orta, 100 EUR alim):\n"
                   "  Stop-Loss   = 92 EUR  (-%8)\n"
                   "  Take-Profit = 120 EUR (+%20)")},
            {"q": "Small Cap nedir ve neden risklidir?",
             "a": ("Small Cap = kucuk piyasa degerli sirket/kripto.\n\n"
                   "Daha riskli cunku:\n"
                   "  - Daha az yatirimci -> daha buyuk dalgalanma\n"
                   "  - Daha az seffaflik\n"
                   "  - Haberler fiyati daha cok etkiler\n\n"
                   "Toplam sermayenin maksimum %5-10'unu Small Cap'e yatirin!")},
            {"q": "Bu programi gunluk en iyi nasil kullanirim?",
             "a": ("Onerileri gunluk rutin (yaklasik 10 dak.):\n\n"
                   "  1. Programi baslatın -> gorevlere bakin\n"
                   "  2. Secim 5 'Hepsini goster'i calistirin\n"
                   "  3. AL sinyallerini not edin\n"
                   "  4. Trade Republic'te kontrol edin\n"
                   "  5. Hicsini bir anda yatirmayin!")},
            {"q": "Sinyallerdeki yildizlar ne anlama geliyor?",
             "a": ("  *   (1 yildiz) -> Zayif sinyal  (puan 2-3)\n"
                   "  **  (2 yildiz) -> Orta sinyal   (puan 4)\n"
                   "  *** (3 yildiz) -> Guclu sinyal  (puan 5-6)\n\n"
                   "3 yildiz = tum gostergeler ayni anda yukselis. Nadir ama guclu!")},
        ],
        "levels": {
            1: "Yeni Basla", 2: "Gozlemci", 3: "Analist", 4: "Trader",
            5: "Pro Trader", 6: "Piyasa Uzm.", 7: "Stratejist",
            8: "Uzman", 9: "Usta", 10: "Efsane",
        },
    },

    # ── Russisch ──────────────────────────────────────────────────
    "ru": {
        "greeting":         "Privet, {name}! Rad tebya videt snova.",
        "welcome_title":    "DOBRO POZHALOVAT V TORGOVUYU SIGNALNUYU SISTEMU",
        "welcome_intro":    "Ya pomogayu prinimat luchshie torgovye resheniya.",
        "ask_name":         "Kak tebya zvat? ",
        "ask_capital":      "Skolko EUR hotite torgovats? ",
        "ask_risk":         "Vyberite profil riska:",
        "risk_1":           "[1] Konservativny - nizky risk",
        "risk_2":           "[2] Umerenny      - sbalansirovanno (rekomenduyetsya)",
        "risk_3":           "[3] Agressivny    - vysshie shansy, vysshiy risk",
        "risk_choice":      "Vybor [1/2/3]: ",
        "profile_saved":    "Otlichno! Vash profil sokhranen.",
        "press_enter":      "[Enter] prodolzhat...",
        "capital_label":    "Kapital",
        "profile_label":    "Profil",
        "challenges_label": "Zadaniya na segodnya",
        "streak_label":     "Seriya",
        "days_label":       "den(ey)",
        "menu_1":           "[1] Analizirovat Top 20 aksiy",
        "menu_2":           "[2] Analizirovat Top Kripto",
        "menu_3":           "[3] Malye kripto s potentsialom",
        "menu_4":           "[4] Malye aksii s potentsialom",
        "menu_5":           "[5] Pokazat vse",
        "menu_h":           "[H] Dnevnye zadaniya",
        "menu_t":           "[T] Tutorial chat",
        "menu_p":           "[P] Profil i nastroyki",
        "menu_0":           "[0] Vykhodit",
        "choice":           "Vybor: ",
        "goodbye":          "Do zavtra! Vasha seriya: {streak} dney",
        "buy":              "KUPIT",
        "hold":             "DERZHAT",
        "sell":             "PRODAT",
        "buy_signals":      "* SIGNALY NA POKUPKU:",
        "no_data":          "Net dannykh",
        "error":            "Oshibka",
        "warning_spec":     "PREDUPREZHDENIE: Ochen spekulyativno. Investiruy tolko to, chto mozhesh pozvolitseya poteryat.",
        "no_candidates":    "Segodnya kandidatov na pokupku ne naydeno.",
        "trade_advice":     "--- Torgovaya rekomendatsiya ({profile}) ---",
        "invest_label":     "Investitsiya",
        "units_label":      "Dolei",
        "stop_loss_label":  "Stop-Loss",
        "take_profit_label":"Take-Profit",
        "chance_label":     "Shans",
        "risk_label":       "Risk poteri",
        "trade_hint":       "-> Razmestitee limit-order v Trade Republic po {price:.2f} EUR",
        "strong":           "Silny",
        "medium":           "Sredniy",
        "weak":             "Slaby",
        "none":             "Netu",
        "back":             "[0] Nazad",
        "back_menu":        "[Enter] Nazad v menyu...",
        "levelup":          "POVYSHENIE UROVNYA! Teper Uroven {lvl}: {title}",
        "xp_gained":        "+{xp} XP - {reason}",
        "all_done":         "Vse zadaniya segodnya vypolneny!",
        "come_back":        "Prikhodite zavtra za novymi zadaniyami.",
        "tutorial_title":   "TUTORIAL CHAT",
        "tutorial_intro":   "Vyberite vopros - ya vse ob'yasnyu:",
        "faq_read":         "ChZV prochitano",
        "profile_title":    "PROFIL I NASTROYKI",
        "name_label":       "Imya",
        "not_set":          "ne zadano",
        "change_capital":   "[1] Izmenit kapital",
        "change_risk_menu": "[2] Izmenit profil riska",
        "change_name":      "[3] Izmenit imya",
        "capital_saved":    "Sokhraneno: {val:.2f} EUR",
        "invalid":          "Nekorrektniy vvod.",
        "risk_set":         "Profil riska ustanovlen: {r}",
        "name_saved":       "Imya sokraneno: {name}",
        "update_available": "Dostupno obnovlenie: {old} -> {new}",
        "downloading":      "Zagrzka novoy versii...",
        "update_done":      "Obnovlenie uspeshno! Perezapusk...",
        "first_login":      "Pervyy vkhod",
        "streak_bonus":     "Bonus seriy {s} dney",
        "profile_created":  "Profil sozdan",
        "capital_set":      "Kapital sokhranen",
        "risk_updated":     "Profil riska obnovlen",
        "challenge_done":   "Zadaniye vypolneno: {text}",
        "risk_very_high":   "EKSTREMALNY VYSOKIY",
        "risk_high":        "OCHEN VYSOKIY",
        "risk_moderate":    "VYSOKIY",
        "spec_warning_small":"maks. 5% kapitala dlya Small Caps",
        "potential":        "Potentsial",
        "no_guarantee":     "(volatilnost, BEZ GARANTIY)",
        "market_cap":       "Rynochnaya kap.",
        "price_label":      "Tsena",
        "signal_label":     "Signal",
        "reason_label":     "Prichina",
        "recommended_invest":"Rek. investitsiya",
        "risk_name_k":      "Konservativny",
        "risk_name_m":      "Umerenny",
        "risk_name_a":      "Agressivny",
        "risk_desc_k":      "1-2% kapitala na sdelku.",
        "risk_desc_m":      "3-5% kapitala na sdelku.",
        "risk_desc_a":      "6-10% kapitala na sdelku.",
        "challenges": [
            {"id": "view_stocks",  "text": "Proanaliziruy Top 20 aksiy",          "xp": 30},
            {"id": "view_crypto",  "text": "Proanaliziruy Top Kripto",            "xp": 30},
            {"id": "view_small_c", "text": "Posmotr malye kripto",                "xp": 25},
            {"id": "view_small_s", "text": "Posmotr malye aksii",                 "xp": 25},
            {"id": "set_capital",  "text": "Ustanovi torgovyy kapital",           "xp": 50},
            {"id": "change_risk",  "text": "Nastroy profil riska",                "xp": 40},
            {"id": "use_tutorial", "text": "Prochitay tutorial chat",             "xp": 35},
            {"id": "view_all",     "text": "Zapusti vse analizy",                 "xp": 60},
        ],
        "faq": [
            {"q": "Chto takoye RSI i kak ego chitat?",
             "a": ("RSI (Indeks Otnositelnoy Sily) izmeryayet, yavlyayetsya li\n"
                   "aktiv pereprodonannym ili perekuplennym. Diapason: 0-100.\n\n"
                   "  RSI < 35  -> Pereprodan  -> chastoye khoroshaya tochka vkhoda\n"
                   "  RSI 35-65 -> Neytralnoye zone\n"
                   "  RSI > 70  -> Perekuplen  -> tsena mozhet upast")},
            {"q": "Chto oznachayet MACD?",
             "a": ("MACD = Skhozhdenie-raskhodenie skol'zyashchikh srednikch.\n"
                   "Pokazyvayet, silnee li kratkosrochnyy trend dolgosrochnogo.\n\n"
                   "  MACD > Sinalinaya liniya -> Bychiy\n"
                   "  MACD < Sinalinaya liniya -> Medvezhiy")},
            {"q": "Chto oznachayut KUPIT / DERZHAT / PRODAT?",
             "a": ("Sistema prisvaivayet bally iz 3 indikatorov:\n\n"
                   "  Bally >= 4  -> KUPIT   (neskolko indikatorov bychiy)\n"
                   "  Bally <= -2 -> PRODAT  (neskolko indikatorov medvezhiy)\n"
                   "  Mezhdu      -> DERZHAT (netchetkaya kartina)\n\n"
                   "VAZHNO: Signaly - eto podskazki, ne garantii!")},
            {"q": "Skolko investirovat na sdelku?",
             "a": ("Zavisit ot vashego profilya riska:\n\n"
                   "  Konservativny: 1-2% kapitala\n"
                   "  Umerenny:      3-5% kapitala\n"
                   "  Agressivny:    6-10% kapitala")},
            {"q": "Chto takoye Stop-Loss i Take-Profit?",
             "a": ("Stop-Loss:   Tsena, po kotoroy vy prodayete, chtoby ogranichit poteri.\n"
                   "Take-Profit: Tsena, po kotoroy vy prodayete, chtoby zafiksirovat pribyl.\n\n"
                   "Primer (Umerenny, pokupka po 100 EUR):\n"
                   "  Stop-Loss   = 92 EUR  (-8%)\n"
                   "  Take-Profit = 120 EUR (+20%)")},
            {"q": "Chto takoye Small Cap i pochemu eto riskovanno?",
             "a": ("Small Cap = kompanii/monety s maloy rynochnoy kapitalizatsiyey.\n\n"
                   "Bolee riskovanno potomu chto:\n"
                   "  - Menshe treyderov -> bolshiye kolebaniya\n"
                   "  - Menshe prozrachnosti\n\n"
                   "Maks. 5-10% obshchego kapitala v Small Caps!")},
            {"q": "Kak luchshe vsego ispolzovat programmu ezhednevno?",
             "a": ("Rekomenduyemy dnevnoy rasporyadok (ok. 10 min.):\n\n"
                   "  1. Zapustit programmu -> proverit zadaniya\n"
                   "  2. Zapustit variant 5 'Pokazat vse'\n"
                   "  3. Zapisat signaly KUPIT\n"
                   "  4. Proverit v Trade Republic\n"
                   "  5. Nikogda ne investirovat vse srazu!")},
            {"q": "Chto oznachayut zvezdy ryadom s signalami?",
             "a": ("  *   (1 zvezda)  -> Slabyy signal  (bally 2-3)\n"
                   "  **  (2 zvezdy)  -> Sredniy signal (bally 4)\n"
                   "  *** (3 zvezdy)  -> Silnyy signal  (bally 5-6)\n\n"
                   "3 zvezdy = vse indikatory bychiy odnovremenno. Redko, no moshchno!")},
        ],
        "levels": {
            1: "Novichok", 2: "Nablyudatel", 3: "Analitik", 4: "Treydar",
            5: "Pro-Treydar", 6: "Ekspert rynka", 7: "Strateg",
            8: "Ekspert", 9: "Master", 10: "Legenda",
        },
    },
}

# Fallback: unbekannte Sprachen -> Deutsch
def get_T(lang: str) -> dict:
    return TRANSLATIONS.get(lang, TRANSLATIONS["de"])

# =================================================================
#  DATEI-PFADE  (AppData - nicht neben der EXE)
# =================================================================

APP_NAME  = "TradeSignalSystem"
BASE_DIR  = os.path.join(os.environ.get("APPDATA", os.path.expanduser("~")), APP_NAME)
os.makedirs(BASE_DIR, exist_ok=True)
USER_FILE = os.path.join(BASE_DIR, "user_data.json")

# =================================================================
#  WATCHLISTS
# =================================================================

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

# =================================================================
#  NUTZERPROFIL
# =================================================================

DEFAULT_USER = {
    "name": "", "capital": 0.0, "risk_level": "moderat",
    "xp": 0, "level": 1, "streak": 0, "last_login": "",
    "total_signals_viewed": 0, "achievements": [], "lang": "",
}

LEVELS_XP = {
    1:(0,150), 2:(150,400), 3:(400,800), 4:(800,1500),
    5:(1500,2500), 6:(2500,4000), 7:(4000,6000),
    8:(6000,9000), 9:(9000,13000), 10:(13000,99999),
}

RISK_CONFIG = {
    "konservativ": {"pct":1.5, "stop_loss":5,  "take_profit":10},
    "moderat":     {"pct":4.0, "stop_loss":8,  "take_profit":20},
    "aggressiv":   {"pct":8.0, "stop_loss":15, "take_profit":40},
}
RISK_KEY_MAP = {
    "de": {"konservativ":"konservativ","moderat":"moderat","aggressiv":"aggressiv"},
    "en": {"1":"konservativ","2":"moderat","3":"aggressiv"},
    "tr": {"1":"konservativ","2":"moderat","3":"aggressiv"},
    "ru": {"1":"konservativ","2":"moderat","3":"aggressiv"},
}

# =================================================================
#  HILFSFUNKTIONEN
# =================================================================

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

def get_lang(u: dict) -> str:
    return u.get("lang") or detect_language()

def T(u: dict, key: str, **kwargs) -> str:
    lang = get_lang(u)
    txt  = get_T(lang).get(key, get_T("de").get(key, key))
    try:
        return txt.format(**kwargs) if kwargs else txt
    except Exception:
        return txt

def get_level_title(u: dict, lvl: int) -> str:
    lang = get_lang(u)
    return get_T(lang).get("levels", {}).get(lvl, str(lvl))

def add_xp(u: dict, amount: int, reason: str = ""):
    u["xp"] += amount
    old = u["level"]
    for lvl, (lo, hi) in LEVELS_XP.items():
        if lo <= u["xp"] < hi:
            u["level"] = lvl
            break
    if u["level"] > old:
        title = get_level_title(u, u["level"])
        print(f"\n{Back.YELLOW}{Fore.BLACK}  {T(u,'levelup',lvl=u['level'],title=title)}  {Style.RESET_ALL}")
    if reason:
        print(f"  {Fore.GREEN}{T(u,'xp_gained',xp=amount,reason=reason)}{Style.RESET_ALL}")

def xp_bar(u: dict) -> str:
    lvl = u["level"]
    lo, hi = LEVELS_XP.get(lvl, (0,100))
    cur = u["xp"] - lo
    ned = hi - lo
    filled = int((cur/ned)*20) if ned > 0 else 20
    bar = "#"*filled + "-"*(20-filled)
    title = get_level_title(u, lvl)
    return f"[{bar}] {cur}/{ned} XP  |  Lvl {lvl}: {title}"

def stars(score: int) -> str:
    if score >= 5: return Fore.GREEN  + "***" + Style.RESET_ALL
    if score >= 4: return Fore.YELLOW + "** " + Style.RESET_ALL
    if score >= 2: return Fore.WHITE  + "*  " + Style.RESET_ALL
    return "   "

def chance_label(u: dict, score: int) -> str:
    if score >= 5: return Fore.GREEN  + T(u,"strong") + Style.RESET_ALL
    if score >= 4: return Fore.YELLOW + T(u,"medium") + Style.RESET_ALL
    if score >= 2: return Fore.WHITE  + T(u,"weak")   + Style.RESET_ALL
    return Fore.RED + T(u,"none") + Style.RESET_ALL

def risk_pct_label(score: int) -> str:
    if score >= 4: return Fore.GREEN  + "25%" + Style.RESET_ALL
    if score >= 2: return Fore.YELLOW + "45%" + Style.RESET_ALL
    return Fore.RED + "70%" + Style.RESET_ALL

def trade_size(u: dict) -> float:
    cfg = RISK_CONFIG.get(u["risk_level"], RISK_CONFIG["moderat"])
    return round(u["capital"] * cfg["pct"] / 100, 2)

def risk_label(u: dict) -> str:
    lang = get_lang(u)
    T_  = get_T(lang)
    names = {"konservativ": T_.get("risk_name_k","?"),
             "moderat":     T_.get("risk_name_m","?"),
             "aggressiv":   T_.get("risk_name_a","?")}
    colors = {"konservativ": Fore.GREEN, "moderat": Fore.YELLOW, "aggressiv": Fore.RED}
    r = u["risk_level"]
    return colors.get(r, "") + names.get(r, r) + Style.RESET_ALL

def risk_desc(u: dict) -> str:
    lang = get_lang(u)
    T_   = get_T(lang)
    return {
        "konservativ": T_.get("risk_desc_k",""),
        "moderat":     T_.get("risk_desc_m",""),
        "aggressiv":   T_.get("risk_desc_a",""),
    }.get(u["risk_level"], "")

def print_header(title: str):
    print(f"\n{Fore.CYAN}{'='*62}\n  {title}\n{'='*62}{Style.RESET_ALL}")

def divider():
    print(f"{Fore.CYAN}{'-'*62}{Style.RESET_ALL}")

def pause(u: dict):
    input(f"\n{Fore.CYAN}{T(u,'back_menu')}{Style.RESET_ALL}")

def done_challenge(u: dict, cid: str):
    today    = str(date.today())
    done_key = f"done_{today}"
    if done_key not in u:
        u[done_key] = []
    if cid not in u[done_key]:
        u[done_key].append(cid)
        lang = get_lang(u)
        for c in get_T(lang).get("challenges", []):
            if c["id"] == cid:
                add_xp(u, c["xp"], T(u,"challenge_done", text=c["text"]))
                break
        save_user(u)

def get_today_challenges(u: dict) -> list:
    today = str(date.today())
    key   = f"challenges_{today}"
    lang  = get_lang(u)
    all_c = get_T(lang).get("challenges", [])
    if key not in u:
        random.seed(today + str(u.get("level",1)))
        chosen = random.sample(all_c, min(3, len(all_c)))
        u[key] = [c["id"] for c in chosen]
        save_user(u)
    ids = u[key]
    return [c for c in all_c if c["id"] in ids]

# =================================================================
#  SIGNAL ENGINE
# =================================================================

def calculate_signals(ticker: str) -> dict | None:
    try:
        df = yf.download(ticker, period="3mo", interval="1d",
                         progress=False, auto_adjust=True)
        if df.empty or len(df) < 30:
            return None
        close = df["Close"].squeeze()
        rsi   = ta.momentum.RSIIndicator(close, window=14).rsi().iloc[-1]
        mo    = ta.trend.MACD(close)
        macd  = mo.macd().iloc[-1]
        msig  = mo.macd_signal().iloc[-1]
        ma20  = close.rolling(20).mean().iloc[-1]
        ma50  = close.rolling(50).mean().iloc[-1]
        price = close.iloc[-1]
        c5d   = ((price - close.iloc[-6]) / close.iloc[-6]) * 100

        score   = 0
        reasons = []
        if rsi < 35:   score += 2; reasons.append(f"RSI {rsi:.0f}")
        elif rsi < 50: score += 1; reasons.append(f"RSI {rsi:.0f}")
        elif rsi > 70: score -= 2; reasons.append(f"RSI {rsi:.0f}")
        else:                      reasons.append(f"RSI {rsi:.0f}")

        if macd > msig:  score += 2; reasons.append("MACD+")
        else:            score -= 1; reasons.append("MACD-")

        if price > ma20 > ma50:   score += 2; reasons.append("MA+")
        elif price < ma20 < ma50: score -= 2; reasons.append("MA-")
        else:                                  reasons.append("MA~")

        signal = "buy" if score >= 4 else ("sell" if score <= -2 else "hold")
        return {"price":price,"rsi":rsi,"change_5d":c5d,
                "signal":signal,"score":score,"reasons":reasons}
    except Exception:
        return None

def sig_str(u: dict, signal: str) -> str:
    key = {"buy":"buy","hold":"hold","sell":"sell"}.get(signal, "hold")
    label = T(u, key)
    if signal == "buy":  return Fore.GREEN  + Style.BRIGHT + label + Style.RESET_ALL
    if signal == "sell": return Fore.RED    + Style.BRIGHT + label + Style.RESET_ALL
    return Fore.YELLOW + label + Style.RESET_ALL

# =================================================================
#  HANDELSEMPFEHLUNG
# =================================================================

def print_trade_advice(u: dict, price: float, score: int):
    if u["capital"] <= 0:
        return
    cfg  = RISK_CONFIG[u["risk_level"]]
    size = trade_size(u)
    units = size / price if price > 0 else 0
    sl   = price * (1 - cfg["stop_loss"]   / 100)
    tp   = price * (1 + cfg["take_profit"] / 100)
    rl   = risk_label(u)
    print(f"\n  {Fore.CYAN}{T(u,'trade_advice',profile=rl)}{Style.RESET_ALL}")
    print(f"  {T(u,'invest_label'):16} {size:.2f} EUR  ({cfg['pct']}%)")
    print(f"  {T(u,'units_label'):16} ca. {units:.4f}")
    print(f"  {T(u,'stop_loss_label'):16} {sl:.2f} EUR  (-{cfg['stop_loss']}%)")
    print(f"  {T(u,'take_profit_label'):16} {tp:.2f} EUR  (+{cfg['take_profit']}%)")
    print(f"  {T(u,'chance_label'):16} {chance_label(u,score)}  {stars(score)}")
    print(f"  {T(u,'risk_label'):16} {risk_pct_label(score)}")
    print(f"  {Fore.YELLOW}{T(u,'trade_hint',price=price)}{Style.RESET_ALL}")

# =================================================================
#  ANALYSEN
# =================================================================

def analyze_stocks(u: dict):
    print_header("TOP 20 " + T(u,"menu_1")[4:])
    print(f"{'Name':<14} {'EUR':>8} {'5T%':>7} {'RSI':>5}  {'':>3}  {T(u,'signal_label')}")
    divider()
    buys = []
    for name, ticker in TOP20_STOCKS.items():
        r = calculate_signals(ticker)
        if not r:
            print(f"{name:<14}  {T(u,'no_data')}"); continue
        cc = Fore.GREEN if r["change_5d"] > 0 else Fore.RED
        print(f"{name:<14} {r['price']:>8.2f} {cc}{r['change_5d']:>+6.1f}%{Style.RESET_ALL}"
              f" {r['rsi']:>5.0f}  {stars(r['score'])}  {sig_str(u,r['signal'])}")
        if r["signal"] == "buy":
            buys.append((name, ticker, r["price"], r["score"], r))
    if buys:
        print(f"\n{Fore.GREEN}{T(u,'buy_signals')}{Style.RESET_ALL}")
        for name, ticker, price, score, r in sorted(buys, key=lambda x:-x[3]):
            print(f"\n  {Fore.GREEN}{name} ({ticker}){Style.RESET_ALL}  {stars(score)}")
            print(f"  {T(u,'reason_label')}: {', '.join(r['reasons'])}")
            print_trade_advice(u, price, score)
    pause(u)

def analyze_cryptos(u: dict):
    print_header("TOP " + T(u,"menu_2")[4:])
    try:
        params = {"vs_currency":"eur","ids":",".join(TOP_CRYPTOS),
                  "order":"market_cap_desc","price_change_percentage":"7d"}
        data = requests.get("https://api.coingecko.com/api/v3/coins/markets",
                            params=params, timeout=15).json()
    except Exception as e:
        print(f"{Fore.RED}{T(u,'error')}: {e}{Style.RESET_ALL}"); pause(u); return

    print(f"{'Name':<16} {T(u,'price_label'):>12} {'24h':>7} {'7T':>7}  {'':>3}  {T(u,'signal_label')}")
    divider()
    buys = []
    for coin in data:
        name  = coin.get("name","?")[:15]
        price = coin.get("current_price",0) or 0
        c24   = coin.get("price_change_percentage_24h") or 0
        c7    = coin.get("price_change_percentage_7d_in_currency") or 0
        score = 0
        if c24 > 3:  score += 1
        elif c24 < -3: score -= 1
        if c7 > 10:  score += 2
        elif c7 < -10: score -= 2
        sig = "buy" if score >= 2 else ("sell" if score <= -1 else "hold")
        ps  = f"{price:,.4f}" if price < 1 else f"{price:,.2f}"
        c24c = Fore.GREEN if c24 > 0 else Fore.RED
        c7c  = Fore.GREEN if c7  > 0 else Fore.RED
        print(f"{name:<16} {ps:>12} {c24c}{c24:>+6.1f}%{Style.RESET_ALL}"
              f" {c7c}{c7:>+6.1f}%{Style.RESET_ALL}  {stars(score)}  {sig_str(u,sig)}")
        if sig == "buy":
            buys.append((name, price, score))
    if buys:
        print(f"\n{Fore.GREEN}{T(u,'buy_signals')}{Style.RESET_ALL}")
        for name, price, score in sorted(buys, key=lambda x:-x[2]):
            print(f"\n  {Fore.GREEN}{name}{Style.RESET_ALL}  {stars(score)}")
            print_trade_advice(u, price, score)
    pause(u)

def analyze_small_cap_cryptos(u: dict):
    print_header(T(u,"menu_3")[4:].strip())
    print(f"{Fore.YELLOW}{T(u,'warning_spec')}{Style.RESET_ALL}\n")
    try:
        params = {"vs_currency":"eur","order":"volume_desc",
                  "per_page":250,"page":1,"price_change_percentage":"7d,30d"}
        data = requests.get("https://api.coingecko.com/api/v3/coins/markets",
                            params=params, timeout=15).json()
    except Exception as e:
        print(f"{Fore.RED}{T(u,'error')}: {e}{Style.RESET_ALL}"); pause(u); return

    candidates = []
    for coin in data:
        mcap = coin.get("market_cap") or 0
        vol  = coin.get("total_volume") or 0
        price= coin.get("current_price") or 0
        c7   = coin.get("price_change_percentage_7d_in_currency") or 0
        c24  = coin.get("price_change_percentage_24h") or 0
        if not (5_000_000 <= mcap <= 500_000_000) or vol < 500_000 or price <= 0:
            continue
        score = 0
        if c7 > 15: score += 2
        elif c7 > 5: score += 1
        if c24 > 5: score += 1
        if vol/mcap > 0.3: score += 2
        if score >= 3:
            candidates.append({"name":coin.get("name","?"),
                                "sym":coin.get("symbol","?").upper(),
                                "price":price,"mcap":mcap,
                                "c7":c7,"c24":c24,"score":score})
    for c in sorted(candidates, key=lambda x:-x["score"])[:10]:
        vola = abs(c["c7"]) * 1.5
        ps   = f"{c['price']:.6f}" if c["price"] < 0.01 else f"{c['price']:.4f}"
        print(f"{Fore.CYAN}{c['name']} ({c['sym']}){Style.RESET_ALL}  {stars(c['score'])}")
        print(f"  {T(u,'price_label'):16} {ps} EUR")
        print(f"  {T(u,'market_cap'):16} {c['mcap']/1e6:.1f} Mio EUR")
        print(f"  7T: {Fore.GREEN if c['c7']>0 else Fore.RED}{c['c7']:+.1f}%{Style.RESET_ALL}"
              f"  24h: {c['c24']:+.1f}%")
        print(f"  {T(u,'chance_label'):16} {chance_label(u,c['score'])}")
        print(f"  {T(u,'risk_label'):16} {risk_pct_label(c['score'])}")
        print(f"  {T(u,'potential'):16} +{vola*0.5:.0f}% - +{vola*3:.0f}%  {T(u,'no_guarantee')}")
        print(f"  {T(u,'risk_very_high')}")
        if u["capital"] > 0:
            einsatz = min(trade_size(u), u["capital"]*0.05)
            print(f"  {T(u,'recommended_invest')}: {einsatz:.2f} EUR  ({T(u,'spec_warning_small')})")
        print()
    pause(u)

def analyze_small_cap_stocks(u: dict):
    print_header(T(u,"menu_4")[4:].strip())
    print(f"{Fore.YELLOW}{T(u,'warning_spec')}{Style.RESET_ALL}\n")
    candidates = []
    for name, ticker in SMALL_CAP_STOCKS.items():
        r = calculate_signals(ticker)
        if not r or r["score"] < 2:
            continue
        try:    mcap = yf.Ticker(ticker).fast_info.market_cap or 0
        except: mcap = 0
        candidates.append({"name":name,"ticker":ticker,"price":r["price"],
                            "mcap":mcap,"c5":r["change_5d"],"rsi":r["rsi"],
                            "score":r["score"],"signal":r["signal"]})
    if not candidates:
        print(T(u,"no_candidates")); pause(u); return
    for c in sorted(candidates, key=lambda x:-x["score"])[:10]:
        mcap_s = f"{c['mcap']/1e6:.0f} Mio $" if c["mcap"]>0 else "?"
        vola   = abs(c["c5"]) * 2.5
        print(f"{Fore.CYAN}{c['name']} ({c['ticker']}){Style.RESET_ALL}  {stars(c['score'])}")
        print(f"  {T(u,'price_label'):16} ${c['price']:.4f}")
        print(f"  {T(u,'market_cap'):16} {mcap_s}")
        print(f"  5T: {Fore.GREEN if c['c5']>0 else Fore.RED}{c['c5']:+.1f}%{Style.RESET_ALL}"
              f"  RSI: {c['rsi']:.0f}")
        print(f"  {T(u,'signal_label'):16} {sig_str(u,c['signal'])}")
        print(f"  {T(u,'chance_label'):16} {chance_label(u,c['score'])}")
        print(f"  {T(u,'potential'):16} +{max(5,vola*0.5):.0f}% - +{vola*3:.0f}%  {T(u,'no_guarantee')}")
        print_trade_advice(u, c["price"], c["score"])
        print()
    pause(u)

# =================================================================
#  PROFIL & EINSTELLUNGEN
# =================================================================

def profile_menu(u: dict):
    while True:
        clear()
        print_header(T(u,"profile_title"))
        cfg = RISK_CONFIG[u["risk_level"]]
        print(f"  {T(u,'name_label'):16} {u['name'] or T(u,'not_set')}")
        print(f"  {T(u,'capital_label'):16} {u['capital']:.2f} EUR")
        print(f"  {T(u,'profile_label'):16} {risk_label(u)}")
        print(f"  Pro Trade:        ~{trade_size(u):.2f} EUR  ({cfg['pct']}%)")
        print(f"  Stop-Loss:        -{cfg['stop_loss']}%   Take-Profit: +{cfg['take_profit']}%")
        print(f"  {risk_desc(u)}")
        divider()
        print(f"  {T(u,'change_capital')}")
        print(f"  {T(u,'change_risk_menu')}")
        print(f"  {T(u,'change_name')}")
        print(f"  {T(u,'back')}")
        ch = input(f"\n  {T(u,'choice')}").strip()
        if ch == "1":
            try:
                val = float(input(f"  {T(u,'ask_capital')}").replace(",","."))
                if val > 0:
                    u["capital"] = val; save_user(u)
                    add_xp(u, 50, T(u,"capital_set")); save_user(u)
                    done_challenge(u, "set_capital")
                    print(f"  {Fore.GREEN}{T(u,'capital_saved',val=val)}{Style.RESET_ALL}")
            except ValueError:
                print(f"  {Fore.RED}{T(u,'invalid')}{Style.RESET_ALL}")
            input(f"\n  {T(u,'press_enter')}")
        elif ch == "2":
            print(f"\n  {T(u,'risk_1')}")
            print(f"  {T(u,'risk_2')}")
            print(f"  {T(u,'risk_3')}")
            rc = input(f"  {T(u,'risk_choice')}").strip()
            mapping = {"1":"konservativ","2":"moderat","3":"aggressiv"}
            if rc in mapping:
                u["risk_level"] = mapping[rc]; save_user(u)
                add_xp(u, 40, T(u,"risk_updated")); save_user(u)
                done_challenge(u, "change_risk")
                lang = get_lang(u)
                rname = get_T(lang).get({"konservativ":"risk_name_k",
                                          "moderat":"risk_name_m",
                                          "aggressiv":"risk_name_a"}[mapping[rc]],"?")
                print(f"  {Fore.GREEN}{T(u,'risk_set',r=rname)}{Style.RESET_ALL}")
            else:
                print(f"  {Fore.RED}{T(u,'invalid')}{Style.RESET_ALL}")
            input(f"\n  {T(u,'press_enter')}")
        elif ch == "3":
            name = input(f"  {T(u,'ask_name')}").strip()
            if name:
                u["name"] = name; save_user(u)
                print(f"  {Fore.GREEN}{T(u,'name_saved',name=name)}{Style.RESET_ALL}")
            input(f"\n  {T(u,'press_enter')}")
        elif ch == "0":
            break

# =================================================================
#  TAGESHERAUSFORDERUNGEN
# =================================================================

def show_challenges(u: dict):
    clear()
    print_header(T(u,"menu_h")[4:].strip())
    today    = str(date.today())
    done_key = f"done_{today}"
    done_list = u.get(done_key, [])
    challenges = get_today_challenges(u)
    all_done = True
    for c in challenges:
        ok = c["id"] in done_list
        status = f"{Fore.GREEN}[OK]{Style.RESET_ALL}" if ok else f"{Fore.RED}[ ]{Style.RESET_ALL}"
        print(f"  {status} {c['text']}  (+{c['xp']} XP)")
        if not ok: all_done = False
    if all_done:
        print(f"\n{Back.GREEN}{Fore.BLACK}  {T(u,'all_done')}  {Style.RESET_ALL}")
        print(f"  {Fore.YELLOW}{T(u,'come_back')}{Style.RESET_ALL}")
    divider()
    print(f"  {xp_bar(u)}")
    print(f"  {T(u,'streak_label')}: {u['streak']} {T(u,'days_label')}")
    pause(u)

# =================================================================
#  TUTORIAL CHAT
# =================================================================

def tutorial_chat(u: dict):
    done_challenge(u, "use_tutorial")
    lang = get_lang(u)
    faq  = get_T(lang).get("faq", get_T("de")["faq"])
    while True:
        clear()
        print_header(T(u,"tutorial_title"))
        print(f"  {Fore.CYAN}{T(u,'tutorial_intro')}{Style.RESET_ALL}\n")
        for i, item in enumerate(faq, 1):
            print(f"  [{i:>2}] {item['q']}")
        print(f"\n  {T(u,'back')}\n")
        ch = input(f"  {T(u,'choice')}").strip()
        if ch == "0":
            break
        try:
            idx = int(ch) - 1
            if 0 <= idx < len(faq):
                clear()
                print_header(faq[idx]["q"])
                print()
                for line in faq[idx]["a"].split("\n"):
                    print(f"  {line}")
                add_xp(u, 5, T(u,"faq_read"))
                save_user(u)
                pause(u)
        except ValueError:
            pass

# =================================================================
#  LOGIN / STREAK
# =================================================================

def handle_login(u: dict):
    today = str(date.today())
    if u["last_login"] == today:
        return
    if u["last_login"]:
        from datetime import timedelta
        last = date.fromisoformat(u["last_login"])
        diff = (date.today() - last).days
        if diff == 1:
            u["streak"] += 1
            add_xp(u, min(u["streak"]*10, 100), T(u,"streak_bonus",s=u["streak"]))
        elif diff > 1:
            u["streak"] = 1
    else:
        u["streak"] = 1
        add_xp(u, 20, T(u,"first_login"))
    u["last_login"] = today
    save_user(u)

def first_setup(u: dict):
    # Sprache erkennen BEVOR der Name abgefragt wird
    lang = detect_language()
    u["lang"] = lang
    T_ = get_T(lang)

    clear()
    print_header(T_["welcome_title"])
    print(f"\n  {T_['welcome_intro']}\n")

    name = input(f"  {T_['ask_name']}").strip()
    while not name:
        name = input(f"  {T_['ask_name']}").strip()
    u["name"] = name

    # Begruessung in Systemsprache
    clear()
    greetings = {
        "de": f"Hallo, {name}! Schoen, dich zu treffen.",
        "en": f"Hello, {name}! Great to meet you.",
        "tr": f"Merhaba, {name}! Seninle tanismak guzel.",
        "ru": f"Privet, {name}! Priyatno poznakomitsya.",
        "fr": f"Bonjour, {name}! Ravi de vous rencontrer.",
        "es": f"Hola, {name}! Encantado de conocerte.",
        "it": f"Ciao, {name}! Piacere di conoscerti.",
        "pl": f"Czesc, {name}! Milo cie poznac.",
        "ar": f"Marhaba, {name}! Yaserrni liqa'uk.",
        "nl": f"Hallo, {name}! Leuk je te ontmoeten.",
    }
    print(f"\n  {Fore.CYAN}{greetings.get(lang, greetings['de'])}{Style.RESET_ALL}\n")

    try:
        val = float(input(f"  {T_['ask_capital']}").replace(",","."))
        if val > 0:
            u["capital"] = val
    except ValueError:
        pass

    print(f"\n  {T_['ask_risk']}")
    print(f"  {T_['risk_1']}")
    print(f"  {T_['risk_2']}")
    print(f"  {T_['risk_3']}")
    rc = input(f"\n  {T_['risk_choice']}").strip()
    u["risk_level"] = {"1":"konservativ","2":"moderat","3":"aggressiv"}.get(rc, "moderat")

    add_xp(u, 100, T_["profile_created"])
    save_user(u)
    print(f"\n  {Fore.GREEN}{T_['profile_saved']}{Style.RESET_ALL}")
    input(f"\n  {T_['press_enter']}")

# =================================================================
#  AUTO-UPDATE
# =================================================================

def check_for_update():
    try:
        response = requests.get(UPDATE_URL, timeout=8)
        if response.status_code != 200:
            return
        remote_code    = response.text
        remote_version = None
        for line in remote_code.splitlines():
            if line.startswith("VERSION = "):
                remote_version = line.split('"')[1]
                break
        if not remote_version or remote_version == VERSION:
            return
        def vt(v): return tuple(int(x) for x in v.split("."))
        if vt(remote_version) <= vt(VERSION):
            return
        print(f"\n{Fore.CYAN}  Update: {VERSION} -> {remote_version}{Style.RESET_ALL}")
        print(f"  Downloading...")
        this_file = os.path.abspath(sys.argv[0])
        shutil.copy2(this_file, this_file + ".bak")
        with open(this_file, "w", encoding="utf-8") as f:
            f.write(remote_code)
        print(f"  {Fore.GREEN}Done! Restarting...{Style.RESET_ALL}\n")
        subprocess.Popen([sys.executable, this_file] + sys.argv[1:])
        sys.exit(0)
    except Exception:
        pass

# =================================================================
#  HAUPT-MENUE
# =================================================================

def main():
    u = load_user()
    if not u["name"]:
        first_setup(u)
    if not u.get("lang"):
        u["lang"] = detect_language()
        save_user(u)
    handle_login(u)

    while True:
        clear()
        today        = str(date.today())
        done_today   = len(u.get(f"done_{today}", []))
        ch_today     = len(get_today_challenges(u))

        print(f"\n{Fore.CYAN}  ============================================")
        print(f"       TRADE SIGNAL SYSTEM  v{VERSION}")
        print(f"       {datetime.now().strftime('%d.%m.%Y  %H:%M')}")
        print(f"  ============================================{Style.RESET_ALL}")
        print(f"  {T(u,'greeting',name=u['name'])}")
        print(f"  {T(u,'capital_label')}: {Fore.GREEN}{u['capital']:.2f} EUR{Style.RESET_ALL}"
              f"  |  {T(u,'profile_label')}: {risk_label(u)}")
        print(f"  {xp_bar(u)}")
        print(f"  {T(u,'challenges_label')}: {done_today}/{ch_today}"
              f"  |  {T(u,'streak_label')}: {u['streak']} {T(u,'days_label')}")
        divider()
        print(f"  {T(u,'menu_1')}")
        print(f"  {T(u,'menu_2')}")
        print(f"  {T(u,'menu_3')}")
        print(f"  {T(u,'menu_4')}")
        print(f"  {T(u,'menu_5')}")
        divider()
        print(f"  {T(u,'menu_h')}")
        print(f"  {T(u,'menu_t')}")
        print(f"  {T(u,'menu_p')}")
        print(f"  {T(u,'menu_0')}")
        divider()

        ch = input(f"\n  {T(u,'choice')}").strip().upper()

        if ch == "1":
            done_challenge(u,"view_stocks"); u["total_signals_viewed"]+=1; save_user(u)
            analyze_stocks(u)
        elif ch == "2":
            done_challenge(u,"view_crypto"); u["total_signals_viewed"]+=1; save_user(u)
            analyze_cryptos(u)
        elif ch == "3":
            done_challenge(u,"view_small_c"); u["total_signals_viewed"]+=1; save_user(u)
            analyze_small_cap_cryptos(u)
        elif ch == "4":
            done_challenge(u,"view_small_s"); u["total_signals_viewed"]+=1; save_user(u)
            analyze_small_cap_stocks(u)
        elif ch == "5":
            done_challenge(u,"view_all"); u["total_signals_viewed"]+=1; save_user(u)
            analyze_stocks(u); analyze_cryptos(u)
            analyze_small_cap_cryptos(u); analyze_small_cap_stocks(u)
        elif ch == "H":
            show_challenges(u)
        elif ch == "T":
            tutorial_chat(u)
        elif ch == "P":
            profile_menu(u)
        elif ch == "0":
            print(f"\n  {Fore.CYAN}{T(u,'goodbye',streak=u['streak'])}{Style.RESET_ALL}\n")
            break

if __name__ == "__main__":
    check_for_update()
    main()
