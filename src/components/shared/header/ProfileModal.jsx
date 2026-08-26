'use client'
import Image from 'next/image'
import React, { Fragment, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiActivity, FiBell, FiChevronRight, FiDollarSign, FiLogOut, FiSettings, FiUser } from "react-icons/fi"
import { logout } from '@/utils/logout'
import { getImageUrl } from '@/config/api'
import { useUser } from '@/context/UserContext'
 
const subscriptionsList = ["Plan", "Billings", "Referrals", "Payments", "Statements", "Subscriptions"]
const ProfileModal = () => {
    const router = useRouter()
    // ✅ "/me" ab yahan alag se call nahi hota — shared UserContext se
    // user data milta hai (loading state bhi context se hi aati hai)
    const { user: contextUser, loading, refetchUser } = useUser()
    const [localUser, setLocalUser] = useState({})
 
    // Helper function to safely access localStorage
    const getLocalStorageUser = () => {
        if (typeof window === 'undefined') return {}
        try {
            const userData = localStorage.getItem('user')
            return userData ? JSON.parse(userData) : {}
        } catch (error) {
            console.error('Error parsing user data from localStorage:', error)
            return {}
        }
    }

    // context ka user hi source of truth hai; agar wo abhi null hai
    // (loading ya error state), localStorage se fallback dikhao
    const user = contextUser || localUser
 
    useEffect(() => {
        // Initial load - localStorage se turant dikhane ke liye
        // (jab tak context ka /me fetch complete na ho jaaye)
        setLocalUser(getLocalStorageUser())
 
        // Listen for user updates (e.g. profile edit ke baad)
        const handleUserUpdate = () => {
            setLocalUser(getLocalStorageUser())
            // agar context bhi refresh karna ho:
            refetchUser?.()
        }
 
        if (typeof window !== 'undefined') {
            window.addEventListener('userUpdated', handleUserUpdate)
            return () => window.removeEventListener('userUpdated', handleUserUpdate)
        }
    }, [refetchUser])
 
    const handleLogout = async () => {
        // Show confirmation dialog
        const confirmLogout = window.confirm('Are you sure you want to logout?')
 
        if (confirmLogout) {
            // Use the centralized logout function
            await logout()
        }
    }
 
    // Helper function to get profile image URL
    const getProfileImageUrl = (profileImagePath) => {
        if (!profileImagePath) return "/images/avatar/1.png"
        return getImageUrl(profileImagePath)
    }
 
    if (loading) {
        return (
            <div className="dropdown nxl-h-item">
                <a href="#" className="d-flex align-items-center">
                    <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </a>
            </div>
        )
    }
 
    return (
        <div className="dropdown nxl-h-item">
            <a href="#" data-bs-toggle="dropdown" role="button" data-bs-auto-close="outside">
                <Image
                    width={40}
                    height={40}
                    src={getProfileImageUrl(user.profile_image)}
                    alt="user-image"
                    className="img-fluid user-avtar me-0"
                    onError={(e) => {
                        e.target.src = "/images/avatar/1.png"
                    }}
                />
            </a>
            <div className="dropdown-menu dropdown-menu-end nxl-h-dropdown nxl-user-dropdown">
                <div className="dropdown-header">
                    <div className="d-flex align-items-center">
                        <Image
                            width={40}
                            height={40}
                            src={getProfileImageUrl(user.profile_image)}
                            alt="user-image"
                            className="img-fluid user-avtar"
                            onError={(e) => {
                                e.target.src = "/images/avatar/1.png"
                            }}
                        />
                        <div>
                            <h6 className="text-dark mb-0">{user.name || 'User'}</h6>
                            <span className="fs-12 fw-medium text-muted">{user.email || 'user@example.com'}</span>
                        </div>
                    </div>
                </div>
               
               
                <a href="/settings/ganeral" className="dropdown-item">
                    <i ><FiUser /></i>
                    <span>Profile Details</span>
                </a>
               
                <div className="dropdown-divider"></div>
                <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} className="dropdown-item">
                    <i> <FiLogOut /></i>
                    <span>Logout</span>
                </a>
            </div>
        </div>
    )
}
 
export default ProfileModal