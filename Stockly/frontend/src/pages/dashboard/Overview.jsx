import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../AuthContext'
import api from '../../api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const LEVELS = {1:'Einsteiger',2:'Beobachter',3:'Analyst',4:'Trader',5:'Profi',6:'Experte',7:'Stratege',8:'Meister',9:'Guru',10:'Legende'}
const fmt = (n, d=2) => n == null ? '–' : Number(n).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d})

/* ── Wiederverwendete Styles ── */
const card  = { background:'var(--s1)', border:'1px solid var(--border)', borderRadius:8, padding:'18px 22px' }
const cLbl  = { fontSize:'0.58rem', color:'var(--txt2)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.14em' }
const pLbl  = { fontSize:'0.58rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.18em' }

function KIBriefing() {
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(()=>{
    api.get('/api/briefing').then(r=>setData(r.data)).catch(()=>{})
  },[])

  if (!data) return null

  return (
    <div style={{ background:'rgba(61,10,20,0.12)',border:'1px solid rgba(61,10,20,0.3)',borderRadius:10,padding:'14px 18px',marginBottom:24 }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer' }} onClick={()=>setOpen(o=>!o)}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <span style={{ fontSize:'1.1rem' }}>📊</span>
          <div>
            <div style={{ fontSize:'0.72rem',fontWeight:700,color:'var(--txt)',letterSpacing:'0.04em' }}>Tägliches KI-Briefing</div>
            <div style={{ fontSize:'0.62rem',color:'var(--txt3)' }}>{data.date}</div>
          </div>
        </div>
        <span style={{ fontSize:'0.72rem',color:'var(--txt3)' }}>{open?'▲':'▼'} {open?'Schließen':'Öffnen'}</span>
      </div>

      {open && (
        <div style={{ marginTop:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          {data.portfolio_items?.length>0 && (
            <div>
              <div style={{ fontSize:'0.58rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:8 }}>Dein Portfolio</div>
              {data.portfolio_items.map(item=>(
                <div key={item.ticker} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <span style={{ fontSize:'0.76rem',fontWeight:600,color:'var(--txt)' }}>{item.ticker}</span>
                    <span style={{ fontSize:'0.68rem',color:'var(--txt3)',marginLeft:8 }}>{item.name}</span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'0.76rem',fontWeight:600,color:'var(--txt)' }}>{item.price?.toFixed(2)} €</div>
                    <div style={{ fontSize:'0.68rem',color:item.change_pct>=0?'var(--green)':'var(--red)' }}>{item.change_pct>=0?'+':''}{item.change_pct?.toFixed(2)}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.macro?.length>0 && (
            <div>
              <div style={{ fontSize:'0.58rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:8 }}>Makro</div>
              {data.macro.map(m=>(
                <div key={m.name} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize:'0.76rem',color:'var(--txt2)' }}>{m.name}</span>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'0.76rem',fontWeight:600,color:'var(--txt)' }}>{m.price?.toLocaleString('de-DE',{maximumFractionDigits:2})}</div>
                    <div style={{ fontSize:'0.68rem',color:m.change_pct>=0?'var(--green)':'var(--red)' }}>{m.change_pct>=0?'+':''}{m.change_pct?.toFixed(2)}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Overview() {
  const { user } = useAuth()
  const [portfolio, setPortfolio] = useState(null)
  const [trades, setTrades]       = useState([])
  const [lessons, setLessons]     = useState([])
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    api.get('/api/portfolio/value').then(r => setPortfolio(r.data)).catch(()=>{})
    api.get('/api/trades?limit=8').then(r => setTrades(r.data)).catch(()=>{})
    api.get('/api/lessons').then(r => setLessons(r.data.filter(l => !l.completed && !l.locked).slice(0,3))).catch(()=>{})
    // Build cumulative portfolio value chart from trade history
    api.get('/api/trades?limit=100').then(r => {
      const ts = r.data.slice().reverse()
      let cum = 0
      const pts = ts.map(t => {
        cum += t.action === 'buy' ? t.total : -t.total
        return { date: t.created_at?.slice(0,10), value: Math.round(cum) }
      })
      if (pts.length > 0) setChartData(pts)
    }).catch(()=>{})
  }, [])

  const pnl    = portfolio?.total_pnl
  const pnlPct = portfolio && portfolio.total_invested > 0 ? pnl / portfolio.total_invested * 100 : null
  const lvl    = user?.level || 1

  return (
    <div style={{ padding:'28px 32px', minHeight:'100%' }}>

      {/* KI Briefing */}
      <KIBriefing />

      {/* Begrüßung */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:'1.6rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff', marginBottom:4 }}>
          Guten Tag, {user?.username}.
        </div>
        <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.45)', letterSpacing:'0.02em' }}>
          Level {lvl} · {LEVELS[lvl]} · {user?.streak || 0} Tage Streak
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:10, marginBottom:32 }}>
        <div style={card}>
          <div style={cLbl}>Portfoliowert</div>
          <div style={{ fontSize:'1.2rem', fontWeight:700, marginTop:6, color:'var(--txt)', fontVariantNumeric:'tabular-nums', letterSpacing:'-0.02em' }}>
            {fmt(portfolio?.total_current ?? portfolio?.total_invested)} €
          </div>
        </div>
        <div style={card}>
          <div style={cLbl}>Investiert</div>
          <div style={{ fontSize:'1.2rem', fontWeight:700, marginTop:6, color:'var(--txt)', fontVariantNumeric:'tabular-nums', letterSpacing:'-0.02em' }}>
            {fmt(portfolio?.total_invested)} €
          </div>
        </div>
        <div style={card}>
          <div style={cLbl}>Gewinn / Verlust</div>
          <div style={{ fontSize:'1.2rem', fontWeight:700, marginTop:6, fontVariantNumeric:'tabular-nums', letterSpacing:'-0.02em', color:(pnl||0)>=0?'var(--green)':'var(--red)' }}>
            {pnl != null ? `${pnl>=0?'+':''}${fmt(pnl)} €` : '–'}
            {pnlPct != null && <span style={{ fontSize:'0.72rem', marginLeft:8, opacity:0.6 }}>{pnlPct>=0?'+':''}{fmt(pnlPct,1)}%</span>}
          </div>
        </div>
        <div style={card}>
          <div style={cLbl}>XP gesamt</div>
          <div style={{ fontSize:'1.2rem', fontWeight:500, marginTop:6, color:'var(--acc)', fontVariantNumeric:'tabular-nums', letterSpacing:'-0.02em' }}>
            {user?.xp || 0} <span style={{ fontSize:'0.75rem', fontWeight:400, opacity:0.5 }}>XP</span>
          </div>
        </div>
      </div>

      {/* Portfolio Chart */}
      {chartData.length > 1 && (
        <div style={{ ...card, marginBottom:28, padding:'18px 22px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={cLbl}>Portfolio-Entwicklung</div>
            <div style={{ fontSize:'0.72rem', color:'var(--txt3)' }}>Kumuliertes Investitionsvolumen</div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData} margin={{ top:2, right:2, left:0, bottom:0 }}>
              <defs>
                <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3d0a14" stopOpacity={0.2}/>
                  <stop offset="100%" stopColor="#3d0a14" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize:8, fill:'var(--txt3)' }} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
              <YAxis tick={{ fontSize:8, fill:'var(--txt3)' }} axisLine={false} tickLine={false} width={60}
                tickFormatter={v=>`${(v/1000).toFixed(0)}k €`}/>
              <CartesianGrid vertical={false} stroke="var(--bl)" strokeDasharray="3 6"/>
              <Tooltip contentStyle={{ background:'var(--s2)', border:'1px solid var(--border)', borderRadius:6, fontSize:'0.72rem', color:'var(--txt)' }}
                formatter={v=>[`${fmt(v,0)} €`,'Investiert']}/>
              <Area type="monotone" dataKey="value" stroke="var(--acc)" strokeWidth={2} fill="url(#portfolioGrad)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20 }}>

        {/* Letzte Trades */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={pLbl}>Letzte Trades</div>
            <Link to="/app/portfolio" style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.04em' }}>Alle →</Link>
          </div>
          {!trades.length ? (
            <div style={{ ...card, padding:'32px', textAlign:'center', color:'var(--txt3)', fontSize:'0.8rem' }}>
              Noch keine Trades ausgeführt.
            </div>
          ) : (
            <div style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
              {trades.map((t, i) => (
                <div key={t.id} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'12px 16px',
                  borderBottom: i < trades.length-1 ? '1px solid var(--bl)' : 'none',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{
                      fontSize:'0.58rem', fontWeight:600, padding:'2px 7px', borderRadius:4, letterSpacing:'0.07em',
                      background: t.action==='buy'?'var(--green-l)':'var(--red-l)',
                      color: t.action==='buy'?'var(--green)':'var(--red)',
                    }}>
                      {t.action==='buy'?'K':'V'}
                    </span>
                    <div>
                      <div style={{ fontSize:'0.82rem', fontWeight:500, color:'var(--txt)' }}>{t.name||t.ticker}</div>
                      <div style={{ fontSize:'0.68rem', color:'var(--txt3)', marginTop:1 }}>
                        {fmt(t.shares,4)} × {fmt(t.price)} €
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'0.82rem', fontVariantNumeric:'tabular-nums', color:'var(--txt)' }}>{fmt(t.total)} €</div>
                    <div style={{ fontSize:'0.65rem', color:'var(--txt3)', marginTop:1 }}>{t.created_at?.slice(0,10)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rechte Spalte */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={card}>
            <div style={cLbl}>Streak</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:8 }}>
              <div style={{ fontSize:'2.2rem', fontWeight:300, color:'var(--acc)', letterSpacing:'-0.04em' }}>{user?.streak||0}</div>
              <div style={{ fontSize:'0.78rem', color:'var(--txt3)' }}>Tage in Folge</div>
            </div>
          </div>

          {lessons.length > 0 && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={pLbl}>Weiter lernen</div>
                <Link to="/app/lessons" style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.35)' }}>Alle →</Link>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {lessons.map(l => (
                  <Link key={l.slug} to="/app/lessons" style={{
                    ...card, display:'block', padding:'14px 16px', transition:'border-color 0.15s',
                  }}>
                    <div style={{ fontSize:'0.82rem', fontWeight:500, color:'var(--txt)', marginBottom:4 }}>{l.title}</div>
                    <div style={{ fontSize:'0.65rem', color:'var(--acc)', letterSpacing:'0.04em' }}>+{l.xp_reward} XP</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
