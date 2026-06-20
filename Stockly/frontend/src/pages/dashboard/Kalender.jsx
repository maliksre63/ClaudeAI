import { useState, useEffect } from 'react'
import api from '../../api'

const fmt = (n, d=2) => n == null ? '–' : Number(n).toLocaleString('de-DE', {minimumFractionDigits:d, maximumFractionDigits:d})

const pLbl = { fontSize:'0.58rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.18em' }

const ACTION_COLORS = {
  KAUFEN:    { bg:'rgba(6,95,46,0.18)',   border:'rgba(6,95,46,0.4)',    color:'#6ee7a0' },
  HALTEN:    { bg:'rgba(146,64,14,0.18)', border:'rgba(146,64,14,0.4)', color:'#fbbf24' },
  VERKAUFEN: { bg:'rgba(160,16,8,0.18)',  border:'rgba(160,16,8,0.4)',  color:'#f87171' },
}

function parseDate(s) {
  if (!s) return null
  const parts = s.split('-')
  if (parts.length === 3) return new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]))
  const parts2 = s.split('.')
  if (parts2.length === 3) return new Date(parseInt(parts2[2]), parseInt(parts2[1])-1, parseInt(parts2[0]))
  return null
}

function daysUntil(dateStr) {
  const d = parseDate(dateStr)
  if (!d) return null
  const diff = Math.round((d - new Date()) / (1000*60*60*24))
  return diff
}

function DateBadge({ dateStr }) {
  if (!dateStr) return <span style={{ color:'rgba(255,255,255,0.2)', fontSize:'0.74rem' }}>–</span>
  const days = daysUntil(dateStr)
  const past = days < 0
  const soon = days >= 0 && days <= 7
  const bg   = past ? 'rgba(255,255,255,0.06)' : soon ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.08)'
  const col  = past ? 'rgba(255,255,255,0.3)' : soon ? '#fbbf24' : 'rgba(255,255,255,0.7)'
  const label = past ? `vor ${Math.abs(days)} T.` : days === 0 ? 'Heute' : `in ${days} T.`
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
      <span style={{ fontSize:'0.79rem', color:col, fontWeight:600 }}>{dateStr}</span>
      <span style={{ fontSize:'0.62rem', padding:'1px 6px', borderRadius:8, background:bg, color:col, width:'fit-content' }}>{label}</span>
    </div>
  )
}

