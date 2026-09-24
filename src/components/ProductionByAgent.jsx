'use client'
// ─── ProductionByAgent.jsx ────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react'

const STATUS_CFG = [
  { key: 'Converted',           label: 'Converted',   color: '#10b981', bg: '#ecfdf5', text: '#065f46' },
  { key: 'In Progress',         label: 'In Progress', color: '#6366f1', bg: '#eef2ff', text: '#4338ca' },
  { key: 'follow up scheduled', label: 'Follow Up',   color: '#f59e0b', bg: '#fffbeb', text: '#b45309' },
  { key: 'Wrong Number',        label: 'Wrong No.',   color: '#f97316', bg: '#fff7ed', text: '#c2410c' },
  { key: 'Denied',              label: 'Denied',      color: '#ef4444', bg: '#fef2f2', text: '#b91c1c' },
  { key: 'Unresponsive',        label: 'Unresponse',  color: '#94a3b8', bg: '#f8fafc', text: '#475569' },
  { key: 'No Poc',              label: 'No PoC',      color: '#8b5cf6', bg: '#f5f3ff', text: '#6d28d9' },
]
const MEDALS = ['🥇','🥈','🥉']
const avatarColor = (name) =>
  `hsl(${((name?.charCodeAt(0)||65)*137.5)%360},52%,52%)`

