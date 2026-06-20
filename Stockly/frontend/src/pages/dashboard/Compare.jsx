import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import api from '../../api'

const COLORS = ['#3d0a14','#065f2e','#92400e','#6b1220']
const fmt = (n,d=2) => n==null?'–':Number(n).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d})
const PERIODS = [
  { label:'1W', value:'7d'  },
  { label:'1M', value:'1mo' },
  { label:'3M', value:'3mo' },
  { label:'6M', value:'6mo' },
  { label:'1J', value:'1y'  },
]

function mergeCharts(datasets) {
  if (!datasets.length) return []
  const allDates = [...new Set(datasets.flatMap(d => d.data.map(x => x.date)))].sort()
  return allDates.map(date => {
    const row = { date }
    datasets.forEach(ds => {
      const pt = ds.data.find(x => x.date === date)
      if (pt) row[ds.ticker] = pt.close
    })
    return row
  })
}

function normalise(datasets) {
  if (!datasets.length) return []
  const allDates = [...new Set(datasets.flatMap(d => d.data.map(x => x.date)))].sort()
  return allDates.map(date => {
    const row = { date }
    datasets.forEach(ds => {
      const first = ds.data[0]?.close || 1
      const pt = ds.data.find(x => x.date === date)
      if (pt) row[ds.ticker] = parseFloat(((pt.close / first - 1) * 100).toFixed(2))
    })
    return row
  })
}

