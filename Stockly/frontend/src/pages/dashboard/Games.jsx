import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../AuthContext'
import api from '../../api'

const card = { background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:'24px 28px' }
const btn  = (active, color='var(--acc)') => ({
  padding:'11px 22px', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:'0.84rem', border:'none',
  background: active ? color : 'var(--s2)', color: active ? '#fff' : 'var(--txt2)', transition:'all 0.15s',
})

// ── Quiz Question Pool ─────────────────────────────────────────────────────────
const QUESTIONS = [
  { q:"Was bedeutet ein RSI-Wert unter 30?", options:["Überverkauft — mögliches Kaufsignal","Überkauft — Verkaufssignal","Neutraler Trend","Stabile Seitwärtsbewegung"], correct:0, tip:"RSI < 30 = überverkauft. Das 'Gummiband' ist zu weit gezogen — oft folgt eine Erholung." },
  { q:"Was ist ein ETF?", options:["Korb aus vielen Aktien, börsengehandelt","Eine einzelne Aktie eines Großkonzerns","Ein bankinterner Sparplan","Eine neue Kryptowährung"], correct:0, tip:"ETF = Exchange Traded Fund. Bündelt Hunderte Aktien in einem Produkt — perfekt für Diversifikation." },
  { q:"MACD liegt über der Signallinie — was bedeutet das?", options:["Bullishes Signal (Aufwärtstrend)","Bearishes Signal (Abwärtstrend)","Kein erkennbarer Trend","Starke Überbewertung"], correct:0, tip:"MACD über Signallinie: kurzfristiger MA > langfristiger MA → Momentum zeigt nach oben." },
  { q:"Was ist Diversifikation?", options:["Kapital auf viele verschiedene Assets verteilen","Alles in die beste Aktie investieren","Täglich kaufen und verkaufen","Nur in Krypto investieren"], correct:0, tip:"Diversifikation = nie alle Eier in einen Korb. Verschiedene Assets reduzieren das Gesamtrisiko." },
  { q:"KGV = 10 bedeutet …", options:["Du zahlst 10€ für 1€ Jahresgewinn","Die Aktie ist 10× teurer als letztes Jahr","Der Gewinn wächst 10% pro Jahr","Der Kurs schwankt täglich 10%"], correct:0, tip:"KGV = Kurs ÷ Gewinn je Aktie. KGV 10 gilt als fair-günstig (Faustregel: < 15 oft ok)." },
  { q:"Was ist ein Stop-Loss?", options:["Automatischer Verkauf bei Unterschreitung einer Schwelle","Kaufstopp wenn der Kurs zu hoch ist","Benachrichtigung bei Verlust","Position wird eingefroren"], correct:0, tip:"Stop-Loss = automatischer Verkaufsauftrag — schützt vor unkontrollierten Verlusten." },
  { q:"Was bedeutet FOMO im Trading?", options:["Fear Of Missing Out — Angst einen Kursanstieg zu verpassen","Ein technischer Indikator","Eine Handelsplattform","Fondsverwaltungs-Akronym"], correct:0, tip:"FOMO verleitet zu impulsiven Käufen auf dem Höchstkurs — einer der häufigsten Fehler." },
  { q:"Der S&P 500 umfasst …", options:["500 größte US-Unternehmen","500 europäische Anleihen","500 Kryptowährungen","Den DAX mit 500 Titeln"], correct:0, tip:"S&P 500 = wichtigster Aktienindex der Welt mit den 500 größten US-Firmen." },
  { q:"Volatilität bedeutet …", options:["Stärke der Kursschwankungen","Tägliches Handelsvolumen","Dividendenrendite","Marktkapitalisierung"], correct:0, tip:"Hohe Volatilität = starke Schwankungen (= Risiko UND Chance). Bitcoin > DAX-Aktien." },
  { q:"Was ist der gleitende Durchschnitt (MA20)?", options:["Durchschnittskurs der letzten 20 Tage","Tägliche Preisänderung in %","Anzahl gehandelter Aktien","Marktkapitalisierung im Zeitverlauf"], correct:0, tip:"MA20 glättet Kursschwankungen und zeigt den Trend der letzten 20 Handelstage." },
  { q:"Was ist eine Dividende?", options:["Gewinnausschüttung an Aktionäre","Zinszahlung auf Anleihen","Handelsgebühr der Börse","Steuer auf Kursgewinne"], correct:0, tip:"Dividende = Teil des Unternehmensgewinns der an Aktionäre ausgezahlt wird (meist jährlich)." },
  { q:"Was ist 'Long gehen'?", options:["Aktie kaufen in Erwartung steigender Kurse","Aktie langfristig halten","Aktie leerverkaufen","In Langläufer-Anleihen investieren"], correct:0, tip:"Long = du kaufst und profitierst von steigenden Kursen. Short = du wettest auf fallende Kurse." },
  { q:"Was ist Marktkapitalisierung?", options:["Aktienkurs × Anzahl aller Aktien","Tägliches Handelsvolumen","Jahresgewinn des Unternehmens","Anzahl der Aktionäre"], correct:0, tip:"Apple: ~3 Billionen $ Marktkapitalisierung = Kurs × alle ausgegebenen Aktien." },
  { q:"Was ist der DAX?", options:["Index der 40 größten deutschen Unternehmen","Alle deutschen Aktien","Deutsche Anleihen-Benchmark","Krypto-Token der Bundesbank"], correct:0, tip:"DAX = Deutschlands wichtigster Aktienindex: SAP, Allianz, BASF, BMW, Volkswagen u.a." },
  { q:"Was zeigt ein hohes Handelsvolumen bei einem Kursanstieg?", options:["Starkes, bestätigtes Kaufsignal","Überbewertung der Aktie","Bald fallender Kurs","Geringe Marktliquidität"], correct:0, tip:"Volumen bestätigt den Trend. Anstieg + hohes Volumen = viele Käufer → bullish." },
  { q:"2% Inflation pro Jahr bedeutet für Investoren …", options:["Geld verliert Kaufkraft — Rendite muss Inflation übertreffen","Aktien steigen automatisch um 2%","Zinsen auf Sparkonten steigen","Keine Relevanz für Aktienmärkte"], correct:0, tip:"Historisch erzielen Aktien 7-10% p.a. — damit schlagen sie die Inflation deutlich." },
  { q:"Was ist Rebalancing?", options:["Wiederherstellung der ursprünglichen Portfolio-Gewichtung","Kauf bei fallendem Kurs","Tägliches Umschichten","Verkauf aller schlechten Positionen"], correct:0, tip:"Portfolio zielt auf 60% Aktien. Durch Kurssteigerungen auf 75% → verkaufe etwas, kaufe Anleihen/ETF." },
  { q:"Was ist ein Trailing Stop-Loss?", options:["Stop-Loss der dem Kurs nach oben folgt","Fixer Stop-Loss beim Kaufpreis","Mehrere Stop-Loss gleichzeitig","Automatisches Nachkaufen nach Verlust"], correct:0, tip:"Kurs steigt auf 200€ → Stop-Loss rutscht von 135€ auf 180€ nach. Sichert Gewinne." },
  { q:"Aktie vs. Anleihe — was stimmt?", options:["Aktie = Eigenkapital (Risiko/Chance), Anleihe = Fremdkapital (feste Zinsen)","Aktien sind sicherer als Anleihen","Anleihen werden nur von Banken ausgegeben","Kein wesentlicher Unterschied"], correct:0, tip:"Aktionär = Miteigentümer. Anleihegläubiger = Kreditgeber. Höheres Risiko, aber mehr Renditepotenzial." },
  { q:"Was ist ein 'Bärenmarkt'?", options:["Kursrückgang von mind. 20% vom Hochpunkt","Seitwärtsbewegung ohne klaren Trend","Kursanstieg von mehr als 20%","Markt mit wenigen Teilnehmern"], correct:0, tip:"Bärenmarkt = -20% vom Hoch. Gegenteil: 'Bullenmarkt' = Kursanstieg von mind. +20%." },
]

