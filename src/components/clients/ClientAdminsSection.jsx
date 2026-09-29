'use client'
import React, { useState } from 'react'
import { FiUserPlus, FiShield } from 'react-icons/fi'
import Swal from 'sweetalert2'
import crmInstance from '@/utils/crmInstance'

const EMPTY_FORM = { company_id: '', name: '', username: '', email: '', password: '' }

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
        <div className="card mb-4">
            <div className="card-header d-flex align-items-center justify-content-between">
                <h5 className="card-title mb-0"><FiShield className="me-2" />Client Admins</h5>
                {canAdd && companies.length > 0 && (
                    <button type="button" className="btn btn-sm btn-primary" onClick={open}>
                        <FiUserPlus className="me-1" /> Add Client Admin
                    </button>
                )}
            </div>
            <div className="card-body p-0">
                {admins.length === 0 ? (
                    <div className="text-muted text-center py-4 fs-13">
                        No client admins yet. A client admin can switch between and manage every company of this client.
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Home Company</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.map(admin => (
                                    <tr key={admin.id}>
                                        <td className="fw-semibold">{admin.name}</td>
                                        <td>{admin.username || '—'}</td>
                                        <td>{admin.email || '—'}</td>
                                        <td>{admin.company?.name || '—'}</td>
                                        <td>{admin.user_role?.name || '—'}</td>
                                        <td>
                                            <span className={`badge ${admin.status === 'Active' ? 'bg-soft-success text-success' : 'bg-soft-secondary text-secondary'}`}>
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
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <form className="modal-content" onSubmit={handleSubmit}>
                                <div className="modal-header">
                                    <h5 className="modal-title">Add Client Admin</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowForm(false)} />
                                </div>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger py-2">{error}</div>}
                                    <div className="mb-3">
                                        <label className="form-label">Home company <span className="text-danger">*</span></label>
                                        <select name="company_id" className="form-select" value={form.company_id} onChange={handleChange} required disabled={saving}>
                                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <div className="form-text">The admin logs in here but can switch to every company of this client.</div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Name <span className="text-danger">*</span></label>
                                        <input name="name" className="form-control" value={form.name} onChange={handleChange} required disabled={saving} />
                                    </div>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Username</label>
                                            <input name="username" className="form-control" placeholder="Default: name without spaces"
                                                value={form.username} onChange={handleChange} disabled={saving} />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Email</label>
                                            <input type="email" name="email" className="form-control" value={form.email} onChange={handleChange} disabled={saving} />
                                        </div>
                                    </div>
                                    <div className="mb-1">
                                        <label className="form-label">Password <span className="text-danger">*</span></label>
                                        <input type="password" name="password" className="form-control" minLength={8} placeholder="Min 8 characters"
                                            value={form.password} onChange={handleChange} required disabled={saving} />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-light-brand" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? 'Creating...' : 'Create Client Admin'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                </>
            )}
        </div>
    )
}

export default ClientAdminsSection
