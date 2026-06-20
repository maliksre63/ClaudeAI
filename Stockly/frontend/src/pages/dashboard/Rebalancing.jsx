import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../../api'

const card = { background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:'24px 26px', marginBottom:16 }

const TYPE_COLORS = { stock:'#3498db', etf:'#2ecc71', crypto:'#f39c12', bond:'#9b59b6', fund:'#e67e22' }
const TYPE_LABELS = { stock:'Aktien', etf:'ETFs', crypto:'Krypto', bond:'Anleihen', fund:'Fonds' }

export default function Rebalancing() {
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    api.get('/api/portfolio/rebalancing').then(r=>{setData(r.data);setLoading(false)}).catch(()=>setLoading(false))
  },[])

  if (loading) return <div style={{padding:40,color:'var(--txt3)'}}>Analysiere Portfolio…</div>

  const positions  = data?.positions || []
  const curAlloc   = data?.current_allocation || {}
  const tgtAlloc   = data?.target_allocation || {}
  const suggestions = data?.suggestions || []
  const totalValue  = data?.total_value || 0

  const pieData = Object.entries(curAlloc).filter(([,v])=>v>0).map(([k,v])=>({name:TYPE_LABELS[k]||k,value:v,key:k}))

  return (
    <div style={{padding:'28px 32px', maxWidth:900}}>
      <div style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.35)',letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:6}}>Portfolio</div>
      <div style={{fontSize:'1.4rem',fontWeight:300,letterSpacing:'-0.04em',color:'#fff',marginBottom:6}}>Portfolio-Rebalancing</div>
      <div style={{fontSize:'0.8rem',color:'var(--txt3)',marginBottom:16}}>Aktuelle Allokation vs. empfohlene Zielverteilung</div>

      {/* Intro explainer */}
      <div style={{...card,background:'rgba(52,152,219,0.06)',border:'1px solid rgba(52,152,219,0.2)',marginBottom:20}}>
        <div style={{fontSize:'0.78rem',color:'var(--txt2)',lineHeight:1.7}}>
          <strong style={{color:'var(--txt)'}}>Was ist Rebalancing?</strong> — Mit der Zeit verschieben sich die Anteile deines Portfolios, weil manche Assets stärker steigen als andere.
          Rebalancing bedeutet, du bringst die Gewichtung wieder auf deine Zielverteilung zurück —
          indem du übergewichtete Positionen reduzierst und untergewichtete aufstockst.
          So bleibst du <em style={{color:'var(--txt)'}}>diszipliniert diversifiziert</em> und verkaufst automatisch teuer / kaufst günstig nach.
        </div>
      </div>

      {positions.length === 0 ? (
        <div style={{...card,textAlign:'center',padding:'60px 40px'}}>
          <div style={{fontSize:'2rem',marginBottom:12}}>⚖️</div>
          <div style={{fontSize:'0.9rem',fontWeight:600,color:'var(--txt)',marginBottom:8}}>Kein Portfolio vorhanden</div>
          <div style={{fontSize:'0.78rem',color:'var(--txt3)'}}>Kaufe Aktien, ETFs oder Kryptowährungen um deine Allokation zu sehen.</div>
        </div>
      ) : (
        <>
          {/* Total */}
          <div style={{...card,marginBottom:16}}>
            <div style={{fontSize:'0.6rem',color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>Gesamt-Portfolio-Wert (Paper)</div>
            <div style={{fontSize:'1.8rem',fontWeight:300,color:'var(--txt)'}}>{totalValue.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})} €</div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {/* Pie Chart */}
            <div style={card}>
              <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:12}}>Aktuelle Verteilung</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((e,i)=><Cell key={i} fill={TYPE_COLORS[e.key]||'#888'}/>)}
                  </Pie>
                  <Tooltip formatter={(v)=>[`${v.toFixed(1)}%`,'']} contentStyle={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:8,fontSize:'0.78rem'}}/>
                  <Legend formatter={(v)=><span style={{fontSize:'0.72rem',color:'var(--txt2)'}}>{v}</span>}/>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Allocation Bars */}
            <div style={card}>
              <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:16}}>Ist vs. Ziel</div>
              {Object.entries(tgtAlloc).map(([type,target])=>{
                const cur = curAlloc[type]||0
                const diff = cur-target
                return (
                  <div key={type} style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:'0.78rem',fontWeight:600,color:'var(--txt)'}}>{TYPE_LABELS[type]||type}</span>
                      <span style={{fontSize:'0.76rem',color:Math.abs(diff)<5?'var(--txt3)':diff>0?'#2ecc71':'#e74c3c'}}>
                        {cur.toFixed(1)}% / Ziel {target}%
                      </span>
                    </div>
                    <div style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,position:'relative'}}>
                      <div style={{position:'absolute',top:0,left:0,height:'100%',width:`${cur}%`,background:TYPE_COLORS[type]||'#888',borderRadius:3,maxWidth:'100%'}}/>
                      <div style={{position:'absolute',top:-2,left:`${target}%`,width:2,height:10,background:'rgba(255,255,255,0.4)',borderRadius:1}}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div style={card}>
              <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:14}}>Rebalancing-Empfehlungen</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {suggestions.map((s,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',background:'var(--s2)',borderRadius:10,borderLeft:`3px solid ${s.action==='kaufen'?'#2ecc71':'#e74c3c'}`}}>
                    <div style={{width:36,height:36,borderRadius:'50%',background:`${TYPE_COLORS[s.type]||'#888'}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <span style={{fontSize:'0.9rem'}}>{s.action==='kaufen'?'📈':'📉'}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'0.84rem',fontWeight:700,color:'var(--txt)'}}>
                        {TYPE_LABELS[s.type]||s.type} {s.action === 'kaufen' ? 'aufstocken' : 'reduzieren'}
                      </div>
                      <div style={{fontSize:'0.72rem',color:'var(--txt3)',marginTop:2}}>
                        Ist: {s.current_pct}% · Ziel: {s.target_pct}% · Differenz: {s.diff>0?'+':''}{s.diff}%
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:'0.7rem',color:'var(--txt3)'}}>Empfohlen</div>
                      <div style={{fontSize:'0.92rem',fontWeight:700,color:s.action==='kaufen'?'#2ecc71':'#e74c3c'}}>
                        {s.action==='kaufen'?'+':'-'}{s.amount.toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:0})} €
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:12,fontSize:'0.68rem',color:'var(--txt3)'}}>
                Zielallokation: 50% Aktien · 30% ETFs · 15% Krypto · 5% Anleihen (klassisch diversifiziert)
              </div>
            </div>
          )}
          {suggestions.length === 0 && (
            <div style={{...card,textAlign:'center',padding:'30px'}}>
              <div style={{fontSize:'1.4rem',marginBottom:8}}>✅</div>
              <div style={{fontSize:'0.84rem',fontWeight:600,color:'var(--txt)'}}>Portfolio gut ausbalanciert!</div>
              <div style={{fontSize:'0.74rem',color:'var(--txt3)',marginTop:4}}>Keine Rebalancing-Maßnahmen notwendig (Abweichung {'<'} 5%)</div>
            </div>
          )}

          {/* Position List */}
          <div style={card}>
            <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--txt)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:14}}>Positionen</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {positions.map((p,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',borderBottom:i<positions.length-1?'1px solid rgba(255,255,255,0.04)':'none'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:TYPE_COLORS[p.type]||'#888',flexShrink:0}}/>
                  <span style={{fontSize:'0.84rem',fontWeight:700,color:'var(--txt)',width:80}}>{p.ticker}</span>
                  <div style={{flex:1,height:3,background:'rgba(255,255,255,0.06)',borderRadius:2}}>
                    <div style={{height:'100%',width:`${p.pct}%`,background:TYPE_COLORS[p.type]||'#888',borderRadius:2}}/>
                  </div>
                  <span style={{fontSize:'0.76rem',color:'var(--txt3)',width:45,textAlign:'right'}}>{p.pct}%</span>
                  <span style={{fontSize:'0.8rem',fontWeight:600,color:'var(--txt)',width:90,textAlign:'right'}}>{p.value.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})} €</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
