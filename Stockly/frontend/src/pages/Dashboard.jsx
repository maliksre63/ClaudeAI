import { useState } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import Logo from '../components/Logo'
import Overview        from './dashboard/Overview'
import Markets         from './dashboard/Markets'
import Portfolio       from './dashboard/Portfolio'
import Mentor          from './dashboard/Mentor'
import Lessons         from './dashboard/Lessons'
import Profile         from './dashboard/Profile'
import Discover        from './dashboard/Discover'
import Watchlist       from './dashboard/Watchlist'
import Activity        from './dashboard/Activity'
import AssetDetail     from './dashboard/AssetDetail'
import Compare         from './dashboard/Compare'
import Settings        from './dashboard/Settings'
import Heatmap         from './dashboard/Heatmap'
import Games           from './dashboard/Games'
import Geheimtipps     from './dashboard/Geheimtipps'
import Kalender        from './dashboard/Kalender'
import Sektoren        from './dashboard/Sektoren'
import Backtesting     from './dashboard/Backtesting'
import Autopilot       from './dashboard/Autopilot'
import Psychologie     from './dashboard/Psychologie'
import Screener        from './dashboard/Screener'
import Steuern         from './dashboard/Steuern'
import Challenges      from './dashboard/Challenges'
import Makro           from './dashboard/Makro'
import Rebalancing     from './dashboard/Rebalancing'
import WhatIf          from './dashboard/WhatIf'
import SparplanSimulator from './dashboard/SparplanSimulator'
import TickerSearch from '../components/TickerSearch'

const LEVELS = {1:'Einsteiger',2:'Beobachter',3:'Analyst',4:'Trader',5:'Profi',6:'Experte',7:'Stratege',8:'Meister',9:'Guru',10:'Legende'}
const LVL_XP = {1:[0,150],2:[150,400],3:[400,800],4:[800,1500],5:[1500,2500],6:[2500,4000],7:[4000,6000],8:[6000,9000],9:[9000,13000],10:[13000,99999]}

const NAV_SECTIONS = [
  {
    label: 'Übersicht',
    items: [
      { path:'/app/overview',   label:'Dashboard'   },
      { path:'/app/portfolio',  label:'Portfolio'   },
      { path:'/app/watchlist',  label:'Watchlist'   },
      { path:'/app/activity',   label:'Aktivität'   },
    ]
  },
  {
    label: 'Markt',
    items: [
      { path:'/app/discover',   label:'Entdecken'   },
      { path:'/app/markets',    label:'Signale'     },
      { path:'/app/compare',    label:'Vergleich'   },
      { path:'/app/makro',      label:'Makro'       },
    ]
  },
  {
    label: 'Analyse',
    items: [
      { path:'/app/screener',    label:'Screener'       },
      { path:'/app/psychologie', label:'Psychologie'    },
      { path:'/app/rebalancing', label:'Rebalancing'    },
      { path:'/app/steuern',     label:'Steuer-Sim'     },
      { path:'/app/whatif',      label:'Was wäre wenn'  },
    ]
  },
  {
    label: 'Lernen',
    items: [
      { path:'/app/lessons',    label:'Lernpfad'     },
      { path:'/app/mentor',     label:'KI-Mentor'    },
      { path:'/app/autopilot',  label:'KI-Autopilot' },
      { path:'/app/challenges', label:'Challenges'   },
    ]
  },
]

