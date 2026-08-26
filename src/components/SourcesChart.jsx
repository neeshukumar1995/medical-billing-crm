'use client'

import React, { useEffect, useState } from 'react'
import crmInstance from '@/utils/crmInstance'

const SourcesChart = ({ year, month }) => {
  const [data, setData] = useState(null)
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const companyId = JSON.parse(localStorage.getItem('companyId'))
        const params = { year }
        if (month) params.month = month
        const res = await crmInstance.get(`/leads/sources/${companyId}`, { params })
        setData(res.data)
        setTimeout(() => setAnimated(true), 100)
      } catch (error) {
        console.error('Error fetching sources chart data:', error)
      }
    }
    setAnimated(false)
    fetchData()
  }, [year, month])

  if (!data) return null

  // Build rows: zip categories + leads + percentage + cumulative
  const rows = data.categories.map((cat, i) => ({
    source:     cat,
    leads:      data.series.leads[i] || 0,
    percentage: parseFloat((data.series.percentage[i] || '0').toString().replace('%', '')),
    cumulative: parseFloat((data.series.cumulative[i] || '0').toString().replace('%', '')),
  }))

  // Sort descending by leads
  const sorted = [...rows].sort((a, b) => b.leads - a.leads)
  const maxLeads = sorted[0]?.leads || 1

  // Color palette per bar
  const palette = [
    { bar: '#6366f1', light: '#eef2ff', text: '#4338ca' },
    { bar: '#f59e0b', light: '#fffbeb', text: '#b45309' },
    { bar: '#10b981', light: '#ecfdf5', text: '#065f46' },
    { bar: '#ef4444', light: '#fef2f2', text: '#b91c1c' },
    { bar: '#8b5cf6', light: '#f5f3ff', text: '#6d28d9' },
    { bar: '#06b6d4', light: '#ecfeff', text: '#0e7490' },
    { bar: '#f97316', light: '#fff7ed', text: '#c2410c' },
    { bar: '#ec4899', light: '#fdf2f8', text: '#be185d' },
    { bar: '#14b8a6', light: '#f0fdfa', text: '#0f766e' },
    { bar: '#a855f7', light: '#faf5ff', text: '#7e22ce' },
  ]

  const totalLeads = rows.reduce((s, r) => s + r.leads, 0)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

        .sc-wrap {
          background: #ffffff;
          border-radius: 5px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
          overflow: hidden;
        }

        .sc-header {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%);
          padding: 28px 32px 24px;
          position: relative;
          overflow: hidden;
        }
        .sc-header::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 180px; height: 180px;
          border-radius: 50%;
          background: rgba(99,102,241,0.15);
        }
        .sc-header::after {
          content: '';
          position: absolute;
          bottom: -30px; left: 20%;
          width: 120px; height: 120px;
          border-radius: 50%;
          background: rgba(245,158,11,0.1);
        }

        .sc-title {
          
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 4px;
          letter-spacing: -0.5px;
        }
        .sc-subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          margin: 0;
        }

        .sc-stats-row {
          display: flex;
          gap: 24px;
          margin-top: 20px;
          position: relative;
          z-index: 1;
        }
        .sc-stat {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 12px 20px;
          min-width: 110px;
        }
        .sc-stat-val {
        
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }
        .sc-stat-lbl {
          font-size: 11px;
          color: rgba(255,255,255,0.45);
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .sc-body {
          padding: 28px 32px 24px;
        }

        /* ── Bar rows ── */
        .sc-row {
          display: grid;
          grid-template-columns: 160px 1fr 80px 80px;
          align-items: center;
          gap: 16px;
          padding: 10px 0;
          border-bottom: 1px solid #f1f5f9;
          cursor: default;
          transition: background 0.15s;
          border-radius: 8px;
          padding-left: 8px;
          padding-right: 8px;
        }
        .sc-row:last-child { border-bottom: none; }
        .sc-row:hover { background: #f8fafc; }

        .sc-row-hovered { background: #f8fafc; }

        .sc-source-name {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sc-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .sc-bar-track {
          background: #f1f5f9;
          border-radius: 999px;
          height: 10px;
          overflow: hidden;
        }
        .sc-bar-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .sc-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .sc-leads-val {
          
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          text-align: right;
        }

        /* ── Column headers ── */
        .sc-col-headers {
          display: grid;
          grid-template-columns: 160px 1fr 80px 80px;
          gap: 16px;
          padding: 0 8px 10px;
          border-bottom: 2px solid #e2e8f0;
          margin-bottom: 4px;
        }
        .sc-col-hdr {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }
        .sc-col-hdr.right { text-align: right; }

        /* ── Donut mini ── */
        .sc-footer {
          padding: 20px 32px 28px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .sc-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 20px;
        }
        .sc-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #475569;
          font-weight: 500;
        }
        .sc-legend-dot {
          width: 10px; height: 10px;
          border-radius: 3px;
          flex-shrink: 0;
        }
        .sc-volume-chip {
          background: #0f172a;
          color: #fff;
          border-radius: 999px;
          padding: 6px 18px;
          font-size: 13px;
          font-weight: 600;
         
          white-space: nowrap;
        }

        @media (max-width: 600px) {
          .sc-row { grid-template-columns: 120px 1fr 60px; }
          .sc-col-headers { grid-template-columns: 120px 1fr 60px; }
          .sc-row > .sc-leads-val { display: none; }
          .sc-col-headers > .sc-col-hdr:last-child { display: none; }
          .sc-stats-row { flex-wrap: wrap; gap: 12px; }
          .sc-body { padding: 20px 16px 16px; }
          .sc-header { padding: 20px 16px 18px; }
          .sc-footer { padding: 16px; }
        }
      `}</style>

      <div className="sc-wrap">

        {/* ── Header ── */}
        <div className="sc-header">
          <p className="sc-title">Lead Sources</p>
          <p className="sc-subtitle">
            {month
              ? `${['January','February','March','April','May','June','July','August','September','October','November','December'][month - 1]} ${year}`
              : `Full Year ${year}`
            }
          </p>

          <div className="sc-stats-row">
            <div className="sc-stat">
              <div className="sc-stat-val">{totalLeads.toLocaleString()}</div>
              <div className="sc-stat-lbl">Total Leads</div>
            </div>
            <div className="sc-stat">
              <div className="sc-stat-val">{sorted.length}</div>
              <div className="sc-stat-lbl">Sources</div>
            </div>
            {sorted[0] && (
              <div className="sc-stat">
                <div className="sc-stat-val" style={{ fontSize: '16px', paddingTop: '4px' }}>{sorted[0].source}</div>
                <div className="sc-stat-lbl">Top Source</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="sc-body">

          {/* Column headers */}
          <div className="sc-col-headers">
            <div className="sc-col-hdr">Source</div>
            <div className="sc-col-hdr">Distribution</div>
            <div className="sc-col-hdr right">Share</div>
            <div className="sc-col-hdr right">Leads</div>
          </div>

          {/* Rows */}
          {sorted.map((row, i) => {
            const color = palette[i % palette.length]
            const barWidth = animated ? (row.leads / maxLeads) * 100 : 0
            return (
              <div
                key={row.source}
                className={`sc-row${hoveredIndex === i ? ' sc-row-hovered' : ''}`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Source name */}
                <div className="sc-source-name">
                  <span className="sc-dot" style={{ background: color.bar }}></span>
                  {row.source}
                </div>

                {/* Bar track */}
                <div className="sc-bar-track">
                  <div
                    className="sc-bar-fill"
                    style={{
                      width: `${barWidth}%`,
                      background: `linear-gradient(90deg, ${color.bar}cc, ${color.bar})`,
                    }}
                  />
                </div>

                {/* Percentage badge */}
                <div style={{ textAlign: 'right' }}>
                  <span
                    className="sc-badge"
                    style={{ background: color.light, color: color.text }}
                  >
                    {row.percentage.toFixed(1)}%
                  </span>
                </div>

                {/* Leads count */}
                <div className="sc-leads-val">{row.leads.toLocaleString()}</div>
              </div>
            )
          })}
        </div>

        {/* ── Footer ── */}
        <div className="sc-footer">
          <div className="sc-legend">
            {sorted.slice(0, 6).map((row, i) => {
              const color = palette[i % palette.length]
              return (
                <div className="sc-legend-item" key={row.source}>
                  <span className="sc-legend-dot" style={{ background: color.bar }}></span>
                  {row.source}
                </div>
              )
            })}
            {sorted.length > 6 && (
              <div className="sc-legend-item" style={{ color: '#94a3b8' }}>
                +{sorted.length - 6} more
              </div>
            )}
          </div>
          <div className="sc-volume-chip">
            Volume: {data.volume}
          </div>
        </div>

      </div>
    </>
  )
}

export default SourcesChart
