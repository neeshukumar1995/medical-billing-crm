'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import { FiEdit3, FiTrash2, FiPlus } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import VendorModal from '@/components/medicalBilling/VendorModal'

const page = () => {
    const router = useRouter()
    const { hasPermission } = usePermissions()
    const [vendors, setVendors] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [vendorModal, setVendorModal] = useState(null) // { id, mode } | null

    const fetchVendors = async () => {
        try {
            setLoading(true)
            const params = {}
            if (searchTerm) params.search = searchTerm
            const response = await crmInstance.get('/medical-billing/vendors', { params })
            setVendors(response.data?.data || [])
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load vendors.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setVendors([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { const t = setTimeout(fetchVendors, 300); return () => clearTimeout(t) }, [searchTerm])

    const handleDelete = async (id, name) => {
        const result = await Swal.fire({ title: `Delete "${name}"`, text: 'Are you sure?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#dc3545' })
        if (!result.isConfirmed) return
        try {
            await crmInstance.delete(`/medical-billing/vendors/${id}`)
            setVendors(prev => prev.filter(v => v.id !== id))
            Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false })
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to delete vendor.', icon: 'error' })
        }
    }

    return (
        <PermissionGuard permission="medical_inventory.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                    {hasPermission('medical_inventory.manage') && (
                        <Link href="/medical-billing/vendors/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Add Vendor
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
                                                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder='Vendor name...' className="form-control form-control-sm" />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="6" className="text-center py-4"><Spinner label="Loading vendors..." variant="spinner" /></td></tr>
                                            ) : vendors.length === 0 ? (
                                                <tr><td colSpan="6" className="text-center py-4">No vendors found.</td></tr>
                                            ) : (
                                                vendors.map((v) => (
                                                    <tr key={v.id}>
                                                        <td>{v.name}</td>
                                                        <td>{v.contact_name || 'N/A'}</td>
                                                        <td>{v.phone || 'N/A'}</td>
                                                        <td>{v.email || 'N/A'}</td>
                                                        <td><span className={`badge bg-soft-${v.status === 'active' ? 'success' : 'secondary'} text-${v.status === 'active' ? 'success' : 'secondary'} text-capitalize`}>{v.status}</span></td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {hasPermission('medical_inventory.manage') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Edit" onClick={() => setVendorModal({ id: v.id, mode: 'edit' })}><FiEdit3 /></button>
                                                                )}
                                                                {hasPermission('medical_inventory.manage') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Delete" onClick={() => handleDelete(v.id, v.name)}><FiTrash2 /></button>
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

            {vendorModal && (
                <VendorModal
                    vendorId={vendorModal.id}
                    initialMode={vendorModal.mode}
                    onClose={() => setVendorModal(null)}
                    onSaved={fetchVendors}
                />
            )}
        </PermissionGuard>
    )
}

export default page
