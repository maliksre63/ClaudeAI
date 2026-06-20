import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import api from '../../api'

const pLbl = { fontSize:'0.58rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.18em' }

function pctColor(v) {
  if (v > 2)  return '#6ee7a0'
  if (v > 0)  return '#86efac'
  if (v > -2) return '#fca5a5'
  return '#f87171'
}

function FlowBadge({ flow }) {
  const cfg = {
    rein:    { bg:'rgba(6,95,46,0.2)',   color:'#6ee7a0', label:'Kapital rein ↑' },
    raus:    { bg:'rgba(160,16,8,0.2)',  color:'#f87171', label:'Kapital raus ↓' },
    neutral: { bg:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.45)', label:'Neutral' },
  }[flow] || { bg:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', label: flow }
  return (
    <span style={{ fontSize:'0.62rem', padding:'2px 8px', borderRadius:10,
                   background:cfg.bg, color:cfg.color, fontWeight:600, letterSpacing:'0.04em' }}>
      {cfg.label}
    </span>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background:'#1a0408', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8,
                  padding:'10px 14px', fontSize:'0.74rem', color:'rgba(255,255,255,0.85)' }}>
      <div style={{ fontWeight:700, marginBottom:6 }}>{d.name} ({d.etf})</div>
      <div>1 Tag: <strong style={{ color:pctColor(d.change_1d) }}>{d.change_1d > 0 ? '+' : ''}{d.change_1d}%</strong></div>
      <div>5 Tage: <strong style={{ color:pctColor(d.change_5d) }}>{d.change_5d > 0 ? '+' : ''}{d.change_5d}%</strong></div>
      <div>1 Monat: <strong style={{ color:pctColor(d.change_1m) }}>{d.change_1m > 0 ? '+' : ''}{d.change_1m}%</strong></div>
    </div>
  )
}

