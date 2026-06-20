import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import api from '../../api'

const pLbl = { fontSize:'0.58rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.18em' }
const inp  = {
  width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
  borderRadius:7, padding:'10px 14px', fontSize:'0.84rem', color:'rgba(255,255,255,0.9)',
  outline:'none', fontFamily:'inherit',
}
const lbl = { fontSize:'0.62rem', color:'rgba(255,255,255,0.4)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6, display:'block', fontWeight:600 }

const fmt = (n, d=2) => n == null ? '–' : Number(n).toLocaleString('de-DE', {minimumFractionDigits:d, maximumFractionDigits:d})

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#1a0408', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'8px 12px', fontSize:'0.72rem' }}>
      <div style={{ color:'rgba(255,255,255,0.4)', marginBottom:3 }}>{label}</div>
      <div style={{ color:'#a5b4fc', fontWeight:700 }}>{fmt(payload[0].value)} €</div>
    </div>
  )
}

const POPULAR = [
  {name:'Apple',ticker:'AAPL'},{name:'NVIDIA',ticker:'NVDA'},{name:'Microsoft',ticker:'MSFT'},
  {name:'Tesla',ticker:'TSLA'},{name:'SAP',ticker:'SAP.DE'},{name:'Bitcoin',ticker:'BTC-USD'},
  {name:'Ethereum',ticker:'ETH-USD'},{name:'Amazon',ticker:'AMZN'},{name:'BASF',ticker:'BAS.DE'},
]

