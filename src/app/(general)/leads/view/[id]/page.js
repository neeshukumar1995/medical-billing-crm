'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  FiActivity, FiCheckCircle, FiClock,
  FiUser, FiFileText, FiEdit, FiUpload, FiX, FiEye,
  FiStar, FiLock, FiMail, FiPhone, FiMapPin, FiGlobe, FiLinkedin,
  FiTrendingUp, FiBriefcase, FiCalendar, FiDollarSign,
  FiChevronRight, FiZap, FiAlertCircle, FiChevronDown, FiArrowLeft
} from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Spinner from '@/components/shared/Spinner'
import SelectDropdown from '@/components/shared/SelectDropdown'
import crmInstance from '@/utils/crmInstance'
import { BACKEND_BASE_URL } from '@/config/api'
import Swal from 'sweetalert2'
import { usePermissions } from '@/hooks/usePermissions'
import { decryptId } from '@/utils/decryptId'
import { encryptId } from '@/utils/encryptId'
import { formatDate, formatDateTime, todayInputDate } from '@/utils/formatDate'

const AddNoteModal = dynamic(() => import('@/components/leads/AddNoteModal'), { ssr: false })

/* ─────────────────────────────────────────────
   GLOBAL STYLES — same compact design used by
   LeadViewModal (the popup version)
───────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

    :root {
      --ink:        #0D0F1A;
      --ink-soft:   #3D4155;
      --ink-muted:  #7B8099;
      --surface:    #FFFFFF;
      --surface-2:  #F6F7FB;
      --surface-3:  #ECEEF6;
      --border:     rgba(0,0,0,0.07);
      --accent:     #4F46E5;
      --accent-2:   #7C3AED;
      --accent-glow:rgba(79,70,229,0.18);
      --success:    #059669;
      --warning:    #D97706;
      --danger:     #DC2626;
      --info:       #0EA5E9;
      --gold:       #F59E0B;
      --radius-sm:  8px;
      --radius-md:  14px;
      --radius-lg:  18px;
      --radius-xl:  22px;
      --shadow-sm:  0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);
      --shadow-md:  0 4px 16px rgba(0,0,0,0.07),0 1px 4px rgba(0,0,0,0.05);
      --shadow-lg:  0 12px 40px rgba(0,0,0,0.10),0 4px 12px rgba(0,0,0,0.06);
      --shadow-glow:0 0 0 3px var(--accent-glow);
    }

    .lv-root * { box-sizing:border-box; }

    /* ── LAYOUT ── */
    .lv-root { background:var(--surface-2); min-height:100vh; padding:0 0 48px; }

    .lv-hero {
      position:relative; overflow:hidden;
      padding:20px 24px 28px;
      background: var(--surface);
      border-bottom:1px solid var(--border);
    }

    .lv-back-btn {
      display:inline-flex; align-items:center; gap:8px;
      color:var(--ink-muted); font-size:12px; font-weight:500;
      background:var(--surface-2); border:1px solid var(--border);
      padding:7px 14px; border-radius:50px; text-decoration:none;
      transition:all .2s; cursor:pointer; margin-bottom:18px;
    }
    .lv-back-btn:hover { background:var(--surface-3); color:var(--ink); }

    .lv-hero-avatar {
      width:54px; height:54px; border-radius:16px;
      background:linear-gradient(135deg,var(--accent),var(--accent-2));
      display:flex; align-items:center; justify-content:center;
      font-size:20px; font-weight:800;
      color:#fff; flex-shrink:0;
      box-shadow: 0 8px 24px rgba(79,70,229,0.4);
    }
    .lv-hero-name { font-size:22px; font-weight:700; color:var(--ink); margin:0 0 4px; }
    .lv-hero-company { color:var(--ink-muted); font-size:13px; }
    .lv-hero-badge {
      display:inline-flex; align-items:center; gap:6px;
      padding:6px 14px; border-radius:50px; font-size:12px; font-weight:600;
    }
    .lv-hero-badge .dot { width:7px; height:7px; border-radius:50%; }

    /* ── CARDS ── */
    .lv-card {
      background:var(--surface); border-radius:var(--radius-lg);
      border:1px solid var(--border); box-shadow:var(--shadow-md);
      overflow:hidden;
    }
    .lv-card-header {
      padding:14px 18px; border-bottom:1px solid transparent;
      display:flex; align-items:center; justify-content:space-between;
      cursor:pointer; user-select:none; transition:background .15s;
    }
    .lv-card-header:hover { background:var(--surface-2); }
    .lv-card-header.is-open { border-bottom-color:var(--border); }
    .lv-card-title {
      font-size:13.5px; font-weight:700;
      color:var(--ink); letter-spacing:0.2px;
      display:flex; align-items:center; gap:8px;
    }
    .lv-card-title-icon {
      width:28px; height:28px; border-radius:8px;
      display:flex; align-items:center; justify-content:center; font-size:13px;
      flex-shrink:0;
    }
    .lv-card-body { padding:18px; }
    .lv-card-chevron {
      color:var(--ink-muted); transition:transform .25s ease; flex-shrink:0;
    }
    .lv-card-chevron.open { transform:rotate(180deg); color:var(--accent); }
    .lv-card-count {
      font-size:11px; font-weight:700; color:var(--ink-muted);
      background:var(--surface-2); padding:2px 9px; border-radius:50px;
    }

    /* ── INFO ROWS ── */
    .lv-info-grid { display:grid; gap:2px; }
    .lv-info-row {
      display:flex; align-items:center; justify-content:space-between;
      padding:10px 12px; border-radius:10px; transition:background .15s;
    }
    .lv-info-row:hover { background:var(--surface-2); }
    .lv-info-label {
      display:flex; align-items:center; gap:9px;
      font-size:12.5px; color:var(--ink-muted); font-weight:500; flex-shrink:0;
    }
    .lv-info-label svg { flex-shrink:0; color:var(--ink-muted); }
    .lv-info-value {
      font-size:12.5px; font-weight:600; color:var(--ink);
      text-align:right; max-width:55%;
    }
    .lv-info-value.link { color:var(--accent); text-decoration:none; }
    .lv-info-value.link:hover { text-decoration:underline; }

    /* ── STATUS BADGE ── */
    .lv-status {
      display:inline-flex; align-items:center; gap:6px;
      padding:5px 12px; border-radius:50px; font-size:12px; font-weight:700;
      letter-spacing:0.3px; cursor:pointer; transition:all .2s;
      border:1.5px solid transparent;
    }
    .lv-status:hover { transform:scale(1.03); box-shadow:var(--shadow-sm); }
    .lv-status .s-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
    .lv-status.new     { background:#EFF6FF; color:#1D4ED8; border-color:#BFDBFE; }
    .lv-status.new .s-dot { background:#1D4ED8; }
    .lv-status.progress{ background:#FFFBEB; color:#B45309; border-color:#FDE68A; }
    .lv-status.progress .s-dot { background:#D97706; }
    .lv-status.qualified{ background:#ECFDF5; color:#065F46; border-color:#A7F3D0; }
    .lv-status.qualified .s-dot { background:#059669; }
    .lv-status.converted{ background:#EDE9FE; color:#5B21B6; border-color:#C4B5FD; }
    .lv-status.converted .s-dot { background:#7C3AED; }
    .lv-status.lost    { background:#FEF2F2; color:#991B1B; border-color:#FECACA; }
    .lv-status.lost .s-dot { background:#DC2626; }
    .lv-status.default { background:#F3F4F6; color:#374151; border-color:#E5E7EB; }
    .lv-status.default .s-dot { background:#6B7280; }

    /* ── NOTES ── */
    .lv-note {
      border-radius:12px; padding:14px;
      border-left:3px solid var(--accent);
      background:var(--surface-2);
      margin-bottom:10px; transition:transform .2s;
    }
    .lv-note:hover { transform:translateX(3px); }
    .lv-note:last-child { margin-bottom:0; }
    .lv-note-author { font-size:12.5px; font-weight:700; color:var(--ink); }
    .lv-note-date { font-size:11px; color:var(--ink-muted); }
    .lv-note-text { font-size:12.5px; color:var(--ink-soft); margin-top:6px; line-height:1.6; }

    /* ── ACTIVITY ── */
    .lv-activity-item {
      display:flex; gap:12px; align-items:flex-start;
      padding:10px; border-radius:10px; transition:background .15s;
      position:relative;
    }
    .lv-activity-item:not(:last-child)::after {
      content:''; position:absolute; left:22px; top:40px;
      width:1px; height:calc(100% - 8px);
      background:linear-gradient(to bottom, var(--border), transparent);
    }
    .lv-activity-item:hover { background:var(--surface-2); }
    .lv-activity-icon {
      width:32px; height:32px; border-radius:10px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      font-size:13px; position:relative; z-index:1;
    }
    .lv-activity-action { font-size:12.5px; font-weight:500; color:var(--ink); line-height:1.4; }
    .lv-activity-meta { font-size:11px; color:var(--ink-muted); margin-top:3px; }
    .lv-activity-user { color:var(--accent); font-weight:600; }

    /* ── DOCUMENTS ── */
    .lv-doc-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
    .lv-doc-card {
      border-radius:12px; border:1.5px solid var(--border);
      overflow:hidden; cursor:pointer; transition:all .2s; position:relative;
      background:var(--surface-2);
    }
    .lv-doc-card:hover {
      border-color:var(--accent); box-shadow:var(--shadow-glow),var(--shadow-md);
      transform:translateY(-2px);
    }
    .lv-doc-thumb {
      height:64px; display:flex; align-items:center; justify-content:center;
    }
    .lv-doc-thumb img { width:100%; height:100%; object-fit:cover; }
    .lv-doc-label { font-weight:700; font-size:14px; letter-spacing:1px; }
    .lv-doc-info { padding:9px; }
    .lv-doc-name { font-size:11px; font-weight:600; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .lv-doc-date { font-size:10px; color:var(--ink-muted); margin-top:2px; }
    .lv-doc-del {
      position:absolute; top:6px; right:6px;
      width:22px; height:22px; border-radius:6px;
      background:rgba(220,38,38,0.9); color:#fff;
      border:none; display:flex; align-items:center; justify-content:center;
      font-size:11px; cursor:pointer; opacity:0; transition:opacity .2s;
    }
    .lv-doc-card:hover .lv-doc-del { opacity:1; }
    .lv-doc-overlay {
      position:absolute; inset:0; background:rgba(79,70,229,0.7);
      display:flex; align-items:center; justify-content:center;
      color:#fff; font-size:18px; opacity:0; transition:opacity .2s; border-radius:11px;
    }
    .lv-doc-card:hover .lv-doc-overlay { opacity:1; }

    /* ── UPLOAD BTN ── */
    .lv-upload-btn {
      display:inline-flex; align-items:center; gap:6px;
      padding:6px 12px; border-radius:8px; font-size:11.5px; font-weight:600;
      background:var(--accent-glow); color:var(--accent);
      border:1px solid var(--border); cursor:pointer;
      transition:all .2s;
    }
    .lv-upload-btn:hover { background:var(--accent); color:#fff; }

    /* ── VIEW ALL BTN ── */
    .lv-view-all {
      display:inline-flex; align-items:center; gap:6px;
      font-size:12px; font-weight:600; color:var(--accent);
      text-decoration:none; padding:8px 16px;
      background:var(--accent-glow); border-radius:8px;
      transition:all .2s;
    }
    .lv-view-all:hover { background:var(--accent); color:#fff; }

    /* ── STATS ROW ── */
    .lv-stat-card {
      flex:1; min-width:100px; background:var(--surface-2); border:1px solid var(--border);
      border-radius:12px; padding:12px 14px;
    }
    .lv-stat-label { font-size:10px; color:var(--ink-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.8px; }
    .lv-stat-value { font-size:15px; font-weight:800; color:var(--ink); margin-top:3px; }

    /* ── MODAL (status / document sub-modals) ── */
    .lv-modal-wrap {
      position:fixed; inset:0; z-index:1155;
      display:flex; align-items:center; justify-content:center;
      padding:20px;
    }
    .lv-modal-backdrop {
      position:fixed; inset:0; background:rgba(13,15,26,0.7);
      backdrop-filter:blur(6px); z-index:1150;
    }
    .lv-modal {
      background:var(--surface); border-radius:var(--radius-xl);
      box-shadow:var(--shadow-lg); z-index:1156; width:100%; max-width:480px;
      max-height:90vh; display:flex; flex-direction:column; overflow:hidden;
    }
    .lv-modal-head {
      padding:18px 22px; border-bottom:1px solid var(--border);
      display:flex; align-items:center; justify-content:space-between;
    }
    .lv-modal-title { font-size:15px; font-weight:700; color:var(--ink); }
    .lv-modal-close {
      width:30px; height:30px; border-radius:8px; border:1px solid var(--border);
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; background:var(--surface-2); color:var(--ink-muted);
      transition:all .15s;
    }
    .lv-modal-close:hover { background:var(--danger); color:#fff; border-color:var(--danger); }
    .lv-modal-body { flex:1; overflow:auto; }
    .lv-modal-foot {
      padding:14px 22px; border-top:1px solid var(--border);
      display:flex; justify-content:space-between; align-items:center;
    }

    /* ── STATUS MODAL FORM ── */
    .lv-form-label { font-size:11px; font-weight:700; color:var(--ink-soft); letter-spacing:0.4px; text-transform:uppercase; margin-bottom:7px; }
    .lv-form-control {
      width:100%; padding:9px 13px; border-radius:10px;
      border:1.5px solid var(--border); background:var(--surface-2);
      font-size:13px; color:var(--ink); outline:none; transition:border .15s;
    }
    .lv-form-control:focus { border-color:var(--accent); background:#fff; }
    .lv-btn {
      display:inline-flex; align-items:center; gap:6px;
      padding:9px 18px; border-radius:10px; font-size:12.5px; font-weight:600;
      border:none; cursor:pointer; transition:all .2s;
    }
    .lv-btn-primary { background:var(--accent); color:#fff; }
    .lv-btn-primary:hover { background:#4338CA; box-shadow:0 4px 12px rgba(79,70,229,0.35); }
    .lv-btn-secondary { background:var(--surface-3); color:var(--ink-soft); }
    .lv-btn-secondary:hover { background:var(--surface-2); }

    /* ── PERMISSION LOCK ── */
    .lv-lock { text-align:center; padding:32px 20px; }
    .lv-lock-icon {
      width:50px; height:50px; border-radius:14px;
      background:var(--surface-3); display:flex; align-items:center; justify-content:center;
      margin:0 auto 14px; font-size:20px; color:var(--ink-muted);
    }

    /* ── EMPTY STATE ── */
    .lv-empty { text-align:center; padding:28px 18px; }
    .lv-empty-icon {
      width:52px; height:52px; border-radius:16px;
      background:linear-gradient(135deg, var(--surface-3), var(--surface-2));
      display:flex; align-items:center; justify-content:center;
      margin:0 auto 12px; font-size:21px; color:var(--ink-muted);
    }
    .lv-empty-title { font-weight:700; font-size:14px; color:var(--ink); margin-bottom:5px; }
    .lv-empty-sub { font-size:11.5px; color:var(--ink-muted); }

    /* ── TAGS ── */
    .lv-tag {
      display:inline-flex; align-items:center;
      padding:4px 10px; border-radius:50px; font-size:11px; font-weight:700;
      background:linear-gradient(135deg,var(--accent),var(--accent-2)); color:#fff;
    }

    /* ── RESPONSIVE ── */
    @media(max-width:640px){
      .lv-doc-grid { grid-template-columns:repeat(2,1fr); }
      .lv-hero { padding:18px 16px 34px; }
      .lvp-content-grid { grid-template-columns:1fr !important; }
    }

    .lv-scroll::-webkit-scrollbar { width:4px; }
    .lv-scroll::-webkit-scrollbar-track { background:transparent; }
    .lv-scroll::-webkit-scrollbar-thumb { background:var(--surface-3); border-radius:4px; }

    @keyframes lvFadeUp {
      from { opacity:0; transform:translateY(12px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .lv-anim { animation:lvFadeUp .35s ease both; }
    .lv-anim-1 { animation-delay:.04s; }
    .lv-anim-2 { animation-delay:.08s; }
    .lv-anim-3 { animation-delay:.12s; }
    .lv-anim-4 { animation-delay:.16s; }

    @keyframes lvmSpin { to { transform: rotate(360deg); } }

    @keyframes lvExpand {
      from { opacity:0; max-height:0; }
      to   { opacity:1; max-height:2000px; }
    }
    .lv-card-body-wrap { animation:lvExpand .28s ease both; overflow:hidden; }
  `}</style>
)

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const showSwal = (options) =>
  new Promise((resolve) => {
    const fire = () => Swal.fire(options).then(resolve)
    typeof window !== 'undefined' && document.readyState === 'complete'
      ? fire()
      : setTimeout(fire, 50)
  })

const renderField = (value) => {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') {
    if (value.name) return value.name
    if (value.username) return value.username
    if (value.email) return value.email
    return JSON.stringify(value)
  }
  return String(value)
}

const getStatusClass = (status) => {
  const s = status?.toLowerCase() || ''
  if (s.includes('progress') || s.includes('in_progress')) return 'progress'
  if (s.includes('converted')) return 'converted'
  if (s.includes('complete') || s.includes('closed') || s.includes('qualified')) return 'qualified'
  if (s.includes('lost') || s.includes('cancel')) return 'lost'
  if (s.includes('new') || s.includes('fresh')) return 'new'
  return 'default'
}

const parseServices = (serviceData) => {
  if (Array.isArray(serviceData)) return serviceData
  if (typeof serviceData === 'string' && serviceData.includes(',')) return serviceData.split(',').map(s => s.trim())
  return serviceData ? [serviceData] : []
}

const initials = (name) => {
  if (!name) return 'LD'
  const parts = name.split(' ').filter(Boolean)
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

const fmtDate = (d) => d ? formatDate(d) : '—'

const fmtDateTime = (d) => d ? formatDateTime(d) : '—'

/* ─────────────────────────────────────────────
   COLLAPSIBLE CARD
───────────────────────────────────────────── */
const CollapsibleCard = ({
  icon, iconBg, iconColor, title, count, action,
  defaultOpen = false, animClass = '',
  headerBg, headerColor, headerIconBg,
  children
}) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`lv-card lv-anim ${animClass}`}>
      <div
        className={`lv-card-header ${open ? 'is-open' : ''}`}
        style={headerBg ? { background: headerBg } : undefined}
        onClick={() => setOpen(o => !o)}
      >
        <div className="lv-card-title" style={headerColor ? { color: headerColor } : undefined}>
          <div
            className="lv-card-title-icon"
            style={{ background: headerIconBg || iconBg, color: headerColor || iconColor }}
          >
            {icon}
          </div>
          {title}
          {typeof count === 'number' && (
            <span
              className="lv-card-count"
              style={headerBg ? { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' } : undefined}
            >
              {count}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {action && <span onClick={(e) => e.stopPropagation()}>{action}</span>}
          <FiChevronDown size={16} className={`lv-card-chevron ${open ? 'open' : ''}`} style={headerBg ? { color: 'rgba(255,255,255,0.7)' } : undefined} />
        </div>
      </div>
      {open && (
        <div className="lv-card-body-wrap">
          <div className="lv-card-body">{children}</div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   DOCUMENT MODAL (preview sub-modal)
───────────────────────────────────────────── */
const DocumentModal = ({ show, onClose, document, companyId }) => {
  if (!show || !document) return null

  const isImage = document.file_path?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  const isPdf   = document.file_path?.match(/\.pdf$/i)
  const downloadUrl = `${BACKEND_BASE_URL}/documents/${document.id}/download/${companyId ? JSON.parse(companyId) : ''}`

  const getDocUrl = () => document.file_path.startsWith('http')
    ? document.file_path
    : `${BACKEND_BASE_URL}/${document.file_path}`

  return (
    <>
      <div className="lv-modal-backdrop" onClick={onClose} />
      <div className="lv-modal-wrap">
        <div className="lv-modal lv-anim" style={{ maxWidth: 860 }}>
          <div className="lv-modal-head">
            <div className="lv-modal-title" style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,var(--accent),var(--accent-2))',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:14}}>
                <FiFileText />
              </div>
              {document.original_name || 'Document'}
            </div>
            <button className="lv-modal-close" onClick={onClose}><FiX size={14}/></button>
          </div>
          <div className="lv-modal-body">
            {isImage ? (
              <div style={{textAlign:'center',padding:32}}>
                <img src={getDocUrl()} alt={document.original_name} style={{maxWidth:'100%',maxHeight:'68vh',borderRadius:12,boxShadow:'var(--shadow-lg)'}} />
              </div>
            ) : isPdf ? (
              <iframe src={getDocUrl()} width="100%" style={{height:'68vh',border:'none'}} title="PDF" />
            ) : (
              <div className="lv-empty" style={{padding:60}}>
                <div className="lv-empty-icon"><FiFileText/></div>
                <div className="lv-empty-title">Preview not available</div>
                <div className="lv-empty-sub" style={{marginBottom:20}}>This file type cannot be previewed in browser</div>
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="lv-btn lv-btn-primary" style={{textDecoration:'none',margin:'0 auto'}}>
                  Download File
                </a>
              </div>
            )}
          </div>
          <div className="lv-modal-foot">
            <span style={{fontSize:12,color:'var(--ink-muted)'}}>
              {document.document_type?.toUpperCase() || 'File'} · {fmtDateTime(document.created_at)}
              {document.uploader && ` · by ${document.uploader.name}`}
            </span>
            <div style={{display:'flex',gap:8}}>
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="lv-btn lv-btn-secondary" style={{textDecoration:'none',fontSize:12}}>
                <FiUpload size={13}/> Download
              </a>
              <button className="lv-btn lv-btn-secondary" onClick={onClose} style={{fontSize:12}}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────
   DOCUMENT CARD
───────────────────────────────────────────── */
const DocCard = ({ doc, onView, onDelete, canManage }) => {
  const isImage = doc.file_path?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  const isPdf   = doc.file_path?.match(/\.pdf$/i)
  const isDoc   = doc.file_path?.match(/\.(doc|docx)$/i)
  const isExcel = doc.file_path?.match(/\.(xls|xlsx)$/i)

  const getDocUrl = () => doc.file_path?.startsWith('http')
    ? doc.file_path : `${BACKEND_BASE_URL}/${doc.file_path}`

  const thumbColor  = isPdf ? '#FEE2E2' : isDoc ? '#DBEAFE' : isExcel ? '#DCFCE7' : '#F3E8FF'
  const thumbText   = isPdf ? '#DC2626' : isDoc ? '#1D4ED8' : isExcel ? '#16A34A' : '#7C3AED'
  const thumbLabel  = isPdf ? 'PDF' : isDoc ? 'DOC' : isExcel ? 'XLS' : 'FILE'

  return (
    <div className="lv-doc-card" onClick={() => onView(doc)}>
      <div className="lv-doc-thumb" style={{background: isImage ? '#000' : thumbColor}}>
        {isImage
          ? <img src={getDocUrl()} alt={doc.original_name} onError={e => { e.target.style.display='none' }} />
          : <span className="lv-doc-label" style={{color:thumbText}}>{thumbLabel}</span>
        }
      </div>
      <div className="lv-doc-overlay"><FiEye/></div>
      {canManage && (
        <button className="lv-doc-del" onClick={e => { e.stopPropagation(); onDelete(doc.id) }}>
          <FiX size={10}/>
        </button>
      )}
      <div className="lv-doc-info">
        <div className="lv-doc-name" title={doc.original_name}>{doc.original_name || 'Document'}</div>
        <div className="lv-doc-date">{fmtDate(doc.created_at)}</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   ACTIVITY CARD (collapsible)
───────────────────────────────────────────── */
const ActivityCard = ({ activities, leadId, companyId }) => {
  const icons = [
    { test: a => a.includes('assigned'), icon: <FiUser size={13}/>, bg:'#EDE9FE', color:'#7C3AED' },
    { test: a => a.includes('status'),   icon: <FiZap size={13}/>,  bg:'#FFFBEB', color:'#D97706' },
    { test: a => a.includes('service'),  icon: <FiCheckCircle size={13}/>, bg:'#ECFDF5', color:'#059669' },
    { test: () => true,                  icon: <FiActivity size={13}/>, bg:'#EFF6FF', color:'#1D4ED8' },
  ]
  const getIcon = (action) => {
    const m = icons.find(i => i.test(action))
    return m || icons[icons.length - 1]
  }

  return (
    <CollapsibleCard
      icon={<FiClock size={13}/>} iconBg="#EFF6FF" iconColor="#1D4ED8"
      title="Recent Activity" animClass="lv-anim-4"
    >
      {activities.length > 0 ? (
        <>
          {activities.map((act, i) => {
            const { icon, bg, color } = getIcon(act.action)
            return (
              <div key={act.id || i} className="lv-activity-item">
                <div className="lv-activity-icon" style={{background:bg, color}}>{icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div className="lv-activity-action">{act.action}</div>
                  <div className="lv-activity-meta">
                    {fmtDateTime(act.created_at)} · <span className="lv-activity-user">by {act.user}</span>
                  </div>
                </div>
              </div>
            )
          })}
          <div style={{marginTop:14,textAlign:'center'}}>
            <Link href={`/leads/history/${encryptId(companyId ? JSON.parse(companyId) : '')}/${encryptId(leadId)}`} className="lv-view-all">
              <FiActivity size={12}/> View All History <FiChevronRight size={12}/>
            </Link>
          </div>
        </>
      ) : (
        <div className="lv-empty">
          <div className="lv-empty-icon"><FiActivity/></div>
          <div className="lv-empty-title">No activity yet</div>
          <div className="lv-empty-sub">Activities will appear here</div>
        </div>
      )}
    </CollapsibleCard>
  )
}

/* ─────────────────────────────────────────────
   MAIN PAGE — same design & functionality as
   LeadViewModal (popup), rendered as a full page
───────────────────────────────────────────── */
const page = () => {
  const { hasPermission } = usePermissions()
  const params = useParams()
  const router = useRouter()
  const leadId = decryptId(params.id)

  const [lead,            setLead]            = useState(null)
  const [activities,      setActivities]      = useState([])
  const [documents,       setDocuments]       = useState([])
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState('')
  const [uploading,       setUploading]       = useState(false)
  const [showDocModal,    setShowDocModal]    = useState(false)
  const [selectedDoc,     setSelectedDoc]     = useState(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selectedLead,    setSelectedLead]    = useState(null)
  const [statusNotes,     setStatusNotes]     = useState('')
  const [selectedStatusId,setSelectedStatusId]= useState('')
  const [followupDate,    setFollowupDate]    = useState('')
  const [sellingPrice,    setSellingPrice]    = useState('')
  const [leadStatuses,    setLeadStatuses]    = useState([])
  const [showNoteModal,   setShowNoteModal]   = useState(false)
  const [noteText,        setNoteText]        = useState('')
  const [submittingNote,  setSubmittingNote]  = useState(false)

  const [companyId] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('companyId') : null
  )

  /* ── fetch main data ── */
  useEffect(() => {
    if (!leadId) { setError('Invalid lead ID'); setLoading(false); return }

    const fetchData = async () => {
      try {
        const cid = companyId ? JSON.parse(companyId) : null
        if (!cid) return

        setLoading(true)
        const [leadRes, actRes, statusRes] = await Promise.all([
          crmInstance.get(`/leads/${cid}/${leadId}`),
          crmInstance.get(`/leads/${cid}/recent-activities?limit=5`),
          crmInstance.get(`/lead-status/${cid}`)
        ])

        let ld = leadRes.data?.data || leadRes.data?.lead || leadRes.data || null
        if (typeof ld === 'string') { try { ld = JSON.parse(ld) } catch { ld = null } }
        setLead(ld || { id: leadId, client_name: 'Unknown Lead' })
        setActivities(actRes.data?.data || [])

        const sd = statusRes.data.data.data || statusRes.data.data || statusRes.data || []
        setLeadStatuses(Array.isArray(sd) ? sd.map(i => ({ value: String(i.id), label: i.name })) : [])
        setError('')
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load lead details.')
      } finally { setLoading(false) }
    }
    if (companyId) fetchData()
  }, [leadId, companyId])

  /* ── fetch documents ── */
  const fetchDocuments = async () => {
    try {
      const cid = companyId ? JSON.parse(companyId) : null
      if (!cid || !leadId) return
      const res = await crmInstance.get(`/leads/${leadId}/documents/${cid}`)
      const raw = res.data?.data || []
      setDocuments(raw.map(d => ({
        id: d.id, original_name: d.document_name,
        file_path: d.document_path, document_type: d.document_type,
        created_at: d.created_at, uploader: d.uploader
      })))
    } catch { setDocuments([]) }
  }

  useEffect(() => { if (leadId && companyId) fetchDocuments() }, [leadId, companyId])

  /* ── upload ── */
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      const cid = companyId ? JSON.parse(companyId) : null
      if (!cid || !leadId) return
      const fd = new FormData()
      files.forEach(f => fd.append('documents[]', f))
      const res = await crmInstance.post(`/leads/${leadId}/documents/${cid}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (res.data?.status) await fetchDocuments()
    } catch (err) { console.error(err) }
    finally { setUploading(false); e.target.value = '' }
  }

  /* ── delete ── */
  const handleDocumentDelete = async (docId) => {
    const result = await Swal.fire({
      title: 'Delete Document?', text: 'This action cannot be undone.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#DC2626', cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, Delete'
    })
    if (!result.isConfirmed) return
    try {
      const cid = companyId ? JSON.parse(companyId) : null
      await crmInstance.delete(`/documents/${docId}/${cid}`)
      await fetchDocuments()
    } catch { Swal.fire('Error!', 'Failed to delete document.', 'error') }
  }

  /* ── status ── */
  const handleStatusClick = (ld) => {
    if (!hasPermission('update-lead-status')) return
    setSelectedLead(ld)
    setSelectedStatusId(ld.lead_status?.id?.toString() || '')
    setStatusNotes(''); setFollowupDate(''); setSellingPrice('')
    setShowStatusModal(true)
  }

  const handleStatusSubmit = async () => {
    if (!selectedLead || !selectedStatusId) return
    try {
      const cid = companyId ? JSON.parse(companyId) : null
      const selectedStatus = leadStatuses.find(s => s.value === selectedStatusId)
      const payload = {
        user_id: selectedLead.assigned_to?.id || null,
        leads_id: selectedLead.id, status_id: selectedStatusId,
        note: statusNotes || null
      }
      if (selectedStatus?.label?.toLowerCase().includes('follow up') && followupDate) payload.followup_date = followupDate
      if (selectedStatus?.label?.toLowerCase().includes('converted') && sellingPrice) payload.selling_price = sellingPrice

      const res = await crmInstance.post(`/leads/${cid}/${selectedLead.id}/update-status-with-note`, payload)
      if (res.data?.status === true || res.status === 200) {
        setLead(prev => ({
          ...prev,
          lead_status: selectedStatus
            ? { id: parseInt(selectedStatusId), name: selectedStatus.label }
            : prev.lead_status
        }))
        setShowStatusModal(false)
        showSwal({ title: 'Updated!', text: 'Lead status updated successfully.', icon: 'success', timer: 2000, showConfirmButton: false })
      }
    } catch (err) {
      showSwal({ title: 'Error!', text: err.response?.data?.message || 'Failed to update status.', icon: 'error' })
    }
  }

  /* ── notes ── */
  const handleAddNoteClick = () => {
    setNoteText('')
    setFollowupDate('')
    setSellingPrice('')
    setSelectedStatusId(lead?.lead_status?.id?.toString() || '')
    setShowNoteModal(true)
  }

  const handleNoteSubmit = async () => {
    if (!noteText.trim() || !selectedStatusId) return
    setSubmittingNote(true)
    try {
      const cid = companyId ? JSON.parse(companyId) : null
      const status = leadStatuses.find(s => s.value === selectedStatusId)

      const payload = {
        user_id: lead?.assigned_to?.id || null,
        leads_id: lead?.id || leadId,
        status_id: selectedStatusId,
        note: noteText
      }
      if (/follow up|progress/i.test(status?.label || '') && followupDate) payload.followup_date = followupDate
      if (/convert/i.test(status?.label || '') && sellingPrice) payload.selling_price = sellingPrice

      const res = await crmInstance.post(`/leads/${cid}/${leadId}/update-status-with-note`, payload)

      if (res.data?.status === true || res.status === 200) {
        const newNote = {
          note: noteText,
          created_at: new Date().toISOString(),
          user: { name: 'You' }
        }
        setLead(prev => ({
          ...prev,
          user_notes: [...(prev.user_notes || []), newNote],
          lead_status: status
            ? { id: parseInt(selectedStatusId), name: status.label }
            : prev.lead_status
        }))
        setShowNoteModal(false)
        setNoteText('')
        showSwal({ title: 'Added!', text: 'Note added successfully.', icon: 'success', timer: 1500, showConfirmButton: false })
      }
    } catch (err) {
      showSwal({ title: 'Error!', text: err.response?.data?.message || 'Failed to add note.', icon: 'error' })
    } finally {
      setSubmittingNote(false)
    }
  }

  /* ── permissions ── */
  const canView   = hasPermission('view-documents') || hasPermission('manage-documents')
  const canUpload = hasPermission('upload-documents') || hasPermission('manage-documents')
  const canManage = hasPermission('manage-documents')

  const leadName    = renderField(lead?.client_name || lead?.name)
  const statusLabel = renderField(lead?.lead_status?.name || lead?.status)
  const services    = parseServices(lead?.service)
  const selectedStatus = leadStatuses.find(s => s.value === selectedStatusId)
  const isFollowUp  = selectedStatus?.label?.toLowerCase().includes('follow up')
  const isConverted = selectedStatus?.label?.toLowerCase().includes('converted')

  /* ── LOADING ── */
  if (loading) return (
    <PermissionGuard permission="view-leads">
      <div className="lv-root">
        <GlobalStyles/>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
          <Spinner classNames={{label:'text-foreground mt-4'}} label="spinner" variant="spinner"/>
        </div>
      </div>
    </PermissionGuard>
  )

  /* ── ERROR ── */
  if (error || !lead) return (
    <PermissionGuard permission="view-leads">
      <div className="lv-root">
        <GlobalStyles/>
        <div style={{padding:28,maxWidth:1100,margin:'0 auto'}}>
          <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:12,padding:'14px 18px',color:'#991B1B',display:'flex',alignItems:'center',gap:10}}>
            <FiAlertCircle/> {error || 'Lead not found'}
          </div>
          <button className="lv-btn lv-btn-secondary" style={{marginTop:16}} onClick={() => router.back()}>
            <FiArrowLeft size={13}/> Back
          </button>
        </div>
      </div>
    </PermissionGuard>
  )

  /* ── RENDER ── */
  return (
    <PermissionGuard permission="view-leads">
      <div className="lv-root">
        <GlobalStyles/>

        {/* ── HERO SECTION ── */}
        <div className="lv-hero">
          <div style={{position:'relative',zIndex:1,maxWidth:1100,margin:'0 auto'}}>
            <button className="lv-back-btn" onClick={() => router.back()}>
              <FiArrowLeft size={13}/> Back to Leads
            </button>

            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div className="lv-hero-avatar">{initials(leadName)}</div>
                <div>
                  <div className="lv-hero-name">{leadName}</div>
                  <div className="lv-hero-company" style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    {lead?.company && <><FiBriefcase size={12}/> {lead.company}</>}
                    {lead?.email && <><span style={{opacity:0.3}}>·</span><FiMail size={12}/> {lead.email}</>}
                  </div>
                </div>
              </div>
              <div className={`lv-hero-badge lv-status ${getStatusClass(statusLabel)}`}
                   style={{backdropFilter:'blur(8px)',cursor: statusLabel !== 'Converted' && hasPermission('update-lead-status') ? 'pointer' : 'default'}}
                   onClick={() => statusLabel !== 'Converted' && handleStatusClick(lead)}>
                <span className="s-dot"/>
                {statusLabel}
                {statusLabel !== 'Converted' && hasPermission('update-lead-status') && <FiEdit size={11}/>}
              </div>
            </div>

            {/* Quick stats */}
            <div style={{display:'flex',gap:10,marginTop:20,flexWrap:'wrap'}}>
              {[
                { label:'Source',  value: renderField(lead?.source) },
                { label:'Provider', value: renderField(lead?.lead_type?.name || lead?.lead_type_id) },
                { label:'Assigned', value: renderField(lead?.assigned_to_name || lead?.assigned_to) },
                { label:'Documents', value: documents.length },
              ].map((s, i) => (
                <div key={i} className="lv-stat-card">
                  <div className="lv-stat-label">{s.label}</div>
                  <div className="lv-stat-value">{s.value || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{maxWidth:1100,margin:'-22px auto 0',padding:'0 18px 22px',position:'relative',zIndex:2}}>
          <div className="lvp-content-grid" style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:14,alignItems:'start'}}>

            {/* LEFT COLUMN */}
            <div style={{display:'flex',flexDirection:'column',gap:14}}>

              {/* Contact Information — open by default */}
              <CollapsibleCard
                icon={<FiUser size={13}/>} iconBg="#EDE9FE" iconColor="#7C3AED"
                title="Contact Information" defaultOpen animClass="lv-anim-1"
              >
                <div className="lv-info-grid">
                  {[
                    { label:'Phone',          icon:<FiPhone size={12}/>,   value: renderField(lead?.phone) },
                    { label:'Direct Number',  icon:<FiPhone size={12}/>,   value: renderField(lead?.primary_number) },
                    { label:'HQ Number',      icon:<FiPhone size={12}/>,   value: renderField(lead?.reference_number) },
                    { label:'Email',          icon:<FiMail size={12}/>,    value: renderField(lead?.email) },
                    { label:'Address',        icon:<FiMapPin size={12}/>,  value: renderField(lead?.address) },
                    { label:'State',          icon:<FiMapPin size={12}/>,  value: renderField(lead?.state) },
                    { label:'City',           icon:<FiMapPin size={12}/>,  value: renderField(lead?.city) },
                    { label:'Website',        icon:<FiGlobe size={12}/>,   value: renderField(lead?.website) },
                    { label:'LinkedIn',       icon:<FiLinkedin size={12}/>,value: renderField(lead?.linkedin) },
                    { label:'Designation',    icon:<FiBriefcase size={12}/>,value: renderField(lead?.designation) },
                  ].map((row, i) => (
                    <div key={i} className="lv-info-row">
                      <div className="lv-info-label"><span>{row.icon}</span>{row.label}</div>
                      <div className="lv-info-value">{row.value}</div>
                    </div>
                  ))}
                </div>
              </CollapsibleCard>

              {/* Services */}
              {services.length > 0 && (
                <CollapsibleCard
                  icon={<FiCheckCircle size={13}/>} iconBg="#ECFDF5" iconColor="#059669"
                  title="Services" count={services.length} animClass="lv-anim-2"
                >
                  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                    {services.map((svc, i) => <span key={i} className="lv-tag">{svc}</span>)}
                  </div>
                </CollapsibleCard>
              )}

              {/* Notes */}
              <CollapsibleCard
                icon={<FiFileText size={13}/>} iconBg="#FFF7ED" iconColor="#EA580C"
                title="Notes" count={lead?.user_notes?.length || 0} animClass="lv-anim-3"
                action={
                  <button
                    className="lv-btn lv-btn-primary"
                    style={{padding:'6px 12px',fontSize:11}}
                    onClick={handleAddNoteClick}
                  >
                    <FiEdit size={11}/> Add Note
                  </button>
                }
              >
                <div className="lv-scroll" style={{maxHeight:320,overflowY:'auto'}}>
                  {lead?.user_notes?.length > 0
                    ? [...lead.user_notes].reverse().map((note, i) => (
                        <div key={i} className="lv-note">
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                            <span className="lv-note-author">{note.user?.name || 'Unknown'}</span>
                            <span className="lv-note-date">{fmtDateTime(note.created_at)}</span>
                          </div>
                          <div className="lv-note-text">{note.note || '—'}</div>
                        </div>
                      ))
                    : (
                      <div className="lv-empty">
                        <div className="lv-empty-icon"><FiFileText/></div>
                        <div className="lv-empty-title">No notes yet</div>
                        <div className="lv-empty-sub">Notes added to this lead will appear here</div>
                      </div>
                    )
                  }
                </div>
              </CollapsibleCard>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{display:'flex',flexDirection:'column',gap:14}}>

              {/* Documents */}
              <CollapsibleCard
                icon={<FiFileText size={13}/>} iconBg="#EDE9FE" iconColor="#7C3AED"
                title="Documents" count={documents.length} animClass="lv-anim-2"
                action={canUpload ? (
                  <div style={{position:'relative'}}>
                    <input
                      type="file" multiple id={`doc-upload-${leadId}`}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                      onChange={handleFileUpload} disabled={uploading}
                      style={{position:'absolute',inset:0,opacity:0,cursor:'pointer'}}
                    />
                    <label htmlFor={`doc-upload-${leadId}`} className="lv-upload-btn">
                      {uploading
                        ? <><div style={{width:11,height:11,border:'2px solid var(--border)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'lvmSpin 0.6s linear infinite'}}/> Uploading…</>
                        : <><FiUpload size={11}/> Upload</>
                      }
                    </label>
                  </div>
                ) : null}
              >
                {canView ? (
                  documents.length > 0 ? (
                    <div className="lv-doc-grid">
                      {documents.map((doc, i) => (
                        <DocCard
                          key={doc.id || i} doc={doc}
                          onView={d => { setSelectedDoc(d); setShowDocModal(true) }}
                          onDelete={handleDocumentDelete}
                          canManage={canManage}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="lv-empty">
                      <div className="lv-empty-icon"><FiUpload/></div>
                      <div className="lv-empty-title">No documents</div>
                      <div className="lv-empty-sub">{canUpload ? 'Click Upload to add files' : 'No files uploaded yet'}</div>
                    </div>
                  )
                ) : (
                  <div className="lv-lock">
                    <div className="lv-lock-icon"><FiLock/></div>
                    <div style={{fontWeight:700,color:'var(--ink)',marginBottom:6}}>Access Restricted</div>
                    <div style={{fontSize:12,color:'var(--ink-muted)'}}>Contact your administrator for document access</div>
                  </div>
                )}
              </CollapsibleCard>

              {/* Lead Details */}
              <CollapsibleCard
                icon={<FiTrendingUp size={13}/>} iconBg="#FFFBEB" iconColor="#D97706"
                title="Lead Details" animClass="lv-anim-3"
              >
                <div className="lv-info-grid">
                  {[
                    { label:'Status',       value: statusLabel,                       isStatus:true },
                    { label:'Provider',     value: renderField(lead?.lead_type?.name || lead?.lead_type_id) },
                    { label:'Source',       value: renderField(lead?.source) },
                    { label:'Assigned To',  value: renderField(lead?.assigned_to_name || lead?.assigned_to) },
                  ].map((row, i) => (
                    <div key={i} className="lv-info-row">
                      <div className="lv-info-label">{row.label}</div>
                      {row.isStatus ? (
                        <span
                          className={`lv-status ${getStatusClass(row.value)}`}
                          onClick={() => row.value !== 'Converted' && hasPermission('update-lead-status') && handleStatusClick(lead)}
                          style={row.value !== 'Converted' && hasPermission('update-lead-status') ? {cursor:'pointer'} : {}}
                        >
                          <span className="s-dot"/>{row.value}
                          {row.value !== 'Converted' && hasPermission('update-lead-status') && <FiEdit size={10}/>}
                        </span>
                      ) : (
                        <div className="lv-info-value">{row.value}</div>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleCard>

              {/* Activity */}
              <ActivityCard activities={activities} leadId={leadId} companyId={companyId}/>
            </div>
          </div>
        </div>

        {/* ── STATUS MODAL ── */}
        {showStatusModal && hasPermission('update-lead-status') && (
          <>
            <div className="lv-modal-backdrop" onClick={() => setShowStatusModal(false)}/>
            <div className="lv-modal-wrap">
              <div className="lv-modal lv-anim" style={{maxWidth:440}}>
                <div className="lv-modal-head">
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,var(--accent),var(--accent-2))',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:13}}>
                      <FiZap/>
                    </div>
                    <div>
                      <div className="lv-modal-title">Update Status</div>
                      <div style={{fontSize:11.5,color:'var(--ink-muted)'}}>{selectedLead?.client_name}</div>
                    </div>
                  </div>
                  <button className="lv-modal-close" onClick={() => setShowStatusModal(false)}><FiX size={14}/></button>
                </div>
                <div className="lv-modal-body" style={{padding:22,display:'flex',flexDirection:'column',gap:16}}>
                  <div>
                    <div className="lv-form-label">Status</div>
                    <SelectDropdown
                      options={leadStatuses}
                      selectedOption={leadStatuses.find(s => s.value === selectedStatusId) || null}
                      onSelectOption={opt => setSelectedStatusId(opt?.value || '')}
                    />
                  </div>
                  <div>
                    <div className="lv-form-label">Notes</div>
                    <textarea
                      className="lv-form-control" rows={3}
                      placeholder="Add notes about this status update…"
                      value={statusNotes}
                      onChange={e => setStatusNotes(e.target.value)}
                    />
                  </div>
                  {isFollowUp && (
                    <div>
                      <div className="lv-form-label"><FiCalendar size={11}/> Follow-up Date</div>
                      <input type="date" className="lv-form-control" value={followupDate}
                        onChange={e => setFollowupDate(e.target.value)}
                        min={todayInputDate()}/>
                    </div>
                  )}
                  {isConverted && (
                    <div>
                      <div className="lv-form-label"><FiDollarSign size={11}/> Selling Price</div>
                      <input type="number" className="lv-form-control" placeholder="Enter selling price"
                        value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} min="0" step="0.01"/>
                    </div>
                  )}
                </div>
                <div className="lv-modal-foot" style={{justifyContent:'flex-end',gap:10}}>
                  <button className="lv-btn lv-btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
                  <button className="lv-btn lv-btn-primary" onClick={handleStatusSubmit}>
                    <FiCheckCircle size={13}/> Update Status
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── NOTE MODAL ── */}
        {showNoteModal && (
          <AddNoteModal
            leadName={leadName}
            leadStatuses={leadStatuses}
            statusId={selectedStatusId}
            setStatusId={setSelectedStatusId}
            noteText={noteText}
            setNoteText={setNoteText}
            followupDate={followupDate}
            setFollowupDate={setFollowupDate}
            sellingPrice={sellingPrice}
            setSellingPrice={setSellingPrice}
            submitting={submittingNote}
            onClose={() => setShowNoteModal(false)}
            onSubmit={handleNoteSubmit}
          />
        )}

        {/* ── DOCUMENT MODAL ── */}
        <DocumentModal
          show={showDocModal}
          onClose={() => setShowDocModal(false)}
          document={selectedDoc}
          companyId={companyId}
        />
      </div>
    </PermissionGuard>
  )
}

export default page