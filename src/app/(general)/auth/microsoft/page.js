'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

export default function MicrosoftCallback() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const hasRun       = useRef(false)
  const [status,  setStatus]  = useState('loading')
  const [message, setMessage] = useState('Connecting your Outlook account…')

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const code          = searchParams.get('code')
    const returnedState = searchParams.get('state')
    const msError       = searchParams.get('error')
    const savedState    = sessionStorage.getItem('oauth_state')
    const loginToken    = localStorage.getItem('access_token')

    // ── 1. Microsoft returned error (user denied etc.) ───────────────
    if (msError) {
      const desc = searchParams.get('error_description') ?? msError
      console.error('❌ Microsoft OAuth error:', msError, desc)
      setStatus('error')
      setMessage('Microsoft login was cancelled or access was denied.')
      setTimeout(() => router.push('/outlookEmail'), 3000)
      return
    }

    // ── 2. Missing code ───────────────────────────────────────────────
    if (!code) {
      setStatus('error')
      setMessage('Authorization code missing from Microsoft response.')
      setTimeout(() => router.push('/outlookEmail'), 3000)
      return
    }

    // ── 3. CSRF state check ───────────────────────────────────────────
    if (!returnedState || returnedState !== savedState) {
      console.error('❌ State mismatch:', { returned: returnedState, saved: savedState })
      setStatus('error')
      setMessage('Security check failed. Please try again.')
      setTimeout(() => router.push('/outlookEmail'), 3000)
      return
    }

    // ── 4. Login check ────────────────────────────────────────────────
    if (!loginToken) {
      setStatus('error')
      setMessage('You are not logged in. Please login first.')
      setTimeout(() => router.push('/'), 3000)
      return
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://crm-backend.test'

    // ── 5. Send code to Laravel backend ──────────────────────────────
    axios.post(
      `${apiUrl}/api/auth/microsoft/callback`,
      { code },
      {
        headers: {
          'Authorization': `Bearer ${loginToken}`,
          'Content-Type':  'application/json',
          'Accept':        'application/json',
        },
      }
    )
    .then((res) => {
      console.log('✅ Microsoft Connected:', res.data)

      // Save to localStorage (optional — already saved to DB by backend)
      if (res.data.access_token) {
        localStorage.setItem('ms_access_token',  res.data.access_token)
        localStorage.setItem('ms_refresh_token', res.data.refresh_token ?? '')
        localStorage.setItem('ms_expires_at',    String(Date.now() + res.data.expires_in * 1000))
        localStorage.setItem('ms_email',         res.data.user?.mail ?? res.data.user?.userPrincipalName ?? '')
      }

      sessionStorage.removeItem('oauth_state')
      setStatus('success')
      setMessage('Outlook connected successfully! Redirecting…')
      setTimeout(() => router.push('/outlookEmail'), 1500)
    })
    .catch((err) => {
      const httpStatus = err.response?.status
      const errData    = err.response?.data ?? {}
      const details    = errData.details    ?? {}
      const errCode    = details.error      ?? errData.error ?? 'unknown'
      const errDesc    = details.error_description ?? ''

      // ── Full debug log ──────────────────────────────────────────────
      console.error('❌ Microsoft callback error:', {
        httpStatus,
        error:       errCode,
        description: errDesc,
        fullData:    errData,
      })

      // ── User-friendly message by error type ─────────────────────────
      let userMessage = 'Failed to connect Outlook. Please try again.'

      if (errCode === 'invalid_client' || errDesc.includes('7000215')) {
        // Secret ID used instead of Secret Value in .env
        userMessage = '⚙️ Server config error: Invalid client secret. Contact your admin.'

      } else if (errCode === 'invalid_grant' || errDesc.includes('54005') || errDesc.includes('AADSTS54005')) {
        // Code expired or already used (common if page refreshed)
        userMessage = '⏱ Authorization code expired or already used. Please try connecting again.'

      } else if (errDesc.includes('redirect_uri') || errDesc.includes('AADSTS50011')) {
        // Redirect URI in Azure doesn't match MICROSOFT_REDIRECT_URI in .env
        userMessage = '🔗 Redirect URI mismatch. Check Azure app configuration.'

      } else if (errCode === 'unauthorized_client') {
        userMessage = '🚫 App not authorized. Check Azure API permissions.'

      } else if (httpStatus === 401) {
        userMessage = '🔐 Your session expired. Please login again.'
        setTimeout(() => router.push('/'), 2500)
        return

      } else if (httpStatus === 500) {
        userMessage = '🛠 Server error. Check Laravel logs: storage/logs/laravel.log'
      }

      sessionStorage.removeItem('oauth_state')
      setStatus('error')
      setMessage(userMessage)
      setTimeout(() => router.push('/outlookEmail'), 4000)
    })

  }, [searchParams, router])

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>

        {status === 'loading' && <div style={styles.spinner} />}
        {status === 'success' && <div style={{ ...styles.icon, background: '#16a34a' }}>✓</div>}
        {status === 'error'   && <div style={{ ...styles.icon, background: '#dc2626' }}>✕</div>}

        <h2 style={styles.title}>
          {status === 'loading' ? 'Connecting Outlook…'
           : status === 'success' ? 'Connected!'
           : 'Connection Failed'}
        </h2>

        <p style={styles.msg}>{message}</p>

        {status === 'error' && (
          <button style={styles.btn} onClick={() => router.push('/outlookEmail')}>
            ← Go Back
          </button>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const styles = {
  wrapper: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', fontFamily:'system-ui,sans-serif' },
  card:    { background:'#fff', borderRadius:'16px', padding:'52px 44px', textAlign:'center', boxShadow:'0 8px 40px rgba(0,0,0,.1)', maxWidth:'380px', width:'100%' },
  spinner: { width:'56px', height:'56px', border:'4px solid #e2e8f0', borderTop:'4px solid #0078d4', borderRadius:'50%', animation:'spin .85s linear infinite', margin:'0 auto 24px' },
  icon:    { width:'56px', height:'56px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', color:'#fff', fontWeight:'700', margin:'0 auto 24px' },
  title:   { fontSize:'22px', fontWeight:'700', color:'#0f172a', margin:'0 0 10px' },
  msg:     { fontSize:'14px', color:'#64748b', lineHeight:'1.65', margin:'0 0 24px' },
  btn:     { background:'#0078d4', color:'#fff', border:'none', borderRadius:'8px', padding:'10px 24px', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
}