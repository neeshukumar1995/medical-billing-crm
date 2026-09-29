'use client'
import React, { useState } from 'react'
import { FiUser, FiMail, FiPhone, FiMapPin } from 'react-icons/fi'

export const EMPTY_CLIENT = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  status: 'Active',
  notes: ''
}

const IconInput = ({ icon: Icon, ...props }) => (
  <div className="position-relative">
    <Icon className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
    <input className="form-control ps-5" {...props} />
  </div>
)

/** Shared create/edit form. onSubmit receives the form values and should throw on failure. */
const ClientForm = ({ initialValues = EMPTY_CLIENT, submitLabel, savingLabel, onSubmit }) => {
  const [formData, setFormData] = useState({ ...EMPTY_CLIENT, ...initialValues })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})
    try {
      await onSubmit(formData)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save client')
      setFieldErrors(err.response?.data?.errors || {})
    } finally {
      setSaving(false)
    }
  }

  const fieldError = (name) => fieldErrors[name]?.[0] && (
    <div className="text-danger small mt-1">{fieldErrors[name][0]}</div>
  )

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label">Client Name <span className="text-danger">*</span></label>
          <IconInput icon={FiUser} type="text" name="name" placeholder="Enter client name"
            value={formData.name} onChange={handleInputChange} required disabled={saving} />
          {fieldError('name')}
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Contact Person</label>
          <IconInput icon={FiUser} type="text" name="contact_person" placeholder="Enter contact person"
            value={formData.contact_person || ''} onChange={handleInputChange} disabled={saving} />
          {fieldError('contact_person')}
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Email</label>
          <IconInput icon={FiMail} type="email" name="email" placeholder="Enter email"
            value={formData.email || ''} onChange={handleInputChange} disabled={saving} />
          {fieldError('email')}
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Phone</label>
          <IconInput icon={FiPhone} type="text" name="phone" placeholder="Enter phone"
            value={formData.phone || ''} onChange={handleInputChange} disabled={saving} />
          {fieldError('phone')}
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Address</label>
          <IconInput icon={FiMapPin} type="text" name="address" placeholder="Enter address"
            value={formData.address || ''} onChange={handleInputChange} disabled={saving} />
          {fieldError('address')}
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Status</label>
          <select name="status" className="form-select" value={formData.status || 'Active'}
            onChange={handleInputChange} disabled={saving}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <div className="col-md-12 mb-3">
          <label className="form-label">Notes</label>
          <textarea name="notes" className="form-control" rows={3} placeholder="Any notes about this client"
            value={formData.notes || ''} onChange={handleInputChange} disabled={saving} />
        </div>
      </div>
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            {savingLabel}
          </>
        ) : submitLabel}
      </button>
    </form>
  )
}

export default ClientForm