export default function Backtesting() {
  const [ticker, setTicker]   = useState('')
  const [rsiBuy, setRsiBuy]   = useState(30)
  const [rsiSell, setRsiSell] = useState(70)
  const [capital, setCapital] = useState(10000)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const run = async () => {
    const tk = ticker.trim().toUpperCase()
    if (!tk) return setError('Bitte einen Ticker eingeben.')
    if (rsiBuy >= rsiSell) return setError('RSI Kauf-Schwelle muss kleiner als Verkauf-Schwelle sein.')
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await api.post('/api/backtesting', {
        ticker: tk, strategy: 'rsi',
        rsi_buy: parseFloat(rsiBuy), rsi_sell: parseFloat(rsiSell),
        initial_capital: parseFloat(capital),
      })
      setResult(r.data)
    } catch(e) {
      setError(e.response?.data?.detail || 'Fehler beim Backtesting.')
    }
    setLoading(false)
  }

  const retColor = v => v > 0 ? '#6ee7a0' : '#f87171'

  return (
    <div style={{ padding:'28px 32px', maxWidth:900 }}>
      <div style={{ ...pLbl, marginBottom:6 }}>Lernen</div>
      <div style={{ fontSize:'1.4rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff', marginBottom:4 }}>
        Backtesting-Tool
      </div>
      <div style={{ fontSize:'0.74rem', color:'rgba(255,255,255,0.35)', marginBottom:28 }}>
        Simuliere eine RSI-Strategie auf 12 Monate historischer Daten
      </div>

      {/* Form */}
      <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:12, padding:'22px 24px', marginBottom:24 }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:16, marginBottom:16 }}>
          <div>
            <label style={lbl}>Ticker / Aktie</label>
            <input style={inp} value={ticker} onChange={e=>setTicker(e.target.value)}
              placeholder="z.B. AAPL, NVDA, BTC-USD"
              onKeyDown={e=>e.key==='Enter'&&run()} />
          </div>
          <div>
            <label style={lbl}>RSI Kaufen ≤</label>
            <input style={inp} type="number" min={10} max={49} value={rsiBuy}
              onChange={e=>setRsiBuy(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>RSI Verkaufen ≥</label>
            <input style={inp} type="number" min={51} max={90} value={rsiSell}
              onChange={e=>setRsiSell(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Startkapital (€)</label>
            <input style={inp} type="number" min={100} value={capital}
              onChange={e=>setCapital(e.target.value)} />
          </div>
        </div>

        {/* Quick tickers */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          {POPULAR.map(p => (
            <button key={p.ticker}
              onClick={()=>setTicker(p.ticker)}
              style={{
                padding:'4px 10px', borderRadius:5, cursor:'pointer', fontSize:'0.68rem', fontWeight:500,
                border:`1px solid ${ticker===p.ticker?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.09)'}`,
                background: ticker===p.ticker ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: ticker===p.ticker ? '#fff' : 'rgba(255,255,255,0.4)',
                fontFamily:'inherit', transition:'all 0.15s',
              }}>
              {p.name}
            </button>
          ))}
        </div>

        {error && <div style={{ color:'#f87171', fontSize:'0.76rem', marginBottom:12 }}>{error}</div>}

        <button onClick={run} disabled={loading} style={{
          padding:'10px 28px', borderRadius:7, cursor:loading?'wait':'pointer', fontWeight:700,
          fontSize:'0.84rem', border:'none', fontFamily:'inherit',
          background: loading ? 'rgba(255,255,255,0.1)' : 'rgba(107,18,32,0.6)',
          color: loading ? 'rgba(255,255,255,0.4)' : '#fff',
          transition:'all 0.15s',
        }}>
          {loading ? 'Berechne…' : 'Backtest starten'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* KPI Cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label:'RSI Strategie', value:`${result.total_return > 0 ? '+' : ''}${fmt(result.total_return)}%`, color:retColor(result.total_return) },
              { label:'Buy & Hold', value:`${result.buy_hold_return > 0 ? '+' : ''}${fmt(result.buy_hold_return)}%`, color:retColor(result.buy_hold_return) },
              { label:'Trades ausgeführt', value:result.num_trades, color:'rgba(255,255,255,0.85)' },
              { label:'Endkapital', value:`${fmt(result.final_capital)} €`, color:'#a5b4fc' },
            ].map(k => (
              <div key={k.label} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'16px 18px' }}>
                <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:8 }}>{k.label}</div>
                <div style={{ fontSize:'1.3rem', fontWeight:700, color:k.color, letterSpacing:'-0.02em' }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Outperformance Banner */}
          <div style={{
            marginBottom:20, padding:'12px 18px', borderRadius:8,
            background: result.outperformed ? 'rgba(6,95,46,0.15)' : 'rgba(160,16,8,0.12)',
            border: `1px solid ${result.outperformed ? 'rgba(6,95,46,0.3)' : 'rgba(160,16,8,0.25)'}`,
            fontSize:'0.8rem', color: result.outperformed ? '#86efac' : '#fca5a5',
            fontWeight:600,
          }}>
            {result.outperformed
              ? `Die RSI-Strategie hat Buy & Hold um ${fmt(result.total_return - result.buy_hold_return)}% übertroffen.`
              : `Buy & Hold war um ${fmt(result.buy_hold_return - result.total_return)}% besser — die RSI-Strategie hat underperformed.`}
          </div>

          {/* Equity Curve */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'20px 16px', marginBottom:20 }}>
            <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.4)', marginBottom:14, textTransform:'uppercase', letterSpacing:'0.1em' }}>
              Equity-Kurve — {result.name}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={result.equity_curve}>
                <XAxis dataKey="date" tick={{ fill:'rgba(255,255,255,0.3)', fontSize:9 }}
                       tickFormatter={v=>v.slice(5)} interval="preserveStartEnd" />
                <YAxis tick={{ fill:'rgba(255,255,255,0.35)', fontSize:10 }}
                       tickFormatter={v=>`${(v/1000).toFixed(0)}k`} domain={['auto','auto']} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={capital} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="value" stroke="#a5b4fc" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.2)', marginTop:6 }}>
              Gestrichelte Linie = Startkapital ({fmt(capital)} €)
            </div>
          </div>

          {/* Trade Log */}
          {result.trades.length > 0 && (
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', fontSize:'0.68rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                Letzte {result.trades.length} Trades
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {['Datum','Aktion','Kurs','Menge','RSI'].map(h => (
                      <th key={h} style={{ padding:'8px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)',
                                           textAlign:'left', fontSize:'0.57rem', color:'rgba(255,255,255,0.3)',
                                           textTransform:'uppercase', letterSpacing:'0.1em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((t, i) => (
                    <tr key={i}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.03)', fontSize:'0.76rem', color:'rgba(255,255,255,0.5)' }}>{t.date}</td>
                      <td style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{
                          fontSize:'0.68rem', fontWeight:700, padding:'2px 8px', borderRadius:5,
                          background: t.type==='Kauf' ? 'rgba(6,95,46,0.2)' : 'rgba(160,16,8,0.2)',
                          color: t.type==='Kauf' ? '#6ee7a0' : '#f87171',
                        }}>{t.type}</span>
                      </td>
                      <td style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.03)', fontSize:'0.78rem', color:'rgba(255,255,255,0.75)', fontVariantNumeric:'tabular-nums' }}>{fmt(t.price)} $</td>
                      <td style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.03)', fontSize:'0.78rem', color:'rgba(255,255,255,0.6)', fontVariantNumeric:'tabular-nums' }}>{t.qty} Stk.</td>
                      <td style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.03)', fontSize:'0.78rem', color: t.type==='Kauf' ? '#6ee7a0' : '#f87171', fontVariantNumeric:'tabular-nums' }}>{t.rsi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop:14, padding:'10px 14px', borderRadius:8, background:'rgba(255,255,255,0.04)',
                        border:'1px solid rgba(255,255,255,0.07)', fontSize:'0.68rem', color:'rgba(255,255,255,0.25)' }}>
            Backtesting ist historisch und keine Garantie für zukünftige Renditen. Gebühren und Steuern sind nicht berücksichtigt.
          </div>
        </>
      )}
    </div>
  )
}
