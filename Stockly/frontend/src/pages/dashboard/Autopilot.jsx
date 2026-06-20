import { useState, useEffect } from 'react'
import api from '../../api'
import Backtesting from './Backtesting'

const pLbl = { fontSize:'0.58rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.18em' }

const ACTION_CFG = {
  KAUFEN:    { bg:'rgba(6,95,46,0.2)',    border:'rgba(6,95,46,0.4)',    color:'#6ee7a0',  label:'KAUFEN',    icon:'↑' },
  VERKAUFEN: { bg:'rgba(160,16,8,0.2)',   border:'rgba(160,16,8,0.4)',   color:'#f87171',  label:'VERKAUFEN', icon:'↓' },
  HALTEN:    { bg:'rgba(146,64,14,0.2)',  border:'rgba(146,64,14,0.4)', color:'#fbbf24',  label:'HALTEN',    icon:'→' },
  WARTEN:    { bg:'rgba(99,102,241,0.15)',border:'rgba(99,102,241,0.35)',color:'#a5b4fc',  label:'WARTEN',    icon:'⏸' },
}

const CONF_CFG = {
  hoch:   { color:'rgba(255,255,255,0.7)', dot:'#6ee7a0' },
  mittel: { color:'rgba(255,255,255,0.4)', dot:'#fbbf24' },
}

function ActionBadge({ action }) {
  const cfg = ACTION_CFG[action] || { bg:'rgba(255,255,255,0.08)', border:'rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.5)', label:action, icon:'?' }
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7,
                  background:cfg.bg, border:`1px solid ${cfg.border}` }}>
      <span style={{ fontSize:'0.8rem', fontWeight:900, color:cfg.color }}>{cfg.icon}</span>
      <span style={{ fontSize:'0.7rem', fontWeight:800, color:cfg.color, letterSpacing:'0.06em' }}>{cfg.label}</span>
    </div>
  )
}

function ConfBadge({ conf }) {
  const c = CONF_CFG[conf] || CONF_CFG.mittel
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:c.dot, flexShrink:0 }} />
      <span style={{ fontSize:'0.66rem', color:c.color }}>Konfidenz: {conf}</span>
    </div>
  )
}

