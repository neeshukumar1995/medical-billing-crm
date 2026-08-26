'use client'
import React, { useContext } from 'react'
import { StickyNotesContext } from '@/contentApi/stickyNotesProvider'
import StickyNoteCard from './StickyNoteCard'
import '@/styles/stickyNotes.css'

const StickyNotesContainer = () => {
    const { notes } = useContext(StickyNotesContext)
    const openNotes = notes.filter(n => n.is_open)
    if (openNotes.length === 0) return null

    return (
        <div className="sticky-notes-layer">
            {openNotes.map(note => <StickyNoteCard key={note.id} note={note} />)}
        </div>
    )
}

export default StickyNotesContainer