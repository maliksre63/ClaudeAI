import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import Logo from '../components/Logo'

const TEST_ACCOUNTS = [
  { email:'pro@stockly.de',    pw:'test1234', label:'trading_pro',   sub:'Level 6 · Aggressiv' },
  { email:'luna@stockly.de',   pw:'test1234', label:'luna_trades',   sub:'Level 7 · Meiste Trades' },
  { email:'admin@stockly.de',  pw:'admin1234',label:'admin_test',    sub:'Level 9 · Alle Kategorien' },
  { email:'krypto@stockly.de', pw:'test1234', label:'krypto_fan',    sub:'Level 5 · Krypto' },
  { email:'max@stockly.de',    pw:'test1234', label:'max_mueller',   sub:'Level 3 · Moderat' },
  { email:'demo@stockly.de',   pw:'demo1234', label:'demo_user',     sub:'Level 1 · Leer' },
]

export default function Login() {
  const [tab, setTab]           = useState('login')
  const [email, setEmail]       = useState('')
  const [username, setUsername] = useState('')
  const [pw, setPw]             = useState('')
  const [err, setErr]           = useState('')
  const [loading, setLoading]   = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const { login, register }     = useAuth()
  const navigate                = useNavigate()

  const doLogin = async (e_mail, password) => {
    setErr(''); setLoading(true)
    try {
      await login(e_mail, password)
      navigate('/app/overview')
    } catch(ex) { setErr(ex.response?.data?.detail || 'Fehler beim Anmelden.') }
    setLoading(false)
  }

  const submit = async e => {
    e.preventDefault()
    if (tab === 'login') { await doLogin(email, pw) }
    else {
      setErr(''); setLoading(true)
      try {
        await register(email, username, pw)
        navigate('/app/overview')
      } catch(ex) { setErr(ex.response?.data?.detail || 'Fehler beim Registrieren.') }
      setLoading(false)
    }
  }

  const inp = {
    width:'100%', background:'rgba(61,10,20,0.18)', border:'1px solid rgba(184,168,156,0.2)',
    color:'#fff', padding:'12px 16px', borderRadius:8, fontSize:'0.88rem', outline:'none',
    transition:'border-color 0.2s', marginBottom:14, fontFamily:'inherit', boxSizing:'border-box',
  }
  const lbl = { display:'block', fontSize:'0.58rem', color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:6, fontWeight:600 }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative', overflow:'hidden' }}>

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

          {/* Tabs */}
          <div style={{ display:'flex', marginBottom:28, background:'var(--s2)', borderRadius:8, padding:3 }}>
            {[['login','Anmelden'],['register','Registrieren']].map(([t,l])=>(
              <button key={t} onClick={()=>{setTab(t);setErr('')}} style={{
                flex:1, padding:'8px', borderRadius:6, border:'none', cursor:'pointer', fontSize:'0.8rem', fontWeight:600,
                background: tab===t ? 'var(--s1)' : 'transparent',
                color: tab===t ? 'var(--txt)' : 'var(--txt3)',
                transition:'all 0.15s',
                boxShadow: tab===t ? '0 1px 4px rgba(61,10,20,0.1)' : 'none',
              }}>{l}</button>
            ))}
          </div>

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

            {tab === 'register' && (
              <>
                <label style={lbl}>Benutzername</label>
                <input style={inp} type="text" value={username} onChange={e=>setUsername(e.target.value)}
                  placeholder="mein_name" required
                  onFocus={e=>e.target.style.borderColor='rgba(184,168,156,0.5)'}
                  onBlur={e=>e.target.style.borderColor='rgba(184,168,156,0.2)'}/>
              </>
            )}

            <label style={lbl}>Passwort</label>
            <input style={inp} type="password" value={pw} onChange={e=>setPw(e.target.value)}
              placeholder="••••••••" required
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
              {loading ? 'Laden…' : tab==='login' ? 'Anmelden →' : 'Konto erstellen →'}
            </button>
          </form>

          {/* Test-Accounts */}
          {tab === 'login' && (
            <div style={{ marginTop:20, paddingTop:18, borderTop:'1px solid var(--border)' }}>
              <button onClick={()=>setShowAccounts(s=>!s)} style={{ background:'none', border:'none', color:'var(--txt3)', fontSize:'0.7rem', cursor:'pointer', padding:0, width:'100%', textAlign:'center', letterSpacing:'0.04em' }}>
                {showAccounts ? '▲ Test-Accounts ausblenden' : '▼ Test-Accounts anzeigen'}
              </button>

              {showAccounts && (
                <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:5 }}>
                  {TEST_ACCOUNTS.map(acc => (
                    <button key={acc.email} onClick={()=>doLogin(acc.email, acc.pw)} style={{
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                      background:'var(--s2)', border:'1px solid var(--border)', borderRadius:7,
                      padding:'8px 12px', cursor:'pointer', transition:'border-color 0.12s',
                      width:'100%',
                    }}
                      onMouseEnter={e=>e.currentTarget.style.borderColor='var(--acc)'}
                      onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
                    >
                      <span style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--txt)', fontFamily:'monospace' }}>{acc.label}</span>
                      <span style={{ fontSize:'0.65rem', color:'var(--txt3)' }}>{acc.sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:'0.7rem', color:'rgba(255,255,255,0.2)', letterSpacing:'0.04em' }}>
          Reale Marktdaten · Kein echtes Kapital
        </div>
      </div>
    </div>
  )
}
