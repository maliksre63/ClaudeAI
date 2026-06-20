import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import Logo from '../components/Logo'

export default function Register() {
  const [email, setEmail]     = useState('')
  const [uname, setUname]     = useState('')
  const [pw, setPw]           = useState('')
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate     = useNavigate()

  const submit = async e => {
    e.preventDefault()
    setErr(''); setLoading(true)
    try {
      await register(email, uname, pw)
      navigate('/app')
    } catch(ex) {
      setErr(ex.response?.data?.detail || 'Registrierung fehlgeschlagen.')
    }
    setLoading(false)
  }

  const inp = {
    width:'100%', background:'rgba(61,10,20,0.18)', border:'1px solid rgba(184,168,156,0.2)',
    color:'#fff', padding:'12px 16px', borderRadius:8, fontSize:'0.88rem', outline:'none',
    transition:'border-color 0.2s', marginBottom:14, fontFamily:'inherit', boxSizing:'border-box',
  }
  const lbl = {
    display:'block', fontSize:'0.58rem', color:'rgba(255,255,255,0.45)',
    textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:6, fontWeight:600,
  }

  return (
    <div style={{
      minHeight:'100vh', background:'var(--bg)', display:'flex',
      alignItems:'center', justifyContent:'center', padding:24,
      position:'relative', overflow:'hidden',
    }}>
      {/* Ambient rings */}
      <div style={{ position:'absolute', width:600,  height:600,  borderRadius:'50%', border:'1px solid rgba(184,168,156,0.04)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', width:900,  height:900,  borderRadius:'50%', border:'1px solid rgba(184,168,156,0.025)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', width:1200, height:1200, borderRadius:'50%', border:'1px solid rgba(184,168,156,0.015)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:420, position:'relative', zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', gap:14 }}>
            <Logo size={52} showText={false}/>
            <div>
              <div style={{ fontSize:'1.5rem', fontWeight:700, letterSpacing:'-0.04em', color:'#fff' }}>Stockly</div>
              <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.3)', letterSpacing:'0.22em', textTransform:'uppercase', marginTop:2 }}>Trading Journal</div>
            </div>
          </div>
        </div>

        {/* Card */}
        <div style={{ background:'var(--s1)', borderRadius:16, padding:'32px 32px 28px', border:'1px solid var(--border)', boxShadow:'0 32px 80px rgba(0,0,0,0.4)' }}>
          <h2 style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--txt)', marginBottom:4, letterSpacing:'-0.02em' }}>Konto erstellen</h2>
          <p style={{ fontSize:'0.78rem', color:'var(--txt3)', marginBottom:22 }}>
            Echtzeit-Daten · KI-Mentor · Kein echtes Kapital
          </p>

          {err && (
            <div style={{ background:'rgba(160,16,8,0.1)', border:'1px solid var(--red)', borderRadius:8, padding:'10px 14px', fontSize:'0.78rem', color:'var(--red)', marginBottom:16, fontWeight:500 }}>
              {err}
            </div>
          )}

          <form onSubmit={submit}>
            <label style={lbl}>E-Mail</label>
            <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="name@email.de" required autoFocus
              onFocus={e=>e.target.style.borderColor='rgba(184,168,156,0.5)'}
              onBlur={e=>e.target.style.borderColor='rgba(184,168,156,0.2)'}/>

            <label style={lbl}>Benutzername</label>
            <input style={inp} type="text" value={uname} onChange={e=>setUname(e.target.value)}
              placeholder="mein_name" required minLength={3}
              onFocus={e=>e.target.style.borderColor='rgba(184,168,156,0.5)'}
              onBlur={e=>e.target.style.borderColor='rgba(184,168,156,0.2)'}/>

            <label style={lbl}>Passwort</label>
            <input style={inp} type="password" value={pw} onChange={e=>setPw(e.target.value)}
              placeholder="Mindestens 8 Zeichen" required minLength={8}
              onFocus={e=>e.target.style.borderColor='rgba(184,168,156,0.5)'}
              onBlur={e=>e.target.style.borderColor='rgba(184,168,156,0.2)'}/>

            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'13px', background:'var(--acc)', border:'none', color:'#fff',
              borderRadius:8, fontSize:'0.88rem', fontWeight:700, cursor:loading?'not-allowed':'pointer',
              opacity:loading?0.7:1, transition:'opacity 0.15s, transform 0.1s', marginTop:6,
              letterSpacing:'0.02em',
            }}
              onMouseEnter={e=>!loading&&(e.target.style.transform='scale(1.01)')}
              onMouseLeave={e=>(e.target.style.transform='scale(1)')}
            >
              {loading ? 'Erstelle Konto…' : 'Konto erstellen →'}
            </button>
          </form>

          <p style={{ textAlign:'center', marginTop:20, fontSize:'0.78rem', color:'var(--txt3)', paddingTop:18, borderTop:'1px solid var(--border)' }}>
            Bereits registriert?{' '}
            <Link to="/login" style={{ color:'var(--acc)', fontWeight:600 }}>Anmelden</Link>
          </p>
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:'0.7rem', color:'rgba(255,255,255,0.2)', letterSpacing:'0.04em' }}>
          Reale Marktdaten · Kein echtes Kapital
        </div>
      </div>
    </div>
  )
}