function QuickTradeButton() {
  const navigate = useNavigate()
  const [open, setOpen]     = useState(false)
  const [ticker, setTicker] = useState('')

  const go = (t) => {
    const v = (t || ticker).trim().toUpperCase()
    if (!v) return
    navigate(`/app/asset/${v}`)
    setOpen(false)
    setTicker('')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Quick Trade"
        style={{
          position:'fixed', bottom:32, right:32, zIndex:999,
          width:52, height:52, borderRadius:'50%',
          background:'var(--acc)', border:'none', cursor:'pointer',
          fontSize:'1.4rem', color:'#fff', boxShadow:'0 4px 20px rgba(0,0,0,0.35)',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'transform 0.15s',
        }}
        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
        onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
      >
        ⚡
      </button>

      {open && (
        <div style={{
          position:'fixed', inset:0, zIndex:1000,
          background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center',
        }} onClick={()=>setOpen(false)}>
          <div style={{
            background:'var(--s1)', borderRadius:14, padding:'28px 28px 24px',
            minWidth:380, boxShadow:'0 20px 60px rgba(0,0,0,0.5)',
            border:'1px solid var(--border)',
          }} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'1rem',fontWeight:700,color:'var(--txt)',marginBottom:16}}>⚡ Quick Trade</div>
            <TickerSearch
              autoFocus
              value={ticker}
              onChange={setTicker}
              onSelect={item=>go(item.ticker)}
              placeholder="Name oder Ticker… (z.B. Apple, AAPL, Bitcoin)"
              style={{marginBottom:14}}
            />
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>go()} style={{
                flex:1, background:'var(--acc)', border:'none', borderRadius:8,
                padding:'10px', color:'#fff', fontSize:'0.85rem', fontWeight:600,
                cursor:'pointer', fontFamily:'inherit',
              }}>
                Chart öffnen
              </button>
              <button onClick={()=>setOpen(false)} style={{
                flex:1, background:'var(--s2)', border:'1px solid var(--border)',
                borderRadius:8, padding:'10px', color:'var(--txt2)', fontSize:'0.85rem',
                cursor:'pointer', fontFamily:'inherit',
              }}>
                Abbrechen
              </button>
            </div>
            <div style={{marginTop:12,fontSize:'0.7rem',color:'var(--txt3)'}}>Klicke auf einen Vorschlag oder Enter zum Öffnen</div>
          </div>
        </div>
      )}
    </>
  )
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const lvl = user?.level || 1
  const xp  = user?.xp || 0
  const [lo, hi] = LVL_XP[lvl] || [0, 150]
  const pct = Math.min(100, ((xp - lo) / (hi - lo)) * 100)

  const isActive = p => location.pathname === p || location.pathname.startsWith(p + '/')

  return (
    <div style={{ display:'flex', height:'100vh', background:'var(--bg)', overflow:'hidden' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? 64 : 220,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--s1)',
        borderRight: '1px solid var(--border)',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}>

        {/* Logo + collapse */}
        <div style={{ padding: collapsed ? '22px 0' : '22px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
          {!collapsed && <Logo size={28} textColor="var(--txt)"/>}
          {collapsed && <Logo size={28} showText={false}/>}
          {!collapsed && (
            <button onClick={()=>setCollapsed(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--txt3)', padding:4, borderRadius:4, fontSize:'0.8rem' }}>‹</button>
          )}
          {collapsed && (
            <div style={{ position:'absolute', left:64, top:22 }}>
              <button onClick={()=>setCollapsed(false)} style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:4, cursor:'pointer', color:'var(--txt)', padding:'2px 6px', fontSize:'0.7rem', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>›</button>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, overflowY:'auto', padding:'14px 0' }}>
          {NAV_SECTIONS.map(sec => (
            <div key={sec.label} style={{ marginBottom:8 }}>
              {!collapsed && (
                <div style={{ fontSize:'0.52rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.18em', fontWeight:700, padding:'6px 20px 4px' }}>
                  {sec.label}
                </div>
              )}
              {sec.items.map(n => {
                const active = isActive(n.path)
                return (
                  <Link key={n.path} to={n.path} title={collapsed ? n.label : ''} style={{
                    display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '10px 0' : '9px 20px',
                    fontSize:'0.82rem', fontWeight: active ? 600 : 400,
                    color: active ? 'var(--txt)' : 'var(--txt2)',
                    borderLeft: `2.5px solid ${active ? 'var(--acc)' : 'transparent'}`,
                    background: active ? 'rgba(61,10,20,0.08)' : 'transparent',
                    transition:'all 0.12s', textDecoration:'none',
                  }}>
                    {n.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User block */}
        {!collapsed && (
          <div style={{ padding:'16px 20px', borderTop:'1px solid rgba(61,10,20,0.1)' }}>
            <div style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--txt)', marginBottom:2 }}>{user?.username}</div>
            <div style={{ fontSize:'0.62rem', color:'var(--txt2)', marginBottom:10, letterSpacing:'0.02em' }}>
              Level {lvl} · {LEVELS[lvl]}
            </div>
            <div style={{ height:3, background:'rgba(61,10,20,0.12)', borderRadius:2, marginBottom:12 }}>
              <div style={{ height:'100%', width:`${pct}%`, background:'var(--acc)', borderRadius:2, transition:'width 0.6s ease' }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <Link to="/app/settings" style={{ fontSize:'0.68rem', color:'var(--txt3)', letterSpacing:'0.04em' }}>Einstellungen</Link>
              <button onClick={()=>{ logout(); navigate('/login') }} style={{ background:'none', border:'none', color:'var(--txt3)', fontSize:'0.68rem', cursor:'pointer', padding:0 }}>
                Abmelden
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <main style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', minWidth:0 }}>
        <Routes>
          <Route index              element={<Overview />}           />
          <Route path="overview"    element={<Overview />}           />
          <Route path="markets"     element={<Markets />}            />
          <Route path="portfolio"   element={<Portfolio />}          />
          <Route path="lessons"     element={<Lessons />}            />
          <Route path="mentor"      element={<Mentor />}             />
          <Route path="profile"     element={<Profile />}            />
          <Route path="discover"    element={<Discover />}           />
          <Route path="watchlist"   element={<Watchlist />}          />
          <Route path="activity"    element={<Activity />}           />
          <Route path="compare"     element={<Compare />}            />
          <Route path="settings"    element={<Settings />}           />
          <Route path="heatmap"     element={<Heatmap />}            />
          <Route path="geheimtipps" element={<Geheimtipps />}       />
          <Route path="games"       element={<Games />}              />
          <Route path="kalender"    element={<Kalender />}           />
          <Route path="sektoren"    element={<Sektoren />}           />
          <Route path="backtesting" element={<Backtesting />}        />
          <Route path="autopilot"   element={<Autopilot />}          />
          <Route path="psychologie" element={<Psychologie />}        />
          <Route path="screener"    element={<Screener />}           />
          <Route path="steuern"     element={<Steuern />}            />
          <Route path="challenges"  element={<Challenges />}         />
          <Route path="makro"       element={<Makro />}              />
          <Route path="rebalancing" element={<Rebalancing />}        />
          <Route path="whatif"      element={<WhatIf />}             />
          <Route path="sparplan"    element={<SparplanSimulator />}  />
          <Route path="asset/:ticker" element={<AssetDetail />}      />
        </Routes>
      </main>

      <QuickTradeButton />
    </div>
  )
}
