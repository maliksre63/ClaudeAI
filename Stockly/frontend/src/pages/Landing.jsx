import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

const features = [
  { icon: '🤖', title: 'KI-Mentor', desc: 'Erklärt Charts, Begriffe und Entscheidungen in Echtzeit — persönlich auf dein Niveau angepasst.' },
  { icon: '🧠', title: 'Psychologie-Tracking', desc: 'Erkennt emotionale Muster wie Panik-Trades oder FOMO und gibt dir ehrliches, datenbasiertes Feedback.' },
  { icon: '📊', title: 'Trade-Journal', desc: 'Alle Trades übersichtlich mit P&L, Emotionen, Kategorien und automatischer KI-Analyse.' },
  { icon: '📈', title: 'Live-Marktdaten', desc: 'Echte Kurse für 40+ Aktien, ETFs und Kryptowährungen — kein Spielgeld, echte Echtzeit-Daten.' },
  { icon: '🎮', title: 'Gamified Learning', desc: 'XP sammeln, Level aufsteigen, Badges verdienen. Vom Papier-Trader zum Profi.' },
  { icon: '🔍', title: 'Asset-Vergleich', desc: 'Vergleiche Assets nebeneinander mit normalisierten Charts, Rendite- und Volatilitäts-Statistiken.' },
]

const stats = [
  { num: '40+', lbl: 'Assets live' },
  { num: 'KI', lbl: 'Analyse & Mentor' },
  { num: '0€', lbl: 'Risiko' },
  { num: '100%', lbl: 'Datenbasiert' },
]

