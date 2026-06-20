import { useState, useEffect } from 'react'
import api from '../../api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

const fmt = (n,d=2) => n==null?'–':Number(n).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d})
const card = { background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 22px' }

const EMOTION_COLORS = { Optimistisch:'#065f2e', Vorsichtig:'#92400e', Neutral:'#6b1220', FOMO:'#a01008', Gierig:'#92400e' }
const PIE_COLORS = ['#3d0a14','#6b1220','#a04060','#b8a89c','#065f2e','#92400e']

export default function Activity() {
  const [stats, setStats]   = useState(null)
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/statistics'),
      api.get('/api/trades'),
    ]).then(([s, t]) => {
      setStats(s.data)
      setTrades(t.data)
    }).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  const exportCSV = async () => {
    const r = await api.get('/api/trades/export', { responseType:'blob' })
    const url = URL.createObjectURL(r.data)
    const a = document.createElement('a')
    a.href = url; a.download = 'trades.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div style={{ padding:40, color:'rgba(255,255,255,0.3)', textAlign:'center' }}>Lade Statistiken…</div>

  const monthlyData = stats?.monthly_volume || []
  const emotionData = Object.entries(stats?.emotions || {}).map(([name,value])=>({name,value}))
  const categoryData = Object.entries(stats?.categories || {}).map(([name,value])=>({name,value}))

  return (
    <div style={{ padding:'28px 32px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24 }}>
        <div>
          <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:6 }}>Aktivität</div>
          <div style={{ fontSize:'1.4rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff' }}>Trading-Statistiken</div>
        </div>
        <button onClick={exportCSV} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.7)', padding:'9px 18px', borderRadius:8, cursor:'pointer', fontSize:'0.76rem', fontWeight:500 }}>
          ↓ CSV Export
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Gesamt Trades', value: stats?.total_trades ?? '–', sub: 'abgeschlossen' },
          { label:'Win Rate', value: `${fmt(stats?.win_rate,1)}%`, sub: `${stats?.wins ?? 0} Gewinne` },
          { label:'Ø Gewinn/Verlust', value: `${fmt(stats?.avg_return,2)}%`, sub: 'pro Trade', color: (stats?.avg_return??0) >= 0 ? 'var(--green)' : 'var(--red)' },
          { label:'Gesamtvolumen', value: `${fmt(stats?.total_volume,0)} €`, sub: 'Handelsvolumen' },
        ].map((k,i) => (
          <div key={i} style={card}>
            <div style={{ fontSize:'0.55rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:6 }}>{k.label}</div>
            <div style={{ fontSize:'1.5rem', fontWeight:700, color: k.color || 'var(--txt)', letterSpacing:'-0.03em', lineHeight:1, marginBottom:4 }}>{k.value}</div>
            <div style={{ fontSize:'0.65rem', color:'var(--txt2)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:12, marginBottom:20 }}>

        {/* Monthly volume */}
        <div style={card}>
          <div style={{ fontSize:'0.6rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:14 }}>Monatliches Handelsvolumen</div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyData} barSize={12}>
                <XAxis dataKey="month" tick={{ fontSize:9, fill:'var(--txt3)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:9, fill:'var(--txt3)' }} axisLine={false} tickLine={false} width={50}
                  tickFormatter={v=>`${(v/1000).toFixed(0)}k €`}/>
                <Tooltip contentStyle={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:6, fontSize:'0.72rem' }}
                  formatter={v=>[`${fmt(v,0)} €`,'Volumen']}/>
                <Bar dataKey="volume" fill="var(--acc)" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--txt3)', fontSize:'0.78rem' }}>
              Noch keine Trades
            </div>
          )}
        </div>

        {/* Emotions */}
        <div style={card}>
          <div style={{ fontSize:'0.6rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:14 }}>Handels-Emotionen</div>
          {emotionData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={emotionData} dataKey="value" outerRadius={50} innerRadius={28}>
                    {emotionData.map((e,i) => <Cell key={i} fill={EMOTION_COLORS[e.name] || PIE_COLORS[i % PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={v=>[v,'Trades']} contentStyle={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:6, fontSize:'0.72rem' }}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:8 }}>
                {emotionData.map((e,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.65rem' }}>
                    <span style={{ color:'var(--txt2)', display:'flex', alignItems:'center', gap:4 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background: EMOTION_COLORS[e.name] || PIE_COLORS[i%PIE_COLORS.length], display:'inline-block' }}/>
                      {e.name}
                    </span>
                    <span style={{ fontWeight:600, color:'var(--txt)' }}>{e.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height:120, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--txt3)', fontSize:'0.78rem' }}>
              Keine Daten
            </div>
          )}
        </div>

        {/* Categories */}
        <div style={card}>
          <div style={{ fontSize:'0.6rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:14 }}>Asset-Kategorien</div>
          {categoryData.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
              {categoryData.sort((a,b)=>b.value-a.value).map((c,i) => {
                const max = Math.max(...categoryData.map(x=>x.value))
                return (
                  <div key={i}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:'0.68rem', color:'var(--txt2)' }}>{c.name}</span>
                      <span style={{ fontSize:'0.68rem', fontWeight:600, color:'var(--txt)' }}>{c.value}</span>
                    </div>
                    <div style={{ height:4, background:'var(--bl)', borderRadius:2 }}>
                      <div style={{ height:'100%', width:`${(c.value/max)*100}%`, background:'var(--acc)', borderRadius:2 }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:120, color:'var(--txt3)', fontSize:'0.78rem' }}>
              Keine Daten
            </div>
          )}
        </div>
      </div>

      {/* Trade log */}
      <div style={card}>
        <div style={{ fontSize:'0.6rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:14 }}>Trade-Verlauf</div>
        {trades.length === 0 ? (
          <div style={{ textAlign:'center', padding:'30px', color:'var(--txt3)', fontSize:'0.8rem' }}>Noch keine Trades vorhanden</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.78rem' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Datum','Ticker','Name','Typ','Anzahl','Preis','Gesamt','Emotion','G/V'].map(h=>(
                    <th key={h} style={{ textAlign:'left', padding:'8px 10px', fontSize:'0.58rem', color:'var(--txt3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.slice(0,50).map((t,i) => (
                    <tr key={i} style={{ borderBottom:'1px solid var(--bl)' }}>
                      <td style={{ padding:'9px 10px', color:'var(--txt2)', whiteSpace:'nowrap' }}>{new Date(t.created_at).toLocaleDateString('de-DE')}</td>
                      <td style={{ padding:'9px 10px', fontFamily:'monospace', fontWeight:700, color:'var(--acc)', fontSize:'0.7rem' }}>{t.ticker}</td>
                      <td style={{ padding:'9px 10px', color:'var(--txt)', fontWeight:500, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name || t.ticker}</td>
                      <td style={{ padding:'9px 10px' }}>
                        <span style={{ background: t.action==='buy' ? 'rgba(6,95,46,0.12)' : 'rgba(160,16,8,0.1)', color: t.action==='buy' ? 'var(--green)' : 'var(--red)', padding:'2px 8px', borderRadius:4, fontWeight:600, fontSize:'0.65rem' }}>
                          {t.action==='buy'?'Kauf':'Verkauf'}
                        </span>
                      </td>
                      <td style={{ padding:'9px 10px', color:'var(--txt)' }}>{fmt(t.shares, 4)}</td>
                      <td style={{ padding:'9px 10px', color:'var(--txt)' }}>{fmt(t.price)} €</td>
                      <td style={{ padding:'9px 10px', fontWeight:600, color:'var(--txt)' }}>{fmt(t.total, 0)} €</td>
                      <td style={{ padding:'9px 10px', color:'var(--txt2)', fontSize:'0.7rem' }}>{t.emotion || '–'}</td>
                      <td style={{ padding:'9px 10px', color:'var(--txt3)' }}>–</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
