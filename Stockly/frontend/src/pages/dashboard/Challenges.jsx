import { useState, useEffect } from 'react'
import api from '../../api'
import Games from './Games'

const card = { background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:'24px 26px', marginBottom:16 }

const TYPE_COLORS = { weekly:'#3498db', achievement:'#9b59b6', streak:'#e67e22', milestone:'#2ecc71' }
const TYPE_LABELS = { weekly:'Wöchentlich', achievement:'Erfolg', streak:'Streak', milestone:'Meilenstein' }

const STATUS_HINTS = {
  trade5:     'Führe diese Woche 5 Trades durch — kaufe oder verkaufe beliebige Assets.',
  profit3:    'Verkaufe eine Position mit mindestens 3% Gewinn gegenüber deinem Kaufpreis.',
  watchlist10:'Klicke bei 10 Assets auf "Zur Watchlist" um sie zu beobachten.',
  etf_buy:    'Kaufe einen ETF (z.B. SPY, QQQ, VWCE) über das Entdecken-Tab.',
  crypto_buy: 'Kaufe eine Kryptowährung (z.B. Bitcoin, Ethereum) über das Entdecken-Tab.',
  diversify5: 'Handle 5 verschiedene Assets — Aktien, ETFs, Kryptos zählen alle mit.',
  streak7:    'Logge 7 Tage hintereinander ein — jeden Tag kurz die App öffnen reicht.',
  first_sell: 'Verkaufe eine deiner aktuellen Positionen über das Portfolio.',
  big_win:    'Verkaufe eine Position mit mindestens 10% Gewinn — die größte Herausforderung!',
  trade20:    'Führe insgesamt 20 Trades durch — jeder Kauf und Verkauf zählt.',
}

function ProgressBar({ pct, color='var(--acc)' }) {
  return (
    <div style={{height:6,background:'rgba(255,255,255,0.07)',borderRadius:3,marginTop:10,overflow:'hidden'}}>
      <div style={{height:'100%',width:`${Math.min(100,pct)}%`,background:color,borderRadius:3,transition:'width 0.6s ease'}}/>
    </div>
  )
}

function ChallengeCard({ c, onClaim, claiming, claimMsg }) {
  const hasCount  = c.target > 1
  const isPercent = ['profit3','big_win'].includes(c.id)
  const countLabel = isPercent
    ? `${c.current}% / ${c.target}%`
    : hasCount
      ? `${c.current} / ${c.target}`
      : null

  const borderColor = c.completed && !c.claimed
    ? 'rgba(46,204,113,0.4)'
    : c.progress > 0
      ? 'rgba(52,152,219,0.25)'
      : 'var(--border)'

  const bgColor = c.completed && !c.claimed
    ? 'rgba(46,204,113,0.05)'
    : 'transparent'

  return (
    <div style={{...card, marginBottom:0, border:`1px solid ${borderColor}`, background:bgColor}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <span style={{fontSize:'1.4rem',opacity: c.claimed ? 0.4 : c.completed ? 1 : 0.65}}>{c.icon}</span>
          <div>
            <div style={{fontSize:'0.86rem',fontWeight:700,color:'var(--txt)',textDecoration:c.claimed?'line-through':'none'}}>
              {c.title}
            </div>
            <div style={{fontSize:'0.72rem',color:'var(--txt3)',marginTop:2}}>{c.desc}</div>
          </div>
        </div>
        <span style={{
          fontSize:'0.58rem',padding:'3px 8px',borderRadius:10,fontWeight:700,
          background:`${TYPE_COLORS[c.type]}22`,color:TYPE_COLORS[c.type],
          flexShrink:0,marginLeft:8
        }}>{TYPE_LABELS[c.type]}</span>
      </div>

      {/* Progress row */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10}}>
        <span style={{fontSize:'0.78rem',fontWeight:700,color: c.claimed ? 'var(--txt3)' : '#f39c12'}}>
          +{c.xp} XP
        </span>

        {c.claimed && (
          <span style={{fontSize:'0.72rem',color:'#2ecc71',fontWeight:600}}>✓ Abgeschlossen</span>
        )}
        {c.completed && !c.claimed && (
          <button onClick={()=>onClaim(c.id)} disabled={claiming} style={{
            padding:'6px 16px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',
            background:'#2ecc71',color:'#fff',fontWeight:700,fontSize:'0.78rem',opacity:claiming?0.6:1
          }}>
            {claimMsg || (claiming ? '…' : 'Einlösen')}
          </button>
        )}
        {!c.completed && !c.claimed && countLabel && (
          <span style={{fontSize:'0.76rem',color:'var(--acc)',fontWeight:600}}>{countLabel} geschafft</span>
        )}
        {!c.completed && !c.claimed && !countLabel && c.progress === 0 && (
          <span style={{fontSize:'0.68rem',color:'var(--txt3)'}}>Noch nicht gestartet</span>
        )}
      </div>

      {/* Progress bar */}
      {!c.claimed && c.progress > 0 && (
        <ProgressBar pct={c.progress} color={c.completed ? '#2ecc71' : 'var(--acc)'}/>
      )}
      {c.claimed && <ProgressBar pct={100} color="rgba(255,255,255,0.12)"/>}

      {/* How-to hint for not-started */}
      {!c.completed && !c.claimed && c.progress === 0 && STATUS_HINTS[c.id] && (
        <div style={{
          marginTop:10,padding:'8px 10px',background:'rgba(255,255,255,0.03)',
          borderRadius:6,fontSize:'0.68rem',color:'var(--txt3)',lineHeight:1.5
        }}>
          Wie? {STATUS_HINTS[c.id]}
        </div>
      )}
    </div>
  )
}

