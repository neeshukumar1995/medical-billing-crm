'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import {
  FiArrowLeft, FiPlus, FiSettings, FiUser, FiMail, FiPhone,
  FiMapPin, FiBriefcase, FiHash, FiCalendar, FiShield,
  FiCheckCircle, FiMessageSquare, FiUsers, FiEdit, FiAlertCircle
} from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import { useParams } from 'next/navigation'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { getImageUrl } from '@/config/api'
import { decryptId } from '@/utils/decryptId'
import { encryptId } from '@/utils/encryptId'
import { formatDate } from '@/utils/formatDate'

/* ─── STYLES ─── */
const GlobalStyles = () => (
  <style>{`
    :root {
      --uv-ink:       #0D0F1A;
      --uv-soft:      #3D4155;
      --uv-muted:     #7B8099;
      --uv-surface:   #FFFFFF;
      --uv-surface2:  #F6F7FB;
      --uv-surface3:  #ECEEF6;
      --uv-border:    rgba(0,0,0,0.07);
      --uv-accent:    #4F46E5;
      --uv-accent2:   #7C3AED;
      --uv-glow:      rgba(79,70,229,0.15);
      --uv-success:   #059669;
      --uv-warning:   #D97706;
      --uv-danger:    #DC2626;
      --uv-shadow-sm: 0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);
      --uv-shadow-md: 0 4px 16px rgba(0,0,0,0.07),0 1px 4px rgba(0,0,0,0.05);
      --uv-shadow-lg: 0 12px 40px rgba(0,0,0,0.10),0 4px 12px rgba(0,0,0,0.06);
    }

    /* ── HERO ── */
    .uv-hero {
      background: linear-gradient(135deg, #0D0F1A 0%, #1E1B4B 55%, #312E81 100%);
      padding: 36px 36px 80px;
      position: relative; overflow: hidden;
    }
    .uv-hero::before {
      content:''; position:absolute; inset:0;
      background: radial-gradient(ellipse 70% 80% at 30% 50%, rgba(99,102,241,0.22) 0%, transparent 70%);
      pointer-events:none;
    }
    .uv-hero::after {
      content:''; position:absolute; top:-100px; right:-80px;
      width:340px; height:340px; border-radius:50%;
      background: radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%);
      pointer-events:none;
    }
    .uv-hero-grid {
      position:absolute; inset:0; pointer-events:none;
      background-image: linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
      background-size: 44px 44px;
    }
    .uv-hero-inner { position:relative; z-index:1; max-width:1160px; margin:0 auto; }

    /* ── BACK BTN ── */
    .uv-back {
      display:inline-flex; align-items:center; gap:8px;
      color:rgba(255,255,255,0.6); font-size:13px; font-weight:500;
      background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12);
      padding:8px 16px; border-radius:50px; text-decoration:none;
      transition:all .2s; margin-bottom:28px; backdrop-filter:blur(8px);
    }
    .uv-back:hover { background:rgba(255,255,255,0.16); color:#fff; transform:translateX(-2px); }

    /* ── AVATAR ── */
    .uv-avatar-wrap {
      position:relative; display:inline-block;
    }
    .uv-avatar {
      width:88px; height:88px; border-radius:22px;
      background:linear-gradient(135deg,var(--uv-accent),var(--uv-accent2));
      display:flex; align-items:center; justify-content:center;
      font-size:32px; font-weight:800; color:#fff;
      box-shadow: 0 8px 28px rgba(79,70,229,0.45);
      border:3px solid rgba(255,255,255,0.15);
      overflow:hidden;
    }
    .uv-avatar img { width:100%; height:100%; object-fit:cover; }
    .uv-status-dot {
      position:absolute; bottom:4px; right:4px;
      width:16px; height:16px; border-radius:50%;
      border:2.5px solid #1E1B4B;
    }

    /* ── HERO TEXT ── */
    .uv-hero-name { font-size:26px; font-weight:700; color:#fff; margin:0 0 4px; }
    .uv-hero-sub  { color:rgba(255,255,255,0.55); font-size:13px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .uv-hero-sub span { display:inline-flex; align-items:center; gap:5px; }

    /* ── HERO STATS ── */
    .uv-stat-row { display:flex; gap:12px; margin-top:28px; flex-wrap:wrap; }
    .uv-stat {
      flex:1; min-width:130px;
      background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
      border-radius:14px; padding:14px 18px; backdrop-filter:blur(8px);
    }
    .uv-stat-label { font-size:10px; color:rgba(255,255,255,0.45); text-transform:uppercase; letter-spacing:0.8px; font-weight:600; }
    .uv-stat-value { font-size:14px; font-weight:700; color:#fff; margin-top:5px; }

    /* ── CONTENT AREA ── */
    .uv-content {
      max-width:1160px; margin:-44px auto 0;
      padding:0 24px 48px; position:relative; z-index:2;
    }

    /* ── CARD ── */
    .uv-card {
      background:var(--uv-surface); border-radius:18px;
      border:1px solid var(--uv-border); box-shadow:var(--uv-shadow-md);
      overflow:hidden;
    }
    .uv-card-head {
      padding:18px 22px; border-bottom:1px solid var(--uv-border);
      display:flex; align-items:center; gap:10px;
    }
    .uv-card-icon {
      width:32px; height:32px; border-radius:9px;
      display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0;
    }
    .uv-card-title { font-size:14px; font-weight:700; color:var(--uv-ink); }
    .uv-card-body  { padding:8px 10px 16px; }

    /* ── INFO ROW ── */
    .uv-row {
      display:flex; align-items:center; justify-content:space-between;
      padding:11px 12px; border-radius:10px; transition:background .15s; gap:12px;
    }
    .uv-row:hover { background:var(--uv-surface2); }
    .uv-row-label {
      display:flex; align-items:center; gap:9px;
      font-size:12px; color:var(--uv-muted); font-weight:500; flex-shrink:0; min-width:110px;
    }
    .uv-row-label svg { color:var(--uv-muted); flex-shrink:0; }
    .uv-row-value {
      font-size:13px; font-weight:600; color:var(--uv-ink);
      text-align:right; word-break:break-word;
    }

    /* ── STATUS PILL ── */
    .uv-pill {
      display:inline-flex; align-items:center; gap:5px;
      padding:4px 11px; border-radius:50px; font-size:11px; font-weight:700;
      letter-spacing:0.3px; border:1.5px solid transparent;
    }
    .uv-pill .dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
    .uv-pill.active   { background:#ECFDF5; color:#065F46; border-color:#A7F3D0; }
    .uv-pill.active .dot { background:#059669; }
    .uv-pill.inactive { background:#FEF2F2; color:#991B1B; border-color:#FECACA; }
    .uv-pill.inactive .dot { background:#DC2626; }
    .uv-pill.pending  { background:#FFFBEB; color:#92400E; border-color:#FDE68A; }
    .uv-pill.pending .dot { background:#D97706; }
    .uv-pill.default  { background:#F3F4F6; color:#374151; border-color:#E5E7EB; }
    .uv-pill.default .dot { background:#9CA3AF; }

    /* ── EDIT BTN ── */
    .uv-edit-btn {
      display:inline-flex; align-items:center; gap:7px;
      padding:9px 18px; border-radius:10px; font-size:13px; font-weight:600;
      background:rgba(255,255,255,0.12); color:#fff;
      border:1px solid rgba(255,255,255,0.2); text-decoration:none;
      transition:all .2s; backdrop-filter:blur(6px);
    }
    .uv-edit-btn:hover { background:rgba(255,255,255,0.22); color:#fff; transform:translateY(-1px); }

    /* ── HEADER BTNS ── */
    .uv-hdr-back {
      display:inline-flex; align-items:center; gap:7px;
      padding:8px 16px; border-radius:9px; font-size:13px; font-weight:600;
      border:1.5px solid var(--uv-border); color:var(--uv-soft);
      text-decoration:none; transition:all .2s; background:var(--uv-surface);
    }
    .uv-hdr-back:hover { border-color:var(--uv-accent); color:var(--uv-accent); }
    .uv-hdr-create {
      display:inline-flex; align-items:center; gap:7px;
      padding:8px 18px; border-radius:9px; font-size:13px; font-weight:600;
      background:var(--uv-accent); color:#fff; text-decoration:none;
      transition:all .2s; border:1.5px solid transparent;
    }
    .uv-hdr-create:hover { background:#4338CA; box-shadow:0 4px 12px rgba(79,70,229,0.3); color:#fff; }

    /* ── ANIM ── */
    @keyframes uvUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    .uv-a1 { animation:uvUp .35s ease both; }
    .uv-a2 { animation:uvUp .35s .08s ease both; }
    .uv-a3 { animation:uvUp .35s .16s ease both; }
    .uv-a4 { animation:uvUp .35s .22s ease both; }

    @media(max-width:768px){
      .uv-hero { padding:24px 20px 68px; }
      .uv-content { padding:0 16px 40px; }
    }
  `}</style>
)