// ── RSI Scenarios ─────────────────────────────────────────────────────────────
const RSI_SCENARIOS = [
  { stock:"Apple (AAPL)", rsi:22, chg5d:"-8.2%", correct:"KAUFEN", explain:"RSI 22 = stark überverkauft. Klassisches Kaufsignal bei so niedrigem RSI." },
  { stock:"Tesla (TSLA)", rsi:84, chg5d:"+15.7%", correct:"VERKAUFEN", explain:"RSI 84 = stark überkauft. Nach so einem Anstieg ist ein Rücksetzer wahrscheinlich." },
  { stock:"NVIDIA (NVDA)", rsi:51, chg5d:"+1.3%", correct:"HALTEN", explain:"RSI 51 = neutrales Territorium. Kein klares Signal — abwarten und beobachten." },
  { stock:"Bitcoin (BTC)", rsi:29, chg5d:"-11.4%", correct:"KAUFEN", explain:"RSI unter 30 = überverkauft. Historisch oft ein guter Einstiegspunkt." },
  { stock:"SAP (SAP.DE)", rsi:68, chg5d:"+6.1%", correct:"HALTEN", explain:"RSI 68 = leicht erhöht aber noch nicht überkauft (> 70). Trend intakt, aber vorsichtig." },
  { stock:"Ethereum (ETH)", rsi:76, chg5d:"+18.9%", correct:"VERKAUFEN", explain:"RSI 76 = überkauft. Gewinnmitnahmen wahrscheinlich. Stop-Loss setzen." },
  { stock:"Allianz (ALV.DE)", rsi:44, chg5d:"-2.8%", correct:"HALTEN", explain:"RSI 44 = neutral. Leichter Rückgang, aber kein klares Kaufsignal. Abwarten." },
  { stock:"Microsoft (MSFT)", rsi:18, chg5d:"-12.1%", correct:"KAUFEN", explain:"RSI 18 = extrem überverkauft! Seltenes Niveau — oft starkes Reversal-Signal." },
  { stock:"DAX ETF", rsi:73, chg5d:"+9.4%", correct:"VERKAUFEN", explain:"RSI 73 = überkauft. Index nach starkem Anstieg — Rücksetzer-Risiko steigt." },
  { stock:"Solana (SOL)", rsi:38, chg5d:"-5.1%", correct:"HALTEN", explain:"RSI 38 = neutral bis schwach. Nicht überverkauft genug für klares Kaufsignal." },
]

