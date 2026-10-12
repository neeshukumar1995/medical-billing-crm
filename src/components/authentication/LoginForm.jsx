'use client'
import Link from 'next/link'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import crmInstance from '@/utils/crmInstance'
import { HOME_PATH } from '@/constants/portalScope'

/* ─────────────────────────────────────────────────────────────────────────────
   Simple, clean login page — single accent color, no gradients/particles/glass.
   Layout: centered card on a light background, responsive down to phone.
───────────────────────────────────────────────────────────────────────────── */
const CSS = `
  /* ── KILL TEMPLATE CHROME ─────────────────────────────── */
  html:has(.lf-root),
  body:has(.lf-root) {
    overflow: hidden !important;
    background: #f7f7f8 !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  body:has(.lf-root) #layout-wrapper,
  body:has(.lf-root) #layout-menu,
  body:has(.lf-root) .layout-menu,
  body:has(.lf-root) .vertical-menu,
  body:has(.lf-root) .app-menu,
  body:has(.lf-root) .main-menu,
  body:has(.lf-root) .sidebar,
  body:has(.lf-root) #sidebar,
  body:has(.lf-root) .left-side-menu,
  body:has(.lf-root) .navbar,
  body:has(.lf-root) .topbar,
  body:has(.lf-root) .navbar-custom,
  body:has(.lf-root) #topnav,
  body:has(.lf-root) .page-topbar,
  body:has(.lf-root) .footer,
  body:has(.lf-root) #footer,
  body:has(.lf-root) .page-wrapper,
  body:has(.lf-root) .content-page,
  body:has(.lf-root) .main-content,
  body:has(.lf-root) #page-wrapper,
  body:has(.lf-root) .wrapper,
  body:has(.lf-root) [class*="sidebar"]:not(.lf-root *),
  body:has(.lf-root) [class*="navbar"]:not(.lf-root *),
  body:has(.lf-root) [class*="topbar"]:not(.lf-root *),
  body:has(.lf-root) [class*="footer"]:not(.lf-root *),
  body:has(.lf-root) [id*="sidebar"]:not(.lf-root *),
  body:has(.lf-root) [id*="navbar"]:not(.lf-root *) {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }

  @keyframes lf-spin { to{transform:rotate(360deg)} }

  .lf-root, .lf-root * { cursor: default !important; }
  .lf-root input[type="text"],
  .lf-root input[type="password"] { cursor: text !important; }
  .lf-root select { cursor: pointer !important; }
  .lf-root button { cursor: pointer !important; }
  .lf-root a      { cursor: pointer !important; }
  .lf-root label  { cursor: pointer !important; }
  .lf-root input[type="checkbox"] { cursor: pointer !important; }

  /* ── SHELL ─────────────────────────────────────────────── */
  .lf-root {
    position: fixed; inset: 0; z-index: 99999;
    display: flex; align-items: center; justify-content: center;
    overflow-y: auto; overflow-x: hidden;
    background: #f7f7f8;
    padding: 24px;
  }

  .lf-card {
    width: 100%; max-width: 380px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 40px 36px;
    box-shadow: 0 1px 3px rgba(0,0,0,.04);
  }

  /* ── INPUTS ───────────────────────────────────────────── */
  .lf-inp, .lf-sel {
    width: 100%; padding: 11px 14px;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    color: #111827; font-size: 14px; font-weight: 400;
    outline: none; transition: border-color .15s, box-shadow .15s;
    font-family: inherit; box-shadow: none;
    -webkit-appearance: none; appearance: none;
  }
  .lf-inp::placeholder { color: #9ca3af; }
  .lf-inp:focus, .lf-sel:focus {
    border-color: #b76e79 !important;
    box-shadow: 0 0 0 3px rgba(183,110,121,.12) !important;
  }
  .lf-sel { cursor: pointer !important; }
  .lf-sel option { background: #fff; color: #111827; }

  /* ── BUTTON ───────────────────────────────────────────── */
  .lf-btn {
    width: 100%; padding: 12px; border: none; border-radius: 6px;
    background: #b76e79;
    color: #fff; font-size: 14px; font-weight: 600;
    cursor: pointer !important; transition: background .15s;
    font-family: inherit;
  }
  .lf-btn:hover:not(:disabled) { background: #a35d68; }
  .lf-btn:disabled { opacity: .5; cursor: not-allowed !important; }

  .lf-link:hover { text-decoration: underline !important; }

  /* ── PHONE ────────────────────────────────────────────── */
  @media (max-width: 480px) {
    .lf-card { padding: 30px 22px; border-radius: 8px; }
  }
`

