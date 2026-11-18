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

/** Special values for "All Clients" and "All Companies" in the header switcher. */
export const ALL_CLIENTS = 'all'
export const ALL_COMPANIES = 'all'

// Client chosen in the header switcher (see selectedClientKey).
const CLIENT_KEY = 'selectedClientKey'

// Normalize any legacy unquoted "all" value in localStorage immediately on module load
// so any component calling JSON.parse(localStorage.getItem('companyId')) never throws.
if (typeof window !== 'undefined') {
    try {
        if (localStorage.getItem(COMPANY_KEY) === ALL_COMPANIES) {
            localStorage.setItem(COMPANY_KEY, JSON.stringify(ALL_COMPANIES))
        }
    } catch { /* ignore storage errors */ }
}

const readActiveCompanyId = () => {
    if (typeof window === 'undefined') return null
    try {
        const raw = localStorage.getItem(COMPANY_KEY)
        if (!raw) return null
        if (raw === ALL_COMPANIES) {
            localStorage.setItem(COMPANY_KEY, JSON.stringify(ALL_COMPANIES))
            return ALL_COMPANIES
        }
        if (raw === '"all"') return ALL_COMPANIES
        const parsed = JSON.parse(raw)
        if (parsed === ALL_COMPANIES) return ALL_COMPANIES
        const num = Number(parsed)
        return Number.isFinite(num) && num > 0 ? num : null
    } catch {
        const raw = localStorage.getItem(COMPANY_KEY)
        if (raw === ALL_COMPANIES) return ALL_COMPANIES
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

                // Keep the stored active company while the user may still open
                // it (or when "all" companies is selected); otherwise fall back
                // to their own company.
                let activeId = readActiveCompanyId()
                const isAllSelected = activeId === ALL_COMPANIES && list.length > 0
                if (isAllSelected) {
                    localStorage.setItem(COMPANY_KEY, JSON.stringify(ALL_COMPANIES))
                } else if (!activeId || (list.length > 0 && !list.some(c => c.id === activeId))) {
                    activeId = me.company_id
                    localStorage.setItem(COMPANY_KEY, JSON.stringify(activeId))
                }

                // user.company always describes the ACTIVE company, so every
                // consumer of its module flags (crm_enabled /
                // medical_billing_enabled) follows the switcher.
                const active = isAllSelected
                    ? {
                        ...(me.company || list[0] || {}),
                        id: me.company_id || list[0]?.id,
                        name: 'All Companies',
                        crm_enabled: list.some(c => c.crm_enabled !== false),
                        medical_billing_enabled: list.some(c => c.medical_billing_enabled !== false),
                    }
                    : list.find(c => c.id === activeId)
                const effectiveUser = !isAllSelected && (activeId === me.company_id || !active)
                    ? me
                    : { ...me, company: active }

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
     * Makes another company (or ALL_COMPANIES = 'all') the active one for the
     * whole portal and reloads (optionally at `redirectTo`) so every page
     * refetches its data.
     */
    const switchCompany = useCallback((companyId, redirectTo = null) => {
        if (companyId === ALL_COMPANIES || String(companyId) === ALL_COMPANIES) {
            localStorage.setItem(COMPANY_KEY, JSON.stringify(ALL_COMPANIES))
        } else {
            const id = Number(companyId)
            localStorage.setItem(COMPANY_KEY, JSON.stringify(id))
        }
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
            if (e.newValue === ALL_COMPANIES || e.newValue === '"all"') {
                newId = ALL_COMPANIES
            } else {
                try { newId = Number(JSON.parse(e.newValue)) } catch { return }
            }
            if (!newId || newId === activeCompanyId) return
            const name = newId === ALL_COMPANIES
                ? 'All Companies'
                : (companies.find(c => c.id === newId)?.name || 'another company')
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

    const activeCompany = activeCompanyId === ALL_COMPANIES
        ? { id: ALL_COMPANIES, name: 'All Companies' }
        : (companies.find(c => c.id === activeCompanyId) || null)

    // Client chosen in the header switcher (or by opening a client from the
    // sidebar). Remembered across reloads/company switches in localStorage,
    // cleared on logout. A user who can only see one client has it chosen
    // automatically.
    // Values: a client id (string), NO_CLIENT for companies without one,
    // ALL_CLIENTS ('all') for all clients, or null.
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
        : (pickedClientKey && (pickedClientKey === ALL_CLIENTS || clientKeys.includes(pickedClientKey)) ? pickedClientKey : null)

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
        selectedClientKey,     // chosen client: id string, NO_CLIENT, ALL_CLIENTS ('all'), or null (none chosen yet)
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
