'use client'
import React, { useContext, useRef, useState, useEffect } from 'react'
 
import { StickyNotesContext } from '@/contentApi/stickyNotesProvider'
import { FiTrash2, FiMinus, FiClock } from 'react-icons/fi'
const StickyNoteCard = ({ note }) => {
    const { updateNote, deleteNote, minimizeNote, bringToFront, colors } = useContext(StickyNotesContext)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const contentRef = useRef(null)
    const saveTimeout = useRef(null)
    const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 })
    const [pos, setPos] = useState({ x: note.position_x || 120, y: note.position_y || 90 })
    const posRef = useRef(pos) // ← naya: latest pos hamesha yahan track hoga
    const [showReminderModal, setShowReminderModal] = useState(false)
    const [reminderDate, setReminderDate] = useState('')
    const [reminderTime, setReminderTime] = useState('')


    const openReminderModal = () => {
        const d = note.reminder_at ? new Date(note.reminder_at) : new Date()
        if (!note.reminder_at) d.setMinutes(d.getMinutes() + 30) // default: 30 min baad
        const pad = (n) => String(n).padStart(2, '0')
        setReminderDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
        setReminderTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
        setShowReminderModal(true)
    }

    const saveReminder = () => {
        if (!reminderDate || !reminderTime) return
        const iso = new Date(`${reminderDate}T${reminderTime}:00`).toISOString()
        updateNote(note.id, { reminder_at: iso })
        setShowReminderModal(false)
    }
    useEffect(() => {
        if (contentRef.current) contentRef.current.innerHTML = note.content || ''
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleMouseDown = (e) => {
        bringToFront(note.id)
        dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
    }

    const handleMouseMove = (e) => {
        if (!dragRef.current.dragging) return
        const dx = e.clientX - dragRef.current.startX
        const dy = e.clientY - dragRef.current.startY
        const newPos = { x: dragRef.current.origX + dx, y: dragRef.current.origY + dy }
        posRef.current = newPos
        setPos(newPos)
    }

    const handleMouseUp = () => {
        dragRef.current.dragging = false
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        updateNote(note.id, { position_x: posRef.current.x, position_y: posRef.current.y })
    }

    const handleContentInput = () => {
        const html = contentRef.current.innerHTML
        clearTimeout(saveTimeout.current)
        saveTimeout.current = setTimeout(() => updateNote(note.id, { content: html }), 700)
    }

    const exec = (cmd) => {
        contentRef.current.focus()
        document.execCommand(cmd, false, null)
        handleContentInput()
    }

    return (
         <>
        <div className="sticky-note-card" style={{ left: pos.x, top: pos.y, zIndex: note.z || 10, background: note.color || '#fff59d' }}>
            <div className="sticky-note-header" onMouseDown={handleMouseDown}>
                <div className="sticky-note-color-wrap">
                    <button type="button" className="sticky-note-color-dot" style={{ background: note.color || '#fff59d' }}
                        onClick={(e) => { e.stopPropagation(); setShowColorPicker(v => !v) }} />
                    {showColorPicker && (
                        <div className="sticky-note-color-picker" onMouseDown={(e) => e.stopPropagation()}>
                            {colors.map(c => (
                                <button key={c} type="button" className="sticky-note-color-swatch" style={{ background: c }}
                                    onClick={() => { updateNote(note.id, { color: c }); setShowColorPicker(false) }} />
                            ))}
                        </div>
                    )}
                </div>
                <div className="sticky-note-header-actions">
                    <FiClock size={14} title="Add Reminder" style={{ color: note.reminder_at ? '#d84315' : undefined }}
                        onMouseDown={(e) => e.stopPropagation()} onClick={openReminderModal} />
                    <FiTrash2 size={14} title="Delete" onMouseDown={(e) => e.stopPropagation()} onClick={() => deleteNote(note.id)} />
                    <FiMinus size={14} title="Minimize" onMouseDown={(e) => e.stopPropagation()} onClick={() => minimizeNote(note.id)} />
                </div>
            </div>

            <div className="sticky-note-toolbar">
                <button type="button" onClick={() => exec('bold')}><b>B</b></button>
                <button type="button" onClick={() => exec('italic')}><i>I</i></button>
                <button type="button" onClick={() => exec('underline')}><u>U</u></button>
                <button type="button" onClick={() => exec('strikeThrough')}><s>S</s></button>
                <button type="button" onClick={() => exec('insertUnorderedList')}>•—</button>
                <button type="button" onClick={() => exec('insertOrderedList')}>1.—</button>
            </div>

            <div ref={contentRef} className="sticky-note-body" contentEditable suppressContentEditableWarning
                onInput={handleContentInput} data-placeholder="Add here ..." />
        </div>
       {showReminderModal && (
        <div className="sticky-reminder-overlay" onMouseDown={() => setShowReminderModal(false)}>
            <div className="sticky-reminder-modal" onMouseDown={(e) => e.stopPropagation()}>
                <h6 className="sticky-reminder-title">Add Reminder</h6>
                <div className="sticky-reminder-fields">
                    <input
                        type="date"
                        className="form-control"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                    />
                    <input
                        type="time"
                        className="form-control"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                    />
                </div>
                <div className="sticky-reminder-actions">
                    <button type="button" className="btn btn-light btn-sm" onClick={() => setShowReminderModal(false)}>Cancel</button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={saveReminder}>Save</button>
                </div>
            </div>
        </div>
    )} 
    </>
    )
}

export default StickyNoteCard