export default function Sektoren() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState('5d')
  const [error, setError]     = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/api/sectors')
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => { setError('Sektor-Daten konnten nicht geladen werden.'); setLoading(false) })
  }, [])

  const periodKey = { '1d':'change_1d', '5d':'change_5d', '1m':'change_1m' }[period]
  const chartData = [...data].sort((a,b) => b[periodKey] - a[periodKey])

  const topSectors    = data.filter(d => d.change_5d > 0).sort((a,b)=>b.change_5d-a.change_5d).slice(0,3)
  const bottomSectors = data.filter(d => d.change_5d < 0).sort((a,b)=>a.change_5d-b.change_5d).slice(0,3)

  const tabStyle = active => ({
    padding:'5px 14px', borderRadius:5, cursor:'pointer', fontSize:'0.72rem', fontWeight:600,
    border:'none', fontFamily:'inherit',
    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
    color: active ? '#fff' : 'rgba(255,255,255,0.35)',
    transition:'all 0.15s',
  })

  return (
    <div style={{ padding:'28px 32px', maxWidth:1100 }}>
      <div style={{ ...pLbl, marginBottom:6 }}>Markt</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24 }}>
        <div>
          <div style={{ fontSize:'1.4rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff', marginBottom:4 }}>
            Sektoren-Rotation
          </div>
          <div style={{ fontSize:'0.74rem', color:'rgba(255,255,255,0.35)' }}>
            Wo fließt aktuell Kapital rein — und wo heraus?
          </div>
        </div>
        <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.05)', borderRadius:7, padding:4 }}>
          {[['1d','1 Tag'],['5d','5 Tage'],['1m','1 Monat']].map(([k,l]) => (
            <button key={k} style={tabStyle(period===k)} onClick={()=>setPeriod(k)}>{l}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.82rem', padding:'40px 0', textAlign:'center' }}>
          Lade Sektor-ETF Daten…
        </div>
      )}
      {error && <div style={{ color:'#f87171', fontSize:'0.82rem' }}>{error}</div>}

      {!loading && !error && (
        <>
          {/* Top / Bottom Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
            <div style={{ background:'rgba(6,95,46,0.12)', border:'1px solid rgba(6,95,46,0.3)', borderRadius:10, padding:'16px 20px' }}>
              <div style={{ fontSize:'0.6rem', color:'#6ee7a0', textTransform:'uppercase', letterSpacing:'0.12em', fontWeight:700, marginBottom:10 }}>
                Stärkste Sektoren (5 Tage)
              </div>
              {topSectors.map(s => (
                <div key={s.etf} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.8)' }}>{s.name}</span>
                  <span style={{ fontSize:'0.78rem', fontWeight:700, color:'#6ee7a0' }}>+{s.change_5d}%</span>
                </div>
              ))}
            </div>
            <div style={{ background:'rgba(160,16,8,0.1)', border:'1px solid rgba(160,16,8,0.25)', borderRadius:10, padding:'16px 20px' }}>
              <div style={{ fontSize:'0.6rem', color:'#f87171', textTransform:'uppercase', letterSpacing:'0.12em', fontWeight:700, marginBottom:10 }}>
                Schwächste Sektoren (5 Tage)
              </div>
              {bottomSectors.map(s => (
                <div key={s.etf} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.8)' }}>{s.name}</span>
                  <span style={{ fontSize:'0.78rem', fontWeight:700, color:'#f87171' }}>{s.change_5d}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'20px 16px', marginBottom:24 }}>
            <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.4)', marginBottom:16, textTransform:'uppercase', letterSpacing:'0.1em' }}>
              Performance Vergleich — {period === '1d' ? '1 Tag' : period === '5d' ? '5 Tage' : '1 Monat'}
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top:0, right:8, left:-20, bottom:40 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill:'rgba(255,255,255,0.4)', fontSize:10 }}
                  angle={-35} textAnchor="end" interval={0}
                />
                <YAxis tick={{ fill:'rgba(255,255,255,0.35)', fontSize:10 }} tickFormatter={v=>`${v}%`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill:'rgba(255,255,255,0.04)' }} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" />
                <Bar dataKey={periodKey} radius={[3,3,0,0]}>
                  {chartData.map(d => (
                    <Cell key={d.etf} fill={d[periodKey] >= 0 ? '#6ee7a0' : '#f87171'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detail Table */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Sektor','ETF','Kurs','1 Tag','5 Tage','1 Monat','Kapitalfluss'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)',
                                        textAlign: h==='Sektor'||h==='ETF'||h==='Kapitalfluss' ? 'left' : 'right',
                                        fontSize:'0.57rem', color:'rgba(255,255,255,0.35)',
                                        textTransform:'uppercase', letterSpacing:'0.12em', fontWeight:600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.map(d => (
                  <tr key={d.etf}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.025)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:'0.82rem', color:'rgba(255,255,255,0.85)', fontWeight:600 }}>
                      {d.name}
                    </td>
                    <td style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:'0.72rem', color:'rgba(255,255,255,0.4)', fontFamily:'monospace' }}>
                      {d.etf}
                    </td>
                    <td style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:'0.82rem', color:'rgba(255,255,255,0.7)', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>
                      ${d.price}
                    </td>
                    {[d.change_1d, d.change_5d, d.change_1m].map((v, i) => (
                      <td key={i} style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)', textAlign:'right', fontVariantNumeric:'tabular-nums', fontSize:'0.82rem', fontWeight:600, color:pctColor(v) }}>
                        {v > 0 ? '+' : ''}{v}%
                      </td>
                    ))}
                    <td style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                      <FlowBadge flow={d.flow} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop:12, fontSize:'0.65rem', color:'rgba(255,255,255,0.2)' }}>
            Daten basieren auf US-Sektor-ETFs (SPDR). Kapitalfluss = relatives Volumen der letzten 5 Tage vs. Monatsdurchschnitt.
          </div>
        </>
      )}
    </div>
  )
}
