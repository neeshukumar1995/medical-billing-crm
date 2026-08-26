'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiPlus, FiArrowLeft, FiUserPlus, FiEdit3, FiTrash2, FiClock, FiUser, FiXCircle, FiChevronRight } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import PermissionGuard from '@/components/shared/PermissionGuard'
import crmInstance from '@/utils/crmInstance'
import { decryptId } from '@/utils/decryptId';



const LeadsHistoryHeader = ({ lead }) => {
  const router = useRouter()

  return (
    <div className="d-flex align-items-center justify-content-between page-header-right-items-wrapper">
      <div className="d-flex align-items-center">
        <button
          onClick={() => router.back()}
          className="btn btn-light me-3 shadow-sm"
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = ''
            e.currentTarget.style.transform = ''
          }}
        >
          <FiArrowLeft size={16} className='me-2' />
          <span>Back</span>
        </button>
        <div>
          <h4 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.5rem' }}>
            {lead?.client_name || 'Lead'} Activity
          </h4>
          <p className="mb-0 text-muted" style={{ fontSize: '0.95rem' }}>
            Complete timeline of all changes and updates
          </p>
        </div>
      </div>

    </div>
  )
}


const HistoryContent = ({ history, lead, params }) => {
  const [selectedItem, setSelectedItem] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [visibleItems, setVisibleItems] = useState(20)
  const [leadTypes, setLeadTypes] = useState([])
  const [leadStatuses, setLeadStatuses] = useState([])
  const [users, setUsers] = useState([])
  const [mappingLoaded, setMappingLoaded] = useState(false)

  // Fetch mapping data
  useEffect(() => {
    const fetchMappingData = async () => {
      try {
        const decryptedCid = decryptId(params.cid)
        if (!decryptedCid) {
          setMappingLoaded(true)
          return
        }

        const [leadTypesRes, leadStatusesRes, usersRes] = await Promise.all([
          crmInstance.get(`/lead-types/${decryptedCid}`),
          crmInstance.get(`/lead-status/${decryptedCid}`),
          crmInstance.get(`/users/${decryptedCid}`)
        ])

        //console.log('Provider Typess API Response:', leadTypesRes.data)
        //console.log('Lead Statuses API Response:', leadStatusesRes.data)
        //console.log('Users API Response:', usersRes.data)

        // Handle different possible response structures
        const leadTypesData = leadTypesRes.data?.data?.data || leadTypesRes.data?.data || leadTypesRes.data || []
        const leadStatusesData = leadStatusesRes.data?.data?.data || leadStatusesRes.data?.data || leadStatusesRes.data || []
        const usersData = usersRes.data?.data?.data || usersRes.data?.data || usersRes.data || []

        setLeadTypes(Array.isArray(leadTypesData) ? leadTypesData : [])
        setLeadStatuses(Array.isArray(leadStatusesData) ? leadStatusesData : [])
        setUsers(Array.isArray(usersData) ? usersData : [])
        setMappingLoaded(true)

        //console.log('Provider Typess:', leadTypesRes.data?.data || [])
        //console.log('Lead Statuses:', leadStatusesRes.data?.data || [])
        //console.log('Users:', usersRes.data?.data || [])
      } catch (error) {
        console.error('Failed to fetch mapping data:', error)
        setMappingLoaded(true)
      }
    }

    fetchMappingData()
  }, [params.cid])

  // Mapping functions
  const getLeadTypeName = (id) => {
    const leadType = leadTypes.find(type => type.id == id)
    return leadType ? leadType.name : `Provider Types ${id}`
  }

  const getLeadStatusName = (id) => {
    const leadStatus = leadStatuses.find(status => status.id == id)
    return leadStatus ? leadStatus.name : `Status ${id}`
  }

  const getUserName = (id) => {
    const user = users.find(user => user.id == id)
    return user ? user.name : `User ${id}`
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()

    // Set both dates to start of day for accurate day comparison
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const diffTime = nowStart - dateStart
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    // Check if it's today
    if (diffDays === 0) {
      return `Today ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
    }
    // Check if it's yesterday
    else if (diffDays === 1) {
      return `Yesterday ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
    }
    // Check if it's within the last 7 days
    else if (diffDays > 1 && diffDays <= 7) {
      return `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
    }
    // For older dates, show full date with time
    else {
      return `${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })} ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
    }
  }

  const getActionConfig = (action) => {
    switch (action?.toLowerCase()) {
      case 'created':
        return {
          icon: <FiUserPlus size={16} />,
          color: '#10b981',
          bgColor: '#10b981',
          textColor: '#065f46'
        }
      case 'updated':
        return {
          icon: <FiEdit3 size={16} />,
          color: '#3b82f6',
          bgColor: '#3b82f6',
          textColor: '#1e40af'
        }
      case 'deleted':
        return {
          icon: <FiTrash2 size={16} />,
          color: '#ef4444',
          bgColor: '#ef4444',
          textColor: '#991b1b'
        }
      default:
        return {
          icon: <FiClock size={16} />,
          color: '#6b7280',
          bgColor: '#6b7280',
          textColor: '#374151'
        }
    }
  }

  const handleViewDetails = (item) => {
    setSelectedItem(item)
    setShowModal(true)
  }

  const loadMore = () => {
    setVisibleItems(prev => prev + 20)
  }

  const renderFieldValue = (value, fieldName) => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'object') {
      // Handle nested objects (like lead_type.name, lead_status.name, assigned user)
      if (value.name) return value.name
      if (value.username) return value.username
      if (value.email) return value.email
      return JSON.stringify(value)
    }

    // Special handling for specific fields if nested objects not available
    if (fieldName === 'lead_type_id' && mappingLoaded) {
      return getLeadTypeName(value)
    }
    if (fieldName === 'lead_status_id' && mappingLoaded) {
      return getLeadStatusName(value)
    }
    if (fieldName === 'assigned_to' && mappingLoaded) {
      return getUserName(value)
    }

    if (typeof value === 'string' && value.length > 30) {
      return value.substring(0, 30) + '...'
    }
    return String(value)
  }

  return (
    <div className="p-0">
      {/* Header */}
      <div className="px-4 py-3" style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: 'white'
      }}>
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h4 className="mb-1 fw-bold" style={{ fontSize: '1.25rem',color:'#fff' }}>
              <FiClock className="me-2" size={20} />
              Activity Timeline
            </h4>
            <p className="mb-0 opacity-90 small">
              Track all changes for <strong>{lead?.client_name || 'this lead'}</strong>
            </p>
          </div>
          <div className="text-end">
            <div className="activity-count px-3 py-1 rounded-pill" style={{
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}>
              {history?.length || 0} Activities
            </div>
          </div>
        </div>
      </div>

      <div className="p-3">
        {(!history || history.length === 0) ? (
          <div className="text-center py-5">
            <div className="empty-state-icon mb-3">
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <FiClock size={24} className="text-muted" />
              </div>
            </div>
            <h5 className="text-muted mb-1">No Activity Yet</h5>
            <p className="text-muted small">This lead doesn't have any activity history.</p>
          </div>
        ) : (
          <>
            {/* Compact Timeline */}
            <div className="timeline-compact">
              {history.slice(0, visibleItems).map((item, index) => {
                const config = getActionConfig(item.action)
                const hasChanges = item.changed_fields && item.changed_fields.filter(field => field !== 'state' && field !== 'city').length > 0

                return (
                  <div key={item.id || index} className="timeline-row d-flex align-items-center py-2 px-3 mb-1 rounded-2" style={{
                    background: index % 2 === 0 ? '#fafbfc' : 'white',
                    border: '1px solid #f1f5f9',
                    transition: 'all 0.2s ease'
                  }}>
                    {/* Timeline dot */}
                    <div className="timeline-dot me-3">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                          width: '20px',
                          height: '20px',
                          backgroundColor: config.bgColor,
                          color: 'white',
                          fontSize: '10px'
                        }}
                      >
                        {config.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="badge fw-semibold" style={{
                              backgroundColor: config.bgColor,
                              color: 'white',
                              fontSize: '0.7rem',
                              padding: '2px 8px'
                            }}>
                              {item.action}
                            </span>
                            <small className="text-muted">
                              <FiUser size={12} className="me-1" />
                              {item.user}
                            </small>
                            <small className="text-muted">
                              <FiClock size={12} className="me-1" />
                              {formatDate(item.created_at)}
                            </small>
                          </div>
                          <p className="mb-0 small fw-medium text-dark" style={{ lineHeight: '1.3' }}>
                            {item.description}
                          </p>
                        </div>

                        {/* Action button */}
                        {hasChanges && (
                          <button
                            className="btn btn-sm btn-outline-primary ms-2"
                            onClick={() => handleViewDetails(item)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              borderRadius: '6px'
                            }}
                          >
                            <FiChevronRight size={12} className="me-1" />
                            Details
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Load More Button */}
            {history.length > visibleItems && (
              <div className="text-center mt-3">
                <button
                  className="btn btn-outline-primary"
                  onClick={loadMore}
                  style={{
                    borderRadius: '8px',
                    padding: '8px 16px'
                  }}
                >
                  Load More ({history.length - visibleItems} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal for detailed changes */}
      {showModal && selectedItem && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content" style={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div className="modal-header" style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                borderRadius: '12px 12px 0 0'
              }}>
                <h5 className="modal-title fw-bold" style={{color:'#fff'}}>
                  <FiEdit3 className="me-2" />
                  Field Changes Details
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                {/* Activity Summary */}
                <div className="activity-summary mb-4 p-3 rounded-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge fw-semibold" style={{
                      backgroundColor: getActionConfig(selectedItem.action).bgColor,
                      color: 'white'
                    }}>
                      {getActionConfig(selectedItem.action).icon}
                      <span className="ms-1">{selectedItem.action}</span>
                    </span>
                    <small className="text-muted">
                      <FiUser size={12} className="me-1" />
                      {selectedItem.user}
                    </small>
                    <small className="text-muted">
                      <FiClock size={12} className="me-1" />
                      {formatDate(selectedItem.created_at)}
                    </small>
                  </div>
                  <p className="mb-0 fw-medium">{selectedItem.description}</p>
                </div>

                {/* Field Changes */}
                <div className="field-changes">
                  <h6 className="mb-3 fw-bold text-dark">
                    <FiEdit3 className="me-2" />
                    Changed Fields ({selectedItem.changed_fields?.filter(field => field !== 'state' && field !== 'city').length || 0})
                  </h6>

                  <div className="row g-3">
                    {selectedItem.changed_fields?.filter(field => field !== 'state' && field !== 'city').map((field, index) => (
                      <div key={index} className="col-12">
                        <div className="field-change-card p-3 rounded-3" style={{
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <h6 className="mb-0 fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
                              {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h6>
                            <FiChevronRight size={16} className="text-muted" />
                          </div>

                          <div className="row g-3">
                            <div className="col-md-6">
                              <div className="value-container p-2 rounded-2" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                                <div className="value-label text-danger fw-semibold mb-1" style={{ fontSize: '0.75rem' }}>BEFORE</div>
                                <div className="value-text text-dark" style={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>
                                  {renderFieldValue(selectedItem.old_values?.[field], field)}
                                </div>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="value-container p-2 rounded-2" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                <div className="value-label text-success fw-semibold mb-1" style={{ fontSize: '0.75rem' }}>AFTER</div>
                                <div className="value-text text-dark" style={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>
                                  {renderFieldValue(selectedItem.new_values?.[field], field)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description Section */}
                {selectedItem.description && (
                  <div className="description-section mt-4">
                    <h6 className="mb-3 fw-bold text-dark">
                      <FiEdit3 className="me-2" />
                      Description
                    </h6>
                    <div className="description-content p-3 rounded-3" style={{
                      background: '#e7f3ff',
                      border: '1px solid #b3d9ff',
                      color: '#004085'
                    }}>
                      {selectedItem.description}
                    </div>
                  </div>
                )}

                {/* Notes Section */}
                {selectedItem.note && (
                  <div className="notes-section mt-4">
                    <h6 className="mb-3 fw-bold text-dark">
                      <FiEdit3 className="me-2" />
                      Notes
                    </h6>
                    <div className="note-content p-3 rounded-3" style={{
                      background: '#fff3cd',
                      border: '1px solid #ffeaa7',
                      color: '#856404'
                    }}>
                      {selectedItem.note}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  style={{ borderRadius: '8px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const page = () => {
  const params = useParams()
  const [lead, setLead] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [companyId, setCompanyId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('companyId')
    }
    return null
  })

  useEffect(() => {
    const fetchLeadHistory = async () => {
      try {
        const decryptedId = decryptId(params.id)
        const decryptedCid = decryptId(params.cid)
        if (!decryptedId || !decryptedCid) {
          setError('Invalid lead ID or company ID')
          return
        }

        setLoading(true)
        const response = await crmInstance.get(`/leads/history/${decryptedCid}/${decryptedId}`)

        //console.log('API Response:', response.data)

        // Extract lead and history data from response
        const leadData = response.data?.data?.lead
        const historyData = response.data?.data?.history || []

        //console.log('Lead data:', leadData)
        //console.log('History data:', historyData)

        // Ensure lead data is valid
        if (typeof leadData !== 'object' || leadData === null) {
          setLead({
            id: params.id,
            client_name: 'Unknown Lead',
            message: 'Data format not recognized'
          })
        } else {
          setLead(leadData)
        }

        // Set history data
        setHistory(Array.isArray(historyData) ? historyData : [])
        setError('')
      } catch (err) {
        console.error('Failed to fetch lead history:', err)
        setError('Failed to load lead history.')
        setLead(null)
        setHistory([])
      } finally {
        setLoading(false)
      }
    }

    if (params.id && params.cid) {
      fetchLeadHistory()
    }
  }, [params.id, params.cid])

  if (loading) {
    return (
      <>
        <PageHeader>
          <LeadsHistoryHeader lead={lead} />
        </PageHeader>
        <div className='main-content'>
          <div className='row'>
            <div className="col-12">
              <div className="timeline-wrapper" style={{
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                border: '1px solid #f3f4f6'
              }}>
                <div className="text-center py-5">
                  <div className="loading-icon mb-4">
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      animation: 'pulse 2s infinite'
                    }}>
                      <FiClock size={24} style={{ color: 'white' }} />
                    </div>
                  </div>
                  <h5 className="text-muted mb-2">Loading Activity Timeline</h5>
                  <p className="text-muted small">Please wait while we fetch the history...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (error || !lead) {
    return (
      <PermissionGuard permission="view-leads">
        <PageHeader>
          <LeadsHistoryHeader lead={lead} />
        </PageHeader>
        <div className='main-content'>
          <div className='row'>
            <div className="col-12">
              <div className="timeline-wrapper" style={{
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                border: '1px solid #f3f4f6'
              }}>
                <div className="text-center py-5">
                  <div className="error-icon mb-4">
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto'
                    }}>
                      <FiXCircle size={24} style={{ color: 'white' }} />
                    </div>
                  </div>
                  <h5 className="text-danger mb-2">Unable to Load Timeline</h5>
                  <p className="text-muted">{error || 'Lead not found or access denied'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PermissionGuard>
    )
  }

  return (
    <PermissionGuard permission="view-leads">
      <PageHeader>
        <LeadsHistoryHeader lead={lead} />
      </PageHeader>
      <div className='main-content'>
        <div className='row'>
          <div className="col-12">
            <div className="timeline-wrapper" style={{
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              border: '1px solid #f3f4f6'
            }}>
              <HistoryContent history={history} lead={lead} params={params} />
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}

export default page