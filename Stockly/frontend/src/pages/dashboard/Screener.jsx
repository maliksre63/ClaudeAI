import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'

const card = { background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:'24px 26px', marginBottom:16 }
const inp  = { background:'var(--s2)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 14px', fontSize:'0.84rem', color:'var(--txt)', outline:'none', fontFamily:'inherit' }
const sel  = { ...{ background:'var(--s2)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 14px', fontSize:'0.84rem', color:'var(--txt)', outline:'none', fontFamily:'inherit' } }

const TYPE_LABELS  = { stock:'Aktie', etf:'ETF', crypto:'Krypto', commodity:'Rohstoff', bond:'Anleihe', fund:'Fonds' }
const REGION_FLAGS = { US:'🇺🇸', DE:'🇩🇪', EU:'🇪🇺', GLOBAL:'🌍', ASIA:'🌏', OTHER:'🌐' }

const CATEGORY_LABELS = {
  'DAX40':       'DAX40 — Deutschlands Top 40',
  'MDAX':        'MDAX — Deutsche Mittelwerte',
  'S&P500':      'S&P500 — 500 größte US-Firmen',
  'NASDAQ100':   'NASDAQ100 — Große US-Techfirmen',
  'EUROSTOXX50': 'EuroStoxx 50 — Europas Top 50',
  'Gaming':      'Gaming — Spieleentwickler & Medien',
  'Biotech':     'Biotech — Pharma & Medizintechnik',
  'REITs':       'REITs — Immobilienfonds (US)',
  'ETF':         'ETF — Indexfonds (Körbe vieler Aktien)',
  'Krypto':      'Krypto — Digitale Währungen',
  'Rohstoffe':   'Rohstoffe — Gold, Öl, Metalle…',
  'UK':          'UK — Britische Aktien (London)',
  'CH':          'CH — Schweizer Aktien (Zürich)',
  'Nordic':      'Nordic — Skandinavische Aktien',
}

