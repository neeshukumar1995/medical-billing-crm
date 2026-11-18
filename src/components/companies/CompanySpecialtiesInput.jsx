'use client'
import React, { useState, useRef, useEffect } from 'react'
import { FiX, FiCheck, FiChevronDown, FiActivity } from 'react-icons/fi'

export const COMPANY_SPECIALTY_OPTIONS = ['DME', 'Urgent Care', 'Lab']

export const parseSpecialties = (value) => {
    if (!value) return []
    if (Array.isArray(value)) {
        return value.map(v => String(v).trim()).filter(Boolean)
    }
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed) return []
        try {
            const parsed = JSON.parse(trimmed)
            if (Array.isArray(parsed)) {
                return parsed.map(v => String(v).trim()).filter(Boolean)
            }
        } catch {
            // fallback to comma-separated
        }
        return trimmed.split(',').map(v => v.trim()).filter(Boolean)
    }
    return []
}

const SPECIALTY_BADGE_COLORS = {
    'dme': 'primary',
    'urgent care': 'warning',
    'lab': 'info',
}

export const CompanySpecialtiesBadges = ({ specialties, emptyText = '—' }) => {
    const list = parseSpecialties(specialties)
    if (list.length === 0) {
        return <span className="text-muted">{emptyText}</span>
    }

    return (
        <div className="d-inline-flex flex-wrap gap-1 align-items-center">
            {list.map((spec) => {
                const color = SPECIALTY_BADGE_COLORS[spec.toLowerCase()] || 'secondary'
                return (
                    <span
                        key={spec}
                        className={`badge bg-soft-${color} text-${color} px-2 py-1`}
                    >
                        {spec}
                    </span>
                )
            })}
        </div>
    )
}

export default function CompanySpecialtiesInput({
    value = [],
    onChange,
    disabled = false,
    placeholder = 'Select or type specialties (DME, Urgent Care, Lab)...',
}) {
    const selected = parseSpecialties(value)
    const [open, setOpen] = useState(false)
    const [inputText, setInputText] = useState('')
    const containerRef = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const emitChange = (nextList) => {
        if (onChange) {
            onChange(nextList)
        }
    }

    const toggleSpecialty = (spec) => {
        if (disabled) return
        const exists = selected.some(s => s.toLowerCase() === spec.toLowerCase())
        if (exists) {
            emitChange(selected.filter(s => s.toLowerCase() !== spec.toLowerCase()))
        } else {
            emitChange([...selected, spec])
        }
    }

    const removeSpecialty = (spec, e) => {
        e && e.stopPropagation()
        if (disabled) return
        emitChange(selected.filter(s => s !== spec))
    }

    const handleKeyDown = (e) => {
        if (disabled) return
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            const trimmed = inputText.trim().replace(/,$/, '')
            if (!trimmed) return
            const matchPreset = COMPANY_SPECIALTY_OPTIONS.find(
                o => o.toLowerCase() === trimmed.toLowerCase()
            )
            const finalVal = matchPreset || trimmed
            if (!selected.some(s => s.toLowerCase() === finalVal.toLowerCase())) {
                emitChange([...selected, finalVal])
            }
            setInputText('')
        } else if (e.key === 'Backspace' && !inputText && selected.length > 0) {
            emitChange(selected.slice(0, -1))
        }
    }

    return (
        <div ref={containerRef} className="position-relative">
            <div
                className={`form-control d-flex flex-wrap align-items-center gap-1 ps-5 pe-4 ${disabled ? 'bg-light' : ''}`}
                style={{ minHeight: '42px', cursor: disabled ? 'not-allowed' : 'text' }}
                onClick={() => {
                    if (!disabled) {
                        setOpen(true)
                        inputRef.current?.focus()
                    }
                }}
            >
                <FiActivity
                    className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                    size={16}
                />

                {selected.map((spec) => {
                    const color = SPECIALTY_BADGE_COLORS[spec.toLowerCase()] || 'secondary'
                    return (
                        <span
                            key={spec}
                            className={`badge bg-soft-${color} text-${color} d-inline-flex align-items-center gap-1 px-2 py-1`}
                        >
                            {spec}
                            {!disabled && (
                                <button
                                    type="button"
                                    className="btn p-0 border-0 bg-transparent text-reset d-inline-flex align-items-center"
                                    onClick={(e) => removeSpecialty(spec, e)}
                                    title={`Remove ${spec}`}
                                >
                                    <FiX size={12} />
                                </button>
                            )}
                        </span>
                    )
                })}

                <input
                    ref={inputRef}
                    type="text"
                    className="border-0 bg-transparent flex-grow-1 p-0"
                    style={{ outline: 'none', minWidth: '140px', fontSize: '0.875rem' }}
                    placeholder={selected.length === 0 ? placeholder : 'Add more...'}
                    value={inputText}
                    onChange={(e) => {
                        setInputText(e.target.value)
                        if (!open) setOpen(true)
                    }}
                    onFocus={() => !disabled && setOpen(true)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                />

                <FiChevronDown
                    className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                    size={16}
                    style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (!disabled) setOpen(prev => !prev)
                    }}
                />
            </div>

            {open && !disabled && (
                <div
                    className="dropdown-menu show w-100 p-2 shadow-sm mt-1"
                    style={{ zIndex: 1055 }}
                >
                    <div className="text-muted px-2 py-1" style={{ fontSize: '0.75rem' }}>
                        Select one or multiple specialties (or type &amp; press Enter):
                    </div>
                    {COMPANY_SPECIALTY_OPTIONS.map((option) => {
                        const isSelected = selected.some(
                            s => s.toLowerCase() === option.toLowerCase()
                        )
                        return (
                            <button
                                key={option}
                                type="button"
                                className={`dropdown-item d-flex align-items-center justify-content-between rounded py-2 px-2 ${isSelected ? 'bg-soft-primary text-primary fw-semibold' : ''}`}
                                onClick={() => toggleSpecialty(option)}
                            >
                                <span>{option}</span>
                                {isSelected && <FiCheck size={15} />}
                            </button>
                        )
                    })}
                    {inputText.trim() &&
                        !COMPANY_SPECIALTY_OPTIONS.some(
                            o => o.toLowerCase() === inputText.trim().toLowerCase()
                        ) && (
                            <button
                                type="button"
                                className="dropdown-item d-flex align-items-center justify-content-between rounded py-2 px-2 text-primary"
                                onClick={() => {
                                    const custom = inputText.trim()
                                    if (!selected.some(s => s.toLowerCase() === custom.toLowerCase())) {
                                        emitChange([...selected, custom])
                                    }
                                    setInputText('')
                                }}
                            >
                                <span>Add &ldquo;{inputText.trim()}&rdquo;</span>
                                <FiCheck size={15} />
                            </button>
                        )}
                </div>
            )}
        </div>
    )
}
