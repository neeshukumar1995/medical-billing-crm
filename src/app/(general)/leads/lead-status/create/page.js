'use client'
import React, { useState } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiTag, FiTarget, FiPlus } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard';

const page = () => {
  const router = useRouter()

  // Form states
  const [formData, setFormData] = useState({
    name: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [companyId, setCompanyId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('companyId')
    }
    return null
  })

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const cid = companyId ? JSON.parse(companyId) : null
      if (!cid) {
        setError('Company ID not found. Please refresh the page and try again.')
        setIsLoading(false)
        return
      }

      const response = await crmInstance.post(`/lead-status/${cid}`, formData)

      if (response.data?.status || response.status === 201) {
        Swal.fire({
          title: 'Success!',
          text: response.data?.message || 'Lead status created successfully!',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#007bff'
        }).then(() => {
          router.push('/leads/lead-status/list')
        })
      }
    } catch (err) {
      console.error('Lead status creation failed:', err)
      setError(err.response?.data?.message || 'Failed to create lead status')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PermissionGuard permission="create-leads-status" redirect={false}>
      <PageHeader>
        <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
          <button
            onClick={() => router.back()}
            className="btn btn-outline-primary"
          >
            <i className="me-2">⬅️</i>
            Back
          </button>
        </div>
      </PageHeader>
      <div className='main-content'>
        <div className='row'>
          <div className="col-lg-12">
            {/* Hero Section */}
            

            {/* Main Form Card */}
            <div className="card shadow-lg border-0"
              style={{
                
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
              }}>
                  <div className="card-body text-left text-white">
           
                <h2 className="card-title fw-bold text-dark">Create New Lead Status</h2>
            
              </div>
              <div className="card-body p-5">
                {error && (
                  <div className="alert alert-danger border-0 shadow-sm"
                    style={{ borderRadius: '15px' }}>
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Lead Status Information Section */}
                  <div className="mb-5">
                    <div className="d-flex align-items-center mb-4">
                      <div className="bg-danger rounded-circle d-flex align-items-center justify-content-center me-3"
                        style={{ width: '40px', height: '40px' }}>
                        <FiTarget className="text-white" size={20} />
                      </div>
                      <h4 className="mb-0 fw-bold text-dark">Lead Status Information</h4>
                    </div>

                    <div className="row g-4">
                      <div className="col-md-12">
                        <div className="position-relative">
                          <FiTag className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                          <input
                            type="text"
                            name="name"
                            className="form-control shadow-sm ps-5"
                            placeholder="Enter lead status name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                            style={{
                              borderRadius: '15px',
                              padding: '1.2rem 1rem 1.2rem 3rem',
                              fontSize: '1rem',
                              height: 'auto',
                              border: '2px solid #e9ecef',
                              transition: 'all 0.3s ease'
                            }}
                          />
                          <label className="position-absolute top-0 start-0 ms-3 mt-1 text-muted fw-semibold"
                            style={{
                              fontSize: '0.75rem',
                              transform: 'translateY(-50%)',
                              background: 'white',
                              padding: '0 0.5rem',
                              zIndex: 5
                            }}>
                            Lead Status Name <span className="text-danger">*</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>


                  {/* Submit Button */}
                  <div className="text-center">
                    <button type="submit"
                      className="btn btn-primary btn-lg px-5 py-3 fw-bold shadow-lg"
                      disabled={isLoading}
                     >
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-3" role="status" aria-hidden="true"></span>
                          Creating Lead Status...
                        </>
                      ) : (
                        <>
                          <FiSave className="me-3" size={20} />
                          Create Lead Status
                        </>
                      )}
                    </button>
                  </div>
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