'use client'
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'

export const StickyNotesContext = createContext()

const COLORS = ['#fff59d', '#f8bbd0', '#c8e6c9', '#bbdefb', '#ffe0b2', '#d1c4e9']

export const StickyNotesProvider = ({ children }) => {
    const [notes, setNotes] = useState([])
    const zCounter = useRef(10)
    const notesRef = useRef(notes) // ← naya: hamesha latest notes yahan milega

    useEffect(() => {
        notesRef.current = notes
    }, [notes])

   const getCompanyId = () => {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem('companyId')
    if (!raw) return null

    let cid = raw
    try {
        cid = JSON.parse(raw)
    } catch (e) {
        // raw JSON nahi tha (plain string/number stored hoga) — use as-is
        cid = raw
    }

    // agar object/array nikla to invalid maano
    if (typeof cid === 'object' && cid !== null) {
        console.error('Invalid companyId in localStorage (object found, expected id):', cid)
        return null
    }

    return cid
}

  const fetchNotes = useCallback(async () => {
    try {
        if (typeof window === 'undefined') return

        const token = localStorage.getItem('access_token')
        const cid = getCompanyId()

        // User logged out hai, API call nahi karni
        if (!token || !cid) {
            setNotes([])
            return
        }

        const response = await crmInstance.get(`/sticky-notes/${cid}`)

        const data = response.data?.data || response.data || []

        setNotes(
            Array.isArray(data)
                ? data.map((n, i) => ({
                      ...n,
                      is_open: !!n.is_open,
                      z: 10 + i
                  }))
                : []
        )
    } catch (error) {
        if (error?.response?.status !== 404 && error?.response?.status !== 401) {
            console.error('Error fetching sticky notes:', error)
        }

        setNotes([])
    }
}, [])

useEffect(() => {
    if (typeof window === 'undefined') return

    const token = localStorage.getItem('access_token')

    if (!token) {
        setNotes([])
        return
    }

    fetchNotes()
}, [fetchNotes])

    const addNote = useCallback(async () => {
        try {
            const cid = getCompanyId()
            if (!cid) return

            const closedNote = notes
                .filter(n => !n.is_open)
                .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))[0]

            if (closedNote) {
                zCounter.current += 1
                setNotes(prev => prev.map(n => n.id === closedNote.id ? { ...n, is_open: true, z: zCounter.current } : n))
                try {
                    await crmInstance.put(`/sticky-notes/${closedNote.id}/${cid}`, { is_open: true })
                } catch (error) {
                    console.error('Error reopening sticky note:', error)
                }
                return
            }

            const openCount = notes.filter(n => n.is_open).length
            const payload = {
                content: '',
                color: COLORS[notes.length % COLORS.length],
                position_x: 120 + (openCount * 30),
                position_y: 90 + (openCount * 30)
            }
            const response = await crmInstance.post(`/sticky-notes/${cid}`, payload)
            const newNote = response.data?.data || response.data
            zCounter.current += 1
            setNotes(prev => [...prev, { ...newNote, is_open: true, z: zCounter.current }])
        } catch (error) {
            console.error('Error creating sticky note:', error)
        }
    }, [notes])

    const updateNote = useCallback(async (id, changes) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, ...changes } : n))
        try {
            const cid = getCompanyId()
            if (!cid) return
            await crmInstance.put(`/sticky-notes/${id}/${cid}`, changes)
        } catch (error) {
            console.error('Error updating sticky note:', error)
        }
    }, [])

    useEffect(() => {
    const checkReminders = () => {
          const now = new Date()
    console.log('NOW:', now)
    notesRef.current.forEach(n => {
        console.log('Note', n.id, 'reminder_at raw:', n.reminder_at, '→ parsed:', new Date(n.reminder_at))
    })
    const dueNotes = notesRef.current.filter(n => n.reminder_at && new Date(n.reminder_at) <= now)
    // console.log('Due notes found:', dueNotes)

    //     dueNotes.forEach(n => {
    //         console.log('🔔 Firing reminder for note:', n.id)
    //         const plain = (n.content || '').replace(/<[^>]*>/g, '').trim()
    //         updateNote(n.id, { reminder_at: null, is_open: true })
    //         Swal.fire({
    //             title: 'Sticky Note Reminder',
    //             text: plain || 'You have a note reminder.',
    //             icon: 'info',
    //             confirmButtonText: 'OK'
    //         })
    //     })
    }

    checkReminders()
    const interval = setInterval(checkReminders, 15000)

    return () => clearInterval(interval)
}, [updateNote])

    const deleteNote = useCallback(async (id) => {
        setNotes(prev => prev.filter(n => n.id !== id))
        try {
            const cid = getCompanyId()
            if (!cid) return
            await crmInstance.delete(`/sticky-notes/${id}/${cid}`)
        } catch (error) {
            console.error('Error deleting sticky note:', error)
        }
    }, [])

    const minimizeNote = useCallback((id) => updateNote(id, { is_open: false }), [updateNote])

    const bringToFront = useCallback((id) => {
        zCounter.current += 1
        setNotes(prev => prev.map(n => n.id === id ? { ...n, z: zCounter.current } : n))
    }, [])

    return (
        <StickyNotesContext.Provider value={{ notes, colors: COLORS, addNote, updateNote, deleteNote, minimizeNote, bringToFront }}>
            {children}
        </StickyNotesContext.Provider>
    )
}