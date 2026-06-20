import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import api from '../../api'

const fmt = (n,d=2) => n==null?'–':Number(n).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d})
const PERIODS = [
  { label:'1W', value:'7d'  },
  { label:'1M', value:'1mo' },
  { label:'3M', value:'3mo' },
  { label:'6M', value:'6mo' },
  { label:'1J', value:'1y'  },
  { label:'5J', value:'5y'  },
]

export default function AssetDetail() {
  const { ticker } = useParams()
  const navigate   = useNavigate()
  const [info, setInfo]     = useState(null)
  const [chart, setChart]   = useState([])
  const [period, setPeriod] = useState('1mo')
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [wl, setWl]         = useState(false)
  const [trade, setTrade]   = useState({ open:false, type:'BUY', qty:'', eur:'', mode:'eur', note:'', emotion:'Neutral' })
  const [tradeMsg, setTradeMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [iR, cR] = await Promise.all([
          api.get(`/api/assets/${ticker}`),
          api.get(`/api/chart/${ticker}`, { params:{ period } }),
        ])
        setInfo(iR.data)
        setChart(cR.data.data || [])
      } catch(e){}
      setLoading(false)
    }
    load()
  }, [ticker])

  const loadChart = async (p) => {
    setPeriod(p)
    setChartLoading(true)
    try {
      const r = await api.get(`/api/chart/${ticker}`, { params:{ period:p } })
      setChart(r.data.data || [])
    } catch(e){}
    setChartLoading(false)
  }

  const addWatchlist = async () => {
    try {
      await api.post('/api/watchlist', { ticker, name: info?.name, asset_type: info?.type, category: info?.category })
      setWl(true)
    } catch(e){}
  }

  const execTrade = async () => {
    try {
      const price = info?.price || chart[chart.length-1]?.close || 100
      const shares = trade.mode === 'eur'
        ? Number(trade.eur) / price
        : Number(trade.qty)
      if (!shares || shares <= 0) { setTradeMsg('Ungültige Menge'); return }
      await api.post('/api/trade', {
        ticker, name: info?.name || ticker, asset_type: info?.type || 'stock',
        action: trade.type.toLowerCase(), shares,
        price, note: trade.note, emotion: trade.emotion,
      })
      setTradeMsg(`${trade.type==='BUY'?'Kauf':'Verkauf'} erfolgreich!`)
      setTimeout(()=>{ setTrade(t=>({...t,open:false})); setTradeMsg('') }, 2000)
    } catch(ex) {
      setTradeMsg(ex.response?.data?.detail || 'Fehler beim Trade')
    }
  }

  if (loading) return <div style={{ padding:60, color:'rgba(255,255,255,0.3)', textAlign:'center' }}>Lade {ticker}…</div>

  const prices  = chart.map(d=>d.close).filter(Boolean)
  const first   = prices[0] || 0
  const last    = prices[prices.length-1] || 0
  const delta   = last - first
  const deltaPct = first ? (delta/first)*100 : 0
  const up      = delta >= 0
  const price   = info?.price ?? last

  const livePrice  = info?.price || last || 0
  const effShares  = trade.mode==='eur'
    ? (livePrice > 0 ? Number(trade.eur||0) / livePrice : 0)
    : Number(trade.qty||0)
  const totalEur   = effShares * livePrice
  const tradeInp   = { width:'100%', background:'var(--s2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', fontSize:'0.9rem', color:'var(--txt)', outline:'none', fontFamily:'inherit', fontWeight:600 }

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 14px', fontSize:'0.75rem', color:'var(--txt)' }}>
        <div style={{ color:'var(--txt3)', marginBottom:2, fontSize:'0.6rem' }}>{label}</div>
        <div style={{ fontWeight:700, fontSize:'1rem' }}>{fmt(payload[0].value)} €</div>
      </div>
    )
  }

  return (
    <div style={{ padding:'28px 32px', minHeight:'100%' }}>

      {/* Back + header */}
      <div style={{ marginBottom:22 }}>
        <button onClick={()=>navigate(-1)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'0.78rem', marginBottom:16, padding:0 }}>
          ← Zurück
        </button>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <span style={{ fontSize:'0.8rem', fontFamily:'monospace', fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:'0.1em' }}>{ticker}</span>
              <span style={{ fontSize:'0.58rem', background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', padding:'2px 8px', borderRadius:10, textTransform:'uppercase', letterSpacing:'0.1em' }}>{info?.category}</span>
            </div>
            <div style={{ fontSize:'1.6rem', fontWeight:300, color:'#fff', letterSpacing:'-0.04em', marginBottom:10 }}>{info?.name}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:14 }}>
              <span style={{ fontSize:'2rem', fontWeight:700, color:'#fff', letterSpacing:'-0.04em' }}>{fmt(price)} €</span>
              <span style={{ fontSize:'1rem', fontWeight:600, color: up ? 'var(--green)' : 'var(--red)' }}>
                {up?'+':''}{fmt(delta)} ({up?'+':''}{fmt(deltaPct,2)}%)
              </span>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={addWatchlist} style={{ background: wl ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)', color: wl ? '#fff' : 'rgba(255,255,255,0.5)', padding:'10px 18px', borderRadius:8, cursor:'pointer', fontSize:'0.76rem', fontWeight:600 }}>
              {wl ? '★ Watchlist' : '☆ Watchlist'}
            </button>
            <button onClick={()=>setTrade(t=>({...t,open:true,type:'BUY'}))} style={{ background:'var(--green)', border:'none', color:'#fff', padding:'10px 20px', borderRadius:8, cursor:'pointer', fontSize:'0.82rem', fontWeight:600 }}>
              Kaufen
            </button>
            <button onClick={()=>setTrade(t=>({...t,open:true,type:'SELL'}))} style={{ background:'var(--red)', border:'none', color:'#fff', padding:'10px 20px', borderRadius:8, cursor:'pointer', fontSize:'0.82rem', fontWeight:600 }}>
              Verkaufen
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 22px', marginBottom:16 }}>
        <div style={{ display:'flex', gap:6, marginBottom:18 }}>
          {PERIODS.map(p => (
            <button key={p.value} onClick={()=>loadChart(p.value)} style={{
              padding:'5px 14px', borderRadius:16, border:`1px solid ${period===p.value?'var(--border)':'rgba(45,6,16,0.12)'}`,
              background: period===p.value ? 'var(--acc)' : 'transparent',
              color: period===p.value ? '#fff' : 'var(--txt3)',
              cursor:'pointer', fontSize:'0.72rem', fontWeight: period===p.value?600:400, transition:'all 0.12s',
            }}>{p.label}</button>
          ))}
        </div>

        {chartLoading ? (
          <div style={{ height:260, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--txt3)' }}>Lade Kursdaten…</div>
        ) : chart.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chart} margin={{ top:4, right:4, left:0, bottom:0 }}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={up?'#065f2e':'#a01008'} stopOpacity={0.18}/>
                  <stop offset="100%" stopColor={up?'#065f2e':'#a01008'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize:9, fill:'var(--txt3)' }} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
              <YAxis domain={['auto','auto']} tick={{ fontSize:9, fill:'var(--txt3)' }} axisLine={false} tickLine={false} width={70}
                tickFormatter={v=>`${fmt(v,0)} €`}/>
              <CartesianGrid vertical={false} stroke="var(--bl)" strokeDasharray="3 6"/>
              <Tooltip content={customTooltip}/>
              <Area type="monotone" dataKey="close" stroke={up?'#065f2e':'#a01008'} strokeWidth={2} fill="url(#cg)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height:260, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--txt3)', fontSize:'0.8rem' }}>
            Keine Kursdaten verfügbar
          </div>
        )}
      </div>

      {/* Info cards */}
      {info && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
          {[
            { label:'Sektor', value: info.sector || '–' },
            { label:'Region', value: info.region || '–' },
            { label:'Typ', value: info.type || '–' },
            { label:'Marktkapitalisierung', value: info.market_cap ? `${fmt(info.market_cap/1e9,1)} Mrd. €` : '–' },
            { label:'KGV', value: info.pe_ratio ? fmt(info.pe_ratio,1) : '–' },
            { label:'Dividendenrendite', value: info.dividend_yield ? `${fmt(info.dividend_yield*100,2)}%` : '–' },
          ].map((f,i) => (
            <div key={i} style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
              <div style={{ fontSize:'0.55rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:4 }}>{f.label}</div>
              <div style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--txt)' }}>{f.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Trade modal */}
      {trade.open && (
        <div style={{ position:'fixed', inset:0, background:'rgba(20,5,10,0.7)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}
          onClick={e=>e.target===e.currentTarget&&setTrade(t=>({...t,open:false}))}
        >
          <div style={{ background:'var(--s1)', borderRadius:14, padding:'28px 32px', width:380, border:'1px solid var(--border)', boxShadow:'0 32px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
              <div style={{ fontSize:'1rem', fontWeight:700, color:'var(--txt)' }}>{trade.type==='BUY'?'Kaufen':'Verkaufen'}: {ticker}</div>
              <button onClick={()=>setTrade(t=>({...t,open:false}))} style={{ background:'none', border:'none', color:'var(--txt3)', cursor:'pointer', fontSize:'1.2rem', lineHeight:1 }}>×</button>
            </div>

            {tradeMsg ? (
              <div style={{ padding:'16px', background: tradeMsg.includes('erfolgreich') ? 'rgba(6,95,46,0.1)' : 'rgba(160,16,8,0.1)', borderRadius:8, color: tradeMsg.includes('erfolgreich') ? 'var(--green)' : 'var(--red)', fontWeight:600, textAlign:'center', fontSize:'0.85rem' }}>
                {tradeMsg}
              </div>
            ) : (
              <>
                {/* Mode toggle */}
                <div style={{ display:'flex', gap:3, marginBottom:14, background:'var(--s2)', borderRadius:7, padding:3 }}>
                  {[['eur','Betrag (€)'],['qty','Anzahl']].map(([m,l]) => (
                    <button key={m} onClick={()=>setTrade(t=>({...t,mode:m}))} style={{
                      flex:1, padding:'7px', borderRadius:5, border:'none', cursor:'pointer', fontSize:'0.74rem', fontWeight:500,
                      background: trade.mode===m ? 'var(--acc)' : 'transparent',
                      color: trade.mode===m ? '#fff' : 'var(--txt3)',
                    }}>{l}</button>
                  ))}
                </div>

                <div style={{ marginBottom:14 }}>
                  {trade.mode==='eur' ? (
                    <>
                      <div style={{ fontSize:'0.6rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:6 }}>Betrag in Euro</div>
                      <input type="number" min={0.01} step={0.01} value={trade.eur} onChange={e=>setTrade(t=>({...t,eur:e.target.value}))}
                        placeholder="z.B. 50" style={tradeInp} autoFocus/>
                      {livePrice>0 && trade.eur && (
                        <div style={{ fontSize:'0.68rem', color:'var(--txt3)', marginTop:5 }}>
                          ≈ {effShares < 0.0001
                            ? effShares.toLocaleString('de-DE',{minimumFractionDigits:8,maximumFractionDigits:8})
                            : effShares < 1
                            ? effShares.toLocaleString('de-DE',{minimumFractionDigits:6,maximumFractionDigits:6})
                            : effShares.toLocaleString('de-DE',{minimumFractionDigits:4,maximumFractionDigits:4})
                          } {ticker}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:'0.6rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:6 }}>Anzahl Anteile</div>
                      <input type="number" min={0.000001} step="any" value={trade.qty} onChange={e=>setTrade(t=>({...t,qty:e.target.value}))}
                        placeholder="z.B. 0.001" style={tradeInp} autoFocus/>
                    </>
                  )}
                </div>

                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:'0.6rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:6 }}>Emotion</div>
                  <select value={trade.emotion} onChange={e=>setTrade(t=>({...t,emotion:e.target.value}))}
                    style={{ ...tradeInp, fontWeight:400 }}>
                    {['Optimistisch','Vorsichtig','Neutral','FOMO','Gierig'].map(em=><option key={em}>{em}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:'0.6rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:6 }}>Notiz (optional)</div>
                  <textarea value={trade.note} onChange={e=>setTrade(t=>({...t,note:e.target.value}))} rows={2}
                    style={{ ...tradeInp, fontWeight:400, resize:'vertical' }}
                    placeholder="Begründung für diesen Trade…"/>
                </div>

                <div style={{ background:'var(--s2)', borderRadius:8, padding:'10px 14px', marginBottom:18, fontSize:'0.8rem', color:'var(--txt2)' }}>
                  Gesamtvolumen: <strong style={{ color:'var(--txt)' }}>{fmt(totalEur, 2)} €</strong>
                </div>
                <button onClick={execTrade} disabled={totalEur<=0} style={{
                  width:'100%', padding:'12px', background: trade.type==='BUY' ? 'var(--green)' : 'var(--red)',
                  border:'none', color:'#fff', borderRadius:8, fontWeight:700, fontSize:'0.9rem', cursor:'pointer', opacity:totalEur<=0?0.4:1,
                }}>
                  {trade.type==='BUY' ? `Kaufen — ${fmt(totalEur,2)} €` : `Verkaufen — ${fmt(totalEur,2)} €`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