function shuffle(arr) {
  const a = [...arr]; for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a
}

// ── Quiz Game ──────────────────────────────────────────────────────────────────
function QuizGame({ onDone }) {
  const questions = shuffle(QUESTIONS).slice(0, 10)
  const [idx, setIdx]             = useState(0)
  const [selected, setSelected]   = useState(null)
  const [revealed, setRevealed]   = useState(false)
  const [score, setScore]         = useState(0)
  const [timeLeft, setTimeLeft]   = useState(20)
  const [done, setDone]           = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (done || revealed) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); setRevealed(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [idx, done, revealed])

  const pick = (i) => {
    if (revealed) return
    clearInterval(timerRef.current)
    setSelected(i)
    setRevealed(true)
    if (i === questions[idx].correct) setScore(s => s + 15)
  }

  const next = () => {
    if (idx >= questions.length - 1) { setDone(true); onDone(score + (selected===questions[idx].correct?15:0)) }
    else { setIdx(i=>i+1); setSelected(null); setRevealed(false); setTimeLeft(20) }
  }

  if (done) return null
  const q = questions[idx]
  const finalScore = score + (revealed && selected===q.correct ? 15 : 0)

  return (
    <div>
      {/* Progress */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ fontSize:'0.72rem', color:'var(--txt2)' }}>Frage {idx+1} / {questions.length}</div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--green)' }}>+{score} XP</div>
          <div style={{ fontSize:'0.82rem', fontWeight:600, color:timeLeft<=5?'var(--red)':'var(--txt2)', minWidth:28, textAlign:'right' }}>{timeLeft}s</div>
        </div>
      </div>
      <div style={{ height:4, background:'rgba(255,255,255,0.08)', borderRadius:2, marginBottom:28 }}>
        <div style={{ height:'100%', width:`${(timeLeft/20)*100}%`, background:timeLeft<=5?'var(--red)':'var(--acc)', borderRadius:2, transition:'width 1s linear' }}/>
      </div>

      {/* Question */}
      <div style={{ fontSize:'1.05rem', fontWeight:600, color:'var(--txt)', marginBottom:22, lineHeight:1.5 }}>{q.q}</div>

      {/* Options */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
        {q.options.map((opt, i) => {
          let bg = 'var(--s2)', border = 'var(--border)', color = 'var(--txt)'
          if (revealed) {
            if (i === q.correct) { bg = 'rgba(6,95,46,0.18)'; border = 'var(--green)'; color = 'var(--green)' }
            else if (i === selected && i !== q.correct) { bg = 'rgba(160,16,8,0.18)'; border = 'var(--red)'; color = 'var(--red)' }
          } else if (selected === i) { bg = 'var(--acc-l)'; border = 'var(--acc)' }
          return (
            <button key={i} onClick={() => pick(i)} style={{
              textAlign:'left', padding:'12px 16px', borderRadius:8, cursor: revealed?'default':'pointer',
              background: bg, border:`1.5px solid ${border}`, color, fontSize:'0.84rem', fontWeight:500,
              transition:'all 0.15s',
            }}>
              {revealed && i===q.correct ? '✓ ' : revealed && i===selected && i!==q.correct ? '✗ ' : ''}
              {opt}
            </button>
          )
        })}
      </div>

      {/* Explanation */}
      {revealed && (
        <div style={{ background:'rgba(61,10,20,0.25)', border:'1px solid rgba(61,10,20,0.3)', borderRadius:8, padding:'12px 16px', marginBottom:20, fontSize:'0.8rem', color:'var(--s1)', lineHeight:1.6 }}>
          💡 {q.tip}
        </div>
      )}

      {revealed && (
        <button onClick={next} style={{ ...btn(true), width:'100%', padding:14 }}>
          {idx < questions.length - 1 ? 'Nächste Frage →' : 'Ergebnis anzeigen →'}
        </button>
      )}
    </div>
  )
}