export default function Kalender() {
  const [tab,  setTab]    = useState('dividenden')
  const [data, setData]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/api/calendar')
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => { setError('Fehler beim Laden. Backend läuft?'); setLoading(false) })
  }, [])

  const dividenden = [...data]
    .filter(d => !d.is_crypto && d.div_yield_pct > 0)
    .sort((a, b) => {
      const da = parseDate(a.ex_div_date), db = parseDate(b.ex_div_date)
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return da - db
    })

  const earnings = [...data]
    .filter(d => !d.is_crypto && d.earnings_date)
    .sort((a, b) => {
      const da = parseDate(a.earnings_date), db = parseDate(b.earnings_date)
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return da - db
    })

  const tabStyle = (active) => ({
    padding:'8px 20px', borderRadius:6, cursor:'pointer', fontSize:'0.76rem', fontWeight:600,
    border:'none', fontFamily:'inherit',
    background: active ? 'rgba(107,18,32,0.5)' : 'rgba(255,255,255,0.05)',
    color: active ? '#fff' : 'rgba(255,255,255,0.4)',
    transition:'all 0.15s',
  })

  const th = { padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)',
               textAlign:'left', fontSize:'0.57rem', color:'rgba(255,255,255,0.35)',
               textTransform:'uppercase', letterSpacing:'0.12em', fontWeight:600 }
  const td = { padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)',
               fontSize:'0.82rem', color:'rgba(255,255,255,0.85)', fontVariantNumeric:'tabular-nums' }

  return (
    <div style={{ padding:'28px 32px', maxWidth:960 }}>
      <div style={{ ...pLbl, marginBottom:6 }}>Finanzkalender</div>
      <div style={{ fontSize:'1.4rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff', marginBottom:8 }}>
        Kalender
      </div>
      <div style={{ fontSize:'0.74rem', color:'rgba(255,255,255,0.35)', marginBottom:24 }}>
        Nächste Dividenden & Quartalsergebnisse deiner Watchlist-Aktien
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        <button style={tabStyle(tab==='dividenden')} onClick={()=>setTab('dividenden')}>
          💰 Dividenden
        </button>
        <button style={tabStyle(tab==='earnings')} onClick={()=>setTab('earnings')}>
          📊 Earnings
        </button>
      </div>

      {loading && (
        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.82rem', padding:'40px 0', textAlign:'center' }}>
          Lade Daten von yfinance…
        </div>
      )}
      {error && (
        <div style={{ color:'#f87171', fontSize:'0.82rem', padding:'20px 0' }}>{error}</div>
      )}

      {!loading && !error && tab === 'dividenden' && (
        dividenden.length === 0
          ? <div style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.82rem', padding:'40px 0', textAlign:'center' }}>
              Keine Aktien mit Dividenden auf deiner Watchlist.<br/>
              <span style={{ fontSize:'0.72rem' }}>Füge Dividendentitel wie AAPL, MSFT oder T hinzu.</span>
            </div>
          : <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Aktie</th>
                    <th style={{...th, textAlign:'right'}}>Div.-Rendite</th>
                    <th style={{...th, textAlign:'right'}}>Jährl. Rate</th>
                    <th style={th}>Ex-Dividenden-Datum</th>
                    <th style={th}>Sektor</th>
                  </tr>
                </thead>
                <tbody>
                  {dividenden.map(d => (
                    <tr key={d.ticker} style={{ cursor:'default' }}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={td}>
                        <div style={{ fontWeight:700, fontSize:'0.84rem' }}>{d.ticker}</div>
                        <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.4)', marginTop:2 }}>{d.name}</div>
                      </td>
                      <td style={{...td, textAlign:'right'}}>
                        <span style={{ color:'#6ee7a0', fontWeight:700 }}>{fmt(d.div_yield_pct)}%</span>
                      </td>
                      <td style={{...td, textAlign:'right'}}>
                        {d.div_rate > 0
                          ? <span>{fmt(d.div_rate)} {d.currency}</span>
                          : <span style={{ color:'rgba(255,255,255,0.2)' }}>–</span>}
                      </td>
                      <td style={td}>
                        <DateBadge dateStr={d.ex_div_date} />
                      </td>
                      <td style={{...td, color:'rgba(255,255,255,0.4)', fontSize:'0.72rem'}}>
                        {d.sector || '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}

      {!loading && !error && tab === 'earnings' && (
        earnings.length === 0
          ? <div style={{ color:'rgba(255,255,255,0.25)', fontSize:'0.82rem', padding:'40px 0', textAlign:'center' }}>
              Keine Earnings-Daten für deine Watchlist-Aktien gefunden.<br/>
              <span style={{ fontSize:'0.72rem' }}>yfinance liefert nicht für alle Aktien Earnings-Daten.</span>
            </div>
          : <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Aktie</th>
                    <th style={th}>Earnings-Datum</th>
                    <th style={{...th, textAlign:'right'}}>EPS-Schätzung</th>
                    <th style={th}>Sektor</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map(d => (
                    <tr key={d.ticker}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={td}>
                        <div style={{ fontWeight:700, fontSize:'0.84rem' }}>{d.ticker}</div>
                        <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.4)', marginTop:2 }}>{d.name}</div>
                      </td>
                      <td style={td}>
                        <DateBadge dateStr={d.earnings_date} />
                      </td>
                      <td style={{...td, textAlign:'right'}}>
                        {d.eps_estimate != null
                          ? <span style={{ color:'#a5b4fc', fontWeight:700 }}>{fmt(d.eps_estimate)} {d.currency}</span>
                          : <span style={{ color:'rgba(255,255,255,0.2)' }}>–</span>}
                      </td>
                      <td style={{...td, color:'rgba(255,255,255,0.4)', fontSize:'0.72rem'}}>
                        {d.sector || '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}

      {!loading && data.filter(d=>d.is_crypto).length > 0 && (
        <div style={{ marginTop:16, padding:'10px 14px', borderRadius:8, background:'rgba(255,255,255,0.04)',
                      border:'1px solid rgba(255,255,255,0.07)', fontSize:'0.7rem', color:'rgba(255,255,255,0.3)' }}>
          Kryptowährungen werden nicht angezeigt — Dividenden und Earnings gelten nur für Aktien.
        </div>
      )}
    </div>
  )
}