export default function LoginForm({ resetPath }) {
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [companyId, setCompanyId] = useState('')
  const [companies, setCompanies] = useState([])
  const [needsCompany, setNeedsCompany] = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [showPass, setShowPass]   = useState(false)
  const router = useRouter()

  const doLogin = async (body) => {
    const res = await crmInstance.post('/login', body)
    if (res.data?.access_token) {
      const ud = res.data.user
      const companyStatus = ud.company_status || res.data.company?.status || ud.company?.status

      if (companyStatus && companyStatus !== 'Active') {
        const messages = {
          Inactive: 'This company account is disabled. Please contact your administrator.',
          Suspended: 'This company account is suspended (locked). Please contact your administrator.',
        }
        throw { response: { data: { message: messages[companyStatus] || 'This company account does not have login access.' } } }
      }

      localStorage.setItem('access_token', res.data.access_token)
      if (res.data.refresh_token) localStorage.setItem('refresh_token', res.data.refresh_token)
      localStorage.setItem('user', JSON.stringify(ud))
      localStorage.setItem('companyId', ud.company_id)
      localStorage.setItem('isLoggedIn', 'true')
      router.replace(HOME_PATH)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const body = { username, password }
      if (needsCompany && companyId) body.company_id = companyId
      await doLogin(body)
    } catch (err) {
      // Agar backend kahe ki multiple companies hain, tabhi dropdown dikhao
      if (err.response?.status === 300 && err.response?.data?.requires_company_selection) {
        setCompanies(err.response.data.companies || [])
        setNeedsCompany(true)
        setError(err.response.data.message || 'Please select your company')
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'Invalid username or password')
      }
    } finally { setLoading(false) }
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="lf-root">
        <div className="lf-card">

          {/* Logo + heading */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: '#b76e79',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                <path d="M16 3L28 9.5V16C28 22.6 22.5 28.5 16 30.5C9.5 28.5 4 22.6 4 16V9.5L16 3Z" fill="white" fillOpacity=".95"/>
                <path d="M12 16L15 19L20 13" stroke="#b76e79" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#111827' }}>
              Sign in to CRM
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
              Enter your details to access your workspace
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6,
              padding: '9px 12px', marginBottom: 16, fontSize: 13, color: '#b91c1c',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>

            {/* Company — sirf tab dikhega jab backend maange (multiple companies match) */}
            {needsCompany && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Workspace <span className="text-danger">*</span>
                </label>
                <select className="lf-sel" value={companyId} onChange={e => setCompanyId(e.target.value)} required disabled={loading}>
                  <option value="">Select workspace</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id} disabled={c.status && c.status !== 'Active'}>
                      {c.name}{c.status && c.status !== 'Active' ? ` (${c.status})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Username */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Username <span className="text-danger">*</span>
              </label>
              <input
                className="lf-inp"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Password <span className="text-danger">*</span></label>
                {resetPath && (
                  <Link href={resetPath} className="lf-link" style={{ fontSize: 13, color: '#b76e79', textDecoration: 'none', fontWeight: 500 }}>
                    Forgot password?
                  </Link>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  className="lf-inp"
                  type={showPass ? 'text' : 'password'}
                  style={{ paddingRight: 42 }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
                    display: 'flex', padding: 4,
                  }}
                >
                  {showPass
                    ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-4.5 6-4.5S14 8 14 8s-2.5 4.5-6 4.5S2 8 2 8Z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.3"/><path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-4.5 6-4.5S14 8 14 8s-2.5 4.5-6 4.5S2 8 2 8Z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <input type="checkbox" style={{ accentColor: '#b76e79', width: 14, height: 14 }} />
              <span style={{ fontSize: 13, color: '#6b7280' }}>Remember me</span>
            </label>

            {/* Submit */}
            <button type="submit" className="lf-btn" disabled={loading}>
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', animation: 'lf-spin .7s linear infinite', display: 'inline-block' }}/>
                    Signing in…
                  </span>
                : 'Sign In'
              }
            </button>
          </form>

          {/* Footer note */}
          <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
            Secured with 256-bit encryption
          </p>
        </div>
      </div>
    </>
  )
}