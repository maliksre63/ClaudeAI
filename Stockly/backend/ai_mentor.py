"""
KI Mentor — Multi-provider AI with smart fallback.
Supports: Anthropic Claude, OpenAI GPT, Google Gemini, Mistral AI.
Falls back to rule-based expert system if no key is available.
"""
import os
import math
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
_client = None

PROVIDERS = {
    'anthropic': {'name': 'Claude',       'company': 'Anthropic', 'color': '#c96442', 'model': 'claude-sonnet-4-6',    'key_prefix': 'sk-ant'},
    'openai':    {'name': 'GPT-4o',       'company': 'OpenAI',    'color': '#10a37f', 'model': 'gpt-4o-mini',           'key_prefix': 'sk-'},
    'gemini':    {'name': 'Gemini',       'company': 'Google',    'color': '#4285f4', 'model': 'gemini-1.5-flash',      'key_prefix': 'AIza'},
    'mistral':   {'name': 'Mistral',      'company': 'Mistral AI','color': '#ff7000', 'model': 'mistral-large-latest',  'key_prefix': ''},
}

def _get_client():
    global _client
    if _client is None and API_KEY:
        try:
            import anthropic
            _client = anthropic.Anthropic(api_key=API_KEY)
        except Exception:
            _client = None
    return _client

def _call_openai(messages, api_key, user=None):
    import openai
    client = openai.OpenAI(api_key=api_key)
    msgs = [{"role": "system", "content": SYSTEM_PROMPT}]
    if user:
        msgs[0]["content"] += f"\nNutzer: {user.username} | Level {user.level}"
    msgs += [{"role": m["role"], "content": m["content"]} for m in messages]
    r = client.chat.completions.create(model="gpt-4o-mini", messages=msgs, max_tokens=600)
    return r.choices[0].message.content

def _call_gemini(messages, api_key, user=None):
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    sys = SYSTEM_PROMPT + (f"\nNutzer: {user.username} | Level {user.level}" if user else "")
    model = genai.GenerativeModel('gemini-1.5-flash', system_instruction=sys)
    history = []
    for m in messages[:-1]:
        history.append({"role": "user" if m["role"] == "user" else "model", "parts": [m["content"]]})
    chat = model.start_chat(history=history)
    r = chat.send_message(messages[-1]["content"])
    return r.text

def _call_mistral(messages, api_key, user=None):
    from mistralai import Mistral
    client = Mistral(api_key=api_key)
    msgs = [{"role": "system", "content": SYSTEM_PROMPT}]
    if user:
        msgs[0]["content"] += f"\nNutzer: {user.username} | Level {user.level}"
    msgs += [{"role": m["role"], "content": m["content"]} for m in messages]
    r = client.chat.complete(model="mistral-large-latest", messages=msgs, max_tokens=600)
    return r.choices[0].message.content

def _call_anthropic(messages, api_key, user=None):
    import anthropic
    client = anthropic.Anthropic(api_key=api_key)
    user_ctx = f"\nNutzer: {user.username} | Level {user.level} | Lektionen: {len(user.done_lessons or [])}" if user else ""
    r = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=600,
        system=SYSTEM_PROMPT + user_ctx,
        messages=[{"role": m["role"], "content": m["content"]} for m in messages],
    )
    return r.content[0].text

SYSTEM_PROMPT = """Du bist Stockly's KI-Mentor — ein erfahrener, freundlicher Finanz-Coach.
Deine Antworten sind präzise, klar und auf Anfänger zugeschnitten.
Antworte auf Deutsch. Max 3 kurze Absätze. Nutze Alltagsanalogien.
Gib KEINE spezifische Finanzberatung — lehre Verständnis und Denkweise."""

# ── Smart Fallback Responses ──────────────────────────────────────────────────

