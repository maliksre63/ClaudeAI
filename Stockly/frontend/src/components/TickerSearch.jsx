import { useState, useEffect, useRef } from 'react'
import api from '../api'

export default function TickerSearch({
  value,
  onChange,
  onSelect,
  placeholder = 'Ticker oder Name… (z.B. Apple, Bitcoin)',
  style = {},
  autoFocus = false,
}) {
  const [q, setQ]           = useState(value || '')
  const [results, setResults] = useState([])
  const [open, setOpen]     = useState(false)
  const [idx, setIdx]       = useState(-1)
  const timer = useRef(null)
  const ref   = useRef(null)

  useEffect(() => {
    if (!q || q.length < 1) { setResults([]); setOpen(false); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const r = await api.get('/api/assets/search', { params: { q, limit: 8 } })
        const hits = r.data.results || []
        setResults(hits)
        setOpen(hits.length > 0)
        setIdx(-1)
      } catch { setResults([]); setOpen(false) }
    }, 200)
    return () => clearTimeout(timer.current)
  }, [q])

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const select = (item) => {
    const val = item.ticker
    setQ(item.ticker)
    setOpen(false)
    onChange?.(val)
    onSelect?.(item)
  }

  const handleKey = (e) => {
    if (!open || !results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i+1, results.length-1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(i-1, 0)) }
    if (e.key === 'Enter')     { e.preventDefault(); if (idx >= 0) select(results[idx]); else if (results[0]) select(results[0]) }
    if (e.key === 'Escape')    { setOpen(false) }
  }

  const TYPE_COLOR = { stock:'#3498db', crypto:'#f39c12', etf:'#2ecc71', commodity:'#9b59b6' }
  const TYPE_LABEL = { stock:'Aktie', crypto:'Krypto', etf:'ETF', commodity:'Rohstoff' }

  return (
    <div ref={ref} style={{ position:'relative', ...style }}>
      <input
        autoFocus={autoFocus}
        value={q}
        onChange={e => { setQ(e.target.value); onChange?.(e.target.value) }}
        onKeyDown={handleKey}
        onFocus={() => results.length && setOpen(true)}
        placeholder={placeholder}
        style={{
          width:'100%', boxSizing:'border-box',
          background:'var(--s2)', border:'1px solid var(--border)',
          borderRadius:8, padding:'10px 14px', fontSize:'0.88rem',
          color:'var(--txt)', outline:'none', fontFamily:'inherit',
        }}
      />

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:500,
          background:'var(--s1)', border:'1px solid var(--border)', borderRadius:10,
          boxShadow:'0 8px 28px rgba(0,0,0,0.35)', overflow:'hidden',
        }}>
          {results.map((item, i) => (
            <div
              key={item.ticker}
              onMouseDown={() => select(item)}
              style={{
                display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.05)',
                background: i === idx ? 'var(--s2)' : 'transparent',
                transition:'background 0.1s',
              }}
              onMouseEnter={() => setIdx(i)}
              onMouseLeave={() => setIdx(-1)}
            >
              <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:'0.82rem', color:'var(--acc)', minWidth:60 }}>
                {item.ticker}
              </span>
              <span style={{ flex:1, fontSize:'0.8rem', color:'var(--txt)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {item.name}
              </span>
              <span style={{
                fontSize:'0.6rem', fontWeight:700, padding:'2px 7px', borderRadius:8, flexShrink:0,
                background: `${TYPE_COLOR[item.type] || '#888'}22`,
                color: TYPE_COLOR[item.type] || '#888',
              }}>
                {TYPE_LABEL[item.type] || item.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
