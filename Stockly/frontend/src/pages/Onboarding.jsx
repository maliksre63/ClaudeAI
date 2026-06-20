import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import Logo from '../components/Logo'
import api from '../api'

const INTERESTS = [
  { id:'tech',        label:'Tech & Growth',     icon:'💻', desc:'NVIDIA, Apple, Microsoft' },
  { id:'krypto',      label:'Krypto',            icon:'₿',  desc:'Bitcoin, Ethereum, Altcoins' },
  { id:'etf',         label:'ETFs & Passiv',     icon:'📊', desc:'MSCI World, S&P 500' },
  { id:'dividenden',  label:'Dividenden',        icon:'💰', desc:'Stabile Erträge, REITs' },
  { id:'dax',         label:'DAX & Deutschland', icon:'🇩🇪', desc:'SAP, Siemens, Volkswagen' },
  { id:'rohstoffe',   label:'Rohstoffe',         icon:'🏅', desc:'Gold, Öl, Silber' },
]

const RISK_PROFILES = [
  { id:'konservativ', label:'Konservativ',  desc:'Ich bevorzuge Sicherheit über Rendite.', color:'#065f2e' },
  { id:'moderat',     label:'Moderat',      desc:'Ausgewogenes Verhältnis aus Risiko & Rendite.', color:'#92400e' },
  { id:'aggressiv',   label:'Aggressiv',    desc:'Ich nehme Schwankungen für höhere Gewinne in Kauf.', color:'#a01008' },
]