const ProductionByAgent = ({ filteredUserLeads = [] }) => {
  const [animated, setAnimated]  = useState(false)
  const [hoveredRow, setHovRow]  = useState(null)
  const [activeStatus, setActSt] = useState(null)

  useEffect(() => {
    setAnimated(false)
    const t = setTimeout(() => setAnimated(true), 140)
    return () => clearTimeout(t)
  }, [filteredUserLeads])

  if (!filteredUserLeads.length) return (
    <div style={{padding:'40px',textAlign:'center',color:'#94a3b8',
      fontFamily:'Plus Jakarta Sans,sans-serif'}}>No agent data available</div>
  )

  const sorted     = [...filteredUserLeads].sort((a,b)=>(b.total||0)-(a.total||0))
  const maxTotal   = sorted[0]?.total || 1
  const grandTotal = sorted.reduce((s,u)=>s+(u.total||0),0)
  const totalConv  = sorted.reduce((s,u)=>s+(u.statuses?.Converted||0),0)
  const topConv    = [...sorted].sort((a,b)=>(b.statuses?.Converted||0)-(a.statuses?.Converted||0))[0]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .pba2 *{box-sizing:border-box}
        .pba2{font-family:'Plus Jakarta Sans',sans-serif;background:#fff;border-radius:22px;
          box-shadow:0 2px 28px rgba(15,23,42,.08),0 1px 3px rgba(15,23,42,.04);overflow:hidden}
        .pba2-hd{background:linear-gradient(118deg,#0f172a 0%,#1a2540 55%,#0f2640 100%);
          padding:22px 26px 0;position:relative;overflow:hidden}
        .pba2-orb1{position:absolute;top:-60px;right:-40px;width:240px;height:240px;border-radius:50%;
          background:radial-gradient(circle,rgba(16,185,129,.18) 0%,transparent 65%);pointer-events:none}
        .pba2-orb2{position:absolute;bottom:5px;left:22%;width:170px;height:100px;border-radius:50%;
          background:radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 65%);pointer-events:none}
        .pba2-hd-inner{position:relative;z-index:1;display:flex;align-items:flex-start;
          justify-content:space-between;gap:14px;flex-wrap:wrap}
        .pba2-eyebrow{font-size:10px;font-weight:700;letter-spacing:2.5px;
          color:rgba(255,255,255,.35);text-transform:uppercase;margin:0 0 5px}
        .pba2-title{font-size:20px;font-weight:800;color:#fff;margin:0 0 3px;letter-spacing:-.4px}
        .pba2-sub{font-size:11px;color:rgba(255,255,255,.38);margin:0}
        .pba2-pills{display:flex;gap:9px;flex-wrap:wrap;align-items:flex-start}
        .pba2-pill{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);
          border-radius:13px;padding:9px 16px;min-width:78px;backdrop-filter:blur(6px)}
        .pba2-pill-g{border-color:rgba(16,185,129,.3)!important;background:rgba(16,185,129,.1)!important}
        .pba2-pill-a{border-color:rgba(245,158,11,.3)!important;background:rgba(245,158,11,.08)!important}
        .pba2-pv{display:block;font-size:19px;font-weight:800;color:#fff;line-height:1}
        .pba2-pl{display:block;font-size:9px;font-weight:700;color:rgba(255,255,255,.35);
          text-transform:uppercase;letter-spacing:.8px;margin-top:3px}
        .pba2-st-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:16px;
          padding-bottom:16px;position:relative;z-index:1}
        .pba2-st-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;
          border-radius:999px;border:1px solid rgba(255,255,255,.12);
          background:rgba(255,255,255,.06);color:rgba(255,255,255,.55);
          font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:600;
          cursor:pointer;transition:all .18s}
        .pba2-st-chip:hover{background:rgba(255,255,255,.12);color:#fff}
        .pba2-st-chip.on{border-color:var(--sc)!important;background:var(--sbg)!important;color:var(--stxt)!important}
        .pba2-st-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
        .pba2-st-n{background:rgba(255,255,255,.14);color:#fff;border-radius:999px;
          padding:1px 7px;font-size:10px;font-weight:700}
        .pba2-st-chip.on .pba2-st-n{background:rgba(0,0,0,.1);color:var(--stxt)}
        .pba2-segbar{display:flex;height:5px;overflow:hidden;border-radius:0}
        .pba2-seg{height:100%;transition:flex 1s cubic-bezier(.34,1.1,.64,1),opacity .2s}
        .pba2-body{overflow-x:auto}
        .pba2-chdrs{display:flex;align-items:center;gap:4px;padding:10px 20px 8px;
          border-bottom:1px solid #e2e8f0;min-width:840px}
        .pba2-chdr{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;
          letter-spacing:.8px;padding:0 4px;flex-shrink:0}
        .pba2-chdr-grow{flex:1;min-width:145px}
        .pba2-chdr-bar{min-width:175px;width:175px}
        .pba2-chdr-st{width:76px;text-align:center;transition:color .15s}
        .pba2-chdr-st.on{color:var(--sc)!important}
        .pba2-chdr-r{width:52px;text-align:right}
        .pba2-row{display:flex;align-items:center;gap:4px;padding:9px 20px;
          min-width:840px;border-bottom:1px solid #f8fafc;transition:background .12s;
          animation:pba2In .3s both}
        @keyframes pba2In{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .pba2-row:last-child{border-bottom:none}
        .pba2-row:hover,.pba2-row.hov{background:#f8fafc}
        .pba2-rank{width:32px;flex-shrink:0;display:flex;justify-content:center;
          font-size:12px;font-weight:700;color:#cbd5e1}
        .pba2-agent{flex:1;min-width:145px;display:flex;align-items:center;gap:9px;flex-shrink:0}
        .pba2-av{width:33px;height:33px;border-radius:50%;display:flex;align-items:center;
          justify-content:center;font-size:13px;font-weight:800;color:#fff;flex-shrink:0}
        .pba2-aname{font-size:13px;font-weight:700;color:#1e293b;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .pba2-aconv{font-size:10px;font-weight:600;color:#94a3b8}
        .pba2-bar-cell{min-width:175px;width:175px;flex-shrink:0;
          display:flex;align-items:center;gap:7px;padding:0 4px}
        .pba2-track{flex:1;background:#f1f5f9;border-radius:999px;height:8px;overflow:hidden}
        .pba2-fill{height:100%;border-radius:999px;transition:width .85s cubic-bezier(.34,1.4,.64,1)}
        .pba2-bpct{font-size:10px;font-weight:700;color:#94a3b8;white-space:nowrap;min-width:30px}
        .pba2-st-cell{width:76px;flex-shrink:0;display:flex;justify-content:center;
          align-items:center;border-radius:8px;padding:2px 0;transition:background .15s}
        .pba2-st-cell.hl{background:var(--sbg)}
        .pba2-chip{display:inline-flex;align-items:center;justify-content:center;
          padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700;min-width:26px}
        .pba2-zero{color:#e2e8f0;font-size:12px}
        .pba2-total{width:52px;flex-shrink:0;font-size:15px;font-weight:800;
          color:#0f172a;text-align:right;transition:color .15s}
        .pba2-ft{padding:12px 22px 16px;border-top:1px solid #f1f5f9;
          display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
        .pba2-ft-note{font-size:11px;font-weight:500;color:#94a3b8}
        .pba2-ft-chip{background:#0f172a;color:#fff;border-radius:999px;
          padding:5px 16px;font-size:12px;font-weight:700;white-space:nowrap}
      `}</style>

      <div className="pba2">
        <div className="pba2-hd">
          <div className="pba2-orb1"/><div className="pba2-orb2"/>
          <div className="pba2-hd-inner">
            <div>
              <p className="pba2-eyebrow">Performance Dashboard</p>
              <p className="pba2-title">Production by Agent</p>
              <p className="pba2-sub">Month-to-date · all agents ranked by volume</p>
            </div>
            <div className="pba2-pills">
              <div className="pba2-pill">
                <span className="pba2-pv">{grandTotal.toLocaleString()}</span>
                <span className="pba2-pl">Total Leads</span>
              </div>
              <div className="pba2-pill">
                <span className="pba2-pv">{sorted.length}</span>
                <span className="pba2-pl">Agents</span>
              </div>
              <div className="pba2-pill pba2-pill-g">
                <span className="pba2-pv">{totalConv.toLocaleString()}</span>
                <span className="pba2-pl">Converted</span>
              </div>
              {topConv && (
                <div className="pba2-pill pba2-pill-a">
                  <span className="pba2-pv" style={{fontSize:topConv.name?.length>10?'12px':'16px',paddingTop:2}}>
                    {topConv.name}
                  </span>
                  <span className="pba2-pl">Top Agent</span>
                </div>
              )}
            </div>
          </div>

          <div className="pba2-st-row">
            {STATUS_CFG.map(s=>{
              const tot = sorted.reduce((a,u)=>a+(u.statuses?.[s.key]||0),0)
              return (
                <button key={s.key}
                  className={`pba2-st-chip${activeStatus===s.key?' on':''}`}
                  style={{'--sc':s.color,'--sbg':s.bg,'--stxt':s.text}}
                  onClick={()=>setActSt(activeStatus===s.key?null:s.key)}
                >
                  <span className="pba2-st-dot" style={{background:s.color}}/>
                  {s.label}
                  <span className="pba2-st-n">{tot}</span>
                </button>
              )
            })}
          </div>

          <div className="pba2-segbar">
            {sorted.map((u,i)=>(
              <div key={u.name} className="pba2-seg" style={{
                flex: animated ? (u.total||0) : 0,
                background: avatarColor(u.name),
                opacity: hoveredRow===null||hoveredRow===i ? 1 : 0.25,
              }}/>
            ))}
          </div>
        </div>

        <div className="pba2-body">
          <div className="pba2-chdrs">
            <div className="pba2-chdr" style={{width:32}}>#</div>
            <div className="pba2-chdr pba2-chdr-grow">Agent</div>
            <div className="pba2-chdr pba2-chdr-bar">Volume</div>
            {STATUS_CFG.map(s=>(
              <div key={s.key}
                className={`pba2-chdr pba2-chdr-st${activeStatus===s.key?' on':''}`}
                style={{'--sc':s.color}}
              >{s.label}</div>
            ))}
            <div className="pba2-chdr pba2-chdr-r">Total</div>
          </div>

          {sorted.map((user,i)=>{
            const conv    = user.statuses?.Converted||0
            const convPct = user.total ? Math.round((conv/user.total)*100) : 0
            const hov     = hoveredRow===i
            const barW    = animated ? (user.total/maxTotal)*100 : 0
            const ac      = avatarColor(user.name)
            return (
              <div key={user.name}
                className={`pba2-row${hov?' hov':''}`}
                style={{animationDelay:`${i*35}ms`}}
                onMouseEnter={()=>setHovRow(i)}
                onMouseLeave={()=>setHovRow(null)}
              >
                <div className="pba2-rank">
                  {i<3 ? <span style={{fontSize:16}}>{MEDALS[i]}</span> : <span>{i+1}</span>}
                </div>
                <div className="pba2-agent">
                  <div className="pba2-av" style={{background:ac}}>
                    {user.name?.charAt(0)?.toUpperCase()||'?'}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:1,overflow:'hidden'}}>
                    <span className="pba2-aname">{user.name}</span>
                    <span className="pba2-aconv">{convPct}% conv.</span>
                  </div>
                </div>
                <div className="pba2-bar-cell">
                  <div className="pba2-track">
                    <div className="pba2-fill" style={{
                      width:`${barW}%`,
                      background:`linear-gradient(90deg,${ac}88,${ac})`,
                      boxShadow:hov?`0 0 8px ${ac}66`:'none',
                    }}/>
                  </div>
                  <span className="pba2-bpct">
                    {grandTotal?((user.total/grandTotal)*100).toFixed(1):0}%
                  </span>
                </div>
                {STATUS_CFG.map(s=>{
                  const val = user.statuses?.[s.key]||0
                  const isAct = activeStatus===s.key
                  return (
                    <div key={s.key}
                      className={`pba2-st-cell${isAct?' hl':''}`}
                      style={{'--sbg':s.bg}}
                    >
                      {val>0
                        ? <span className="pba2-chip" style={{background:s.bg,color:s.text}}>{val}</span>
                        : <span className="pba2-zero">—</span>
                      }
                    </div>
                  )
                })}
                <div className="pba2-total" style={{color:hov?ac:'#0f172a'}}>
                  {(user.total||0).toLocaleString()}
                </div>
              </div>
            )
          })}
        </div>

        <div className="pba2-ft">
          <span className="pba2-ft-note">
            Hover rows · Click status chips to highlight columns
          </span>
          <span className="pba2-ft-chip">
            {sorted.length} agents · {grandTotal.toLocaleString()} leads
          </span>
        </div>
      </div>
    </>
  )
}

export default ProductionByAgent
