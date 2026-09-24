'use client'
import React, { useState } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import UsersHeader from '@/components/users/UsersHeader'
import { seedPermissions, seedMissingPermissions, checkExistingPermissions } from '@/utils/seedPermissions'
import Swal from 'sweetalert2'

const PermissionSeederPage = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [results, setResults] = useState(null)
    const [existingPermissions, setExistingPermissions] = useState([])

    const handleSeedAll = async () => {
        const result = await Swal.fire({
            title: 'Seed All Permissions?',
            text: 'This will create all permissions. Existing permissions will be skipped.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Seed All'
        })

        if (!result.isConfirmed) return

        setIsLoading(true)
        try {
            const response = await seedPermissions()
            setResults(response)

            if (response.success) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Permissions seeded successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK'
                })
            } else if (response.fallback) {
                Swal.fire({
                    title: 'Partial Success',
                    text: 'Some permissions were created. Check console for details.',
                    icon: 'warning',
                    confirmButtonText: 'OK'
                })
            }
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: 'Failed to seed permissions.',
                icon: 'error',
                confirmButtonText: 'OK'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSeedMissing = async () => {
        setIsLoading(true)
        try {
            const response = await seedMissingPermissions()
            setResults(response)

            Swal.fire({
                title: 'Success!',
                text: response.message || 'Missing permissions created successfully!',
                icon: 'success',
                confirmButtonText: 'OK'
            })
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: 'Failed to seed missing permissions.',
                icon: 'error',
                confirmButtonText: 'OK'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleCheckExisting = async () => {
        setIsLoading(true)
        try {
            const permissions = await checkExistingPermissions()
            setExistingPermissions(permissions)
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: 'Failed to check existing permissions.',
                icon: 'error',
                confirmButtonText: 'OK'
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <PageHeader>
                <UsersHeader />
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-header">
                                <h5 className="card-title">Permission Seeder</h5>
                                <p className="card-subtitle">Create permissions for all sidebar menu items</p>
                            </div>
                            <div className="card-body">
                                <div className="alert alert-info">
                                    <strong>Available Permissions to Create:</strong>
                                    <ul className="mb-0 mt-2">
                                        <li><strong>Dashboard:</strong> view-dashboard</li>
                                        <li><strong>Users:</strong> view-users, create-users, edit-users, delete-users, view-trashed-users</li>
                                        <li><strong>Roles & Permissions:</strong> view-roles, create-roles, edit-roles, delete-roles, manage-roles-permissions, view-permissions, create-permissions, edit-permissions, delete-permissions</li>
                                        <li><strong>Leads:</strong> view-leads, create-leads, edit-leads, delete-leads</li>
                                        <li><strong>Reports:</strong> view-reports, view-sales-report, view-leads-report</li>
                                        <li><strong>Settings:</strong> view-settings, view-profile, edit-profile</li>
                                    </ul>
                                </div>

                                <div className="d-flex gap-2 mb-4">
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSeedAll}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Seeding...' : 'Seed All Permissions'}
                                    </button>
                                    <button
                                        className="btn btn-success"
                                        onClick={handleSeedMissing}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Checking...' : 'Seed Missing Permissions'}
                                    </button>
                                    <button
                                        className="btn btn-info"
                                        onClick={handleCheckExisting}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Checking...' : 'Check Existing Permissions'}
                                    </button>
                                </div>

                                {existingPermissions.length > 0 && (
                                    <div className="alert alert-secondary">
                                        <strong>Existing Permissions ({existingPermissions.length}):</strong>
                                        <div className="mt-2">
                                            {existingPermissions.map(permission => (
                                                <span key={permission} className="badge bg-secondary me-1 mb-1">
                                                    {permission}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {results && (
                                    <div className="alert alert-success">
                                        <strong>Seeding Results:</strong>
                                        <pre className="mt-2 mb-0" style={{ fontSize: '12px' }}>
                                            {JSON.stringify(results, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                <div className="alert alert-warning">
                                    <strong>Instructions:</strong>
                                    <ol className="mb-0 mt-2">
                                        <li>Click "Seed All Permissions" to create all permissions at once</li>
                                        <li>Or click "Seed Missing Permissions" to only create permissions that don't exist</li>
                                        <li>Use "Check Existing Permissions" to see what permissions are already in the database</li>
                                        <li>After seeding, go to Roles management to assign these permissions to roles</li>
                                        <li>Assign roles to users so they see appropriate menus based on permissions</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default PermissionSeederPage