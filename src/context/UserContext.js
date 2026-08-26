'use client'
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import crmInstance from '@/utils/crmInstance'

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

export function UserProvider({ children }) {
    const [user, setUser] = useState(null)
    const [permissions, setPermissions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const fetchedRef = useRef(false)

    const fetchMe = useCallback(async () => {
        // Token hi nahi hai (logged out / login page) — API call maarne ka
        // koi matlab nahi, bas 401 + console error milega. Chup-chaap skip karo.
        if (typeof window !== 'undefined' && !localStorage.getItem('access_token')) {
            setUser(null)
            setPermissions([])
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            const response = await crmInstance.get('/me')
            if (response.data.status && response.data.user) {
                setUser(response.data.user)
                setPermissions(response.data.permissions || [])
                setError(null)

                // localStorage bhi fresh rakho, taaki initial paint pe
                // components ke paas turant kuch dikhane ko ho
                if (typeof window !== 'undefined') {
                    localStorage.setItem('user', JSON.stringify(response.data.user))
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

    const value = {
        user,
        permissions,
        role,
        loading,
        error,
        isAuthenticated: !loading && !!user,
        refetchUser: fetchMe, // agar kisi component ko fresh data chahiye ho (e.g. profile update ke baad)
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