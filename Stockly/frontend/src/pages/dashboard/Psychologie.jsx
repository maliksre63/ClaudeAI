import { useState, useEffect } from 'react'
import api from '../../api'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

const card = { background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:'24px 26px', marginBottom:16 }

const EMOTION_COLORS = {
  'Neutral':'#888','Gier':'#e74c3c','Angst':'#3498db','FOMO':'#e67e22',
  'Zuversicht':'#2ecc71','Geduld':'#9b59b6','Panik':'#c0392b','Euphorie':'#f39c12','Unsicherheit':'#95a5a6'
}

export default function Psychologie() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/psychology').then(r => { setData(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div style={{padding:40,color:'var(--txt3)'}}>Analysiere deine Trading-Psychologie…</div>

  const emotions = data?.emotions || []
  const insights = data?.insights || []
  const tradeResults = data?.trade_results || []

  return (
    <div style={{padding:'28px 32px', maxWidth:900}}>
      <div style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.35)',letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:6}}>Analyse</div>
      <div style={{fontSize:'1.4rem',fontWeight:300,letterSpacing:'-0.04em',color:'#fff',marginBottom:6}}>Trading-Psychologie</div>
      <div style={{fontSize:'0.8rem',color:'var(--txt3)',marginBottom:16}}>Wie beeinflussen deine Emotionen deine Rendite?</div>

      {/* Why emotions matter — intro */}
      <div style={{...card,background:'rgba(155,89,182,0.06)',border:'1px solid rgba(155,89,182,0.2)',marginBottom:20}}>
        <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
          <span style={{fontSize:'1.8rem',flexShrink:0}}>🧠</span>
          <div>
            <div style={{fontSize:'0.84rem',fontWeight:700,color:'var(--txt)',marginBottom:6}}>Warum spielen Emotionen beim Trading eine Rolle?</div>
            <div style={{fontSize:'0.78rem',color:'var(--txt2)',lineHeight:1.75}}>
              Über 80% der Trading-Verluste entstehen nicht durch mangelndes Wissen — sondern durch emotionale Entscheidungen.
              <strong style={{color:'var(--txt)'}}> Gier</strong> lässt uns Gewinne nicht realisieren,
              <strong style={{color:'var(--txt)'}}> Angst</strong> veranlasst uns zu früh zu verkaufen,
              <strong style={{color:'var(--txt)'}}> FOMO</strong> (Fear of Missing Out) verleitet zu impulsiven Käufen.
              Diese Seite zeigt dir anhand deiner eigenen Trades, welche Emotionszustände dir statistisch
              die besten — und die schlechtesten — Ergebnisse bringen.
            </div>
            <div style={{marginTop:10,fontSize:'0.7rem',color:'var(--txt3)',background:'rgba(255,255,255,0.04)',borderRadius:6,padding:'6px 10px'}}>
              Tipp: Wähle beim Kauf oder Verkauf im Formular eine Emotion aus — nach ein paar Trades siehst du hier deine persönlichen Muster.
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {label:'Trades gesamt',value:data?.total_trades||0},
          {label:'Abgeschlossene',value:data?.closed_trades||0},
          {label:'Beste Emotion',value:data?.best_emotion||'—'},
          {label:'Schlechteste',value:data?.worst_emotion||'—'},
        ].map((s,i)=>(
          <div key={i} style={{...card,marginBottom:0,textAlign:'center'}}>
            <div style={{fontSize:'0.58rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:8}}>{s.label}</div>
            <div style={{fontSize:'1.3rem',fontWeight:700,color:'var(--txt)'}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div style={{...card,background:'rgba(61,10,20,0.12)',border:'1px solid rgba(107,18,32,0.3)'}}>
          <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:12}}>KI-Erkenntnisse</div>
          {insights.map((ins,i)=>(
            <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:i<insights.length-1?10:0}}>
              <span style={{fontSize:'0.9rem'}}>💡</span>
              <span style={{fontSize:'0.82rem',color:'var(--txt2)',lineHeight:1.5}}>{ins}</span>
            </div>
          ))}
        </div>
      )}

      {/* Hint: has trades but no emotion tags */}
      {(data?.total_trades > 0) && emotions.length === 0 && (
        <div style={{...card,background:'rgba(243,156,18,0.08)',border:'1px solid rgba(243,156,18,0.25)',marginBottom:16}}>
          <div style={{fontSize:'0.82rem',color:'#f39c12',lineHeight:1.6}}>
            💡 <strong>Tipp:</strong> Du hast bereits Trades, aber noch keine Emotionen zugeordnet.
            Wähle beim nächsten Kauf oder Verkauf eine Emotion aus — dann siehst du hier, welche
            Gefühlszustände dir die besten (und schlechtesten) Renditen bringen.
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {/* Emotion Bar Chart */}
        <div style={card}>
          <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:16}}>Ø-Rendite pro Emotion</div>
          {emotions.length === 0 ? (
            <div style={{fontSize:'0.8rem',color:'var(--txt3)',textAlign:'center',padding:'30px 0'}}>Noch keine abgeschlossenen Trades mit Emotion</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={emotions} layout="vertical" margin={{left:60,right:20}}>
                <XAxis type="number" tickFormatter={v=>`${v}%`} tick={{fontSize:10,fill:'var(--txt3)'}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="emotion" tick={{fontSize:11,fill:'var(--txt2)'}} axisLine={false} tickLine={false}/>
                <Tooltip formatter={(v)=>[`${v}%`,'Ø Rendite']} contentStyle={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:8,fontSize:'0.78rem'}}/>
                <Bar dataKey="avg_pnl" radius={4}>
                  {emotions.map((e,i)=>(
                    <Cell key={i} fill={e.avg_pnl>=0?'#2ecc71':'#e74c3c'}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Emotion Table */}
        <div style={card}>
          <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:14}}>Details</div>
          {emotions.length===0 ? (
            <div style={{fontSize:'0.8rem',color:'var(--txt3)',textAlign:'center',padding:'30px 0'}}>Keine Daten vorhanden</div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {emotions.map((e,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--s2)',borderRadius:8}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:EMOTION_COLORS[e.emotion]||'#888',flexShrink:0}}/>
                  <div style={{flex:1,fontSize:'0.82rem',fontWeight:600,color:'var(--txt)'}}>{e.emotion}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--txt3)'}}>{e.count} Trades</div>
                  <div style={{fontSize:'0.82rem',fontWeight:700,color:e.avg_pnl>=0?'#2ecc71':'#e74c3c',minWidth:55,textAlign:'right'}}>
                    {e.avg_pnl>=0?'+':''}{e.avg_pnl}%
                  </div>
                  <div style={{fontSize:'0.72rem',color:'var(--txt3)',minWidth:40,textAlign:'right'}}>{e.win_rate}% Win</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent trade results */}
      {tradeResults.length > 0 && (
        <div style={card}>
          <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:14}}>Letzte abgeschlossene Trades</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8}}>
            {tradeResults.slice(-12).reverse().map((t,i)=>(
              <div key={i} style={{padding:'10px 12px',background:'var(--s2)',borderRadius:8,borderLeft:`3px solid ${t.pnl_pct>=0?'#2ecc71':'#e74c3c'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:'0.82rem',fontWeight:700,color:'var(--txt)'}}>{t.ticker}</span>
                  <span style={{fontSize:'0.82rem',fontWeight:700,color:t.pnl_pct>=0?'#2ecc71':'#e74c3c'}}>{t.pnl_pct>=0?'+':''}{t.pnl_pct}%</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:'0.68rem',color:EMOTION_COLORS[t.emotion]||'var(--txt3)'}}>{t.emotion}</span>
                  <span style={{fontSize:'0.68rem',color:'var(--txt3)'}}>{t.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.total_trades === 0 && (
        <div style={{...card,textAlign:'center',padding:'60px 40px'}}>
          <div style={{fontSize:'2rem',marginBottom:12}}>🧠</div>
          <div style={{fontSize:'0.9rem',fontWeight:600,color:'var(--txt)',marginBottom:8}}>Noch keine Trades vorhanden</div>
          <div style={{fontSize:'0.78rem',color:'var(--txt3)'}}>Starte mit dem Trading und wähle beim Kauf eine Emotion aus — dann analysiere ich deine Muster.</div>
        </div>
      )}
    </div>
  )
}
