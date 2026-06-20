import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'

const chgColor = (c) => {
  if (c ==  null) return { bg:'rgba(255,255,255,0.08)', text:'rgba(255,255,255,0.55)' }
  if (c >= 3)    return { bg:'#065f2e',               text:'#c8f5dc' }
  if (c >= 1)    return { bg:'rgba(6,95,46,0.65)',    text:'#b0f0cc' }
  if (c > 0)     return { bg:'rgba(6,95,46,0.38)',    text:'#90e8b8' }
  if (c === 0)   return { bg:'rgba(255,255,255,0.08)', text:'rgba(255,255,255,0.55)' }
  if (c > -1)    return { bg:'rgba(160,16,8,0.38)',   text:'#ffc8c8' }
  if (c > -3)    return { bg:'rgba(160,16,8,0.65)',   text:'#ffd8d8' }
  return               { bg:'#8b0a0a',               text:'#ffe0e0' }
}

const fmt = n => n == null ? '–' : Number(n).toLocaleString('de-DE', { minimumFractionDigits:2, maximumFractionDigits:2 })
const fmtPrice = n => {
  if (n == null) return '–'
  const v = Number(n), a = Math.abs(v)
  if (a === 0) return '0,00'
  if (a < 0.00001) return v.toLocaleString('de-DE', { minimumFractionDigits:8, maximumFractionDigits:8 })
  if (a < 0.001)   return v.toLocaleString('de-DE', { minimumFractionDigits:6, maximumFractionDigits:6 })
  if (a < 1)       return v.toLocaleString('de-DE', { minimumFractionDigits:4, maximumFractionDigits:4 })
  return v.toLocaleString('de-DE', { minimumFractionDigits:2, maximumFractionDigits:2 })
}
const fmtPct = n => n == null ? '–' : `${n >= 0 ? '+' : ''}${fmt(n)}%`

export default function Heatmap() {
  const navigate = useNavigate()
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpd, setLastUpd] = useState(null)
  const [filter, setFilter]   = useState('Alle')

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/api/heatmap')
      setData(r.data)
      setLastUpd(new Date().toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' }))
    } catch(e) {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const types = ['Alle', ...Array.from(new Set(data.map(d=>d.type))).sort()]
  const visible = filter === 'Alle' ? data : data.filter(d => d.type === filter)

  // Group by type for display
  const groups = {}
  for (const a of visible) {
    if (!groups[a.type]) groups[a.type] = []
    groups[a.type].push(a)
  }

  // Summary bar data
  const withPrice = data.filter(d => d.price != null)
  const gainers   = withPrice.filter(d => d.chg_1d > 0).length
  const losers    = withPrice.filter(d => d.chg_1d < 0).length
  const avgChg    = withPrice.length ? (withPrice.reduce((s,d) => s + d.chg_1d, 0) / withPrice.length) : 0

  return (
    <div style={{ padding:'28px 32px', minHeight:'100%' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:6 }}>Markt</div>
          <div style={{ fontSize:'1.4rem', fontWeight:300, letterSpacing:'-0.04em', color:'#fff' }}>Markt-Heatmap</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {lastUpd && <span style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.45)' }}>Aktualisiert {lastUpd}</span>}
          <button onClick={load} disabled={loading} style={{
            background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.6)',
            padding:'7px 16px', borderRadius:6, cursor:'pointer', fontSize:'0.72rem', opacity:loading?0.5:1,
          }}>
            {loading ? 'Lade …' : '⟳ Aktualisieren'}
          </button>
        </div>
      </div>

      {/* Market summary */}
      {!loading && withPrice.length > 0 && (
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          {[
            ['Steiger', gainers, 'var(--green)'],
            ['Fallen', losers, 'var(--red)'],
            ['Ø Veränderung', `${avgChg >= 0 ? '+' : ''}${fmt(avgChg)}%`, avgChg >= 0 ? 'var(--green)' : 'var(--red)'],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'10px 18px', display:'flex', gap:10, alignItems:'center' }}>
              <span style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{l}</span>
              <span style={{ fontSize:'0.92rem', fontWeight:700, color:c, fontVariantNumeric:'tabular-nums' }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:24, flexWrap:'wrap' }}>
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            padding:'5px 14px', borderRadius:20, cursor:'pointer', fontSize:'0.72rem', fontWeight:500,
            border:`1px solid ${filter===t ? 'var(--acc)' : 'rgba(255,255,255,0.1)'}`,
            background: filter===t ? 'var(--acc)' : 'transparent',
            color: filter===t ? '#fff' : 'rgba(255,255,255,0.5)',
            transition:'all 0.12s',
          }}>{t}</button>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:6, marginBottom:24, alignItems:'center', flexWrap:'wrap' }}>
        <span style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.45)', marginRight:4 }}>Legende:</span>
        {[
          ['< −3%',      '#8b0a0a'],
          ['−1 bis −3%', 'rgba(160,16,8,0.65)'],
          ['0 bis −1%',  'rgba(160,16,8,0.38)'],
          ['±0',         'rgba(255,255,255,0.08)'],
          ['0 bis +1%',  'rgba(6,95,46,0.38)'],
          ['+1 bis +3%', 'rgba(6,95,46,0.65)'],
          ['> +3%',      '#065f2e'],
        ].map(([l,bg]) => (
          <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:16, height:16, borderRadius:4, background:bg, border:'1px solid rgba(255,255,255,0.1)', flexShrink:0 }}/>
            <span style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.65)', whiteSpace:'nowrap' }}>{l}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding:'80px', textAlign:'center', color:'rgba(255,255,255,0.3)', fontSize:'0.82rem' }}>Lade Marktdaten …</div>
      ) : (
        Object.entries(groups).map(([type, assets]) => (
          <div key={type} style={{ marginBottom:28 }}>
            <div style={{ fontSize:'0.58rem', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.18em', fontWeight:700, marginBottom:12 }}>
              {type} ({assets.length})
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8 }}>
              {assets.map(a => {
                const { bg, text } = chgColor(a.chg_1d)
                return (
                  <div
                    key={a.ticker}
                    onClick={() => navigate(`/app/asset/${a.ticker}`)}
                    style={{
                      background: bg,
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 10,
                      padding: '14px 14px 12px',
                      cursor: 'pointer',
                      transition: 'transform 0.14s, opacity 0.14s',
                      userSelect: 'none',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform='scale(1.04)'; e.currentTarget.style.opacity='0.92' }}
                    onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.opacity='1' }}
                  >
                    <div style={{ fontSize:'0.6rem', fontFamily:'monospace', fontWeight:700, color:text, opacity:0.7, letterSpacing:'0.1em', marginBottom:4, textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap' }}>{a.ticker}</div>
                    <div style={{ fontSize:'0.78rem', fontWeight:600, color:text, marginBottom:8, textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap' }}>{a.name}</div>
                    <div style={{ fontSize:'1.1rem', fontWeight:800, color:text, fontVariantNumeric:'tabular-nums', letterSpacing:'-0.02em' }}>
                      {a.chg_1d != null ? fmtPct(a.chg_1d) : '–'}
                    </div>
                    {a.price != null && (
                      <div style={{ fontSize:'0.65rem', color:text, opacity:0.6, marginTop:3, fontVariantNumeric:'tabular-nums' }}>
                        {fmtPrice(a.price)} €
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
