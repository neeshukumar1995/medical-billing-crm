'use client'
import React, { useState } from 'react'

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Preset key -> { from, to } as Y-m-d strings (empty = open-ended). */
const presetRange = (preset) => {
    const now = new Date()
    switch (preset) {
        case 'this_month':
            return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) }
        case 'last_month':
            return {
                from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
                to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)),
            }
        case 'this_year':
            return { from: ymd(new Date(now.getFullYear(), 0, 1)), to: ymd(now) }
        default:
            return { from: '', to: '' }
    }
}

export const periodLabel = ({ from, to }) => (from || to ? `${from || '…'} to ${to || '…'}` : 'All time')

/**
 * Period picker for overview numbers. Calls onChange({ from, to }) with
 * Y-m-d strings ('' = no limit); the backend counts records created in it.
 */
const PeriodFilter = ({ value, onChange }) => {
    const [preset, setPreset] = useState('all')

    const handlePreset = (e) => {
        const next = e.target.value
        setPreset(next)
        if (next !== 'custom') onChange(presetRange(next))
    }

    return (
        <div className="d-flex flex-wrap align-items-center gap-2">
            <select className="form-select form-select-sm" style={{ width: 150 }} value={preset} onChange={handlePreset} title="Period">
                <option value="all">All time</option>
                <option value="this_month">This month</option>
                <option value="last_month">Last month</option>
                <option value="this_year">This year</option>
                <option value="custom">Custom range</option>
            </select>
            {preset === 'custom' && (
                <>
                    <input type="date" className="form-control form-control-sm" style={{ width: 150 }}
                        value={value.from} max={value.to || undefined}
                        onChange={(e) => onChange({ ...value, from: e.target.value })} />
                    <span className="text-muted fs-12">to</span>
                    <input type="date" className="form-control form-control-sm" style={{ width: 150 }}
                        value={value.to} min={value.from || undefined}
                        onChange={(e) => onChange({ ...value, to: e.target.value })} />
                </>
            )}
        </div>
    )
}

export default PeriodFilter
