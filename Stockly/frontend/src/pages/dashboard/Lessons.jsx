import { useState, useEffect } from 'react'
import { useAuth } from '../../AuthContext'
import api from '../../api'

export default function Lessons() {
  const { user, refreshUser } = useAuth()
  const [lessons, setLessons] = useState([])
  const [active, setActive]   = useState(null)

  useEffect(() => {
    api.get('/api/lessons').then(r => setLessons(r.data)).catch(()=>{})
  }, [])

  const open = async (slug) => {
    try { const r = await api.get(`/api/lessons/${slug}`); setActive(r.data) } catch(e) {}
  }

  const complete = async () => {
    if (!active || active.completed) return
    await api.post('/api/user/lesson-done', { slug: active.slug, xp: active.xp_reward })
    setLessons(l => l.map(x => x.slug === active.slug ? { ...x, completed:true } : x))
    setActive(v => ({ ...v, completed:true }))
    refreshUser()
  }

  const lbl = { fontSize:'0.58rem', color:'var(--txt3)', textTransform:'uppercase', letterSpacing:'0.14em' }

  return (
    <div style={{ padding:'28px 32px' }}>
      <div style={{ fontSize:'0.6rem', color:'var(--txt3)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:8 }}>Lernpfad</div>
      <div style={{ fontSize:'1.4rem', fontWeight:300, letterSpacing:'-0.03em', marginBottom:6 }}>Börse verstehen</div>
      <div style={{ fontSize:'0.78rem', color:'var(--txt3)', marginBottom:28 }}>Schließe Lektionen ab und sammle XP.</div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:10 }}>
        {lessons.map(l => (
          <div key={l.slug}
            onClick={() => !l.locked && open(l.slug)}
            style={{
              background:'var(--s1)',
              border:`1px solid ${l.completed ? 'rgba(22,163,74,0.18)' : l.locked ? 'var(--bl)' : 'var(--border)'}`,
              borderRadius:8, padding:'18px 20px',
              cursor: l.locked ? 'not-allowed' : 'pointer',
              opacity: l.locked ? 0.38 : 1,
              position:'relative', transition:'border-color 0.2s, opacity 0.2s',
            }}
          >
            <div style={{ position:'absolute', top:14, right:14 }}>
              {l.completed
                ? <span style={{ fontSize:'0.58rem', color:'var(--green)', letterSpacing:'0.08em' }}>FERTIG</span>
                : l.locked
                ? <span style={{ fontSize:'0.58rem', color:'var(--txt3)', letterSpacing:'0.08em' }}>LVL {l.level_req}</span>
                : <span style={{ fontSize:'0.62rem', color:'var(--acc)', letterSpacing:'0.06em' }}>+{l.xp_reward} XP</span>
              }
            </div>
            <div style={{ fontSize:'0.9rem', fontWeight:500, marginBottom:6, paddingRight:60 }}>{l.title}</div>
            <div style={{ fontSize:'0.76rem', color:'var(--txt2)', lineHeight:1.6 }}>{l.description}</div>
          </div>
        ))}
      </div>

      {/* Lesson modal */}
      {active && (
        <div onClick={() => setActive(null)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:100, padding:24,
          backdropFilter:'blur(4px)',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'var(--s1)', border:'1px solid var(--border)', borderRadius:10,
            padding:32, maxWidth:600, width:'100%', maxHeight:'82vh', overflowY:'auto',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:'1.2rem', fontWeight:400, letterSpacing:'-0.025em', marginBottom:6 }}>{active.title}</div>
                <div style={{ fontSize:'0.65rem', color:'var(--acc)', letterSpacing:'0.08em' }}>+{active.xp_reward} XP · Level {active.level_req}+</div>
              </div>
              <button onClick={() => setActive(null)} style={{
                background:'none', border:'1px solid var(--border)', color:'var(--txt3)',
                borderRadius:5, padding:'5px 12px', cursor:'pointer', fontSize:'0.72rem', flexShrink:0,
              }}>
                Schließen
              </button>
            </div>
            <div style={{ fontSize:'0.85rem', lineHeight:1.85, color:'var(--txt2)', whiteSpace:'pre-wrap', marginBottom:24 }}>
              {active.content}
            </div>
            {active.completed ? (
              <div style={{
                display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px',
                borderRadius:6, border:'1px solid rgba(22,163,74,0.3)', background:'rgba(22,163,74,0.06)',
                color:'var(--green)', fontSize:'0.8rem',
              }}>
                Bereits abgeschlossen
              </div>
            ) : (
              <button onClick={complete} style={{
                padding:'10px 24px', background:'var(--acc)', border:'none', color:'#fff',
                borderRadius:6, fontSize:'0.82rem', fontWeight:500, cursor:'pointer',
              }}>
                Abschließen · XP einsammeln →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
