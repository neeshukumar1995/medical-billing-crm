'use client'
import React, { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import LeadssTable from '@/components/leads/LeadsTable'
import Footer from '@/components/shared/Footer'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Loading from '@/components/shared/Loading'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'

const page = () => {
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [error, setError] = useState(null)
    const [selectedLeads, setSelectedLeads] = useState([])
    const [companyId, setCompanyId] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('companyId')
        }
        return null
    })

    // Fetch leads function
  const fetchLeads = useCallback(async (page = 1, append = false) => {
  try {
    if (page === 1) {
      setLoading(true)
      setError(null)
    } else {
      setLoadingMore(true)
    }

    const cid = companyId ? JSON.parse(companyId) : null
    if (!cid) return

    const params = { page }
    const response = await crmInstance.get(`/leads/${cid}/trashed`, { params })

    if (response.data.status) {
      const newLeads = response.data.data.data || []

      if (append) {
        setLeads(prevLeads => {
          const combined = [...prevLeads, ...newLeads]
          // Remove duplicates based on id
          const unique = combined.filter((lead, index, self) =>
            index === self.findIndex(l => l.id === lead.id)
          )
          return unique
        })
      } else {
        setLeads(newLeads)
      }

      // Check if there's a next page
      setHasMore(response.data.data.next_page_url !== null)
      setCurrentPage(page)
    } else {
      throw new Error('Failed to fetch leads')
    }
  } catch (error) {
    console.error('Error fetching leads:', error)
    setError('Failed to load leads. Please try again.')
  } finally {
    setLoading(false)
    setLoadingMore(false)
  }
}, [companyId])

    // Initial load
    useEffect(() => {
        if (companyId) {
            fetchLeads(1, false)
        }
    }, [fetchLeads, companyId])

    // Load more data function
    const loadMoreLeads = () => {
        if (!loadingMore && hasMore) {
            const nextPage = currentPage + 1
            console.log(`Loading page ${nextPage}, current hasMore: ${hasMore}`)
            setCurrentPage(nextPage)
            fetchLeads(nextPage, true)
        } else {
            console.log(`Not loading more: loadingMore=${loadingMore}, hasMore=${hasMore}`)
        }
    }

    // Scroll event handler (same as users page)
    const handleScroll = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight

        // Load more when user is 200px from bottom (same as users page)
        if (scrollTop + windowHeight >= documentHeight - 200) {
            //console.log('Scroll triggered: loading more leads')
            loadMoreLeads()
        }
    }

    // Add scroll event listener (same as users page)
    useEffect(() => {
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [loadingMore, hasMore, currentPage])

    // Handle data updates (for delete operations)
    const handleDataUpdate = useCallback((updatedData) => {
        setLeads(updatedData)
    }, [])

    // Handle selection changes
    const handleSelectionChange = useCallback((selectedRows) => {
        setSelectedLeads(selectedRows)
    }, [])

    // Handle bulk restore
    const handleBulkRestore = useCallback(async () => {
        if (selectedLeads.length === 0) {
            return
        }

        const result = await Swal.fire({
            title: 'Restore Selected Leads?',
            text: `Are you sure you want to restore ${selectedLeads.length} selected lead(s)?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Restore',
            cancelButtonText: 'Cancel'
        })

        if (!result.isConfirmed) return

        try {
            const leadIds = selectedLeads.map(lead => lead.id)
            const cid = companyId ? JSON.parse(companyId) : null
            if (!cid) {
                await Swal.fire({
                    title: 'Error!',
                    text: 'Company ID not found. Please refresh the page and try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                })
                return
            }

            const response = await crmInstance.post(`/leads/bulk-restore/${cid}`, { ids: leadIds })

            if (response.data && response.data.status) {
                // Remove restored leads from the list
                const updatedLeads = leads.filter(lead => !leadIds.includes(lead.id))
                setLeads(updatedLeads)
                setSelectedLeads([])

                await Swal.fire({
                    title: 'Success!',
                    text: `Successfully restored ${selectedLeads.length} lead(s)`,
                    icon: 'success',
                    confirmButtonText: 'OK'
                })
            } else {
                throw new Error(response.data?.message || 'Bulk restore failed')
            }
        } catch (error) {
            console.error('Bulk restore error:', error)
            await Swal.fire({
                title: 'Error!',
                text: 'Failed to restore selected leads. Please try again.',
                icon: 'error',
                confirmButtonText: 'OK'
            })
        }
    }, [selectedLeads, leads, companyId])

    return (
        <PermissionGuard permission="trashed-leads">
            <PageHeader>
                <div className="d-flex align-items-center gap-3 page-header-right-items-wrapper">
                    <button
                        onClick={handleBulkRestore}
                        className={`btn ${selectedLeads.length > 0 ? 'btn-success' : 'btn-outline-secondary'}`}
                        disabled={selectedLeads.length === 0}
                        title={selectedLeads.length > 0 ? `Restore ${selectedLeads.length} selected lead(s)` : 'Select leads to restore'}
                    >
                        <i className="bi bi-arrow-counterclockwise me-2"></i>
                        <span>All Restore</span>
                        {selectedLeads.length > 0 && (
                            <span className="badge bg-light text-dark ms-2">{selectedLeads.length}</span>
                        )}
                    </button>
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}

                                {loading && (
                                    <div className="d-flex justify-content-center align-items-center py-5">
                                        <Loading />
                                    </div>
                                )}

                                {!loading && (
                                    <>
                                        <div className="mb-2 text-muted small">
                                            Total leads loaded: {leads.length} | Current page: {currentPage} | Has more: {hasMore ? 'Yes' : 'No'}
                                        </div>
                                        <LeadssTable
                                            data={leads}
                                            onDataUpdate={handleDataUpdate}
                                            onSelectionChange={handleSelectionChange}
                                            isTrashed={false}
                                            rowSelection={true}
                                            allSelectedIds={selectedLeads.map(lead => lead.id)}
                                            showSerialNumbers={false}
                                            enableRowSelection={true}
                                        />

                                        {/* Loading more spinner (same as users page) */}
                                        {loadingMore && (
                                            <div className="text-center py-4">
                                                <div className="d-flex justify-content-center align-items-center">
                                                    <div className="spinner-border spinner-border-sm" role="status">
                                                        <span className="visually-hidden">Loading...</span>
                                                    </div>
                                                    <span className="ms-2">Loading more leads...</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* No more data indicator (same as users page) */}
                                        {!loadingMore && !hasMore && leads.length > 0 && (
                                            <div className="text-center py-4 text-muted">
                                                <small>No more leads to load</small>
                                            </div>
                                        )}
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

export default page