_FALLBACK = {
    "buy": lambda asset, price, rsi, trend: f"""
**Kaufzeitpunkt für {asset}** {"📈" if trend == "up" else "📉"}

{_trend_text(asset, price, rsi, trend)}

{"RSI liegt bei " + str(round(rsi)) + " — das ist " + ("im neutralen Bereich. Weder klar überkauft noch überverkauft." if 40<rsi<60 else ("überkauft (>70). Das bedeutet: viele haben bereits gekauft, ein Rücksetzer ist wahrscheinlicher." if rsi>=70 else "überverkauft (<30). Technisch ein mögliches Kaufsignal — aber kein Garant.")) if rsi else ""}

**Fazit:** {_buy_verdict(rsi, trend)} Bedenke: Paper Trading ist perfekt um Timing zu üben — ohne echtes Risiko.
""".strip(),

    "sell": lambda asset, price, rsi, trend: f"""
**Verkaufszeitpunkt für {asset}**

{_trend_text(asset, price, rsi, trend, sell=True)}

Beim Verkauf entscheidend: Hast du dein Ziel erreicht? Hat sich die ursprüngliche Investitionsthese verändert? Ein Verkauf aus reiner Angst (Panikverkauf) ist oft der schlechteste Zeitpunkt.

**Fazit:** {_sell_verdict(rsi, trend)} Setze dir klare Regeln: z.B. "Ich verkaufe wenn der Kurs 15% fällt" — und halte sie ein.
""".strip(),

    "analyse": lambda asset, price, rsi, trend: f"""
**Analyse: {asset}** — Aktueller Kurs: {_fmt(price)}

Technische Einschätzung: Der Trend ist aktuell {"aufwärts gerichtet — das Wertpapier bildet höhere Hochs und höhere Tiefs. Das ist ein bullisches Zeichen." if trend=="up" else "abwärts gerichtet — klassisches Warnsignal für mögliche weitere Verluste." if trend=="down" else "seitwärts — der Markt ist unentschlossen."}

RSI bei {round(rsi) if rsi else "–"}: {_rsi_text(rsi)}

**Gesamtbild:** Für eine vollständige Analyse solltest du auch Fundamentaldaten betrachten — KGV, Umsatzwachstum und Branchentrends. Paper Trading auf Basis technischer Analyse ist ein hervorragender Einstieg.
""".strip(),

    "risk": lambda asset, price, rsi, trend: f"""
**Risikoeinschätzung: {asset}**

Volatilität ist dein wichtigstes Risikomaß. {"Kryptowährungen wie " + asset + " können innerhalb von Stunden 20-30% fallen — oder steigen. Nur investieren was du dir leisten kannst zu verlieren." if "usd" in asset.lower() else "Als Aktie ist " + asset + " reguliert und tendenziell weniger volatil als Krypto — aber Verluste von 30-50% in Bärenmärkten sind historisch normal."}

Regel Nr. 1: Diversifikation. Nie mehr als 5-10% deines Depots in eine einzelne Position.

**Risikoprofil:** {"Hoch — für erfahrene Trader" if trend=="down" and (rsi or 50)>65 else "Mittel — vertretbar mit klarem Stop-Loss" if 40<(rsi or 50)<65 else "Moderat — solide Basis mit gutem Risk-Reward"}
""".strip(),

    "compare": lambda asset, price, rsi, trend: f"""
**Vergleichsanalyse: {asset}**

{asset} zählt {"zu den Kryptowährungen — direkt vergleichbar mit Bitcoin und Ethereum. Bitcoin gilt als 'digitales Gold' (Wertaufbewahrung), Ethereum als 'digitales Öl' (Smart Contracts). Altcoins wie " + asset + " haben höheres Potenzial aber auch höheres Risiko." if "-USD" in asset.upper() else "zu den Aktien — vergleichbar mit ähnlichen Unternehmen in der Branche. ETFs wären eine risikoärmere Alternative da sie gleich viele Unternehmen bündeln."}

Für Anfänger gilt: Breite ETFs (z.B. MSCI World, S&P 500) schlagen langfristig die meisten aktiv gemanagten Portfolios.

**Empfehlung für Einsteiger:** Erst ETFs lernen, dann Einzelwerte — die Basis ist entscheidend.
""".strip(),

    "explain": lambda concept: f"""
**Erklärung: {concept}**

{_concept_text(concept)}
""".strip(),
}

