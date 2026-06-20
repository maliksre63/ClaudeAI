import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import Heatmap  from './Heatmap'
import Sektoren from './Sektoren'

const CATEGORIES = ['DAX40','S&P500','NASDAQ100','EUROSTOXX50','ETF','Krypto','Rohstoffe']
const fmt = (n,d=2) => n==null?'–':Number(n).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d})

function BuyModal({ asset, onClose, onDone }) {
  const [price, setPrice]   = useState(null)
  const [eur, setEur]       = useState('')
  const [mode, setMode]     = useState('eur')
  const [qty, setQty]       = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]       = useState('')

  useEffect(() => {
    api.get(`/api/price/${asset.ticker}`).then(r => setPrice(r.data.price)).catch(() => {})
  }, [asset.ticker])

  const effShares = mode==='eur'
    ? (price > 0 ? Number(eur||0) / price : 0)
    : Number(qty||0)
  const totalEur = effShares * (price||0)

  const submit = async () => {
    if (totalEur <= 0) return
    setLoading(true)
    try {
      await api.post('/api/trade', {
        ticker: asset.ticker, name: asset.name,
        asset_type: asset.type==='Krypto'||asset.category==='Krypto'?'crypto':'stock',
        action: 'buy', shares: effShares, price,
      })
      setMsg('Kauf erfolgreich!')
      setTimeout(() => { onDone(); onClose() }, 1500)
    } catch(e) { setMsg(e.response?.data?.detail||'Fehler') }
    setLoading(false)
  }

  const inp = { width:'100%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:'0.9rem', outline:'none', fontFamily:'inherit', fontWeight:600 }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(20,5,10,0.75)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#2a0810', border:'1px solid rgba(255,255,255,0.12)', borderRadius:14, padding:'28px 28px', width:360, boxShadow:'0 32px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div>
            <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.4)', letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:3 }}>{asset.ticker}</div>
            <div style={{ fontSize:'1rem', fontWeight:600, color:'#fff' }}>{asset.name}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'1.4rem', lineHeight:1 }}>×</button>
        </div>

        {price != null && (
          <div style={{ fontSize:'1.5rem', fontWeight:300, color:'#fff', fontVariantNumeric:'tabular-nums', marginBottom:18 }}>
            {price < 0.001
              ? price.toLocaleString('de-DE',{minimumFractionDigits:8,maximumFractionDigits:8})
              : price < 1
              ? price.toLocaleString('de-DE',{minimumFractionDigits:4,maximumFractionDigits:4})
              : fmt(price)} <span style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)' }}>EUR</span>
          </div>
        )}

        {msg ? (
          <div style={{ padding:'14px', background:msg.includes('erfolgreich')?'rgba(6,95,46,0.2)':'rgba(160,16,8,0.2)', borderRadius:8, color:msg.includes('erfolgreich')?'#6ee7a0':'#fca5a5', fontWeight:600, textAlign:'center', fontSize:'0.85rem' }}>{msg}</div>
        ) : (
          <>
            <div style={{ display:'flex', gap:3, marginBottom:16, background:'rgba(255,255,255,0.06)', borderRadius:7, padding:3 }}>
              {[['eur','Betrag (€)'],['qty','Anzahl']].map(([m,l]) => (
                <button key={m} onClick={()=>setMode(m)} style={{ flex:1, padding:'7px', borderRadius:5, border:'none', cursor:'pointer', fontSize:'0.74rem', fontWeight:500, background:mode===m?'var(--acc)':'transparent', color:mode===m?'#fff':'rgba(255,255,255,0.45)' }}>{l}</button>
              ))}
            </div>

            {mode==='eur' ? (
              <div style={{ marginBottom:16 }}>
                <input type="number" min={0.01} step={0.01} value={eur} onChange={e=>setEur(e.target.value)}
                  placeholder="Betrag in Euro, z.B. 50" style={inp} autoFocus/>
                {price > 0 && eur && (
                  <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.4)', marginTop:5 }}>
                    ≈ {effShares < 0.0001
                      ? effShares.toLocaleString('de-DE',{minimumFractionDigits:8,maximumFractionDigits:8})
                      : effShares < 1
                      ? effShares.toLocaleString('de-DE',{minimumFractionDigits:6,maximumFractionDigits:6})
                      : effShares.toLocaleString('de-DE',{minimumFractionDigits:4,maximumFractionDigits:4})
                    } {asset.ticker}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginBottom:16 }}>
                <input type="number" min={0.000001} step="any" value={qty} onChange={e=>setQty(e.target.value)}
                  placeholder="Anzahl Anteile, z.B. 0.001" style={inp} autoFocus/>
              </div>
            )}

            <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:'0.8rem', color:'rgba(255,255,255,0.55)' }}>
              Gesamtvolumen: <strong style={{ color:'#fff' }}>{fmt(totalEur,2)} €</strong>
            </div>

            <button onClick={submit} disabled={loading||totalEur<=0} style={{ width:'100%', padding:'12px', background:'var(--green)', border:'none', color:'#fff', borderRadius:8, fontWeight:700, fontSize:'0.9rem', cursor:'pointer', opacity:loading||totalEur<=0?0.4:1 }}>
              {loading ? 'Verarbeite …' : `Kaufen — ${fmt(totalEur,2)} €`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const pLbl = { fontSize:'0.58rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.18em' }
const card  = { background:'var(--s1)', border:'1px solid var(--border)', borderRadius:8 }

const TABS = [{id:'assets',label:'Assets'},{id:'heatmap',label:'Heatmap'},{id:'sektoren',label:'Sektoren'}]

const tbtn = (active) => ({
  padding:'7px 18px', borderRadius:6, border:'none', cursor:'pointer', fontSize:'0.8rem', fontWeight:active?600:400,
  background:active?'rgba(255,255,255,0.14)':'transparent',
  color:active?'#fff':'rgba(255,255,255,0.4)',
  transition:'all 0.15s',
})

export default function Discover() {
  const [activeTab, setActiveTab] = useState('assets')
  const [query, setQuery]   = useState('')
  const [category, setCat]  = useState('')
  const [results, setResults] = useState([])
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(false)
  const [wlSet, setWlSet]   = useState(new Set())
  const [buyAsset, setBuyAsset] = useState(null)
  const navigate = useNavigate()

  const search = useCallback(async (q, cat) => {
    setLoading(true)
    try {
      const r = await api.get('/api/assets/search', { params: { q, category: cat, limit:30 } })
      setResults(r.data.results)
    } catch(e) {}
    setLoading(false)
  }, [])

  useEffect(() => { search('', '') }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query, category), 280)
    return () => clearTimeout(t)
  }, [query, category])

  const addToWatchlist = async (asset) => {
    try {
      await api.post('/api/watchlist', { ticker: asset.ticker, name: asset.name, asset_type: asset.type, category: asset.category })
      setWlSet(s => new Set([...s, asset.ticker]))
    } catch(e) {}
  }

  return (
    <div style={{ padding:'28px 32px', minHeight:'100%' }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:6 }}>Entdecken</div>
        <div style={{ fontSize:'1.4rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff', marginBottom:16 }}>Märkte durchsuchen</div>

        {/* Tabs */}
        <div style={{ display:'flex',gap:2,background:'rgba(0,0,0,0.2)',borderRadius:7,padding:3,border:'1px solid rgba(255,255,255,0.1)',width:'fit-content',marginBottom:20 }}>
          {TABS.map(t=><button key={t.id} style={tbtn(activeTab===t.id)} onClick={()=>setActiveTab(t.id)}>{t.label}</button>)}
        </div>
      </div>

      {/* Heatmap Tab */}
      {activeTab==='heatmap' && <Heatmap embedded />}

      {/* Sektoren Tab */}
      {activeTab==='sektoren' && <Sektoren embedded />}

      {/* Assets Tab */}
      {activeTab==='assets' && (
        <>
          {/* Search bar */}
          <div style={{ position:'relative', maxWidth:540, marginBottom:16 }}>
            <input
              value={query} onChange={e=>setQuery(e.target.value)}
              placeholder="Suche nach Aktie, ETF oder Krypto…"
              style={{ width:'100%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'#fff', padding:'12px 44px 12px 16px', borderRadius:10, fontSize:'0.9rem', outline:'none', fontFamily:'inherit' }}
            />
            <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', fontSize:'1rem', opacity:0.4 }}>⌕</span>
          </div>

          {/* Category pills */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
            <button onClick={()=>setCat('')} style={pillSt(category==='')} >Alle</button>
            {CATEGORIES.map(c => <button key={c} onClick={()=>setCat(c==='Krypto'?'Krypto':c)} style={pillSt(category===c)}>{c}</button>)}
          </div>

          {loading ? (
            <div style={{ color:'rgba(255,255,255,0.3)', padding:'40px', textAlign:'center' }}>Suche…</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:10 }}>
              {results.map(asset => (
                <div key={asset.ticker} style={{ ...card, padding:'16px 18px', cursor:'pointer', transition:'box-shadow 0.15s, transform 0.15s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.boxShadow='0 6px 20px rgba(61,10,20,0.15)'; e.currentTarget.style.transform='translateY(-1px)' }}
                  onMouseLeave={e=>{ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)' }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div onClick={()=>navigate(`/app/asset/${asset.ticker}`)} style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:'0.68rem', fontFamily:'monospace', fontWeight:700, color:'var(--acc)', letterSpacing:'0.08em' }}>{asset.ticker}</span>
                        <span style={{ fontSize:'0.54rem', background:'var(--acc-l)', color:'var(--acc)', padding:'1px 6px', borderRadius:10, textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:600 }}>{asset.category}</span>
                      </div>
                      <div style={{ fontSize:'0.84rem', fontWeight:600, color:'var(--txt)' }}>{asset.name}</div>
                    </div>
                    <button onClick={()=>addToWatchlist(asset)} title="Zur Watchlist" style={{
                      background: wlSet.has(asset.ticker) ? 'var(--acc-l)' : 'transparent',
                      border:`1px solid ${wlSet.has(asset.ticker) ? 'var(--acc-b)' : 'var(--border)'}`,
                      color: wlSet.has(asset.ticker) ? 'var(--acc)' : 'var(--txt3)',
                      borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:'0.72rem', fontWeight:600, flexShrink:0, marginLeft:8,
                    }}>
                      {wlSet.has(asset.ticker) ? '★' : '☆'}
                    </button>
                  </div>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12, paddingTop:10, borderTop:'1px solid var(--bl)' }}>
                    <span style={{ fontSize:'0.68rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{asset.region}</span>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>navigate(`/app/asset/${asset.ticker}`)} style={{
                        background:'transparent', border:'1px solid var(--border)', color:'var(--txt3)', padding:'5px 12px', borderRadius:6, fontSize:'0.72rem', fontWeight:500, cursor:'pointer',
                      }}>Details</button>
                      <button onClick={()=>setBuyAsset(asset)} style={{
                        background:'var(--green)', border:'none', color:'#fff', padding:'5px 14px', borderRadius:6, fontSize:'0.72rem', fontWeight:600, cursor:'pointer',
                      }}>Kaufen</button>
                    </div>
                  </div>
                </div>
              ))}
              {results.length === 0 && !loading && (
                <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.25)', fontSize:'0.8rem' }}>
                  Keine Ergebnisse für „{query}"
                </div>
              )}
            </div>
          )}
        </>
      )}

      {buyAsset && <BuyModal asset={buyAsset} onClose={()=>setBuyAsset(null)} onDone={()=>setBuyAsset(null)} />}
    </div>
  )
}

const pillSt = (active) => ({
  padding:'6px 16px', borderRadius:20, border:`1px solid ${active?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.12)'}`,
  background: active?'rgba(255,255,255,0.12)':'transparent', color: active?'#fff':'rgba(255,255,255,0.45)',
  cursor:'pointer', fontSize:'0.74rem', fontWeight: active?600:400, transition:'all 0.12s',
})
