'use client'
// ─── LeadsByProviderType.jsx ──────────────────────────────────────────────────
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PALETTE = [
  { bar: '#6366f1', light: '#eef2ff', text: '#4338ca', glow: 'rgba(99,102,241,0.35)'  },
  { bar: '#10b981', light: '#ecfdf5', text: '#065f46', glow: 'rgba(16,185,129,0.35)'  },
  { bar: '#f59e0b', light: '#fffbeb', text: '#b45309', glow: 'rgba(245,158,11,0.35)'  },
  { bar: '#ef4444', light: '#fef2f2', text: '#b91c1c', glow: 'rgba(239,68,68,0.35)'   },
  { bar: '#8b5cf6', light: '#f5f3ff', text: '#6d28d9', glow: 'rgba(139,92,246,0.35)'  },
  { bar: '#06b6d4', light: '#ecfeff', text: '#0e7490', glow: 'rgba(6,182,212,0.35)'   },
  { bar: '#f97316', light: '#fff7ed', text: '#c2410c', glow: 'rgba(249,115,22,0.35)'  },
]

// SVG Donut
const Donut = ({ slices, size = 170, thick = 28, animated }) => {
  const r   = (size - thick) / 2
  const cx  = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} style={{overflow:'visible', transform:'rotate(-90deg)'}}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thick}/>
      {slices.map((s, i) => {
        const before = slices.slice(0, i).reduce((a, x) => a + x.pct, 0)
        const dash = animated ? (s.pct / 100) * circ : 0
        const offset = circ - (before / 100) * circ
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={thick - 3} strokeLinecap="butt"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={offset}
            style={{transition:`stroke-dasharray 0.85s cubic-bezier(.34,1.1,.64,1) ${i * 0.07}s`}}
          />
        )
      })}
    </svg>
  )
}

