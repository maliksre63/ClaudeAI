import { useState } from 'react'
import api from '../../api'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import TickerSearch from '../../components/TickerSearch'

const card = { background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:'22px 26px' }
const inp  = { background:'var(--s2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', fontSize:'0.88rem', color:'var(--txt)', outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box' }
const fmt  = (n, d=0) => n==null?'–':Number(n).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d})

const PRESETS = [
  { ticker:'MSFT', label:'Microsoft', monthly:200 },
  { ticker:'AAPL', label:'Apple',     monthly:200 },
  { ticker:'NVDA', label:'NVIDIA',    monthly:200 },
  { ticker:'BTC-USD', label:'Bitcoin', monthly:100 },
  { ticker:'SPY',  label:'S&P 500 ETF', monthly:300 },
  { ticker:'IWDA.AS', label:'MSCI World ETF', monthly:300 },
]

export default function SparplanSimulator() {
  const [ticker,  setTicker]  = useState('SPY')
  const [monthly, setMonthly] = useState(200)
  const [years,   setYears]   = useState(10)
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState('')

  const calc = async () => {
    setErr('')
    if (!ticker.trim() || monthly <= 0 || years < 1) return setErr('Bitte alle Felder ausfüllen.')
    setLoading(true)
    try {
      const r = await api.post('/api/sparplan', { ticker: ticker.trim().toUpperCase(), monthly: parseFloat(monthly), years: parseInt(years) })
      setResult(r.data)
    } catch(e) { setErr(e.response?.data?.detail||'Fehler bei der Berechnung.') }
    setLoading(false)
  }

  return (
    <div style={{ padding:'28px 32px', maxWidth:900 }}>
      <div style={{ fontSize:'0.6rem',color:'rgba(255,255,255,0.35)',letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:6 }}>Analyse</div>
      <div style={{ fontSize:'1.4rem',fontWeight:300,letterSpacing:'-0.04em',color:'#fff',marginBottom:6 }}>Sparplan-Simulator</div>
      <div style={{ fontSize:'0.8rem',color:'var(--txt3)',marginBottom:24 }}>Berechne wie viel dein monatlicher Sparplan über Zeit wächst — mit echten historischen Renditen.</div>

      {/* Presets */}
      <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:20 }}>
        {PRESETS.map(p=>(
          <button key={p.ticker} onClick={()=>{ setTicker(p.ticker); setMonthly(p.monthly) }} style={{
            padding:'6px 14px',borderRadius:20,border:`1px solid ${ticker===p.ticker?'var(--acc)':'var(--border)'}`,
            background:ticker===p.ticker?'var(--acc)':'var(--s2)',
            color:ticker===p.ticker?'#fff':'var(--txt2)',
            fontSize:'0.76rem',cursor:'pointer',fontFamily:'inherit',
          }}>{p.label}</button>
        ))}
      </div>

      {/* Input form */}
      <div style={{ ...card, marginBottom:24 }}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:14,alignItems:'flex-end' }}>
          <div>
            <div style={{ fontSize:'0.62rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:6 }}>Ticker / ETF</div>
            <TickerSearch
              value={ticker}
              onChange={v=>setTicker(v.toUpperCase())}
              onSelect={item=>setTicker(item.ticker)}
              placeholder="z.B. Apple, NVIDIA, Bitcoin…"
            />
          </div>
          <div>
            <div style={{ fontSize:'0.62rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:6 }}>Monatlicher Betrag</div>
            <div style={{ position:'relative' }}>
              <input type="number" value={monthly} min={1} onChange={e=>setMonthly(e.target.value)} style={{...inp,paddingRight:32}}/>
              <span style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:'0.8rem',color:'var(--txt3)' }}>€</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize:'0.62rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:6 }}>Laufzeit: {years} Jahre</div>
            <input type="range" min={1} max={40} value={years} onChange={e=>setYears(e.target.value)}
              style={{ width:'100%',accentColor:'var(--acc)',height:20 }}
            />
            <div style={{ display:'flex',justifyContent:'space-between',fontSize:'0.62rem',color:'var(--txt3)',marginTop:2 }}>
              <span>1J</span><span>10J</span><span>20J</span><span>40J</span>
            </div>
          </div>
          <button onClick={calc} disabled={loading} style={{
            padding:'11px 24px',background:'var(--acc)',border:'none',borderRadius:8,color:'#fff',
            fontWeight:600,fontSize:'0.88rem',cursor:loading?'wait':'pointer',fontFamily:'inherit',
            opacity:loading?0.7:1,whiteSpace:'nowrap',
          }}>
            {loading?'Rechne…':'Berechnen'}
          </button>
        </div>
        {err && <div style={{ color:'var(--red)',fontSize:'0.76rem',marginTop:12 }}>{err}</div>}
      </div>

      {/* Result */}
      {result && (
        <>
          {/* KPI row */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:24 }}>
            {[
              { label:'Endwert', value:`${fmt(result.final_value)} €`, color:'var(--green)', big:true },
              { label:'Eingezahlt', value:`${fmt(result.total_invested)} €`, color:'var(--txt)' },
              { label:'Gewinn', value:`${fmt(result.gain)} €`, color:'var(--green)' },
              { label:'Rendite', value:`+${result.gain_pct?.toFixed(1)}%`, color:'var(--green)' },
              { label:'Ø Jahresrendite', value:`${result.annual_return_pct?.toFixed(1)}%`, color:'var(--txt2)' },
            ].map(k=>(
              <div key={k.label} style={{ ...card, textAlign:'center' }}>
                <div style={{ fontSize:'0.58rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:8 }}>{k.label}</div>
                <div style={{ fontSize:k.big?'1.5rem':'1.15rem',fontWeight:700,color:k.color,letterSpacing:'-0.02em' }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ ...card, marginBottom:20 }}>
            <div style={{ fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:16 }}>Wachstumskurve — {result.ticker}</div>
            <div style={{ display:'flex',gap:20,marginBottom:12,fontSize:'0.74rem' }}>
              <span style={{ color:'var(--green)' }}>— Endwert</span>
              <span style={{ color:'rgba(255,255,255,0.4)' }}>— Eingezahlt</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={result.curve} margin={{top:0,right:0,bottom:0,left:0}}>
                <defs>
                  <linearGradient id="sparVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--green)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--green)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="sparInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="rgba(255,255,255,0.3)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="rgba(255,255,255,0.3)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" tickFormatter={v=>`${v}J`} tick={{fontSize:11,fill:'var(--txt3)'}} tickLine={false} axisLine={false}/>
                <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}k€`} tick={{fontSize:11,fill:'var(--txt3)'}} tickLine={false} axisLine={false} width={50}/>
                <Tooltip
                  contentStyle={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:8,fontSize:'0.78rem'}}
                  formatter={(v,n)=>[`${fmt(v)} €`, n==='value'?'Endwert':'Eingezahlt']}
                  labelFormatter={l=>`Jahr ${l}`}
                />
                <Area type="monotone" dataKey="invested" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} fill="url(#sparInv)" dot={false} name="invested"/>
                <Area type="monotone" dataKey="value"    stroke="var(--green)" strokeWidth={2} fill="url(#sparVal)" dot={false} name="value"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div style={card}>
            <div style={{ fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:14 }}>Jährliche Übersicht</div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border)' }}>
                    {['Jahr','Eingezahlt','Endwert','Gewinn','Rendite'].map(h=>(
                      <th key={h} style={{ padding:'8px 12px',fontSize:'0.6rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:700,textAlign:'right',paddingLeft:h==='Jahr'?12:0 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.curve.map(row=>{
                    const gain = row.value - row.invested
                    const pct  = row.invested > 0 ? (gain/row.invested*100) : 0
                    return (
                      <tr key={row.year} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding:'10px 12px',fontSize:'0.82rem',fontWeight:600,color:'var(--txt)' }}>Jahr {row.year}</td>
                        <td style={{ padding:'10px 12px',fontSize:'0.82rem',color:'var(--txt2)',textAlign:'right' }}>{fmt(row.invested)} €</td>
                        <td style={{ padding:'10px 12px',fontSize:'0.82rem',fontWeight:700,color:'var(--txt)',textAlign:'right' }}>{fmt(row.value)} €</td>
                        <td style={{ padding:'10px 12px',fontSize:'0.82rem',fontWeight:600,color:gain>=0?'var(--green)':'var(--red)',textAlign:'right' }}>+{fmt(gain)} €</td>
                        <td style={{ padding:'10px 12px',fontSize:'0.82rem',color:gain>=0?'var(--green)':'var(--red)',textAlign:'right' }}>+{pct.toFixed(1)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop:10,fontSize:'0.66rem',color:'var(--txt3)',textAlign:'center' }}>
            Berechnung auf Basis historischer 5-Jahres-Rendite von {result.ticker} via Yahoo Finance · Keine Anlageberatung
          </div>
        </>
      )}
    </div>
  )
}
