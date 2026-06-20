import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'

const ICONS = {
  swords:  '⚔️',
  barrel:  '🛢️',
  rate:    '📈',
  robot:   '🤖',
  chart:   '📉',
  storm:   '🌪️',
  law:     '⚖️',
  bitcoin: '₿',
  mine:    '⛏️',
  health:  '💊',
  dollar:  '💵',
  trade:   '🚢',
}

const RISK_STYLE = {
  niedrig: { bg:'rgba(6,95,46,0.18)',   border:'rgba(6,95,46,0.4)',    color:'#6ee7a0', label:'Niedriges Risiko' },
  mittel:  { bg:'rgba(146,64,14,0.2)',  border:'rgba(146,64,14,0.45)', color:'#fbbf24', label:'Mittleres Risiko' },
  hoch:    { bg:'rgba(160,16,8,0.2)',   border:'rgba(160,16,8,0.45)',  color:'#f87171', label:'Hohes Risiko' },
}

const SOURCE_COLORS = {
  'Reuters':       { bg:'rgba(255,140,0,0.15)',   color:'#fb923c' },
  'BBC':           { bg:'rgba(220,38,38,0.15)',   color:'#f87171' },
  'Yahoo Finance': { bg:'rgba(99,102,241,0.15)',  color:'#a5b4fc' },
  'Tagesschau':    { bg:'rgba(37,99,235,0.15)',   color:'#93c5fd' },
  'DW':            { bg:'rgba(5,150,105,0.15)',   color:'#6ee7a0' },
}

function NewsCard({ article }) {
  const src = SOURCE_COLORS[article.source] || { bg:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)' }
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        textDecoration:'none', display:'flex', flexDirection:'column', gap:6,
        padding:'11px 14px', borderRadius:8, marginBottom:6,
        background:'rgba(255,255,255,0.04)',
        border:'1px solid rgba(255,255,255,0.09)',
        cursor:'pointer',
        transition:'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.18)' }}
      onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.09)' }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:'0.58rem', fontWeight:700, padding:'2px 8px', borderRadius:10, background:src.bg, color:src.color, letterSpacing:'0.06em', flexShrink:0 }}>
          {article.source}
        </span>
        {article.published && (
          <span style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.3)' }}>{article.published}</span>
        )}
        <span style={{ marginLeft:'auto', fontSize:'0.68rem', color:'rgba(255,255,255,0.22)', flexShrink:0 }}>↗</span>
      </div>
      <div style={{ fontSize:'0.8rem', fontWeight:600, color:'rgba(255,255,255,0.92)', lineHeight:1.45 }}>
        {article.headline}
      </div>
      {article.summary && (
        <div style={{ fontSize:'0.71rem', color:'rgba(255,255,255,0.42)', lineHeight:1.55 }}>
          {article.summary.length > 180 ? article.summary.slice(0,180) + '…' : article.summary}
        </div>
      )}
    </a>
  )
}

