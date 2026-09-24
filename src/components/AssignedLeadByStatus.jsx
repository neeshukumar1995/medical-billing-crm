'use client'
// ─── AssignedLeadByStatus.jsx ─────────────────────────────────────────────────
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const STATUS_COLORS = [
  { bar: '#10b981', light: '#ecfdf5', text: '#065f46', glow: 'rgba(16,185,129,0.35)' },
  { bar: '#f59e0b', light: '#fffbeb', text: '#b45309', glow: 'rgba(245,158,11,0.35)'  },
  { bar: '#6366f1', light: '#eef2ff', text: '#4338ca', glow: 'rgba(99,102,241,0.35)'  },
  { bar: '#ef4444', light: '#fef2f2', text: '#b91c1c', glow: 'rgba(239,68,68,0.35)'   },
  { bar: '#8b5cf6', light: '#f5f3ff', text: '#6d28d9', glow: 'rgba(139,92,246,0.35)'  },
  { bar: '#06b6d4', light: '#ecfeff', text: '#0e7490', glow: 'rgba(6,182,212,0.35)'   },
  { bar: '#f97316', light: '#fff7ed', text: '#c2410c', glow: 'rgba(249,115,22,0.35)'  },
  { bar: '#64748b', light: '#f8fafc', text: '#334155', glow: 'rgba(100,116,139,0.35)' },
]