/* ─── HELPERS ─── */
const statusClass = (s) => {
  const v = s?.toLowerCase() || ''
  if (v === 'active')   return 'active'
  if (v === 'inactive') return 'inactive'
  if (v === 'pending')  return 'pending'
  return 'default'
}

const fmtDate = (d) => d ? formatDate(d) : '—'

const initials = (name) => {
  if (!name) return 'U'
  const p = name.split(' ').filter(Boolean)
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0,2).toUpperCase()
}

/* ─── HEADER ─── */
const UsersViewHeader = () => (
  <div className="d-flex align-items-center gap-2">
    <Link href="/users/list" className="uv-hdr-back">
      <FiArrowLeft size={14}/> Back
    </Link>
    <Link href="/users/create" className="uv-hdr-create">
      <FiPlus size={14}/> Create User
    </Link>
  </div>
)

/* ─── INFO SECTION ─── */
const InfoCard = ({ title, icon, iconBg, iconColor, rows, className = '' }) => (
  <div className={`uv-card ${className}`}>
    <div className="uv-card-head">
      <div className="uv-card-icon" style={{ background: iconBg, color: iconColor }}>{icon}</div>
      <div className="uv-card-title">{title}</div>
    </div>
    <div className="uv-card-body">
      {rows.map((row, i) => (
        <div key={i} className="uv-row">
          <div className="uv-row-label">
            {row.icon}
            {row.label}
          </div>
          {row.isStatus ? (
            <span className={`uv-pill ${statusClass(row.value)}`}>
              <span className="dot"/>{row.value || '—'}
            </span>
          ) : (
            <div className="uv-row-value">{row.value || '—'}</div>
          )}
        </div>
      ))}
    </div>
  </div>
)

