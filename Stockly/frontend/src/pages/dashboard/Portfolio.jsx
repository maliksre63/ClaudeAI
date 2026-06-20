import { useState, useEffect } from 'react'
import { useAuth } from '../../AuthContext'
import api from '../../api'
import { PieChart, Pie, Cell, Tooltip, Legend, LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area } from 'recharts'

const fmt    = (n, d=2) => n == null ? '–' : Number(n).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d})
const fmtPct = (n)      => n == null ? '–' : `${n>=0?'+':''}${fmt(n,2)}%`

const pLbl = { fontSize:'0.58rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.18em' }
const cLbl = { fontSize:'0.58rem', color:'var(--txt2)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.14em' }
const card  = { background:'var(--s1)', border:'1px solid var(--border)', borderRadius:8, padding:'18px 22px' }
const th    = { padding:'10px 16px', borderBottom:'1px solid var(--border)', textAlign:'left', fontSize:'0.58rem', color:'var(--txt2)', textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:600 }
const td    = { padding:'13px 16px', borderBottom:'1px solid var(--bl)', fontVariantNumeric:'tabular-nums', fontSize:'0.82rem', color:'var(--txt)', fontWeight:500 }
const inp   = { width:'100%', background:'var(--s2)', border:'1px solid var(--border)', color:'var(--txt)', padding:'8px 11px', borderRadius:5, fontSize:'0.82rem', outline:'none' }