const AssignedLeadByStatus = ({
  statusDistribution = [],
  selectedYear,
  selectedMonth,
  leadStatusesMapping = [],
  router,
}) => {
  const [animated, setAnimated] = useState(false)
  const [hovered, setHovered]   = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120)
    return () => clearTimeout(t)
  }, [statusDistribution])

  const sorted   = [...statusDistribution].sort((a, b) => b.count - a.count)
  const maxCount = sorted[0]?.count || 1
  const total    = sorted.reduce((s, i) => s + i.count, 0)

  const handleClick = (item) => {
    if (!router) return
    const params = new URLSearchParams()
    if (selectedYear)  params.append('year',  selectedYear)
    if (selectedMonth) params.append('month', selectedMonth)
    if (item.status === 'Converted') {
      router.push(`/leads/converted-leads?${params.toString()}`)
    } else if (item.status === 'Follow Up') {
      router.push(`/leads/User-Follow-Ups?${params.toString()}`)
    } else {
      const mapping = leadStatusesMapping.find(m => m.name === item.status)
      if (mapping) {
        params.append('lead_status_id', mapping.id)
        router.push(`/leads/list?${params.toString()}`)
      } else if (item.status === 'Unknown') {
        params.append('lead_status_id', 'NULL')
        router.push(`/leads/list?${params.toString()}`)
      }
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .als-wrap *{box-sizing:border-box}
        .als-wrap{font-family:'Plus Jakarta Sans',sans-serif;background:#fff;border-radius:22px;
          box-shadow:0 2px 28px rgba(15,23,42,.08),0 1px 3px rgba(15,23,42,.04);overflow:hidden}
        .als-hd{background:linear-gradient(118deg,#0f172a 0%,#1e293b 55%,#1a3a4a 100%);
          padding:22px 26px 0;position:relative;overflow:hidden}
        .als-hd-orb1{position:absolute;top:-50px;right:-30px;width:190px;height:190px;border-radius:50%;
          background:radial-gradient(circle,rgba(16,185,129,.2) 0%,transparent 65%);pointer-events:none}
        .als-hd-orb2{position:absolute;bottom:-20px;left:25%;width:130px;height:80px;border-radius:50%;
          background:radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 65%);pointer-events:none}
        .als-hd-inner{position:relative;z-index:1;display:flex;align-items:flex-start;
          justify-content:space-between;gap:14px;flex-wrap:wrap}
        .als-eyebrow{font-size:10px;font-weight:700;letter-spacing:2.5px;
          color:rgba(255,255,255,.35);text-transform:uppercase;margin:0 0 5px}
        .als-title{font-size:20px;font-weight:800;color:#fff;margin:0 0 3px;letter-spacing:-.4px}
        .als-sub{font-size:11px;color:rgba(255,255,255,.38);margin:0}
        .als-pills{display:flex;gap:9px;flex-wrap:wrap;align-items:flex-start}
        .als-pill{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);
          border-radius:13px;padding:9px 16px;min-width:76px;backdrop-filter:blur(6px)}
        .als-pv{display:block;font-size:19px;font-weight:800;color:#fff;line-height:1}
        .als-pl{display:block;font-size:9px;font-weight:700;color:rgba(255,255,255,.35);
          text-transform:uppercase;letter-spacing:.8px;margin-top:3px}
        /* seg bar */
        .als-segbar{display:flex;height:5px;margin-top:18px;overflow:hidden;border-radius:0}
        .als-seg{height:100%;transition:flex 1s cubic-bezier(.34,1.1,.64,1),opacity .2s}
        /* body */
        .als-body{padding:18px 22px 10px}
        .als-col-hdr-row{display:grid;grid-template-columns:1fr 160px 64px;
          gap:10px;padding:0 6px 8px;border-bottom:1px solid #e2e8f0;margin-bottom:2px}
        .als-chdr{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px}
        .als-chdr.r{text-align:right}
        .als-row{display:grid;grid-template-columns:1fr 160px 64px;
          gap:10px;align-items:center;padding:8px 6px;border-radius:10px;
          cursor:pointer;transition:background .12s}
        .als-row:hover{background:#f8fafc}
        .als-src{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:#1e293b;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .als-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
        .als-track{background:#f1f5f9;border-radius:999px;height:8px;overflow:hidden}
        .als-fill{height:100%;border-radius:999px;transition:width .85s cubic-bezier(.34,1.4,.64,1)}
        .als-badge{display:inline-flex;align-items:center;justify-content:center;
          padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;
          white-space:nowrap;margin-left:auto}
        .als-ft{padding:12px 22px 16px;border-top:1px solid #f1f5f9;
          display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
        .als-legend{display:flex;flex-wrap:wrap;gap:7px 14px}
        .als-li{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;
          color:#64748b;cursor:default;transition:opacity .15s}
        .als-li-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0}
        .als-total-chip{background:#0f172a;color:#fff;border-radius:999px;
          padding:5px 16px;font-size:12px;font-weight:700;white-space:nowrap}
      `}</style>
      <div className="als-wrap">
        <div className="als-hd">
          <div className="als-hd-orb1"/><div className="als-hd-orb2"/>
          <div className="als-hd-inner">
            <div>
              <p className="als-eyebrow">Status Breakdown</p>
              <p className="als-title">Assigned Lead By Status</p>
              <p className="als-sub">Click any row to view filtered leads</p>
            </div>
            <div className="als-pills">
              <div className="als-pill">
                <span className="als-pv">{total.toLocaleString()}</span>
                <span className="als-pl">Total</span>
              </div>
              <div className="als-pill">
                <span className="als-pv">{sorted.length}</span>
                <span className="als-pl">Statuses</span>
              </div>
              {sorted[0] && (
                <div className="als-pill" style={{borderColor:'rgba(16,185,129,.3)',background:'rgba(16,185,129,.1)'}}>
                  <span className="als-pv" style={{fontSize: sorted[0].status.length > 9 ? '12px':'18px', paddingTop:2}}>{sorted[0].status}</span>
                  <span className="als-pl">Top Status</span>
                </div>
              )}
            </div>
          </div>
          <div className="als-segbar">
            {sorted.map((item, i) => (
              <div key={item.status} className="als-seg" style={{
                flex: animated ? item.count : 0,
                background: STATUS_COLORS[i % STATUS_COLORS.length].bar,
                opacity: hovered === null || hovered === i ? 1 : 0.25,
              }}/>
            ))}
          </div>
        </div>
        <div className="als-body">
          <div className="als-col-hdr-row">
            <div className="als-chdr">Status</div>
            <div className="als-chdr">Distribution</div>
            <div className="als-chdr r">Count</div>
          </div>
          {sorted.map((item, i) => {
            const c = STATUS_COLORS[i % STATUS_COLORS.length]
            const w = animated ? (item.count / maxCount) * 100 : 0
            return (
              <div key={item.status} className="als-row"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleClick(item)}
              >
                <div className="als-src">
                  <span className="als-dot" style={{background: c.bar, boxShadow: hovered===i ? `0 0 7px ${c.glow}` : 'none'}}/>
                  {item.status}
                </div>
                <div className="als-track">
                  <div className="als-fill" style={{width:`${w}%`, background:`linear-gradient(90deg,${c.bar}88,${c.bar})`, boxShadow: hovered===i ? `0 0 8px ${c.glow}` : 'none'}}/>
                </div>
                <div style={{textAlign:'right'}}>
                  <span className="als-badge" style={{background: c.light, color: c.text}}>{item.count}</span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="als-ft">
          <div className="als-legend">
            {sorted.slice(0, 6).map((item, i) => (
              <div key={item.status} className="als-li"
                style={{opacity: hovered===null || hovered===i ? 1 : 0.35}}
                onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
              >
                <span className="als-li-dot" style={{background: STATUS_COLORS[i % STATUS_COLORS.length].bar}}/>
                {item.status}
              </div>
            ))}
          </div>
          <div className="als-total-chip">{total.toLocaleString()} leads</div>
        </div>
      </div>
    </>
  )
}

export default AssignedLeadByStatus