// ── RSI Trainer Game ───────────────────────────────────────────────────────────
function RSIGame({ onDone }) {
  const rounds = shuffle(RSI_SCENARIOS).slice(0, 7)
  const [idx, setIdx]           = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore]       = useState(0)
  const [done, setDone]         = useState(false)

  const pick = (answer) => {
    if (revealed) return
    setSelected(answer)
    setRevealed(true)
    if (answer === rounds[idx].correct) setScore(s => s + 15)
  }

  const next = () => {
    if (idx >= rounds.length - 1) { setDone(true); onDone(score + (selected===rounds[idx].correct?15:0)) }
    else { setIdx(i=>i+1); setSelected(null); setRevealed(false) }
  }

  if (done) return null
  const r = rounds[idx]
  const rsiColor = r.rsi < 30 ? 'var(--green)' : r.rsi > 70 ? 'var(--red)' : 'var(--txt2)'

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div style={{ fontSize:'0.72rem', color:'var(--txt2)' }}>Runde {idx+1} / {rounds.length}</div>
        <div style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--green)' }}>+{score} XP</div>
      </div>

      {/* Stock card */}
      <div style={{ ...card, marginBottom:24, textAlign:'center', background:'var(--s2)' }}>
        <div style={{ fontSize:'1.1rem', fontWeight:600, color:'var(--txt)', marginBottom:16 }}>{r.stock}</div>
        <div style={{ display:'flex', justifyContent:'center', gap:32, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:'0.58rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:4 }}>RSI (14)</div>
            <div style={{ fontSize:'2.2rem', fontWeight:700, color:rsiColor, fontVariantNumeric:'tabular-nums', lineHeight:1 }}>{r.rsi}</div>
            <div style={{ fontSize:'0.68rem', color:rsiColor, marginTop:4 }}>
              {r.rsi < 30 ? 'Überverkauft' : r.rsi > 70 ? 'Überkauft' : 'Neutral'}
            </div>
          </div>
          <div>
            <div style={{ fontSize:'0.58rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:4 }}>5-Tage</div>
            <div style={{ fontSize:'2.2rem', fontWeight:700, color:r.chg5d.startsWith('-')?'var(--red)':'var(--green)', fontVariantNumeric:'tabular-nums', lineHeight:1 }}>{r.chg5d}</div>
          </div>
        </div>
      </div>

      <div style={{ fontSize:'0.82rem', color:'var(--txt2)', marginBottom:16, textAlign:'center' }}>
        Wie lautet das KI-Signal basierend auf diesen Daten?
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        {['KAUFEN','HALTEN','VERKAUFEN'].map(opt => {
          const isCorrect = opt === r.correct
          const isSelected = opt === selected
          let bg = 'var(--s2)', border = 'var(--border)', color = 'var(--txt2)'
          if (revealed) {
            if (isCorrect) { bg = 'rgba(6,95,46,0.2)'; border = 'var(--green)'; color = 'var(--green)' }
            else if (isSelected) { bg = 'rgba(160,16,8,0.2)'; border = 'var(--red)'; color = 'var(--red)' }
          } else if (isSelected) { bg = 'var(--acc-l)'; border = 'var(--acc)'; color = 'var(--txt)' }
          const accent = opt==='KAUFEN'?'var(--green)':opt==='VERKAUFEN'?'var(--red)':'var(--txt2)'
          return (
            <button key={opt} onClick={()=>pick(opt)} style={{
              flex:1, padding:'14px 8px', borderRadius:9, cursor:revealed?'default':'pointer',
              background:bg, border:`1.5px solid ${revealed?(isCorrect?'var(--green)':isSelected?'var(--red)':'var(--border)'):border}`,
              color:revealed?(isCorrect?'var(--green)':isSelected?'var(--red)':'var(--txt3)'):(isSelected?'var(--txt)':accent),
              fontWeight:700, fontSize:'0.82rem', letterSpacing:'0.04em',
              transition:'all 0.15s',
            }}>{opt}</button>
          )
        })}
      </div>

      {revealed && (
        <div style={{ background:'rgba(61,10,20,0.25)', border:'1px solid rgba(61,10,20,0.3)', borderRadius:8, padding:'12px 16px', marginBottom:20, fontSize:'0.8rem', color:'var(--s1)', lineHeight:1.6 }}>
          💡 {r.explain}
        </div>
      )}
      {revealed && (
        <button onClick={next} style={{ ...btn(true), width:'100%', padding:14 }}>
          {idx < rounds.length - 1 ? 'Nächste Runde →' : 'Ergebnis anzeigen →'}
        </button>
      )}
    </div>
  )
}

// ── Price Guesser Game ─────────────────────────────────────────────────────────
function PriceGame({ onDone }) {
  const [assets, setAssets]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [idx, setIdx]           = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore]       = useState(0)
  const [done, setDone]         = useState(false)

  useEffect(() => {
    api.get('/api/heatmap').then(r => {
      const valid = r.data.filter(a => a.price && a.price > 0)
      const picked = shuffle(valid).slice(0, 5)
      const rounds = picked.map(a => {
        const real = a.price
        const factor = real > 500 ? 0.12 : real > 50 ? 0.18 : 0.25
        const decoys = []
        while (decoys.length < 3) {
          const pct = (Math.random() * 2 - 1) * factor
          const d = parseFloat((real * (1 + pct)).toFixed(real > 10 ? 2 : 4))
          if (Math.abs(d - real) / real > 0.04 && !decoys.includes(d)) decoys.push(d)
        }
        const all = shuffle([real, ...decoys])
        return { ...a, options: all, correct: all.indexOf(real) }
      })
      setAssets(rounds)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const pick = (i) => {
    if (revealed) return
    setSelected(i)
    setRevealed(true)
    if (i === assets[idx].correct) setScore(s => s + 20)
  }

  const next = () => {
    if (idx >= assets.length - 1) { setDone(true); onDone(score + (selected===assets[idx].correct?20:0)) }
    else { setIdx(i=>i+1); setSelected(null); setRevealed(false) }
  }

  if (loading) return <div style={{ textAlign:'center', padding:48, color:'var(--txt2)', fontSize:'0.82rem' }}>Lade Live-Kurse …</div>
  if (!assets.length) return <div style={{ textAlign:'center', padding:48, color:'var(--txt2)', fontSize:'0.82rem' }}>Keine Daten verfügbar — Backend verbunden?</div>
  if (done) return null

  const a = assets[idx]
  const fmt2 = n => Number(n).toLocaleString('de-DE', { minimumFractionDigits:2, maximumFractionDigits:n > 10 ? 2 : 4 })

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div style={{ fontSize:'0.72rem', color:'var(--txt2)' }}>Runde {idx+1} / {assets.length}</div>
        <div style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--green)' }}>+{score} XP</div>
      </div>

      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ fontSize:'0.58rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.18em', marginBottom:8 }}>{a.type}</div>
        <div style={{ fontSize:'1.6rem', fontWeight:700, color:'var(--txt)', marginBottom:4 }}>{a.name}</div>
        <div style={{ fontSize:'0.78rem', fontFamily:'monospace', color:'var(--acc)', fontWeight:700 }}>{a.ticker}</div>
      </div>

      <div style={{ fontSize:'0.82rem', color:'var(--txt2)', textAlign:'center', marginBottom:16 }}>
        Was ist der aktuelle Kurs in Euro?
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
        {a.options.map((price, i) => {
          const isCorrect = i === a.correct
          const isSelected = i === selected
          let bg = 'var(--s2)', border = 'var(--border)', color = 'var(--txt)'
          if (revealed) {
            if (isCorrect) { bg = 'rgba(6,95,46,0.2)'; border = 'var(--green)'; color = 'var(--green)' }
            else if (isSelected) { bg = 'rgba(160,16,8,0.2)'; border = 'var(--red)'; color = 'var(--red)' }
          }
          return (
            <button key={i} onClick={()=>pick(i)} style={{
              padding:'18px 12px', borderRadius:10, cursor:revealed?'default':'pointer',
              background:bg, border:`1.5px solid ${border}`, color,
              fontSize:'1.05rem', fontWeight:700, fontVariantNumeric:'tabular-nums',
              transition:'all 0.15s',
            }}>
              {revealed && isCorrect ? '✓ ' : revealed && isSelected ? '✗ ' : ''}
              {fmt2(price)} €
            </button>
          )
        })}
      </div>

      {revealed && (
        <div style={{ background:'rgba(61,10,20,0.25)', border:'1px solid rgba(61,10,20,0.3)', borderRadius:8, padding:'12px 16px', marginBottom:20, fontSize:'0.8rem', color:'var(--s1)', lineHeight:1.6 }}>
          {selected===a.correct ? '🎯 Richtig!' : `Leider falsch.`} Der aktuelle Kurs von {a.name} beträgt {fmt2(a.options[a.correct])} €.
        </div>
      )}
      {revealed && (
        <button onClick={next} style={{ ...btn(true), width:'100%', padding:14 }}>
          {idx < assets.length - 1 ? 'Nächste Runde →' : 'Ergebnis anzeigen →'}
        </button>
      )}
    </div>
  )
}

// ── Result Screen ──────────────────────────────────────────────────────────────
function ResultScreen({ xp, gameName, onBack, onRetry }) {
  const { refreshUser } = useAuth()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (xp > 0) {
      api.post('/api/game/xp', { amount: xp, reason: gameName })
        .then(() => refreshUser())
        .catch(() => {})
        .finally(() => setSaved(true))
    } else {
      setSaved(true)
    }
  }, [])

  return (
    <div style={{ textAlign:'center', padding:'16px 0' }}>
      <div style={{ fontSize:'3.5rem', marginBottom:16 }}>{xp >= 100 ? '🏆' : xp >= 60 ? '🎯' : xp > 0 ? '👍' : '😅'}</div>
      <div style={{ fontSize:'1.4rem', fontWeight:700, color:'var(--txt)', marginBottom:8 }}>
        {xp >= 100 ? 'Perfekt!' : xp >= 60 ? 'Sehr gut!' : xp > 0 ? 'Gut gemacht!' : 'Nächstes Mal besser!'}
      </div>
      <div style={{ fontSize:'0.9rem', color:'var(--txt2)', marginBottom:24 }}>
        {gameName} abgeschlossen
      </div>
      {xp > 0 && (
        <div style={{ display:'inline-flex', alignItems:'center', gap:10, background:'rgba(6,95,46,0.15)', border:'1.5px solid var(--green)', borderRadius:12, padding:'16px 28px', marginBottom:28 }}>
          <span style={{ fontSize:'1.1rem' }}>⚡</span>
          <span style={{ fontSize:'1.6rem', fontWeight:800, color:'var(--green)', fontVariantNumeric:'tabular-nums' }}>+{xp} XP</span>
          <span style={{ fontSize:'0.76rem', color:'var(--green)', opacity:0.7 }}>verdient</span>
        </div>
      )}
      {!saved && <div style={{ fontSize:'0.72rem', color:'var(--txt3)', marginBottom:20 }}>Speichere XP …</div>}
      <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
        <button onClick={onRetry} style={{ ...btn(false), border:'1.5px solid var(--border)' }}>Nochmal spielen</button>
        <button onClick={onBack} style={{ ...btn(true) }}>Andere Spiele</button>
      </div>
    </div>
  )
}

