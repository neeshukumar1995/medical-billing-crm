'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiFileText } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { encryptId } from '@/utils/encryptId'

const BUCKET_COLORS = { '0-30': 'success', '31-60': 'warning', '61-90': 'danger', '90+': 'dark' }

const page = () => {
    const router = useRouter()
    const [rows, setRows] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')

    const fetchRows = async () => {
        try {
            setLoading(true)
            const params = {}
            if (search) params.search = search
            const response = await crmInstance.get('/medical-billing/patient-statements', { params })
            setRows(response.data?.data || [])
            setTotal(response.data?.total ?? (response.data?.data?.length || 0))
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load patient statements.'
            if (err.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
            else if (err.response?.data?.message) errorMessage = err.response.data.message
            setError(errorMessage)
            setRows([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const t = setTimeout(fetchRows, 300)
        return () => clearTimeout(t)
    }, [search])

    return (
        <PermissionGuard permission="medical_ar.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}
                                <p className="text-muted small">Patients with an outstanding balance. Balances are sourced from AR accounts and stay in sync automatically as payments are posted.</p>

                                <div className='row gy-2 mb-3'>
                                    <div className='col-sm-12 d-flex justify-content-end'>
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder='Patient name...'
                                            className="form-control form-control-sm"
                                            style={{ width: 220 }}
                                        />
                                    </div>
                                </div>

                                <div className="text-muted small mb-2">
                                    {loading ? 'Loading…' : `Total: ${total} patient${total === 1 ? '' : 's'}`}
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover dataTable no-footer">
                                        <thead>
                                            <tr>
                                                <th>Patient</th>
                                                <th>Patient #</th>
                                                <th>Balance Due</th>
                                                <th>Aging Bucket</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan="5" className="text-center py-4"><Spinner label="Loading statements..." variant="spinner" /></td></tr>
                                            ) : rows.length === 0 ? (
                                                <tr><td colSpan="5" className="text-center py-4">No outstanding patient balances.</td></tr>
                                            ) : (
                                                rows.map((row) => (
                                                    <tr key={row.patient_id}>
                                                        <td>{row.patient ? `${row.patient.first_name} ${row.patient.last_name}` : 'N/A'}</td>
                                                        <td>{row.patient?.patient_number || '—'}</td>
                                                        <td>${Number(row.total_balance).toFixed(2)}</td>
                                                        <td>
                                                            <span className={`badge bg-soft-${BUCKET_COLORS[row.aging_bucket] || 'secondary'} text-${BUCKET_COLORS[row.aging_bucket] || 'secondary'}`}>
                                                                {row.aging_bucket}
                                                            </span>
                                                        </td>
                                                        <td className="text-end">
                                                            <Link href={`/medical-billing/patient-statements/${encryptId(row.patient_id)}`} className="avatar-text avatar-md" title="View Statement">
                                                                <FiFileText />
                                                            </Link>
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
        </PermissionGuard>
    )
}

export default page
