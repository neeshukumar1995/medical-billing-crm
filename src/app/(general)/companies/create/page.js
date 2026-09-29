'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { FiUser, FiMapPin, FiImage } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { COMPANY_STATUS_OPTIONS } from '@/constants/companyStatus'
import ClientSelect from '@/components/clients/ClientSelect'
import { encryptId } from '@/utils/encryptId'
import { useUser } from '@/context/UserContext'

const page = () => {
  const router = useRouter()

  // Form states
  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    address: '',
    title: '',
    status: 'Active',
    crm_enabled: true,
    medical_billing_enabled: true,
    logo: null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Onboarding: roles are per company, so a new company starts with none.
  // Copy them from an existing company and optionally add its first admin.
  const { companies: accessibleCompanies, activeCompanyId, isPlatform, access } = useUser()
  const [setup, setSetup] = useState({
    copy_roles_from: '',
    admin_name: '',
    admin_username: '',
    admin_email: '',
    admin_password: '',
  })
  const handleSetupChange = (e) => setSetup(prev => ({ ...prev, [e.target.name]: e.target.value }))

  // Only the chosen client's companies are offered as the roles template
  // (non-platform users always create inside their own client). A brand-new
  // client has no companies yet — then any company can be the template.
  const selectedClientId = isPlatform ? formData.client_id : (access?.client?.id ?? '')
  const clientCompanies = accessibleCompanies.filter(c => String(c.client_id ?? '') === String(selectedClientId ?? ''))
  const templateCompanies = clientCompanies.length > 0 ? clientCompanies : accessibleCompanies
  const templateIsFallback = clientCompanies.length === 0 && accessibleCompanies.length > 0

  // Keep the template pointing at a company of the chosen client.
  useEffect(() => {
    if (templateCompanies.length === 0) return
    setSetup(prev => {
      if (templateCompanies.some(c => String(c.id) === String(prev.copy_roles_from))) return prev
      const preferred = templateCompanies.find(c => c.id === activeCompanyId) || templateCompanies[0]
      return { ...prev, copy_roles_from: String(preferred.id) }
    })
  }, [selectedClientId, accessibleCompanies.length, activeCompanyId])

  // "Add Company" on a client's page links here with ?client_id=<id>.
  useEffect(() => {
    const clientId = new URLSearchParams(window.location.search).get('client_id')
    if (clientId) {
      setFormData(prev => ({ ...prev, client_id: clientId }))
    }
  }, [])

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Handle file input changes
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    setFormData(prev => ({
      ...prev,
      logo: file
    }))
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('address', formData.address || '')
      formDataToSend.append('title', formData.title || '')
      formDataToSend.append('status', formData.status)
      formDataToSend.append('client_id', formData.client_id || '')
      formDataToSend.append('crm_enabled', formData.crm_enabled ? '1' : '0')
      formDataToSend.append('medical_billing_enabled', formData.medical_billing_enabled ? '1' : '0')
      if (formData.logo) {
        formDataToSend.append('logo', formData.logo)
      }
      if (setup.copy_roles_from) formDataToSend.append('copy_roles_from', setup.copy_roles_from)
      if (setup.admin_name) {
        formDataToSend.append('admin_name', setup.admin_name)
        formDataToSend.append('admin_password', setup.admin_password)
        if (setup.admin_username) formDataToSend.append('admin_username', setup.admin_username)
        if (setup.admin_email) formDataToSend.append('admin_email', setup.admin_email)
      }

      const response = await crmInstance.post('/companies', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      //console.log('API Response:', response.data)

      const clientId = formData.client_id

      // Clear form data on success
      setFormData({
        client_id: '',
        name: '',
        address: '',
        title: '',
        status: 'Active',
        crm_enabled: true,
        medical_billing_enabled: true,
        logo: null
      })

      const created = response.data || {}
      const notes = [
        created.roles_copied ? `${created.roles_copied} role(s) copied` : 'No roles copied — add roles before creating users',
        created.admin_user ? `admin user "${created.admin_user.username}" created` : null,
      ].filter(Boolean).join(', ')

      Swal.fire({
        title: 'Company created!',
        text: notes,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#007bff'
      }).then(() => {
        router.push(clientId ? `/clients/${encryptId(clientId)}/view` : '/companies/list')
      })
    } catch (err) {
      console.error('Company creation failed:', err)
      // Show the first field error (e.g. "Username … is already taken") when there is one.
      const fieldErrors = err.response?.data?.errors
      const firstFieldError = fieldErrors && Object.values(fieldErrors)[0]?.[0]
      setError(firstFieldError || err.response?.data?.message || 'Failed to create company')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PermissionGuard permission="create-companies" redirect={false}>
      <PageHeader>
      </PageHeader>
      <div className='main-content'>
        <div className='row'>
          <div className="col-lg-12">
            {/* Form Section */}
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Create New Company</h5>
              </div>
              <div className="card-body">
                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Client</label>
                    <ClientSelect value={formData.client_id} onChange={handleInputChange} disabled={isLoading} />
                  </div>
                  <div className="col-md-6 mb-3" />
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Company Name <span className="text-danger">*</span></label>
                    <div className="position-relative">
                      <FiUser className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                      <input
                        type="text"
                        name="name"
                        className="form-control ps-5"
                        placeholder="Enter company name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Address</label>
                    <div className="position-relative">
                      <FiMapPin className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                      <input
                        type="text"
                        name="address"
                        className="form-control ps-5"
                        placeholder="Enter company address"
                        value={formData.address}
                        onChange={handleInputChange}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Title</label>
                    <div className="position-relative">
                      <FiUser className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                      <input
                        type="text"
                        name="title"
                        className="form-control ps-5"
                        placeholder="Enter company title"
                        value={formData.title}
                        onChange={handleInputChange}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Status</label>
                    <select
                      name="status"
                      className="form-select"
                      value={formData.status}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    >
                      {COMPANY_STATUS_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label} — {option.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-12 mb-3">
                    <label className="form-label d-block">Modules</label>
                    <div className="form-check form-check-inline">
                      <input
                        type="checkbox"
                        name="crm_enabled"
                        id="crm_enabled"
                        className="form-check-input"
                        checked={formData.crm_enabled}
                        onChange={handleInputChange}
                        disabled={isLoading}
                      />
                      <label htmlFor="crm_enabled" className="form-check-label">Enable CRM</label>
                    </div>
                    <div className="form-check form-check-inline">
                      <input
                        type="checkbox"
                        name="medical_billing_enabled"
                        id="medical_billing_enabled"
                        className="form-check-input"
                        checked={formData.medical_billing_enabled}
                        onChange={handleInputChange}
                        disabled={isLoading}
                      />
                      <label htmlFor="medical_billing_enabled" className="form-check-label">Enable Medical Billing</label>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Company Logo</label>
                    <div className="position-relative">
                      <FiImage className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                      <input
                        type="file"
                        name="logo"
                        className="form-control ps-5"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                <hr className="my-4" />
                <div className="mb-3">
                  <h6 className="fw-bold mb-1">Company Setup</h6>
                  <span className="fs-12 text-muted">
                    Roles belong to each company, so a new company has none. Copy them from an existing company, and add its first admin user (optional).
                  </span>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Copy roles &amp; permissions from</label>
                    <select name="copy_roles_from" className="form-select" value={setup.copy_roles_from} onChange={handleSetupChange} disabled={isLoading}>
                      <option value="">— Don't copy roles —</option>
                      {templateCompanies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}{c.client ? ` (${c.client.name})` : ''}</option>
                      ))}
                    </select>
                    {templateIsFallback && (
                      <div className="form-text">This client has no companies yet — pick any company whose roles should be the starting point.</div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3" />
                  <div className="col-md-3 mb-3">
                    <label className="form-label">First admin — name</label>
                    <input type="text" name="admin_name" className="form-control" placeholder="Leave empty to skip"
                      value={setup.admin_name} onChange={handleSetupChange} disabled={isLoading || !setup.copy_roles_from} />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label">Username</label>
                    <input type="text" name="admin_username" className="form-control" placeholder="Default: name without spaces"
                      value={setup.admin_username} onChange={handleSetupChange} disabled={isLoading || !setup.admin_name} />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label">Email</label>
                    <input type="email" name="admin_email" className="form-control"
                      value={setup.admin_email} onChange={handleSetupChange} disabled={isLoading || !setup.admin_name} />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label">Password {setup.admin_name && <span className="text-danger">*</span>}</label>
                    <input type="password" name="admin_password" className="form-control" placeholder="Min 8 characters" minLength={8}
                      value={setup.admin_password} onChange={handleSetupChange} disabled={isLoading || !setup.admin_name} required={!!setup.admin_name} />
                  </div>
                  {!setup.copy_roles_from && (
                    <div className="col-12 mb-3 fs-12 text-muted">Choose a company to copy roles from to add a first admin — it gets the copied "admin" role.</div>
                  )}
                </div>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Creating Company...
                    </>
                  ) : (
                    'Create Company'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
    </PermissionGuard>
  )
}

export default page