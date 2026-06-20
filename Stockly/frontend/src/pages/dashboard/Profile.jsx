import { useState } from 'react'
import { useAuth } from '../../AuthContext'
import api from '../../api'

const LEVELS = {1:'Einsteiger',2:'Beobachter',3:'Analyst',4:'Trader',5:'Profi',6:'Experte',7:'Stratege',8:'Meister',9:'Guru',10:'Legende'}
const LVL_XP = {1:[0,150],2:[150,400],3:[400,800],4:[800,1500],5:[1500,2500],6:[2500,4000],7:[4000,6000],8:[6000,9000],9:[9000,13000],10:[13000,99999]}

const lbl = { fontSize:'0.58rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.14em' }
const inp = { width:'100%', background:'var(--s2)', border:'1px solid var(--border)', color:'var(--txt)', padding:'9px 12px', borderRadius:6, fontSize:'0.82rem', outline:'none' }

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [risk, setRisk] = useState(user?.risk_profile || 'moderat')
  const [lang, setLang] = useState(user?.lang || 'de')
  const [saved, setSaved] = useState(false)

  const save = async () => {
    await api.patch('/api/user/profile', { risk_profile: risk, lang })
    await refreshUser()
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const lvl = user?.level || 1
  const xp  = user?.xp || 0
  const [lo, hi] = LVL_XP[lvl] || [0, 150]
  const pct = Math.min(100, ((xp - lo) / (hi - lo)) * 100)

  const card = { background:'var(--s1)', border:'1px solid var(--border)', borderRadius:8, padding:'22px 26px', marginBottom:12 }
  const row  = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--bl)', fontSize:'0.82rem' }

  return (
    <div style={{ padding:'28px 32px', maxWidth:700 }}>
      <div style={{ fontSize:'0.6rem', color:'var(--txt3)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:20 }}>Profil</div>
      <div style={{ fontSize:'1.4rem', fontWeight:300, letterSpacing:'-0.03em', marginBottom:28 }}>Konto & Einstellungen</div>

      {/* Account */}
      <div style={card}>
        <div style={{ ...lbl, marginBottom:14 }}>Account</div>
        <div style={row}><span style={{ color:'var(--txt3)' }}>Benutzername</span><span style={{ fontWeight:500 }}>{user?.username}</span></div>
        <div style={row}><span style={{ color:'var(--txt3)' }}>E-Mail</span><span style={{ color:'var(--txt2)' }}>{user?.email}</span></div>
        <div style={row}><span style={{ color:'var(--txt3)' }}>Mitglied seit</span><span style={{ color:'var(--txt2)' }}>{user?.created_at?.slice(0,10)}</span></div>
        <div style={{ ...row, borderBottom:'none' }}><span style={{ color:'var(--txt3)' }}>Plan</span><span style={{ color:'var(--acc)', textTransform:'uppercase', fontSize:'0.72rem', letterSpacing:'0.1em', fontWeight:500 }}>{user?.plan}</span></div>
      </div>

      {/* Level */}
      <div style={card}>
        <div style={{ ...lbl, marginBottom:14 }}>Level & Fortschritt</div>
        <div style={row}><span style={{ color:'var(--txt3)' }}>Level</span><span style={{ fontWeight:500 }}>Level {lvl} · {LEVELS[lvl]}</span></div>
        <div style={row}><span style={{ color:'var(--txt3)' }}>XP</span><span style={{ fontVariantNumeric:'tabular-nums' }}>{xp} / {hi}</span></div>
        <div style={{ ...row, borderBottom:'none' }}><span style={{ color:'var(--txt3)' }}>Streak</span><span>{user?.streak || 0} Tage</span></div>
        <div style={{ marginTop:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.62rem', color:'var(--txt3)', marginBottom:6 }}>
            <span>Fortschritt zu Level {Math.min(lvl+1,10)}</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div style={{ height:3, background:'var(--bl)', borderRadius:2 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'var(--acc)', borderRadius:2, transition:'width 0.6s ease' }} />
          </div>
        </div>
      </div>

      {/* Settings */}
      <div style={card}>
        <div style={{ ...lbl, marginBottom:18 }}>Einstellungen</div>

        <div style={{ marginBottom:20 }}>
          <div style={{ ...lbl, marginBottom:10 }}>Risikoprofil</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {[
              { id:'konservativ', label:'Konservativ', sub:'1.5% / Trade', color:'var(--green)' },
              { id:'moderat',     label:'Moderat',     sub:'4% / Trade',   color:'var(--amber)' },
              { id:'aggressiv',   label:'Aggressiv',   sub:'8% / Trade',   color:'var(--red)'   },
            ].map(r => (
              <div key={r.id} onClick={() => setRisk(r.id)} style={{
                padding:'12px 10px', borderRadius:7, cursor:'pointer', textAlign:'center',
                border:`1px solid ${risk===r.id ? 'var(--acc-b)' : 'var(--border)'}`,
                background: risk===r.id ? 'var(--acc-l)' : 'var(--s2)',
                transition:'all 0.15s',
              }}>
                <div style={{ fontSize:'0.8rem', fontWeight:500, color: r.color, marginBottom:3 }}>{r.label}</div>
                <div style={{ fontSize:'0.65rem', color:'var(--txt3)' }}>{r.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:22 }}>
          <div style={{ ...lbl, marginBottom:8 }}>Sprache</div>
          <select style={inp} value={lang} onChange={e => setLang(e.target.value)}>
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <button onClick={save} style={{
            padding:'9px 22px', background:'var(--acc)', border:'none', color:'#fff',
            borderRadius:6, fontSize:'0.8rem', fontWeight:500, cursor:'pointer', letterSpacing:'0.02em',
          }}>
            Speichern
          </button>
          {saved && <span style={{ fontSize:'0.76rem', color:'var(--green)', letterSpacing:'0.04em' }}>Gespeichert</span>}
        </div>
      </div>
    </div>
  )
}