/* ─── TAB CONTENT ─── */
const TabOverviewContent = ({ user }) => {
  const profileImgUrl = user?.profile_image ? getImageUrl(user.profile_image) : null
  const status = user?.status || 'Unknown'
  const dotColor = status === 'Active' ? '#10B981' : status === 'Inactive' ? '#EF4444' : '#F59E0B'

  const personalRows = [
    { label:'Full Name',    icon:<FiUser size={13}/>,    value: user?.name },
    { label:'Email',        icon:<FiMail size={13}/>,    value: user?.email },
    { label:'Phone',        icon:<FiPhone size={13}/>,   value: user?.phone },
    { label:'Address',      icon:<FiMapPin size={13}/>,  value: user?.address },
  ]
  const workRows = [
    { label:'Department',   icon:<FiBriefcase size={13}/>, value: user?.department },
    { label:'Employee ID',  icon:<FiHash size={13}/>,      value: user?.employee_id },
    { label:'Joining Date', icon:<FiCalendar size={13}/>,  value: fmtDate(user?.joining_date) },
    { label:'Manager',      icon:<FiUsers size={13}/>,     value: user?.manager },
  ]
  const accountRows = [
    { label:'Role',           icon:<FiShield size={13}/>,       value: user?.user_role?.name },
    { label:'Status',         icon:<FiCheckCircle size={13}/>,  value: status, isStatus: true },
    { label:'Communication',  icon:<FiMessageSquare size={13}/>,value: 'Email, Phone' },
    { label:'Allow Changes',  icon:<FiSettings size={13}/>,     value: 'Yes' },
  ]

  return (
    <>
      {/* ── HERO ── */}
      <div className="uv-hero">
        <div className="uv-hero-grid"/>
        <div className="uv-hero-inner">

          <Link href="/users/list" className="uv-back">
            <FiArrowLeft size={13}/> Back to Users
          </Link>

          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
            {/* Left: avatar + name */}
            <div style={{display:'flex',alignItems:'center',gap:20}}>
              <div className="uv-avatar-wrap">
                <div className="uv-avatar">
                  {profileImgUrl
                    ? <img src={profileImgUrl} alt={user?.name}/>
                    : initials(user?.name)
                  }
                </div>
                <span className="uv-status-dot" style={{background: dotColor}}/>
              </div>
              <div>
                <div className="uv-hero-name">{user?.name || 'Unknown User'}</div>
                <div className="uv-hero-sub">
                  {user?.user_role?.name && <span><FiShield size={11}/>{user.user_role.name}</span>}
                  {user?.department      && <><span style={{opacity:.3}}>·</span><span><FiBriefcase size={11}/>{user.department}</span></>}
                  {user?.email           && <><span style={{opacity:.3}}>·</span><span><FiMail size={11}/>{user.email}</span></>}
                </div>
                <div style={{marginTop:10}}>
                  <span className={`uv-pill ${statusClass(status)}`} style={{fontSize:11}}>
                    <span className="dot"/>{status}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: edit btn */}
            <Link href={`/users/edit/${encryptId(user?.id)}`} className="uv-edit-btn">
              <FiEdit size={13}/> Edit Profile
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="uv-stat-row">
            {[
              { label:'Employee ID', value: user?.employee_id || '—' },
              { label:'Department',  value: user?.department  || '—' },
              { label:'Joined',      value: fmtDate(user?.joining_date) },
              { label:'Manager',     value: user?.manager     || '—' },
            ].map((s, i) => (
              <div key={i} className="uv-stat">
                <div className="uv-stat-label">{s.label}</div>
                <div className="uv-stat-value">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CARDS ── */}
      <div className="uv-content">
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:18}}>
          <InfoCard
            className="uv-a2"
            title="Personal Information"
            icon={<FiUser size={14}/>}
            iconBg="#EDE9FE" iconColor="#7C3AED"
            rows={personalRows}
          />
          <InfoCard
            className="uv-a3"
            title="Work Information"
            icon={<FiBriefcase size={14}/>}
            iconBg="#ECFDF5" iconColor="#059669"
            rows={workRows}
          />
          <InfoCard
            className="uv-a4"
            title="Account Information"
            icon={<FiSettings size={14}/>}
            iconBg="#EFF6FF" iconColor="#1D4ED8"
            rows={accountRows}
          />
        </div>
      </div>
    </>
  )
}