export default function Onboarding({ onDone }) {
  const [step, setStep]         = useState(0)
  const [interests, setInterests] = useState([])
  const [risk, setRisk]         = useState('moderat')
  const [saving, setSaving]     = useState(false)
  const { setUser, user }       = useAuth()
  const navigate                = useNavigate()

  const toggleInterest = (id) => {
    setInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const finish = async () => {
    setSaving(true)
    try {
      const r = await api.patch('/api/user/profile', {
        risk_profile: risk,
        interests,
        onboarding_done: true,
      })
      setUser(r.data)
    } catch(e) {}
    setSaving(false)
    onDone()
  }

  const steps = [
    /* Step 0: Willkommen */
    <div key={0} style={{ textAlign:'center' }}>
      <Logo size={56} showText={false} style={{ marginBottom:28 }}/>
      <div style={{ marginTop:24, marginBottom:8, fontSize:'1.6rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff' }}>
        Willkommen bei Stockly
      </div>
      <div style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.45)', marginBottom:36, lineHeight:1.7, maxWidth:380, margin:'12px auto 36px' }}>
        Die smarte Paper-Trading-Plattform zum Lernen. Keine echten Investments — aber echte Marktdaten.
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:36 }}>
        {[['📈','Echte Kurse','Live-Marktdaten von yfinance'], ['🤖','KI-Mentor','Professionelle Marktanalysen'], ['🎓','Lernpfad','Von Basics bis Profi-Strategien']].map(([icon,title,sub]) => (
          <div key={title} style={{ background:'rgba(255,255,255,0.06)', borderRadius:12, padding:'18px 12px', border:'1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize:'1.5rem', marginBottom:8 }}>{icon}</div>
            <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#fff', marginBottom:4 }}>{title}</div>
            <div style={{ fontSize:'0.66rem', color:'rgba(255,255,255,0.35)', lineHeight:1.4 }}>{sub}</div>
          </div>
        ))}
      </div>
      <button onClick={()=>setStep(1)} style={primaryBtn}>Los geht's →</button>
    </div>,

    /* Step 1: Risikoprofil */
    <div key={1}>
      <div style={{ marginBottom:6, fontSize:'0.6rem', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.16em' }}>Schritt 1 von 3</div>
      <div style={{ fontSize:'1.3rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff', marginBottom:6 }}>Dein Risikoprofil</div>
      <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', marginBottom:24 }}>Wie gehst du mit Verlustrisiken um?</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
        {RISK_PROFILES.map(r => (
          <div key={r.id} onClick={()=>setRisk(r.id)} style={{
            padding:'16px 20px', borderRadius:12, cursor:'pointer', transition:'all 0.15s',
            border: `2px solid ${risk===r.id ? r.color : 'rgba(255,255,255,0.1)'}`,
            background: risk===r.id ? `rgba(255,255,255,0.05)` : 'transparent',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:12, height:12, borderRadius:'50%', background:r.color, flexShrink:0 }}/>
              <div>
                <div style={{ fontSize:'0.9rem', fontWeight:600, color:'#fff' }}>{r.label}</div>
                <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)', marginTop:2 }}>{r.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={()=>setStep(0)} style={secondaryBtn}>Zurück</button>
        <button onClick={()=>setStep(2)} style={{ ...primaryBtn, flex:1 }}>Weiter →</button>
      </div>
    </div>,

    /* Step 2: Interessen */
    <div key={2}>
      <div style={{ marginBottom:6, fontSize:'0.6rem', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.16em' }}>Schritt 2 von 3</div>
      <div style={{ fontSize:'1.3rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff', marginBottom:6 }}>Was interessiert dich?</div>
      <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', marginBottom:20 }}>Wähle alle aus, die passen.</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:28 }}>
        {INTERESTS.map(i => {
          const sel = interests.includes(i.id)
          return (
            <div key={i.id} onClick={()=>toggleInterest(i.id)} style={{
              padding:'14px 16px', borderRadius:10, cursor:'pointer', transition:'all 0.15s',
              border: `2px solid ${sel ? 'rgba(184,168,156,0.5)' : 'rgba(255,255,255,0.1)'}`,
              background: sel ? 'rgba(184,168,156,0.1)' : 'transparent',
            }}>
              <div style={{ fontSize:'1.3rem', marginBottom:6 }}>{i.icon}</div>
              <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#fff', marginBottom:2 }}>{i.label}</div>
              <div style={{ fontSize:'0.64rem', color:'rgba(255,255,255,0.35)' }}>{i.desc}</div>
            </div>
          )
        })}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={()=>setStep(1)} style={secondaryBtn}>Zurück</button>
        <button onClick={()=>setStep(3)} style={{ ...primaryBtn, flex:1 }}>Weiter →</button>
      </div>
    </div>,

    /* Step 3: Fertig */
    <div key={3} style={{ textAlign:'center' }}>
      <div style={{ fontSize:'2.5rem', marginBottom:16 }}>🎉</div>
      <div style={{ fontSize:'1.4rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff', marginBottom:8 }}>
        Alles bereit, {user?.username}!
      </div>
      <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)', marginBottom:36, lineHeight:1.7 }}>
        Dein Profil ist eingerichtet. Starte jetzt mit dem ersten Trade oder lerne im Lernpfad die Grundlagen.
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:32 }}>
        <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:12, padding:'16px', border:'1px solid rgba(255,255,255,0.08)', textAlign:'left' }}>
          <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:6 }}>Risikoprofil</div>
          <div style={{ fontSize:'0.9rem', fontWeight:600, color:'#fff', textTransform:'capitalize' }}>{risk}</div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:12, padding:'16px', border:'1px solid rgba(255,255,255,0.08)', textAlign:'left' }}>
          <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:6 }}>Interessen</div>
          <div style={{ fontSize:'0.82rem', fontWeight:500, color:'#fff' }}>{interests.length > 0 ? interests.join(', ') : 'Noch keine gewählt'}</div>
        </div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={()=>setStep(2)} style={secondaryBtn}>Zurück</button>
        <button onClick={finish} disabled={saving} style={{ ...primaryBtn, flex:1, opacity:saving?0.7:1 }}>
          {saving ? 'Speichere…' : 'Dashboard öffnen →'}
        </button>
      </div>
    </div>,
  ]

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--bg)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24, overflow:'auto' }}>
      {/* Ambient rings */}
      <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', border:'1px solid rgba(184,168,156,0.04)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', width:1000, height:1000, borderRadius:'50%', border:'1px solid rgba(184,168,156,0.02)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:480, position:'relative', zIndex:1 }}>
        {/* Progress bar */}
        <div style={{ height:2, background:'rgba(255,255,255,0.08)', borderRadius:1, marginBottom:32, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${(step/3)*100}%`, background:'rgba(184,168,156,0.5)', borderRadius:1, transition:'width 0.4s ease' }}/>
        </div>

        {/* Logo top */}
        <div style={{ marginBottom:28 }}>
          <Logo size={24} textColor="rgba(255,255,255,0.4)"/>
        </div>

        {/* Step content */}
        <div>{steps[step]}</div>
      </div>
    </div>
  )
}

const primaryBtn = {
  background:'rgba(184,168,156,0.15)', border:'1px solid rgba(184,168,156,0.3)', color:'#fff',
  padding:'13px 28px', borderRadius:10, cursor:'pointer', fontSize:'0.88rem', fontWeight:600,
  transition:'all 0.15s', letterSpacing:'0.01em',
}
const secondaryBtn = {
  background:'transparent', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.45)',
  padding:'13px 18px', borderRadius:10, cursor:'pointer', fontSize:'0.82rem',
}
