import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../AuthContext'
import api from '../../api'

const RISK_CONF = { konservativ:{pct:1.5,sl:5,tp:10}, moderat:{pct:4,sl:8,tp:20}, aggressiv:{pct:8,sl:15,tp:40} }
const fmt = (n, d=2) => n==null?'–':Number(n).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d})
const fmtPrice = n => {
  if (n == null) return '–'
  const v = Number(n), a = Math.abs(v)
  if (a === 0) return '0,00'
  if (a < 0.00001) return v.toLocaleString('de-DE', { minimumFractionDigits:8, maximumFractionDigits:8 })
  if (a < 0.001)   return v.toLocaleString('de-DE', { minimumFractionDigits:6, maximumFractionDigits:6 })
  if (a < 1)       return v.toLocaleString('de-DE', { minimumFractionDigits:4, maximumFractionDigits:4 })
  return v.toLocaleString('de-DE', { minimumFractionDigits:2, maximumFractionDigits:2 })
}

function Sparkline({ prices, signal, w=90, h=32 }) {
  if (!prices||prices.length<2) return null
  const min=Math.min(...prices), max=Math.max(...prices), r=max-min||1
  const pts = prices.map((p,i)=>`${(i/(prices.length-1))*w},${h-((p-min)/r)*(h-4)-2}`).join(' ')
  const color = signal==='buy'?'#15803d':signal==='sell'?'#c0392b':'rgba(61,10,20,0.2)'
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{width:w,height:h,display:'block'}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  )
}

function TradeModal({ item, user, onClose, onDone }) {
  const [action, setAction]   = useState('buy')
  const [shares, setShares]   = useState('')
  const [emotion, setEmotion] = useState('')
  const [note, setNote]       = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')

  const rc   = RISK_CONF[user?.risk_profile||'moderat']
  const size = (user?.virtual_cash||0)*rc.pct/100
  const sg   = item?.price ? (size/item.price).toFixed(4) : ''
  const sl   = item?.price ? item.price*(1-rc.sl/100) : 0
  const tp   = item?.price ? item.price*(1+rc.tp/100) : 0
  const total= parseFloat(shares||0)*(item?.price||0)

  const submit = async () => {
    setLoading(true)
    try {
      const r = await api.post('/api/trade',{ ticker:item.ticker||item.id, name:item.name, asset_type:item.id?'crypto':'stock', action, shares:parseFloat(shares), price:item.price, emotion, note })
      if (r.data.emotion_feedback) setFeedback(r.data.emotion_feedback)
      else { onDone(); onClose() }
    } catch(e) { alert(e.response?.data?.detail||'Fehler') }
    setLoading(false)
  }

  const inp = { width:'100%', background:'var(--s2)', border:'1px solid var(--border)', color:'var(--txt)', padding:'9px 12px', borderRadius:6, fontSize:'0.82rem', outline:'none', marginBottom:10 }
  const lbl = { fontSize:'0.58rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:5 }

  if (feedback) return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:24,backdropFilter:'blur(4px)' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--s1)',border:'1px solid var(--border)',borderRadius:10,padding:28,maxWidth:420,width:'100%' }}>
        <div style={{ fontSize:'0.6rem',color:'var(--acc)',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:12 }}>KI-Mentor Feedback</div>
        <div style={{ fontSize:'0.84rem',color:'var(--txt2)',lineHeight:1.75,marginBottom:20,whiteSpace:'pre-wrap' }}>{feedback}</div>
        <button onClick={()=>{onDone();onClose()}} style={{ padding:'9px 22px',background:'var(--acc)',border:'none',color:'#fff',borderRadius:6,fontSize:'0.8rem',fontWeight:500,cursor:'pointer' }}>Verstanden →</button>
      </div>
    </div>
  )

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:24,backdropFilter:'blur(4px)' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--s1)',border:'1px solid var(--border)',borderRadius:10,padding:28,width:'100%',maxWidth:420 }}>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:'1rem',fontWeight:500,color:'var(--txt)',marginBottom:2 }}>{item.name}</div>
          <div style={{ fontSize:'1.8rem',fontWeight:300,fontVariantNumeric:'tabular-nums',letterSpacing:'-0.04em',color:'var(--txt)' }}>
            {fmtPrice(item.price)} <span style={{ fontSize:'0.9rem',color:'var(--txt3)',fontWeight:400 }}>EUR</span>
          </div>
        </div>
        <div style={{ display:'flex',gap:8,marginBottom:18 }}>
          {['buy','sell'].map(a=>(
            <button key={a} onClick={()=>setAction(a)} style={{ flex:1,padding:'9px',borderRadius:6,cursor:'pointer',fontWeight:500,fontSize:'0.8rem', border:`1px solid ${a===action?'var(--acc-b)':'var(--border)'}`, background:a===action?'var(--acc-l)':'transparent', color:a===action?'var(--acc)':'var(--txt3)', transition:'all 0.15s' }}>
              {a==='buy'?'Kaufen':'Verkaufen'}
            </button>
          ))}
        </div>
        <div style={lbl}>Anzahl Anteile</div>
        <input style={inp} type="number" value={shares} onChange={e=>setShares(e.target.value)} placeholder={sg} min="0" step="0.0001"/>
        <div style={{ fontSize:'0.68rem',color:'var(--txt3)',marginBottom:14 }}>
          Empfohlen: {sg} ({rc.pct}% · {fmt(size)} €) · SL: {fmtPrice(sl)} · TP: {fmtPrice(tp)}
        </div>
        <div style={lbl}>Emotion</div>
        <select style={inp} value={emotion} onChange={e=>setEmotion(e.target.value)}>
          <option value="">Keine Angabe</option><option value="calm">Ruhig</option><option value="greed">Gier</option>
          <option value="fear">Angst</option><option value="panic">Panik</option><option value="confident">Zuversichtlich</option>
        </select>
        <div style={lbl}>Notiz</div>
        <input style={inp} placeholder="Begründung …" value={note} onChange={e=>setNote(e.target.value)}/>
        <button onClick={submit} disabled={loading||!shares} style={{ width:'100%',padding:'11px',background:'var(--acc)',border:'none',color:'#fff',borderRadius:6,fontSize:'0.82rem',fontWeight:500,cursor:'pointer',opacity:loading||!shares?0.5:1,marginBottom:8 }}>
          {loading?'Verarbeite …':`${action==='buy'?'Kaufen':'Verkaufen'} · ${fmt(total)} €`}
        </button>
        <button onClick={onClose} style={{ width:'100%',padding:'9px',background:'transparent',border:'1px solid var(--border)',color:'var(--txt3)',borderRadius:6,fontSize:'0.78rem',cursor:'pointer' }}>Abbrechen</button>
      </div>
    </div>
  )
}

