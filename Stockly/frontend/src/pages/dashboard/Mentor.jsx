import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../AuthContext'
import api from '../../api'

const QUICK = [
  { label:'📈 Kaufen?',     build: a => `Ist ${a} aktuell ein guter Kaufzeitpunkt? Analysiere RSI, Trend und Marktlage.` },
  { label:'📉 Verkaufen?',  build: a => `Sollte ich ${a} jetzt verkaufen? Was sagen die Indikatoren?` },
  { label:'🔍 Analysieren', build: a => `Analysiere ${a} detailliert: Trends, Stärken, Risiken.` },
  { label:'⚠️ Risiko',      build: a => `Wie riskant ist ein Investment in ${a} aktuell?` },
  { label:'💡 Erklären',    build: null, concept: true },
]

const CONCEPTS = [
  'RSI','MACD','Stop-Loss','Dollar-Cost-Averaging (DCA)','Diversifikation',
  'KGV (Kurs-Gewinn-Verhältnis)','ETFs und Indexfonds','Volatilität',
  'Bullen- vs. Bärenmarkt','Technische Analyse','Fundamentalanalyse',
]

const POPULAR = [
  {name:'Apple',ticker:'AAPL'},{name:'NVIDIA',ticker:'NVDA'},{name:'Microsoft',ticker:'MSFT'},
  {name:'Tesla',ticker:'TSLA'},{name:'Amazon',ticker:'AMZN'},{name:'Alphabet',ticker:'GOOGL'},
  {name:'Meta',ticker:'META'},{name:'SAP',ticker:'SAP'},{name:'Bitcoin',ticker:'BTC-USD'},
  {name:'Ethereum',ticker:'ETH-USD'},{name:'Solana',ticker:'SOL-USD'},{name:'XRP',ticker:'XRP-USD'},
]

function MsgBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display:'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom:16 }}>
      {!isUser && (
        <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(107,18,32,0.6)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', flexShrink:0, marginRight:10, marginTop:2 }}>
          ◎
        </div>
      )}
      <div style={{
        maxWidth:'75%',
        padding: isUser ? '10px 16px' : '14px 18px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        background: isUser ? 'rgba(107,18,32,0.5)' : 'var(--s1)',
        border: isUser ? '1px solid rgba(107,18,32,0.7)' : '1px solid var(--border)',
        fontSize:'0.84rem', color: isUser ? 'rgba(255,255,255,0.9)' : 'var(--txt)',
        lineHeight: 1.75, whiteSpace:'pre-wrap',
      }}>
        {msg.content}
      </div>
    </div>
  )
}

const PROVIDER_COLORS = {
  anthropic:'#c96442', openai:'#10a37f', gemini:'#4285f4', mistral:'#ff7000', auto:'rgba(255,255,255,0.3)',
}
const PROVIDER_LABELS = {
  anthropic:'Claude', openai:'GPT-4o', gemini:'Gemini', mistral:'Mistral', auto:'KI-Fallback',
}

