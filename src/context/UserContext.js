'use client'
import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'

/*
 * ─────────────────────────────────────────────────────────────
 * Yeh context poore app ke liye "/me" ko SIRF EK BAAR fetch karta hai.
 * Pehle Header.jsx, ProfileModal.jsx, Notifications.jsx aur
 * dashboard/page.js — sab independently "/me" call kar rahe the,
 * jisse ek hi page load pe 4-5 "/me" calls fire ho rahi thi.
 * Isse live server (shared hosting) pe MySQL connection limit
 * exhaust ho jaati thi aur random 500 errors aate the.
 *
 * Ab sirf yeh Provider "/me" call karega, aur sab components
 * useUser() hook se same data read karenge.
 * ─────────────────────────────────────────────────────────────
 */

const UserContext = createContext(null)

// Active company (header switcher) — every page reads it from this key.
const COMPANY_KEY = 'companyId'

/** selectedClientKey value for companies that belong to no client. */
export const NO_CLIENT = 'none'

// Client chosen in the header switcher (see selectedClientKey).
const CLIENT_KEY = 'selectedClientKey'

const readActiveCompanyId = () => {
    if (typeof window === 'undefined') return null
    try {
        const raw = localStorage.getItem(COMPANY_KEY)
        return raw ? Number(JSON.parse(raw)) : null
    } catch {
        return null
    }
}

export function UserProvider({ children }) {
    const [user, setUser] = useState(null)
    const [permissions, setPermissions] = useState([])
    const [companies, setCompanies] = useState([])
    const [access, setAccess] = useState({ scope: 'company', client: null })
    const [activeCompanyId, setActiveCompanyId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const fetchedRef = useRef(false)

    const fetchMe = useCallback(async () => {
        // Token hi nahi hai (logged out / login page) — API call maarne ka
        // koi matlab nahi, bas 401 + console error milega. Chup-chaap skip karo.
        if (typeof window !== 'undefined' && !localStorage.getItem('access_token')) {
            setUser(null)
            setPermissions([])
            setCompanies([])
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            const [response, companiesResponse] = await Promise.all([
                crmInstance.get('/me'),
                crmInstance.get('/my-companies').catch(() => ({ data: [] })),
            ])
            if (response.data.status && response.data.user) {
                const me = response.data.user
                const list = Array.isArray(companiesResponse.data) ? companiesResponse.data : []

                // Keep the stored active company only while the user may
                // still open it; otherwise fall back to their own company.
                let activeId = readActiveCompanyId()
                if (!activeId || (list.length > 0 && !list.some(c => c.id === activeId))) {
                    activeId = me.company_id
                    localStorage.setItem(COMPANY_KEY, JSON.stringify(activeId))
                }

                // user.company always describes the ACTIVE company, so every
                // consumer of its module flags (crm_enabled /
                // medical_billing_enabled) follows the switcher.
                const active = list.find(c => c.id === activeId)
                const effectiveUser = activeId === me.company_id || !active ? me : { ...me, company: active }

                setUser(effectiveUser)
                setPermissions(response.data.permissions || [])
                setCompanies(list)
                setAccess(response.data.access || { scope: 'company', client: null })
                setActiveCompanyId(activeId)
                setError(null)

                // localStorage bhi fresh rakho, taaki initial paint pe
                // components ke paas turant kuch dikhane ko ho
                if (typeof window !== 'undefined') {
                    localStorage.setItem('user', JSON.stringify(effectiveUser))
                }
            } else {
                setUser(null)
                setError(new Error('Invalid /me response'))
            }
        } catch (err) {
            console.error('Failed to fetch user (/me):', err)
            setUser(null)
            setError(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        // StrictMode / re-render guard — "/me" sirf ek baar fire ho
        if (fetchedRef.current) return
        fetchedRef.current = true
        fetchMe()
    }, [fetchMe])

    const role = user?.role || user?.user_role?.name || ''

    /**
     * Makes another company the active one for the whole portal and reloads
     * (optionally at `redirectTo`) so every page refetches its data.
     */
    const switchCompany = useCallback((companyId, redirectTo = null) => {
        const id = Number(companyId)
        localStorage.setItem(COMPANY_KEY, JSON.stringify(id))
        if (redirectTo) {
            window.location.href = redirectTo
        } else {
            window.location.reload()
        }
    }, [])

    // The active company lives in localStorage, which every tab shares. If
    // another tab switches company, this tab's next request would silently
    // go to that company — so tell the user and reload into it.
    useEffect(() => {
        if (typeof window === 'undefined' || !activeCompanyId) return
        const onStorage = (e) => {
            if (e.key !== COMPANY_KEY || !e.newValue) return
            let newId = null
            try { newId = Number(JSON.parse(e.newValue)) } catch { return }
            if (!newId || newId === activeCompanyId) return
            const name = companies.find(c => c.id === newId)?.name || 'another company'
            Swal.fire({
                title: 'Company changed in another tab',
                text: `The active company is now "${name}". This page will reload so you don't save data into the wrong company.`,
                icon: 'info',
                confirmButtonText: 'Reload',
                allowOutsideClick: false,
            }).then(() => window.location.reload())
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
    }, [activeCompanyId, companies])

    const activeCompany = companies.find(c => c.id === activeCompanyId) || null

    // Client chosen in the header switcher (or by opening a client from the
    // sidebar). No companies are listed — header switcher, Companies list —
    // until a client is chosen. Remembered across reloads/company switches
    // in localStorage, cleared on logout. A user who can only see one
    // client has it chosen automatically.
    // Values: a client id (string), NO_CLIENT for companies without one, or null.
    const [pickedClientKey, setPickedClientKeyState] = useState(null)
    useEffect(() => {
        try {
            const stored = localStorage.getItem(CLIENT_KEY)
            if (stored) setPickedClientKeyState(stored)
        } catch { /* storage unavailable — start unselected */ }
    }, [])
    const setSelectedClientKey = useCallback((key) => {
        const value = key ? String(key) : null
        setPickedClientKeyState(value)
        try {
            if (value) localStorage.setItem(CLIENT_KEY, value)
            else localStorage.removeItem(CLIENT_KEY)
        } catch { /* storage unavailable — selection lasts until reload */ }
    }, [])
    const clientKeys = useMemo(
        () => [...new Set(companies.map(c => (c.client_id ? String(c.client_id) : NO_CLIENT)))],
        [companies]
    )
    const selectedClientKey = clientKeys.length === 1
        ? clientKeys[0]
        : (pickedClientKey && clientKeys.includes(pickedClientKey) ? pickedClientKey : null)

    const value = {
        user,
        permissions,
        role,
        loading,
        error,
        isAuthenticated: !loading && !!user,
        refetchUser: fetchMe, // agar kisi component ko fresh data chahiye ho (e.g. profile update ke baad)
        // Client / company access
        companies,             // companies the user may switch into (with .client)
        access,                // { scope: 'platform' | 'client' | 'company', client }
        isPlatform: access.scope === 'platform',
        activeCompanyId,
        activeCompany,
        switchCompany,
        selectedClientKey,     // chosen client: id string, NO_CLIENT, or null (none chosen yet)
        setSelectedClientKey,
    }

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export const useUser = () => {
    const ctx = useContext(UserContext)
    if (!ctx) {
        throw new Error('useUser must be used within a <UserProvider>')
    }
    return ctx
}