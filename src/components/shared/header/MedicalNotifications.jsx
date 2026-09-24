import Link from 'next/link'
import React, { useState, useEffect, useRef } from 'react'
import { FiBell, FiCheck, FiX } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import { useUser } from '@/context/UserContext'
import { formatRelativeTime } from '@/utils/formatDate'

// Same safe companyId reader as Notifications.jsx — see that file for why
// JSON.parse can't be called on the raw localStorage value directly.
const getCompanyId = () => {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem('companyId')
    if (!raw) return null

    let cid = raw
    try {
        cid = JSON.parse(raw)
    } catch (e) {
        cid = raw
    }

    if (typeof cid === 'object' && cid !== null) {
        console.error('Invalid companyId in localStorage (object found, expected id):', cid)
        return null
    }

    return cid
}

const MedicalNotifications = () => {
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [showAllModal, setShowAllModal] = useState(false)
    const { user, role: userRole } = useUser()
    const medicalBillingEnabled = user?.company?.medical_billing_enabled !== false

    const isMountedRef = useRef(true)
    const lastCountRef = useRef(null)

    const fetchNotifications = async () => {
        try {
            const cid = getCompanyId()
            if (!cid) return
            const response = await crmInstance.get(`/medical-billing/notifications/${cid}`)
            setNotifications(response.data?.data || [])
        } catch (error) {
            console.error('Failed to fetch medical billing notifications', error)
        }
    }

    const pollUnreadCount = async () => {
        try {
            const cid = getCompanyId()
            if (!cid) return

            const response = await crmInstance.get(`/medical-billing/notifications/unread-count/${cid}`)
            const newCount = response?.data?.data?.unread_count

            if (!isMountedRef.current || typeof newCount !== 'number') return

            if (lastCountRef.current !== null && lastCountRef.current !== newCount) {
                fetchNotifications()
            }

            lastCountRef.current = newCount
            setUnreadCount(newCount)
        } catch (error) {
            console.error('Failed to fetch medical billing unread count', error)
        }
    }

    useEffect(() => {
        if (!medicalBillingEnabled) return

        isMountedRef.current = true

        fetchNotifications()
        pollUnreadCount()

        const intervalId = setInterval(() => {
            if (isMountedRef.current) pollUnreadCount()
        }, 15000)

        return () => {
            isMountedRef.current = false
            clearInterval(intervalId)
        }
    }, [medicalBillingEnabled])

    const markAsRead = async (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
        lastCountRef.current = Math.max(0, (lastCountRef.current || 0) - 1)

        try {
            const cid = getCompanyId()
            if (!cid) return
            const response = await crmInstance.put(`/medical-billing/notifications/${id}/read/${cid}`)
            const redirectUrl = response.data?.data?.redirect_url
            if (redirectUrl) window.location.href = redirectUrl
        } catch (error) {
            console.error('Failed to mark notification as read', error)
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: null } : n))
            setUnreadCount(prev => prev + 1)
            lastCountRef.current = (lastCountRef.current || 0) + 1
        }
    }

    const markAllAsRead = async () => {
        try {
            const cid = getCompanyId()
            if (!cid) return
            await crmInstance.put(`/medical-billing/notifications/mark-all-read/${cid}`)
            setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
            setUnreadCount(0)
            lastCountRef.current = 0
        } catch (error) {
            console.error('Failed to mark all medical billing notifications as read', error)
        }
    }

    const deleteNotification = async (id) => {
        try {
            const cid = getCompanyId()
            if (!cid) return
            await crmInstance.delete(`/medical-billing/notifications/${id}/${cid}`)
            setNotifications(prev => {
                const updated = prev.filter(n => n.id !== id)
                const newCount = updated.filter(n => !n.read_at).length
                setUnreadCount(newCount)
                lastCountRef.current = newCount
                return updated
            })
        } catch (error) {
            console.error('Failed to delete medical billing notification', error)
        }
    }

    const clearAllNotifications = async () => {
        const cid = getCompanyId()
        if (!cid) return
        try {
            await Promise.all(notifications.map(n => crmInstance.delete(`/medical-billing/notifications/${n.id}/${cid}`)))
        } catch (error) {
            console.error('Failed to clear all medical billing notifications', error)
        }
        setNotifications([])
        setUnreadCount(0)
        lastCountRef.current = 0
    }

    const calculateTimeAgo = formatRelativeTime

    // Unlike the CRM bell, this one isn't hidden for admin/manager roles —
    // credentialing-expiry notifications are specifically addressed to
    // whoever holds medical_credentialing.manage, which is often an admin.
    if (userRole === 'superadmin') return null
    if (!medicalBillingEnabled) return null

    return (
        <>
            <div className="dropdown nxl-h-item">
                <div className="nxl-head-link me-3" data-bs-toggle="dropdown" role="button" data-bs-auto-close="outside">
                    <FiBell size={20} />
                    <span className="badge bg-danger nxl-h-badge">{unreadCount}</span>
                </div>
                <div className="dropdown-menu dropdown-menu-end nxl-h-dropdown nxl-notifications-menu">
                    <div className="d-flex justify-content-between align-items-center notifications-head">
                        <h6 className="fw-bold text-dark mb-0">Notifications</h6>
                        <div className="d-flex gap-2">
                            <Link href="#" className="fs-11 text-success" data-toggle="tooltip" data-title="Make as Read" onClick={markAllAsRead}>
                                <FiCheck size={16} />
                            </Link>
                            <Link href="#" className="fs-11 text-danger" data-toggle="tooltip" data-title="Clear All" onClick={clearAllNotifications}>
                                <FiX size={16} />
                            </Link>
                        </div>
                    </div>
                    {
                        notifications.slice(0, 4).map(notification => <Card key={notification.id} notification={notification} onMarkRead={markAsRead} onDelete={deleteNotification} calculateTimeAgo={calculateTimeAgo} />)
                    }

                    <div className="text-center notifications-footer">
                        <Link href="#" className="fs-13 fw-semibold text-dark" onClick={() => setShowAllModal(true)}>All Notifications</Link>
                    </div>
                </div>
            </div>

            {showAllModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">All Notifications</h5>
                                <button type="button" className="btn-close" onClick={() => setShowAllModal(false)}></button>
                            </div>
                            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                {notifications.length > 0 && (
                                    <div className="d-flex justify-content-end mb-3">
                                        <button type="button" className="btn btn-danger btn-sm" onClick={clearAllNotifications}>
                                            <FiX size={14} className="me-1" />
                                            Clear All
                                        </button>
                                    </div>
                                )}
                                {notifications.map(notification => <Card key={notification.id} notification={notification} onMarkRead={markAsRead} onDelete={deleteNotification} calculateTimeAgo={calculateTimeAgo} />)}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAllModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default MedicalNotifications

const Card = ({ notification, onMarkRead, onDelete, calculateTimeAgo }) => {
    const { id, title, message, created_at, read_at } = notification
    const timeAgo = calculateTimeAgo(created_at)
    return (
        <div className="notifications-item">
            <div className="notifications-desc">
                <div className="font-body text-truncate-2-line" style={{ cursor: 'pointer' }} onClick={() => onMarkRead(id)}>
                    {title ? <strong>{title}: </strong> : null}{message}
                </div>
                <div className="d-flex justify-content-between align-items-center">
                    <div className="notifications-date text-muted border-bottom border-bottom-dashed">{timeAgo}</div>
                    <div className="d-flex align-items-center float-end gap-2">
                        {read_at ? (
                            <span className="d-block wd-8 ht-8 rounded-circle bg-success" data-toggle="tooltip" data-title="Read"></span>
                        ) : (
                            <span className="d-block wd-8 ht-8 rounded-circle bg-gray-300" onClick={() => onMarkRead(id)} data-toggle="tooltip" data-title="Make as Read"></span>
                        )}
                        <span className="text-danger" data-toggle="tooltip" data-title="Remove" onClick={() => onDelete(id)}> <FiX className="fs-12" /></span>
                    </div>
                </div>
            </div>
        </div>
    )
}
