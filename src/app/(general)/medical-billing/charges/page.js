'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import { FiEdit3, FiTrash2, FiPlus, FiCheckCircle, FiFileText } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import ChargeModal from '@/components/medicalBilling/ChargeModal'
import { formatDate } from '@/utils/formatDate'

const STATUS_COLORS = { draft: 'secondary', ready: 'info', billed: 'success', voided: 'danger' }

const page = () => {
    const router = useRouter()
    const { hasPermission } = usePermissions()
    const [charges, setCharges] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [chargeModal, setChargeModal] = useState(null) // { id } | null

    const fetchCharges = async () => {
        try {
            setLoading(true)
            const params = {}
            if (statusFilter) params.status = statusFilter
            const response = await crmInstance.get('/medical-billing/charges', { params })
            setCharges(response.data?.data || [])
            setTotal(response.data?.total ?? (response.data?.data?.length || 0))
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load charges.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setCharges([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchCharges() }, [statusFilter])

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Charge', text: 'Are you sure?', icon: 'warning',
            showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#dc3545'
        })
        if (!result.isConfirmed) return
        try {
            await crmInstance.delete(`/medical-billing/charges/${id}`)
            setCharges(prev => prev.filter(c => c.id !== id))
            Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false })
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to delete charge.', icon: 'error' })
        }
    }

    const handleValidate = async (charge) => {
        try {
            const { data } = await crmInstance.post(`/medical-billing/charges/${charge.id}/validate`)
            const issuesHtml = data.issues.length
                ? '<ul style="text-align:left">' + data.issues.map(i => `<li><b>[${i.severity}]</b> ${i.message}</li>`).join('') + '</ul>'
                : '<p>No issues found.</p>'
            Swal.fire({
                title: data.valid ? 'Ready for claim generation' : 'Blocking errors found',
                html: issuesHtml,
                icon: data.valid ? 'success' : 'error',
            })
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Validation failed.', icon: 'error' })
        }
    }

    const handleGenerateClaim = async (charge) => {
        const result = await Swal.fire({
            title: 'Generate Claim', text: `Generate a claim from this charge?`, icon: 'question',
            showCancelButton: true, confirmButtonText: 'Generate', confirmButtonColor: '#007bff'
        })
        if (!result.isConfirmed) return

        try {
            const { data } = await crmInstance.post(`/medical-billing/charges/${charge.id}/generate-claim`)
            Swal.fire({ title: 'Claim Generated!', text: `Claim # ${data.claim_number}`, icon: 'success' })
            fetchCharges()
        } catch (err) {
            const issues = err.response?.data?.issues
            const issuesHtml = issues ? '<ul style="text-align:left">' + issues.map(i => `<li><b>[${i.severity}]</b> ${i.message}</li>`).join('') + '</ul>' : ''
            Swal.fire({ title: 'Cannot generate claim', html: (err.response?.data?.message || '') + issuesHtml, icon: 'error' })
        }
    }

    return (
        <PermissionGuard permission="medical_charges.manage" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    {hasPermission('medical_charges.manage') && (
                        <Link href="/medical-billing/charges/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Add Charge
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
                                        <div className='d-flex justify-content-end'>
                                            <select className="form-select form-select-sm" style={{ width: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                                <option value="">All Statuses</option>
                                                <option value="draft">Draft</option>
                                                <option value="ready">Ready</option>
                                                <option value="billed">Billed</option>
                                                <option value="voided">Voided</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} charge${total === 1 ? '' : 's'}`}
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>DOS</th>
                                                <th>Patient</th>
                                                <th>Provider</th>
                                                <th>Encounter</th>
                                                <th>Lines</th>
                                                <th>Total</th>
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="8" className="text-center py-4"><Spinner label="Loading charges..." variant="spinner" /></td></tr>
                                            ) : charges.length === 0 ? (
                                                <tr><td colSpan="8" className="text-center py-4">No charges found.</td></tr>
                                            ) : (
                                                charges.map((c) => (
                                                    <tr key={c.id}>
                                                        <td>{formatDate(c.dos_from)}</td>
                                                        <td>{c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : 'N/A'}</td>
                                                        <td>{c.provider ? `${c.provider.first_name} ${c.provider.last_name}` : 'N/A'}</td>
                                                        <td>{c.encounter?.encounter_number || 'N/A'}</td>
                                                        <td>{c.items_count}</td>
                                                        <td>${Number(c.total_charge).toFixed(2)}</td>
                                                        <td>
                                                            <span className={`badge bg-soft-${STATUS_COLORS[c.status] || 'secondary'} text-${STATUS_COLORS[c.status] || 'secondary'} text-capitalize`}>
                                                                {c.status}
                                                            </span>
                                                        </td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {hasPermission('medical_charges.manage') && c.status !== 'billed' && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Validate" onClick={() => handleValidate(c)}>
                                                                        <FiCheckCircle />
                                                                    </button>
                                                                )}
                                                                {hasPermission('medical_claims.create') && c.status !== 'billed' && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Generate Claim" onClick={() => handleGenerateClaim(c)}>
                                                                        <FiFileText />
                                                                    </button>
                                                                )}
                                                                {hasPermission('medical_charges.manage') && c.status !== 'billed' && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Edit" onClick={() => setChargeModal({ id: c.id })}>
                                                                        <FiEdit3 />
                                                                    </button>
                                                                )}
                                                                {hasPermission('medical_charges.manage') && c.status !== 'billed' && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Delete" onClick={() => handleDelete(c.id)}>
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

            {chargeModal && (
                <ChargeModal
                    chargeId={chargeModal.id}
                    initialMode="edit"
                    onClose={() => setChargeModal(null)}
                    onSaved={fetchCharges}
                />
            )}
        </PermissionGuard>
    )
}

export default page