export default function Compare() {
  const [inputs, setInputs]   = useState(['',''])
  const [period, setPeriod]   = useState('1mo')
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [mode, setMode]       = useState('normalised')

  const addSlot  = () => inputs.length < 4 && setInputs(i=>[...i,''])
  const setInput = (idx,v) => setInputs(i=>{ const n=[...i]; n[idx]=v; return n })
  const delSlot  = idx => { setInputs(i=>i.filter((_,j)=>j!==idx)); setDatasets(d=>d.filter(ds=>ds.ticker!==inputs[idx].toUpperCase())) }

  const loadData = async () => {
    const tickers = inputs.map(t=>t.trim().toUpperCase()).filter(Boolean)
    if (tickers.length < 2) { setError('Mindestens 2 Ticker eingeben'); return }
    setError('')
    setLoading(true)
    const results = []
    for (const t of tickers) {
      try {
        const r = await api.get(`/api/chart/${t}`, { params: { period } })
        results.push({ ticker: t, data: r.data.data || [] })
      } catch(e) { setError(`Keine Daten für ${t}`) }
    }
    setDatasets(results)
    setLoading(false)
  }

  const chartData = mode === 'normalised' ? normalise(datasets) : mergeCharts(datasets)

  return (
    <div style={{ padding:'28px 32px', minHeight:'100%' }}>
      <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:6 }}>Analyse</div>
      <div style={{ fontSize:'1.4rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff', marginBottom:24 }}>Vergleichsanalyse</div>

      {/* Input row */}
      <div style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 22px', marginBottom:16 }}>
        <div style={{ fontSize:'0.6rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:14 }}>Ticker auswählen</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
          {inputs.map((inp, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background: COLORS[i], flexShrink:0 }}/>
              <input value={inp} onChange={e=>setInput(i,e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&loadData()}
                placeholder={`Ticker ${i+1} (z.B. AAPL)`}
                style={{ background:'var(--s2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:'0.82rem', color:'var(--txt)', outline:'none', fontFamily:'inherit', fontWeight:600, textTransform:'uppercase', width:160 }}/>
              {inputs.length > 2 && (
                <button onClick={()=>delSlot(i)} style={{ background:'none', border:'none', color:'var(--txt3)', cursor:'pointer', fontSize:'1rem', padding:'0 4px', lineHeight:1 }}>×</button>
              )}
            </div>
          ))}
          {inputs.length < 4 && (
            <button onClick={addSlot} style={{ background:'transparent', border:'1px dashed var(--border)', color:'var(--txt3)', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontSize:'0.78rem' }}>
              + Hinzufügen
            </button>
          )}
        </div>

        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          {PERIODS.map(p => (
            <button key={p.value} onClick={()=>setPeriod(p.value)} style={{
              padding:'5px 14px', borderRadius:16, border:`1px solid ${period===p.value?'var(--border)':'rgba(45,6,16,0.12)'}`,
              background: period===p.value ? 'var(--acc)' : 'transparent',
              color: period===p.value ? '#fff' : 'var(--txt3)',
              cursor:'pointer', fontSize:'0.72rem', fontWeight: period===p.value?600:400,
            }}>{p.label}</button>
          ))}
          <div style={{ flex:1 }}/>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={()=>setMode('normalised')} style={{ padding:'5px 14px', borderRadius:16, border:`1px solid ${mode==='normalised'?'var(--border)':'rgba(45,6,16,0.12)'}`, background: mode==='normalised'?'var(--bl)':'transparent', color:'var(--txt3)', cursor:'pointer', fontSize:'0.72rem' }}>
              Normalisiert %
            </button>
            <button onClick={()=>setMode('raw')} style={{ padding:'5px 14px', borderRadius:16, border:`1px solid ${mode==='raw'?'var(--border)':'rgba(45,6,16,0.12)'}`, background: mode==='raw'?'var(--bl)':'transparent', color:'var(--txt3)', cursor:'pointer', fontSize:'0.72rem' }}>
              Absolut €
            </button>
          </div>
          <button onClick={loadData} disabled={loading} style={{ background:'var(--acc)', border:'none', color:'#fff', padding:'9px 22px', borderRadius:8, cursor:'pointer', fontSize:'0.82rem', fontWeight:600, opacity:loading?0.7:1 }}>
            {loading ? 'Lade…' : 'Vergleichen'}
          </button>
        </div>
        {error && <div style={{ color:'var(--red)', fontSize:'0.76rem', marginTop:10 }}>{error}</div>}
      </div>

      {/* Chart */}
      {datasets.length >= 2 && chartData.length > 0 ? (
        <div style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 22px', marginBottom:16 }}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top:4, right:20, left:0, bottom:0 }}>
              <XAxis dataKey="date" tick={{ fontSize:9, fill:'var(--txt3)' }} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
              <YAxis tick={{ fontSize:9, fill:'var(--txt3)' }} axisLine={false} tickLine={false} width={70}
                tickFormatter={v => mode==='normalised' ? `${v>0?'+':''}${v.toFixed(1)}%` : `${fmt(v,0)} €`}/>
              <CartesianGrid vertical={false} stroke="var(--bl)" strokeDasharray="3 6"/>
              <Tooltip contentStyle={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:8, fontSize:'0.72rem' }}
                formatter={(v,name) => [mode==='normalised' ? `${v>0?'+':''}${v.toFixed(2)}%` : `${fmt(v)} €`, name]}/>
              <Legend wrapperStyle={{ fontSize:'0.72rem', color:'var(--txt2)' }}/>
              {datasets.map((ds,i) => (
                <Line key={ds.ticker} type="monotone" dataKey={ds.ticker} stroke={COLORS[i]} strokeWidth={2} dot={false} connectNulls/>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : datasets.length === 0 ? (
        <div style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:'60px', textAlign:'center' }}>
          <div style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--txt)', marginBottom:8 }}>Ticker eingeben und vergleichen</div>
          <div style={{ fontSize:'0.78rem', color:'var(--txt3)' }}>Bis zu 4 Assets gleichzeitig vergleichen — Aktien, ETFs, Kryptos</div>
        </div>
      ) : null}

      {/* Summary table */}
      {datasets.length >= 2 && (
        <div style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 22px' }}>
          <div style={{ fontSize:'0.6rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:14 }}>Zusammenfassung</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Asset','Startpreis','Endpreis','Rendite','Volatilität'].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:'0.58rem', color:'var(--txt3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datasets.map((ds,i) => {
                const prices = ds.data.map(d=>d.close).filter(Boolean)
                const first  = prices[0]||0
                const last2  = prices[prices.length-1]||0
                const ret    = first ? ((last2-first)/first)*100 : 0
                const diffs  = prices.slice(1).map((p,j) => Math.abs((p-prices[j])/prices[j]*100))
                const vol    = diffs.length ? (diffs.reduce((a,b)=>a+b,0)/diffs.length) : 0
                return (
                  <tr key={ds.ticker} style={{ borderBottom:'1px solid var(--bl)' }}>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:COLORS[i] }}/>
                        <span style={{ fontWeight:700, color:'var(--acc)', fontFamily:'monospace', fontSize:'0.78rem' }}>{ds.ticker}</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px', color:'var(--txt)' }}>{fmt(first)} €</td>
                    <td style={{ padding:'10px 12px', color:'var(--txt)', fontWeight:600 }}>{fmt(last2)} €</td>
                    <td style={{ padding:'10px 12px', fontWeight:700, color: ret>=0?'var(--green)':'var(--red)' }}>
                      {ret>=0?'+':''}{fmt(ret,2)}%
                    </td>
                    <td style={{ padding:'10px 12px', color:'var(--txt2)' }}>{fmt(vol,2)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