/* ─── MAIN PAGE ─── */
const page = () => {
  const params    = useParams()
  const actualId  = useMemo(() => decryptId(params.id), [params.id])
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [companyId] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('companyId') : null
  )

  useEffect(() => {
    if (!actualId || !companyId) return
    const fetchUser = async () => {
      try {
        setLoading(true)
        const cid = JSON.parse(companyId)
        const res = await crmInstance.get(`/users/${cid}/${actualId}`)
        setUser(res.data)
        setError('')
      } catch (err) {
        setError('Failed to load user details.')
      } finally { setLoading(false) }
    }
    fetchUser()
  }, [actualId, companyId])

  if (loading) return (
    <PermissionGuard permission="view-users">
      <GlobalStyles/>
      <PageHeader><UsersViewHeader/></PageHeader>
      <div className="main-content" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:300}}>
        <Spinner classNames={{label:'text-foreground mt-4'}} label="spinner" variant="spinner"/>
      </div>
    </PermissionGuard>
  )

  if (error || !user) return (
    <PermissionGuard permission="view-users">
      <GlobalStyles/>
      <PageHeader><UsersViewHeader/></PageHeader>
      <div className="main-content" style={{padding:32}}>
        <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:12,padding:'16px 20px',color:'#991B1B',display:'flex',alignItems:'center',gap:10}}>
          <FiAlertCircle/> {error || 'User not found'}
        </div>
      </div>
    </PermissionGuard>
  )

  return (
    <PermissionGuard permission="view-users">
      <GlobalStyles/>
      <PageHeader><UsersViewHeader/></PageHeader>
      <div style={{background:'#F6F7FB',minHeight:'100vh'}}>
        <TabOverviewContent user={user}/>
      </div>
    </PermissionGuard>
  )
}

export default page
