import { useState, useEffect } from 'react'
import api from '../../api'

const card = { background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:'24px 26px', marginBottom:16 }

function Gauge({ pct, label, color }) {
  const r = 54; const circ = 2*Math.PI*r; const fill = circ*(1-pct/100)
  return (
    <div style={{textAlign:'center'}}>
      <svg width={130} height={80} viewBox="0 0 130 80">
        <path d="M15,75 A55,55 0 0,1 115,75" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} strokeLinecap="round"/>
        <path d="M15,75 A55,55 0 0,1 115,75" fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${172*pct/100} 172`}/>
        <text x={65} y={72} textAnchor="middle" fill={color} fontSize={18} fontWeight={700}>{Math.round(pct)}%</text>
      </svg>
      <div style={{fontSize:'0.68rem',color:'var(--txt3)',marginTop:-8}}>{label}</div>
    </div>
  )
}

export default function Steuern() {
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear]   = useState(new Date().getFullYear())
  const [tab, setTab]     = useState('overview')

  const load = (y) => {
    setLoading(true)
    api.get(`/api/tax?year=${y}`).then(r=>{setData(r.data);setLoading(false)}).catch(()=>setLoading(false))
  }
  useEffect(()=>{ load(year) },[year])

  const cur = data?.current_year || {}
  const allYears = data?.all_years || []
  const freibetrag = data?.freibetrag || 1000

  const freibetragPct = cur.gains ? Math.min(100, (cur.freibetrag_used/freibetrag)*100) : 0

  return (
    <div style={{padding:'28px 32px', maxWidth:800}}>
      <div style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.35)',letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:6}}>Finanzen</div>
      <div style={{fontSize:'1.4rem',fontWeight:300,letterSpacing:'-0.04em',color:'#fff',marginBottom:6}}>Steuer-Simulator</div>
      <div style={{fontSize:'0.8rem',color:'var(--txt3)',marginBottom:24}}>Schätzung der deutschen Abgeltungssteuer auf deine Paper-Trades</div>

      {/* Year Selector */}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {[new Date().getFullYear()-1, new Date().getFullYear()].map(y=>(
          <button key={y} onClick={()=>setYear(y)} style={{
            padding:'8px 20px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:'0.82rem',fontWeight:600,
            background: year===y?'var(--acc)':'var(--s2)',
            border: year===y?'none':'1px solid var(--border)',
            color: year===y?'#fff':'var(--txt2)',
          }}>{y}</button>
        ))}
      </div>

      {/* Disclaimer */}
      <div style={{...card,background:'rgba(243,156,18,0.08)',border:'1px solid rgba(243,156,18,0.25)',marginBottom:16}}>
        <div style={{fontSize:'0.72rem',color:'#f39c12',lineHeight:1.6}}>
          ⚠️ <strong>Hinweis:</strong> Dies ist eine Simulation auf Basis deiner Paper-Trades. Keine echte Steuerberatung.
          Angaben: Abgeltungssteuer 25% + Solidaritätszuschlag 5,5% (= 26,375%). Sparer-Pauschbetrag: 1.000 € (Einzelperson).
        </div>
      </div>

      {/* Term explanations */}
      <div style={{...card,marginBottom:16}}>
        <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:12}}>Begriffe erklärt</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[
            {term:'Abgeltungssteuer (25%)', info:'Eine pauschale Steuer auf Kapitalerträge (Kursgewinne, Dividenden). Gilt für alle in Deutschland steuerpflichtigen Anleger.'},
            {term:'Solidaritätszuschlag (5,5%)', info:'Aufschlag auf die Abgeltungssteuer. 5,5% von 25% = ca. 1,375% extra → Gesamtsteuerlast 26,375%.'},
            {term:'Sparer-Pauschbetrag (1.000 €)', info:'Dein jährlicher steuerfreier Freibetrag. Gewinne bis 1.000 € (Einzelperson) sind steuerfrei — erst darüber wird Steuer fällig.'},
            {term:'Verlustverrechnungstopf', info:'Realisierte Verluste werden gesammelt und können mit zukünftigen Gewinnen verrechnet werden, um die Steuerlast zu senken.'},
          ].map((t,i)=>(
            <div key={i} style={{padding:'10px 12px',background:'var(--s2)',borderRadius:8}}>
              <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',marginBottom:4}}>{t.term}</div>
              <div style={{fontSize:'0.71rem',color:'var(--txt3)',lineHeight:1.5}}>{t.info}</div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{color:'var(--txt3)',padding:40}}>Berechne…</div>
      ) : (
        <>
          {/* Main Stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:16}}>
            <div style={card}>
              <div style={{fontSize:'0.58rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:16}}>Jahresübersicht {year}</div>
              <div style={{display:'flex',justifyContent:'space-around'}}>
                <Gauge pct={Math.min(100,cur.gains?cur.gains/(cur.gains+(cur.losses||1))*100:0)} label="Gewinn-Anteil" color="#2ecc71"/>
                <Gauge pct={freibetragPct} label="Freibetrag genutzt" color="#f39c12"/>
              </div>
            </div>
            <div style={card}>
              <div style={{fontSize:'0.58rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:12}}>Steuer-Berechnung</div>
              {[
                {label:'Realisierte Gewinne',  value:`${cur.gains?.toFixed(2)||'0.00'} €`,   color:'#2ecc71'},
                {label:'Realisierte Verluste',  value:`-${cur.losses?.toFixed(2)||'0.00'} €`, color:'#e74c3c'},
                {label:'Nettogewinn',           value:`${cur.net_gain?.toFixed(2)||'0.00'} €`,color: (cur.net_gain||0)>=0?'var(--txt)':'#e74c3c'},
                {label:'Sparer-Pauschbetrag',   value:`-${cur.freibetrag_used?.toFixed(2)||'0.00'} €`,color:'#f39c12'},
                {label:'Zu versteuern',         value:`${cur.taxable?.toFixed(2)||'0.00'} €`, color:'var(--txt)'},
              ].map((r,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:i<4?'1px solid rgba(255,255,255,0.05)':'none'}}>
                  <span style={{fontSize:'0.78rem',color:'var(--txt3)'}}>{r.label}</span>
                  <span style={{fontSize:'0.84rem',fontWeight:600,color:r.color}}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tax Due */}
          <div style={{...card,background: cur.steuer>0?'rgba(231,76,60,0.08)':'rgba(46,204,113,0.08)', border:`1px solid ${cur.steuer>0?'rgba(231,76,60,0.25)':'rgba(46,204,113,0.25)'}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:'0.7rem',color:'var(--txt3)',marginBottom:6}}>Geschätzte Steuerlast {year}</div>
                <div style={{fontSize:'1.8rem',fontWeight:300,color:cur.steuer>0?'#e74c3c':'#2ecc71'}}>
                  {cur.steuer>0?`${cur.steuer.toFixed(2)} €`:'0,00 € 🎉'}
                </div>
                {cur.steuer===0 && cur.net_gain>0 && (
                  <div style={{fontSize:'0.72rem',color:'#2ecc71',marginTop:4}}>Gewinne vollständig durch Freibetrag gedeckt!</div>
                )}
                {cur.verlustverrechnungstopf>0 && (
                  <div style={{fontSize:'0.72rem',color:'#f39c12',marginTop:4}}>Verlusttopf: {cur.verlustverrechnungstopf.toFixed(2)} € (verrechenbar mit zukünftigen Gewinnen)</div>
                )}
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'0.68rem',color:'var(--txt3)',marginBottom:4}}>Abgeltungssteuer (25%)</div>
                <div style={{fontSize:'1rem',fontWeight:600,color:'var(--txt)'}}>{cur.abgeltungssteuer?.toFixed(2)||'0.00'} €</div>
                <div style={{fontSize:'0.68rem',color:'var(--txt3)',marginBottom:4,marginTop:8}}>Solidaritätszuschlag (5,5%)</div>
                <div style={{fontSize:'1rem',fontWeight:600,color:'var(--txt)'}}>{cur.soli?.toFixed(2)||'0.00'} €</div>
              </div>
            </div>
          </div>

          {/* Trades */}
          {cur.trades && cur.trades.length > 0 && (
            <div style={card}>
              <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:14}}>Abgeschlossene Trades {year}</div>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid var(--border)'}}>
                    {['Ticker','Datum','Ergebnis',''].map((h,i)=>(
                      <th key={i} style={{textAlign:i>1?'right':'left',padding:'6px 8px',fontSize:'0.6rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.1em'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cur.trades.map((t,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <td style={{padding:'8px',fontSize:'0.84rem',fontWeight:700,color:'var(--txt)'}}>{t.ticker}</td>
                      <td style={{padding:'8px',fontSize:'0.78rem',color:'var(--txt3)'}}>{t.date}</td>
                      <td style={{padding:'8px',fontSize:'0.84rem',fontWeight:600,textAlign:'right',color:t.gain>=0?'#2ecc71':'#e74c3c'}}>
                        {t.gain>=0?'+':''}{t.gain?.toFixed(2)} €
                      </td>
                      <td style={{padding:'8px',textAlign:'right'}}>
                        <span style={{fontSize:'0.6rem',padding:'2px 7px',borderRadius:10,fontWeight:700,
                          background:t.type==='Gewinn'?'rgba(46,204,113,0.15)':'rgba(231,76,60,0.15)',
                          color:t.type==='Gewinn'?'#2ecc71':'#e74c3c'
                        }}>{t.type}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* All years summary */}
          {allYears.length > 1 && (
            <div style={card}>
              <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:14}}>Jahresvergleich</div>
              {allYears.map((y,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<allYears.length-1?'1px solid rgba(255,255,255,0.05)':'none'}}>
                  <span style={{fontSize:'0.84rem',fontWeight:600,color:'var(--txt)'}}>{y.year}</span>
                  <span style={{fontSize:'0.78rem',color:'#2ecc71'}}>+{y.gains.toFixed(0)} €</span>
                  <span style={{fontSize:'0.78rem',color:'#e74c3c'}}>-{y.losses.toFixed(0)} €</span>
                  <span style={{fontSize:'0.84rem',fontWeight:700,color:y.steuer>0?'#e74c3c':'#2ecc71'}}>
                    Steuer: {y.steuer.toFixed(2)} €
                  </span>
                </div>
              ))}
            </div>
          )}

          {cur.trades?.length === 0 && (
            <div style={{...card,textAlign:'center',padding:'50px 40px'}}>
              <div style={{fontSize:'2rem',marginBottom:12}}>📊</div>
              <div style={{fontSize:'0.9rem',fontWeight:600,color:'var(--txt)',marginBottom:8}}>Keine abgeschlossenen Trades in {year}</div>
              <div style={{fontSize:'0.78rem',color:'var(--txt3)'}}>Führe Verkäufe durch um die Steuerberechnung zu sehen.</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
