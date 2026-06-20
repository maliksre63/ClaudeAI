import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'

const fmt  = (n,d=2) => n==null?'–':Number(n).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d})
const card = { background:'var(--s1)', border:'1px solid var(--border)', borderRadius:10 }
const inp  = { background:'var(--s2)', border:'1px solid var(--border)', borderRadius:6, padding:'8px 12px',
               fontSize:'0.8rem', color:'var(--txt)', outline:'none', fontFamily:'inherit' }

function AlertPanel({ items, alerts, onAdd, onDelete }) {
  const [ticker,    setTicker]    = useState(items[0]?.ticker || '')
  const [direction, setDirection] = useState('below')
  const [target,    setTarget]    = useState('')
  const [adding,    setAdding]    = useState(false)
  const [err,       setErr]       = useState('')

  const add = async () => {
    if (!ticker || !target) return setErr('Bitte Ticker und Zielpreis angeben.')
    const t = parseFloat(target)
    if (isNaN(t) || t <= 0) return setErr('Ungültiger Preis.')
    setAdding(true); setErr('')
    const item = items.find(i => i.ticker === ticker)
    await onAdd({ ticker, name: item?.name || ticker, direction, target: t })
    setTarget(''); setAdding(false)
  }

  const dirLabel = d => d === 'below' ? '≤ Stop-Loss (fällt auf)' : '≥ Take-Profit (steigt auf)'

  return (
    <div style={{ marginTop:28 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.18em', textTransform:'uppercase' }}>
          Kurs-Alerts
        </div>
        <div style={{ height:1, flex:1, background:'rgba(255,255,255,0.08)' }} />
        <div style={{ fontSize:'0.66rem', color:'rgba(255,255,255,0.25)' }}>
          {alerts.length} aktiv
        </div>
      </div>

      {/* Add alert form */}
      <div style={{ ...card, padding:'16px 20px', marginBottom:16 }}>
        <div style={{ fontSize:'0.64rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:14, fontWeight:600 }}>
          Neuen Alert erstellen
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:10, alignItems:'end' }}>
          <div>
            <div style={{ fontSize:'0.6rem', color:'var(--txt3)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.1em' }}>Aktie</div>
            <select value={ticker} onChange={e=>setTicker(e.target.value)} style={{ ...inp, width:'100%', cursor:'pointer' }}>
              {items.map(i => <option key={i.ticker} value={i.ticker}>{i.ticker} – {i.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:'0.6rem', color:'var(--txt3)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.1em' }}>Typ</div>
            <select value={direction} onChange={e=>setDirection(e.target.value)} style={{ ...inp, width:'100%', cursor:'pointer' }}>
              <option value="below">Stop-Loss (fällt auf)</option>
              <option value="above">Take-Profit (steigt auf)</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize:'0.6rem', color:'var(--txt3)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.1em' }}>Zielpreis (€/$)</div>
            <input type="number" min="0" step="0.01" value={target}
              onChange={e=>setTarget(e.target.value)}
              style={{ ...inp, width:'100%' }}
              placeholder="z.B. 150.00"
              onKeyDown={e=>e.key==='Enter'&&add()} />
          </div>
          <button onClick={add} disabled={adding} style={{
            padding:'8px 18px', borderRadius:6, border:'none', cursor:adding?'wait':'pointer',
            background:'var(--acc)', color:'#fff', fontWeight:700, fontSize:'0.8rem', fontFamily:'inherit',
            opacity:adding?0.5:1, whiteSpace:'nowrap',
          }}>
            {adding ? 'Erstelle…' : '+ Alert'}
          </button>
        </div>
        {err && <div style={{ marginTop:8, fontSize:'0.72rem', color:'var(--red)' }}>{err}</div>}
      </div>

      {/* Active alerts */}
      {alerts.length === 0 ? (
        <div style={{ ...card, padding:'24px', textAlign:'center', fontSize:'0.76rem', color:'var(--txt3)' }}>
          Noch keine Alerts. Erstelle oben einen Stop-Loss oder Take-Profit Alert.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {alerts.map(a => {
            const isStop = a.direction === 'below'
            const isTriggered = a.triggered
            return (
              <div key={a.id} style={{
                ...card, padding:'12px 18px',
                display:'flex', alignItems:'center', gap:12,
                opacity: isTriggered ? 0.55 : 1,
                borderColor: isTriggered ? 'rgba(255,255,255,0.07)' : isStop ? 'rgba(160,16,8,0.35)' : 'rgba(6,95,46,0.35)',
              }}>
                <div style={{
                  width:8, height:8, borderRadius:'50%', flexShrink:0,
                  background: isTriggered ? 'rgba(255,255,255,0.2)' : isStop ? 'var(--red)' : 'var(--green)',
                }} />
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:3 }}>
                    <span style={{ fontSize:'0.72rem', fontFamily:'monospace', fontWeight:700, color:'var(--acc)' }}>{a.ticker}</span>
                    <span style={{
                      fontSize:'0.6rem', fontWeight:700, padding:'1px 7px', borderRadius:4,
                      background: isStop ? 'rgba(160,16,8,0.2)' : 'rgba(6,95,46,0.2)',
                      color: isStop ? 'var(--red)' : 'var(--green)',
                    }}>
                      {isStop ? 'STOP-LOSS' : 'TAKE-PROFIT'}
                    </span>
                    {isTriggered && (
                      <span style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.3)', fontWeight:500 }}>ausgelöst</span>
                    )}
                  </div>
                  <div style={{ fontSize:'0.78rem', color:'var(--txt)', fontWeight:600 }}>
                    {a.name}
                    <span style={{ color:'var(--txt3)', fontWeight:400, marginLeft:8 }}>
                      {isStop ? `≤ ${fmt(a.target)} €` : `≥ ${fmt(a.target)} €`}
                    </span>
                  </div>
                </div>
                <button onClick={()=>onDelete(a.id)} style={{
                  background:'transparent', border:'1px solid var(--border)', color:'var(--txt3)',
                  padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:'0.8rem', lineHeight:1,
                }} title="Alert löschen">×</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Watchlist() {
  const [items,  setItems]   = useState([])
  const [alerts, setAlerts]  = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const [wl, al] = await Promise.all([
        api.get('/api/watchlist').then(r=>r.data).catch(()=>[]),
        api.get('/api/alerts').then(r=>r.data).catch(()=>[]),
      ])
      setItems(wl); setAlerts(al)
    } catch(e){}
    setLoading(false)
  }

  const remove = async (id) => {
    try {
      await api.delete(`/api/watchlist/${id}`)
      setItems(i => i.filter(x => x.id !== id))
    } catch(e){}
  }

  const addAlert = async (data) => {
    try {
      const r = await api.post('/api/alerts', data)
      setAlerts(a => [...a, { ...data, id: r.data.id, triggered: false }])
    } catch(e) {}
  }

  const deleteAlert = async (id) => {
    try {
      await api.delete(`/api/alerts/${id}`)
      setAlerts(a => a.filter(x => x.id !== id))
    } catch(e){}
  }

  useEffect(() => { load() }, [])

  return (
    <div style={{ padding:'28px 32px', minHeight:'100%', maxWidth:860 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24 }}>
        <div>
          <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:6 }}>Beobachtungsliste</div>
          <div style={{ fontSize:'1.4rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff' }}>Watchlist</div>
        </div>
        <button onClick={load} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.45)', padding:'7px 16px', borderRadius:7, cursor:'pointer', fontSize:'0.72rem' }}>
          Aktualisieren
        </button>
      </div>

      {loading ? (
        <div style={{ color:'rgba(255,255,255,0.3)', textAlign:'center', padding:60, fontSize:'0.8rem' }}>Lade…</div>
      ) : items.length === 0 ? (
        <div style={{ ...card, padding:'60px 40px', textAlign:'center' }}>
          <div style={{ fontSize:'2rem', marginBottom:16, opacity:0.3 }}>☆</div>
          <div style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--txt)', marginBottom:8 }}>Watchlist ist leer</div>
          <div style={{ fontSize:'0.78rem', color:'var(--txt2)', marginBottom:20 }}>Füge Aktien, ETFs oder Kryptos hinzu — im Entdecken-Bereich oder auf der Detail-Seite.</div>
          <button onClick={()=>navigate('/app/discover')} style={{ background:'var(--acc)', border:'none', color:'#fff', padding:'10px 24px', borderRadius:8, fontWeight:600, fontSize:'0.82rem', cursor:'pointer' }}>
            Märkte entdecken →
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom:12, fontSize:'0.72rem', color:'rgba(255,255,255,0.35)' }}>{items.length} Asset{items.length!==1?'s':''} beobachtet</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {items.map(item => (
              <div key={item.id} style={{ ...card, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, transition:'box-shadow 0.15s' }}
                onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(61,10,20,0.12)'}
                onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}
              >
                <div style={{ flex:1, cursor:'pointer' }} onClick={()=>navigate(`/app/asset/${item.ticker}`)}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:'0.7rem', fontFamily:'monospace', fontWeight:700, color:'var(--acc)' }}>{item.ticker}</span>
                    <span style={{ fontSize:'0.55rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{item.category}</span>
                    {alerts.filter(a=>a.ticker===item.ticker && !a.triggered).length > 0 && (
                      <span style={{ fontSize:'0.58rem', padding:'1px 6px', borderRadius:8,
                                     background:'rgba(146,64,14,0.2)', color:'#fbbf24', fontWeight:700 }}>
                        🔔 {alerts.filter(a=>a.ticker===item.ticker&&!a.triggered).length} Alert{alerts.filter(a=>a.ticker===item.ticker&&!a.triggered).length>1?'s':''}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:'0.86rem', fontWeight:600, color:'var(--txt)' }}>{item.name}</div>
                </div>

                <div style={{ textAlign:'right', minWidth:100 }}>
                  {item.price ? (
                    <div style={{ fontSize:'0.95rem', fontWeight:700, color:'var(--txt)' }}>{fmt(item.price)} €</div>
                  ) : (
                    <div style={{ fontSize:'0.72rem', color:'var(--txt3)' }}>–</div>
                  )}
                  <div style={{ fontSize:'0.64rem', color:'var(--txt3)', marginTop:2 }}>
                    {item.added_at ? new Date(item.added_at).toLocaleDateString('de-DE') : ''}
                  </div>
                </div>

                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>navigate(`/app/asset/${item.ticker}`)} style={{ background:'var(--acc)', border:'none', color:'#fff', padding:'6px 14px', borderRadius:6, fontSize:'0.72rem', fontWeight:600, cursor:'pointer' }}>
                    Details
                  </button>
                  <button onClick={()=>remove(item.id)} title="Entfernen" style={{ background:'transparent', border:'1px solid var(--border)', color:'var(--txt3)', padding:'6px 10px', borderRadius:6, fontSize:'0.8rem', cursor:'pointer', lineHeight:1 }}>
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <AlertPanel items={items} alerts={alerts} onAdd={addAlert} onDelete={deleteAlert} />
        </>
      )}
    </div>
  )
}