const LeadsByProviderType = ({
  leadTypes = [],
  selectedYear,
  selectedMonth,
  leadTypesMapping = [],
  router,
}) => {
  const [animated, setAnimated] = useState(false)
  const [hovered, setHovered]   = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120)
    return () => clearTimeout(t)
  }, [leadTypes])

  const sorted   = [...leadTypes].sort((a, b) => b.count - a.count)
  const maxCount = sorted[0]?.count || 1
  const total    = sorted.reduce((s, i) => s + i.count, 0)

  const donutSlices = sorted.map((r, i) => ({
    pct:   total ? (r.count / total) * 100 : 0,
    color: PALETTE[i % PALETTE.length].bar,
  }))

  const handleClick = (item) => {
    if (!router) return
    const params = new URLSearchParams()
    if (selectedYear)  params.append('year',  selectedYear)
    if (selectedMonth) params.append('month', selectedMonth)
    if (item.id) {
      params.append('lead_type_id', item.id)
      router.push(`/leads/list?${params.toString()}`)
    } else if (item.type === 'Unknown') {
      params.append('lead_type_id', 'NULL')
      router.push(`/leads/list?${params.toString()}`)
    } else {
      const mapping = leadTypesMapping.find(m => m.name === item.type)
      if (mapping) {
        params.append('lead_type_id', mapping.id)
        router.push(`/leads/list?${params.toString()}`)
      }
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .lpt-wrap *{box-sizing:border-box}
        .lpt-wrap{font-family:'Plus Jakarta Sans',sans-serif;background:#fff;border-radius:22px;
          box-shadow:0 2px 28px rgba(15,23,42,.08),0 1px 3px rgba(15,23,42,.04);overflow:hidden;height:100%}
        .lpt-hd{background:linear-gradient(118deg,#0f172a 0%,#1e2d40 55%,#1a2a44 100%);
          padding:22px 26px 0;position:relative;overflow:hidden}
        .lpt-hd-orb1{position:absolute;top:-50px;right:-30px;width:190px;height:190px;border-radius:50%;
          background:radial-gradient(circle,rgba(99,102,241,.2) 0%,transparent 65%);pointer-events:none}
        .lpt-hd-orb2{position:absolute;bottom:-20px;left:20%;width:130px;height:80px;border-radius:50%;
          background:radial-gradient(circle,rgba(245,158,11,.12) 0%,transparent 65%);pointer-events:none}
        .lpt-hd-inner{position:relative;z-index:1;display:flex;align-items:flex-start;
          justify-content:space-between;gap:14px;flex-wrap:wrap}
        .lpt-eyebrow{font-size:10px;font-weight:700;letter-spacing:2.5px;
          color:rgba(255,255,255,.35);text-transform:uppercase;margin:0 0 5px}
        .lpt-title{font-size:20px;font-weight:800;color:#fff;margin:0 0 3px;letter-spacing:-.4px}
        .lpt-sub{font-size:11px;color:rgba(255,255,255,.38);margin:0}
        .lpt-pills{display:flex;gap:9px;flex-wrap:wrap;align-items:flex-start}
        .lpt-pill{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);
          border-radius:13px;padding:9px 16px;min-width:76px;backdrop-filter:blur(6px)}
        .lpt-pv{display:block;font-size:19px;font-weight:800;color:#fff;line-height:1}
        .lpt-pl{display:block;font-size:9px;font-weight:700;color:rgba(255,255,255,.35);
          text-transform:uppercase;letter-spacing:.8px;margin-top:3px}
        .lpt-segbar{display:flex;height:5px;margin-top:18px;overflow:hidden;border-radius:0}
        .lpt-seg{height:100%;transition:flex 1s cubic-bezier(.34,1.1,.64,1),opacity .2s}
        /* body 2-col */
        .lpt-body{display:grid;grid-template-columns:1fr 180px}
        @media(max-width:580px){.lpt-body{grid-template-columns:1fr}.lpt-donut-col{display:none}}
        .lpt-table{padding:18px 22px 10px}
        .lpt-chdr-row{display:grid;grid-template-columns:1fr 110px 56px;
          gap:10px;padding:0 6px 8px;border-bottom:1px solid #e2e8f0;margin-bottom:2px}
        .lpt-chdr{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px}
        .lpt-chdr.r{text-align:right}
        .lpt-row{display:grid;grid-template-columns:1fr 110px 56px;
          gap:10px;align-items:center;padding:7px 6px;border-radius:10px;
          cursor:pointer;transition:background .12s}
        .lpt-row:hover{background:#f8fafc}
        .lpt-src{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:#1e293b;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .lpt-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
        .lpt-track{background:#f1f5f9;border-radius:999px;height:8px;overflow:hidden}
        .lpt-fill{height:100%;border-radius:999px;transition:width .85s cubic-bezier(.34,1.4,.64,1)}
        .lpt-badge{display:inline-flex;align-items:center;justify-content:center;
          padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;margin-left:auto}
        /* donut col */
        .lpt-donut-col{display:flex;flex-direction:column;align-items:center;
          justify-content:center;padding:18px 14px;border-left:1px solid #f1f5f9;gap:10px}
        .lpt-donut-wrap{position:relative;width:170px;height:170px;flex-shrink:0}
        .lpt-donut-ctr{position:absolute;inset:0;display:flex;flex-direction:column;
          align-items:center;justify-content:center;text-align:center;pointer-events:none;transform:rotate(90deg)}
        .lpt-dtotal{font-size:24px;font-weight:800;color:#0f172a;line-height:1}
        .lpt-dlbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-top:3px}
        .lpt-dinfo{text-align:center;min-height:34px;display:flex;flex-direction:column;align-items:center;gap:2px}
        .lpt-dinfo-pct{font-size:17px;font-weight:800;line-height:1}
        .lpt-dinfo-name{font-size:10px;font-weight:600;color:#94a3b8}
        .lpt-dinfo-hint{font-size:10px;color:#cbd5e1}
        /* footer */
        .lpt-ft{padding:12px 22px 16px;border-top:1px solid #f1f5f9;
          display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
        .lpt-legend{display:flex;flex-wrap:wrap;gap:7px 14px}
        .lpt-li{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;
          color:#64748b;cursor:default;transition:opacity .15s}
        .lpt-li-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0}
        .lpt-total-chip{background:#0f172a;color:#fff;border-radius:999px;
          padding:5px 16px;font-size:12px;font-weight:700;white-space:nowrap}
      `}</style>
      <div className="lpt-wrap">
        <div className="lpt-hd">
          <div className="lpt-hd-orb1"/><div className="lpt-hd-orb2"/>
          <div className="lpt-hd-inner">
            <div>
              <p className="lpt-eyebrow">Provider Analysis</p>
              <p className="lpt-title">Leads By Provider Type</p>
              <p className="lpt-sub">Click any row to view filtered leads</p>
            </div>
            <div className="lpt-pills">
              <div className="lpt-pill">
                <span className="lpt-pv">{total.toLocaleString()}</span>
                <span className="lpt-pl">Total</span>
              </div>
              <div className="lpt-pill">
                <span className="lpt-pv">{sorted.length}</span>
                <span className="lpt-pl">Types</span>
              </div>
              {sorted[0] && (
                <div className="lpt-pill" style={{borderColor:'rgba(99,102,241,.3)',background:'rgba(99,102,241,.1)'}}>
                  <span className="lpt-pv" style={{fontSize: sorted[0].type?.length > 9 ? '11px':'17px', paddingTop:2}}>{sorted[0].type}</span>
                  <span className="lpt-pl">Top Type</span>
                </div>
              )}
            </div>
          </div>
          <div className="lpt-segbar">
            {sorted.map((item, i) => (
              <div key={item.type} className="lpt-seg" style={{
                flex: animated ? item.count : 0,
                background: PALETTE[i % PALETTE.length].bar,
                opacity: hovered === null || hovered === i ? 1 : 0.25,
              }}/>
            ))}
          </div>
        </div>

        <div className="lpt-body">
          <div className="lpt-table">
            <div className="lpt-chdr-row">
              <div className="lpt-chdr">Type</div>
              <div className="lpt-chdr">Share</div>
              <div className="lpt-chdr r">Count</div>
            </div>
            {sorted.map((item, i) => {
              const c   = PALETTE[i % PALETTE.length]
              const w   = animated ? (item.count / maxCount) * 100 : 0
              const pct = total ? ((item.count / total) * 100).toFixed(1) : '0.0'
              return (
                <div key={item.type} className="lpt-row"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleClick(item)}
                >
                  <div className="lpt-src">
                    <span className="lpt-dot" style={{background: c.bar, boxShadow: hovered===i ? `0 0 7px ${c.glow}` : 'none'}}/>
                    {item.type}
                  </div>
                  <div className="lpt-track">
                    <div className="lpt-fill" style={{width:`${w}%`, background:`linear-gradient(90deg,${c.bar}88,${c.bar})`, boxShadow: hovered===i ? `0 0 8px ${c.glow}` : 'none'}}/>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <span className="lpt-badge" style={{background: c.light, color: c.text}}>{item.count}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Donut */}
          <div className="lpt-donut-col">
            <div className="lpt-donut-wrap">
              <Donut slices={donutSlices} size={170} thick={28} animated={animated}/>
              <div className="lpt-donut-ctr">
                {hovered !== null ? (
                  <>
                    <div className="lpt-dtotal" style={{color: PALETTE[hovered % PALETTE.length].bar, fontSize:'20px'}}>
                      {sorted[hovered]?.count.toLocaleString()}
                    </div>
                    <div className="lpt-dlbl">leads</div>
                  </>
                ) : (
                  <>
                    <div className="lpt-dtotal">{total.toLocaleString()}</div>
                    <div className="lpt-dlbl">Total</div>
                  </>
                )}
              </div>
            </div>
            <div className="lpt-dinfo">
              {hovered !== null ? (
                <>
                  <span className="lpt-dinfo-pct" style={{color: PALETTE[hovered % PALETTE.length].bar}}>
                    {total ? ((sorted[hovered]?.count / total) * 100).toFixed(1) : 0}%
                  </span>
                  <span className="lpt-dinfo-name">{sorted[hovered]?.type}</span>
                </>
              ) : (
                <span className="lpt-dinfo-hint">Hover a row</span>
              )}
            </div>
          </div>
        </div>

        <div className="lpt-ft">
          <div className="lpt-legend">
            {sorted.slice(0, 6).map((item, i) => (
              <div key={item.type} className="lpt-li"
                style={{opacity: hovered===null || hovered===i ? 1 : 0.35}}
                onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
              >
                <span className="lpt-li-dot" style={{background: PALETTE[i % PALETTE.length].bar}}/>
                {item.type}
              </div>
            ))}
          </div>
          <div className="lpt-total-chip">{total.toLocaleString()} leads</div>
        </div>
      </div>
    </>
  )
}

export default LeadsByProviderType
