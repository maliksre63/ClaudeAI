import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../AuthContext'
import api from '../../api'

const card = { background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:'24px 26px', marginBottom:16 }
const lbl  = { fontSize:'0.58rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:6, display:'block', fontWeight:600 }
const inp  = { width:'100%', background:'var(--s2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', fontSize:'0.86rem', color:'var(--txt)', outline:'none', fontFamily:'inherit', marginBottom:0 }

const THEMES = [
  { id:'bordeaux', label:'Bordeaux',  preview:'#3d0a14', accent:'#6b1220', desc:'Klassisch warm' },
  { id:'navy',     label:'Dark Navy', preview:'#0a1628', accent:'#2563eb', desc:'Professionell blau' },
  { id:'dark',     label:'Pure Dark', preview:'#0d0d0d', accent:'#7c3aed', desc:'Minimal dunkel' },
]

function applyTheme(id) {
  document.documentElement.setAttribute('data-theme', id)
  localStorage.setItem('stockly_theme', id)
}

const PROVIDER_META = {
  anthropic: { label:'Claude (Anthropic)', color:'#c96442', placeholder:'sk-ant-api03-…', url:'console.anthropic.com', desc:'Leistungsstärkstes Modell, ideal für Finanzanalysen' },
  openai:    { label:'GPT-4o (OpenAI)',    color:'#10a37f', placeholder:'sk-…',           url:'platform.openai.com',  desc:'Weit verbreitet, stark in Erklärungen' },
  gemini:    { label:'Gemini (Google)',    color:'#4285f4', placeholder:'AIzaSy…',        url:'aistudio.google.com',  desc:'Kostenlose Stufe verfügbar' },
  mistral:   { label:'Mistral AI',         color:'#ff7000', placeholder:'…',              url:'console.mistral.ai',   desc:'Europäisch & datenschutzfreundlich' },
}

function AIProvidersCard() {
  const [providers, setProviders] = useState({})
  const [preferred, setPreferred] = useState('auto')
  const [keys, setKeys]   = useState({ anthropic:'', openai:'', gemini:'', mistral:'' })
  const [msgs, setMsgs]   = useState({})
  const [saving, setSaving] = useState({})
  const [show, setShow]   = useState({})

  useEffect(() => {
    api.get('/api/user/ai-providers').then(r => {
      setProviders(r.data.providers || {})
      setPreferred(r.data.preferred || 'auto')
    }).catch(() => {})
  }, [])

  const save = async (pid) => {
    setSaving(s => ({ ...s, [pid]: true }))
    try {
      await api.post('/api/user/settings', { [`${pid}_api_key`]: keys[pid] })
      setMsgs(m => ({ ...m, [pid]: 'Gespeichert ✓' }))
      setProviders(p => ({ ...p, [pid]: { ...p[pid], configured: !!keys[pid], key_preview: keys[pid] ? keys[pid].slice(0,8)+'…' : '' } }))
      setTimeout(() => setMsgs(m => { const n={...m}; delete n[pid]; return n }), 2500)
    } catch { setMsgs(m => ({ ...m, [pid]: 'Fehler!' })) }
    setSaving(s => ({ ...s, [pid]: false }))
  }

  const setPreferredProvider = async (pid) => {
    setPreferred(pid)
    await api.post('/api/user/settings', { preferred_provider: pid }).catch(() => {})
  }

  const remove = async (pid) => {
    setKeys(k => ({ ...k, [pid]: '' }))
    await api.post('/api/user/settings', { [`${pid}_api_key`]: '' }).catch(() => {})
    setProviders(p => ({ ...p, [pid]: { ...p[pid], configured: false, key_preview: '' } }))
  }

  return (
    <div style={{ ...card, marginBottom:16 }}>
      <div style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--txt)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:6 }}>
        KI-Mentor — Verbindungen
      </div>
      <div style={{ fontSize:'0.76rem', color:'var(--txt3)', marginBottom:20, lineHeight:1.5 }}>
        Verbinde deine eigenen KI-API-Schlüssel. Ohne Schlüssel läuft ein intelligenter regelbasierter Fallback.
        Der bevorzugte Anbieter wird im KI-Mentor verwendet.
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {Object.entries(PROVIDER_META).map(([pid, meta]) => {
          const info = providers[pid] || {}
          const isConfigured = info.configured
          const isPreferred  = preferred === pid
          return (
            <div key={pid} style={{
              background:'var(--s2)', borderRadius:10, padding:'14px 16px',
              border: `1px solid ${isPreferred ? meta.color+'55' : 'var(--border)'}`,
              transition:'border-color 0.2s',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: show[pid] ? 12 : 0 }}>
                {/* Provider dot + name */}
                <div style={{ width:10, height:10, borderRadius:'50%', background: isConfigured ? meta.color : 'rgba(255,255,255,0.15)', flexShrink:0, boxShadow: isConfigured ? `0 0 6px ${meta.color}80` : 'none' }} />
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontWeight:700, fontSize:'0.82rem', color:'var(--txt)' }}>{meta.label}</span>
                    {isConfigured && (
                      <span style={{ fontSize:'0.58rem', padding:'2px 7px', borderRadius:10, background:`${meta.color}22`, color:meta.color, fontWeight:700 }}>
                        {isPreferred ? 'Bevorzugt' : 'Verbunden'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:'0.64rem', color:'var(--txt3)', marginTop:1 }}>{meta.desc}</div>
                </div>
                {/* Actions */}
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  {isConfigured && !isPreferred && (
                    <button onClick={() => setPreferredProvider(pid)} style={{
                      fontSize:'0.62rem', padding:'4px 10px', borderRadius:6, cursor:'pointer',
                      border:`1px solid ${meta.color}55`, background:'transparent', color:meta.color, fontFamily:'inherit', fontWeight:600,
                    }}>Bevorzugen</button>
                  )}
                  {isConfigured && (
                    <button onClick={() => remove(pid)} style={{
                      fontSize:'0.62rem', padding:'4px 8px', borderRadius:6, cursor:'pointer',
                      border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'var(--txt3)', fontFamily:'inherit',
                    }}>Entfernen</button>
                  )}
                  <button onClick={() => setShow(s => ({ ...s, [pid]: !s[pid] }))} style={{
                    fontSize:'0.62rem', padding:'4px 10px', borderRadius:6, cursor:'pointer',
                    border:'1px solid var(--border)', background: show[pid] ? 'rgba(255,255,255,0.06)' : 'transparent',
                    color:'var(--txt2)', fontFamily:'inherit', fontWeight:600,
                  }}>
                    {show[pid] ? 'Schließen' : (isConfigured ? 'Ändern' : '+ Verbinden')}
                  </button>
                </div>
              </div>

              {show[pid] && (
                <div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <div style={{ position:'relative', flex:1 }}>
                      <input
                        type={show[pid+'_visible'] ? 'text' : 'password'}
                        value={keys[pid]}
                        onChange={e => setKeys(k => ({ ...k, [pid]: e.target.value }))}
                        placeholder={meta.placeholder}
                        style={{ ...inp, paddingRight:36 }}
                        onFocus={e => e.target.style.borderColor = meta.color}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        onKeyDown={e => e.key === 'Enter' && save(pid)}
                      />
                      <button onClick={() => setShow(s => ({ ...s, [pid+'_visible']: !s[pid+'_visible'] }))} style={{
                        position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                        background:'none', border:'none', cursor:'pointer', color:'var(--txt3)', fontSize:'0.8rem', padding:2,
                      }}>
                        {show[pid+'_visible'] ? '🙈' : '👁'}
                      </button>
                    </div>
                    <button onClick={() => save(pid)} disabled={saving[pid]} style={{
                      padding:'10px 16px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit',
                      background: meta.color, color:'#fff', fontWeight:700, fontSize:'0.78rem', flexShrink:0,
                      opacity: saving[pid] ? 0.6 : 1,
                    }}>
                      {saving[pid] ? '…' : 'Speichern'}
                    </button>
                  </div>
                  {msgs[pid] && (
                    <div style={{ marginTop:6, fontSize:'0.7rem', color: msgs[pid].includes('✓') ? 'var(--green)' : 'var(--red)', fontWeight:600 }}>
                      {msgs[pid]}
                    </div>
                  )}
                  <div style={{ marginTop:6, fontSize:'0.62rem', color:'var(--txt3)' }}>
                    API-Schlüssel erhältst du unter {meta.url} · Wird nur lokal gespeichert
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop:14, padding:'10px 14px', background:'rgba(255,255,255,0.03)', borderRadius:8, fontSize:'0.66rem', color:'var(--txt3)', lineHeight:1.6 }}>
        Ohne verbundene KI läuft ein intelligenter regelbasierter Fallback mit echten Marktdaten — kostenlos und ohne Schlüssel.
      </div>
    </div>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const [theme, setTheme] = useState(() => localStorage.getItem('stockly_theme') || 'bordeaux')

  useEffect(() => {
    const saved = localStorage.getItem('stockly_theme') || 'bordeaux'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  return (
    <div style={{ padding:'28px 32px', maxWidth:680 }}>
      <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:6 }}>Konfiguration</div>
      <div style={{ fontSize:'1.4rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff', marginBottom:24 }}>Einstellungen</div>

      {/* Profile */}
      <div style={card}>
        <div style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--txt)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:18 }}>Profil</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div>
            <label style={lbl}>Benutzername</label>
            <input style={{ ...inp, opacity:0.6, cursor:'not-allowed' }} value={user?.username || ''} readOnly/>
          </div>
          <div>
            <label style={lbl}>E-Mail</label>
            <input style={{ ...inp, opacity:0.6, cursor:'not-allowed' }} value={user?.email || ''} readOnly/>
          </div>
        </div>
        <div style={{ marginTop:14, padding:'10px 14px', background:'var(--s2)', borderRadius:8, fontSize:'0.74rem', color:'var(--txt2)' }}>
          Level {user?.level || 1} · {user?.xp || 0} XP · Profil-Änderungen sind noch nicht verfügbar
        </div>
      </div>

      {/* Theme */}
      <div style={card}>
        <div style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--txt)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:6 }}>Erscheinungsbild</div>
        <div style={{ fontSize:'0.76rem', color:'var(--txt3)', marginBottom:18 }}>Farbthema der App auswählen</div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id); applyTheme(t.id) }}
              style={{
                padding:'14px 18px', borderRadius:10, cursor:'pointer', border:'none', fontFamily:'inherit',
                background: theme === t.id ? 'var(--acc)' : 'var(--s2)',
                outline: theme === t.id ? `2px solid var(--acc)` : '2px solid transparent',
                outlineOffset:2,
                transition:'all 0.18s', textAlign:'left', minWidth:140,
              }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ width:20, height:20, borderRadius:5, background:t.preview, border:`3px solid ${t.accent}`, flexShrink:0 }} />
                <span style={{ fontWeight:700, fontSize:'0.84rem', color: theme === t.id ? '#fff' : 'var(--txt)' }}>{t.label}</span>
                {theme === t.id && <span style={{ marginLeft:'auto', fontSize:'0.8rem', color:'#fff' }}>✓</span>}
              </div>
              <div style={{ fontSize:'0.66rem', color: theme === t.id ? 'rgba(255,255,255,0.65)' : 'var(--txt3)' }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* AI Providers */}
      <AIProvidersCard />

      {/* Data */}
      <div style={card}>
        <div style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--txt)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:18 }}>Daten & Export</div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={async () => {
            const r = await api.get('/api/trades/export', { responseType:'blob' })
            const url = URL.createObjectURL(r.data)
            const a = document.createElement('a'); a.href=url; a.download='trades.csv'; a.click()
            URL.revokeObjectURL(url)
          }} style={{ background:'var(--s2)', border:'1px solid var(--border)', color:'var(--txt)', padding:'10px 20px', borderRadius:8, cursor:'pointer', fontSize:'0.82rem', fontWeight:600 }}>
            ↓ Trades als CSV exportieren
          </button>
        </div>
      </div>

      {/* App info */}
      <div style={card}>
        <div style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--txt)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:14 }}>Über Stockly</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {[
            { label:'Version', value:'2.0.0' },
            { label:'Plattform', value: typeof window !== 'undefined' && window.electronAPI ? 'Electron Desktop' : 'Web App' },
            { label:'Marktdaten', value:'yfinance + CoinGecko' },
            { label:'KI-Mentor', value:'Anthropic Claude + Fallback' },
          ].map((f,i) => (
            <div key={i} style={{ background:'var(--s2)', borderRadius:8, padding:'12px 14px' }}>
              <div style={{ fontSize:'0.55rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:4 }}>{f.label}</div>
              <div style={{ fontSize:'0.86rem', fontWeight:600, color:'var(--txt)' }}>{f.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:14, fontSize:'0.7rem', color:'var(--txt3)', lineHeight:1.6 }}>
          Stockly ist eine Paper-Trading-Plattform für Lernzwecke. Keine echten Investments. Alle Marktdaten werden von yfinance und der CoinGecko API bezogen.
        </div>
      </div>
    </div>
  )
}
