import { useState, useEffect } from 'react'
import api from '../../api'
import Kalender from './Kalender'

const card = { background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 22px' }

const ICONS    = { sp500:'📈', dax:'🇩🇪', gold:'🥇', oil:'🛢️', btc:'₿', vix:'⚡', bonds:'📋', dollar:'💵' }
const NAMES    = { sp500:'S&P 500', dax:'DAX', gold:'Gold ($/oz)', oil:'Rohöl WTI ($/bbl)', btc:'Bitcoin', vix:'VIX', bonds:'US-Anleihen', dollar:'US-Dollar' }
const EXPLAIN  = {
  vix:   'VIX = Volatilitätsindex. Unter 20 = ruhige Märkte. Über 30 = Angst/Panik.',
  bonds: 'TLT = ETF auf 20+ Jahre US-Staatsanleihen. Steigt, wenn Anleger Sicherheit suchen.',
  dollar:'UUP = ETF der den US-Dollar vs. 6 Währungen abbildet. Steigt = Dollar stark.',
  gold:  'Gold-Futures (GC=F) — Preis in USD pro Feinunze (troy oz).',
  oil:   'WTI-Rohöl-Futures (CL=F) — Preis in USD pro Barrel.',
}

function FGGauge({ data }) {
  if (!data) return null
  const val = data.value || 50
  const angle = -90 + val * 1.8
  const rad = (angle * Math.PI) / 180
  const r = 55
  const cx = 70, cy = 70
  const x = cx + r * Math.cos(rad)
  const y = cy + r * Math.sin(rad)
  return (
    <div style={{textAlign:'center'}}>
      <svg width={140} height={90} viewBox="0 0 140 90">
        <path d="M15,75 A55,55 0 0,1 125,75" fill="none" stroke="#e74c3c" strokeWidth={8} strokeLinecap="round" opacity={0.3}/>
        <path d="M15,75 A55,55 0 0,1 57,26" fill="none" stroke="#e67e22" strokeWidth={8} strokeLinecap="round" opacity={0.3}/>
        <path d="M57,26 A55,55 0 0,1 83,26" fill="none" stroke="#f1c40f" strokeWidth={8} strokeLinecap="round" opacity={0.3}/>
        <path d="M83,26 A55,55 0 0,1 125,75" fill="none" stroke="#2ecc71" strokeWidth={8} strokeLinecap="round" opacity={0.3}/>
        <line x1={cx} y1={cy} x2={x} y2={y} stroke={data.color||'#fff'} strokeWidth={3} strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={5} fill="var(--s2)" stroke={data.color||'#fff'} strokeWidth={2}/>
        <text x={70} y={88} textAnchor="middle" fill={data.color||'#fff'} fontSize={12} fontWeight={700}>{data.label}</text>
      </svg>
      <div style={{fontSize:'2rem',fontWeight:300,color:data.color,marginTop:-4}}>{val}</div>
    </div>
  )
}

export default function Makro() {
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('makro')

  const tbtn = (active) => ({
    padding:'7px 18px', borderRadius:6, border:'none', cursor:'pointer', fontSize:'0.8rem', fontWeight:active?600:400,
    background:active?'rgba(255,255,255,0.14)':'transparent',
    color:active?'#fff':'rgba(255,255,255,0.4)',
    transition:'all 0.15s',
  })

  useEffect(()=>{
    api.get('/api/macro').then(r=>{setData(r.data);setLoading(false)}).catch(()=>setLoading(false))
  },[])

  if (loading) return <div style={{padding:40,color:'var(--txt3)'}}>Lade Makro-Daten…</div>

  const keys   = ['sp500','dax','gold','oil','btc','vix','bonds','dollar']
  const assets  = keys.map(k=>({key:k,...(data?.[k]||{})}))

  return (
    <div style={{padding:'28px 32px', maxWidth:900}}>
      <div style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.35)',letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:6}}>Global</div>
      <div style={{fontSize:'1.4rem',fontWeight:300,letterSpacing:'-0.04em',color:'#fff',marginBottom:6}}>Makro-Dashboard</div>
      <div style={{fontSize:'0.8rem',color:'var(--txt3)',marginBottom:16}}>Globale Märkte, Rohstoffe und Stimmungsindikatoren im Überblick</div>

      {/* Tab selector */}
      <div style={{ display:'flex',gap:2,background:'rgba(0,0,0,0.2)',borderRadius:7,padding:3,border:'1px solid rgba(255,255,255,0.1)',width:'fit-content',marginBottom:24 }}>
        {[{id:'makro',label:'Makro'},{id:'kalender',label:'Kalender'}].map(t=>(
          <button key={t.id} style={tbtn(activeTab===t.id)} onClick={()=>setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {activeTab==='kalender' && <Kalender embedded />}

      {activeTab==='makro' && <>

      {/* Fear & Greed + VIX */}
      <div style={{...card,marginBottom:16,display:'flex',alignItems:'center',gap:30,flexWrap:'wrap'}}>
        <FGGauge data={data?.fear_greed}/>
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:10}}>Markt-Stimmung (VIX-basiert)</div>
          <div style={{fontSize:'0.82rem',color:'var(--txt2)',lineHeight:1.7}}>
            {data?.vix?.price > 30 && 'Hohe Volatilität — Märkte in Angst-Modus. Historisch gute Einstiegschance für langfristige Anleger.'}
            {data?.vix?.price > 20 && data?.vix?.price <= 30 && 'Erhöhte Unsicherheit — Vorsicht geboten, aber kein Panik-Niveau.'}
            {data?.vix?.price <= 20 && 'Ruhige Märkte — geringe Volatilität, Anleger optimistisch.'}
          </div>
          <div style={{marginTop:10,fontSize:'0.74rem',color:'var(--txt3)'}}>
            VIX: <strong style={{color:'var(--txt)'}}>{data?.vix?.price?.toFixed(1)||'—'}</strong>
            {' · '}Gold: <strong style={{color:data?.gold?.change_pct>=0?'#2ecc71':'#e74c3c'}}>{data?.gold?.change_pct>=0?'+':''}{data?.gold?.change_pct}%</strong>
          </div>
        </div>
      </div>

      {/* Asset Grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
        {assets.map(a=>(
          <div key={a.key} style={{...card,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:12,right:14,fontSize:'1.4rem',opacity:0.2}}>{ICONS[a.key]}</div>
            <div style={{fontSize:'0.62rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>
              {ICONS[a.key]} {NAMES[a.key]||a.key}
            </div>
            <div style={{fontSize:'1.3rem',fontWeight:700,color:'var(--txt)',marginBottom:4}}>
              {a.price ? (a.key==='btc'?a.price.toLocaleString('de-DE'):a.price.toFixed(2)) : '—'}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:'0.84rem',fontWeight:700,color:a.change_pct>=0?'#2ecc71':'#e74c3c'}}>
                {a.change_pct>=0?'▲':'▼'} {Math.abs(a.change_pct||0).toFixed(2)}%
              </span>
              <span style={{fontSize:'0.7rem',color:'var(--txt3)'}}>heute</span>
            </div>
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:a.change_pct>=0?'rgba(46,204,113,0.4)':'rgba(231,76,60,0.4)'}}/>
          </div>
        ))}
      </div>

      {/* Indikator-Legende */}
      <div style={{...card,marginTop:16}}>
        <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:14}}>Was bedeuten diese Indikatoren?</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:10}}>
          {[
            {icon:'⚡',title:'VIX — Angst-Index',text:'Misst die erwartete Schwankungsbreite des S&P 500. Unter 15 = Ruhe, 15–25 = Normal, über 30 = Panik. Hoher VIX = gute Langfrist-Einstiegschance.'},
            {icon:'📋',title:'TLT — US-Staatsanleihen',text:'ETF auf 20+ Jahre US-Anleihen. Steigen Anleihen (TLT ↑), suchen Anleger Sicherheit. Fallen sie (TLT ↓), fließt Kapital in Aktien (Risk-On).'},
            {icon:'💵',title:'UUP — US-Dollar-Stärke',text:'ETF, der den Dollar gegen 6 Währungen (€, £, ¥ …) abbildet. Starker Dollar (UUP ↑) belastet oft Rohstoffe & Emerging Markets.'},
            {icon:'🥇',title:'Gold — Sicherer Hafen',text:'Gold-Futures (GC=F) in USD pro Feinunze. Steigt Gold, suchen Anleger Sicherheit oder erwarten Inflation. Fällt Gold, herrscht Optimismus.'},
            {icon:'🛢️',title:'Rohöl WTI — Konjunktur',text:'WTI-Rohöl-Futures (CL=F) in USD pro Barrel. Steigende Ölpreise signalisieren Wirtschaftswachstum oder geopolitische Risiken.'},
            {icon:'📈',title:'S&P 500 & DAX — Aktienmarkt',text:'Leitindizes für US- (S&P500) und deutsche (DAX) Aktien. Ihre tägliche Veränderung zeigt die allgemeine Marktstimmung.'},
          ].map((l,i)=>(
            <div key={i} style={{padding:'12px 14px',background:'var(--s2)',borderRadius:8}}>
              <div style={{fontSize:'0.8rem',fontWeight:700,color:'var(--txt)',marginBottom:5}}>{l.icon} {l.title}</div>
              <div style={{fontSize:'0.71rem',color:'var(--txt3)',lineHeight:1.55}}>{l.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Interpretation */}
      <div style={{...card,marginTop:12}}>
        <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:12}}>Heutige Makro-Interpretation</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[
            { title:'Risikobereitschaft', text: (data?.sp500?.change_pct||0)>0 && (data?.vix?.price||20)<20 ? 'Hoch — Aktien gefragt, VIX niedrig' : (data?.vix?.price||20)>25 ? 'Niedrig — Anleger suchen Sicherheit' : 'Mittel — gemischte Signale' },
            { title:'Safe Haven', text: (data?.gold?.change_pct||0)>0 ? `Gold steigt +${data?.gold?.change_pct}% — Flucht in sichere Werte` : 'Gold neutral bis schwach' },
            { title:'Krypto-Sentiment', text: (data?.btc?.change_pct||0)>3 ? 'Bitcoin stark — Risk-On Stimmung im Krypto-Markt' : (data?.btc?.change_pct||0)<-3 ? 'Bitcoin schwach — Risk-Off Modus' : 'Bitcoin neutral' },
            { title:'Anleihen vs. Aktien', text: (data?.bonds?.change_pct||0)>0 && (data?.sp500?.change_pct||0)<0 ? 'Rotation in Anleihen — Anleger defensiv' : 'Keine klare Rotation erkennbar' },
          ].map((item,i)=>(
            <div key={i} style={{padding:'12px 14px',background:'var(--s2)',borderRadius:8}}>
              <div style={{fontSize:'0.62rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>{item.title}</div>
              <div style={{fontSize:'0.78rem',color:'var(--txt2)',lineHeight:1.5}}>{item.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{marginTop:10,fontSize:'0.66rem',color:'var(--txt3)',textAlign:'center'}}>
        Daten via Yahoo Finance · 5 Min. gecacht · Keine Anlageberatung
      </div>

      </>}
    </div>
  )
}
