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
import InsurancePayerModal from '@/components/medicalBilling/InsurancePayerModal'

const page = () => {
    const router = useRouter()
    const { hasPermission } = usePermissions()
    const [payers, setPayers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [payerModal, setPayerModal] = useState(null) // { id, mode } | null

    const fetchPayers = async () => {
        try {
            setLoading(true)
            const params = {}
            if (searchTerm) params.search = searchTerm

            const response = await crmInstance.get('/medical-billing/insurance/payers', { params })
            const data = response.data?.data
            setPayers(Array.isArray(data) ? data : [])
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load payers. Please try again.'
            if (err.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.'
            } else if (err.response?.status === 403) {
                errorMessage = 'You do not have permission to view insurance payers.'
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message
            }
            setError(errorMessage)
            setPayers([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const t = setTimeout(fetchPayers, 300)
        return () => clearTimeout(t)
    }, [searchTerm])

    const handleDeletePayer = async (payerId, name) => {
        const result = await Swal.fire({
            title: 'Delete Payer',
            text: `Are you sure you want to delete "${name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545'
        })

        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/medical-billing/insurance/payers/${payerId}`)
            setPayers(prev => prev.filter(p => p.id !== payerId))
            Swal.fire({
                title: 'Deleted!',
                text: `Payer "${name}" has been deleted.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            })
        } catch (err) {
            Swal.fire({
                title: 'Error!',
                text: err.response?.data?.message || 'Failed to delete payer.',
                icon: 'error'
            })
        }
    }

    return (
        <PermissionGuard permission="medical_insurance.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                    {hasPermission('medical_insurance.manage') && (
                        <Link href="/medical-billing/insurance/payers/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Add Payer
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
                                                    placeholder='Payer name...'
                                                    className="form-control form-control-sm"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>S.No</th>
                                                <th>Name</th>
                                                <th>Payer ID</th>
                                                <th>Type</th>
                                                <th>Phone</th>
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="7" className="text-center py-4">
                                                        <Spinner label="Loading payers..." variant="spinner" />
                                                    </td>
                                                </tr>
                                            ) : payers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="text-center py-4">
                                                        {searchTerm ? 'No payers found matching your search.' : 'No insurance payers found.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                payers.map((payer, index) => (
                                                    <tr key={payer.id}>
                                                        <td>{index + 1}</td>
                                                        <td>{payer.name}</td>
                                                        <td>{payer.payer_id || 'N/A'}</td>
                                                        <td>{payer.payer_type || 'N/A'}</td>
                                                        <td>{payer.phone || 'N/A'}</td>
                                                        <td>
                                                            <span className={`badge bg-soft-${payer.status === 'active' ? 'success' : 'secondary'} text-${payer.status === 'active' ? 'success' : 'secondary'} text-capitalize`}>
                                                                {payer.status}
                                                            </span>
                                                        </td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {hasPermission('medical_insurance.manage') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Edit" onClick={() => setPayerModal({ id: payer.id, mode: 'edit' })}>
                                                                        <FiEdit3 />
                                                                    </button>
                                                                )}
                                                                {hasPermission('medical_insurance.manage') && (
                                                                    <button
                                                                        type="button"
                                                                        className="avatar-text avatar-md"
                                                                        onClick={() => handleDeletePayer(payer.id, payer.name)}
                                                                        title="Delete"
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

            {payerModal && (
                <InsurancePayerModal
                    payerId={payerModal.id}
                    initialMode={payerModal.mode}
                    onClose={() => setPayerModal(null)}
                    onSaved={fetchPayers}
                />
            )}
        </PermissionGuard>
    )
}

export default page