def _fmt(price): return f"{price:,.2f} €" if price else "–"

def _trend_text(asset, price, rsi, trend, sell=False):
    if trend == "up":
        return f"Der Kurs von {asset} befindet sich im Aufwärtstrend. {'Das klingt positiv — aber nach starken Anstiegen ist Vorsicht geboten da viele Gewinnmitnahmen folgen können.' if sell else 'Kaufen im Trend gilt als konservativere Strategie als antizyklisch gegen den Trend zu kaufen.'}"
    elif trend == "down":
        msg_buy  = "Ein Downtrend kann ein Kaufsignal sein — aber Vorsicht: Oft fällt es noch weiter. Never catch a falling knife."
        msg_sell = "Im Abwärtstrend ist Vorsicht geboten. Überlege einen Stop-Loss zu setzen."
        return f"Der Kurs von {asset} ist aktuell im Abwärtstrend. {msg_buy if not sell else msg_sell}"
    return f"Der Kurs von {asset} bewegt sich seitwärts — kein klarer Trend erkennbar."

def _rsi_text(rsi):
    if not rsi: return "Nicht verfügbar."
    if rsi >= 70: return "Überkauft — viele Käufer haben bereits zugegriffen. Rücksetzer wahrscheinlicher."
    if rsi <= 30: return "Überverkauft — mögliches Kaufsignal, aber kein Garant für Trendwende."
    return "Im neutralen Bereich — weder klar bullish noch bearish."

def _buy_verdict(rsi, trend):
    if trend == "up" and (not rsi or rsi < 65): return "Technisch sehen die Signale eher positiv aus."
    if trend == "down" or (rsi and rsi > 70): return "Aktuell eher vorsichtig sein — warte auf Stabilisierung."
    return "Gemischtes Bild — kleinere Position oder abwarten wäre sinnvoll."

def _sell_verdict(rsi, trend):
    if trend == "down" and (rsi and rsi < 40): return "Technisch sprechen aktuell eher Argumente für Verkauf oder Stop-Loss."
    if trend == "up" and (rsi and rsi > 70): return "RSI überkauft — Gewinnmitnahmen wären strategisch vertretbar."
    return "Kein klares Verkaufssignal — halte deinen Plan ein."