export default function Screener() {
  const navigate = useNavigate()
  const [results, setResults]     = useState([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(false)
  const [categories, setCategories] = useState([])
  const [regions, setRegions]     = useState([])
  const [types, setTypes]         = useState([])
  const [filters, setFilters]     = useState({ type:'', region:'', category:'', q:'' })
  const [limit, setLimit]         = useState(50)

  const load = async (f = filters, l = limit) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ ...f, limit: l })
      const r = await api.get(`/api/screener?${params}`)
      setResults(r.data.results || [])
      setTotal(r.data.total || 0)
      if (!categories.length) {
        setCategories(r.data.categories || [])
        setRegions(r.data.regions || [])
        setTypes(r.data.types || [])
      }
    } catch(e) {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => {
    const f = { ...filters, [k]: v }
    setFilters(f)
    load(f, limit)
  }

  const reset = () => {
    const f = { type:'', region:'', category:'', q:'' }
    setFilters(f)
    load(f, limit)
  }

  return (
    <div style={{padding:'28px 32px', maxWidth:1000}}>
      <div style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.35)',letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:6}}>Analyse</div>
      <div style={{fontSize:'1.4rem',fontWeight:300,letterSpacing:'-0.04em',color:'#fff',marginBottom:6}}>Aktien-Screener</div>
      <div style={{fontSize:'0.8rem',color:'var(--txt3)',marginBottom:12}}>Filter die gesamte Asset-Datenbank nach deinen Kriterien</div>
      <div style={{fontSize:'0.72rem',color:'var(--txt3)',marginBottom:20,lineHeight:1.6}}>
        <strong style={{color:'var(--txt2)'}}>Typ:</strong> Aktie = Unternehmensanteile · ETF = Korb vieler Aktien · Krypto = digitale Währungen · Rohstoff = Gold, Öl usw.
        {' · '}
        <strong style={{color:'var(--txt2)'}}>Kategorie:</strong> DAX40 = größte 40 dt. Firmen · S&P500 = 500 größte US-Firmen · Gaming = Spieleentwickler · Biotech = Pharma/Medizin
      </div>

      {/* Filter Bar */}
      <div style={{...card,marginBottom:16}}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',gap:10,alignItems:'center'}}>
          <input
            style={{...inp,width:'100%'}}
            placeholder="Börsenkürzel oder Name… (z.B. AAPL, Bitcoin, SAP)"
            value={filters.q}
            onChange={e=>set('q',e.target.value)}
          />
          <select style={sel} value={filters.type} onChange={e=>set('type',e.target.value)}>
            <option value="">Alle Typen</option>
            {types.map(t=><option key={t} value={t}>{TYPE_LABELS[t]||t}</option>)}
          </select>
          <select style={sel} value={filters.region} onChange={e=>set('region',e.target.value)}>
            <option value="">Alle Regionen</option>
            {regions.map(r=><option key={r} value={r}>{REGION_FLAGS[r]||''} {r}</option>)}
          </select>
          <select style={sel} value={filters.category} onChange={e=>set('category',e.target.value)}>
            <option value="">Alle Kategorien</option>
            {categories.map(c=><option key={c} value={c}>{CATEGORY_LABELS[c]||c}</option>)}
          </select>
          <button onClick={reset} style={{background:'var(--s2)',border:'1px solid var(--border)',color:'var(--txt3)',borderRadius:8,padding:'9px 14px',cursor:'pointer',fontFamily:'inherit',fontSize:'0.82rem',whiteSpace:'nowrap'}}>
            Reset
          </button>
        </div>
        <div style={{marginTop:10,fontSize:'0.72rem',color:'var(--txt3)'}}>
          {loading ? 'Suche…' : `${total} Ergebnisse gefunden`}
          {total > limit && (
            <button onClick={()=>{setLimit(l=>l+50);load(filters,limit+50)}} style={{marginLeft:12,background:'none',border:'none',color:'var(--acc)',cursor:'pointer',fontSize:'0.72rem',fontFamily:'inherit'}}>
              +50 mehr laden
            </button>
          )}
        </div>
      </div>

      {/* Results Table */}
      <div style={card}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{borderBottom:'1px solid var(--border)'}}>
              {['Ticker','Name','Typ','Region','Kategorie',''].map((h,i)=>(
                <th key={i} style={{textAlign:i>3?'center':'left',padding:'8px 10px',fontSize:'0.6rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:700}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((a,i)=>(
              <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer'}}
                onClick={()=>navigate(`/app/asset/${a.ticker}`)}>
                <td style={{padding:'11px 10px',fontSize:'0.84rem',fontWeight:700,color:'var(--txt)',fontFamily:'monospace'}}>{a.ticker}</td>
                <td style={{padding:'11px 10px',fontSize:'0.82rem',color:'var(--txt2)',maxWidth:220}}>
                  <span style={{display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.name}</span>
                </td>
                <td style={{padding:'11px 10px'}}>
                  <span style={{fontSize:'0.64rem',padding:'3px 8px',borderRadius:10,fontWeight:700,
                    background: a.type==='stock'?'rgba(52,152,219,0.15)':a.type==='etf'?'rgba(46,204,113,0.15)':a.type==='crypto'?'rgba(243,156,18,0.15)':'rgba(155,89,182,0.15)',
                    color:      a.type==='stock'?'#3498db':a.type==='etf'?'#2ecc71':a.type==='crypto'?'#f39c12':'#9b59b6',
                  }}>{TYPE_LABELS[a.type]||a.type}</span>
                </td>
                <td style={{padding:'11px 10px',fontSize:'0.78rem',color:'var(--txt2)'}}>{REGION_FLAGS[a.region]||''} {a.region}</td>
                <td style={{padding:'11px 10px',fontSize:'0.74rem',color:'var(--txt3)'}}>{a.category}</td>
                <td style={{padding:'11px 10px',textAlign:'center'}}>
                  <span style={{fontSize:'0.72rem',color:'var(--acc)',fontWeight:600}}>→</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {results.length === 0 && !loading && (
          <div style={{textAlign:'center',padding:'40px 20px',color:'var(--txt3)',fontSize:'0.84rem'}}>
            Keine Assets gefunden – ändere die Filter
          </div>
        )}
      </div>
    </div>
  )
}