export default function Mentor() {
  const { user }                    = useAuth()
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [showQuick, setShowQuick]   = useState(null)
  const [activeQuick, setActiveQuick] = useState(null)
  const [assetQ, setAssetQ]         = useState('')
  const [provider, setProvider]     = useState('auto')
  const [providers, setProviders]   = useState({})
  const [showProv, setShowProv]     = useState(false)
  const chatRef                     = useRef(null)
  const inputRef                    = useRef(null)

  useEffect(() => {
    api.get('/api/mentor/history').then(r => setMessages(r.data.messages || [])).catch(() => {})
    api.get('/api/user/ai-providers').then(r => {
      setProviders(r.data.providers || {})
      setProvider(r.data.preferred || 'auto')
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, loading])

  const send = async (text) => {
    const q = (text || input).trim()
    if (!q) return
    const newMsgs = [...messages, { role:'user', content:q }]
    setMessages(newMsgs)
    setInput('')
    setShowQuick(null)
    setActiveQuick(null)
    setAssetQ('')
    setLoading(true)
    try {
      const r = await api.post('/api/mentor/chat', { messages: newMsgs, context:'general', provider })
      setMessages(m => [...m, { role:'assistant', content:r.data.reply }])
    } catch(e) {
      setMessages(m => [...m, { role:'assistant', content:'Verbindungsfehler. Bitte Backend prüfen.' }])
    }
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  const applyQuick = (q, asset) => {
    const text = q.build(`${asset.name} (${asset.ticker})`)
    send(text)
  }

  const applyConcept = (concept) => {
    send(`Erkläre mir "${concept}" einfach und verständlich für einen Börsenanfänger.`)
  }

  const filteredPop = assetQ.trim()
    ? POPULAR.filter(p => p.name.toLowerCase().includes(assetQ.toLowerCase()) || p.ticker.toLowerCase().includes(assetQ.toLowerCase()))
    : POPULAR

  const customAsset = assetQ.trim() && !POPULAR.some(p => p.ticker.toLowerCase() === assetQ.trim().toLowerCase())
    ? { name: assetQ.trim(), ticker: assetQ.trim().toUpperCase() }
    : null

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg)' }}>

      {/* Header */}
      <div style={{ padding:'20px 28px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
        <div style={{ fontSize:'0.58rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:4 }}>KI-Mentor</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:'1.2rem', fontWeight:300, color:'#fff' }}>Frag mich alles über Trading</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {/* Provider selector */}
            <div style={{ position:'relative' }}>
              <button onClick={() => setShowProv(v => !v)} style={{
                display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20,
                background:'rgba(255,255,255,0.06)', border:`1px solid ${PROVIDER_COLORS[provider]}44`,
                cursor:'pointer', fontSize:'0.68rem', fontWeight:600, color: PROVIDER_COLORS[provider],
                fontFamily:'inherit',
              }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:PROVIDER_COLORS[provider], boxShadow:`0 0 5px ${PROVIDER_COLORS[provider]}` }} />
                {PROVIDER_LABELS[provider] || provider}
                <span style={{ opacity:0.5, fontSize:'0.6rem' }}>▾</span>
              </button>
              {showProv && (
                <div style={{
                  position:'absolute', right:0, top:'calc(100% + 6px)', zIndex:50,
                  background:'var(--s1)', border:'1px solid var(--border)', borderRadius:10, padding:6, minWidth:170,
                  boxShadow:'0 8px 24px rgba(0,0,0,0.3)',
                }}>
                  {[['auto','KI-Fallback (kostenlos)'], ...Object.keys(PROVIDER_LABELS).filter(k=>k!=='auto').map(k=>[k, PROVIDER_LABELS[k]])].map(([pid, label]) => {
                    const configured = pid === 'auto' || providers[pid]?.configured
                    return (
                      <button key={pid} onClick={() => { setProvider(pid); setShowProv(false); api.post('/api/user/settings', { preferred_provider: pid }).catch(()=>{}) }} style={{
                        display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 10px',
                        borderRadius:7, cursor: configured ? 'pointer' : 'default', background: provider===pid ? 'rgba(255,255,255,0.07)' : 'transparent',
                        border:'none', fontFamily:'inherit', textAlign:'left', opacity: configured ? 1 : 0.4,
                      }}>
                        <div style={{ width:7, height:7, borderRadius:'50%', background:PROVIDER_COLORS[pid] || '#888', flexShrink:0 }} />
                        <span style={{ fontSize:'0.72rem', fontWeight: provider===pid ? 700 : 400, color:'var(--txt)' }}>{label}</span>
                        {!configured && pid !== 'auto' && <span style={{ fontSize:'0.58rem', color:'var(--txt3)', marginLeft:'auto' }}>kein Key</span>}
                      </button>
                    )
                  })}
                  <div style={{ borderTop:'1px solid var(--border)', marginTop:6, paddingTop:6, paddingLeft:10, fontSize:'0.6rem', color:'var(--txt3)' }}>
                    Keys → Einstellungen
                  </div>
                </div>
              )}
            </div>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} style={{ background:'none', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.35)', padding:'4px 10px', borderRadius:5, fontSize:'0.68rem', cursor:'pointer' }}>
                Verlauf löschen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div ref={chatRef} style={{ flex:1, overflowY:'auto', padding:'20px 28px' }}>

        {messages.length === 0 && !loading && (
          <div style={{ textAlign:'center', padding:'40px 20px' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:12, opacity:0.25 }}>◎</div>
            <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.3)', marginBottom:24, lineHeight:1.7 }}>
              Stelle mir jede Frage rund um Aktien, Krypto und Trading.<br/>
              Nutze die Schnellfragen unten oder tippe einfach los.
            </div>
          </div>
        )}

        {messages.map((msg, i) => <MsgBubble key={i} msg={msg} />)}

        {loading && (
          <div style={{ display:'flex', alignItems:'center', gap:10, color:'rgba(255,255,255,0.35)', fontSize:'0.78rem', marginBottom:16 }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(107,18,32,0.6)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', flexShrink:0 }}>◎</div>
            <div style={{ display:'flex', gap:4 }}>
              {[0,1,2].map(d => <div key={d} style={{ width:5, height:5, borderRadius:'50%', background:'rgba(255,255,255,0.4)', animation:`pulse 1.4s ease-in-out ${d*0.2}s infinite` }}/>)}
            </div>
          </div>
        )}
      </div>

      {/* Quick question popup */}
      {showQuick && (
        <div style={{ padding:'0 28px 8px', borderTop:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.2)' }}>
          {showQuick === 'asset' && (
            <div style={{ paddingTop:12 }}>
              <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:8 }}>
                {activeQuick?.label} — Aktie oder Krypto wählen:
              </div>
              <input
                value={assetQ} onChange={e => setAssetQ(e.target.value)}
                placeholder="Suche: Apple, BTC, NVDA …"
                autoFocus
                style={{ width:'100%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'#fff', padding:'8px 12px', borderRadius:6, fontSize:'0.8rem', outline:'none', marginBottom:8 }}
              />
              <div style={{ display:'flex', flexWrap:'wrap', gap:5, maxHeight:130, overflowY:'auto' }}>
                {[...filteredPop, ...(customAsset ? [customAsset] : [])].map(p => (
                  <button key={p.ticker} onClick={() => applyQuick(activeQuick, p)} style={{
                    padding:'5px 12px', borderRadius:20, border:'1px solid rgba(255,255,255,0.15)',
                    background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.8)', fontSize:'0.74rem', cursor:'pointer',
                  }}>
                    {p.name} <span style={{ color:'rgba(255,255,255,0.35)', fontFamily:'monospace', fontSize:'0.68rem' }}>{p.ticker}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {showQuick === 'concept' && (
            <div style={{ paddingTop:12 }}>
              <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:8 }}>Konzept auswählen:</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {CONCEPTS.map(c => (
                  <button key={c} onClick={() => applyConcept(c)} style={{
                    padding:'5px 14px', borderRadius:20, border:'1px solid rgba(255,255,255,0.15)',
                    background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.7)', fontSize:'0.74rem', cursor:'pointer',
                  }}>{c}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick action pills */}
      <div style={{ padding:'8px 28px 0', borderTop:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
          {QUICK.map((q, i) => (
            <button key={i} onClick={() => {
              if (q.concept) { setShowQuick(s => s==='concept' ? null : 'concept'); setActiveQuick(q) }
              else { setShowQuick(s => s==='asset' && activeQuick?.label===q.label ? null : 'asset'); setActiveQuick(q) }
            }} style={{
              padding:'5px 12px', borderRadius:20, fontSize:'0.72rem', cursor:'pointer',
              border:`1px solid ${showQuick&&activeQuick?.label===q.label ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
              background: showQuick&&activeQuick?.label===q.label ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
              color: showQuick&&activeQuick?.label===q.label ? '#fff' : 'rgba(255,255,255,0.45)',
            }}>{q.label}</button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding:'8px 28px 20px', flexShrink:0 }}>
        <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Frage stellen… (Enter zum Senden, Shift+Enter für neue Zeile)"
            rows={1}
            style={{
              flex:1, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.18)',
              color:'#fff', padding:'11px 16px', borderRadius:10, fontSize:'0.84rem', outline:'none',
              fontFamily:'inherit', resize:'none', lineHeight:1.5, maxHeight:120, overflowY:'auto',
            }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              padding:'11px 18px', background:'var(--acc)', border:'none', color:'#fff',
              borderRadius:10, cursor:'pointer', fontSize:'0.82rem', fontWeight:600,
              opacity: loading || !input.trim() ? 0.4 : 1, flexShrink:0,
            }}
          >
            {loading ? '…' : '↑'}
          </button>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}
