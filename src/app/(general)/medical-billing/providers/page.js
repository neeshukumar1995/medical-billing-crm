'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import { FiEdit3, FiTrash2, FiPlus, FiUser, FiUpload } from 'react-icons/fi'
import { encryptId } from '@/utils/encryptId'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import ProviderModal from '@/components/medicalBilling/ProviderModal'
import ProviderImportModal from '@/components/medicalBilling/ProviderImportModal'

const page = () => {
    const router = useRouter()
    const { hasPermission } = usePermissions()
    const [providers, setProviders] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [providerModal, setProviderModal] = useState(null) // { id, mode } | null
    const [showImportModal, setShowImportModal] = useState(false)

    const fetchProviders = async () => {
        try {
            setLoading(true)
            const params = {}
            if (searchTerm) params.search = searchTerm

            const response = await crmInstance.get('/medical-billing/providers', { params })
            const data = response.data?.data
            setProviders(Array.isArray(data) ? data : [])
            setTotal(response.data?.total ?? (Array.isArray(data) ? data.length : 0))
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load providers. Please try again.'
            if (err.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.'
            } else if (err.response?.status === 403) {
                errorMessage = 'You do not have permission to view providers.'
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message
            }
            setError(errorMessage)
            setProviders([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const t = setTimeout(fetchProviders, 300)
        return () => clearTimeout(t)
    }, [searchTerm])

    const handleDeleteProvider = async (providerId, name) => {
        const result = await Swal.fire({
            title: 'Archive Provider',
            text: `Are you sure you want to archive "${name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Archive',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545'
        })

        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/medical-billing/providers/${providerId}`)
            setProviders(prev => prev.filter(p => p.id !== providerId))
            Swal.fire({
                title: 'Archived!',
                text: `Provider "${name}" has been archived.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            })
        } catch (err) {
            Swal.fire({
                title: 'Error!',
                text: err.response?.data?.message || 'Failed to archive provider.',
                icon: 'error'
            })
        }
    }

    return (
        <PermissionGuard permission="medical_providers.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    {hasPermission('medical_providers.manage') && (
                        <button className="btn btn-light-brand" onClick={() => setShowImportModal(true)}>
                            <FiUpload className="me-2" />
                            Bulk Upload
                        </button>
                    )}
                    {hasPermission('medical_providers.manage') && (
                        <Link href="/medical-billing/providers/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Add Provider
                        </Link>
                    )}
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}

                                <div className='row gy-2'>
                                    <div className='col-sm-12 ps-0 m-0 pb-10'>
                                        <div className='dataTables_filter d-flex justify-content-end'>
                                            <label className='d-inline-flex align-items-center gap-2'>
                                                Search:
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    placeholder='Name or NPI...'
                                                    className="form-control form-control-sm"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} provider${total === 1 ? '' : 's'}`}
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>S.No</th>
                                                <th>Name</th>
                                                <th>NPI</th>
                                                <th>Specialty</th>
                                                <th>Phone</th>
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="7" className="text-center py-4">
                                                        <Spinner label="Loading providers..." variant="spinner" />
                                                    </td>
                                                </tr>
                                            ) : providers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="text-center py-4">
                                                        {searchTerm ? 'No providers found matching your search.' : 'No providers found.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                providers.map((provider, index) => (
                                                    <tr key={provider.id}>
                                                        <td>{index + 1}</td>
                                                        <td>{provider.first_name} {provider.last_name}</td>
                                                        <td>{provider.npi || 'N/A'}</td>
                                                        <td>{provider.specialty || 'N/A'}</td>
                                                        <td>{provider.phone || 'N/A'}</td>
                                                        <td>
                                                            <span className={`badge bg-soft-${provider.status === 'active' ? 'success' : 'secondary'} text-${provider.status === 'active' ? 'success' : 'secondary'} text-capitalize`}>
                                                                {provider.status}
                                                            </span>
                                                        </td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                <Link href={`/medical-billing/providers/profile/${encryptId(provider.id)}`} className="avatar-text avatar-md" title="View Profile">
                                                                    <FiUser />
                                                                </Link>
                                                                {hasPermission('medical_providers.manage') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Edit" onClick={() => setProviderModal({ id: provider.id, mode: 'edit' })}>
                                                                        <FiEdit3 />
                                                                    </button>
                                                                )}
                                                                {hasPermission('medical_providers.delete') && (
                                                                    <button
                                                                        type="button"
                                                                        className="avatar-text avatar-md"
                                                                        onClick={() => handleDeleteProvider(provider.id, `${provider.first_name} ${provider.last_name}`)}
                                                                        title="Archive"
                                                                    >
                                                                        <FiTrash2 />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {providerModal && (
                <ProviderModal
                    providerId={providerModal.id}
                    initialMode={providerModal.mode}
                    onClose={() => setProviderModal(null)}
                    onSaved={fetchProviders}
                />
            )}

            {showImportModal && (
                <ProviderImportModal
                    onClose={() => setShowImportModal(false)}
                    onImported={fetchProviders}
                />
            )}
        </PermissionGuard>
    )
}

export default page
