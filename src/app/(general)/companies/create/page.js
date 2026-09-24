'use client'
import React, { useState } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { FiUser, FiMapPin, FiImage } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { COMPANY_STATUS_OPTIONS } from '@/constants/companyStatus'

const page = () => {
  const router = useRouter()

  // Form states
  const [formData, setFormData] = useState({
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
      formDataToSend.append('crm_enabled', formData.crm_enabled ? '1' : '0')
      formDataToSend.append('medical_billing_enabled', formData.medical_billing_enabled ? '1' : '0')
      if (formData.logo) {
        formDataToSend.append('logo', formData.logo)
      }

      const response = await crmInstance.post('/companies', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      //console.log('API Response:', response.data)

      // Clear form data on success
      setFormData({
        name: '',
        address: '',
        title: '',
        status: 'Active',
        crm_enabled: true,
        medical_billing_enabled: true,
        logo: null
      })

      Swal.fire({
        title: 'Success!',
        text: 'Data successfully added',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#007bff'
      }).then(() => {
        router.push('/companies/list')
      })
    } catch (err) {
      console.error('Company creation failed:', err)
      setError(err.response?.data?.message || 'Failed to create company')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PermissionGuard permission="create-companies" redirect={false}>
      <PageHeader>
        <button
          onClick={() => router.back()}
          className="btn btn-outline-primary"
        >
          <i className="me-2">⬅️</i>
          Back
        </button>
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