def _concept_text(concept: str) -> str:
    c = concept.lower()
    if "rsi" in c:
        return "RSI (Relative Strength Index) geht von 0–100. Über 70 = überkauft (zu viele Käufer, Rücksetzer möglich). Unter 30 = überverkauft (möglicher Boden). Stell dir vor: ein Gummiband das zu weit gedehnt wird — es schnappt zurück.\n\nRSI ist kein Wundermittel — nutze ihn immer zusammen mit anderen Indikatoren und Trendanalyse."
    if "macd" in c:
        return "MACD vergleicht zwei gleitende Durchschnitte (12-Tage vs. 26-Tage). Wenn die MACD-Linie die Signallinie von unten kreuzt → mögliches Kaufsignal. Von oben → Verkaufssignal.\n\nDer MACD ist besonders gut für Trendfolge-Strategien. Bei seitwärts laufenden Märkten gibt er viele Fehlsignale."
    if "stop" in c and "loss" in c:
        return "Ein Stop-Loss ist dein Sicherheitsnetz. Du kaufst Apple bei 150€ und setzt Stop-Loss bei 135€ (-10%). Fällt die Aktie auf 135€, wird automatisch verkauft.\n\nOhne Stop-Loss: Hoffnung auf Erholung → oft noch größere Verluste. Mit Stop-Loss: definiertes Risiko, klarer Kopf."
    if "dca" in c or "cost" in c:
        return "Dollar-Cost-Averaging (DCA) bedeutet: regelmäßig investieren — egal ob Kurs hoch oder niedrig. Beispiel: jeden Monat 100€ in denselben ETF.\n\nVorteil: Du kaufst automatisch mehr Anteile wenn Kurse fallen (günstig) und weniger wenn sie steigen (teuer). Über Zeit ergibt sich ein guter Durchschnittspreis — ohne Market Timing."
    if "diversi" in c:
        return "Diversifikation = Risiko verteilen. Stell dir vor alle Eier in einem Korb — fällt der Korb, sind alle Eier kaputt. Mit 20 Körben (verschiedene Aktien/Branchen/Länder) überlebt ein Sturz einen Korb.\n\nFaustregel: Keine einzelne Position über 5-10% des Gesamtdepots. ETFs sind die einfachste Form der Diversifikation."
    if "kgv" in c or "p/e" in c or "kurs-gewinn" in c:
        return "Das KGV (Kurs-Gewinn-Verhältnis) zeigt wie teuer eine Aktie ist. KGV 20 bedeutet: du zahlst 20€ für 1€ Jahresgewinn.\n\nKGV < 15: oft günstig bewertet. KGV > 30: teuer — Wachstum wird eingepreist. Vergleiche immer innerhalb der gleichen Branche: Tech-Firmen haben oft KGV 30–50, Banken 8–12."
    if "etf" in c:
        return "Ein ETF (Exchange Traded Fund) bündelt viele Aktien in einem Produkt. MSCI World ETF = Anteile an ~1600 Unternehmen aus 23 Ländern in einer einzigen Transaktion.\n\nVorteile: Geringe Kosten (TER 0,1-0,3%), breite Streuung, passiv gemanagte schlagen aktiv gemanagte Fonds langfristig in 85% der Fälle."
    if "bull" in c or "bär" in c or "bear" in c:
        return "Bullenmarkt: Kurse steigen über längere Zeit (>20% Anstieg). Optimismus dominiert — alle wollen kaufen.\nBärenmarkt: Kurse fallen über längere Zeit (>20% Rückgang). Pessimismus — alle wollen verkaufen.\n\nTrick: Bärenmärkte dauern durchschnittlich 9 Monate, Bullenmärkte 2,7 Jahre. Wer durchhält, wird langfristig belohnt."
    if "volatil" in c:
        return "Volatilität misst wie stark ein Kurs schwankt. Hohe Volatilität = große tägliche Ausschläge (Krypto, Tech-Startups). Niedrige Volatilität = stabile, langsame Bewegungen (Versorgungsunternehmen, Gold).\n\nBeta ist eine verwandte Kennzahl: Beta > 1 = volatiler als Markt. Beta < 1 = stabiler. Als Anfänger: niedrig-volatile Assets reduzieren emotionalen Stress."
    return f"'{concept}' ist ein wichtiges Konzept in der Finanzwelt. Kern-Idee: {concept} hilft dir dabei, Märkte besser zu verstehen und fundiertere Entscheidungen zu treffen.\n\nEmpfehlung: Lies dich in die Grundlagen ein — der Lernpfad im Mentor bietet dir strukturierte Erklärungen zu allen wichtigen Themen."

# ── Market data for context ───────────────────────────────────────────────────

def _get_market_context(ticker: str) -> dict:
    """Get live price and basic technical context."""
    try:
        import yfinance as yf
        t = yf.Ticker(ticker)
        hist = t.history(period="3mo")
        if hist.empty:
            return {}
        price = float(hist["Close"].iloc[-1])
        closes = hist["Close"].tolist()
        # Simple RSI
        gains, losses = [], []
        for i in range(1, len(closes)):
            d = closes[i] - closes[i-1]
            gains.append(max(d,0)); losses.append(max(-d,0))
        ag = sum(gains[-14:])/14 if len(gains)>=14 else None
        al = sum(losses[-14:])/14 if len(losses)>=14 else None
        rsi = 100 - 100/(1+ag/al) if ag and al and al>0 else 50
        # Trend: compare last 20 days vs previous 20 days
        if len(closes) >= 40:
            trend = "up" if sum(closes[-20:])/20 > sum(closes[-40:-20])/20 else "down"
        else:
            trend = "up" if closes[-1] > closes[0] else "down"
        return {"price": price, "rsi": rsi, "trend": trend}
    except Exception:
        return {}

