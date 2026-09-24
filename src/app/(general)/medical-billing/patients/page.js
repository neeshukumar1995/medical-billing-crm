'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import { FiEdit3, FiEye, FiTrash2, FiPlus, FiUpload, FiUserCheck } from 'react-icons/fi'
import PatientImportModal from '@/components/medicalBilling/PatientImportModal'
import BulkAssignModal from '@/components/medicalBilling/BulkAssignModal'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { formatDate } from '@/utils/formatDate'
import { usePermissions } from '@/hooks/usePermissions'
import PatientModal from '@/components/medicalBilling/PatientModal'

const page = () => {
    const router = useRouter()
    const { hasPermission } = usePermissions()
    const [patients, setPatients] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [patientModal, setPatientModal] = useState(null) // { id, mode } | null
    const [showImportModal, setShowImportModal] = useState(false)
    const [selectedIds, setSelectedIds] = useState([])
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false)

    const toggleSelected = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const toggleSelectAll = () => {
        setSelectedIds(prev => prev.length === patients.length ? [] : patients.map(p => p.id))
    }

    const fetchPatients = async () => {
        try {
            setLoading(true)
            const params = {}
            if (searchTerm) params.search = searchTerm

            const response = await crmInstance.get('/medical-billing/patients', { params })

            const data = response.data?.data
            setPatients(Array.isArray(data) ? data : [])
            setTotal(response.data?.total ?? (Array.isArray(data) ? data.length : 0))
            setSelectedIds([])
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load patients. Please try again.'
            if (err.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.'
            } else if (err.response?.status === 403) {
                errorMessage = 'You do not have permission to view patients.'
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message
            }
            setError(errorMessage)
            setPatients([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const t = setTimeout(fetchPatients, 300) // debounce search
        return () => clearTimeout(t)
    }, [searchTerm])

    const handleDeletePatient = async (patientId, name) => {
        const result = await Swal.fire({
            title: 'Archive Patient',
            text: `Are you sure you want to archive "${name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Archive',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545'
        })

        if (!result.isConfirmed) return

        try {
            await crmInstance.delete(`/medical-billing/patients/${patientId}`)
            setPatients(prev => prev.filter(p => p.id !== patientId))
            Swal.fire({
                title: 'Archived!',
                text: `Patient "${name}" has been archived.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            })
        } catch (err) {
            Swal.fire({
                title: 'Error!',
                text: err.response?.data?.message || 'Failed to archive patient.',
                icon: 'error'
            })
        }
    }

    return (
        <PermissionGuard permission="medical_patients.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                    {hasPermission('medical_patients.create') && (
                        <button className="btn btn-light-brand" onClick={() => setShowImportModal(true)}>
                            <FiUpload className="me-2" />
                            Bulk Upload
                        </button>
                    )}
                    {hasPermission('medical_patients.create') && (
                        <Link href="/medical-billing/patients/create" className="btn btn-primary">
                            <FiPlus className="me-2" />
                            Add Patient
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
                                        <div className='dataTables_filter d-flex justify-content-end align-items-center gap-2'>
                                            {selectedIds.length > 0 && hasPermission('medical_patients.edit') && (
                                                <button className="btn btn-sm btn-light-brand" onClick={() => setShowBulkAssignModal(true)}>
                                                    <FiUserCheck className="me-1" />
                                                    Assign {selectedIds.length} Selected
                                                </button>
                                            )}
                                            <label className='d-inline-flex align-items-center gap-2'>
                                                Search:
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    placeholder='Name or patient #...'
                                                    className="form-control form-control-sm"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} patient${total === 1 ? '' : 's'}`}
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th style={{ width: 36 }}>
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        checked={patients.length > 0 && selectedIds.length === patients.length}
                                                        onChange={toggleSelectAll}
                                                    />
                                                </th>
                                                <th>S.No</th>
                                                <th>Patient #</th>
                                                <th>Name</th>
                                                <th>DOB</th>
                                                <th>Phone</th>
                                                <th>Status</th>
                                                <th>Assigned To</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="9" className="text-center py-4">
                                                        <Spinner classNames={{ label: "text-foreground mt-2" }} label="Loading patients..." variant="spinner" />
                                                    </td>
                                                </tr>
                                            ) : patients.length === 0 ? (
                                                <tr>
                                                    <td colSpan="9" className="text-center py-4">
                                                        {searchTerm ? 'No patients found matching your search.' : 'No patients found.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                patients.map((patient, index) => (
                                                    <tr key={patient.id}>
                                                        <td>
                                                            <input
                                                                type="checkbox"
                                                                className="form-check-input"
                                                                checked={selectedIds.includes(patient.id)}
                                                                onChange={() => toggleSelected(patient.id)}
                                                            />
                                                        </td>
                                                        <td>{index + 1}</td>
                                                        <td>{patient.patient_number}</td>
                                                        <td>{[patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ')}</td>
                                                        <td>{formatDate(patient.date_of_birth) || 'N/A'}</td>
                                                        <td>{patient.phone || 'N/A'}</td>
                                                        <td>
                                                            <span className={`badge bg-soft-${patient.status === 'active' ? 'success' : 'secondary'} text-${patient.status === 'active' ? 'success' : 'secondary'} text-capitalize`}>
                                                                {patient.status}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {/* GET /patients eager-loads assignedTo, which Eloquent
                                                                serializes under the same snake_case key as the raw FK
                                                                column — patient.assigned_to is {id, name} here, not
                                                                a plain id. assignees is the extra-team pivot list, on
                                                                top of the single primary assigned_to. */}
                                                            {patient.assigned_to?.name
                                                                ? <span className="badge bg-soft-info text-info">{patient.assigned_to.name}</span>
                                                                : <span className="text-muted small">Unassigned</span>}
                                                            {Array.isArray(patient.assignees) && patient.assignees.length > 0 && (
                                                                <span className="badge bg-soft-secondary text-secondary ms-1" title={patient.assignees.map(a => a.name).join(', ')}>
                                                                    +{patient.assignees.length}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="text-end">
                                                            <div className="hstack gap-2 justify-content-end">
                                                                {hasPermission('medical_patients.view') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="View" onClick={() => setPatientModal({ id: patient.id, mode: 'view' })}>
                                                                        <FiEye />
                                                                    </button>
                                                                )}
                                                                {hasPermission('medical_patients.edit') && (
                                                                    <button type="button" className="avatar-text avatar-md" title="Edit" onClick={() => setPatientModal({ id: patient.id, mode: 'edit' })}>
                                                                        <FiEdit3 />
                                                                    </button>
                                                                )}
                                                                {hasPermission('medical_patients.delete') && (
                                                                    <button
                                                                        type="button"
                                                                        className="avatar-text avatar-md"
                                                                        onClick={() => handleDeletePatient(patient.id, `${patient.first_name} ${patient.last_name}`)}
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

            {patientModal && (
                <PatientModal
                    patientId={patientModal.id}
                    initialMode={patientModal.mode}
                    onClose={() => setPatientModal(null)}
                    onSaved={fetchPatients}
                />
            )}

            {showImportModal && (
                <PatientImportModal
                    onClose={() => setShowImportModal(false)}
                    onImported={fetchPatients}
                />
            )}

            {showBulkAssignModal && (
                <BulkAssignModal
                    patientIds={selectedIds}
                    onClose={() => setShowBulkAssignModal(false)}
                    onAssigned={fetchPatients}
                />
            )}
        </PermissionGuard>
    )
}

export default page
