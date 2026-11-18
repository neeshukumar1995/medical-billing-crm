'use client'
import React, { useState } from 'react'
import { FiUserPlus, FiShield, FiMail, FiBriefcase } from 'react-icons/fi'
import Swal from 'sweetalert2'
import crmInstance from '@/utils/crmInstance'

const EMPTY_FORM = { company_id: '', name: '', username: '', email: '', password: '' }

const getInitials = (name) => {
    if (!name) return 'CA'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Client admins: users whose role gives them every company of this client.
 * "Add Client Admin" creates the user with the company's "Client Admin"
 * role (created by the backend on first use).
 */
const ClientAdminsSection = ({ clientId, companies, admins, canAdd, onChanged }) => {
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const open = () => {
        setForm({ ...EMPTY_FORM, company_id: companies[0]?.id ? String(companies[0].id) : '' })
        setError('')
        setShowForm(true)
    }

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        setError('')
        try {
            const payload = { ...form }
            if (!payload.username) delete payload.username
            if (!payload.email) delete payload.email
            await crmInstance.post(`/clients/${clientId}/admins`, payload)
            setShowForm(false)
            Swal.fire({ title: 'Client admin created', text: `${form.name} can now open every company of this client.`, icon: 'success', timer: 2500, showConfirmButton: false })
            onChanged()
        } catch (err) {
            const fieldErrors = err.response?.data?.errors
            setError((fieldErrors && Object.values(fieldErrors)[0]?.[0]) || err.response?.data?.message || 'Failed to create client admin')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
            <div className="card-header bg-white border-bottom py-3 px-4 d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="d-flex align-items-center gap-2">
                    <div className="avatar-text avatar-sm bg-soft-primary text-primary rounded-3 shadow-none">
                        <FiShield size={15} />
                    </div>
                    <div>
                        <h5 className="card-title mb-0 fw-bold text-dark">Client Admins</h5>
                        <span className="fs-12 text-muted">Administrators with cross-company access for this client</span>
                    </div>
                </div>
                {canAdd && companies.length > 0 && (
                    <button type="button" className="btn btn-sm btn-primary rounded-pill px-3" onClick={open}>
                        <FiUserPlus className="me-1" /> Add Client Admin
                    </button>
                )}
            </div>
            <div className="card-body p-0">
                {admins.length === 0 ? (
                    <div className="text-muted text-center py-5 fs-13">
                        No client admins yet. A client admin can switch between and manage every company of this client.
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light-subtle fs-12 text-uppercase text-muted border-bottom">
                                <tr>
                                    <th className="py-3 ps-4">Name</th>
                                    <th className="py-3">Username</th>
                                    <th className="py-3">Email</th>
                                    <th className="py-3">Home Company</th>
                                    <th className="py-3">Role</th>
                                    <th className="py-3 pe-4">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.map(admin => (
                                    <tr key={admin.id}>
                                        <td className="ps-4">
                                            <div className="d-flex align-items-center gap-2.5">
                                                <div className="avatar-text avatar-sm bg-soft-info text-info fw-bold rounded-circle shadow-none">
                                                    {getInitials(admin.name)}
                                                </div>
                                                <span className="fw-bold text-dark">{admin.name}</span>
                                            </div>
                                        </td>
                                        <td className="text-muted fs-13">{admin.username || '—'}</td>
                                        <td className="fs-13">
                                            {admin.email ? (
                                                <a href={`mailto:${admin.email}`} className="text-muted text-decoration-none hover-primary">
                                                    <FiMail size={12} className="me-1 text-primary" />
                                                    {admin.email}
                                                </a>
                                            ) : '—'}
                                        </td>
                                        <td className="fs-13">
                                            {admin.company?.name ? (
                                                <span className="d-inline-flex align-items-center gap-1 text-dark fw-semibold">
                                                    <FiBriefcase size={12} className="text-muted" />
                                                    {admin.company.name}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td>
                                            <span className="badge bg-soft-primary text-primary rounded-pill px-2.5 py-1">
                                                {admin.user_role?.name || 'Client Admin'}
                                            </span>
                                        </td>
                                        <td className="pe-4">
                                            <span
                                                className={`badge rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1.5 ${
                                                    admin.status === 'Active' || !admin.status
                                                        ? 'bg-soft-success text-success'
                                                        : 'bg-soft-secondary text-secondary'
                                                }`}
                                            >
                                                <span
                                                    className={`rounded-circle ${admin.status === 'Active' || !admin.status ? 'bg-success' : 'bg-secondary'}`}
                                                    style={{ width: 6, height: 6 }}
                                                />
                                                {admin.status || 'Active'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showForm && (
                <>
                    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 1060 }} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <form className="modal-content border-0 shadow-lg rounded-4 overflow-hidden" onSubmit={handleSubmit}>
                                <div className="modal-header bg-light border-0 py-3 px-4">
                                    <h5 className="modal-title fw-bold text-dark">Add Client Admin</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowForm(false)} />
                                </div>
                                <div className="modal-body p-4">
                                    {error && <div className="alert alert-danger py-2 rounded-3">{error}</div>}
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Home company <span className="text-danger">*</span></label>
                                        <select name="company_id" className="form-select" value={form.company_id} onChange={handleChange} required disabled={saving}>
                                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <div className="form-text">The admin logs in here but can switch to every company of this client.</div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Name <span className="text-danger">*</span></label>
                                        <input name="name" className="form-control" value={form.name} onChange={handleChange} required disabled={saving} />
                                    </div>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label fw-semibold">Username</label>
                                            <input name="username" className="form-control" placeholder="Default: name without spaces"
                                                value={form.username} onChange={handleChange} disabled={saving} />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label fw-semibold">Email</label>
                                            <input type="email" name="email" className="form-control" value={form.email} onChange={handleChange} disabled={saving} />
                                        </div>
                                    </div>
                                    <div className="mb-1">
                                        <label className="form-label fw-semibold">Password <span className="text-danger">*</span></label>
                                        <input type="password" name="password" className="form-control" minLength={8} placeholder="Min 8 characters"
                                            value={form.password} onChange={handleChange} required disabled={saving} />
                                    </div>
                                </div>
                                <div className="modal-footer bg-light border-0 py-3 px-4">
                                    <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
                                    <button type="submit" className="btn btn-primary rounded-pill px-4" disabled={saving}>
                                        {saving ? 'Creating...' : 'Create Client Admin'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
                </>
            )}
        </div>
    )
}

export default ClientAdminsSection
