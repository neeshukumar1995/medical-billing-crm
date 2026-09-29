'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import { FiSave, FiTag, FiTarget, FiEdit3, FiX } from 'react-icons/fi'
import PermissionGuard from '@/components/shared/PermissionGuard';
import { decryptId } from '@/utils/decryptId'

const page = () => {
  const router = useRouter()
  const params = useParams()
  const actualId = useMemo(() => decryptId(params.id), [params.id])

  // Form states
  const [formData, setFormData] = useState({
    name: ''
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

  // Fetch lead status data on mount
  useEffect(() => {
    const fetchLeadStatus = async () => {
      try {
        setIsFetching(true)
        const cid = companyId ? JSON.parse(companyId) : null
        if (!cid) {
          setError('Company ID not found. Please refresh the page and try again.')
          setIsFetching(false)
          return
        }

        const response = await crmInstance.get(`/lead-status/${cid}/${actualId}`)
        //console.log('Lead status edit response:', response.data)

        // Handle API response structure: { status, message, data: {...} }
        let leadStatusData = {}
        if (response.data && response.data.data && typeof response.data.data === 'object') {
            leadStatusData = response.data.data
        } else if (response.data && typeof response.data === 'object' && response.data.id) {
            leadStatusData = response.data
        }

        setFormData({
          name: leadStatusData.name || ''
        })
        setError('')
      } catch (err) {
        console.error('Failed to fetch lead status:', err)
        setError('Failed to load lead status data.')
      } finally {
        setIsFetching(false)
      }
    }

    if (actualId && companyId) {
      fetchLeadStatus()
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

      const response = await crmInstance.put(`/lead-status/${cid}/${actualId}`, formData)

      if (response.data?.status || response.status === 200) {
        Swal.fire({
          title: 'Success!',
          text: response.data?.message || 'Lead status updated successfully!',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#007bff'
        }).then(() => {
          router.push('/leads/lead-status/list')
        })
      }
    } catch (err) {
      console.error('Lead status update failed:', err)
      setError(err.response?.data?.message || 'Failed to update lead status')
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <PermissionGuard permission="edit-leads-status" redirect={false}>
        <PageHeader>
          <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
          </div>
        </PageHeader>
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

  return (
  <PermissionGuard permission="edit-leads-status" redirect={false}>
      <PageHeader>
        <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
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
           
                <h2 className="card-title fw-bold text-dark">Edit Lead Status</h2>
             
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
                    <div className="d-flex gap-3 justify-content-center">
                      <button type="submit"
                              className="btn btn-primary btn-lg px-5 py-3 fw-bold shadow-lg"
                              disabled={isLoading}
                             >
                        {isLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-3" role="status" aria-hidden="true"></span>
                            Updating Lead Status...
                          </>
                        ) : (
                          <>
                            <FiSave className="me-3" size={20} />
                            Update Lead Status
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-lg btn-primary"
                        onClick={() => router.push('/leads/lead-status/list')}
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