/* ── Invest-Panel Modal ── */
function InvestPanel({ pos, user, onClose, onDone }) {
  const [mode, setMode]           = useState('buy')
  const [inputType, setInputType] = useState('shares')
  const [value, setValue]         = useState('')
  const [note, setNote]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [err, setErr]             = useState('')

  const price  = pos.current_price || pos.avg_price
  const shares = inputType === 'shares' ? parseFloat(value)||0 : price>0 ? (parseFloat(value)||0)/price : 0
  const eur    = inputType === 'eur'    ? parseFloat(value)||0 : shares * price
  const gv     = mode === 'sell' ? (price - pos.avg_price) * shares : null

  const execute = async () => {
    setErr('')
    if (!shares || shares <= 0) return setErr('Bitte einen Betrag eingeben.')
    if (mode==='sell' && shares > pos.shares) return setErr(`Maximum: ${fmt(pos.shares,4)} Anteile`)
    setLoading(true)
    try {
      await api.post('/api/trade', { ticker:pos.ticker, name:pos.name, asset_type:pos.asset_type||'stock', action:mode, shares, price, note })
      onDone(); onClose()
    } catch(e) { setErr(e.response?.data?.detail||'Fehler') }
    setLoading(false)
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(30,4,10,0.65)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:14, padding:32, maxWidth:460, width:'100%', boxShadow:'0 32px 80px rgba(61,10,20,0.35)' }}>

        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:'1.3rem', fontWeight:600, letterSpacing:'-0.03em', color:'var(--txt)', marginBottom:6 }}>{pos.name}</div>
          <div style={{ display:'flex', gap:16, fontSize:'0.72rem', color:'var(--txt2)', flexWrap:'wrap' }}>
            <span style={{ fontFamily:'monospace', fontWeight:700, color:'var(--acc)' }}>{pos.ticker}</span>
            <span>Ø Kauf: <strong>{fmt(pos.avg_price)} €</strong></span>
            <span>Aktuell: <strong>{fmt(pos.current_price||pos.avg_price)} €</strong></span>
            <span>Bestand: <strong>{fmt(pos.shares,4)} Stk.</strong></span>
          </div>
        </div>

        {/* Modus */}
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          {[['buy','Mehr kaufen'],['sell','Teilverkauf']].map(([m,l])=>(
            <button key={m} onClick={()=>{setMode(m);setValue('');setErr('')}} style={{
              flex:1, padding:'10px', borderRadius:7, cursor:'pointer', fontWeight:600, fontSize:'0.82rem',
              border:`1.5px solid ${mode===m?'var(--acc)':'var(--border)'}`,
              background: mode===m ? 'var(--acc)' : 'var(--s2)',
              color: mode===m ? '#fff' : 'var(--txt2)',
              transition:'all 0.15s',
            }}>{l}</button>
          ))}
        </div>

        {/* Eingabe-Art */}
        <div style={{ display:'flex', gap:6, marginBottom:14 }}>
          {[['shares','Stückzahl'],['eur','Euro']].map(([t,l])=>(
            <button key={t} onClick={()=>{setInputType(t);setValue('')}} style={{
              padding:'5px 16px', borderRadius:20, cursor:'pointer', fontSize:'0.72rem', fontWeight:500,
              border:`1px solid ${inputType===t?'var(--acc-b)':'var(--border)'}`,
              background: inputType===t ? 'var(--acc-l)' : 'transparent',
              color: inputType===t ? 'var(--acc)' : 'var(--txt3)',
              transition:'all 0.15s',
            }}>{l}</button>
          ))}
        </div>

        {/* Eingabe */}
        <div style={{ marginBottom:16 }}>
          <div style={{ ...cLbl, marginBottom:6 }}>{inputType==='shares'?'Anzahl Anteile':'Betrag in Euro'}</div>
          <div style={{ position:'relative' }}>
            <input style={{ ...inp, paddingRight:44, fontSize:'0.95rem', padding:'10px 44px 10px 12px' }}
              type="number" min="0" step={inputType==='shares'?'0.0001':'1'}
              value={value} onChange={e=>setValue(e.target.value)}
              placeholder={inputType==='shares'?'0,0000':'0,00'} autoFocus />
            <span style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', fontSize:'0.76rem', color:'var(--txt2)', fontWeight:600 }}>
              {inputType==='shares'?'Stk.':'€'}
            </span>
          </div>
        </div>

        {/* Live-Vorschau */}
        {shares > 0 && (
          <div style={{ background:'var(--s2)', border:'1px solid var(--border)', borderRadius:8, padding:'14px 16px', marginBottom:16 }}>
            {[
              ['Anteile', fmt(shares,4), 'var(--txt)'],
              [mode==='buy'?'Kosten':'Erlös', fmt(eur)+' €', 'var(--txt)'],
              ...(mode==='sell'&&gv!=null ? [['G/V Transaktion', `${gv>=0?'+':''}${fmt(gv)} €`, gv>=0?'var(--green)':'var(--red)']] : []),
            ].map(([l,v,c],i,arr)=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', paddingTop:i>0?8:0, marginTop:i>0?0:0, borderTop:i===arr.length-1&&arr.length>2?'1px solid var(--border)':i>1?'1px solid var(--border)':'none', paddingBottom:i<arr.length-1?8:0 }}>
                <span style={{ color:'var(--txt2)' }}>{l}</span>
                <span style={{ fontVariantNumeric:'tabular-nums', fontWeight:600, color:c }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notiz */}
        <div style={{ marginBottom:16 }}>
          <div style={{ ...cLbl, marginBottom:6 }}>Notiz <span style={{ fontWeight:400, opacity:0.5, textTransform:'none', letterSpacing:0, fontSize:'0.68rem' }}>— optional, warum kaufst/verkaufst du?</span></div>
          <textarea
            style={{ ...inp, resize:'vertical', minHeight:62, lineHeight:1.5, fontSize:'0.8rem', paddingTop:9 }}
            placeholder="z.B. RSI überverkauft, guter Einstiegspunkt …"
            value={note} onChange={e=>setNote(e.target.value)} maxLength={500}
          />
        </div>

        {err && <div style={{ color:'var(--red)', fontSize:'0.76rem', marginBottom:12, fontWeight:500 }}>{err}</div>}

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={execute} disabled={loading||!value} style={{
            flex:1, padding:'12px', borderRadius:7, fontWeight:600, fontSize:'0.84rem',
            cursor:loading||!value?'not-allowed':'pointer',
            background: mode==='buy'?'var(--green)':'var(--red)',
            border:'none', color:'#fff',
            opacity:loading||!value?0.4:1, transition:'opacity 0.15s',
          }}>
            {loading ? 'Verarbeite …' : mode==='buy' ? `Kaufen · ${fmt(eur)} €` : `Verkaufen · ${fmt(eur)} €`}
          </button>
          <button onClick={onClose} style={{ padding:'12px 18px', borderRadius:7, cursor:'pointer', fontSize:'0.78rem', border:'1px solid var(--border)', background:'transparent', color:'var(--txt2)', fontWeight:500 }}>✕</button>
        </div>
      </div>
    </div>
  )
}

/* ── Position Chart Modal ── */
function PositionChartModal({ pos, user, onClose, onDone }) {
  const [chartData, setChartData]   = useState([])
  const [period, setPeriod]         = useState('1mo')
  const [extended, setExtended]     = useState(null)
  const [showTrade, setShowTrade]   = useState(false)
  const [tradeMode, setTradeMode]   = useState('buy')
  const [shares, setShares]         = useState('')
  const [note, setNote]             = useState('')
  const [loading, setLoading]       = useState(false)
  const [err, setErr]               = useState('')

  const PERIODS = [['1W','1wk'],['1M','1mo'],['3M','3mo'],['6M','6mo'],['1J','1y']]

  useEffect(()=>{
    api.get(`/api/chart/${pos.ticker}?period=${period}`).then(r=>{
      setChartData(r.data.data||[])
    }).catch(()=>{})
    api.get(`/api/assets/${pos.ticker}/extended`).then(r=>setExtended(r.data)).catch(()=>{})
  },[pos.ticker, period])

  const price = pos.current_price || pos.avg_price
  const eur   = parseFloat(shares||0) * price
  const lv    = chartData.length ? chartData[chartData.length-1]?.close : null
  const fv    = chartData.length ? chartData[0]?.close : null
  const trend = lv && fv ? ((lv-fv)/fv*100) : 0

  const execute = async () => {
    setErr('')
    const s = parseFloat(shares)
    if (!s || s<=0) return setErr('Bitte Stückzahl eingeben.')
    if (tradeMode==='sell' && s > pos.shares) return setErr(`Max: ${pos.shares} Stk.`)
    setLoading(true)
    try {
      await api.post('/api/trade', { ticker:pos.ticker, name:pos.name, asset_type:pos.asset_type||'stock', action:tradeMode, shares:s, price, note })
      onDone(); onClose()
    } catch(e) { setErr(e.response?.data?.detail||'Fehler') }
    setLoading(false)
  }

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,padding:28,maxWidth:700,width:'100%',boxShadow:'0 32px 80px rgba(0,0,0,0.5)',maxHeight:'90vh',overflowY:'auto' }}>

        {/* Header */}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16 }}>
          <div>
            <div style={{ fontSize:'0.62rem',fontFamily:'monospace',color:'var(--acc)',letterSpacing:'0.12em',marginBottom:3 }}>{pos.ticker}</div>
            <div style={{ fontSize:'1.2rem',fontWeight:600,color:'var(--txt)' }}>{pos.name}</div>
            <div style={{ fontSize:'0.8rem',color:'var(--txt3)',marginTop:4,display:'flex',gap:16 }}>
              <span>Ø Kauf: <strong style={{color:'var(--txt)'}}>{fmt(pos.avg_price)} €</strong></span>
              <span>Bestand: <strong style={{color:'var(--txt)'}}>{fmt(pos.shares,4)} Stk.</strong></span>
              {extended?.week52_high && <span>52W H: <strong style={{color:'var(--green)'}}>{fmt(extended.week52_high)} €</strong></span>}
              {extended?.week52_low  && <span>52W T: <strong style={{color:'var(--red)'}}>{fmt(extended.week52_low)} €</strong></span>}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:'1.4rem',fontWeight:300,color:'var(--txt)' }}>{fmt(price)} €</div>
            <div style={{ fontSize:'0.8rem',fontWeight:600,color:trend>=0?'var(--green)':'var(--red)' }}>
              {trend>=0?'▲':'▼'} {Math.abs(trend).toFixed(2)}% ({period})
            </div>
          </div>
        </div>

        {/* Period selector */}
        <div style={{ display:'flex',gap:6,marginBottom:14 }}>
          {PERIODS.map(([l,v])=>(
            <button key={v} onClick={()=>setPeriod(v)} style={{
              padding:'4px 12px',borderRadius:20,border:`1px solid ${period===v?'var(--acc)':'var(--border)'}`,
              background:period===v?'var(--acc)':'transparent',color:period===v?'#fff':'var(--txt3)',
              fontSize:'0.72rem',cursor:'pointer',fontFamily:'inherit',
            }}>{l}</button>
          ))}
        </div>

        {/* Chart */}
        <div style={{ height:200,marginBottom:16 }}>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{top:0,right:0,bottom:0,left:0}}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={trend>=0?'#15803d':'#c0392b'} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={trend>=0?'#15803d':'#c0392b'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{fontSize:10,fill:'var(--txt3)'}} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                <YAxis domain={['auto','auto']} tick={{fontSize:10,fill:'var(--txt3)'}} tickLine={false} axisLine={false} tickFormatter={v=>v.toFixed(0)} width={45}/>
                <Tooltip contentStyle={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:8,fontSize:'0.74rem'}} formatter={(v)=>[`${fmt(v)} €`,'Kurs']}/>
                <Area type="monotone" dataKey="close" stroke={trend>=0?'#15803d':'#c0392b'} strokeWidth={1.5} fill="url(#chartGrad)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--txt3)',fontSize:'0.82rem' }}>Lade Chart…</div>
          )}
        </div>

        {/* Buy/Sell toggle */}
        {!showTrade ? (
          <div style={{ display:'flex',gap:10 }}>
            <button onClick={()=>{setShowTrade(true);setTradeMode('buy')}} style={{ flex:1,padding:'11px',background:'var(--green)',border:'none',borderRadius:8,color:'#fff',fontWeight:600,fontSize:'0.84rem',cursor:'pointer',fontFamily:'inherit' }}>
              Kaufen
            </button>
            <button onClick={()=>{setShowTrade(true);setTradeMode('sell')}} style={{ flex:1,padding:'11px',background:'var(--red)',border:'none',borderRadius:8,color:'#fff',fontWeight:600,fontSize:'0.84rem',cursor:'pointer',fontFamily:'inherit' }}>
              Verkaufen
            </button>
            <button onClick={onClose} style={{ padding:'11px 18px',background:'transparent',border:'1px solid var(--border)',borderRadius:8,color:'var(--txt2)',fontSize:'0.82rem',cursor:'pointer',fontFamily:'inherit' }}>✕</button>
          </div>
        ) : (
          <div>
            <div style={{ display:'flex',gap:8,marginBottom:14 }}>
              {[['buy','Kaufen'],['sell','Verkaufen']].map(([m,l])=>(
                <button key={m} onClick={()=>{setTradeMode(m);setShares('');setErr('')}} style={{
                  flex:1,padding:'9px',borderRadius:7,cursor:'pointer',fontWeight:600,fontSize:'0.82rem',fontFamily:'inherit',
                  border:`1.5px solid ${tradeMode===m?'var(--acc)':'var(--border)'}`,
                  background:tradeMode===m?'var(--acc)':'var(--s2)',
                  color:tradeMode===m?'#fff':'var(--txt2)',
                }}>{l}</button>
              ))}
            </div>
            <input
              type="number" min="0" step="0.0001" value={shares}
              onChange={e=>setShares(e.target.value)}
              placeholder="Anzahl Anteile…"
              style={{ width:'100%',boxSizing:'border-box',background:'var(--s2)',border:'1px solid var(--border)',color:'var(--txt)',padding:'10px 12px',borderRadius:8,fontSize:'0.88rem',outline:'none',fontFamily:'inherit',marginBottom:8 }}
            />
            {shares && <div style={{ fontSize:'0.76rem',color:'var(--txt3)',marginBottom:8 }}>≈ {fmt(eur)} €</div>}
            <input
              value={note} onChange={e=>setNote(e.target.value)}
              placeholder="Notiz (optional)…"
              style={{ width:'100%',boxSizing:'border-box',background:'var(--s2)',border:'1px solid var(--border)',color:'var(--txt)',padding:'9px 12px',borderRadius:8,fontSize:'0.82rem',outline:'none',fontFamily:'inherit',marginBottom:10 }}
            />
            {err && <div style={{ color:'var(--red)',fontSize:'0.76rem',marginBottom:8 }}>{err}</div>}
            <div style={{ display:'flex',gap:8 }}>
              <button onClick={execute} disabled={loading||!shares} style={{
                flex:1,padding:'11px',borderRadius:8,border:'none',color:'#fff',fontWeight:600,fontSize:'0.84rem',fontFamily:'inherit',
                cursor:loading||!shares?'not-allowed':'pointer',
                background:tradeMode==='buy'?'var(--green)':'var(--red)',
                opacity:loading||!shares?0.5:1,
              }}>
                {loading?'…':tradeMode==='buy'?`Kaufen · ${fmt(eur)} €`:`Verkaufen · ${fmt(eur)} €`}
              </button>
              <button onClick={()=>setShowTrade(false)} style={{ padding:'11px 16px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--txt2)',fontSize:'0.82rem',cursor:'pointer',fontFamily:'inherit' }}>Zurück</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Portfolio Timeline Chart ── */
function TimelineChart() {
  const [data, setData]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    api.get('/api/portfolio/timeline').then(r=>{
      setData(r.data.timeline||[])
    }).catch(()=>{}).finally(()=>setLoading(false))
  },[])

  if (loading) return <div style={{ height:200,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--txt3)',fontSize:'0.82rem' }}>Lade Timeline…</div>
  if (!data.length) return null

  const hasSP  = data.some(d=>d.sp500!=null)
  const hasDAX = data.some(d=>d.dax!=null)

  return (
    <div style={{ background:'var(--s1)',border:'1px solid var(--border)',borderRadius:8,padding:'18px 22px',marginBottom:24 }}>
      <div style={{ fontSize:'0.6rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.16em',marginBottom:4 }}>Portfolio-Entwicklung vs. Benchmark</div>
      <div style={{ display:'flex',gap:20,marginBottom:14,fontSize:'0.72rem' }}>
        <span style={{ color:'var(--acc)' }}>— Mein Portfolio</span>
        {hasSP  && <span style={{ color:'#3b82f6' }}>— S&amp;P 500</span>}
        {hasDAX && <span style={{ color:'#f59e0b' }}>— DAX</span>}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{top:0,right:0,bottom:0,left:0}}>
          <XAxis dataKey="date" tick={{fontSize:10,fill:'var(--txt3)'}} tickLine={false} axisLine={false} interval={Math.floor(data.length/6)}/>
          <YAxis tick={{fontSize:10,fill:'var(--txt3)'}} tickLine={false} axisLine={false} tickFormatter={v=>`${v>=0?'+':''}${v.toFixed(1)}%`} width={52}/>
          <Tooltip contentStyle={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:8,fontSize:'0.74rem'}}
            formatter={(v,n)=>[`${v>=0?'+':''}${v.toFixed(2)}%`, n==='portfolio_pct'?'Portfolio':n==='sp500'?'S&P 500':'DAX']}/>
          <Line type="monotone" dataKey="portfolio_pct" stroke="var(--acc)" strokeWidth={2} dot={false} name="portfolio_pct"/>
          {hasSP  && <Line type="monotone" dataKey="sp500" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="sp500"/>}
          {hasDAX && <Line type="monotone" dataKey="dax"   stroke="#f59e0b" strokeWidth={1.5} dot={false} name="dax"/>}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Portfolio() {
  const { user, refreshUser } = useAuth()
  const [port, setPort]         = useState(null)
  const [trades, setTrades]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [chartPos, setChartPos] = useState(null)
  const [riskData, setRiskData]   = useState(null)
  const [corrData, setCorrData]   = useState(null)
  const [riskLoading, setRiskLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const [p, t] = await Promise.all([
      api.get('/api/portfolio/value').then(r=>r.data).catch(()=>null),
      api.get('/api/trades?limit=50').then(r=>r.data).catch(()=>[]),
    ])
    setPort(p); setTrades(t); setLoading(false)
  }
  useEffect(()=>{ load() },[])

  useEffect(()=>{
    setRiskLoading(true)
    Promise.all([
      api.get('/api/portfolio/risk').then(r=>r.data).catch(()=>null),
      api.get('/api/portfolio/correlation').then(r=>r.data).catch(()=>null),
    ]).then(([risk, corr])=>{ setRiskData(risk); setCorrData(corr); setRiskLoading(false) })
  },[])

  const pnl    = port?.total_pnl
  const pnlPct = port && port.total_invested > 0 ? pnl / port.total_invested * 100 : null

  return (
    <div style={{ padding:'28px 32px', minHeight:'100%' }}>

      {/* ── Seitentitel ── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:6 }}>Portfolio</div>
        <div style={{ fontSize:'1.4rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff' }}>Meine Investments</div>
      </div>

      {/* ── Timeline & Benchmark ── */}
      <TimelineChart />

      {/* ── KPI-Übersicht ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10, marginBottom:36 }}>
        {[
          ['Positionen',     (port?.position_count ?? 0) + ' Assets',  'var(--txt)'],
          ['Investiert',     fmt(port?.total_invested)+' €',            'var(--txt)'],
          ['Aktueller Wert', fmt(port?.total_current)+' €',             'var(--txt)'],
        ].map(([l,v,c])=>(
          <div key={l} style={card}>
            <div style={cLbl}>{l}</div>
            <div style={{ fontSize:'1.25rem', fontWeight:700, marginTop:6, fontVariantNumeric:'tabular-nums', letterSpacing:'-0.02em', color:c }}>{v}</div>
          </div>
        ))}
        <div style={card}>
          <div style={cLbl}>Gewinn / Verlust</div>
          <div style={{ fontSize:'1.25rem', fontWeight:700, marginTop:6, fontVariantNumeric:'tabular-nums', letterSpacing:'-0.02em', color:(pnl||0)>=0?'var(--green)':'var(--red)' }}>
            {pnl != null ? `${pnl>=0?'+':''}${fmt(pnl)} €` : '–'}
            {pnlPct != null && <span style={{ fontSize:'0.72rem', marginLeft:8, fontWeight:500, opacity:0.7 }}>{fmtPct(pnlPct)}</span>}
          </div>
        </div>
      </div>

      {/* ── Allokation Donut ── */}
      {port?.positions?.length > 0 && (() => {
        const typeLabel = { stock:'Aktien', crypto:'Krypto', etf:'ETF', bond:'Anleihen', commodity:'Rohstoffe', index:'Index' }
        const typeColors = { Aktien:'#6b1220', Krypto:'#a01008', ETF:'#065f2e', Anleihen:'#92400e', Rohstoffe:'#b07060', Index:'#4a6080', Sonstige:'#888' }
        const byType = {}
        for (const p of port.positions) {
          const label = typeLabel[p.asset_type] || 'Sonstige'
          byType[label] = (byType[label] || 0) + (p.current_value || p.invested || 0)
        }
        const total = Object.values(byType).reduce((s,v)=>s+v,0)
        const data  = Object.entries(byType).map(([name,value])=>({ name, value:parseFloat(value.toFixed(2)), pct:total>0?((value/total)*100).toFixed(1):'0' }))
        return (
          <div style={{ ...card, marginBottom:32, display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
            <div>
              <div style={{ ...pLbl, marginBottom:4 }}>Portfolio-Allokation</div>
              <PieChart width={180} height={180}>
                <Pie data={data} dataKey="value" cx={85} cy={85} innerRadius={52} outerRadius={82} paddingAngle={3} startAngle={90} endAngle={-270}>
                  {data.map((e)=><Cell key={e.name} fill={typeColors[e.name]||'#888'} stroke="none"/>)}
                </Pie>
                <Tooltip formatter={(v,n,p)=>[`${p.payload.pct}% · ${fmt(v)} €`, n]} contentStyle={{ background:'var(--s2)', border:'1px solid var(--border)', borderRadius:8, fontSize:'0.78rem' }}/>
              </PieChart>
            </div>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
              {data.map(d=>(
                <div key={d.name} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:typeColors[d.name]||'#888', flexShrink:0 }}/>
                  <div style={{ flex:1, fontSize:'0.8rem', color:'var(--txt)', fontWeight:500 }}>{d.name}</div>
                  <div style={{ fontSize:'0.8rem', fontVariantNumeric:'tabular-nums', color:'var(--txt2)' }}>{d.pct}%</div>
                  <div style={{ fontSize:'0.8rem', fontVariantNumeric:'tabular-nums', color:'var(--txt)', fontWeight:600, minWidth:80, textAlign:'right' }}>{fmt(d.value)} €</div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── Positionen ── */}
      <div style={{ marginBottom:36 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div style={pLbl}>Offene Positionen — Klicken für Chart + Trade</div>
          <button onClick={load} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.5)', padding:'5px 14px', borderRadius:5, fontSize:'0.7rem', cursor:'pointer', letterSpacing:'0.02em' }}>
            Kurse aktualisieren
          </button>
        </div>

        {loading ? (
          <div style={{ padding:'48px', color:'rgba(255,255,255,0.3)', textAlign:'center', fontSize:'0.8rem' }}>Lade …</div>
        ) : !port?.positions?.length ? (
          <div style={{ ...card, padding:'48px', textAlign:'center' }}>
            <div style={{ fontSize:'0.9rem', color:'var(--txt2)', marginBottom:6 }}>Noch keine offenen Positionen</div>
            <div style={{ fontSize:'0.75rem', color:'var(--txt3)' }}>Kaufe Aktien oder Kryptos im Reiter Märkte</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:12 }}>
            {port.positions.map(p => {
              const gain = (p.pnl || 0) >= 0
              return (
                <div key={p.id} onClick={()=>setChartPos(p)} style={{
                  ...card, cursor:'pointer', position:'relative', overflow:'hidden', padding:'20px 22px 16px',
                  transition:'box-shadow 0.18s, transform 0.18s',
                }}
                  onMouseEnter={e=>{ e.currentTarget.style.boxShadow='0 8px 28px rgba(61,10,20,0.18)'; e.currentTarget.style.transform='translateY(-2px)' }}
                  onMouseLeave={e=>{ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)' }}
                >
                  {/* Farbstreifen */}
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:gain?'var(--green)':'var(--red)' }}/>

                  {/* Kopf */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, paddingTop:4 }}>
                    <div>
                      <div style={{ fontSize:'0.7rem', fontFamily:'monospace', fontWeight:700, color:'var(--acc)', letterSpacing:'0.1em', marginBottom:3 }}>{p.ticker}</div>
                      <div style={{ fontSize:'0.88rem', fontWeight:600, color:'var(--txt)' }}>{p.name||p.ticker}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'1.05rem', fontWeight:700, fontVariantNumeric:'tabular-nums', color:gain?'var(--green)':'var(--red)' }}>
                        {p.pnl != null ? `${gain?'+':''}${fmt(p.pnl)} €` : '–'}
                      </div>
                      <div style={{ fontSize:'0.7rem', fontWeight:600, color:gain?'var(--green)':'var(--red)', fontVariantNumeric:'tabular-nums' }}>
                        {p.pnl_pct != null ? fmtPct(p.pnl_pct) : ''}
                      </div>
                    </div>
                  </div>

                  {/* Kennzahlen */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 0', borderTop:'1px solid var(--border)', paddingTop:14 }}>
                    {[
                      ['Anteile',     fmt(p.shares,4)],
                      ['Akt. Kurs',   fmt(p.current_price)+' €'],
                      ['Ø Kaufpreis', fmt(p.avg_price)+' €'],
                      ['Akt. Wert',   fmt(p.current_value)+' €'],
                    ].map(([l,v])=>(
                      <div key={l}>
                        <div style={{ fontSize:'0.56rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:2, fontWeight:600 }}>{l}</div>
                        <div style={{ fontSize:'0.8rem', fontVariantNumeric:'tabular-nums', color:'var(--txt)', fontWeight:600 }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:14, textAlign:'center', fontSize:'0.64rem', color:'var(--txt3)', letterSpacing:'0.06em', fontWeight:500 }}>
                    Chart + Trade →
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Trade-Verlauf ── */}
      <div>
        <div style={{ ...pLbl, marginBottom:14 }}>Trade-Verlauf</div>
        {!trades.length ? (
          <div style={{ ...card, padding:'40px', textAlign:'center', color:'var(--txt3)' }}>Noch keine Trades.</div>
        ) : (
          <div style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead style={{ background:'var(--s2)' }}>
                <tr>{['Typ','Asset','Stück','Preis','Gesamt','Emotion','Notiz','Datum'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {trades.map(t=>(
                  <tr key={t.id} onMouseEnter={e=>e.currentTarget.style.background='var(--s2)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{ transition:'background 0.1s' }}>
                    <td style={td}>
                      <span style={{ fontSize:'0.6rem', fontWeight:700, padding:'3px 8px', borderRadius:4, letterSpacing:'0.08em', background:t.action==='buy'?'var(--green-l)':'var(--red-l)', color:t.action==='buy'?'var(--green)':'var(--red)' }}>
                        {t.action==='buy'?'KAUF':'VERKAUF'}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight:600 }}>{t.name||t.ticker}</td>
                    <td style={td}>{fmt(t.shares,4)}</td>
                    <td style={td}>{fmt(t.price)} €</td>
                    <td style={{ ...td, fontWeight:700 }}>{fmt(t.total)} €</td>
                    <td style={{ ...td, color:'var(--txt2)' }}>{t.emotion||'–'}</td>
                    <td style={{ ...td, color:'var(--txt2)', fontSize:'0.75rem', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={t.note||''}>{t.note||'–'}</td>
                    <td style={{ ...td, color:'var(--txt2)', fontSize:'0.76rem' }}>{t.created_at?.slice(0,16).replace('T',' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Risiko-Score ── */}
      {!riskLoading && riskData && riskData.score > 0 && (() => {
        const scoreColor = riskData.score < 30 ? '#6ee7a0' : riskData.score < 55 ? '#fbbf24' : riskData.score < 75 ? '#fb923c' : '#f87171'
        const arc = (v) => {
          const pct = Math.min(100, v) / 100
          const r = 52; const cx = 70; const cy = 70
          const startAngle = Math.PI; const endAngle = 0
          const angle = startAngle + pct * (endAngle - startAngle)
          const x1 = cx + r * Math.cos(startAngle); const y1 = cy - r * Math.sin(startAngle)
          const x2 = cx + r * Math.cos(angle);       const y2 = cy - r * Math.sin(angle)
          return `M ${x1} ${y1} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${x2} ${y2}`
        }
        return (
          <div style={{ marginBottom:32 }}>
            <div style={{ ...pLbl, marginBottom:14 }}>Portfolio-Analyse</div>
            <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:20, ...card, alignItems:'center', padding:'20px 24px' }}>
              <div style={{ textAlign:'center' }}>
                <svg width={140} height={80} style={{ overflow:'visible' }}>
                  <path d={arc(100)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} strokeLinecap="round"/>
                  <path d={arc(riskData.score)} fill="none" stroke={scoreColor} strokeWidth={10} strokeLinecap="round"/>
                  <text x={70} y={72} textAnchor="middle" fill={scoreColor} fontSize={22} fontWeight={700}>{riskData.score}</text>
                  <text x={70} y={86} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={10}>{riskData.rating}</text>
                </svg>
                <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.3)', marginTop:4 }}>Risiko-Score</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                {[
                  ['Konzentration', `${riskData.details.konzentration}/40`, riskData.details.konzentration > 25 ? '#f87171' : '#fbbf24'],
                  ['Volatilität', `${riskData.details.volatilitaet}/40`, riskData.details.volatilitaet > 25 ? '#f87171' : '#fbbf24'],
                  ['Jahresvolatilität', `${riskData.details.jahres_vol}%`, 'rgba(255,255,255,0.7)'],
                  ['Positionen', riskData.details.num_assets, riskData.details.num_assets < 3 ? '#f87171' : '#6ee7a0'],
                  ['Diversifikation', `-${riskData.details.diversifikation}/20`, riskData.details.diversifikation > 15 ? '#f87171' : '#fbbf24'],
                  ['Bewertung', riskData.rating, scoreColor],
                ].map(([l,v,c]) => (
                  <div key={l} style={{ background:'rgba(0,0,0,0.15)', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:'0.56rem', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:'0.9rem', fontWeight:700, color:c, fontVariantNumeric:'tabular-nums' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Korrelationsmatrix ── */}
      {!riskLoading && corrData && corrData.tickers?.length >= 2 && (() => {
        const tks = corrData.tickers
        const mx  = corrData.matrix
        const names = corrData.names || {}
        const corrColor = (v) => {
          if (v === null) return 'rgba(255,255,255,0.05)'
          if (v >= 0.8)  return 'rgba(220,38,38,0.5)'
          if (v >= 0.5)  return 'rgba(220,38,38,0.2)'
          if (v >= 0.2)  return 'rgba(255,255,255,0.1)'
          if (v >= -0.2) return 'rgba(255,255,255,0.06)'
          if (v >= -0.5) return 'rgba(6,95,46,0.2)'
          return 'rgba(6,95,46,0.45)'
        }
        return (
          <div style={{ marginBottom:32 }}>
            <div style={{ ...pLbl, marginBottom:4 }}>Korrelationsmatrix</div>
            <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.25)', marginBottom:14 }}>
              +1 = stark korreliert (bewegen sich gleich) · 0 = unabhängig · -1 = negativ korreliert (Hedge)
            </div>
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:16, overflowX:'auto' }}>
              <table style={{ borderCollapse:'collapse', fontSize:'0.72rem' }}>
                <thead>
                  <tr>
                    <th style={{ padding:'6px 10px', color:'rgba(255,255,255,0.3)', textAlign:'left', fontSize:'0.6rem', whiteSpace:'nowrap' }}></th>
                    {tks.map(t => (
                      <th key={t} style={{ padding:'6px 10px', color:'rgba(255,255,255,0.5)', fontSize:'0.65rem', textAlign:'center', whiteSpace:'nowrap' }}>
                        {t.replace('.DE','').replace('-USD','').slice(0,6)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tks.map((r, ri) => (
                    <tr key={r}>
                      <td style={{ padding:'6px 10px', color:'rgba(255,255,255,0.5)', fontSize:'0.65rem', whiteSpace:'nowrap', paddingRight:14 }}>
                        {r.replace('.DE','').replace('-USD','').slice(0,6)}
                      </td>
                      {tks.map((c, ci) => {
                        const v = mx[ri]?.[ci]
                        const isDiag = ri === ci
                        return (
                          <td key={c} style={{
                            padding:'8px 12px', textAlign:'center',
                            background: isDiag ? 'rgba(107,18,32,0.3)' : corrColor(v),
                            borderRadius:4, margin:2,
                            color: isDiag ? '#fff' : v === null ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)',
                            fontWeight: isDiag ? 700 : 500, fontVariantNumeric:'tabular-nums',
                            fontSize:'0.74rem',
                          }}>
                            {isDiag ? '1.00' : v != null ? v.toFixed(2) : '–'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {chartPos && <PositionChartModal pos={chartPos} user={user} onClose={()=>setChartPos(null)} onDone={()=>{ load(); refreshUser() }}/>}
    </div>
  )
}
