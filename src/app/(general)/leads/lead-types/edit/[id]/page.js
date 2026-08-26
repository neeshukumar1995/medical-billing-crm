'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import Swal from 'sweetalert2'
import { FiSave, FiTag, FiFileText, FiTarget, FiEdit3, FiX } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard';
import { decryptId } from '@/utils/decryptId'

const page = () => {
  const router = useRouter()
  const params = useParams()
  const actualId = useMemo(() => decryptId(params.id), [params.id])

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState('')
  const [companyId, setCompanyId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('companyId')
    }
    return null
  })

  // Fetch Provider Types data on mount
  useEffect(() => {
    const fetchLeadType = async () => {
      try {
        setIsFetching(true)

        const cid = companyId ? JSON.parse(companyId) : null
        if (!cid) {
          setError('Company ID not found. Please refresh the page and try again.')
          setIsFetching(false)
          return
        }

        const response = await crmInstance.get(`/lead-types/${cid}/${actualId}`)

        // Handle API response structure: { status, message, data: {...} }
        let leadTypeData = {}
        if (response.data && response.data.data && typeof response.data.data === 'object') {
          leadTypeData = response.data.data
        } else if (response.data && typeof response.data === 'object' && response.data.id) {
          leadTypeData = response.data
        }

        setFormData({
          name: leadTypeData.name || '',
          description: leadTypeData.description || ''
        })
        setError('')
      } catch (err) {

        setError('Failed to load Provider Types data.')
      } finally {
        setIsFetching(false)
      }
    }

    if (actualId && companyId) {
      fetchLeadType()
    }
  }, [actualId, companyId])

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

      const response = await crmInstance.put(`/lead-types/${cid}/${actualId}`, formData)

      if (response.data?.status || response.status === 200) {
        Swal.fire({
          title: 'Success!',
          text: response.data?.message || 'Provider Types updated successfully!',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#007bff'
        }).then(() => {
          router.push('/leads/lead-types/list')
        })
      }
    } catch (err) {

      setError(err.response?.data?.message || 'Failed to update Provider Types')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PermissionGuard permission="edit-leads-types" redirect={false}>
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
                borderRadius: '20px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
              }}>
                 <div className="card-body text-left text-white">
             
                <h2 className="card-title fw-bold text-dark">Edit Provider Types</h2>
              
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
                  {/* Provider Types Information Section */}
                  <div className="mb-5">
                    <div className="d-flex align-items-center mb-4">
                      <div className="bg-info rounded-circle d-flex align-items-center justify-content-center me-3"
                        style={{ width: '40px', height: '40px' }}>
                        <FiTarget className="text-white" size={20} />
                      </div>
                      <h4 className="mb-0 fw-bold text-dark">Provider Types Information</h4>
                    </div>

                    <div className="row g-5">
                      <div className="col-md-12">
                        <div className="position-relative">
                          <FiTag className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                          <input
                            type="text"
                            name="name"
                            className="form-control shadow-sm ps-5"
                            placeholder="Enter Provider Types name"
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
                            Provider Types Name <span className="text-danger">*</span>
                          </label>
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="position-relative">
                          <FiFileText className="position-absolute top-0 start-0 translate-middle-y ms-3 text-muted mt-1" size={18} />
                          <textarea
                            name="description"
                            className="form-control shadow-sm ps-5"
                            placeholder="Enter description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows="4"
                            disabled={isLoading}
                            style={{
                              borderRadius: '15px',
                              padding: '1.2rem 1rem 1.2rem 3rem',
                              fontSize: '1rem',
                              resize: 'vertical',
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
                            Description (Optional)
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="text-center">
                    <div className="d-flex gap-3 justify-content-center">
                      <button type="submit"
                        className="btn btn-lg btn-primary"
                        disabled={isLoading}
                        style={{
                          
                          background: '#382f88',
                          border: 'none',
                          
                          transition: 'all 0.3s ease'
                        }}>
                        {isLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-3" role="status" aria-hidden="true"></span>
                            Updating Provider Types...
                          </>
                        ) : (
                          <>
                            <FiSave className="me-3" size={20} />
                            Update Provider Types
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-lg btn-primary"
                        onClick={() => router.push('/leads/lead-types/list')}
                        disabled={isLoading}
                        style={{
                        transition: 'all 0.3s ease'
                        }}
                      >
                        <FiX className="me-3" size={20} />
                        Cancel
                      </button>
                    </div>
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