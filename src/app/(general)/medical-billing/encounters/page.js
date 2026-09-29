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
import EncounterModal from '@/components/medicalBilling/EncounterModal'

const STATUS_COLORS = {
    open: 'primary',
    coding: 'warning',
    ready: 'info',
    closed: 'success',
}

const page = () => {
    const router = useRouter()
    const { hasPermission } = usePermissions()
    const [encounters, setEncounters] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [encounterModal, setEncounterModal] = useState(null) // { id, mode } | null

    const fetchEncounters = async () => {
        try {
            setLoading(true)
            const params = {}
            if (statusFilter) params.status = statusFilter

            const response = await crmInstance.get('/medical-billing/encounters', { params })
            const data = response.data?.data
            setEncounters(Array.isArray(data) ? data : [])
            setTotal(response.data?.total ?? (Array.isArray(data) ? data.length : 0))
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load encounters. Please try again.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.status === 403) errorMessage = 'You do not have permission to view encounters.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setEncounters([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchEncounters() }, [statusFilter])

    const handleDelete = async (id, number) => {
        const result = await Swal.fire({
            title: 'Delete Encounter',
            text: `Are you sure you want to delete encounter "${number}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            confirmButtonColor: '#dc3545'
        })
        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/medical-billing/encounters/${id}`)
            setEncounters(prev => prev.filter(e => e.id !== id))
            Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false })
        } catch (err) {
            Swal.fire({ title: 'Error!', text: err.response?.data?.message || 'Failed to delete encounter.', icon: 'error' })
        }
    }

    return (
        <PermissionGuard permission="medical_encounters.manage" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    {hasPermission('medical_encounters.manage') && (
                        <Link href="/medical-billing/encounters/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Add Encounter
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
                                                <option value="open">Open</option>
                                                <option value="coding">Coding</option>
                                                <option value="ready">Ready</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} encounter${total === 1 ? '' : 's'}`}
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>Encounter #</th>
                                                <th>Date</th>
                                                <th>Patient</th>
                                                <th>Provider</th>
                                                <th>POS</th>
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="7" className="text-center py-4"><Spinner label="Loading encounters..." variant="spinner" /></td></tr>
                                            ) : encounters.length === 0 ? (
                                                <tr><td colSpan="7" className="text-center py-4">No encounters found.</td></tr>
                                            ) : (
                                                encounters.map((e) => (
                                                    <tr key={e.id}>
                                                        <td>{e.encounter_number}</td>
                                                        <td>{e.encounter_date}</td>
                                                        <td>{e.patient ? `${e.patient.first_name} ${e.patient.last_name}` : 'N/A'}</td>
                                                        <td>{e.provider ? `${e.provider.first_name} ${e.provider.last_name}` : 'N/A'}</td>
                                                        <td>{e.place_of_service ? e.place_of_service.code : 'N/A'}</td>
                                                        <td>
                                                            <span className={`badge bg-soft-${STATUS_COLORS[e.status] || 'secondary'} text-${STATUS_COLORS[e.status] || 'secondary'} text-capitalize`}>
                                                                {e.status}
                                                            </span>
                                                        </td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {hasPermission('medical_encounters.manage') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Edit" onClick={() => setEncounterModal({ id: e.id, mode: 'edit' })}>
                                                                        <FiEdit3 />
                                                                    </button>
                                                                )}
                                                                {hasPermission('medical_encounters.manage') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Delete" onClick={() => handleDelete(e.id, e.encounter_number)}>
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

            {encounterModal && (
                <EncounterModal
                    encounterId={encounterModal.id}
                    initialMode={encounterModal.mode}
                    onClose={() => setEncounterModal(null)}
                    onSaved={fetchEncounters}
                />
            )}
        </PermissionGuard>
    )
}

export default page