function TipCard({ tip, navigate }) {
  const [open, setOpen] = useState(false)
  const rs   = RISK_STYLE[tip.risk] || RISK_STYLE.mittel
  const icon = ICONS[tip.icon] || '📌'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${tip.aktuell ? 'rgba(107,18,32,0.7)' : 'rgba(255,255,255,0.09)'}`,
      borderRadius: 12, overflow:'hidden', transition:'border-color 0.2s',
    }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding:'16px 20px', cursor:'pointer', display:'flex', alignItems:'flex-start', gap:14 }}
      >
        <div style={{ fontSize:'1.6rem', lineHeight:1, marginTop:2, flexShrink:0 }}>{icon}</div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6 }}>
            <span style={{ fontSize:'0.92rem', fontWeight:600, color:'#fff' }}>{tip.title}</span>
            {tip.aktuell && (
              <span style={{ fontSize:'0.56rem', fontWeight:700, letterSpacing:'0.15em', padding:'2px 8px', borderRadius:20, background:'rgba(107,18,32,0.7)', color:'#fca5a5', textTransform:'uppercase' }}>
                AKTUELL
              </span>
            )}
            {tip.news && tip.news.length > 0 && (
              <span style={{ fontSize:'0.56rem', fontWeight:600, padding:'2px 8px', borderRadius:20, background:'rgba(99,102,241,0.18)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.28)' }}>
                {tip.news.length} News
              </span>
            )}
            <span style={{ marginLeft:'auto', fontSize:'0.62rem', fontWeight:600, letterSpacing:'0.08em', padding:'2px 9px', borderRadius:20, background:rs.bg, border:`1px solid ${rs.border}`, color:rs.color }}>
              {rs.label}
            </span>
          </div>

          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {tip.profiteur.slice(0,3).map(s => (
              <span key={s.ticker} style={{ fontSize:'0.65rem', padding:'2px 8px', borderRadius:12, background:'rgba(6,95,46,0.2)', color:'#86efac', border:'1px solid rgba(6,95,46,0.3)' }}>
                ↑ {s.name}
              </span>
            ))}
            {tip.verlierer.slice(0,2).map(s => (
              <span key={s.ticker} style={{ fontSize:'0.65rem', padding:'2px 8px', borderRadius:12, background:'rgba(160,16,8,0.2)', color:'#fca5a5', border:'1px solid rgba(160,16,8,0.3)' }}>
                ↓ {s.name}
              </span>
            ))}
          </div>
        </div>

        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.8rem', flexShrink:0, marginTop:4 }}>
          {open ? '▲' : '▼'}
        </div>
      </div>

      {/* ── Expanded ────────────────────────────────────────────── */}
      {open && (
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>

          {/* News */}
          {tip.news && tip.news.length > 0 && (
            <div style={{ padding:'16px 20px 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ fontSize:'0.58rem', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.18em', fontWeight:700 }}>
                  Aktuelle News zum Thema
                </div>
                <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }}/>
              </div>
              {tip.news.map((art, i) => <NewsCard key={i} article={art} />)}
            </div>
          )}

          <div style={{ padding:'14px 20px 20px' }}>
            {/* Why explanation box */}
            <div style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'12px 14px', borderRadius:8, background:'rgba(107,18,32,0.12)', border:'1px solid rgba(107,18,32,0.25)', marginBottom:18 }}>
              <span style={{ fontSize:'1rem', flexShrink:0, marginTop:1 }}>💡</span>
              <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.7)', lineHeight:1.75 }}>
                <strong style={{ color:'rgba(255,255,255,0.9)', display:'block', marginBottom:4 }}>Warum betrifft das die Börse?</strong>
                {tip.erklaerung}
              </div>
            </div>

            {/* Profiteure / Verlierer */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <div style={{ fontSize:'0.58rem', color:'#6ee7a0', textTransform:'uppercase', letterSpacing:'0.15em', fontWeight:700, marginBottom:8 }}>
                  Profiteure
                </div>
                {tip.profiteur.map(s => (
                  <div
                    key={s.ticker}
                    onClick={() => navigate(`/app/asset/${s.ticker}`)}
                    style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', borderRadius:7, cursor:'pointer', background:'rgba(6,95,46,0.1)', border:'1px solid rgba(6,95,46,0.2)', marginBottom:5, transition:'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(6,95,46,0.22)'}
                    onMouseLeave={e => e.currentTarget.style.background='rgba(6,95,46,0.1)'}
                  >
                    <span style={{ fontSize:'0.76rem', color:'rgba(255,255,255,0.9)' }}>{s.name}</span>
                    <span style={{ fontSize:'0.62rem', fontFamily:'monospace', color:'#6ee7a0', letterSpacing:'0.04em' }}>{s.ticker}</span>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize:'0.58rem', color:'#fca5a5', textTransform:'uppercase', letterSpacing:'0.15em', fontWeight:700, marginBottom:8 }}>
                  Unter Druck
                </div>
                {tip.verlierer.map(s => (
                  <div
                    key={s.ticker}
                    onClick={() => navigate(`/app/asset/${s.ticker}`)}
                    style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', borderRadius:7, cursor:'pointer', background:'rgba(160,16,8,0.1)', border:'1px solid rgba(160,16,8,0.2)', marginBottom:5, transition:'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(160,16,8,0.22)'}
                    onMouseLeave={e => e.currentTarget.style.background='rgba(160,16,8,0.1)'}
                  >
                    <span style={{ fontSize:'0.76rem', color:'rgba(255,255,255,0.9)' }}>{s.name}</span>
                    <span style={{ fontSize:'0.62rem', fontFamily:'monospace', color:'#fca5a5', letterSpacing:'0.04em' }}>{s.ticker}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Geheimtipps() {
  const navigate = useNavigate()
  const [tips, setTips]       = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpd, setLastUpd] = useState(null)
  const [tab, setTab]         = useState('alle')

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/api/geheimtipps')
      setTips(r.data)
      setLastUpd(new Date().toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' }))
    } catch(e) {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const displayed = tab === 'aktuell' ? tips.filter(t => t.aktuell) : tips
  const newsCount = tips.reduce((n, t) => n + (t.news?.length || 0), 0)

  return (
    <div style={{ padding:'28px 32px', minHeight:'100%' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:6 }}>Markt · Weltgeschehen</div>
          <div style={{ fontSize:'1.4rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff' }}>Geheimtipps</div>
          <div style={{ fontSize:'0.76rem', color:'rgba(255,255,255,0.45)', marginTop:4 }}>
            Echte News → Welche Aktien profitieren oder leiden
            {newsCount > 0 && <span style={{ marginLeft:10, padding:'2px 8px', borderRadius:10, background:'rgba(99,102,241,0.18)', color:'#a5b4fc', fontSize:'0.65rem' }}>{newsCount} Artikel geladen</span>}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {lastUpd && <span style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.35)' }}>Stand {lastUpd}</span>}
          <button onClick={load} disabled={loading} style={{
            background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.6)',
            padding:'7px 16px', borderRadius:6, cursor:'pointer', fontSize:'0.72rem', opacity:loading?0.5:1,
          }}>
            {loading ? 'Lade …' : '⟳ Aktualisieren'}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ background:'rgba(107,18,32,0.15)', border:'1px solid rgba(107,18,32,0.3)', borderRadius:8, padding:'12px 18px', marginBottom:24, fontSize:'0.76rem', color:'rgba(255,255,255,0.6)', lineHeight:1.65 }}>
        <strong style={{ color:'rgba(255,255,255,0.9)' }}>So funktioniert es:</strong> Aktuelle Nachrichten aus Reuters, BBC, Tagesschau & mehr werden live ausgewertet.
        Klicke auf ein Szenario um passende News-Artikel und betroffene Aktien zu sehen.
        Artikel öffnen sich direkt im Browser. &nbsp;
        <span style={{ color:'#fca5a5' }}>⚠ Keine Anlageberatung.</span>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:24, flexWrap:'wrap', alignItems:'center' }}>
        {[['alle','Alle Szenarien'],['aktuell','Aktuell & Relevant']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'6px 16px', borderRadius:20, border:`1px solid ${tab===id?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.1)'}`,
            background: tab===id?'rgba(255,255,255,0.1)':'transparent',
            color: tab===id?'#fff':'rgba(255,255,255,0.4)', fontSize:'0.76rem', cursor:'pointer', fontWeight:tab===id?500:400,
          }}>{label}</button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
          {['niedrig','mittel','hoch'].map(r => (
            <span key={r} style={{ fontSize:'0.65rem', padding:'3px 10px', borderRadius:20, background:RISK_STYLE[r].bg, color:RISK_STYLE[r].color, border:`1px solid ${RISK_STYLE[r].border}` }}>
              {RISK_STYLE[r].label}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'80px', color:'rgba(255,255,255,0.3)', fontSize:'0.82rem' }}>
          Analysiere Weltgeschehen und lade News …
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px', color:'rgba(255,255,255,0.3)', fontSize:'0.82rem' }}>
          Gerade keine aktuellen Meldungen erkannt.
          <br/><button onClick={() => setTab('alle')} style={{ marginTop:12, padding:'7px 18px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.6)', borderRadius:6, cursor:'pointer', fontSize:'0.76rem' }}>Alle Szenarien anzeigen</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {displayed.map((tip, i) => (
            <TipCard key={i} tip={tip} navigate={navigate} />
          ))}
        </div>
      )}

      {/* Disclaimer + sources */}
      <div style={{ marginTop:32, padding:'12px 18px', background:'rgba(255,255,255,0.03)', borderRadius:8, fontSize:'0.68rem', color:'rgba(255,255,255,0.3)', lineHeight:1.6 }}>
        News-Quellen: Reuters Business, Reuters World, Yahoo Finance, BBC World, Tagesschau, Deutsche Welle. Aktualisierung alle 30 Minuten. Diese Informationen dienen ausschließlich zu Bildungszwecken und stellen keine Anlageberatung dar. Investitionen sind mit Risiken verbunden.
      </div>
    </div>
  )
}
