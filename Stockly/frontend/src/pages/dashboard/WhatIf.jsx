import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import api from '../../api'

const card = { background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:'24px 26px', marginBottom:16 }
const inp  = { background:'var(--s2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', fontSize:'0.86rem', color:'var(--txt)', outline:'none', fontFamily:'inherit', width:'100%' }
const lbl  = { fontSize:'0.58rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:6, display:'block', fontWeight:600 }

const PRESETS = [
  { ticker:'AAPL', label:'Apple', from:'2020-01-01' },
  { ticker:'NVDA', label:'Nvidia', from:'2022-01-01' },
  { ticker:'BTC-USD', label:'Bitcoin', from:'2021-01-01' },
  { ticker:'MSFT', label:'Microsoft', from:'2019-01-01' },
  { ticker:'SAP.DE', label:'SAP', from:'2020-01-01' },
  { ticker:'ETH-USD', label:'Ethereum', from:'2022-01-01' },
]

export default function WhatIf() {
  const [ticker, setTicker]   = useState('AAPL')
  const [amount, setAmount]   = useState('1000')
  const [from, setFrom]       = useState('2020-01-01')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const simulate = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await api.get(`/api/whatif?ticker=${ticker.toUpperCase()}&amount=${amount}&from_date=${from}`)
      setResult(r.data)
    } catch(e) {
      setError(e?.response?.data?.detail || 'Simulation fehlgeschlagen')
    }
    setLoading(false)
  }

  const gain    = result?.gain || 0
  const gainPct = result?.gain_pct || 0
  const vsSpY   = result?.vs_spy || 0

  return (
    <div style={{padding:'28px 32px', maxWidth:860}}>
      <div style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.35)',letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:6}}>Analyse</div>
      <div style={{fontSize:'1.4rem',fontWeight:300,letterSpacing:'-0.04em',color:'#fff',marginBottom:6}}>Was-wäre-wenn Simulator</div>
      <div style={{fontSize:'0.8rem',color:'var(--txt3)',marginBottom:24}}>Wie viel wäre eine Investition in der Vergangenheit heute wert?</div>

      {/* Input Card */}
      <div style={card}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:12,alignItems:'flex-end'}}>
          <div>
            <label style={lbl}>Ticker / Börsenkürzel
              <span style={{fontWeight:400,color:'var(--txt3)',marginLeft:6,textTransform:'none',letterSpacing:0}}>— AAPL = Apple, BTC-USD = Bitcoin, SAP.DE = SAP</span>
            </label>
            <input style={inp} value={ticker} onChange={e=>setTicker(e.target.value)} placeholder="z.B. AAPL, BTC-USD, SAP.DE" onKeyDown={e=>e.key==='Enter'&&simulate()}/>
          </div>
          <div>
            <label style={lbl}>Investitionsbetrag (€)</label>
            <input style={inp} type="number" value={amount} onChange={e=>setAmount(e.target.value)} min="1"/>
          </div>
          <div>
            <label style={lbl}>Investiert am</label>
            <input style={{...inp}} type="date" value={from} onChange={e=>setFrom(e.target.value)} max={new Date().toISOString().split('T')[0]}/>
          </div>
          <button onClick={simulate} disabled={loading} style={{
            padding:'10px 22px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',
            background:'var(--acc)',color:'#fff',fontWeight:700,fontSize:'0.84rem',flexShrink:0,
            opacity:loading?0.6:1,height:42
          }}>
            {loading?'…':'Simulieren'}
          </button>
        </div>

        {/* Presets */}
        <div style={{marginTop:14,display:'flex',gap:8,flexWrap:'wrap'}}>
          <span style={{fontSize:'0.68rem',color:'var(--txt3)',alignSelf:'center'}}>Schnellauswahl:</span>
          {PRESETS.map(p=>(
            <button key={p.ticker} onClick={()=>{setTicker(p.ticker);setFrom(p.from)}} style={{
              padding:'4px 10px',borderRadius:6,cursor:'pointer',fontFamily:'inherit',fontSize:'0.7rem',
              background: ticker===p.ticker?'var(--acc)':'var(--s2)',
              border:'1px solid var(--border)',
              color: ticker===p.ticker?'#fff':'var(--txt2)',
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {error && <div style={{padding:'12px 16px',background:'rgba(231,76,60,0.1)',border:'1px solid rgba(231,76,60,0.3)',borderRadius:8,fontSize:'0.8rem',color:'#e74c3c',marginBottom:16}}>{error}</div>}

      {result && (
        <>
          {/* Result Hero */}
          <div style={{...card,background:gain>=0?'rgba(46,204,113,0.06)':'rgba(231,76,60,0.06)',border:`1px solid ${gain>=0?'rgba(46,204,113,0.3)':'rgba(231,76,60,0.3)'}`}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:16}}>
              {[
                {label:'Investiert', value:`${Number(amount).toLocaleString('de-DE',{minimumFractionDigits:2})} €`, color:'var(--txt)'},
                {label:'Heute wert', value:`${result.value_now.toLocaleString('de-DE',{minimumFractionDigits:2})} €`, color:gain>=0?'#2ecc71':'#e74c3c'},
                {label:'Gewinn / Verlust', value:`${gain>=0?'+':''}${gain.toLocaleString('de-DE',{minimumFractionDigits:2})} €`, color:gain>=0?'#2ecc71':'#e74c3c'},
                {label:'Rendite', value:`${gainPct>=0?'+':''}${gainPct.toFixed(2)}%`, color:gain>=0?'#2ecc71':'#e74c3c'},
              ].map((s,i)=>(
                <div key={i} style={{textAlign:i>0?'right':'left'}}>
                  <div style={{fontSize:'0.6rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>{s.label}</div>
                  <div style={{fontSize:'1.2rem',fontWeight:700,color:s.color}}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:24}}>
              <div style={{fontSize:'0.76rem',color:'var(--txt3)'}}>
                {result.shares.toFixed(4)} Anteile zu {result.price_start.toFixed(2)} € → heute {result.price_end.toFixed(2)} €
              </div>
              <div style={{fontSize:'0.76rem',color:vsSpY>=0?'#2ecc71':'#e74c3c',fontWeight:600}}>
                vs. S&P 500: {vsSpY>=0?'+':''}{vsSpY.toFixed(2)}% {vsSpY>=0?'besser':'schlechter'}
              </div>
            </div>
          </div>

          {/* Chart */}
          {result.curve?.length > 0 && (
            <div style={card}>
              <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:16}}>
                Performance von {result.ticker} ({result.from_date} → heute)
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={result.curve} margin={{left:10,right:10,top:5,bottom:5}}>
                  <XAxis dataKey="date" tick={{fontSize:10,fill:'var(--txt3)'}} axisLine={false} tickLine={false} interval={Math.floor(result.curve.length/6)}/>
                  <YAxis tick={{fontSize:10,fill:'var(--txt3)'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v.toFixed(0)}€`} width={55}/>
                  <Tooltip formatter={(v)=>[`${v.toLocaleString('de-DE',{minimumFractionDigits:2})} €`,'Depotwert']} contentStyle={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:8,fontSize:'0.78rem'}}/>
                  <ReferenceLine y={Number(amount)} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4"/>
                  <Line type="monotone" dataKey="value" stroke={gain>=0?'#2ecc71':'#e74c3c'} strokeWidth={2} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
              <div style={{fontSize:'0.66rem',color:'var(--txt3)',textAlign:'center',marginTop:4}}>
                Gestrichelte Linie = Investierter Betrag ({Number(amount).toLocaleString('de-DE')} €)
              </div>
            </div>
          )}

          {/* Comparison */}
          <div style={card}>
            <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:14}}>Vergleich</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div style={{padding:'14px',background:'var(--s2)',borderRadius:10,textAlign:'center'}}>
                <div style={{fontSize:'0.64rem',color:'var(--txt3)',marginBottom:6}}>{result.ticker}</div>
                <div style={{fontSize:'1.4rem',fontWeight:700,color:gainPct>=0?'#2ecc71':'#e74c3c'}}>{gainPct>=0?'+':''}{gainPct.toFixed(2)}%</div>
                <div style={{fontSize:'0.7rem',color:'var(--txt3)',marginTop:4}}>{result.from_date} bis heute</div>
              </div>
              <div style={{padding:'14px',background:'var(--s2)',borderRadius:10,textAlign:'center'}}>
                <div style={{fontSize:'0.64rem',color:'var(--txt3)',marginBottom:6}}>S&P 500 (Benchmark)</div>
                <div style={{fontSize:'1.4rem',fontWeight:700,color:result.spy_gain_pct>=0?'#2ecc71':'#e74c3c'}}>{result.spy_gain_pct>=0?'+':''}{result.spy_gain_pct?.toFixed(2)}%</div>
                <div style={{fontSize:'0.7rem',color:'var(--txt3)',marginTop:4}}>gleicher Zeitraum</div>
              </div>
            </div>
          </div>
        </>
      )}

      {!result && !loading && !error && (
        <div style={{...card,textAlign:'center',padding:'60px 40px'}}>
          <div style={{fontSize:'2.5rem',marginBottom:12}}>🔮</div>
          <div style={{fontSize:'0.9rem',fontWeight:600,color:'var(--txt)',marginBottom:8}}>Gib einen Ticker und Betrag ein</div>
          <div style={{fontSize:'0.78rem',color:'var(--txt3)'}}>Beispiel: Was wären 1.000€ in Apple seit 2020 heute wert?</div>
        </div>
      )}
    </div>
  )
}