# ── Main chat function ────────────────────────────────────────────────────────

def chat(messages: list, user, context: str = "general", provider: str = "auto", provider_key: str = "") -> str:
    # 1. Try user's chosen provider with their key
    if provider != "auto" and provider_key:
        try:
            if provider == "anthropic":
                return _call_anthropic(messages, provider_key, user)
            elif provider == "openai":
                return _call_openai(messages, provider_key, user)
            elif provider == "gemini":
                return _call_gemini(messages, provider_key, user)
            elif provider == "mistral":
                return _call_mistral(messages, provider_key, user)
        except Exception:
            pass  # Fall through to global key

    # 2. Try global Anthropic key
    client = _get_client()
    if client:
        try:
            return _call_anthropic(messages, API_KEY, user)
        except Exception:
            pass

    # 3. Rule-based fallback
    last_q = messages[-1]["content"] if messages else ""
    return _smart_fallback(last_q)

def _smart_fallback(question: str) -> str:
    """Intelligent rule-based response using market data."""
    q = question.lower()

    # Detect asset ticker from question
    from assets import ASSETS
    detected = None
    detected_asset = None
    for a in ASSETS:
        if a["ticker"].lower() in q or a["name"].lower() in q.lower():
            detected = a["ticker"]
            detected_asset = a
            break

    # Get market context if we have a ticker
    ctx = {}
    if detected:
        ctx = _get_market_context(detected)

    price = ctx.get("price")
    rsi   = ctx.get("rsi")
    trend = ctx.get("trend", "sideways")
    name  = detected_asset["name"] if detected_asset else (detected or "diesem Asset")

    # ── Erklärung / Konzept ──────────────────────────────────────────────────
    explain_kw = ["erkläre", "erklär", "was ist", "was bedeutet", "was sind", "wie funktioniert", "what is"]
    if any(k in q for k in explain_kw):
        concept = question
        for pfx in ['Erkläre mir "', 'Erkläre "', 'Erklär mir "', 'Was ist "']:
            concept = concept.replace(pfx, '').replace('" einfach und verständlich für einen Börsenanfänger.', '').strip('"').strip()
        return _FALLBACK["explain"](concept)

    # ── Kaufen ────────────────────────────────────────────────────────────────
    if any(k in q for k in ["kaufen", "kaufzeitpunkt", "guter kauf", "jetzt kaufen", "einsteigen"]):
        return _FALLBACK["buy"](name, price, rsi, trend)

    # ── Verkaufen ─────────────────────────────────────────────────────────────
    if any(k in q for k in ["verkaufen", "verkaufszeitpunkt", "aussteigen", "abstoßen", "rausgehen"]):
        return _FALLBACK["sell"](name, price, rsi, trend)

    # ── Analysieren ───────────────────────────────────────────────────────────
    if any(k in q for k in ["analysiere", "analyse", "analysier", "bewerte", "einschätzung", "meinung"]):
        return _FALLBACK["analyse"](name, price, rsi, trend)

    # ── Risiko ────────────────────────────────────────────────────────────────
    if any(k in q for k in ["risiko", "riskant", "gefährlich", "sicher", "verlust"]):
        return _FALLBACK["risk"](name, price, rsi, trend)

    # ── Vergleich ─────────────────────────────────────────────────────────────
    if any(k in q for k in ["vergleich", "alternative", "besser als", "unterschied", "vs ", "versus"]):
        return _FALLBACK["compare"](name, price, rsi, trend)

    # ── Portfolio aufbauen ────────────────────────────────────────────────────
    if any(k in q for k in ["portfolio", "depot", "aufbauen", "zusammenstellen", "diversifizieren", "aufteilen"]):
        return """**Portfolio aufbauen — die Grundregel**

Ein solides Anfänger-Portfolio folgt einer einfachen Struktur: 60–70% breite ETFs (z.B. MSCI World), 20–30% regionale oder thematische ETFs (z.B. Europa, Tech), 5–10% spekulative Einzelwerte oder Krypto.

Wichtigste Prinzipien: Diversifikation (nie alles auf eine Karte), regelmäßiges Investieren (DCA-Strategie), und Geduld. Warren Buffett sagte: "Der Aktienmarkt ist ein Gerät, um Geld von ungeduldigen zu geduldigen Menschen zu transferieren."

**Für Einsteiger:** Starte mit einem einzigen MSCI World ETF. Das ist einfacher als es klingt und schlägt die meisten aktiv gemanagten Portfolios langfristig."""

    # ── Anfänger / Starten ────────────────────────────────────────────────────
    if any(k in q for k in ["anfänger", "anfangen", "beginner", "starten", "wie fange", "wie starte", "erste schritt", "neuer"]):
        return """**Als Anfänger starten — der richtige Weg**

Schritt 1: Verstehe die Grundlagen. Bevor du investierst, lerne was Aktien, ETFs und Risiko bedeuten. Der Lernpfad in Stockly führt dich strukturiert durch alle Themen.

Schritt 2: Paper Trading (genau das, was du hier machst!). Handele mit virtuellem Geld ohne echtes Risiko. So lernst du deine Emotionen kennen — Gier und Angst sind die größten Feinde jedes Traders.

Schritt 3: Dann erst echtes Geld. Klein anfangen, nie mehr als du verlieren kannst. Ein MSCI World ETF ist der einfachste, bewährteste Einstieg. **Deine Neugier zu fragen ist schon der wichtigste erste Schritt!**"""

    # ── ETF / Index ───────────────────────────────────────────────────────────
    if any(k in q for k in ["etf", "index", "msci", "s&p", "dax", "nasdaq"]):
        return _FALLBACK["explain"]("ETFs und Indexfonds")

    # ── Krypto allgemein ──────────────────────────────────────────────────────
    if any(k in q for k in ["krypto", "crypto", "bitcoin", "btc", "ethereum", "blockchain", "coin", "token", "altcoin"]):
        return """**Kryptowährungen — was du wissen musst**

Krypto ist die volatilste Anlageklasse überhaupt. Bitcoin kann in einem Jahr 300% steigen und danach 80% fallen — beides ist historisch passiert. Ethereum, Solana und andere Altcoins sind noch volatiler.

Der Vorteil: Krypto ist dezentralisiert, läuft 24/7, und bietet Zugang zu neuen Technologien (DeFi, Smart Contracts). Der Nachteil: Hohe Regulierungsunsicherheit, kein Einlagenschutz, viele Scam-Projekte.

**Faustregel:** Krypto maximal 5–15% des Portfolios. Nur Bitcoin und Ethereum gelten als "bewährt". Alles andere ist hochspekulativ. DYOR — Do Your Own Research."""

    # ── Stop-Loss / Absicherung ───────────────────────────────────────────────
    if any(k in q for k in ["stop loss", "stop-loss", "absicherung", "absichern", "limite", "limit"]):
        return _FALLBACK["explain"]("Stop-Loss")

    # ── Dividenden ────────────────────────────────────────────────────────────
    if any(k in q for k in ["dividende", "ausschüttung", "dividendenaktie", "passives einkommen"]):
        return """**Dividenden — passives Einkommen durch Aktien**

Dividenden sind Gewinnbeteiligungen, die Unternehmen regelmäßig (meist jährlich oder quartalsweise) an Aktionäre auszahlen. Eine Dividendenrendite von 3–5% gilt als attraktiv.

Bekannte Dividendentitel: Allianz, Munich Re, BASF (DE), Johnson & Johnson, Coca-Cola (US), Realty Income (monatliche Ausschüttung). Diese Aktien sind oft stabiler, aber wachsen langsamer.

**Wichtig:** Schau nicht nur auf die Dividendenrendite. Prüfe ob das Unternehmen die Dividende nachhaltig bezahlen kann (Ausschüttungsquote < 70% des Gewinns ist ein gutes Zeichen)."""

    # ── Technische Analyse ────────────────────────────────────────────────────
    if any(k in q for k in ["technische analyse", "charttechnik", "chart", "muster", "resistance", "support", "widerstand", "unterstützung"]):
        return """**Technische Analyse — Kursmuster lesen**

Technische Analyse (TA) versucht, zukünftige Kursbewegungen aus vergangenen Preisbewegungen abzuleiten. Die wichtigsten Konzepte:

• **Unterstützung (Support):** Preisniveau, bei dem viele Käufer einsteigen → Boden. Fällt der Kurs darunter, ist es ein Warnsignal.
• **Widerstand (Resistance):** Preisniveau, bei dem viele verkaufen → Decke. Bricht er darüber, ist das bullisch.
• **Gleitende Durchschnitte (MA):** 50-Tage und 200-Tage MA. Kreuzt der 50-MA den 200-MA von unten = "Golden Cross" (bullisch).

TA ergänzt Fundamentalanalyse — allein ist sie unzuverlässig. Nutze sie als Werkzeug, nicht als Orakel."""

    # ── Inflation / Zinsen / Wirtschaft ───────────────────────────────────────
    if any(k in q for k in ["inflation", "zinsen", "zinserhöhung", "zentralbank", "fed", "ezb", "leitzins", "rezession", "wirtschaft"]):
        return """**Zinsen & Inflation — der Einfluss auf dein Depot**

Hohe Zinsen = schlechter für Aktien (besonders Wachstumstitel), gut für Anleihen. Warum? Mit hohen Zinsen können Anleger risikolos Geld verdienen → weniger Nachfrage nach Aktien.

Inflation schadet Anleihen (feste Zinsen werden durch Inflation entwertet), aber Aktien sind langfristig ein guter Inflationsschutz — Unternehmen können Preise erhöhen. Rohstoffe wie Gold sind klassische Inflationshedges.

**Aktuell:** Schau auf EZB und Fed-Entscheidungen. Sinkende Leitzinsen sind historisch der stärkste Katalysator für Aktienmärkte."""

    # ── Marktlage / Aktuell ───────────────────────────────────────────────────
    if any(k in q for k in ["marktlage", "markt heute", "aktuelle lage", "wie läuft", "wie steht", "stimmung"]):
        return """**Aktuelle Marktlage einschätzen**

Ich habe keinen Echtzeit-Zugriff auf heutige Nachrichten, aber folgende Quellen helfen dir bei der täglichen Einschätzung:

• **Geheimtipps-Seite** in Stockly → zeigt aktuelle Szenarien aus Weltgeschehen
• **Heatmap** → siehst sofort welche Sektoren heute stark/schwach sind
• **Signale-Seite** → technische Signale für alle deine Watchlist-Assets

Für schnellen Überblick: schau auf den DAX/S&P500-Trend. Beide Indizes zeigen die globale Börsenstimmung. Grün = Risk-on, Rot = Risk-off."""

    # ── Emotionen / Psychologie ───────────────────────────────────────────────
    if any(k in q for k in ["angst", "gier", "emotionen", "psychologie", "panik", "fomo", "gefühle"]):
        return """**Trading-Psychologie — der wichtigste Faktor**

Studies zeigen: 80% der privaten Trader verlieren langfristig Geld. Der Hauptgrund ist nicht fehlendes Wissen, sondern Emotionen.

• **FOMO (Fear of Missing Out):** "Alle kaufen, ich muss auch!" → übereilt einsteigen, oft am Hoch
• **Panikverkauf:** "Der Kurs fällt, ich muss raus!" → oft kurz vor der Erholung aussteigen
• **Bestätigungsfehler:** Wir sehen nur Informationen, die unsere Meinung bestätigen

**Die Lösung:** Regel-basiertes Trading. Definiere BEVOR du kaufst: "Ich verkaufe bei X% Verlust" und "Ich nehme Gewinne bei Y% mit." Dann halte die Regel — egal wie du dich fühlst."""

    # ── Position Sizing / Kapitaleinsatz ─────────────────────────────────────
    if any(k in q for k in ["wie viel", "wieviel", "betrag", "kapital", "position", "größe"]):
        return """**Position Sizing — wie viel in eine Aktie?**

Die wichtigste Risikomanagement-Regel: Nie alles auf eine Karte. Als Daumenregel gilt:

• **Breite ETFs:** bis zu 40–50% des Portfolios
• **Einzelaktien:** maximal 5–10% pro Position
• **Krypto/Spekulation:** maximal 5–15% gesamt

Berechne dein Risiko pro Trade: Wenn du 1.000€ investierst und Stop-Loss bei -10% setzt, riskierst du 100€. Das sollte nicht mehr als 1–2% deines Gesamtkapitals sein.

**Tipp:** Im Paper-Trading findest du deine komfortable Positionsgröße — ohne echtes Verlustrisiko. Das ist genau der Sinn dieser Übung!"""

    # ── Grüße / Smalltalk ─────────────────────────────────────────────────────
    if any(k in q for k in ["hallo", "hi ", "hey ", "guten morgen", "guten tag", "servus", "moin"]):
        return """**Hallo! Ich bin dein KI-Mentor 👋**

Ich helfe dir alles rund um Trading, Aktien und Kryptowährungen zu verstehen. Du kannst mir einfach Fragen stellen — auf Deutsch, so wie du möchtest.

Zum Beispiel:
• "Erkläre mir was RSI bedeutet"
• "Ist Bitcoin gerade ein guter Kauf?"
• "Wie baue ich ein Portfolio auf?"
• "Was sind Dividenden?"

Nutze auch die Schnellfragen-Buttons unten für schnelle Analysen zu bestimmten Assets. Worüber möchtest du heute mehr lernen?"""

    # ── Dankeschön ────────────────────────────────────────────────────────────
    if any(k in q for k in ["danke", "super", "toll", "gut erklärt", "vielen dank", "perfekt"]):
        return "Sehr gerne! 😊 Weiterlernen ist der Schlüssel — frag mich einfach wenn du mehr wissen möchtest."

    # ── Fallback mit Asset-Kontext ────────────────────────────────────────────
    if detected:
        return _FALLBACK["analyse"](name, price, rsi, trend)

    # ── Letzter generischer Fallback ─────────────────────────────────────────
    topics = ["ETFs", "Stop-Loss", "RSI", "Diversifikation", "Dividenden", "Krypto-Grundlagen", "Trading-Psychologie"]
    import random
    tip = random.choice(topics)
    return f"""**Gute Frage!**

Ich bin am besten wenn du mich zu einem konkreten Thema oder Asset fragst. Zum Beispiel:
• *"Erkläre mir {tip}"*
• *"Soll ich Tesla kaufen?"*
• *"Wie riskant ist Ethereum?"*

Du kannst auch einfach einen Aktien- oder Krypto-Namen nennen und ich analysiere ihn für dich. Tipp: mit den Schnellfragen-Buttons unten bekommst du strukturierte Analysen zu jedem Asset."""

def analyze_emotion(trade_data: dict, user) -> str:
    client = _get_client()
    if client:
        try:
            prompt = f"Kurzes Feedback (2 Sätze) zur Handelsentscheidung: {trade_data.get('action')} {trade_data.get('shares')} {trade_data.get('ticker')} bei {trade_data.get('price')}€, Emotion: {trade_data.get('emotion', '–')}"
            r = client.messages.create(model="claude-sonnet-4-6", max_tokens=150, system=SYSTEM_PROMPT, messages=[{"role":"user","content":prompt}])
            return r.content[0].text
        except Exception:
            pass
    # Fallback
    emotion = trade_data.get("emotion", "")
    if emotion == "panic": return "Panikreaktionen führen oft zu den schlechtesten Entscheidungen. Atme durch — war das wirklich deine geplante Strategie?"
    if emotion == "greed": return "Gier ist ein starkes Signal. Frage dich: Habe ich klare Gewinnziele gesetzt und halte ich mich daran?"
    if emotion == "fear":  return "Angst ist normal. Aber Angst allein ist kein Handlungssignal — prüfe ob sich die Fakten geändert haben."
    return "Gute Entscheidung — ruhig und rational zu handeln ist der wichtigste Skill im Trading."
