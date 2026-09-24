import Link from 'next/link'
import React, { useState, useEffect, useRef } from 'react'
import { FiBell, FiCheck, FiX } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import { encryptId } from "@/utils/encryptId";
import { useUser } from '@/context/UserContext';
import { formatRelativeTime } from '@/utils/formatDate';

// ─────────────────────────────────────────────
// Safe companyId reader.
// Root cause of the 500 errors: `JSON.parse(cid)` was being
// called directly wherever `cid` was read from localStorage.
// If `companyId` was ever stored as a plain (non-JSON) string/number,
// or as a stringified object, JSON.parse either throws or returns
// an object — which then gets interpolated into the URL as
// "[object Object]", causing the backend to 500.
// This helper safely parses it and rejects invalid (object) values.
// ─────────────────────────────────────────────
const getCompanyId = () => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('companyId');
    if (!raw) return null;

    let cid = raw;
    try {
        cid = JSON.parse(raw);
    } catch (e) {
        // raw wasn't valid JSON — treat as a plain string/number id
        cid = raw;
    }

    if (typeof cid === 'object' && cid !== null) {
        console.error('Invalid companyId in localStorage (object found, expected id):', cid);
        return null;
    }

    return cid;
};

const Notifications = () => {
    const [assignedNotifications, setAssignedNotifications] = useState([]);
    const [followupNotifications, setFollowupNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showAllModal, setShowAllModal] = useState(false);
    // ✅ "/me" ab yahan alag se call nahi hota — shared UserContext se role milta hai
    const { user, role: userRole } = useUser();
    // These notification endpoints are CRM/lead-specific — a medical-billing-only
    // company 401s on them, so skip firing the requests entirely in that case.
    const crmEnabled = user?.company?.crm_enabled !== false;

    // long polling control
    const isMountedRef = useRef(true);
    const lastCountRef = useRef(null);
    const pollTimeoutRef = useRef(null);

    const fetchAssignedNotifications = async () => {
        try {
            const cid = getCompanyId();
            if (!cid) return;
            const response = await crmInstance.get(`/assigned-notifications/${cid}`);
            const data = response.data.data;
            setAssignedNotifications(data);
        } catch (error) {
            // console.error('Failed to fetch assigned notifications', error);
        }
    };

    const fetchFollowupNotifications = async () => {
        try {
            const cid = getCompanyId();
            if (!cid) return;
            const response = await crmInstance.get(`/followup-notifications/${cid}`);
            let data = [];
            if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
                data = response.data.data.data;
            } else if (response.data?.data && Array.isArray(response.data.data)) {
                data = response.data.data;
            } else if (response.data && Array.isArray(response.data)) {
                data = response.data;
            }
            setFollowupNotifications(data);
        } catch (error) {
            console.error('Failed to fetch followup notifications', error);
        }
    };

    const pollUnreadCount = async () => {
        try {
            const cid = getCompanyId();
            if (!cid) return;

            const response = await crmInstance.get(`/notifications/unread-count/${cid}`);
            const newCount = response?.data?.data?.unread_count;

            if (!isMountedRef.current || typeof newCount !== 'number') return;

            if (lastCountRef.current !== null && lastCountRef.current !== newCount) {
                fetchAssignedNotifications();
                fetchFollowupNotifications();
            }

            lastCountRef.current = newCount;
            setUnreadCount(newCount);
        } catch (error) {
            console.error('Failed to fetch unread count', error);
        }
    };

    useEffect(() => {
        if (!crmEnabled) return;

        isMountedRef.current = true;

        fetchAssignedNotifications();
        fetchFollowupNotifications();
        pollUnreadCount();

        const intervalId = setInterval(() => {
            if (isMountedRef.current) pollUnreadCount();
        }, 15000); // हर 15 सेकंड — pehle 500ms tha

        return () => {
            isMountedRef.current = false;
            clearInterval(intervalId);
        };
    }, [crmEnabled]);

    const markAssignedAsRead = async (id) => {
        setAssignedNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        lastCountRef.current = Math.max(0, (lastCountRef.current || 0) - 1);

        try {
            const cid = getCompanyId();
            if (!cid) return;
            const response = await crmInstance.put(`/assigned-notifications/${id}/read/${cid}`);
            if (response.data.status) {
                const notification = assignedNotifications.find(n => n.id === id);
                if (notification && notification.lead) {
                    const encryptedLeadId = encryptId(notification.lead.id);
                    window.location.href = `/leads/view/${encryptedLeadId}`;
                }
            }
        } catch (error) {
            console.error('Failed to mark assigned notification as read', error);
            setAssignedNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: null } : n));
            setUnreadCount(prev => prev + 1);
            lastCountRef.current = (lastCountRef.current || 0) + 1;
        }
    };

    const markFollowupAsRead = async (id) => {
        setFollowupNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        lastCountRef.current = Math.max(0, (lastCountRef.current || 0) - 1);

        try {
            const cid = getCompanyId();
            if (!cid) return;
            const response = await crmInstance.put(`/followup-notifications/${id}/read/${cid}`);
            if (response.data.status) {
                const redirectUrl = response.data.data.redirect_url;
                if (redirectUrl.startsWith('/leads/view/')) {
                    const idPart = redirectUrl.split('/').pop();
                    const encryptedLeadId = encryptId(idPart);
                    window.location.href = `/leads/view/${encryptedLeadId}`;
                } else {
                    window.location.href = redirectUrl;
                }
            }
        } catch (error) {
            console.error('Failed to mark followup notification as read', error);
            setFollowupNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: null } : n));
            setUnreadCount(prev => prev + 1);
            lastCountRef.current = (lastCountRef.current || 0) + 1;
        }
    };

    const markAsRead = async (id, type) => {
        const setList = type === 'assigned' ? setAssignedNotifications : setFollowupNotifications;

        setList(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        lastCountRef.current = Math.max(0, (lastCountRef.current || 0) - 1);

        try {
            const cid = getCompanyId();
            if (!cid) return;
            const response = await crmInstance.put(`/notifications/${type}/${id}/read/${cid}`);
            if (response.data.status) {
                const redirectUrl = response.data.data?.redirect_url;
                if (redirectUrl) {
                    const encryptedLeadId = redirectUrl.startsWith('/leads/view/')
                        ? encryptId(redirectUrl.split('/').pop())
                        : null;
                    window.location.href = encryptedLeadId
                        ? `/leads/view/${encryptedLeadId}`
                        : redirectUrl;
                }
            }
        } catch (error) {
            console.error('Failed to mark notification as read', error);
            setList(prev => prev.map(n => n.id === id ? { ...n, read_at: null } : n));
            setUnreadCount(prev => prev + 1);
            lastCountRef.current = (lastCountRef.current || 0) + 1;
        }
    };

    /* ─────────────────────────────────────────────
       markAllAsRead — FIXED VERSION
       Root cause: pehle ye 2 alag routes call kar raha
       tha (`/assigned-notifications/mark-all-read/{cid}`
       aur `/followup-notifications/mark-all-read/{cid}`),
       lekin backend mein sirf EK route defined hai:
       PUT `/notifications/mark-all-read/{cid}`.
       Wo dono purane routes 404 dete the, isliye button
       silently fail ho raha tha.

       FIX: ab sirf wahi single actual backend route call
       ho raha hai jo controller mein already assigned +
       followup dono types ek saath handle karta hai.
    ───────────────────────────────────────────── */
    const markAllAsRead = async () => {
        try {
            const cid = getCompanyId();
            if (!cid) return;
            await crmInstance.put(`/notifications/mark-all-read/${cid}`);
            setAssignedNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
            setFollowupNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
            setUnreadCount(0);
            lastCountRef.current = 0;
        } catch (error) {
            console.error('Failed to mark all notifications as read', error);
        }
    };

    const deleteNotification = async (id, type) => {
        try {
            const cid = getCompanyId();
            if (!cid) return;
            await crmInstance.delete(`/notifications/${type}/${id}/${cid}`);

            if (type === 'assigned') {
                setAssignedNotifications(prev => {
                    const updated = prev.filter(n => n.id !== id);
                    const newCount = updated.filter(n => !n.read_at).length + followupNotifications.filter(n => !n.read_at).length;
                    setUnreadCount(newCount);
                    lastCountRef.current = newCount;
                    return updated;
                });
            } else {
                setFollowupNotifications(prev => {
                    const updated = prev.filter(n => n.id !== id);
                    const newCount = assignedNotifications.filter(n => !n.read_at).length + updated.filter(n => !n.read_at).length;
                    setUnreadCount(newCount);
                    lastCountRef.current = newCount;
                    return updated;
                });
            }
        } catch (error) {
            console.error('Failed to delete notification', error);
        }
    };

    const clearAllNotifications = async () => {
        try {
            const cid = getCompanyId();
            if (!cid) return;

            const assignedIds = assignedNotifications.map(n => n.id);
            const followupIds = followupNotifications.map(n => n.id);

            if (assignedIds.length > 0 || followupIds.length > 0) {
                await crmInstance.post(`/notifications/bulk-delete/${cid}`, {
                    assigned: assignedIds,
                    followup: followupIds,
                });
            }

            setAssignedNotifications([]);
            setFollowupNotifications([]);
            setUnreadCount(0);
            lastCountRef.current = 0;
        } catch (error) {
            console.error('Failed to clear all notifications', error);
        }
    };

    const calculateTimeAgo = formatRelativeTime;

    const allNotifications = [
        ...assignedNotifications.map(n => ({ ...n, type: 'assigned' })),
        ...followupNotifications.map(n => ({ ...n, type: 'followup' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (userRole === 'superadmin' || userRole === 'admin') return null;
    // Lead/follow-up notifications are a CRM concept — nothing to show for a
    // medical-billing-only company, and the endpoints 401 for them anyway.
    if (!crmEnabled) return null;

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
                        allNotifications.slice(0, 4).map(notification => <Card key={notification.id} notification={notification} onMarkRead={markAsRead} onDelete={deleteNotification} calculateTimeAgo={calculateTimeAgo} />)
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
                                {allNotifications.length > 0 && (
                                    <div className="d-flex justify-content-end mb-3">
                                        <button type="button" className="btn btn-danger btn-sm" onClick={clearAllNotifications}>
                                            <FiX size={14} className="me-1" />
                                            Clear All
                                        </button>
                                    </div>
                                )}
                                {allNotifications.map(notification => <Card key={notification.id} notification={notification} onMarkRead={markAsRead} onDelete={deleteNotification} calculateTimeAgo={calculateTimeAgo} />)}
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

export default Notifications


const Card = ({ notification, onMarkRead, onDelete, calculateTimeAgo }) => {
    const { id, message, created_at, read_at, type } = notification;
    const timeAgo = calculateTimeAgo(created_at);
    return (
        <div className="notifications-item">
            <div className="notifications-desc">
                <div className="font-body text-truncate-2-line" style={{ cursor: 'pointer' }} onClick={() => onMarkRead(id, type)}>{message}</div>
                <div className="d-flex justify-content-between align-items-center">
                    <div className="notifications-date text-muted border-bottom border-bottom-dashed">{timeAgo} - {type}</div>
                    <div className="d-flex align-items-center float-end gap-2">
                        {read_at ? (
                            <span className="d-block wd-8 ht-8 rounded-circle bg-success" data-toggle="tooltip" data-title="Read"></span>
                        ) : (
                            <span className="d-block wd-8 ht-8 rounded-circle bg-gray-300" onClick={() => onMarkRead(id, type)} data-toggle="tooltip" data-title="Make as Read"></span>
                        )}
                        <span className="text-danger" data-toggle="tooltip" data-title="Remove" onClick={() => onDelete(id, type)}> <FiX className="fs-12" /></span>
                    </div>
                </div>
            </div>
        </div>
    )
}