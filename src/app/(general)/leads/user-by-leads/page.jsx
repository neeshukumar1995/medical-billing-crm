'use client'

import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Loading from '@/components/shared/Loading'
import crmInstance from '@/utils/crmInstance'

const Page = () => {
  const [leads, setLeads] = useState([])
  const [filteredLeads, setFilteredLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLeads, setSelectedLeads] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [companyId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('companyId')
    }
    return null
  })

  const fetchLeads = async () => {
    try {
      setLoading(true)
      setError(null)
      const cid = companyId ? JSON.parse(companyId) : null
      if (!cid) {
        setError('Company ID not found. Please refresh the page and try again.')
        setLoading(false)
        return
      }
      const response = await crmInstance.get(`/user-leads/${cid}`)
      if (response.data?.status) {
        setLeads(response.data.data || [])
      } else {
        throw new Error('Failed to fetch leads')
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
      setError('Failed to load leads. Please try again.')
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (companyId) fetchLeads()
  }, [companyId])

  useEffect(() => {
    if (searchTerm) {
      setFilteredLeads(leads.filter(lead =>
        (lead.created_by?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.phone || '').includes(searchTerm) ||
        (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.designation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.source || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.lead_type?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      ))
    } else {
      setFilteredLeads(leads)
    }
  }, [searchTerm, leads])

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLeads(filteredLeads.map(l => l.id))
    } else {
      setSelectedLeads([])
    }
  }

  const handleSelectOne = (id) => {
    setSelectedLeads(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleApprove = async (leadId) => {
    try {
      const cid = companyId ? JSON.parse(companyId) : null
      if (!cid) return alert('Company ID not found.')
      const response = await crmInstance.post(`/leads/${cid}/${leadId}/approve`)
      if (response.data?.status) {
        alert('Lead approved successfully!')
        fetchLeads()
      } else {
        alert('Failed to approve lead.')
      }
    } catch (error) {
      console.error('Error approving lead:', error)
      alert('Error while approving lead.')
    }
  }

  const handleReject = async (leadId) => {
    try {
      const cid = companyId ? JSON.parse(companyId) : null
      if (!cid) return alert('Company ID not found.')
      const response = await crmInstance.post(`/leads/${cid}/${leadId}/reject`)
      if (response.data?.status) {
        setLeads(prev => prev.filter(lead => lead.id !== leadId))
        setSelectedLeads(prev => prev.filter(id => id !== leadId))
        alert(response.data.message || 'Lead rejected and permanently deleted')
      } else {
        alert('Failed to reject lead.')
      }
    } catch (error) {
      console.error('Error rejecting lead:', error)
      alert('Error while rejecting lead.')
    }
  }

  const handleBulkApprove = async () => {
    if (selectedLeads.length === 0) return alert('Please select at least one lead.')
    if (!window.confirm(`Are you sure you want to approve ${selectedLeads.length} lead(s)?`)) return
    try {
      setBulkLoading(true)
      const cid = companyId ? JSON.parse(companyId) : null
      if (!cid) return alert('Company ID not found.')
      
      console.log('Bulk approve request:', {
        url: `/leads/${cid}/bulk-approve`,
        data: { lead_ids: selectedLeads }
      })
      
      const response = await crmInstance.post(`/leads/${cid}/bulk-approve`, {
        lead_ids: selectedLeads
      })
      
      console.log('Bulk approve response:', response)
      
      if (response.data?.status) {
        alert(response.data.message || `${selectedLeads.length} leads approved successfully!`)
        setSelectedLeads([])
        fetchLeads()
      } else {
        alert('Failed to bulk approve leads.')
      }
    } catch (error) {
      console.error('Error bulk approving leads:', error)
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      })
      alert('Error while bulk approving leads.')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkReject = async () => {
    if (selectedLeads.length === 0) return alert('Please select at least one lead.')
    if (!window.confirm(`Are you sure you want to reject & delete ${selectedLeads.length} lead(s)? This cannot be undone.`)) return
    try {
      setBulkLoading(true)
      const cid = companyId ? JSON.parse(companyId) : null
      if (!cid) return alert('Company ID not found.')
      
      console.log('Bulk reject request:', {
        url: `/leads/${cid}/bulk-reject`,
        data: { lead_ids: selectedLeads }
      })
      
      const response = await crmInstance.post(`/leads/${cid}/bulk-reject`, {
        lead_ids: selectedLeads
      })
      
      console.log('Bulk reject response:', response)
      
      if (response.data?.status) {
        setLeads(prev => prev.filter(lead => !selectedLeads.includes(lead.id)))
        setSelectedLeads([])
        alert(response.data.message || `${selectedLeads.length} leads rejected successfully!`)
      } else {
        alert('Failed to bulk reject leads.')
      }
    } catch (error) {
      console.error('Error bulk rejecting leads:', error)
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      })
      alert('Error while bulk rejecting leads.')
    } finally {
      setBulkLoading(false)
    }
  }

  const isAllSelected = filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length

  return (
    <PermissionGuard permission="view-leads">
      <PageHeader>
        <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
          <h3 className="page-title">Leads by User</h3>
        </div>
      </PageHeader>

      <div className="main-content">
        <div className="row">
          <div className="col-lg-12">
            <div className="card stretch stretch-full">

              {/* Card Header */}
              <div className="card-header border-bottom px-4 py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-semibold fs-13">User Leads</span>
                  {leads.length > 0 && (
                    <span className="badge bg-primary rounded-pill px-2">
                      {leads.length} Total
                    </span>
                  )}
                </div>

                {selectedLeads.length > 0 && (
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="text-muted small">
                      <span className="badge bg-primary bg-opacity-10 text-white px-2 py-1 rounded-pill me-1">
                        {selectedLeads.length}
                      </span>
                      selected
                    </span>
                    <button
                      className="btn btn-success btn-sm px-3 d-flex align-items-center gap-1"
                      onClick={handleBulkApprove}
                      disabled={bulkLoading}
                    >
                      {bulkLoading
                        ? <span className="spinner-border spinner-border-sm me-1" role="status" />
                        : <i className="bi bi-check2-all"></i>
                      }
                      Bulk Approve
                    </button>
                    <button
                      className="btn btn-danger btn-sm px-3 d-flex align-items-center gap-1"
                      onClick={handleBulkReject}
                      disabled={bulkLoading}
                    >
                      {bulkLoading
                        ? <span className="spinner-border spinner-border-sm me-1" role="status" />
                        : <i className="bi bi-x-circle"></i>
                      }
                      Bulk Reject
                    </button>
                    <button
                      className="btn btn-outline-secondary btn-sm px-3"
                      onClick={() => setSelectedLeads([])}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="card-body">
                {error && (
                  <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="d-flex justify-content-center align-items-center py-5">
                    <Loading />
                  </div>
                ) : (
                  <>
                    {/* DataTables Controls */}
                    <div className="row gy-2 mb-3">
                      <div className="col-sm-12 col-md-6 ps-0 m-0 pb-10">
                        <div className="dataTables_length d-flex justify-content-md-start justify-content-center">
                          <label className="d-flex align-items-center gap-1">
                            Show
                            <select className="form-select form-select-sm w-auto pe-4" defaultValue={10}>
                              <option value={10}>10</option>
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                            </select>
                            entries
                          </label>
                        </div>
                      </div>
                      <div className="col-sm-12 col-md-6 ps-0 m-0 pb-10">
                        <div className="dataTables_filter d-flex justify-content-md-end justify-content-center">
                          <label className="d-inline-flex align-items-center gap-2">
                            Search:
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              placeholder="Search leads..."
                              className="form-control form-control-sm"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <div className="dataTables_wrapper dt-bootstrap5 no-footer">
                        <div className="row dt-row">
                          <div className="col-sm-12 px-0">
                            <table className="table table-hover dataTable no-footer" id="userLeadsTable">
                              <thead>
                                <tr>
                                  <th style={{ width: '44px' }}>
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      checked={isAllSelected}
                                      onChange={handleSelectAll}
                                      title="Select All"
                                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                  </th>
                                  <th>S.No</th>
                                  <th>Added By</th>
                                  <th>Client Name</th>
                                  <th>Company Name</th>
                                  <th>Phone No</th>
                                  <th>Email</th>
                                  <th>Designation</th>
                                  <th>Source</th>
                                  <th>Type</th>
                                  <th className="text-end">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredLeads.length === 0 ? (
                                  <tr>
                                    <td colSpan="11" className="text-center py-4 text-muted">
                                      <i className="bi bi-inbox fs-3 d-block mb-1 opacity-50"></i>
                                      {searchTerm ? 'No leads found matching your search.' : 'No leads found.'}
                                    </td>
                                  </tr>
                                ) : (
                                  filteredLeads.map((lead, index) => {
                                    const isSelected = selectedLeads.includes(lead.id)
                                    return (
                                      <tr
                                        key={lead.id}
                                        className={isSelected ? 'table-primary' : ''}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleSelectOne(lead.id)}
                                      >
                                        <td onClick={e => e.stopPropagation()}>
                                          <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={isSelected}
                                            onChange={() => handleSelectOne(lead.id)}
                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                          />
                                        </td>
                                        <td>{index + 1}</td>
                                        <td>
                                          <div className="d-flex align-items-center gap-2">
                                            <div
                                              className="rounded-circle d-flex align-items-center justify-content-center fw-semibold flex-shrink-0"
                                              style={{
                                                width: '30px',
                                                height: '30px',
                                                fontSize: '12px',
                                                backgroundColor: '#3454d1',
                                              }}
                                            >
                                              <span style={{ color: '#ffffff' }}>
                                                {(lead.created_by?.name || 'N')[0].toUpperCase()}
                                              </span>
                                            </div>
                                            <span>{lead.created_by?.name || 'N/A'}</span>
                                          </div>
                                        </td>
                                        <td>{lead.client_name || '—'}</td>
                                        <td>{lead.company || '—'}</td>
                                        <td>{lead.phone || '—'}</td>
                                        <td>{lead.email || '—'}</td>
                                        <td>{lead.designation || '—'}</td>
                                        <td>
                                          {lead.source ? (
                                            <span
                                              className="badge rounded-pill px-2 py-1"
                                              style={{ backgroundColor: '#0dcaf0', color: '#ffffff' }}
                                            >
                                              {lead.source}
                                            </span>
                                          ) : '—'}
                                        </td>
                                        <td>
                                          {lead.lead_type?.name ? (
                                            <span
                                              className="badge rounded-pill px-2 py-1"
                                              style={{ backgroundColor: '#6f42c1', color: '#ffffff' }}
                                            >
                                              {lead.lead_type.name}
                                            </span>
                                          ) : '—'}
                                        </td>
                                        <td className="text-end" onClick={e => e.stopPropagation()}>
                                          <div className="hstack gap-1 justify-content-end">
                                            <button
                                              className="btn btn-success btn-sm"
                                              onClick={() => handleApprove(lead.id)}
                                            >
                                              <i className="bi bi-check-lg me-1"></i>Approve
                                            </button>
                                            <button
                                              className="btn btn-danger btn-sm"
                                              onClick={() => handleReject(lead.id)}
                                            >
                                              <i className="bi bi-x-lg me-1"></i>Reject
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer count */}
                    <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top">
                      <span className="text-muted small">
                        Showing <strong>{filteredLeads.length}</strong> of <strong>{leads.length}</strong> leads
                        {selectedLeads.length > 0 && (
                          <span className="ms-2 text-primary fw-semibold">
                            &bull; {selectedLeads.length} selected
                          </span>
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </PermissionGuard>
  )
}

export default Page