// ── Main Games Page ────────────────────────────────────────────────────────────
const GAMES = [
  {
    id: 'quiz',
    icon: '🧠',
    title: 'Trading-Quiz',
    desc: '10 Fragen aus dem Bereich Aktien, Krypto & Indikatoren',
    xpMax: 150,
    difficulty: 'Mittel',
    rounds: '10 Fragen',
  },
  {
    id: 'rsi',
    icon: '📊',
    title: 'RSI-Trainer',
    desc: 'Erkenne den richtigen Handelssignal anhand des RSI-Werts',
    xpMax: 105,
    difficulty: 'Leicht',
    rounds: '7 Runden',
  },
  {
    id: 'price',
    icon: '🎯',
    title: 'Kurs-Schätzer',
    desc: 'Rate den aktuellen Börsenkurs — mit echten Live-Daten',
    xpMax: 100,
    difficulty: 'Schwer',
    rounds: '5 Runden',
  },
]

export default function Games() {
  const { user } = useAuth()
  const [gameId, setGameId]       = useState(null)
  const [gameState, setGameState] = useState('select') // 'select' | 'playing' | 'result'
  const [earnedXP, setEarnedXP]  = useState(0)
  const [gameKey, setGameKey]     = useState(0)

  const startGame = (id) => { setGameId(id); setGameState('playing'); setEarnedXP(0) }
  const finishGame = (xp) => { setEarnedXP(xp); setGameState('result') }
  const backToSelect = () => { setGameId(null); setGameState('select') }
  const retry = () => { setGameKey(k=>k+1); setGameState('playing'); setEarnedXP(0) }

  const currentGame = GAMES.find(g => g.id === gameId)

  return (
    <div style={{ padding:'28px 32px', minHeight:'100%' }}>
      {/* Header */}
      <div style={{ marginBottom:32 }}>
        <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:6 }}>Gamification</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12 }}>
          <div style={{ fontSize:'1.4rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff' }}>Spiele & XP</div>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 16px' }}>
            <span style={{ fontSize:'0.72rem', color:'var(--txt2)' }}>Gesamt-XP</span>
            <span style={{ fontSize:'0.92rem', fontWeight:700, color:'var(--green)', fontVariantNumeric:'tabular-nums' }}>⚡ {(user?.xp || 0).toLocaleString('de-DE')}</span>
          </div>
        </div>
      </div>

      {/* Game selection */}
      {gameState === 'select' && (
        <>
          <div style={{ fontSize:'0.75rem', color:'var(--txt2)', marginBottom:20, lineHeight:1.6 }}>
            Verdiene XP durch Mini-Spiele und steige im Level auf. Die XP werden sofort deinem Account gutgeschrieben.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
            {GAMES.map(g => (
              <div key={g.id} onClick={() => startGame(g.id)} style={{
                ...card, cursor:'pointer', transition:'transform 0.18s, box-shadow 0.18s',
                display:'flex', flexDirection:'column', gap:0,
              }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 12px 32px rgba(61,10,20,0.22)'}}
                onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}
              >
                <div style={{ fontSize:'2.4rem', marginBottom:12 }}>{g.icon}</div>
                <div style={{ fontSize:'1.05rem', fontWeight:700, color:'var(--txt)', marginBottom:6 }}>{g.title}</div>
                <div style={{ fontSize:'0.78rem', color:'var(--txt2)', lineHeight:1.5, marginBottom:18, flex:1 }}>{g.desc}</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontSize:'0.62rem', fontWeight:600, padding:'3px 10px', borderRadius:20, background:'rgba(6,95,46,0.15)', color:'var(--green)', letterSpacing:'0.06em' }}>
                    ⚡ bis {g.xpMax} XP
                  </span>
                  <span style={{ fontSize:'0.62rem', fontWeight:600, padding:'3px 10px', borderRadius:20, background:'rgba(255,255,255,0.07)', color:'var(--txt2)', letterSpacing:'0.06em' }}>
                    {g.rounds}
                  </span>
                  <span style={{ fontSize:'0.62rem', fontWeight:600, padding:'3px 10px', borderRadius:20, background:'rgba(255,255,255,0.07)', color:'var(--txt2)', letterSpacing:'0.06em' }}>
                    {g.difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Daily tip */}
          <div style={{ ...card, marginTop:24, display:'flex', gap:16, alignItems:'flex-start', background:'rgba(61,10,20,0.4)' }}>
            <div style={{ fontSize:'1.4rem' }}>💡</div>
            <div>
              <div style={{ fontSize:'0.78rem', fontWeight:600, color:'rgba(255,255,255,0.95)', marginBottom:4 }}>Tipp des Tages</div>
              <div style={{ fontSize:'0.76rem', color:'rgba(255,255,255,0.7)', lineHeight:1.6 }}>
                Spiele täglich alle 3 Spiele um bis zu <strong style={{ color:'#6ee7a0' }}>355 XP</strong> pro Tag zu sammeln.
                Je mehr XP, desto höher dein Level und desto mehr Features werden freigeschaltet.
              </div>
            </div>
          </div>
        </>
      )}

      {/* Game canvas */}
      {gameState === 'playing' && currentGame && (
        <div style={{ maxWidth:640, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
            <button onClick={backToSelect} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.5)', padding:'6px 14px', borderRadius:6, cursor:'pointer', fontSize:'0.72rem' }}>
              ← Zurück
            </button>
            <div style={{ fontSize:'1rem', fontWeight:600, color:'var(--txt)' }}>
              {currentGame.icon} {currentGame.title}
            </div>
          </div>
          <div style={card}>
            {gameId === 'quiz'  && <QuizGame  key={gameKey} onDone={finishGame} />}
            {gameId === 'rsi'   && <RSIGame   key={gameKey} onDone={finishGame} />}
            {gameId === 'price' && <PriceGame key={gameKey} onDone={finishGame} />}
          </div>
        </div>
      )}

      {/* Result */}
      {gameState === 'result' && currentGame && (
        <div style={{ maxWidth:480, margin:'0 auto' }}>
          <div style={card}>
            <ResultScreen xp={earnedXP} gameName={currentGame.title} onBack={backToSelect} onRetry={retry} />
          </div>
        </div>
      )}
    </div>
  )
}
