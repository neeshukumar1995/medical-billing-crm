'use client'

import Link from 'next/link'
import React, { useState, useEffect, useRef } from 'react'
import { FiBell, FiCheck, FiX } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import { useUser } from '@/context/UserContext'
import { formatRelativeTime } from '@/utils/formatDate'

const NotificationsModal = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount]     = useState(0);
    const [showAllModal, setShowAllModal]   = useState(false);
    const [userRole, setUserRole]           = useState(null);
    const intervalRef                        = useRef(null);
    const { user } = useUser();

    useEffect(() => {
        if (user) {
            setUserRole(user.user_role?.name || user.role);
        }
    }, [user]);

    const fetchNotifications = async () => {
        try {
            const cid = localStorage.getItem('companyId');
            if (!cid) return;

            const parsedCid = JSON.parse(cid);
            const response  = await crmInstance.get(`/followup-notifications/${parsedCid}`);

            let data = [];
            if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
                data = response.data.data.data;
            } else if (response.data?.data && Array.isArray(response.data.data)) {
                data = response.data.data;
            } else if (Array.isArray(response.data)) {
                data = response.data;
            }

            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read_at).length);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    const markAsRead = async (id) => {
        setNotifications(prev => {
            const updated = prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n);
            setUnreadCount(updated.filter(n => !n.read_at).length);
            return updated;
        });

        try {
            const cid = localStorage.getItem('companyId');
            if (!cid) return;
            await crmInstance.put(`/notifications/followup/${id}/read/${JSON.parse(cid)}`);
        } catch (error) {
            console.error('Failed to mark notification as read', error);
            setNotifications(prev => {
                const reverted = prev.map(n => n.id === id ? { ...n, read_at: null } : n);
                setUnreadCount(reverted.filter(n => !n.read_at).length);
                return reverted;
            });
        }
    };

    const markAllAsRead = async () => {
        const prevNotifications = notifications;
        const prevUnreadCount = unreadCount;

        setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
        setUnreadCount(0);

        try {
            const cid = localStorage.getItem('companyId');
            if (!cid) return;
            await crmInstance.put(`/notifications/mark-all-read/${JSON.parse(cid)}`);
        } catch (error) {
            console.error('Failed to mark all notifications as read', error);
            setNotifications(prevNotifications);
            setUnreadCount(prevUnreadCount);
        }
    };

    const deleteNotification = async (id) => {
        try {
            const cid = localStorage.getItem('companyId');
            if (!cid) return;

            await crmInstance.delete(`/notifications/followup/${id}/${JSON.parse(cid)}`);
            setNotifications(prev => {
                const updated = prev.filter(n => n.id !== id);
                setUnreadCount(updated.filter(n => !n.read_at).length);
                return updated;
            });
        } catch (error) {
            console.error('Failed to delete notification', error);
        }
    };

    const clearAllNotifications = async () => {
        try {
            const cid = localStorage.getItem('companyId');
            if (!cid) return;

            const notificationIds = notifications.map(n => n.id);
            if (notificationIds.length === 0) return;

            const response = await crmInstance.post(
                `/notifications/bulk-delete/${JSON.parse(cid)}`,
                { followup: notificationIds }
            );
            if (response.data.status) {
                setNotifications([]);
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Failed to clear all notifications', error);
        }
    };

    const calculateTimeAgo = formatRelativeTime;

    useEffect(() => {
        fetchNotifications();

        intervalRef.current = setInterval(fetchNotifications, 30000);

        return () => clearInterval(intervalRef.current);
    }, []);

    if (userRole !== 'superadmin') return null;

    return (
        <>
            <div className="dropdown nxl-h-item">
                <div
                    className="nxl-head-link me-3"
                    data-bs-toggle="dropdown"
                    role="button"
                    data-bs-auto-close="outside"
                >
                    <FiBell size={20} />
                    {unreadCount > 0 && (
                        <span className="badge bg-danger nxl-h-badge">{unreadCount}</span>
                    )}
                </div>

                <div className="dropdown-menu dropdown-menu-end nxl-h-dropdown nxl-notifications-menu">
                    <div className="d-flex justify-content-between align-items-center notifications-head">
                        <h6 className="fw-bold text-dark mb-0">Notifications</h6>
                        <div className="d-flex gap-2">
                            <Link
                                href="#"
                                className="fs-11 text-success"
                                data-toggle="tooltip"
                                data-title="Mark all as Read"
                                onClick={(e) => { e.preventDefault(); markAllAsRead(); }}
                            >
                                <FiCheck size={16} />
                            </Link>
                            <Link
                                href="#"
                                className="fs-11 text-danger"
                                data-toggle="tooltip"
                                data-title="Clear All"
                                onClick={(e) => { e.preventDefault(); clearAllNotifications(); }}
                            >
                                <FiX size={16} />
                            </Link>
                        </div>
                    </div>

                    {notifications.length === 0 ? (
                        <div className="text-center py-3 text-muted fs-13">No notifications</div>
                    ) : (
                        notifications.slice(0, 4).map(notification => (
                            <Card
                                key={notification.id}
                                notification={notification}
                                onMarkRead={markAsRead}
                                onDelete={deleteNotification}
                                calculateTimeAgo={calculateTimeAgo}
                            />
                        ))
                    )}

                    <div className="text-center notifications-footer">
                        <Link
                            href="#"
                            className="fs-13 fw-semibold text-dark"
                            onClick={(e) => {
                                e.preventDefault();
                                markAllAsRead();
                                setShowAllModal(true);
                            }}
                        >
                            All Notifications
                        </Link>
                    </div>
                </div>
            </div>

            {showAllModal && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                >
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">All Notifications</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowAllModal(false)}
                                />
                            </div>
                            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                {notifications.length === 0 ? (
                                    <div className="text-center py-3 text-muted">No notifications</div>
                                ) : (
                                    notifications.map(notification => (
                                        <Card
                                            key={notification.id}
                                            notification={notification}
                                            onMarkRead={markAsRead}
                                            onDelete={deleteNotification}
                                            calculateTimeAgo={calculateTimeAgo}
                                        />
                                    ))
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowAllModal(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default NotificationsModal;


const Card = ({ notification, onMarkRead, onDelete, calculateTimeAgo }) => {
    const { id, message, created_at, read_at } = notification;

    return (
        <div className="notifications-item">
            <div className="notifications-desc">
                <div
                    className="font-body text-truncate-2-line"
                    style={{ cursor: 'pointer', color: '#000' }}
                    onClick={() => onMarkRead(id)}
                >
                    {message}
                </div>
                <div className="d-flex justify-content-between align-items-center">
                    <div className="notifications-date text-muted border-bottom border-bottom-dashed">
                        {calculateTimeAgo(created_at)}
                    </div>
                    <div className="d-flex align-items-center float-end gap-2">
                        {read_at ? (
                            <span
                                className="d-block wd-8 ht-8 rounded-circle bg-success"
                                data-toggle="tooltip"
                                data-title="Read"
                            />
                        ) : (
                            <span
                                className="d-block wd-8 ht-8 rounded-circle bg-gray-300"
                                style={{ cursor: 'pointer' }}
                                onClick={() => onMarkRead(id)}
                                data-toggle="tooltip"
                                data-title="Mark as Read"
                            />
                        )}
                        <span
                            className="text-danger"
                            style={{ cursor: 'pointer' }}
                            data-toggle="tooltip"
                            data-title="Remove"
                            onClick={() => onDelete(id)}
                        >
                            <FiX className="fs-12" />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
