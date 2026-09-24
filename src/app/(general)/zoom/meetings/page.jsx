'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react';
import crmInstance from '@/utils/crmInstance';
import Swal from 'sweetalert2';
import { formatDate, formatTime } from '@/utils/formatDate';

// ══════════════════════════════════════════════════════════════════
//  SVG ICONS
// ══════════════════════════════════════════════════════════════════
const Icon = {
  Video: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  Plus: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Calendar: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Clock: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Refresh: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Link: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  Play: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  Stop: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
  Eye: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Alert: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Users: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Close: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  User: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Lock: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Info: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

// ══════════════════════════════════════════════════════════════════
//  UTILITY
// ══════════════════════════════════════════════════════════════════
const fmtDate = (dt) => dt ? formatDate(dt) : '—';
const fmtTime = (dt) => dt ? formatTime(dt) : '—';
const getUser = () => {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
};

// Status config
const STATUS = {
  scheduled: { label: 'Scheduled', cls: 'badge-green',  dot: '#16a34a' },
  waiting:   { label: 'Waiting',   cls: 'badge-amber',  dot: '#d97706' },
  started:   { label: '● Live',    cls: 'badge-live',   dot: '#dc2626' },
  finished:  { label: 'Ended',     cls: 'badge-slate',  dot: '#94a3b8' },
};
const getStatus = (s) => STATUS[s] || { label: s || 'Unknown', cls: 'badge-slate', dot: '#94a3b8' };

// ══════════════════════════════════════════════════════════════════
//  REUSABLE COMPONENTS
// ══════════════════════════════════════════════════════════════════

// ── Spinner ──────────────────────────────────────────────────────
const Spinner = ({ size = 18, color = '#fff' }) => (
  <span className="zm-spin-wrap" style={{ width: size, height: size }}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity=".25" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  </span>
);

// ── FormField ────────────────────────────────────────────────────
const FormField = ({ label, required, children, hint }) => (
  <div className="zm-field">
    {label && (
      <label className="zm-field-label">
        {label}{required && <span className="zm-req">*</span>}
      </label>
    )}
    {children}
    {hint && <span className="zm-field-hint">{hint}</span>}
  </div>
);

// ── Modal Shell ──────────────────────────────────────────────────
const Modal = ({ open, onClose, title, icon, children, footer, width = 560 }) => {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return (
    <>
      <div className="zm-backdrop" onClick={onClose} />
      <div className="zm-modal" style={{ maxWidth: width }}>
        <div className="zm-modal-hdr">
          <div className="zm-modal-hdr-left">
            {icon && <div className="zm-modal-ico">{icon}</div>}
            <h3 className="zm-modal-ttl">{title}</h3>
          </div>
          <button className="zm-icon-btn" onClick={onClose}><Icon.Close /></button>
        </div>
        <div className="zm-modal-body">{children}</div>
        {footer && <div className="zm-modal-ftr">{footer}</div>}
      </div>
    </>
  );
};

// ── Detail Row ───────────────────────────────────────────────────
const DetailRow = ({ icon, label, value, mono }) => (
  <div className="zm-detail-row">
    <div className="zm-detail-ico">{icon}</div>
    <div className="zm-detail-content">
      <span className="zm-detail-label">{label}</span>
      <span className={`zm-detail-val ${mono ? 'mono' : ''}`}>{value || '—'}</span>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════
//  CREATE MEETING MODAL
// ══════════════════════════════════════════════════════════════════
const CreateModal = ({ open, onClose, onSubmit, loading }) => {
  const init = { topic: '', duration: 30, start_time: '', agenda: '', password: '' };
  const [form, setForm] = useState(init);

  useEffect(() => { if (!open) setForm(init); }, [open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = () => {
    if (!form.topic.trim()) {
      Swal.fire({ title: 'Required Field', text: 'Please enter a meeting topic.', icon: 'warning', confirmButtonColor: '#0f172a' });
      return;
    }
    onSubmit(form);
  };

  return (
    <Modal
      open={open} onClose={onClose}
      title="Schedule New Meeting"
      icon={<Icon.Video />}
      width={540}
      footer={
        <div className="zm-modal-ftr-btns">
          <button className="zm-btn zm-btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="zm-btn zm-btn-primary" onClick={submit} disabled={loading}>
            {loading ? <><Spinner size={14} /> Creating…</> : <><Icon.Plus /> Create Meeting</>}
          </button>
        </div>
      }
    >
      <div className="zm-form-grid">
        <FormField label="Meeting Topic" required>
          <input className="zm-input" placeholder="e.g. Q4 Strategy Call" value={form.topic}
            onChange={e => set('topic', e.target.value)} />
        </FormField>

        <div className="zm-form-2col">
          <FormField label="Duration">
            <select className="zm-input" value={form.duration} onChange={e => set('duration', e.target.value)}>
              {[15, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </FormField>
          <FormField label="Start Time" hint="Leave blank for instant meeting">
            <input className="zm-input" type="datetime-local" value={form.start_time}
              onChange={e => set('start_time', e.target.value)} />
          </FormField>
        </div>

        <FormField label="Agenda">
          <textarea className="zm-input zm-textarea" rows={3} placeholder="What will be discussed in this meeting?"
            value={form.agenda} onChange={e => set('agenda', e.target.value)} />
        </FormField>

        <FormField label="Password" hint="Optional — leave blank for no password">
          <div className="zm-input-icon-wrap">
            <Icon.Lock />
            <input className="zm-input zm-input-with-icon" placeholder="Meeting password" value={form.password}
              onChange={e => set('password', e.target.value)} />
          </div>
        </FormField>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════
//  MEETING DETAIL MODAL
// ══════════════════════════════════════════════════════════════════
const DetailModal = ({ open, onClose, meeting, currentUserId, onStart, onEnd, onJoin, actionLoading }) => {
  if (!meeting) return null;
  const st = getStatus(meeting.status);
  const isHost = meeting.user_id === currentUserId;
  const canStart = isHost && meeting.status !== 'finished';
  const canEnd   = isHost && meeting.status !== 'finished';
  const canJoin  = ['scheduled', 'started', 'waiting'].includes(meeting.status);

  return (
    <Modal
      open={open} onClose={onClose}
      title="Meeting Details"
      icon={<Icon.Info />}
      width={520}
      footer={
        <div className="zm-detail-actions">
          {canJoin && (
            <button className="zm-btn zm-btn-join" onClick={onJoin} disabled={!!actionLoading}>
              {actionLoading === 'join' ? <Spinner size={13} /> : <Icon.Link />} Join Meeting
            </button>
          )}
          {canStart && (
            <button className="zm-btn zm-btn-start" onClick={onStart} disabled={!!actionLoading}>
              {actionLoading === 'start' ? <Spinner size={13} /> : <Icon.Play />}
              {meeting.status === 'started' ? 'Open Meeting' : 'Start Meeting'}
            </button>
          )}
          {canEnd && (
            <button className="zm-btn zm-btn-end" onClick={onEnd} disabled={!!actionLoading}>
              {actionLoading === 'end' ? <Spinner size={13} color="#dc2626" /> : <Icon.Stop />} End Meeting
            </button>
          )}
          <button className="zm-btn zm-btn-ghost" onClick={onClose}>Close</button>
        </div>
      }
    >
      {/* Status Banner */}
      <div className={`zm-detail-banner zm-banner-${meeting.status || 'scheduled'}`}>
        <span className={`zm-badge ${st.cls}`}>{st.label}</span>
        <span className="zm-detail-id">ID: {meeting.zoom_meeting_id}</span>
      </div>

      <div className="zm-detail-list">
        <DetailRow icon={<Icon.Video />}    label="Topic"      value={meeting.topic} />
        <DetailRow icon={<Icon.Calendar />} label="Date"       value={fmtDate(meeting.start_time)} />
        <DetailRow icon={<Icon.Clock />}    label="Time"       value={fmtTime(meeting.start_time)} />
        <DetailRow icon={<Icon.Clock />}    label="Duration"   value={meeting.duration ? `${meeting.duration} minutes` : null} />
        <DetailRow icon={<Icon.User />}     label="Host"       value={meeting.user?.name} />
        {meeting.client && (
          <DetailRow icon={<Icon.Users />}  label="Client"     value={meeting.client?.name || meeting.client?.client_name} />
        )}
        {meeting.agenda && (
          <DetailRow icon={<Icon.Info />}   label="Agenda"     value={meeting.agenda} />
        )}
        {meeting.join_url && (
          <DetailRow icon={<Icon.Link />}   label="Join URL"   value={
            <a href={meeting.join_url} target="_blank" rel="noreferrer" className="zm-url-link">
              {meeting.join_url.slice(0, 48)}… <Icon.Link />
            </a>
          } mono />
        )}
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════
//  STAT CARD
// ══════════════════════════════════════════════════════════════════
const StatCard = ({ label, value, icon, color, sub }) => (
  <div className="zm-stat" style={{ '--sc': color }}>
    <div className="zm-stat-icon">{icon}</div>
    <div className="zm-stat-body">
      <div className="zm-stat-val">{value}</div>
      <div className="zm-stat-label">{label}</div>
      {sub && <div className="zm-stat-sub">{sub}</div>}
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════
//  MEETING ROW
// ══════════════════════════════════════════════════════════════════
const MeetingRow = ({ meeting, index, currentUserId, onView, onStart, onEnd, onJoin, actionLoading }) => {
  const st      = getStatus(meeting.status);
  const isHost  = meeting.user_id === currentUserId;
  const canAct  = ['scheduled', 'started', 'waiting'].includes(meeting.status);
  const isEnded = meeting.status === 'finished';

  const avatarLetter = (meeting.topic || 'M').charAt(0).toUpperCase();
  const avatarColors = ['#0f62fe', '#0284c7', '#0d9488', '#7c3aed', '#db2777', '#ea580c'];
  const avatarColor  = avatarColors[(avatarLetter.charCodeAt(0)) % avatarColors.length];

  return (
    <tr className="zm-tr" style={{ '--delay': `${index * 35}ms` }}>
      {/* Topic */}
      <td className="zm-td zm-td-main">
        <div className="zm-row-topic">
          <div className="zm-avatar" style={{ background: avatarColor }}>{avatarLetter}</div>
          <div className="zm-row-info">
            <span className="zm-row-name">{meeting.topic || '—'}</span>
            {meeting.agenda && <span className="zm-row-sub">{meeting.agenda}</span>}
          </div>
        </div>
      </td>

      {/* DateTime */}
      <td className="zm-td">
        <div className="zm-row-date">{fmtDate(meeting.start_time)}</div>
        <div className="zm-row-time">{fmtTime(meeting.start_time)}</div>
      </td>

      {/* Duration */}
      <td className="zm-td">
        <span className="zm-pill"><Icon.Clock /> {meeting.duration || '—'} min</span>
      </td>

      {/* Host */}
      <td className="zm-td">
        <div className="zm-row-host">
          {isHost
            ? <span className="zm-host-you"><Icon.Check /> You</span>
            : <span className="zm-host-name">{meeting.user?.name || '—'}</span>
          }
        </div>
      </td>

      {/* Status */}
      <td className="zm-td">
        <span className={`zm-badge ${st.cls}`}>{st.label}</span>
      </td>

      {/* Actions */}
      <td className="zm-td zm-td-actions">
        <div className="zm-row-actions">
          <button className="zm-act-btn zm-act-view" onClick={() => onView(meeting)} title="View Details">
            <Icon.Eye /> Details
          </button>

          {canAct && (
            <button
              className="zm-act-btn zm-act-join"
              onClick={() => onJoin(meeting)}
              disabled={!!actionLoading}
              title="Join Meeting"
            >
              {actionLoading === `join-${meeting.id}` ? <Spinner size={12} color="#0f172a" /> : <Icon.Link />}
              Join
            </button>
          )}

          {isHost && canAct && (
            <button
              className="zm-act-btn zm-act-start"
              onClick={() => onStart(meeting)}
              disabled={!!actionLoading}
              title="Start Meeting"
            >
              {actionLoading === `start-${meeting.id}` ? <Spinner size={12} /> : <Icon.Play />}
              Start
            </button>
          )}

          {isHost && !isEnded && (
            <button
              className="zm-act-btn zm-act-end"
              onClick={() => onEnd(meeting)}
              disabled={!!actionLoading}
              title="End Meeting"
            >
              {actionLoading === `end-${meeting.id}` ? <Spinner size={12} color="#dc2626" /> : <Icon.Stop />}
              End
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

// ══════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function ZoomMeetingPage() {
  const [meetings,     setMeetings]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [creating,     setCreating]     = useState(false);
  const [error,        setError]        = useState('');
  const [actionLoading, setActionLoading] = useState(''); // e.g. 'join-5', 'start-5', 'end-5'

  // Modals
  const [showCreate,   setShowCreate]   = useState(false);
  const [detailMeeting, setDetailMeeting] = useState(null);
  const [detailActionLoading, setDetailActionLoading] = useState('');

  // Current logged-in user
  const [currentUser]  = useState(() => getUser());
  const currentUserId  = currentUser?.id;
  const isAdmin        = ['superadmin', 'admin'].includes(currentUser?.role);

  // ── API: Fetch Meetings ──────────────────────────────────────
  const fetchMeetings = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      // Admin can pass ?all=true to see all meetings
      const params = isAdmin ? { all: true } : {};
      const res = await crmInstance.get('/zoom/meetings', { params });
      setMeetings(res.data.data || []);
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 401) setError('Session expired. Please log in again.');
      else if (err.response?.status === 403) setError('You do not have permission to view meetings.');
      else setError(msg || 'Failed to fetch meetings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  // ── API: Create Meeting ──────────────────────────────────────
  const handleCreate = async (formData) => {
    setCreating(true);
    try {
      const payload = {
        topic:    formData.topic,
        duration: parseInt(formData.duration),
        type:     formData.start_time ? 2 : 1,
        ...(formData.start_time && { start_time: new Date(formData.start_time).toISOString() }),
        ...(formData.agenda    && { agenda:     formData.agenda }),
        ...(formData.password  && { password:   formData.password }),
      };
      const res = await crmInstance.post('/zoom/create-meeting', payload);
      setShowCreate(false);
      await Swal.fire({
        title: 'Meeting Created!',
        html: `<b>${res.data.data?.topic || formData.topic}</b><br/><small style="color:#64748b">Your meeting is ready.</small>`,
        icon: 'success', confirmButtonText: 'Done', confirmButtonColor: '#0f172a',
      });
      fetchMeetings();
    } catch (err) {
      Swal.fire({ title: 'Failed', text: err.response?.data?.message || 'Something went wrong.', icon: 'error', confirmButtonColor: '#0f172a' });
    } finally {
      setCreating(false);
    }
  };

  // ── API: Join Meeting ────────────────────────────────────────
  const handleJoin = async (meeting, fromDetail = false) => {
    const key = `join-${meeting.id}`;
    fromDetail ? setDetailActionLoading('join') : setActionLoading(key);
    try {
      const res = await crmInstance.get(`/zoom/meetings/${meeting.id}/join`);
      if (res.data.join_url) window.open(res.data.join_url, '_blank');
      else Swal.fire({ title: 'No Join URL', text: 'Join URL not available.', icon: 'warning', confirmButtonColor: '#0f172a' });
    } catch (err) {
      Swal.fire({ title: 'Cannot Join', text: err.response?.data?.message || 'Failed to join meeting.', icon: 'error', confirmButtonColor: '#0f172a' });
    } finally {
      fromDetail ? setDetailActionLoading('') : setActionLoading('');
    }
  };

  // ── API: Start Meeting ───────────────────────────────────────
  const handleStart = async (meeting, fromDetail = false) => {
    const key = `start-${meeting.id}`;
    fromDetail ? setDetailActionLoading('start') : setActionLoading(key);
    try {
      const res = await crmInstance.get(`/zoom/meetings/${meeting.id}/start`);
      if (res.data.start_url) window.open(res.data.start_url, '_blank');
      // Update local state
      setMeetings(prev => prev.map(m => m.id === meeting.id ? { ...m, status: 'started' } : m));
      if (detailMeeting?.id === meeting.id) setDetailMeeting(p => ({ ...p, status: 'started' }));
    } catch (err) {
      Swal.fire({ title: 'Cannot Start', text: err.response?.data?.message || 'Failed to start meeting.', icon: 'error', confirmButtonColor: '#0f172a' });
    } finally {
      fromDetail ? setDetailActionLoading('') : setActionLoading('');
    }
  };

  // ── API: End Meeting ─────────────────────────────────────────
  const handleEnd = async (meeting, fromDetail = false) => {
    const confirm = await Swal.fire({
      title: 'End Meeting?',
      text: `"${meeting.topic}" will be marked as finished.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, End It',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
    });
    if (!confirm.isConfirmed) return;

    const key = `end-${meeting.id}`;
    fromDetail ? setDetailActionLoading('end') : setActionLoading(key);
    try {
      await crmInstance.patch(`/zoom/meetings/${meeting.id}/end`);
      setMeetings(prev => prev.map(m => m.id === meeting.id ? { ...m, status: 'finished' } : m));
      if (detailMeeting?.id === meeting.id) setDetailMeeting(p => ({ ...p, status: 'finished' }));
      Swal.fire({ title: 'Meeting Ended', text: 'The meeting has been marked as finished.', icon: 'success', confirmButtonColor: '#0f172a' });
    } catch (err) {
      Swal.fire({ title: 'Cannot End', text: err.response?.data?.message || 'Failed to end meeting.', icon: 'error', confirmButtonColor: '#0f172a' });
    } finally {
      fromDetail ? setDetailActionLoading('') : setActionLoading('');
    }
  };

  // ── API: View Details (fetch fresh) ─────────────────────────
  const handleView = async (meeting) => {
    setDetailMeeting(meeting); // show immediately with cached data
    try {
      const res = await crmInstance.get(`/zoom/meetings/${meeting.id}`);
      setDetailMeeting(res.data.data || meeting);
    } catch {
      // keep cached data if fresh fetch fails
    }
  };

  // ── Stats ────────────────────────────────────────────────────
  const stats = {
    total:     meetings.length,
    scheduled: meetings.filter(m => m.status === 'scheduled').length,
    live:      meetings.filter(m => m.status === 'started').length,
    ended:     meetings.filter(m => m.status === 'finished').length,
  };

  // ══════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <>
      <style>{CSS}</style>

      <div className="zm-page">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="zm-page-hdr">
          <div className="zm-hdr-left">
            <div className="zm-hdr-ico"><Icon.Video /></div>
            <div>
              <h1 className="zm-page-title">Zoom Meetings</h1>
              <p className="zm-page-sub">
                {currentUser?.name ? `Welcome, ${currentUser.name.split(' ')[0]}` : 'Manage your video meetings'}
              </p>
            </div>
          </div>
          <div className="zm-hdr-right">
            <button
              className="zm-btn zm-btn-ghost zm-btn-sm"
              onClick={() => fetchMeetings(true)}
              disabled={refreshing}
            >
              <span style={{ display: 'inline-block', animation: refreshing ? 'zm-spin 0.9s linear infinite' : 'none' }}>
                <Icon.Refresh />
              </span>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button className="zm-btn zm-btn-primary" onClick={() => setShowCreate(true)} disabled={creating}>
              <Icon.Plus /> New Meeting
            </button>
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────── */}
        <div className="zm-stats-grid">
          <StatCard label="Total"     value={stats.total}     icon={<Icon.Video />}  color="#0f62fe" />
          <StatCard label="Scheduled" value={stats.scheduled} icon={<Icon.Calendar />} color="#0284c7" />
          <StatCard label="Live Now"  value={stats.live}      icon={<Icon.Play />}   color="#dc2626"
            sub={stats.live > 0 ? 'In progress' : null} />
          <StatCard label="Ended"     value={stats.ended}     icon={<Icon.Check />}  color="#16a34a" />
        </div>

        {/* ── Error ───────────────────────────────────────────── */}
        {error && (
          <div className="zm-error">
            <Icon.Alert /><span>{error}</span>
            <button className="zm-error-btn" onClick={() => fetchMeetings()}>Retry</button>
          </div>
        )}

        {/* ── Table Card ──────────────────────────────────────── */}
        <div className="zm-card">
          <div className="zm-card-hdr">
            <div className="zm-card-hdr-left">
              <span className="zm-card-ttl">
                {isAdmin ? 'All Meetings' : 'My Meetings'}
              </span>
              <span className="zm-count-pill">{meetings.length}</span>
            </div>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="zm-skeleton-wrap">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="zm-skeleton-row" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="zm-skel zm-skel-avatar" />
                  <div className="zm-skel-lines">
                    <div className="zm-skel zm-skel-line zm-skel-lg" />
                    <div className="zm-skel zm-skel-line zm-skel-sm" />
                  </div>
                  <div className="zm-skel zm-skel-line zm-skel-md" style={{ marginLeft: 'auto' }} />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && meetings.length === 0 && (
            <div className="zm-empty">
              <div className="zm-empty-ico"><Icon.Video /></div>
              <div className="zm-empty-title">No meetings yet</div>
              <div className="zm-empty-sub">Schedule your first Zoom meeting to get started</div>
              <button className="zm-btn zm-btn-primary" onClick={() => setShowCreate(true)}>
                <Icon.Plus /> Schedule a Meeting
              </button>
            </div>
          )}

          {/* Table */}
          {!loading && meetings.length > 0 && (
            <div className="zm-table-wrap">
              <table className="zm-table">
                <thead>
                  <tr className="zm-thead-tr">
                    <th className="zm-th">Topic</th>
                    <th className="zm-th">Date & Time</th>
                    <th className="zm-th">Duration</th>
                    <th className="zm-th">Host</th>
                    <th className="zm-th">Status</th>
                    <th className="zm-th zm-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {meetings.map((m, i) => (
                    <MeetingRow
                      key={m.id || i}
                      meeting={m}
                      index={i}
                      currentUserId={currentUserId}
                      onView={handleView}
                      onJoin={(meeting) => handleJoin(meeting, false)}
                      onStart={(meeting) => handleStart(meeting, false)}
                      onEnd={(meeting) => handleEnd(meeting, false)}
                      actionLoading={actionLoading}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Create Modal ──────────────────────────────────────── */}
      <CreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        loading={creating}
      />

      {/* ── Detail Modal ──────────────────────────────────────── */}
      <DetailModal
        open={!!detailMeeting}
        onClose={() => { setDetailMeeting(null); setDetailActionLoading(''); }}
        meeting={detailMeeting}
        currentUserId={currentUserId}
        actionLoading={detailActionLoading}
        onJoin={() => handleJoin(detailMeeting, true)}
        onStart={() => handleStart(detailMeeting, true)}
        onEnd={() => handleEnd(detailMeeting, true)}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
//  CSS
// ══════════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; }

.zm-page {
  font-family: 'DM Sans', sans-serif;
  background: #f1f5f9;
  min-height: 100vh;
  padding: 28px 32px 60px;
  color: #0f172a;
}

/* ── Page Header ── */
.zm-page-hdr {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; flex-wrap: wrap; gap: 14px;
}
.zm-hdr-left { display: flex; align-items: center; gap: 14px; }
.zm-hdr-ico {
  width: 44px; height: 44px; border-radius: 12px;
  background: #0f172a; color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(15,23,42,.22);
}
.zm-page-title { font-size: 21px; font-weight: 700; margin: 0; letter-spacing: -.3px; }
.zm-page-sub   { font-size: 13px; color: #64748b; margin: 1px 0 0; }
.zm-hdr-right  { display: flex; gap: 8px; }

/* ── Stats ── */
.zm-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 14px; margin-bottom: 22px;
}
.zm-stat {
  background: #fff; border-radius: 14px;
  border: 1px solid #e2e8f0;
  padding: 18px 20px;
  display: flex; align-items: center; gap: 14px;
  transition: box-shadow .18s, transform .18s;
  position: relative; overflow: hidden;
}
.zm-stat::before {
  content: ''; position: absolute; top: 0; left: 0;
  width: 3px; height: 100%; background: var(--sc);
  border-radius: 14px 0 0 14px;
}
.zm-stat:hover { box-shadow: 0 4px 20px rgba(0,0,0,.07); transform: translateY(-1px); }
.zm-stat-icon {
  width: 38px; height: 38px; border-radius: 10px;
  background: color-mix(in srgb, var(--sc) 10%, white);
  color: var(--sc);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.zm-stat-val   { font-size: 26px; font-weight: 700; line-height: 1; }
.zm-stat-label { font-size: 12px; color: #64748b; font-weight: 500; margin-top: 3px; }
.zm-stat-sub   { font-size: 11px; color: var(--sc); font-weight: 600; margin-top: 2px; }

/* ── Error ── */
.zm-error {
  display: flex; align-items: center; gap: 9px;
  background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px;
  padding: 11px 14px; color: #b91c1c; font-size: 13.5px;
  font-weight: 500; margin-bottom: 18px;
}
.zm-error-btn {
  margin-left: auto; background: #dc2626; color: #fff;
  border: none; border-radius: 6px; padding: 4px 11px;
  font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit;
}

/* ── Card ── */
.zm-card {
  background: #fff; border-radius: 16px;
  border: 1px solid #e2e8f0; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.zm-card-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 22px; border-bottom: 1px solid #f1f5f9;
}
.zm-card-hdr-left { display: flex; align-items: center; gap: 10px; }
.zm-card-ttl { font-size: 14.5px; font-weight: 700; }
.zm-count-pill {
  font-size: 11.5px; font-weight: 700;
  background: #f1f5f9; color: #475569;
  border-radius: 20px; padding: 2px 9px;
}

/* ── Skeleton ── */
.zm-skeleton-wrap { padding: 8px 0; }
.zm-skeleton-row {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 22px; border-bottom: 1px solid #f8fafc;
  animation: zm-fade-in .4s ease both;
}
.zm-skel {
  background: linear-gradient(90deg, #f1f5f9 25%, #e8edf5 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: zm-shimmer 1.4s infinite;
  border-radius: 6px;
}
.zm-skel-avatar { width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0; }
.zm-skel-lines  { flex: 1; display: flex; flex-direction: column; gap: 7px; }
.zm-skel-line   { height: 12px; }
.zm-skel-lg     { width: 55%; }
.zm-skel-sm     { width: 32%; }
.zm-skel-md     { width: 80px; height: 12px; }

/* ── Empty ── */
.zm-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 68px 24px; gap: 10px; text-align: center;
}
.zm-empty-ico {
  width: 58px; height: 58px; border-radius: 16px;
  background: #f1f5f9; color: #94a3b8;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 6px;
}
.zm-empty-title { font-size: 17px; font-weight: 700; }
.zm-empty-sub   { font-size: 13px; color: #94a3b8; margin-bottom: 8px; }

/* ── Table ── */
.zm-table-wrap { overflow-x: auto; }
.zm-table { width: 100%; border-collapse: collapse; }
.zm-thead-tr { background: #f8fafc; }
.zm-th {
  padding: 11px 18px; text-align: left;
  font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .7px; color: #64748b;
  border-bottom: 1px solid #f1f5f9; white-space: nowrap;
}
.zm-th-actions { text-align: right; }
.zm-tr {
  border-bottom: 1px solid #f8fafc;
  animation: zm-fade-in .32s ease calc(var(--delay)) both;
  transition: background .13s;
}
.zm-tr:last-child { border-bottom: none; }
.zm-tr:hover { background: #fafbfd; }
.zm-td { padding: 13px 18px; vertical-align: middle; font-size: 13.5px; }
.zm-td-main { min-width: 220px; }
.zm-td-actions { text-align: right; }

/* ── Row Topic ── */
.zm-row-topic { display: flex; align-items: center; gap: 11px; }
.zm-avatar {
  width: 36px; height: 36px; border-radius: 9px;
  color: #fff; font-size: 14px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.zm-row-name { font-weight: 600; font-size: 13.5px; display: block; }
.zm-row-sub  { font-size: 11.5px; color: #94a3b8; margin-top: 2px; display: block;
  max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Row Date/Time ── */
.zm-row-date { font-size: 13px; font-weight: 500; color: #1e293b; }
.zm-row-time { font-size: 11.5px; color: #94a3b8; margin-top: 2px; }

/* ── Pill ── */
.zm-pill {
  display: inline-flex; align-items: center; gap: 5px;
  background: #f1f5f9; border-radius: 20px;
  padding: 4px 10px; font-size: 12px; font-weight: 600; color: #475569;
}

/* ── Host ── */
.zm-host-you {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 700; color: #0f172a;
  background: #f1f5f9; border-radius: 20px; padding: 3px 9px;
}
.zm-host-name { font-size: 13px; color: #475569; }

/* ── Badges ── */
.zm-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 20px;
  font-size: 11.5px; font-weight: 700; letter-spacing: .1px;
}
.badge-green { background: #dcfce7; color: #15803d; }
.badge-amber { background: #fef9c3; color: #a16207; }
.badge-live  {
  background: #fee2e2; color: #b91c1c;
  animation: zm-live-pulse 2s ease infinite;
}
.badge-slate { background: #f1f5f9; color: #64748b; }

/* ── Row Actions ── */
.zm-row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; flex-wrap: wrap; }
.zm-act-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 11px; border-radius: 7px;
  font-size: 12px; font-weight: 600;
  border: 1.5px solid transparent; cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all .15s; white-space: nowrap;
}
.zm-act-btn:disabled { opacity: .5; cursor: not-allowed; }
.zm-act-view  { background: #f8fafc; border-color: #e2e8f0; color: #475569; }
.zm-act-view:hover:not(:disabled)  { background: #f1f5f9; border-color: #cbd5e1; }
.zm-act-join  { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
.zm-act-join:hover:not(:disabled)  { background: #dbeafe; }
.zm-act-start { background: #0f172a; border-color: #0f172a; color: #fff; }
.zm-act-start:hover:not(:disabled) { background: #1e293b; }
.zm-act-end   { background: #fff; border-color: #fca5a5; color: #dc2626; }
.zm-act-end:hover:not(:disabled)   { background: #fef2f2; }

/* ── Buttons ── */
.zm-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 9px;
  font-size: 13.5px; font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer; border: none;
  transition: all .16s; white-space: nowrap;
}
.zm-btn:disabled { opacity: .5; cursor: not-allowed; }
.zm-btn-sm { padding: 7px 13px; font-size: 13px; }
.zm-btn-primary {
  background: #0f172a; color: #fff;
  box-shadow: 0 2px 10px rgba(15,23,42,.2);
}
.zm-btn-primary:hover:not(:disabled) { background: #1e293b; transform: translateY(-1px); }
.zm-btn-ghost {
  background: #fff; color: #475569;
  border: 1.5px solid #e2e8f0;
}
.zm-btn-ghost:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
.zm-btn-join  { background: #1d4ed8; color: #fff; }
.zm-btn-join:hover:not(:disabled) { background: #1e40af; }
.zm-btn-start { background: #0f172a; color: #fff; }
.zm-btn-start:hover:not(:disabled) { background: #1e293b; }
.zm-btn-end   { background: #fff; color: #dc2626; border: 1.5px solid #fca5a5; }
.zm-btn-end:hover:not(:disabled)   { background: #fef2f2; }

/* ── Modal ── */
.zm-backdrop {
  position: fixed; inset: 0;
  background: rgba(15,23,42,.5);
  backdrop-filter: blur(5px);
  z-index: 1040;
  animation: zm-fade-in .18s ease;
}
.zm-modal {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: calc(100% - 32px); max-height: 90vh;
  background: #fff; border-radius: 18px;
  box-shadow: 0 24px 80px rgba(0,0,0,.18);
  z-index: 1050; display: flex; flex-direction: column;
  animation: zm-slide-up .22s cubic-bezier(.34,1.56,.64,1);
  font-family: 'DM Sans', sans-serif;
  overflow: hidden;
}
.zm-modal-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 22px 16px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0;
}
.zm-modal-hdr-left { display: flex; align-items: center; gap: 11px; }
.zm-modal-ico {
  width: 36px; height: 36px; border-radius: 9px;
  background: #f1f5f9; color: #0f172a;
  display: flex; align-items: center; justify-content: center;
}
.zm-modal-ttl { font-size: 16px; font-weight: 700; margin: 0; }
.zm-icon-btn {
  width: 30px; height: 30px; border-radius: 7px;
  background: #f1f5f9; border: none; color: #64748b;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background .13s;
}
.zm-icon-btn:hover { background: #e2e8f0; color: #0f172a; }

.zm-modal-body {
  padding: 20px 22px;
  overflow-y: auto; flex: 1;
}
.zm-modal-ftr {
  padding: 14px 22px 18px; border-top: 1px solid #f1f5f9; flex-shrink: 0;
}
.zm-modal-ftr-btns { display: flex; justify-content: flex-end; gap: 8px; }
.zm-detail-actions {
  display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;
}

/* ── Form ── */
.zm-form-grid { display: flex; flex-direction: column; gap: 16px; }
.zm-form-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.zm-field { display: flex; flex-direction: column; gap: 5px; }
.zm-field-label { font-size: 12.5px; font-weight: 600; color: #374151; }
.zm-req { color: #ef4444; margin-left: 2px; }
.zm-field-hint { font-size: 11.5px; color: #94a3b8; }
.zm-input {
  width: 100%; padding: 8.5px 12px;
  border: 1.5px solid #e2e8f0; border-radius: 9px;
  font-size: 13.5px; font-family: 'DM Sans', sans-serif;
  color: #0f172a; background: #fff; outline: none;
  transition: border-color .15s, box-shadow .15s;
  box-sizing: border-box;
}
.zm-input:focus { border-color: #0f172a; box-shadow: 0 0 0 3px rgba(15,23,42,.08); }
.zm-textarea { resize: vertical; min-height: 78px; }
.zm-input-icon-wrap {
  position: relative; display: flex; align-items: center;
}
.zm-input-icon-wrap > svg {
  position: absolute; left: 11px; color: #94a3b8; pointer-events: none;
}
.zm-input-with-icon { padding-left: 32px; }

/* ── Detail Modal Content ── */
.zm-detail-banner {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; border-radius: 10px; margin-bottom: 16px;
  border: 1px solid #e2e8f0; background: #f8fafc;
}
.zm-detail-banner.zm-banner-started { background: #fef2f2; border-color: #fecaca; }
.zm-detail-banner.zm-banner-finished { background: #f8fafc; border-color: #e2e8f0; }
.zm-detail-id { font-family: 'DM Mono', monospace; font-size: 11.5px; color: #94a3b8; }
.zm-detail-list { display: flex; flex-direction: column; gap: 1px; }
.zm-detail-row {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 10px 12px; border-radius: 8px; transition: background .12s;
}
.zm-detail-row:hover { background: #f8fafc; }
.zm-detail-ico { color: #94a3b8; margin-top: 1px; flex-shrink: 0; }
.zm-detail-content { display: flex; flex-direction: column; gap: 1px; }
.zm-detail-label { font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: #94a3b8; }
.zm-detail-val { font-size: 13.5px; font-weight: 500; color: #0f172a; }
.zm-detail-val.mono { font-family: 'DM Mono', monospace; font-size: 12px; }
.zm-url-link {
  display: inline-flex; align-items: center; gap: 5px;
  color: #1d4ed8; text-decoration: none; font-size: 12px;
}
.zm-url-link:hover { text-decoration: underline; }

/* ── Spin ── */
.zm-spin-wrap {
  display: inline-flex; align-items: center; justify-content: center;
  animation: zm-spin .75s linear infinite;
}

/* ── Animations ── */
@keyframes zm-spin       { to { transform: rotate(360deg); } }
@keyframes zm-fade-in    { from { opacity: 0; } to { opacity: 1; } }
@keyframes zm-slide-up   {
  from { opacity: 0; transform: translate(-50%, -46%); }
  to   { opacity: 1; transform: translate(-50%, -50%); }
}
@keyframes zm-shimmer    { to { background-position: -200% 0; } }
@keyframes zm-live-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,.3); }
  50%     { box-shadow: 0 0 0 5px rgba(220,38,38,0); }
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .zm-page { padding: 16px 16px 48px; }
  .zm-page-hdr { flex-direction: column; align-items: flex-start; }
  .zm-hdr-right { width: 100%; justify-content: flex-end; }
  .zm-stats-grid { grid-template-columns: 1fr 1fr; }
  .zm-form-2col  { grid-template-columns: 1fr; }
  .zm-td-actions { display: none; }
}
`;
