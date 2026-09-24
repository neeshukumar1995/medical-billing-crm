'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';

const PermissionGuard = ({
    permission,
    fallback = null,
    children,
    redirect = true
}) => {
    const [hasPermission, setHasPermission] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userPermissions, setUserPermissions] = useState([]);
    const router = useRouter();
    const { permissions, loading: userLoading } = useUser();

    useEffect(() => {
        const checkPermissions = async () => {
            try {
                setLoading(true);

                const apiData = { permissions };

                if (apiData.permissions) {
                    setUserPermissions(apiData.permissions);

                    const requiredPermissions = Array.isArray(permission) ? permission : [permission];
                    const userHasPermission = requiredPermissions.some(requiredPerm => {
                        if (apiData.permissions.includes('*')) {
                            return true;
                        }

                        if (apiData.permissions.includes(requiredPerm)) {
                            return true;
                        }

                        const permissionParts = requiredPerm.split('-');
                        if (permissionParts.length >= 2) {
                            const resource = permissionParts.slice(1).join('-');
                            const managePermission = `manage-${resource}`;
                            if (apiData.permissions.includes(managePermission)) {
                                return true;
                            }
                        }

                        return false;
                    });

                    setHasPermission(userHasPermission);

                    if (!userHasPermission && redirect) {
                        localStorage.removeItem('user');
                        router.push('/');
                        return;
                    }
                } else {
                    throw new Error('Invalid API response');
                }

            } catch (error) {
                console.error('Permission check failed:', error);

                const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
                if (cachedUser.permissions) {
                    const permissions = cachedUser.permissions;
                    setUserPermissions(permissions);

                    const requiredPermissions = Array.isArray(permission) ? permission : [permission];
                    const userHasPermission = requiredPermissions.some(requiredPerm => {
                        if (permissions.includes('*')) {
                            return true;
                        }
                        if (permissions.includes(requiredPerm)) {
                            return true;
                        }

                        const permissionParts = requiredPerm.split('-');
                        if (permissionParts.length >= 2) {
                            const resource = permissionParts.slice(1).join('-');
                            const managePermission = `manage-${resource}`;
                            if (permissions.includes(managePermission)) {
                                return true;
                            }
                        }

                        return false;
                    });

                    setHasPermission(userHasPermission);
                } else {
                    localStorage.removeItem('user');
                    if (redirect) {
                        router.push('/');
                        return;
                    }
                    setHasPermission(false);
                }
            } finally {
                setLoading(false);
            }
        };

        checkPermissions();
    }, [permission, redirect, router, permissions]);

    if (loading || userLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Checking permissions...</span>
                    </div>
                    <p className="mt-2">Checking permissions...</p>
                </div>
            </div>
        );
    }

    if (!hasPermission) {
        if (fallback) return fallback;

        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <div className="text-center">
                    <div className="display-1 text-danger mb-4">
                        <i className="bi bi-shield-x"></i>
                    </div>
                    <h2 className="mb-3">Access Denied</h2>
                    <p className="text-muted mb-4">
                        You don't have permission to access this page.
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={() => router.push('/dashboard')}
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return children;
};

export default PermissionGuard;