function SignalCard({ d, user, onTrade }) {
  const sig  = d.signal||'hold'
  const price= d.price
  const chg  = d.change_5d||0
  const sigColor = sig==='buy'?'var(--green)':sig==='sell'?'var(--red)':'var(--txt3)'
  const sigBg    = sig==='buy'?'var(--green-l)':sig==='sell'?'var(--red-l)':'rgba(61,10,20,0.04)'
  const sigLabel = sig==='buy'?'KAUFEN':sig==='sell'?'VERKAUFEN':'HALTEN'
  const rc   = RISK_CONF[user?.risk_profile||'moderat']
  const size = (user?.virtual_cash||0)*rc.pct/100
  const sl   = price ? price*(1-rc.sl/100) : 0
  const tp   = price ? price*(1+rc.tp/100) : 0

  return (
    <div style={{
      background:'var(--s1)', border:`1px solid ${sig==='buy'?'rgba(21,128,61,0.2)':sig==='sell'?'rgba(192,57,43,0.2)':'var(--border)'}`,
      borderRadius:8, padding:'16px 18px', position:'relative', overflow:'hidden',
    }}>
      {sig!=='hold' && <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:sigColor,opacity:0.6 }}/>}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12 }}>
        <div>
          <div style={{ fontSize:'0.88rem',fontWeight:500,color:'var(--txt)' }}>{d.name}</div>
          <div style={{ fontSize:'0.62rem',color:'var(--txt3)',marginTop:2,fontFamily:'monospace',letterSpacing:'0.04em' }}>{d.ticker||d.id||''}</div>
        </div>
        <span style={{ fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.1em',padding:'3px 9px',borderRadius:4,background:sigBg,color:sigColor }}>{sigLabel}</span>
      </div>
      {price!=null ? (
        <>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:8 }}>
            <div>
              <div style={{ fontSize:'1.3rem',fontWeight:400,fontVariantNumeric:'tabular-nums',letterSpacing:'-0.03em',color:'var(--txt)' }}>
                {fmtPrice(price)}<span style={{ fontSize:'0.7rem',color:'var(--txt3)',marginLeft:5 }}>EUR</span>
              </div>
              <div style={{ fontSize:'0.72rem',fontWeight:500,color:chg>=0?'var(--green)':'var(--red)',marginTop:2 }}>
                {chg>=0?'+':''}{fmt(chg)}% <span style={{ fontSize:'0.62rem',color:'var(--txt3)',fontWeight:400 }}>5T</span>
              </div>
            </div>
            {d.history?.length>1 && <Sparkline prices={d.history} signal={sig}/>}
          </div>
          <div style={{ display:'flex',gap:20,paddingTop:10,borderTop:'1px solid var(--bl)',marginBottom:10 }}>
            <div>
              <div style={{ fontSize:'0.58rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.1em' }}>RSI</div>
              <div style={{ fontSize:'0.82rem',fontWeight:500,marginTop:3,color:d.rsi<40?'var(--green)':d.rsi>65?'var(--red)':'var(--txt)' }}>{fmt(d.rsi,1)}</div>
            </div>
            <div>
              <div style={{ fontSize:'0.58rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.1em' }}>Score</div>
              <div style={{ fontSize:'0.82rem',fontWeight:500,marginTop:3,color:'var(--txt)' }}>{d.score}/4</div>
            </div>
          </div>
          {sig==='buy'&&user?.virtual_cash>0&&(
            <div style={{ background:'rgba(21,128,61,0.04)',border:'1px solid rgba(21,128,61,0.15)',borderRadius:6,padding:'9px 12px',marginBottom:10 }}>
              {[['Empfohlen',fmt(size)+' €','var(--green)'],['Stop-Loss',fmtPrice(sl)+' €','var(--red)'],['Take-Profit',fmtPrice(tp)+' €','var(--green)']].map(([l,v,c])=>(
                <div key={l} style={{ display:'flex',justifyContent:'space-between',fontSize:'0.68rem',marginBottom:3 }}>
                  <span style={{ color:'var(--txt3)' }}>{l}</span>
                  <span style={{ color:c,fontVariantNumeric:'tabular-nums' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={()=>onTrade(d)} style={{ width:'100%',padding:'8px',background:'var(--acc)',border:'none',color:'#fff',borderRadius:6,fontSize:'0.76rem',fontWeight:500,cursor:'pointer',letterSpacing:'0.02em' }}>
            Trade ausführen
          </button>
        </>
      ) : (
        <div style={{ color:'var(--txt3)',fontSize:'0.78rem',paddingTop:8 }}>Keine Daten verfügbar</div>
      )}
    </div>
  )
}

/* ── Geheimtipps embedded ── */
function GeheimtippsTab() {
  const [tips, setTips]     = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]     = useState({})
  const navigate = useNavigate()

  useEffect(()=>{
    api.get('/api/geheimtipps').then(r=>{ setTips(r.data||[]); setLoading(false) }).catch(()=>setLoading(false))
  },[])

  if (loading) return <div style={{ textAlign:'center',padding:'60px',color:'var(--txt3)' }}>Lade Geheimtipps…</div>

  const RISK_STYLE = {
    niedrig:{ bg:'rgba(6,95,46,0.18)',border:'rgba(6,95,46,0.4)',color:'#6ee7a0',label:'Niedriges Risiko' },
    mittel: { bg:'rgba(146,64,14,0.2)',border:'rgba(146,64,14,0.45)',color:'#fbbf24',label:'Mittleres Risiko' },
    hoch:   { bg:'rgba(160,16,8,0.2)',border:'rgba(160,16,8,0.45)',color:'#f87171',label:'Hohes Risiko' },
  }

  return (
    <div>
      <div style={{ fontSize:'0.72rem',color:'var(--txt3)',marginBottom:18,lineHeight:1.7,background:'rgba(255,255,255,0.04)',borderRadius:8,padding:'10px 14px',border:'1px solid var(--border)' }}>
        Themen-getriebene Investmentideen — von KI analysiert auf Basis aktueller Nachrichtenlage. Keine Anlageberatung.
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14 }}>
        {tips.map((tip,i)=>{
          const rs = RISK_STYLE[tip.risk]||RISK_STYLE.mittel
          const isOpen = open[i]
          return (
            <div key={i} style={{ background:'var(--s1)',border:`1px solid ${rs.border}`,borderRadius:12,padding:'18px 20px',background:`${rs.bg}` }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'1rem',fontWeight:600,color:'var(--txt)',marginBottom:3 }}>{tip.emoji||'💡'} {tip.title}</div>
                  <div style={{ fontSize:'0.76rem',color:'var(--txt2)',lineHeight:1.6 }}>{tip.why}</div>
                </div>
                <span style={{ fontSize:'0.6rem',fontWeight:700,padding:'3px 9px',borderRadius:8,background:rs.bg,border:`1px solid ${rs.border}`,color:rs.color,marginLeft:12,flexShrink:0 }}>
                  {rs.label}
                </span>
              </div>

              {tip.tickers?.length>0 && (
                <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:10 }}>
                  {tip.tickers.map(t=>(
                    <button key={t} onClick={()=>navigate(`/app/asset/${t}`)} style={{ fontSize:'0.64rem',fontFamily:'monospace',fontWeight:700,padding:'3px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--s2)',color:'var(--acc)',cursor:'pointer' }}>
                      {t}
                    </button>
                  ))}
                </div>
              )}

              <button onClick={()=>setOpen(p=>({...p,[i]:!p[i]}))} style={{ fontSize:'0.7rem',color:'var(--txt3)',background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit' }}>
                {isOpen?'▲ Weniger':'▼ Details & News'}
              </button>

              {isOpen && tip.news?.length>0 && (
                <div style={{ marginTop:10,display:'flex',flexDirection:'column',gap:6 }}>
                  {tip.news.map((n,ni)=>(
                    <a key={ni} href={n.url} target="_blank" rel="noopener noreferrer" style={{
                      textDecoration:'none',padding:'8px 12px',borderRadius:8,
                      background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',display:'block',
                    }}>
                      <div style={{ fontSize:'0.75rem',color:'var(--txt)',fontWeight:500,marginBottom:2 }}>{n.title}</div>
                      <div style={{ fontSize:'0.62rem',color:'var(--txt3)' }}>{n.source}</div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Alle Assets Tab ── */
function AlleAssetsTab() {
  const navigate = useNavigate()
  const [results, setResults]   = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(false)
  const [q, setQ]               = useState('')
  const [sortKey, setSortKey]   = useState('default')
  const [limit, setLimit]       = useState(80)

  const TYPE_LABELS = { stock:'Aktie', etf:'ETF', crypto:'Krypto', commodity:'Rohstoff', bond:'Anleihe' }
  const SORT_OPTS = [{v:'default',l:'Standard'},{v:'rsi_low',l:'RSI niedrig'},{v:'rsi_high',l:'RSI hoch'},{v:'change_desc',l:'Änderung ↑'},{v:'change_asc',l:'Änderung ↓'}]

  const load = async (query=q, lim=limit) => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ q:query, limit:lim })
      const r = await api.get(`/api/screener?${p}`)
      let res = r.data.results||[]
      if (sortKey==='rsi_low')      res = [...res].sort((a,b)=>(a.rsi||99)-(b.rsi||99))
      if (sortKey==='rsi_high')     res = [...res].sort((a,b)=>(b.rsi||0)-(a.rsi||0))
      if (sortKey==='change_desc')  res = [...res].sort((a,b)=>(b.change_pct||0)-(a.change_pct||0))
      if (sortKey==='change_asc')   res = [...res].sort((a,b)=>(a.change_pct||0)-(b.change_pct||0))
      setResults(res)
      setTotal(r.data.total||0)
    } catch(e) {}
    setLoading(false)
  }

  useEffect(()=>{ load() },[sortKey])

  return (
    <div>
      <div style={{ display:'flex',gap:10,marginBottom:16,alignItems:'center',flexWrap:'wrap' }}>
        <input
          value={q} onChange={e=>setQ(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&load()}
          placeholder="Suche Ticker oder Name… (Enter)"
          style={{ flex:1,minWidth:200,background:'var(--s2)',border:'1px solid var(--border)',borderRadius:8,padding:'9px 14px',fontSize:'0.84rem',color:'var(--txt)',outline:'none',fontFamily:'inherit' }}
        />
        <select value={sortKey} onChange={e=>{setSortKey(e.target.value)}} style={{ background:'var(--s2)',border:'1px solid var(--border)',borderRadius:8,padding:'9px 12px',fontSize:'0.82rem',color:'var(--txt)',outline:'none' }}>
          {SORT_OPTS.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        <span style={{ fontSize:'0.72rem',color:'var(--txt3)' }}>{loading?'Suche…':`${total} Assets`}</span>
      </div>

      <div style={{ background:'var(--s1)',border:'1px solid var(--border)',borderRadius:10,overflow:'hidden' }}>
        <table style={{ width:'100%',borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'var(--s2)',borderBottom:'1px solid var(--border)' }}>
              {['Ticker','Name','Typ',''].map((h,i)=>(
                <th key={i} style={{ padding:'10px 14px',fontSize:'0.6rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:700,textAlign:i>2?'center':'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((a,i)=>(
              <tr key={i}
                onClick={()=>navigate(`/app/asset/${a.ticker}`)}
                style={{ borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer',transition:'background 0.1s' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--s2)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <td style={{ padding:'11px 14px',fontSize:'0.84rem',fontWeight:700,color:'var(--acc)',fontFamily:'monospace' }}>{a.ticker}</td>
                <td style={{ padding:'11px 14px',fontSize:'0.82rem',color:'var(--txt)',maxWidth:240,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{a.name}</td>
                <td style={{ padding:'11px 14px' }}>
                  <span style={{ fontSize:'0.64rem',padding:'3px 8px',borderRadius:10,fontWeight:700,
                    background:a.type==='stock'?'rgba(52,152,219,0.15)':a.type==='crypto'?'rgba(243,156,18,0.15)':a.type==='etf'?'rgba(46,204,113,0.15)':'rgba(155,89,182,0.15)',
                    color:a.type==='stock'?'#3498db':a.type==='crypto'?'#f39c12':a.type==='etf'?'#2ecc71':'#9b59b6',
                  }}>{TYPE_LABELS[a.type]||a.type}</span>
                </td>
                <td style={{ padding:'11px 14px',textAlign:'center',fontSize:'0.72rem',color:'var(--acc)',fontWeight:600 }}>→</td>
              </tr>
            ))}
          </tbody>
        </table>
        {results.length===0 && !loading && (
          <div style={{ textAlign:'center',padding:'40px',color:'var(--txt3)',fontSize:'0.84rem' }}>Keine Assets gefunden</div>
        )}
      </div>

      {total > limit && (
        <button onClick={()=>{ const nl=limit+80; setLimit(nl); load(q,nl) }} style={{
          marginTop:12,width:'100%',padding:'10px',background:'var(--s2)',border:'1px solid var(--border)',borderRadius:8,
          color:'var(--txt2)',fontSize:'0.82rem',cursor:'pointer',fontFamily:'inherit',
        }}>
          +80 weitere laden
        </button>
      )}
    </div>
  )
}

const TABS  = [{id:'top20',label:'Aktien'},{id:'crypto',label:'Krypto'},{id:'geheimtipps',label:'Geheimtipps'},{id:'alle',label:'Alle Assets'}]
const SORTS = [{v:'default',l:'Standard'},{v:'signal',l:'Signal'},{v:'change_desc',l:'Änderung ↑'},{v:'change_asc',l:'Änderung ↓'},{v:'rsi_low',l:'RSI niedrig'}]

export default function Markets() {
  const { user, refreshUser } = useAuth()
  const [tab, setTab]       = useState('top20')
  const [data, setData]     = useState({top20:[],crypto:[]})
  const [loading, setLoading] = useState({top20:false,crypto:false})
  const [filter, setFilter] = useState('all')
  const [sort, setSort]     = useState('default')
  const [ts, setTs]         = useState({})
  const [tradeItem, setTradeItem] = useState(null)

  const load = async (market, force=false) => {
    setLoading(p=>({...p,[market]:true}))
    try {
      const r = await api.get(`/api/market/${market}${force?'?force=true':''}`)
      setData(p=>({...p,[market]:r.data.data}))
      setTs(p=>({...p,[market]:r.data.timestamp}))
    } catch(e){}
    setLoading(p=>({...p,[market]:false}))
  }

  useEffect(()=>{ load('top20') },[])

  const onTabChange = t => {
    setTab(t); setFilter('all')
    if((t==='top20'||t==='crypto') && !data[t]?.length) load(t)
  }

  const applySort = arr => {
    const d=[...arr]
    if(sort==='signal')      return d.sort((a,b)=>({buy:0,hold:1,sell:2}[a.signal]||1)-({buy:0,hold:1,sell:2}[b.signal]||1))
    if(sort==='change_desc') return d.sort((a,b)=>(b.change_5d||0)-(a.change_5d||0))
    if(sort==='change_asc')  return d.sort((a,b)=>(a.change_5d||0)-(b.change_5d||0))
    if(sort==='rsi_low')     return d.sort((a,b)=>(a.rsi||99)-(b.rsi||99))
    return d
  }
  const displayed = applySort((data[tab]||[]).filter(d=>filter==='all'||d.signal===filter))

  const tbtn = (active) => ({
    padding:'7px 18px', borderRadius:6, border:'none', cursor:'pointer', fontSize:'0.8rem', fontWeight:active?600:400,
    background:active?'rgba(255,255,255,0.14)':'transparent',
    color:active?'#fff':'rgba(255,255,255,0.4)',
    transition:'all 0.15s',
  })
  const pill = (active) => ({
    padding:'5px 14px', borderRadius:20, cursor:'pointer', fontSize:'0.72rem', fontWeight:active?500:400,
    border:`1px solid ${active?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.12)'}`,
    background:active?'rgba(255,255,255,0.1)':'transparent',
    color:active?'#fff':'rgba(255,255,255,0.35)',
    transition:'all 0.15s',
  })

  const isSignalTab = tab==='top20'||tab==='crypto'

  return (
    <div style={{ padding:'24px 32px', minHeight:'100%' }}>

      <div style={{ fontSize:'0.6rem',color:'rgba(255,255,255,0.35)',letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:6 }}>Markt</div>
      <div style={{ fontSize:'1.4rem',fontWeight:300,letterSpacing:'-0.04em',color:'#fff',marginBottom:16 }}>Signale & Märkte</div>

      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap' }}>
        {/* Tab-Leiste */}
        <div style={{ display:'flex',gap:2,background:'rgba(0,0,0,0.2)',borderRadius:7,padding:3,border:'1px solid rgba(255,255,255,0.1)' }}>
          {TABS.map(t=><button key={t.id} style={tbtn(tab===t.id)} onClick={()=>onTabChange(t.id)}>{t.label}</button>)}
        </div>

        {/* Filter + Sort — nur für Signal-Tabs */}
        {isSignalTab && (
          <>
            <div style={{ display:'flex',gap:6 }}>
              {['all','buy','hold','sell'].map(f=>(
                <button key={f} style={pill(filter===f)} onClick={()=>setFilter(f)}>
                  {f==='all'?'Alle':f==='buy'?'Kaufen':f==='sell'?'Verkaufen':'Halten'}
                </button>
              ))}
            </div>

            <div style={{ marginLeft:'auto',display:'flex',gap:10,alignItems:'center' }}>
              {ts[tab]&&<span style={{ fontSize:'0.65rem',color:'rgba(255,255,255,0.3)' }}>Stand {ts[tab]}</span>}
              <select value={sort} onChange={e=>setSort(e.target.value)} style={{ background:'rgba(0,0,0,0.25)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.6)',padding:'6px 10px',borderRadius:6,fontSize:'0.74rem',outline:'none' }}>
                {SORTS.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
              <button onClick={()=>load(tab,true)} style={{ padding:'6px 12px',borderRadius:6,border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.55)',fontSize:'0.74rem',cursor:'pointer' }}>
                ↻
              </button>
            </div>
          </>
        )}
      </div>

      {/* Content */}
      {tab==='geheimtipps' && <GeheimtippsTab />}
      {tab==='alle' && <AlleAssetsTab />}

      {isSignalTab && (
        loading[tab] ? (
          <div style={{ textAlign:'center',padding:'80px',color:'rgba(255,255,255,0.3)',fontSize:'0.82rem' }}>Marktdaten werden geladen …</div>
        ) : displayed.length===0 ? (
          <div style={{ textAlign:'center',padding:'80px',color:'rgba(255,255,255,0.3)',fontSize:'0.82rem' }}>Keine Einträge für diesen Filter.</div>
        ) : (
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:10 }}>
            {displayed.map((d,i)=><SignalCard key={d.ticker||d.id||i} d={d} user={user} onTrade={setTradeItem}/>)}
          </div>
        )
      )}

      {tradeItem&&<TradeModal item={tradeItem} user={user} onClose={()=>setTradeItem(null)} onDone={refreshUser}/>}
    </div>
  )
}
