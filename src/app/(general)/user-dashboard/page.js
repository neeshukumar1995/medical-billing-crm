'use client'

import Footer from '@/components/shared/Footer'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import useBootstrapUtils from '@/hooks/useBootstrapUtils'
import { encryptId, decryptId } from '@/utils/encryptId';
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import { useUser } from '@/context/UserContext'

import dynamic from 'next/dynamic'
import '@/styles/user-dashboard.css'

// ── View / Edit popups, loaded only when first opened ──
const LeadViewModal = dynamic(() => import('@/components/leads/LeadViewModal'), { ssr: false })
const LeadEditModal = dynamic(() => import('@/components/leads/LeadEditModal'), { ssr: false })

// ── RingCentral API helper ──────────────────────────────────────────────────
const rcMakeCall = async (userId, toNumber) => {
  const res = await crmInstance.post('/ringcentral/make-call', {
    user_id: userId,
    phone_number: toNumber
  })
  return res.data
}

const rcGetSession = async (userId, sessionId) => {
  const res = await crmInstance.get(`/ringcentral/session/${sessionId}`, { params: { user_id: userId } })
  return res.data
}

const rcEndCall = async (userId, sessionId) => {
  const res = await crmInstance.delete(`/ringcentral/session/${sessionId}`, { data: { user_id: userId } })
  return res.data
}
// ───────────────────────────────────────────────────────────────────────────


const CARDS_PER_COL = 50
const LIST_PAGE_SIZE = 100
const FETCH_PAGE_SIZE = 200
const STATUS_COLORS = [
  { accent: '#22c55e', bg: 'rgba(34,197,94,.1)', tc: '#15803d' },
  { accent: '#06b6d4', bg: 'rgba(6,182,212,.1)', tc: '#0e7490' },
  { accent: '#8b5cf6', bg: 'rgba(139,92,246,.1)', tc: '#6d28d9' },
  { accent: '#f59e0b', bg: 'rgba(245,158,11,.1)', tc: '#b45309' },
  { accent: '#ef4444', bg: 'rgba(239,68,68,.1)', tc: '#b91c1c' },
  { accent: '#10b981', bg: 'rgba(16,185,129,.1)', tc: '#065f46' },
  { accent: '#ec4899', bg: 'rgba(236,72,153,.1)', tc: '#9d174d' },
  { accent: '#3b82f6', bg: 'rgba(59,130,246,.1)', tc: '#1d4ed8' },
  { accent: '#a855f7', bg: 'rgba(168,85,247,.1)', tc: '#7e22ce' },
  { accent: '#14b8a6', bg: 'rgba(20,184,166,.1)', tc: '#0f766e' },
  { accent: '#f97316', bg: 'rgba(249,115,22,.1)', tc: '#c2410c' },
  { accent: '#6366f1', bg: 'rgba(99,102,241,.1)', tc: '#4338ca' },
  { accent: '#84cc16', bg: 'rgba(132,204,22,.1)', tc: '#4d7c0f' },
  { accent: '#0ea5e9', bg: 'rgba(14,165,233,.1)', tc: '#0369a1' },
  { accent: '#d946ef', bg: 'rgba(217,70,239,.1)', tc: '#a21caf' },
  { accent: '#eab308', bg: 'rgba(234,179,8,.1)', tc: '#a16207' }
]

// status name se consistent hash — hamesha same status ko same color milega
const hashStatusName = (name = '') => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}
const getS = (statusName, leadStatuses = []) => {
  if (!statusName) {
    return { accent: '#6366f1', bg: 'rgba(99,102,241,.1)', tc: '#4338ca' }
  }

  // 👇 NEW — "Non-Worked" status ko hamesha RED color fix
  const norm = statusName.toLowerCase().replace(/[-\s]/g, '')
  if (norm.includes('nonworked')) {
    return { accent: '#ef4444', bg: 'rgba(239,68,68,.1)', tc: '#b91c1c' }
  }

  // Pehle apiSt me index se try karo (agar available list hai) taki jitni bhi statuses hon,
  // unme se pehle N ko fixed distinct colors milein
  const index = leadStatuses.findIndex(
    item => item.label === statusName || item.name === statusName
  )

  if (index >= 0 && index < STATUS_COLORS.length) {
    return STATUS_COLORS[index]
  }

  // Agar index na mile ya list se bade ho, to naam ke hash se consistent color do
  const hashIndex = hashStatusName(statusName) % STATUS_COLORS.length
  return STATUS_COLORS[hashIndex]
}
const TYPE_COLORS = [
  { bg: 'rgba(99,102,241,.08)', tc: '#4338ca' },
  { bg: 'rgba(139,92,246,.08)', tc: '#6d28d9' },
  { bg: 'rgba(34,197,94,.08)', tc: '#15803d' },
  { bg: 'rgba(245,158,11,.08)', tc: '#b45309' },
  { bg: 'rgba(236,72,153,.08)', tc: '#9d174d' },
  { bg: 'rgba(20,184,166,.08)', tc: '#0f766e' },
  { bg: 'rgba(239,68,68,.08)', tc: '#b91c1c' },
  { bg: 'rgba(168,85,247,.08)', tc: '#7e22ce' }
]


const getTypeColor = (typeName) => {
  if (!typeName) return { bg: 'rgba(148,163,184,.08)', tc: '#475569' };
  // simple hash for consistent color per type name
  let hash = 0;
  for (let i = 0; i < typeName.length; i++) {
    hash = ((hash << 5) - hash) + typeName.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % TYPE_COLORS.length;
  return TYPE_COLORS[index];
};



const ini = (n = '') => n.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase()
const fmt = () => new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const isFU = (l = '') => l.toLowerCase().includes('follow up') || l.toLowerCase().includes('follow-up')
const isInProgress = (l = '') => l.toLowerCase().includes('progress')
const getName = (l) => l.client_name || l.name || l.company || '—'
const getStatusName = (lead) => lead?.lead_status?.name || 'Unknown'

const getNextFollowupDate = (lead) => {
  if (lead._history && lead._history.length > 0 && lead._history[0].followupDate) {
    return lead._history[0].followupDate
  }
  return lead.followup_date || lead.follow_up_date || lead.next_followup_date || null
}

const fmtFuDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt)) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}