export default function Challenges() {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading]       = useState(true)
  const [claiming, setClaiming]     = useState({})
  const [msg, setMsg]               = useState({})

  const load = () => {
    api.get('/api/challenges')
      .then(r => { setChallenges(r.data.challenges || []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => load(), [])

  const claim = async (cid) => {
    setClaiming(s => ({...s, [cid]: true}))
    try {
      const r = await api.post(`/api/challenges/${cid}/claim`)
      setMsg(m => ({...m, [cid]: `+${r.data.xp_earned} XP erhalten!`}))
      load()
      setTimeout(() => setMsg(m => { const n = {...m}; delete n[cid]; return n }), 3000)
    } catch {
      setMsg(m => ({...m, [cid]: 'Fehler!'}))
    }
    setClaiming(s => ({...s, [cid]: false}))
  }

  const totalXP    = challenges.filter(c => c.claimed).reduce((s, c) => s + c.xp, 0)
  const claimedN   = challenges.filter(c => c.claimed).length
  const readyN     = challenges.filter(c => c.completed && !c.claimed).length
  const totalN     = challenges.length

  if (loading) return <div style={{padding:40,color:'var(--txt3)'}}>Lade Challenges…</div>

  return (
    <div style={{padding:'28px 32px', maxWidth:860}}>
      <div style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.35)',letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:6}}>Gamification</div>
      <div style={{fontSize:'1.4rem',fontWeight:300,letterSpacing:'-0.04em',color:'#fff',marginBottom:6}}>Challenges</div>
      <div style={{fontSize:'0.8rem',color:'var(--txt3)',marginBottom:20}}>
        Schließe Aufgaben ab und verdiene XP — damit steigst du im Level auf.
      </div>

      {/* XP Summary */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'Abgeschlossen', value:`${claimedN} / ${totalN}`, icon:'🏆', color:'#2ecc71'},
          {label:'Bereit einzulösen', value:readyN, icon:'⏳', color:'#f39c12'},
          {label:'XP verdient', value:`${totalXP} XP`, icon:'⚡', color:'var(--acc)'},
          {label:'Fortschritt', value:`${Math.round(claimedN/totalN*100)}%`, icon:'📊', color:'var(--txt)'},
        ].map((s,i)=>(
          <div key={i} style={{...card,marginBottom:0,display:'flex',alignItems:'center',gap:12}}>
            <div style={{fontSize:'1.4rem'}}>{s.icon}</div>
            <div>
              <div style={{fontSize:'0.56rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:2}}>{s.label}</div>
              <div style={{fontSize:'1.1rem',fontWeight:700,color:s.color}}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* All challenges as one sorted list */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))',gap:12}}>
        {[
          ...challenges.filter(c => c.completed && !c.claimed),
          ...challenges.filter(c => !c.completed && !c.claimed),
          ...challenges.filter(c => c.claimed),
        ].map(c => (
          <ChallengeCard
            key={c.id}
            c={c}
            onClaim={claim}
            claiming={claiming[c.id]}
            claimMsg={msg[c.id]}
          />
        ))}
      </div>
    </div>
  )
}