export default function Landing() {
  const [hoveredFeature, setHoveredFeature] = useState(null)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0d0205 0%, #1f0609 45%, #3d0a14 100%)',
      color: '#f0e6e2',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontWeight: 500,
      overflowX: 'hidden',
    }}>

      {/* Ambient glow top */}
      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 900, height: 600, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(139,26,42,0.22) 0%, transparent 65%)',
      }}/>
      {/* Ambient glow bottom */}
      <div style={{
        position: 'fixed', bottom: 0, right: 0, width: 600, height: 600,
        pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 60% 60% at 100% 100%, rgba(107,18,32,0.14) 0%, transparent 65%)',
      }}/>

      {/* ── NAV ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', padding: '18px 48px',
        borderBottom: '1px solid rgba(184,168,156,0.09)',
        backdropFilter: 'blur(14px)',
        background: 'rgba(13,2,5,0.55)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ flex: 1 }}>
          <Logo size={30} showText textColor="#f0e6e2"/>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/login" style={{
            padding: '8px 22px', borderRadius: 8,
            border: '1px solid rgba(184,168,156,0.13)',
            background: 'rgba(184,168,156,0.05)',
            color: 'rgba(240,230,226,0.65)', fontSize: '0.82rem',
            fontWeight: 600, textDecoration: 'none', transition: 'border-color 0.15s',
            letterSpacing: '0.01em',
          }}>Anmelden</Link>
          <Link to="/register" style={{
            padding: '8px 22px', borderRadius: 8,
            background: 'linear-gradient(135deg, #8B1A2A 0%, #6b1220 100%)',
            boxShadow: '0 4px 16px rgba(139,26,42,0.32)',
            color: '#fff', fontSize: '0.82rem', fontWeight: 700,
            textDecoration: 'none', letterSpacing: '0.01em',
          }}>Kostenlos starten</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{
        maxWidth: 840, margin: '0 auto', padding: '110px 32px 90px',
        textAlign: 'center', position: 'relative', zIndex: 1,
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '5px 16px 5px 10px', borderRadius: 20,
          border: '1px solid rgba(196,114,126,0.28)',
          background: 'rgba(139,26,42,0.1)',
          marginBottom: 32,
        }}>
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: '#c4727e', boxShadow: '0 0 6px #c4727e',
          }}/>
          <span style={{
            color: '#c4727e', fontSize: '0.7rem', fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>Echtzeit-Marktdaten · Kein echtes Kapital</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(2.4rem, 7.5vw, 4.8rem)',
          fontWeight: 900, letterSpacing: '-0.05em',
          lineHeight: 1.06, marginBottom: 26, color: '#f5ebe8',
        }}>
          Dein Trading-Journal.<br/>
          <span style={{
            background: 'linear-gradient(135deg, #d4808a 0%, #8B1A2A 55%, #6b1220 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>KI-gestützt.</span>
        </h1>

        {/* Sub */}
        <p style={{
          fontSize: '1.05rem', color: 'rgba(240,230,226,0.55)',
          maxWidth: 520, margin: '0 auto 48px', lineHeight: 1.7,
          fontWeight: 400,
        }}>
          Tracke deine Trades, analysiere deine Psychologie und entwickle
          deine Strategie — mit echten Marktdaten, ohne echtes Risiko.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" style={{
            padding: '15px 38px', borderRadius: 10,
            background: 'linear-gradient(135deg, #8B1A2A 0%, #6b1220 100%)',
            color: '#fff', fontSize: '0.95rem', fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 8px 28px rgba(139,26,42,0.38), 0 2px 8px rgba(0,0,0,0.3)',
            letterSpacing: '-0.01em',
          }}>Jetzt starten →</Link>
          <Link to="/login" style={{
            padding: '15px 38px', borderRadius: 10,
            border: '1px solid rgba(184,168,156,0.15)',
            background: 'rgba(184,168,156,0.05)',
            color: 'rgba(240,230,226,0.65)', fontSize: '0.95rem',
            fontWeight: 600, textDecoration: 'none',
          }}>Bereits registriert</Link>
        </div>
      </div>

      {/* ── STATS STRIP ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        maxWidth: 900, margin: '0 auto 96px',
        padding: '0 32px', position: 'relative', zIndex: 1,
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            textAlign: 'center', padding: '36px 16px',
            borderTop: '1px solid rgba(184,168,156,0.1)',
            borderBottom: '1px solid rgba(184,168,156,0.1)',
            borderLeft: '1px solid rgba(184,168,156,0.1)',
            borderRight: i === stats.length - 1 ? '1px solid rgba(184,168,156,0.1)' : undefined,
            background: 'rgba(184,168,156,0.025)',
          }}>
            <div style={{
              fontSize: 'clamp(1.7rem, 3vw, 2.3rem)', fontWeight: 900,
              color: '#c4727e', letterSpacing: '-0.04em', lineHeight: 1,
            }}>{s.num}</div>
            <div style={{
              fontSize: '0.73rem', color: 'rgba(240,230,226,0.38)',
              marginTop: 8, fontWeight: 500, letterSpacing: '0.02em',
            }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── SECTION LABEL ── */}
      <div style={{
        maxWidth: 1020, margin: '0 auto 24px', padding: '0 32px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          color: 'rgba(196,114,126,0.7)', fontSize: '0.7rem',
          fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>
          <span style={{ display: 'block', width: 28, height: 1, background: 'rgba(196,114,126,0.35)' }}/>
          Features
          <span style={{ display: 'block', width: 28, height: 1, background: 'rgba(196,114,126,0.35)' }}/>
        </div>
      </div>

      {/* ── FEATURES GRID ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))',
        maxWidth: 1020, margin: '0 auto 100px', padding: '0 32px',
        border: '1px solid rgba(184,168,156,0.08)',
        borderRadius: 16, overflow: 'hidden',
        position: 'relative', zIndex: 1,
      }}>
        {features.map((f, i) => (
          <div
            key={i}
            onMouseEnter={() => setHoveredFeature(i)}
            onMouseLeave={() => setHoveredFeature(null)}
            style={{
              padding: '28px 26px',
              background: hoveredFeature === i
                ? 'rgba(139,26,42,0.07)'
                : 'rgba(184,168,156,0.025)',
              borderRight: [1,4].includes(i) ? '1px solid rgba(184,168,156,0.08)' : undefined,
              borderBottom: i < 3 ? '1px solid rgba(184,168,156,0.08)' : undefined,
              transition: 'background 0.18s',
              cursor: 'default',
            }}
          >
            <div style={{ fontSize: '1.7rem', marginBottom: 14 }}>{f.icon}</div>
            <div style={{
              fontSize: '0.95rem', fontWeight: 700, marginBottom: 9,
              color: '#f0e6e2', letterSpacing: '-0.01em',
            }}>{f.title}</div>
            <div style={{
              fontSize: '0.82rem', color: 'rgba(240,230,226,0.45)',
              lineHeight: 1.68, fontWeight: 400,
            }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* ── BOTTOM CTA ── */}
      <div style={{
        maxWidth: 680, margin: '0 auto 100px', textAlign: 'center',
        padding: '64px 40px',
        background: 'rgba(139,26,42,0.07)',
        border: '1px solid rgba(139,26,42,0.18)',
        borderRadius: 20,
        position: 'relative', zIndex: 1,
        boxShadow: '0 0 80px rgba(139,26,42,0.12)',
      }}>
        <h2 style={{
          fontSize: 'clamp(1.7rem, 4vw, 2.6rem)',
          fontWeight: 900, letterSpacing: '-0.04em',
          color: '#f5ebe8', marginBottom: 14, lineHeight: 1.1,
        }}>
          Bereit anzufangen?
        </h2>
        <p style={{
          color: 'rgba(240,230,226,0.45)', marginBottom: 36,
          fontSize: '0.95rem', lineHeight: 1.65, fontWeight: 400,
        }}>
          Kostenlos, ohne Kreditkarte.<br/>
          Echte Marktdaten, kein echtes Kapital.
        </p>
        <Link to="/register" style={{
          padding: '15px 44px', borderRadius: 10,
          background: 'linear-gradient(135deg, #8B1A2A 0%, #6b1220 100%)',
          color: '#fff', fontSize: '0.95rem', fontWeight: 700,
          textDecoration: 'none',
          boxShadow: '0 8px 28px rgba(139,26,42,0.38)',
          display: 'inline-block', letterSpacing: '-0.01em',
        }}>Account erstellen →</Link>
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        textAlign: 'center', padding: '28px 24px',
        borderTop: '1px solid rgba(184,168,156,0.07)',
        color: 'rgba(240,230,226,0.18)', fontSize: '0.74rem',
        letterSpacing: '0.06em', position: 'relative', zIndex: 1,
      }}>
        © 2026 Stockly · Kein Finanzberater · Nur für Lernzwecke
      </div>
    </div>
  )
}