const getLeadAge = (lead) => {
  if (!lead.created_at) return '—'
  const days = Math.floor((Date.now() - new Date(lead.created_at)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

const getAssignedDate = (lead) => {

  const d = lead.assigned_at || lead.updated_at || lead.created_at
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const getFolllwDate = (lead) => {
  const d = lead.followup_date;
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const getLastUpdatedDate = (lead) => {
  const d = lead.updated_at;
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const getSource = (lead) => {
  if (!lead.source) return '—'
  return typeof lead.source === 'object' ? lead.source?.name || '—' : lead.source
}

/* ─────────────────────────────────────────────────────────────────────────
   DIALPAD POPUP — Real RingCentral makeCall integration
───────────────────────────────────────────────────────────────────────── */
const DialpadPopup = React.memo(({ number, label, userId, onClose, onCallError }) => {
  const [pos, setPos] = useState({ x: Math.max(20, window.innerWidth / 2 - 160), y: Math.max(20, window.innerHeight / 2 - 260) })
  const [input, setInput] = useState(number || '')
  // callState: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'failed'
  const [callState, setCallState] = useState('idle')
  const [callTime, setCallTime] = useState(0)
  const [muted, setMuted] = useState(false)
  const [onHold, setOnHold] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [callError, setCallError] = useState('')

  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const timerRef = useRef(null)
  const pollRef = useRef(null)
  const sessionRef = useRef(null) // keep sessionId in ref for async access

  useEffect(() => { sessionRef.current = sessionId }, [sessionId])

  // Drag handlers
  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      const cx = e.touches ? e.touches[0].clientX : e.clientX
      const cy = e.touches ? e.touches[0].clientY : e.clientY
      const nx = cx - dragOffset.current.x
      const ny = cy - dragOffset.current.y
      setPos({ x: Math.max(0, Math.min(nx, window.innerWidth - 320)), y: Math.max(0, Math.min(ny, window.innerHeight - 100)) })
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
      clearInterval(timerRef.current)
      clearInterval(pollRef.current)
    }
  }, [])

  const onDragStart = (e) => {
    dragging.current = true
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    dragOffset.current = { x: cx - pos.x, y: cy - pos.y }
    if (e.preventDefault) e.preventDefault()
  }

  // Poll session status after call is initiated
  const startPolling = useCallback((sid) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await rcGetSession(userId, sid)
        if (res.success && res.data) {
          const parties = res.data.parties || []
          // Look for the callee party status
          const calleeParty = parties.find(p => p.direction === 'Outbound' || p.direction === 'Inbound')
          const status = calleeParty?.status?.code || res.data.status || ''

          if (status === 'Answered' || status === 'Connected') {
            setCallState('connected')
            setStatusMsg('Connected')
            clearInterval(pollRef.current)
            // Start call timer
            clearInterval(timerRef.current)
            timerRef.current = setInterval(() => setCallTime(t => t + 1), 1000)
          } else if (status === 'Ringing' || status === 'Setup') {
            setCallState('ringing')
            setStatusMsg('Ringing…')
          } else if (status === 'Disconnected' || status === 'Voicemail' || status === 'Missed') {
            setCallState('ended')
            setStatusMsg(status === 'Voicemail' ? 'Voicemail' : 'Call Ended')
            clearInterval(pollRef.current)
            clearInterval(timerRef.current)
          }
        }
      } catch (err) {
        // polling error — silently ignore, continue polling
        console.warn('Session poll error:', err)
      }
    }, 3000) // Poll every 3 seconds
  }, [userId])

  const startCall = useCallback(async () => {
    if (!input.trim() || callState !== 'idle') return
    setCallState('calling')
    setCallError('')
    setStatusMsg('Initiating call…')

    try {
      const res = await rcMakeCall(userId, input.trim())

      if (res.success && res.session_id) {
        setSessionId(res.session_id)
        setCallState('ringing')
        setStatusMsg('Ringing…')
        startPolling(res.session_id)
      } else {
        // API returned success:false
        const errMsg = res.message || res.error || 'Call initiation failed.'
        setCallError(errMsg)
        setCallState('idle')
        setStatusMsg('')
        if (onCallError) onCallError(errMsg)
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Call failed. Please try again.'
      setCallError(errMsg)
      setCallState('idle')
      setStatusMsg('')
      if (onCallError) onCallError(errMsg)
    }
  }, [input, callState, userId, startPolling, onCallError])

  const endCall = useCallback(async () => {
    clearInterval(timerRef.current)
    clearInterval(pollRef.current)
    const sid = sessionRef.current

    if (sid) {
      try {
        await rcEndCall(userId, sid)
      } catch (err) {
        console.warn('End call error:', err)
      }
    }

    setCallState('ended')
    setStatusMsg('Call Ended')
    setMuted(false)
    setOnHold(false)
    setCallTime(0)
    setSessionId(null)
  }, [userId])

  const resetDialpad = useCallback(() => {
    setCallState('idle')
    setCallError('')
    setStatusMsg('')
    setCallTime(0)
    setSessionId(null)
  }, [])

  const press = (val) => { if (callState === 'idle') setInput(p => p + val) }
  const del = () => { if (callState === 'idle') setInput(p => p.slice(0, -1)) }
  const clear = () => { if (callState === 'idle') setInput('') }

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const KEYS = [
    ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
    ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
    ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
    ['*', ''], ['0', '+'], ['#', ''],
  ]

  const isActive = callState === 'connected'
  const isCalling = callState === 'calling' || callState === 'ringing'
  const isEnded = callState === 'ended'

  // Status color
  const stateColor = {
    idle: 'rgba(255,255,255,.2)',
    calling: '#f59e0b',
    ringing: '#f59e0b',
    connected: '#22c55e',
    ended: '#ef4444',
    failed: '#ef4444',
  }[callState] || 'rgba(255,255,255,.2)'

  const stateLabel = {
    idle: 'IDLE',
    calling: 'CALLING',
    ringing: 'RINGING',
    connected: 'LIVE',
    ended: 'ENDED',
    failed: 'FAILED',
  }[callState] || 'IDLE'

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
      width: 310, background: '#0d0e1c',
      borderRadius: 24, border: '1px solid rgba(99,102,241,.25)',
      boxShadow: '0 30px 70px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.04), inset 0 1px 0 rgba(255,255,255,.06)',
      fontFamily: "'Plus Jakarta Sans',sans-serif",
      userSelect: 'none', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes dialFadeIn { from{opacity:0;transform:scale(.86) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes callPulse { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.45)} 60%{box-shadow:0 0 0 14px rgba(34,197,94,0)} }
        @keyframes ringAnim { 0%,100%{transform:scale(1)} 40%{transform:scale(1.05)} }
        @keyframes ringPulse { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.45)} 60%{box-shadow:0 0 0 14px rgba(245,158,11,0)} }
        .dp-popup-inner { animation:dialFadeIn .25s cubic-bezier(.34,1.56,.64,1); }
        .dp-key {
          width:60px; height:60px; border-radius:50%; border:none;
          background:rgba(255,255,255,.055); color:#e2e8f0; cursor:pointer;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          transition:background .12s, transform .1s; font-family:inherit;
        }
        .dp-key:hover { background:rgba(99,102,241,.25); transform:scale(1.08); }
        .dp-key:active { background:rgba(99,102,241,.45); transform:scale(.94); }
        .dp-key:disabled { opacity:.3; cursor:default; transform:none; }
        .dp-call-btn {
          width:68px; height:68px; border-radius:50%; border:none;
          background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%); color:#fff;
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          box-shadow:0 4px 22px rgba(34,197,94,.45); font-family:inherit;
          transition:transform .18s, box-shadow .18s;
          animation:callPulse 2.2s infinite;
        }
        .dp-call-btn:hover { transform:scale(1.1); box-shadow:0 6px 30px rgba(34,197,94,.6); }
        .dp-call-btn:active { transform:scale(.94); }
        .dp-call-btn:disabled { opacity:.35; cursor:default; animation:none; transform:none; box-shadow:none; }
        .dp-ring-btn {
          width:68px; height:68px; border-radius:50%; border:none;
          background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 4px 22px rgba(245,158,11,.45);
          animation:ringPulse .9s ease infinite;
          cursor:not-allowed;
        }
        .dp-end-btn {
          width:68px; height:68px; border-radius:50%; border:none;
          background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%); color:#fff;
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          box-shadow:0 4px 22px rgba(239,68,68,.45); font-family:inherit;
          transition:transform .18s, box-shadow .18s;
        }
        .dp-end-btn:hover { transform:scale(1.1); box-shadow:0 6px 30px rgba(239,68,68,.6); }
        .dp-end-btn:active { transform:scale(.94); }
        .dp-act-btn {
          width:50px; height:50px; border-radius:50%; border:1px solid rgba(255,255,255,.1);
          background:rgba(255,255,255,.06); color:#94a3b8; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition:all .15s; font-family:inherit;
        }
        .dp-act-btn:hover { background:rgba(255,255,255,.14); color:#e2e8f0; }
        .dp-act-btn.active { background:rgba(99,102,241,.25); color:#a5b4fc; border-color:rgba(99,102,241,.4); }
        .dp-act-btn:disabled { opacity:.3; cursor:default; }
      `}</style>

      <div className="dp-popup-inner">
        {/* ── Header / Drag handle ── */}
        <div
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
          style={{
            padding: '13px 16px 11px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: 9,
            background: 'rgba(255,255,255,.03)', borderBottom: '1px solid rgba(255,255,255,.05)',
          }}
        >
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(99,102,241,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.07 2.18 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#a5b4fc', letterSpacing: '.08em' }}>RINGCENTRAL DIALPAD</div>
            {label && <div style={{ fontSize: 10, color: '#475569', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: stateColor, boxShadow: `0 0 6px ${stateColor}` }} />
            <span style={{ fontSize: 9, color: isActive ? '#86efac' : isCalling ? '#fde68a' : isEnded ? '#fca5a5' : '#475569', fontWeight: 700, letterSpacing: '.08em' }}>{stateLabel}</span>
          </div>
          <button
            onClick={onClose}
            style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: '#64748b', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4, transition: 'all .14s', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.2)'; e.currentTarget.style.color = '#fca5a5' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.color = '#64748b' }}
          >✕</button>
        </div>

        {/* ── Display ── */}
        <div style={{ padding: '14px 18px 8px' }}>
          {isActive ? (
            <div style={{ textAlign: 'center', padding: '6px 0 4px' }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.14em', color: '#86efac', marginBottom: 6 }}>● CONNECTED</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '.04em', fontVariantNumeric: 'tabular-nums', animation: 'ringAnim 1.2s ease infinite' }}>{fmtTime(callTime)}</div>
              <div style={{ fontSize: 12, color: '#818cf8', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{input}</div>
            </div>
          ) : isCalling ? (
            <div style={{ textAlign: 'center', padding: '6px 0 4px' }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.14em', color: '#fde68a', marginBottom: 6, animation: 'ringAnim .8s ease infinite' }}>
                {callState === 'calling' ? '⟳ INITIATING…' : '☎ RINGING…'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{input}</div>
              {statusMsg && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{statusMsg}</div>}
            </div>
          ) : isEnded ? (
            <div style={{ textAlign: 'center', padding: '6px 0 4px' }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.14em', color: '#fca5a5', marginBottom: 6 }}>● {statusMsg || 'CALL ENDED'}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{input}</div>
              <button onClick={resetDialpad} style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.3)', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .14s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,.15)'}>
                New Call
              </button>
            </div>
          ) : (
            <>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(255,255,255,.04)', borderRadius: 13,
                border: `1.5px solid ${input ? 'rgba(99,102,241,.35)' : 'rgba(255,255,255,.07)'}`,
                padding: '0 12px', height: 50, gap: 8, transition: 'border-color .2s',
              }}>
                <span style={{ flex: 1, fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '.1em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {input || <span style={{ color: 'rgba(255,255,255,.18)', fontSize: 13, fontWeight: 500 }}>Enter number…</span>}
                </span>
                {input && (
                  <button onClick={del} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18, padding: '4px 6px', borderRadius: 7, transition: 'color .12s,background .12s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'transparent' }}>⌫</button>
                )}
              </div>
              {callError && (
                <div style={{ marginTop: 8, padding: '7px 10px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, fontSize: 11, color: '#fca5a5', lineHeight: 1.4 }}>
                  ⚠ {callError}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Keypad — only when idle ── */}
        {!isActive && !isCalling && !isEnded && (
          <div style={{ padding: '6px 18px 10px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, justifyItems: 'center' }}>
            {KEYS.map(([digit, sub]) => (
              <button key={digit} className="dp-key" onClick={() => press(digit)}>
                <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: '#e2e8f0' }}>{digit}</span>
                {sub && <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,.3)', letterSpacing: '.1em', marginTop: 1 }}>{sub}</span>}
              </button>
            ))}
          </div>
        )}

        {/* ── Active call controls ── */}
        {isActive && (
          <div style={{ padding: '8px 18px 4px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <button className={`dp-act-btn${muted ? ' active' : ''}`} onClick={() => setMuted(m => !m)} title={muted ? 'Unmute' : 'Mute'}>
              {muted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" /><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
              )}
            </button>
            <button className={`dp-act-btn${onHold ? ' active' : ''}`} onClick={() => setOnHold(h => !h)} title={onHold ? 'Resume' : 'Hold'}>
              {onHold ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              )}
            </button>
            <button className="dp-act-btn" title="Session Info" style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </button>
          </div>
        )}

        {/* ── Bottom action row ── */}
        <div style={{ padding: (isActive || isCalling) ? '8px 18px 22px' : '4px 18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          {isActive ? (
            // End call button when connected
            <button className="dp-end-btn" onClick={endCall} title="End Call">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.42 19.42 0 01-3.33-2.67m-2.67-3.34a19.79 19.79 0 01-3.07-8.63A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91" />
                <line x1="23" y1="1" x2="1" y2="23" />
              </svg>
            </button>
          ) : isCalling ? (
            // Show ringing animation + cancel button
            <>
              <div className="dp-ring-btn">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.07 2.18 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
              </div>
              <button className="dp-end-btn" onClick={endCall} title="Cancel Call" style={{ width: 44, height: 44, fontSize: 13, fontWeight: 700 }}>
                ✕
              </button>
            </>
          ) : isEnded ? null : (
            // Idle — show call button
            <>
              {input && (
                <button onClick={clear} style={{ width: 42, height: 42, borderRadius: '50%', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: '#64748b', cursor: 'pointer', fontSize: 10, fontWeight: 800, letterSpacing: '.06em', fontFamily: 'inherit', transition: 'all .14s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.05)'}>CLR</button>
              )}
              <button className="dp-call-btn" onClick={startCall} disabled={!input.trim()}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.07 2.18 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
              </button>
              {input && <div style={{ width: 42 }} />}
            </>
          )}
        </div>

        {/* ── Session ID display (debug — remove in prod) ── */}
        {sessionId && (
          <div style={{ padding: '0 18px 10px', textAlign: 'center' }}>
            <span style={{ fontSize: 9, color: '#1e293b', background: 'rgba(99,102,241,.1)', borderRadius: 6, padding: '2px 8px', fontWeight: 600, letterSpacing: '.04em' }}>
              Session: {String(sessionId).slice(-8)}…
            </span>
          </div>
        )}
      </div>
    </div>
  )
})


/* ─────────────────────────────────────────────────────────────────────────
   ZOOM POPUP — unchanged
───────────────────────────────────────────────────────────────────────── */
const ZoomPopup = React.memo(({ number, label, onClose }) => {
  const [pos, setPos] = useState({ x: Math.max(20, window.innerWidth / 2 - 155), y: Math.max(20, window.innerHeight / 2 - 160) })
  const [copied, setCopied] = useState(false)
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      const cx = e.touches ? e.touches[0].clientX : e.clientX
      const cy = e.touches ? e.touches[0].clientY : e.clientY
      setPos({ x: Math.max(0, Math.min(cx - dragOffset.current.x, window.innerWidth - 320)), y: Math.max(0, Math.min(cy - dragOffset.current.y, window.innerHeight - 100)) })
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  const onDragStart = (e) => {
    dragging.current = true
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    dragOffset.current = { x: cx - pos.x, y: cy - pos.y }
    if (e.preventDefault) e.preventDefault()
  }

  const handleZoomCall = () => {
    const clean = number.replace(/\s+/g, '').replace(/-/g, '')
    window.location.href = `zoomus://phonecall?callee=${encodeURIComponent(clean)}`
    setTimeout(() => {
      window.open(`https://zoom.us/phone/call?number=${encodeURIComponent(clean)}`, '_blank')
    }, 1500)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(number).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
      width: 310, background: '#fff', borderRadius: 18, border: '1.5px solid #e0e8f7',
      boxShadow: '0 20px 50px rgba(26,101,200,.18), 0 4px 16px rgba(0,0,0,.08)',
      fontFamily: "'Plus Jakarta Sans',sans-serif", userSelect: 'none', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes zoomFadeIn { from{opacity:0;transform:scale(.88) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes zoomPulse { 0%,100%{box-shadow:0 0 0 0 rgba(26,101,200,.4)} 60%{box-shadow:0 0 0 12px rgba(26,101,200,0)} }
        .zp-inner { animation:zoomFadeIn .22s cubic-bezier(.34,1.56,.64,1); }
        .zp-call-btn { width:100%; height:44px; border-radius:11px; border:none; background:#1a65c8; color:#fff; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:9px; font-family:'Plus Jakarta Sans',sans-serif; letter-spacing:.03em; box-shadow:0 4px 18px rgba(26,101,200,.38); transition:all .18s; animation:zoomPulse 2.2s infinite; }
        .zp-call-btn:hover { background:#1558b0; transform:translateY(-1px); box-shadow:0 6px 22px rgba(26,101,200,.5); animation:none; }
        .zp-copy-btn { width:100%; height:36px; border-radius:9px; border:1.5px solid #e0e8f7; background:#f0f5ff; font-size:12px; font-weight:600; color:#1a65c8; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px; font-family:'Plus Jakarta Sans',sans-serif; transition:all .15s; }
        .zp-copy-btn:hover { background:#ddeaff; border-color:#1a65c8; }
        .zp-copy-btn.copied { background:#f0fdf4; border-color:#86efac; color:#16a34a; }
      `}</style>
      <div className="zp-inner">
        <div onMouseDown={onDragStart} onTouchStart={onDragStart} style={{ padding: '13px 16px 11px', cursor: 'grab', background: '#1a65c8', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.7)', letterSpacing: '.1em' }}>ZOOM PHONE</div>
            {label && <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{label}</div>}
          </div>
          <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid rgba(255,255,255,.25)', background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.8)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4, transition: 'all .14s', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.4)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; e.currentTarget.style.color = 'rgba(255,255,255,.8)' }}>✕</button>
        </div>
        <div style={{ padding: '16px 16px 10px' }}>
          <div style={{ background: '#f0f5ff', border: '1.5px solid #c7d9f5', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1d2e', letterSpacing: '.06em' }}>{number}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a65c8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.07 2.18 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
          </div>
        </div>
        <div style={{ padding: '4px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="zp-call-btn" onClick={handleZoomCall}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" /></svg>
            Zoom Call
          </button>
          <button className={`zp-copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy}>
            {copied ? (<><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Copied!</>) : (<><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>Number Copy Karo</>)}
          </button>
        </div>
        <div style={{ padding: '9px 16px', borderTop: '1.5px solid #e0e8f7', display: 'flex', alignItems: 'center', gap: 6, background: '#f8faff' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a65c8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: .6 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span style={{ fontSize: 10, color: '#6b88b8', fontWeight: 500, lineHeight: 1.4 }}>Zoom app installed honi chahiye. Agar na ho to browser mein khulega.</span>
        </div>
      </div>
    </div>
  )
})

/* ─── Followup Modal ─────────────────────────────────────────────────────── */
const FollowupModal = React.memo(({ statusLabel, onConfirm, onCancel }) => {
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState('')
  const [err, setErr] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const go = () => { if (!date) { setErr(true); return } onConfirm(notes, date) }
  return (
    <div className="kb-movi" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="kb-modal">
        <div className="kb-mh"><span className="kb-mh-title">Status Update</span><button className="kb-mh-x" onClick={onCancel}>✕</button></div>
        <div className="kb-mb">
          <div><label className="kb-ml">Status</label><div className="kb-msb"><span className="kb-msd" />{statusLabel}</div></div>
          <div><label className="kb-ml">Notes</label><textarea className="kb-mta" placeholder="Add notes about this status update..." value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <div>
            <label className="kb-ml">{isFU(statusLabel) ? 'Follow-up Date' : 'Expected Date'} <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="date" min={today} value={date} onChange={e => { setDate(e.target.value); setErr(false) }} className={`kb-mdi${err ? ' err' : ''}`} />
            {err && <div className="kb-err">Please select a follow-up date</div>}
          </div>
        </div>
        <div className="kb-mf"><button className="kb-mcancel" onClick={onCancel}>Cancel</button><button className="kb-mok" onClick={go}>Update Status</button></div>
      </div>
    </div>
  )
})

/* ─── Phone Click Popup ──────────────────────────────────────────────────── */
const PhoneClickPopup = React.memo(({ number, label, onClose, onRingCentral, onZoom }) => {
  const [pos, setPos] = useState({ x: Math.max(20, window.innerWidth / 2 - 170), y: Math.max(20, window.innerHeight / 2 - 120) })
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      const cx = e.touches ? e.touches[0].clientX : e.clientX
      const cy = e.touches ? e.touches[0].clientY : e.clientY
      setPos({ x: cx - dragOffset.current.x, y: cy - dragOffset.current.y })
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  const onDragStart = (e) => {
    dragging.current = true
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    dragOffset.current = { x: cx - pos.x, y: cy - pos.y }
    if (e.preventDefault) e.preventDefault()
  }

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
      width: 340, background: '#fff', borderRadius: 16,
      border: '1.5px solid #e8eaef',
      boxShadow: '0 20px 50px rgba(0,0,0,.15), 0 4px 16px rgba(0,0,0,.08)',
      fontFamily: "'Plus Jakarta Sans',sans-serif", userSelect: 'none', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes phonePopupFade { from{opacity:0;transform:scale(.9) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .pp-inner { animation:phonePopupFade .2s cubic-bezier(.34,1.56,.64,1); }
        .pp-opt-btn { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; height:52px; border-radius:12px; border:none; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .18s; }
        .pp-opt-btn:hover { transform:translateY(-2px); }
        .pp-ring-btn { background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%); color:#fff; box-shadow:0 4px 18px rgba(99,102,241,.35); }
        .pp-ring-btn:hover { box-shadow:0 6px 24px rgba(99,102,241,.5); }
        .pp-zoom-btn { background:#fff; color:#1a65c8; border:2px solid #1a65c8; box-shadow:0 4px 18px rgba(26,101,200,.15); }
        .pp-zoom-btn:hover { background:#f0f5ff; box-shadow:0 6px 24px rgba(26,101,200,.25); }
      `}</style>
      <div className="pp-inner">
        <div onMouseDown={onDragStart} onTouchStart={onDragStart}
          style={{ padding: '14px 18px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,#f5f5ff 0%,#faf5ff 100%)', borderBottom: '1.5px solid #f0f0f5' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.44.99-1v-3.58c0-.54-.45-.99-.99-.99z" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#8b92a5', letterSpacing: '.1em', textTransform: 'uppercase' }}>MAKE A CALL</div>
            {label && <div style={{ fontSize: 13, color: '#1a1d2e', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{label}</div>}
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px solid #e8eaef', background: '#fff', color: '#8b92a5', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .14s', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fff0f0'; e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e8eaef'; e.currentTarget.style.color = '#8b92a5' }}>✕</button>
        </div>
        <div style={{ padding: '16px 20px 14px' }}>
          <div style={{ background: '#f9fafb', border: '1.5px solid #e8eaef', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1d2e', letterSpacing: '.04em' }}>{number}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.07 2.18 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
          </div>
        </div>
        <div style={{ padding: '4px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="pp-opt-btn pp-ring-btn" onClick={() => { onRingCentral(number, label); onClose() }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.07 2.18 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
            Call via RingCentral
          </button>
          <button className="pp-opt-btn pp-zoom-btn" onClick={() => { onZoom(number, label); onClose() }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1a65c8"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" /></svg>
            Call via Zoom
          </button>
        </div>
      </div>
    </div>
  )
})

/* ─── Lead Drawer ────────────────────────────────────────────────────────── */
const LeadDrawer = React.memo(({ lead, leadStatuses, onStatusChange, openPhoneClickPopup, onOpenView, onOpenEdit }) => {

  const [sel, setSel] = useState(null)
  const [note, setNote] = useState('')
  const [fuD, setFuD] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setSel(null); setNote(''); setFuD('') }, [lead?.id])
  if (!lead) return null
  const currentStatusName = lead.lead_status?.name || ''
  const currentNeedsDate = isFU(currentStatusName) || isInProgress(currentStatusName)
  const fu = sel ? isFU(sel.label) : isFU(currentStatusName)
  const inProg = sel ? isInProgress(sel.label) : isInProgress(currentStatusName)
  const showDate = sel ? (fu || inProg) : currentNeedsDate   // status na badle to bhi date editable rahe
  const today = new Date().toISOString().split('T')[0]
  const canSave = (sel || note.trim().length > 0 || (currentNeedsDate && fuD)) && !(showDate && !fuD) && !saving
  const save = async () => {
    if (showDate && !fuD) { alert('Please select a date'); return }
    setSaving(true)
    try {
      const statusToSave = sel ? sel : { value: String(lead.lead_status?.id ?? ''), label: lead.lead_status?.name ?? 'Unknown' }
      await onStatusChange(lead, statusToSave, note, fuD)
      setSel(null); setNote(''); setFuD('')
    } finally { setSaving(false) }
  }

  const currentStatusName2 = lead.lead_status?.name || ''
  const showNextFu = isFU(currentStatusName2) || isInProgress(currentStatusName2)
  const nextFuDate = showNextFu ? getNextFollowupDate(lead) : null

  const infoFields = [
    ['Name', getName(lead)], ['Email', lead.email || '—'],
    ['Company', lead.company || '—'], ['Type', lead.lead_type?.name || lead.type || '—'],
    ['State', lead.state || '—'], ['Designation', lead.designation || '—'],
    ['Source', getSource(lead)],
    ['Assigned', lead.assigned_to?.name || 'Unassigned'],
    ['Status', lead.lead_status?.name || 'Unknown'],
    ...(nextFuDate ? [['Next Follow-up', fmtFuDate(nextFuDate)]] : []),
    ['Last Updated', getLastUpdatedDate(lead)],
    ['Lead Age', getLeadAge(lead)],
  ]
  const phoneFields = [
    { label: 'Phone', value: lead.phone || '—', key: 'phone' },
    { label: 'Direct No', value: lead.primary_number || lead.direct_no || lead.direct_number || '—', key: 'direct' },
    { label: 'HQ Number', value: lead.reference_number || lead.hq_number || lead.hq_no || '—', key: 'hq' },
    { label: 'Alt Number', value: lead.vat || '—', key: 'vat' },
  ]

  const isPhoneValue = (v) => v && v !== '—'

  return (
    <div className="kb-db">
      {infoFields.map(([l, v]) => (
        <div key={l} className="kb-dr">
          <span className="kb-dr-l">{l}</span>
          <span className="kb-dr-v" title={v}>{v}</span>
        </div>
      ))}

      {phoneFields.map(({ label, value, key }) => (
        <div key={key} className="kb-dr">
          <span className="kb-dr-l">{label}</span>
          {isPhoneValue(value) ? (
            <span className="kb-dr-phone" title={`Click to call ${value}`}
              onClick={() => openPhoneClickPopup(value, `${getName(lead)} — ${label}`)}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.07 2.18 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              {value}
            </span>
          ) : (
            <span className="kb-dr-v">—</span>
          )}
        </div>
      ))}

      <div className="kb-stit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Change Status</span>

      </div>
      <div className="kb-sgrid">
        {leadStatuses.filter(s => s.label !== lead.lead_status?.name).map(s => {
          const c = getS(s.label, leadStatuses);
          const on = sel?.value === s.value
          return (
            <button key={s.value} className={`kb-sopt${on ? ' on' : ''}`}
              style={on ? { background: c.bg, color: c.accent, borderColor: c.accent } : {}}
              onClick={() => { setSel(s); setFuD('') }}>{s.label}</button>
          )
        })}
      </div>
      {showDate && (
        <div style={{ marginTop: 14 }}>
          <div className="kb-stit" style={{ margin: '0 0 8px' }}>{fu ? 'Follow-up Date' : 'Expected Date'} <span style={{ color: '#ef4444' }}>*</span></div>
          <input type="date" min={today} value={fuD} onChange={e => setFuD(e.target.value)} className={`kb-date-i${fuD ? ' ok' : ''}`} />
          {!fuD && <div className="kb-err" style={{ marginTop: 4 }}>Date required</div>}
        </div>
      )}
      <div className="kb-stit" style={{ marginTop: 16 }}>Notes</div>
      {!sel && !currentNeedsDate && (
        <div style={{ fontSize: 11, color: '#8b92a5', background: '#f5f6fa', borderRadius: 8, padding: '7px 10px', marginTop: 4, borderLeft: '3px solid #6366f1', lineHeight: 1.5 }}>
          💡Do you only want to save a note? The note can be saved even without selecting a status.
        </div>
      )}
      <textarea className="kb-ni" placeholder="Add notes about this status update..." value={note} onChange={e => setNote(e.target.value)} />
      <button className="kb-sbtn" disabled={!canSave} onClick={save}>
        {saving ? 'Saving…' : sel ? 'Save Status' : 'Save Note'}
      </button>
      {lead._history?.length > 0 && (
        <>
          <div className="kb-stit" style={{ marginTop: 22 }}>Activity History</div>
          {lead._history.map((h, i) => {
            const hc = getS(h.to)
            return (
              <div key={i} className="kb-hi">
                <div className="kb-hdot" style={{ background: hc.accent }} />
                <div>
                  <div className="kb-htxt">
                    <span style={{ color: '#94a3b8' }}>{h.from}</span>
                    <span style={{ color: '#d1d5db', margin: '0 4px' }}>→</span>
                    <strong style={{ color: hc.accent }}>{h.to}</strong>
                    {h.followupDate && <span style={{ color: '#8b5cf6', marginLeft: 5, fontSize: 11 }}>📅 {h.followupDate}</span>}
                    {h.note && <span style={{ color: '#94a3b8', marginLeft: 4, fontSize: 11 }}> — {h.note}</span>}
                  </div>
                  <div className="kb-htime">{h.time}</div>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
})

/* ─── Single Card ────────────────────────────────────────────────────────── */
const KanbanCard = React.memo(({ lead, statusCfg, onDragStart, onCardClick, onViewClick, onEditClick, onOpenView, onOpenEdit }) => {
  const name = getName(lead); const company = lead.company || '—'
  const type = lead.lead_type?.name || lead.type || '—'; const tc = getTypeColor(type)
  const assigned = lead.assigned_to?.name || 'Unassigned'
  const statusName = lead.lead_status?.name || ''
  const needsDate = isFU(statusName) || isInProgress(statusName)
  const fuDate = needsDate ? getNextFollowupDate(lead) : null
  return (
    <div className="kb-card" draggable onDragStart={e => onDragStart(e, lead)} onDragEnd={e => e.currentTarget.classList.remove('dragging')} onClick={() => onCardClick(lead)}>
      <div className="kb-card-row1">
        <div className="kb-card-name" title={name}>{name}</div>
        <div className="kb-card-dot" style={{ background: statusCfg.accent }} />
      </div>
      <div className="kb-card-co" title={company}>{company}</div>
      {fuDate && (
        <div className="kb-card-fu">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          {fmtFuDate(fuDate)}
        </div>
      )}
      <div className="kb-card-row2">
        <span className="kb-card-tag" style={{ background: tc.bg, color: tc.tc }}>{type}</span>
        <span className="kb-card-view-tag" onClick={e => { e.stopPropagation(); onOpenView(lead.id) }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>VIEW
        </span>
        <span className="kb-card-edit-tag" onClick={e => { e.stopPropagation(); onOpenEdit(lead.id) }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>EDIT
        </span>
        <div className="kb-card-av" style={{ background: statusCfg.bg, color: statusCfg.accent }} title={assigned}>{ini(assigned)}</div>
      </div>
    </div>
  )
}, (prev, next) =>
  prev.lead.id === next.lead.id &&
  prev.lead.lead_status?.name === next.lead.lead_status?.name &&
  prev.lead._history?.length === next.lead._history?.length
)

/* ─── Kanban Column ──────────────────────────────────────────────────────── */
const KanbanColumn = React.memo(({ leadStatuses, statusName, allColLeads, totalCount, isFiltered, onDragStart, onDragOver, onDragLeave, onDrop, onCardClick, onViewClick, onEditClick, onOpenView, onOpenEdit, dragOverCol }) => {
  const cfg = getS(statusName, leadStatuses)
  const over = dragOverCol === statusName
  const [colSearch, setColSearch] = useState('')
  const [visible, setVisible] = useState(CARDS_PER_COL)
  const filtered = useMemo(() => {
    if (!colSearch) return allColLeads
    const t = colSearch.toLowerCase()
    return allColLeads.filter(l => getName(l).toLowerCase().includes(t) || (l.company || '').toLowerCase().includes(t) || (l.phone || '').includes(t))
  }, [allColLeads, colSearch])
  const shown = filtered.slice(0, visible); const hasMore = visible < filtered.length
  const pct = totalCount > 0 ? Math.min(100, Math.round((allColLeads.length / totalCount) * 100)) : 0
  const loadMore = useCallback(() => setVisible(v => v + CARDS_PER_COL), [])
  useEffect(() => setVisible(CARDS_PER_COL), [colSearch])
  return (
    <div className={`kb-col${over ? ' drag-target' : ''}${isFiltered ? ' kb-col-filtered' : ''}`}>
      <div className="kb-col-head">
        <div className="kb-col-meta">
          <div className="kb-col-pip" style={{ background: cfg.accent }} />
          <span className="kb-col-lbl" title={statusName}>{statusName}</span>
          <span className="kb-col-badge" style={{ background: cfg.bg, color: cfg.accent }}>{allColLeads.length.toLocaleString()}</span>
        </div>
        <div className="kb-col-bar"><div className="kb-col-bar-fill" style={{ width: `${pct}%`, background: cfg.accent }} /></div>
      </div>
      {allColLeads.length > 20 && (
        <div className="kb-col-search">
          <input className="kb-col-input" placeholder={`Search in ${statusName}...`} value={colSearch} onChange={e => setColSearch(e.target.value)} />
        </div>
      )}
      <div className={`kb-zone${over ? ' over' : ''}`}
        onDragOver={e => { e.preventDefault(); onDragOver(statusName) }}
        onDragLeave={onDragLeave} onDrop={e => onDrop(e, statusName)}>
        {filtered.length === 0 ? (
          <div className="kb-empty-zone">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M12 8v4m0 4h.01" /></svg>
            <span>{colSearch ? 'No results' : 'Drop here'}</span>
          </div>
        ) : shown.map(lead => (
          <KanbanCard key={encryptId(lead.id)} lead={lead} statusCfg={cfg}
            onDragStart={onDragStart} onCardClick={onCardClick}
            onViewClick={onViewClick} onEditClick={onEditClick}
            onOpenView={onOpenView} onOpenEdit={onOpenEdit} />
        ))}
      </div>
      {hasMore && (
        <div className="kb-load-more">
          <button className="kb-load-btn" onClick={loadMore}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7l7 7 7-7" /></svg>
            Load {Math.min(CARDS_PER_COL, filtered.length - visible)} more
          </button>
        </div>
      )}
    </div>
  )
})

/* ─── Main Page ──────────────────────────────────────────────────────────── */
const UserDashboardKanbanPage = () => {
  const pathName = usePathname(); const router = useRouter()
  useBootstrapUtils(pathName)
  const { user, loading, role, isAuthenticated } = useUser()
  const userId = user?.id || null
  const [allLeads, setAllLeads] = useState([])
  const [leadStatuses, setLeadStatuses] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [fetchProgress, setFetchProgress] = useState(0)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [globalSearch, setGlobalSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')


  const [filterFollowupDate, setFilterFollowupDate] = useState('')   // 👈 NEW
  const [showFilterPanel, setShowFilterPanel] = useState(false)      // 👈 ADD
  const [filterDesignation, setFilterDesignation] = useState('')         // 👈 ADD
  const [filterState, setFilterState] = useState('')        // 👈 ADD
  const [filterDateFrom, setFilterDateFrom] = useState('')        // 👈 ADD
  const [filterDateTo, setFilterDateTo] = useState('')        // 👈 ADD
  const filterPanelRef = useRef(null)                                   // 👈 ADD
  const [view, setView] = useState('kanban')
  const [listPage, setListPage] = useState(1)
  const [dragOverCol, setDragOverCol] = useState(null)
  const dragLeadRef = useRef(null)
  const [followupModal, setFollowupModal] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'success' })
  const toastRef = useRef(null)

  // ── Dialpad state (number + label + userId passed in) ──
  const [dialpad, setDialpad] = useState(null)
  const openDialpad = useCallback((number, label) => setDialpad({ number, label }), [])
  const closeDialpad = useCallback(() => setDialpad(null), [])

  // ── Zoom popup ──
  const [zoomPopup, setZoomPopup] = useState(null)
  const openZoomPopup = useCallback((number, label) => setZoomPopup({ number, label }), [])
  const closeZoomPopup = useCallback(() => setZoomPopup(null), [])

  // ── Phone click popup ──
  const [phoneClickPopup, setPhoneClickPopup] = useState(null)
  const openPhoneClickPopup = useCallback((number, label) => setPhoneClickPopup({ number, label }), [])
  const closePhoneClickPopup = useCallback(() => setPhoneClickPopup(null), [])

  // ── View / Edit popup state ── ✅ यह block होना चाहिए
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewLeadId, setViewLeadId] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editLeadId, setEditLeadId] = useState(null)

  const handleOpenView = useCallback((leadId) => {
    setViewLeadId(leadId)
    setShowViewModal(true)
  }, [])
  const handleCloseView = useCallback(() => {
    setShowViewModal(false)
    setViewLeadId(null)
  }, [])
  const handleOpenEdit = useCallback((leadId) => {
    setEditLeadId(leadId)
    setShowEditModal(true)
  }, [])
  const handleCloseEdit = useCallback(() => {
    setShowEditModal(false)
    setEditLeadId(null)
  }, [])

 


  useEffect(() => {
    if (role === 'superadmin') { router.push('/dashboard'); return }
  }, [role, router])

  const fetchLeadStatuses = useCallback(async () => {
    try {
      const cid = JSON.parse(localStorage.getItem('companyId')); if (!cid) return
      const r = await crmInstance.get(`/lead-status/${cid}`)
      const d = r.data.data?.data || r.data.data || r.data || []
      setLeadStatuses(Array.isArray(d) ? d.map(i => ({ value: String(i.id), label: i.name })) : [])
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { if (isAuthenticated && role && role !== 'superadmin') fetchLeadStatuses() }, [isAuthenticated, role, fetchLeadStatuses])

  useEffect(() => {
    if (!isAuthenticated || !role || role === 'superadmin') return
    const run = async () => {
      setDataLoading(true); setFetchProgress(0); setAllLeads([])
      try {
        const cid = JSON.parse(localStorage.getItem('companyId')); if (!cid) return
        let useR = true
        try {
          const r = await crmInstance.get(`/reports/leads/masterfilter/${cid}`, { params: { page: 1, per_page: 1, year: selectedYear, ...(selectedMonth ? { month: selectedMonth } : {}) } })
          useR = r.data.status === true || r.data.success === true
        } catch { useR = false }
        let page = 1, all = [], more = true, totalPages = 1
        while (more) {
          const p = { page, per_page: FETCH_PAGE_SIZE, ...(selectedYear ? { year: selectedYear } : {}), ...(selectedMonth ? { month: selectedMonth } : {}) }
          const res = useR
            ? await crmInstance.get(`/reports/leads/masterfilter/${cid}`, { params: p })
            : await crmInstance.get(`/leads/${cid}/master-filter`, { params: p })
          const ok = res.data.status === true || res.data.success === true
          if (ok) {
            const pd = res.data.data
            const nl = Array.isArray(pd?.data) ? pd.data : Array.isArray(pd) ? pd : []
            all = [...all, ...nl]; totalPages = pd?.last_page || 1
            setFetchProgress(Math.round((page / totalPages) * 100))
            more = page < totalPages; page++
            if (page % 2 === 0 || !more) setAllLeads(all.map(l => ({ ...l, _history: [] })))
          } else more = false
        }
        setAllLeads(all.map(l => ({ ...l, _history: [] })))
      } catch (e) { console.error(e) } finally { setDataLoading(false); setFetchProgress(100) }
    }; run()
  }, [isAuthenticated, role, userId, selectedYear, selectedMonth])

  const showToast = useCallback((msg, type = 'success') => {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast({ msg, type })
    toastRef.current = setTimeout(() => setToast({ msg: '', type: 'success' }), 2800)
  }, [])

  // Called from DialpadPopup when call API fails
  const handleCallError = useCallback((errMsg) => {
    showToast(`Call failed: ${errMsg}`, 'error')
  }, [showToast])

  const handleViewClick = useCallback((lead) => {
    const key = lead.hashed_id || lead.hash_id || lead.slug || lead.id
    router.push(`/leads/view/${encryptId(key)}`)
  }, [router])

  const handleEditClick = useCallback((lead) => {
    const key = lead.hashed_id || lead.hash_id || lead.slug || lead.id
    router.push(`/leads/edit/${encryptId(key)}`)
  }, [router])



  const handleStatusChange = useCallback(async (lead, newStatus, note, fuDate) => {
    try {
      const cid = JSON.parse(localStorage.getItem('companyId'))
      const old = lead.lead_status?.name || 'Unknown'; const neo = newStatus.label
      const pl = { user_id: null, leads_id: lead.id, status_id: parseInt(newStatus.value), note: note || null }
      if (fuDate) pl.followup_date = fuDate
      await crmInstance.post(`/leads/${cid}/${lead.id}/update-status-with-note`, pl)
      const hist = { from: old, to: neo, note, followupDate: fuDate, time: fmt() }
      setAllLeads(prev => prev.map(l => l.id !== lead.id ? l : { ...l, lead_status: { id: parseInt(newStatus.value), name: neo }, _history: [hist, ...(l._history || [])] }))
      setSelectedLead(prev => { if (!prev || prev.id !== lead.id) return prev; return { ...prev, lead_status: { id: parseInt(newStatus.value), name: neo }, _history: [hist, ...(prev._history || [])] } })
      showToast(`${getName(lead)} → ${neo}`)
    } catch (e) { console.error(e); alert('Status update failed. Please try again.') }
  }, [showToast])

  // 👇 NEW —  
  const refreshSingleLead = useCallback(async (leadId) => {
    try {
      const cid = JSON.parse(localStorage.getItem('companyId'))
      const res = await crmInstance.get(`/leads/${cid}/${leadId}`)
      const ok = res.data.status === true || res.data.success === true
      if (ok) {
        const fresh = res.data.data
        setAllLeads(prev => prev.map(l => l.id !== leadId ? l : { ...l, ...fresh, _history: l._history }))
        setSelectedLead(prev => prev && prev.id === leadId ? { ...prev, ...fresh } : prev)
      }
    } catch (e) { console.error('refreshSingleLead failed', e) }
  }, [])

  const handleDragStart = useCallback((e, lead) => {
    dragLeadRef.current = lead
    e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(lead.id))
    e.currentTarget.classList.add('dragging')
  }, [])
  const handleDragEnd = useCallback((e) => {
    if (e?.currentTarget) e.currentTarget.classList.remove('dragging')
    document.querySelectorAll('.kb-card.dragging').forEach(el => el.classList.remove('dragging'))
    setDragOverCol(null); dragLeadRef.current = null
  }, [])
  const handleDragOver = useCallback((s) => setDragOverCol(s), [])
  const handleDragLeave = useCallback((e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null) }, [])
  const handleDrop = useCallback(async (e, newStatusName) => {
    e.preventDefault(); setDragOverCol(null)
    const lead = dragLeadRef.current; if (!lead) return
    if ((lead.lead_status?.name || '') === newStatusName) return
    const statusObj = leadStatuses.find(s => s.label === newStatusName)
    if (isFU(newStatusName) || isInProgress(newStatusName)) { setFollowupModal({ lead, newStatusName, statusObj }); return }
    if (!statusObj) {
      const old = lead.lead_status?.name || ''
      setAllLeads(prev => prev.map(l => l.id !== lead.id ? l : { ...l, lead_status: { id: null, name: newStatusName }, _history: [{ from: old, to: newStatusName, note: '', followupDate: '', time: fmt() }, ...(l._history || [])] }))
      showToast(`${getName(lead)} → ${newStatusName}`); return
    }
    await handleStatusChange(lead, statusObj, '', '')
  }, [leadStatuses, handleStatusChange, showToast])

  const handleFollowupConfirm = useCallback(async (notes, fuDate) => {
    setFollowupModal(prev => {
      if (!prev) return null
      const { lead, statusObj, newStatusName } = prev; const old = lead.lead_status?.name || ''
      if (statusObj) handleStatusChange(lead, statusObj, notes, fuDate)
      else {
        setAllLeads(arr => arr.map(l => l.id !== lead.id ? l : { ...l, lead_status: { id: null, name: newStatusName }, _history: [{ from: old, to: newStatusName, note: notes, followupDate: fuDate, time: fmt() }, ...(l._history || [])] }))
        showToast(`${getName(lead)} → ${newStatusName}`)
      }
      return null
    })
  }, [handleStatusChange, showToast])
  const handleFollowupCancel = useCallback(() => { setFollowupModal(null); dragLeadRef.current = null }, [])

  const uniqueDesignations = useMemo(() => [...new Set(allLeads.map(l => l.designation || '').filter(Boolean))], [allLeads])
const uniqueStates = useMemo(() => [...new Set(allLeads.map(l => l.state || '').filter(Boolean))], [allLeads])

const filtered = useMemo(() => {
  let arr = allLeads
  if (globalSearch) {
    const t = globalSearch.toLowerCase()
    arr = arr.filter(l =>
      getName(l).toLowerCase().includes(t) ||
      (l.company || '').toLowerCase().includes(t) ||
      (l.email || '').toLowerCase().includes(t) ||
      (l.phone || '').includes(t) ||
      (l.primary_number || l.direct_no || l.direct_number || '').includes(t)
    )
  }
  if (filterStatus) arr = arr.filter(l => getStatusName(l) === filterStatus)
  if (filterType) arr = arr.filter(l => (l.lead_type?.name || l.type || '') === filterType)
  if (filterDesignation) arr = arr.filter(l => (l.designation || '') === filterDesignation)
  if (filterState) arr = arr.filter(l => (l.state || '') === filterState)
  if (filterFollowupDate) {
    arr = arr.filter(l => {
      const d = getNextFollowupDate(l)
      if (!d) return false
      return new Date(d).toISOString().split('T')[0] === filterFollowupDate
    })
  }
  if (filterDateFrom || filterDateTo) {
    arr = arr.filter(l => {
      if (!l.created_at) return false
      const d = new Date(l.created_at)
      if (filterDateFrom && d < new Date(filterDateFrom)) return false
      if (filterDateTo && d > new Date(filterDateTo + 'T23:59:59')) return false
      return true
    })
  }
  return arr
}, [allLeads, globalSearch, filterStatus, filterType, filterDesignation, filterState, filterFollowupDate, filterDateFrom, filterDateTo])
const { colStatuses, colMap, totalForPct } = useMemo(() => {

    const apiSt = leadStatuses.map(
      s => s.label || s.name
    )

    const leadSt = [
      ...new Set(
        allLeads.map(l => getStatusName(l))
      )
    ]

    const merged = [
      ...new Set([
        ...apiSt,
        ...leadSt
      ])
    ]

    const ordered = apiSt

    let cols = [
      ...ordered.filter(status => merged.includes(status)),
      ...merged.filter(status => !ordered.includes(status))
    ]

    // ── Priority reorder: 1) Non-Worked first, 2) In-progress second ──
    const norm = (s = '') => s.toLowerCase().replace(/[-\s]/g, '')

    const reorderPriority = (arr) => {
      let result = [...arr]

      // "Non-Worked" ko sabse aage lao
      const nwIdx = result.findIndex(s => norm(s).includes('nonworked'))
      if (nwIdx > -1) {
        const [nw] = result.splice(nwIdx, 1)
        result.unshift(nw)
      }

      // "In-progress" ko doosre number par lao
      const ipIdx = result.findIndex((s, i) => i !== 0 && isInProgress(s))
      if (ipIdx > -1) {
        const [ip] = result.splice(ipIdx, 1)
        result.splice(1, 0, ip)
      }

      return result
    }

    cols = reorderPriority(cols)

    if (filterStatus) {
      cols = cols.filter(
        status => status === filterStatus
      )
    }

    const map = {}

    cols.forEach(status => {
      let arr = filtered.filter(
        lead => getStatusName(lead) === status
      )

      // सिर्फ Follow Up / In Progress columns में date-wise sort karo
      if (isFU(status) || isInProgress(status)) {
        arr = [...arr].sort((a, b) => {
          const da = getNextFollowupDate(a)
          const db = getNextFollowupDate(b)
          if (!da && !db) return 0
          if (!da) return 1      // date na ho to sabse niche
          if (!db) return -1
          return new Date(da) - new Date(db)   // nearest date sabse upar
        })
      }

      map[status] = arr
    })
    //  console.log('KANBAN COLUMNS ORDER:', cols)  
    return {
      colStatuses: cols,
      colMap: map,
      totalForPct: filtered.length
    }

  }, [
    leadStatuses,
    allLeads,
    filtered,
    filterStatus
  ])

  const unknownCount = useMemo(() => allLeads.filter(l => !l.lead_status?.name).length, [allLeads])
  const listTotal = filtered.length
  const listPages = Math.max(1, Math.ceil(listTotal / LIST_PAGE_SIZE))
  const listSlice = useMemo(() => filtered.slice((listPage - 1) * LIST_PAGE_SIZE, listPage * LIST_PAGE_SIZE), [filtered, listPage])
  const uniqueTypes = useMemo(() => [...new Set(allLeads.map(l => l.lead_type?.name || l.type || '').filter(Boolean))], [allLeads])
              
  const hasFilter = globalSearch || filterStatus || filterType || filterFollowupDate || filterDesignation || filterState || filterDateFrom || filterDateTo
  const clearFilters = () => {
    setGlobalSearch(''); setFilterStatus(''); setFilterType('')
    setFilterFollowupDate(''); setFilterDesignation(''); setFilterState('')
    setFilterDateFrom(''); setFilterDateTo('')
    setListPage(1)
  }
  const allStatusOptions = useMemo(() => {

    const ordered = leadStatuses.map(
      s => s.label || s.name
    )

    const all = [
      ...new Set([
        ...ordered,
        ...allLeads.map(l => getStatusName(l))
      ])
    ]

    return [
      ...ordered.filter(status => all.includes(status)),
      ...all.filter(status => !ordered.includes(status))
    ]

  }, [leadStatuses, allLeads])

  // Clickable phone cell (list view)
  const PhoneCell = useCallback(({ value, leadName, fieldLabel }) => {
    if (!value) return <span style={{ color: '#b0b8cc', fontSize: 11 }}>—</span>
    return (
      <span
        style={{ color: '#6366f1', fontWeight: 600, fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 6, padding: '2px 6px', background: 'rgba(99,102,241,.06)', transition: 'background .14s' }}
        onClick={e => { e.stopPropagation(); openPhoneClickPopup(value, `${leadName} — ${fieldLabel}`) }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,.14)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,.06)'}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.07 2.18 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
        </svg>
        {value}
      </span>
    )
  }, [openPhoneClickPopup])

  if (loading || !isAuthenticated) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' }}>
      <div className="kb-loading"><div className="kb-sw"><div className="kb-sp" /><div className="kb-spi" /></div></div>
    </div>
  )

  if (dataLoading) return (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa', gap: 16 }}>
    <div className="kb-loading"><div className="kb-sw"><div className="kb-sp" /><div className="kb-spi" /></div></div>
    <span style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', letterSpacing: '.06em' }}>
      Loading leads… {fetchProgress}%
    </span>
  </div>
)
  return (
     <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PageHeader>
        <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
          <Link href="/medical-billing/my-task" className="btn btn-sm btn-light-brand">My Task &rarr;</Link>
          {dataLoading && <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: '.08em' }}>LOADING {fetchProgress}%</span>}
          <select className="form-select form-select-sm" style={{ width: 140 }} value={selectedYear} onChange={e => { setSelectedYear(parseInt(e.target.value)); setSelectedMonth(null) }} disabled={dataLoading}>
            {Array.from({ length: 10 }, (_, i) => 2024 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="form-select form-select-sm" style={{ width: 140 }} value={selectedMonth || ''} onChange={e => setSelectedMonth(e.target.value ? parseInt(e.target.value) : null)} disabled={dataLoading}>
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(selectedYear, i).toLocaleString('default', { month: 'long' })}</option>)}
          </select>
        </div>
      </PageHeader>

      <div className="main-content kb-page" style={{ flex: 1 }}>
        <div className="kb-toolbar">
          <div className="kb-search-wrap">
            <svg className="kb-search-ico" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
            <input className="kb-search" placeholder="Search all leads..." value={globalSearch} onChange={e => { setGlobalSearch(e.target.value); setListPage(1) }} />
          </div>
            <button className={`kb-filter-btn${showFilterPanel?' active':''}`} onClick={()=>setShowFilterPanel(v=>!v)}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
    Filter
    {hasFilter && (
      <span className="kb-filter-count">
        {[filterStatus,filterType,filterFollowupDate,filterDesignation,filterState,(filterDateFrom||filterDateTo)?'1':''].filter(Boolean).length}
      </span>
    )}
  </button>
          <div className="kb-badge"><div className="kb-live-dot" /><strong>{filtered.length.toLocaleString()}</strong> of {allLeads.length.toLocaleString()} leads</div>

         <button className="kb-notwork-btn" onClick={() => router.push('/leads/list?lead_status_id=NULL')} title={`${unknownCount.toLocaleString()} leads not yet worked on`}>
  <span className="kb-notwork-dot" />
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
  My Task
  {unknownCount > 0 && <span style={{ background: '#6366f1', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 20, marginLeft: 2 }}>{unknownCount.toLocaleString()}</span>}
</button>

          <button className="kb-workreport-btn" onClick={() => router.push('/reports/leads')}>
            <span className="kb-workreport-dot" />
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
            </svg>
            Work Report
          </button>

          <div className="kb-view-toggle">
            <button className={`kb-vbtn${view === 'kanban' ? ' on' : ''}`} onClick={() => setView('kanban')}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V2zm6-1a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-2z" /></svg>Board
            </button>
            <button className={`kb-vbtn${view === 'list' ? ' on' : ''}`} onClick={() => setView('list')}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z" /></svg>List
            </button>
            <div className="kb-vtoggle-sep" />
            <button className="kb-vbtn-add" onClick={() => router.push('/leads/create')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add Lead
            </button>
          </div>
        </div>

       <div className="kb-filter-pop-wrap" ref={filterPanelRef} style={{marginBottom:14}}>


  {showFilterPanel && (
    <div className="kb-filter-pop">
      <div className="kb-fp-title">
        Filter Leads by
        <button className="kb-fp-title-x" onClick={()=>setShowFilterPanel(false)}>✕</button>
      </div>

      <div className="kb-fp-field">
        <label className="kb-fp-label">Type</label>
        <select className="kb-fp-sel" value={filterType} onChange={e=>{ setFilterType(e.target.value); setListPage(1) }}>
          <option value="">Select Type</option>
          {uniqueTypes.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="kb-fp-field">
        <label className="kb-fp-label">Status</label>
        <select className="kb-fp-sel" value={filterStatus} onChange={e=>{ setFilterStatus(e.target.value); setListPage(1) }}>
          <option value="">Select Status</option>
          {allStatusOptions.map(s=>{
            const count=allLeads.filter(l=>getStatusName(l)===s).length
            return <option key={s} value={s}>{s} ({count.toLocaleString()})</option>
          })}
        </select>
      </div>

      <div className="kb-fp-field">
        <label className="kb-fp-label">Designation</label>
        <select className="kb-fp-sel" value={filterDesignation} onChange={e=>{ setFilterDesignation(e.target.value); setListPage(1) }}>
          <option value="">Select Designation</option>
          {uniqueDesignations.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="kb-fp-field">
        <label className="kb-fp-label">State</label>
        <select className="kb-fp-sel" value={filterState} onChange={e=>{ setFilterState(e.target.value); setListPage(1) }}>
          <option value="">Select State</option>
          {uniqueStates.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
{/* 
      <div className="kb-fp-field">
        <label className="kb-fp-label">Date Range (Created)</label>
        <div className="kb-fp-daterow">
          <input type="date" className="kb-fp-date" value={filterDateFrom} onChange={e=>{ setFilterDateFrom(e.target.value); setListPage(1) }}/>
          <input type="date" className="kb-fp-date" value={filterDateTo} onChange={e=>{ setFilterDateTo(e.target.value); setListPage(1) }}/>
        </div>
      </div> */}

      <div className="kb-fp-field">
        <label className="kb-fp-label">Follow-up Date</label>
        <input type="date" className="kb-fp-date" value={filterFollowupDate} onChange={e=>{ setFilterFollowupDate(e.target.value); setListPage(1) }}/>
      </div>

      <div className="kb-fp-actions">
        <button className="kb-fp-reset" onClick={clearFilters}>Reset Filters</button>
        <button className="kb-fp-apply" onClick={()=>setShowFilterPanel(false)}>Apply</button>
      </div>
    </div>
  )}
</div>

        {dataLoading && (
          <div style={{ height: 3, background: '#e8eaef', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${fetchProgress}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 2, transition: 'width .3s ease' }} />
          </div>
        )}

     {view === 'kanban' ? (
  <div className={`kb-board-wrap${showFilterPanel ? ' kb-content-shift' : ''}`}>
    <div className="kb-board">
      {colStatuses.map(sn => (
        <KanbanColumn key={sn} statusName={sn}
          leadStatuses={leadStatuses}
          allColLeads={colMap[sn] || []} totalCount={totalForPct}
          isFiltered={!!filterStatus && filterStatus === sn}
          onDragStart={handleDragStart} onDragOver={handleDragOver}
          onDragLeave={handleDragLeave} onDrop={handleDrop}
          onCardClick={lead => { setSelectedLead(lead); setDrawerOpen(true) }}
          onViewClick={handleViewClick} onEditClick={handleEditClick}
          onOpenView={handleOpenView} onOpenEdit={handleOpenEdit}
          dragOverCol={dragOverCol} />
      ))}
    </div>
  </div>
) : (
  <div className={`kb-list-wrap${showFilterPanel ? ' kb-content-shift' : ''}`}>
    <div className="kb-list-scroll">
      <table className="kb-list-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Client Name</th>
                    <th>Company Name</th>
                    <th>Email</th>

                    <th>Phone</th>
                    <th>Direct No</th>

                    <th>Status</th><th>Provider Types</th>
                    <th>State</th><th>Designation</th>
                    <th>Lead Source</th>
                    <th>Assigned Date</th>
                    <th>Follow Up Date</th>
                    <th>Last Updated</th>
                    <th>Lead Age</th>
                  </tr>
                </thead>
                <tbody>
                  {listSlice.length === 0 ? (
                    <tr><td colSpan={14} style={{ textAlign: 'center', padding: '48px', color: '#b0b8cc' }}>No leads found</td></tr>
                  ) : listSlice.map((lead, i) => {
                    const cfg = getS(getStatusName(lead)); const tc = getTypeColor(lead.lead_type?.name || lead.type || '')
                    const n = getName(lead)
                    const phone = lead.phone || ''; const direct = lead.primary_number || lead.direct_no || lead.direct_number || ''
                    const hq = lead.reference_number || lead.hq_number || lead.hq_no || ''; const vat = lead.vat || ''
                    return (
                      <tr key={lead.id} onClick={() => { setSelectedLead(lead); setDrawerOpen(true) }}>
                        <td style={{ color: '#b0b8cc', fontSize: 11 }}>{((listPage - 1) * LIST_PAGE_SIZE + i + 1).toLocaleString()}</td>
                        <td style={{ fontWeight: 600, color: '#1a1d2e' }} title={n}>{n}</td>
                        <td style={{ fontWeight: 600, color: '#1a1d2e' }} title={lead.company}>{lead.company}</td>
                        <td style={{ color: '#1a1d2e', fontSize: 11 }} title={lead.company || '—'}>{lead.email || '—'}</td>
                        <td><PhoneCell value={phone} leadName={n} fieldLabel="Phone" /></td>
                        <td><PhoneCell value={direct} leadName={n} fieldLabel="Direct No" /></td>

                        <td>
                          <span className="kb-pill" style={{ background: cfg.bg, color: cfg.accent, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); handleViewClick(lead) }}>
                            <span className="kb-pill-dot" style={{ background: cfg.accent }} />{getStatusName(lead)}
                          </span>
                        </td>
                        <td>
                          {(lead.lead_type?.name || lead.type) ? (
                            <span style={{ fontSize: 10, fontWeight: 700, background: tc.bg, color: tc.tc, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '.04em' }}>{lead.lead_type?.name || lead.type}</span>
                          ) : <span style={{ color: '#b0b8cc' }}>—</span>}
                        </td>
                        <td style={{ color: '#8b92a5', fontSize: 11 }}>{lead.state || '—'}</td>
                        <td style={{ color: '#8b92a5', fontSize: 11 }} title={lead.designation || '—'}>{lead.designation || '—'}</td>
                        <td style={{ color: '#8b92a5', fontSize: 11 }}>{getSource(lead)}</td>
                        <td style={{ color: '#8b92a5', fontSize: 11 }}>{getAssignedDate(lead)}</td>
                        <td style={{ color: '#8b92a5', fontSize: 11 }}>{getFolllwDate(lead)}</td>
                        <td style={{ color: '#8b92a5', fontSize: 11 }}>{getLastUpdatedDate(lead)}</td>
                        <td><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(99,102,241,.08)', color: '#6366f1' }}>{getLeadAge(lead)}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {listPages > 1 && (
              <div className="kb-list-pg">
                <span className="kb-pg-info">Showing {((listPage - 1) * LIST_PAGE_SIZE + 1).toLocaleString()}–{Math.min(listPage * LIST_PAGE_SIZE, listTotal).toLocaleString()} of {listTotal.toLocaleString()}</span>
                <div className="kb-pg-btns">
                  <button className="kb-pg-btn" disabled={listPage === 1} onClick={() => setListPage(1)}>«</button>
                  <button className="kb-pg-btn" disabled={listPage === 1} onClick={() => setListPage(p => p - 1)}>‹ Prev</button>
                  {[...Array(Math.min(5, listPages))].map((_, i) => {
                    const pg = listPage <= 3 ? i + 1 : listPage + i - 2
                    if (pg < 1 || pg > listPages) return null
                    return (<button key={pg} className={`kb-pg-btn${listPage === pg ? ' active' : ''}`} onClick={() => setListPage(pg)}>{pg}</button>)
                  })}
                  <button className="kb-pg-btn" disabled={listPage === listPages} onClick={() => setListPage(p => p + 1)}>Next ›</button>
                  <button className="kb-pg-btn" disabled={listPage === listPages} onClick={() => setListPage(listPages)}>»</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Lead Drawer ── */}
      <div className={`kb-ov${drawerOpen ? ' on' : ''}`} onClick={() => setDrawerOpen(false)} />
      <div className={`kb-drawer${drawerOpen ? ' on' : ''}`}>
        {selectedLead && (() => {
          const cfg = getS(getStatusName(selectedLead))
          return (
            <>
              <div className="kb-dh">
                <div className="kb-dh-av" style={{ background: cfg.bg, color: cfg.accent }}>{ini(getName(selectedLead))}</div>
                <div><div className="kb-dh-name">{getName(selectedLead)}</div> </div>

                <button
                  onClick={(e) => { e.preventDefault(); setDrawerOpen(false); handleOpenView(selectedLead.id) }}
                  title="View"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    height: 30, fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'none',
                    color: '#6366f1', background: 'rgba(99,102,241,.1)',
                    border: '1px solid rgba(99,102,241,.25)', borderRadius: 20,
                    padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all .15s', flexShrink: 0
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,.1)'; e.currentTarget.style.color = '#6366f1' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  View
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); setDrawerOpen(false); handleOpenEdit(selectedLead.id) }}
                  title="Edit Lead"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', borderRadius: 9,
                    border: '1.5px solid #d97706', background: 'rgba(245,158,11,.08)', color: '#d97706',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '.04em',
                    fontFamily: 'inherit', transition: 'all .15s', flexShrink: 0
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f59e0b'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,.08)'; e.currentTarget.style.color = '#d97706' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  Edit
                </button>
                <button className="kb-dh-close" onClick={() => setDrawerOpen(false)}>✕</button>
              </div>


              <LeadDrawer
                lead={selectedLead}
                leadStatuses={leadStatuses}
                onStatusChange={handleStatusChange}
                openPhoneClickPopup={openPhoneClickPopup}
                onOpenView={handleOpenView}
              />
            </>
          )
        })()}
      </div>

      {followupModal && <FollowupModal statusLabel={followupModal.newStatusName} onConfirm={handleFollowupConfirm} onCancel={handleFollowupCancel} />}

      {/* ── Toast ── */}
      <div className={`kb-toast${toast.msg ? ' on' : ''}${toast.type === 'error' ? ' err' : ''}`}>
        <span className="kb-tdot" />
        {toast.msg}
      </div>

      {/* ── Phone Click Popup (choose RingCentral or Zoom) ── */}
      {phoneClickPopup && (
        <PhoneClickPopup
          number={phoneClickPopup.number}
          label={phoneClickPopup.label}
          onClose={closePhoneClickPopup}
          onRingCentral={openDialpad}
          onZoom={openZoomPopup}
        />
      )}

      {/* ── RingCentral Dialpad — real API call ── */}
      {dialpad && (
        <DialpadPopup
          number={dialpad.number}
          label={dialpad.label}
          userId={userId}          // ← pass logged-in userId
          onClose={closeDialpad}
          onCallError={handleCallError}
        />
      )}

      {/* ── Zoom Popup ── */}
      {zoomPopup && (
        <ZoomPopup
          number={zoomPopup.number}
          label={zoomPopup.label}
          onClose={closeZoomPopup}
        />
      )}

      {/* ── View / Edit popups, mounted only while open ── */}
      {showViewModal && (
        <LeadViewModal
          show={showViewModal}
          leadId={viewLeadId}
          onClose={handleCloseView}
          onStatusUpdated={() => {
            // kanban ke liye leads list refresh
            setAllLeads(prev => [...prev])
          }}
        />
      )}

      {showEditModal && (
        <LeadEditModal
          leadId={editLeadId}
          onClose={handleCloseEdit}
          onUpdated={(updatedLead) => {
            if (updatedLead && updatedLead.id) {
              setAllLeads(prev => prev.map(l =>
                l.id === updatedLead.id ? { ...l, ...updatedLead, _history: l._history } : l
              ))
              setSelectedLead(prev => prev && prev.id === updatedLead.id ? { ...prev, ...updatedLead } : prev)
            } else {
              refreshSingleLead(editLeadId)
            }
          }}
        />
      )}
      <Footer />
     </div>
  )
}

export default UserDashboardKanbanPage