export default function Autopilot() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [buying, setBuying]   = useState(null)
  const [buyMsg, setBuyMsg]   = useState({})
  const [filter, setFilter]   = useState('alle')

  const load = (force=false) => {
    setLoading(true); setError('')
    const url = force ? '/api/ai/autopilot?refresh=1' : '/api/ai/autopilot'
    api.get(url)
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => { setError('Autopilot-Daten konnten nicht geladen werden.'); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const buy = async (rec) => {
    setBuying(rec.ticker)
    try {
      await api.post('/api/trade', {
        ticker: rec.ticker, name: rec.name, asset_type: rec.ticker.endsWith('-USD') ? 'crypto' : 'stock',
        action: 'buy', shares: 1, price: rec.price,
        note: `KI-Autopilot: ${rec.reason}`,
      })
      setBuyMsg(m => ({ ...m, [rec.ticker]: 'Kauf erfolgreich!' }))
      setTimeout(() => setBuyMsg(m => { const n={...m}; delete n[rec.ticker]; return n }), 3000)
    } catch(e) {
      setBuyMsg(m => ({ ...m, [rec.ticker]: 'Fehler: ' + (e.response?.data?.detail || 'Unbekannt') }))
    }
    setBuying(null)
  }

  const recs = data?.recommendations || []
  const filtered = filter === 'alle' ? recs : recs.filter(r => r.action === filter)

  const counts = recs.reduce((acc, r) => { acc[r.action] = (acc[r.action]||0)+1; return acc }, {})

  const tabStyle = active => ({
    padding:'6px 14px', borderRadius:6, cursor:'pointer', fontSize:'0.72rem', fontWeight:600,
    border:'none', fontFamily:'inherit',
    background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
    color: active ? '#fff' : 'rgba(255,255,255,0.35)',
    transition:'all 0.15s',
  })

  const [mainTab, setMainTab] = useState('autopilot')
  const mtbtn = (active) => ({
    padding:'7px 18px', borderRadius:6, border:'none', cursor:'pointer', fontSize:'0.8rem', fontWeight:active?600:400,
    background:active?'rgba(255,255,255,0.14)':'transparent',
    color:active?'#fff':'rgba(255,255,255,0.4)', transition:'all 0.15s',
  })

  return (
    <div style={{ padding:'28px 32px', maxWidth:900 }}>
      <div style={{ ...pLbl, marginBottom:6 }}>KI-System</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:4 }}>
        <div style={{ fontSize:'1.4rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff' }}>
          KI-Autopilot
        </div>
        <button onClick={()=>load(true)} disabled={loading} style={{
          padding:'7px 16px', borderRadius:7, cursor:loading?'wait':'pointer', fontSize:'0.72rem', fontWeight:600,
          border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)',
          color:'rgba(255,255,255,0.6)', fontFamily:'inherit', transition:'all 0.15s',
        }}>
          {loading ? 'Lade…' : 'Aktualisieren'}
        </button>
      </div>

      {data?.generated_at && (
        <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.25)', marginBottom:6 }}>
          Zuletzt aktualisiert: {data.generated_at} · Basiert auf RSI, SMA und Trendanalyse
        </div>
      )}

      <div style={{ fontSize:'0.74rem', color:'rgba(255,255,255,0.35)', marginBottom:16 }}>
        Tägliche Kauf/Verkauf-Empfehlungen für deine Watchlist-Aktien — basierend auf technischer Analyse.
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:2,background:'rgba(0,0,0,0.2)',borderRadius:7,padding:3,border:'1px solid rgba(255,255,255,0.1)',width:'fit-content',marginBottom:24 }}>
        {[{id:'autopilot',label:'Autopilot'},{id:'backtesting',label:'Backtesting'}].map(t=>(
          <button key={t.id} style={mtbtn(mainTab===t.id)} onClick={()=>setMainTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {mainTab==='backtesting' && <Backtesting embedded />}

      {mainTab==='autopilot' && <>

      {loading && (
        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.82rem', padding:'40px 0', textAlign:'center' }}>
          Analysiere Watchlist…
        </div>
      )}
      {error && <div style={{ color:'#f87171', fontSize:'0.82rem' }}>{error}</div>}

      {!loading && !error && recs.length === 0 && (
        <div style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.82rem', padding:'40px 0', textAlign:'center' }}>
          Keine Aktien auf der Watchlist.<br/>
          <span style={{ fontSize:'0.72rem' }}>Füge Aktien zur Watchlist hinzu, um Empfehlungen zu erhalten.</span>
        </div>
      )}

      {!loading && recs.length > 0 && (
        <>
          {/* Summary badges */}
          <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
            {[
              { label:`${counts.KAUFEN||0} Kaufen`,    bg:'rgba(6,95,46,0.15)',   color:'#6ee7a0' },
              { label:`${counts.VERKAUFEN||0} Verkaufen`, bg:'rgba(160,16,8,0.15)', color:'#f87171' },
              { label:`${counts.HALTEN||0} Halten`,    bg:'rgba(146,64,14,0.15)', color:'#fbbf24' },
              { label:`${counts.WARTEN||0} Warten`,    bg:'rgba(99,102,241,0.12)', color:'#a5b4fc' },
            ].map(b => (
              <div key={b.label} style={{ padding:'6px 14px', borderRadius:20, background:b.bg, fontSize:'0.72rem', fontWeight:700, color:b.color }}>
                {b.label}
              </div>
            ))}
          </div>

          {/* Filter */}
          <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.04)', borderRadius:7, padding:4, marginBottom:20, width:'fit-content' }}>
            {['alle','KAUFEN','VERKAUFEN','HALTEN','WARTEN'].map(f => (
              <button key={f} style={tabStyle(filter===f)} onClick={()=>setFilter(f)}>
                {f==='alle' ? 'Alle' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Recommendation Cards */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {filtered.map(rec => {
              const ac = ACTION_CFG[rec.action] || ACTION_CFG.HALTEN
              return (
                <div key={rec.ticker} style={{
                  background:'rgba(255,255,255,0.04)', border:`1px solid ${ac.border}`,
                  borderRadius:12, padding:'18px 20px',
                  display:'grid', gridTemplateColumns:'1fr auto', gap:16, alignItems:'center',
                }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                      <ActionBadge action={rec.action} />
                      <div>
                        <span style={{ fontWeight:700, fontSize:'0.88rem', color:'rgba(255,255,255,0.9)' }}>{rec.ticker}</span>
                        <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)', marginLeft:8 }}>{rec.name}</span>
                      </div>
                      <ConfBadge conf={rec.confidence} />
                    </div>

                    <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.6)', marginBottom:10, lineHeight:1.55 }}>
                      {rec.reason}
                    </div>

                    <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                      {[
                        ['Kurs', `${Number(rec.price).toLocaleString('de-DE', {minimumFractionDigits:2})} $`],
                        ['RSI', rec.rsi, rec.rsi < 35 ? '#6ee7a0' : rec.rsi > 65 ? '#f87171' : 'rgba(255,255,255,0.6)'],
                        ['Trend', rec.trend, rec.trend==='Aufwärts' ? '#6ee7a0' : rec.trend==='Abwärts' ? '#f87171' : 'rgba(255,255,255,0.5)'],
                        ['5-Tage', `${rec.perf_5d > 0 ? '+' : ''}${Number(rec.perf_5d).toFixed(2)}%`, rec.perf_5d > 0 ? '#6ee7a0' : '#f87171'],
                      ].map(([lbl, val, col='rgba(255,255,255,0.65)']) => (
                        <div key={lbl}>
                          <div style={{ fontSize:'0.58rem', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:2 }}>{lbl}</div>
                          <div style={{ fontSize:'0.8rem', fontWeight:600, color:col }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {buyMsg[rec.ticker] && (
                      <div style={{ marginTop:8, fontSize:'0.72rem', color: buyMsg[rec.ticker].includes('Fehler') ? '#f87171' : '#6ee7a0', fontWeight:600 }}>
                        {buyMsg[rec.ticker]}
                      </div>
                    )}
                  </div>

                  {/* 1-Click Buy */}
                  {rec.action === 'KAUFEN' && (
                    <button
                      onClick={() => buy(rec)}
                      disabled={buying === rec.ticker}
                      style={{
                        padding:'10px 18px', borderRadius:8, cursor:buying===rec.ticker?'wait':'pointer',
                        fontWeight:700, fontSize:'0.78rem', border:'none', fontFamily:'inherit',
                        background: buying===rec.ticker ? 'rgba(255,255,255,0.08)' : 'rgba(6,95,46,0.4)',
                        color: buying===rec.ticker ? 'rgba(255,255,255,0.3)' : '#6ee7a0',
                        transition:'all 0.15s', whiteSpace:'nowrap',
                      }}>
                      {buying===rec.ticker ? 'Kaufe…' : '1 Stk. kaufen'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ marginTop:20, padding:'12px 16px', borderRadius:8,
                        background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
                        fontSize:'0.68rem', color:'rgba(255,255,255,0.25)', lineHeight:1.6 }}>
            Dies sind automatisch generierte technische Signale — keine Anlageberatung. Die Analyse basiert auf
            RSI-Werten und gleitenden Durchschnitten der letzten 3 Monate. Empfehlungen werden alle 30 Minuten aktualisiert.
          </div>
        </>
      )}
    </>} 
  </div>
  )
}
