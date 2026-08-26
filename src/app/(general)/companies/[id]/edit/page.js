'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { FiUser, FiMapPin, FiArrowLeft, FiImage } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Link from 'next/link'
import { decryptId } from '@/utils/decryptId'
import { COMPANY_STATUS_OPTIONS } from '@/constants/companyStatus'


const page = () => {
  const router = useRouter()
  const params = useParams()
  const actualId = useMemo(() => decryptId(params.id), [params.id])
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  // Fetch company data
  // useEffect(() => {
  //   const fetchCompany = async () => {
  //     try {
  //       setLoading(true)
  //       const response = await crmInstance.get(`/companies/${params.id}`)
  //       const companyData = response.data
  //       setCompany(companyData)
  //       setFormData({
  //         name: companyData.name || '',
  //         address: companyData.address || '',
  //         title: companyData.title || '',
  //         logo: null
  //       })
  //       setError('')
  //     } catch (err) {
  //       console.error('Failed to fetch company:', err)
  //       setError('Failed to load company data.')
  //     } finally {
  //       setLoading(false)
  //     }
  //   }

  //   if (params.id) {
  //     fetchCompany()
  //   }
  // }, [params.id])

  useEffect(() => {
  if (!actualId) return

  const fetchCompany = async () => {
    try {
      setLoading(true)
      const response = await crmInstance.get(`/companies/${actualId}`)
      const companyData = response.data

      setCompany(companyData)
      setFormData({
        name: companyData.name || '',
        address: companyData.address || '',
        title: companyData.title || '',
        status: companyData.status || 'Active',
        crm_enabled: companyData.crm_enabled !== false,
        medical_billing_enabled: companyData.medical_billing_enabled !== false,
        logo: null
      })
      setError('')
    } catch (err) {
      console.error(err)
      setError('Failed to load company data')
    } finally {
      setLoading(false)
    }
  }

  fetchCompany()
}, [actualId])

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
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
      formDataToSend.append('_method', 'PUT')

      const response = await crmInstance.post(`/companies/${actualId}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      //console.log('API Response:', response.data)

      Swal.fire({
        title: 'Success!',
        text: 'Data successfully updated',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#007bff'
      }).then(() => {
        router.push('/companies/list')
      })
    } catch (err) {
      console.error('Company update failed:', err)
      setError(err.response?.data?.message || 'Failed to update company')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PermissionGuard permission="edit-companies">
        <PageHeader />
        <div className='main-content'>
          <div className='row'>
            <div className="col-12">
              <div className="card">
                <div className="card-body text-center py-5">
                  <Spinner classNames={{label: "text-foreground mt-4"}} label="spinner" variant="spinner" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </PermissionGuard>
    )
  }

  if (error && !company) {
    return (
      <PermissionGuard permission="edit-companies">
        <PageHeader />
        <div className='main-content'>
          <div className="alert alert-danger">{error}</div>
        </div>
      </PermissionGuard>
    )
  }

  return (
    <PermissionGuard permission="edit-companies" redirect={false}>
      <PageHeader>
        <Link href="/companies/list" className="btn btn-outline-secondary">
          <FiArrowLeft size={16} className='me-2' />
          <span>Back</span>
        </Link>
      </PageHeader>
      <div className='main-content'>
        <div className='row'>
          <div className="col-lg-12">
            {/* Form Section */}
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Edit Company</h5>
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
                        disabled={saving}
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
                        disabled={saving}
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
                       disabled={saving}
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
                     disabled={saving}
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
                       id="edit_crm_enabled"
                       className="form-check-input"
                       checked={formData.crm_enabled}
                       onChange={handleInputChange}
                       disabled={saving}
                     />
                     <label htmlFor="edit_crm_enabled" className="form-check-label">Enable CRM</label>
                   </div>
                   <div className="form-check form-check-inline">
                     <input
                       type="checkbox"
                       name="medical_billing_enabled"
                       id="edit_medical_billing_enabled"
                       className="form-check-input"
                       checked={formData.medical_billing_enabled}
                       onChange={handleInputChange}
                       disabled={saving}
                     />
                     <label htmlFor="edit_medical_billing_enabled" className="form-check-label">Enable Medical Billing</label>
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
                       disabled={saving}
                     />
                   </div>
                   {company?.logo && (
                     <small className="text-muted">Leave empty to keep current logo</small>
                   )}
                 </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Updating Company...
                    </>
                  ) : (
                    'Update Company'
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