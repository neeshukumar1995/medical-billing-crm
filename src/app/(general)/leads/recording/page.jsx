'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { FiPlay, FiDownload } from 'react-icons/fi'

const RecordingHeader = () => {
  return (
    <div className="d-flex align-items-center justify-content-between">
      <div>
        <h4 className="mb-0">Call Recordings</h4>
        <p className="text-muted mb-0">View and download recorded calls</p>
      </div>
    </div>
  )
}

export default function RecordingPage() {
  const [allRecordings, setAllRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
   const [mycurrentPage, setMycurrentPage] = useState(1)
 
  const [error, setError] = useState(null)
  const [selectedRecording, setSelectedRecording] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')


console.log("mycurrentPage",mycurrentPage)
  const itemsPerPage = 10

  const fetchRecordings = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await crmInstance.get(
        `/recordings/all?page=`+mycurrentPage
      )
       const res = response.data
      console.log("API RESPONSE:", response)

      if (res.status && res.data) {
        const pg = res.data

        setAllRecordings(pg.data || [])
      } else {
        setAllRecordings([])
      }
    } catch (error) {
     
      
      setError("Failed to load recordings.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecordings()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
    setMycurrentPage(1)
  }, [searchTerm])


   

  useEffect(() => {
    if (selectedRecording) {
      setAudioUrl(selectedRecording.recording_url)
    }
  }, [selectedRecording])

  const filteredRecordings = allRecordings.filter(call => {
    const fromPhone = call.call_info?.from?.phoneNumber || ''
    const toPhone = call.call_info?.to?.phoneNumber || ''
    return fromPhone.includes(searchTerm) || toPhone.includes(searchTerm)
  })

  const totalRecords = filteredRecordings.length
  const totalPages = Math.ceil(totalRecords / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentRecordings = filteredRecordings.slice(startIndex, endIndex)



  const handleMyPageChange = (page) => {
    setMycurrentPage(page)
    fetchRecordings()
  }


  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getVisiblePages = (current, total) => {
    const pages = []
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      if (current > 4) pages.push('...')
      const start = Math.max(2, current - 1)
      const end = Math.min(total - 1, current + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (current < total - 3) pages.push('...')
      pages.push(total)
    }
    return pages
  }

  return (
    <>
      <PageHeader>
        <RecordingHeader />
      </PageHeader>

      <div className="main-content">
        <div className="row">
          <div className="col-lg-12">
            <div className="card stretch stretch-full">
              <div className="card-body">

                {error && <div className="alert alert-danger">{error}</div>}

                {!loading && allRecordings.length > 0 && (
                  <div className="d-flex align-items-center mb-3">
                    <span>Total Recordings: {totalRecords}</span>
                    <div className="flex-fill d-flex justify-content-center">
                      <input
                        type="text"
                        className="form-control"
                        style={{ width: '50%' }}
                        placeholder="Search by phone number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <span>Page {currentPage} of {totalPages}</span>
                  </div>
                )}

                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Direction</th>
                        <th>Date & Time</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Duration</th>
                        <th>Result</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="8" className="text-center py-5">
                            <div className="spinner-border text-primary"></div>
                          </td>
                        </tr>
                      ) : allRecordings.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center py-4">
                            No recordings found.
                          </td>
                        </tr>
                      ) : (
                        currentRecordings.map((call, index) => (
                          <tr key={call.call_id}>
                            <td>{startIndex + index + 1}</td>
                            <td>{call?.call_info?.direction || "-"}</td>
                            <td>{formatDate(call.start_time)}</td>
                            <td>{call.call_info?.from?.phoneNumber || "-"}</td>
                            <td>{call.call_info?.to?.phoneNumber || "-"}</td>
                            <td>{formatDuration(call.call_info?.duration)}</td>
 
                            <td>
                              <span className="badge bg-primary">
                                {call.call_info?.result || "-"}
                              </span>
                            </td>

                            <td className="text-end d-flex justify-content-end">

                              {/* Details Button */}
                              <Link href={`/leads/recording/detail/${encodeURIComponent(call.call_info?.to?.phoneNumber)}`} className="me-2">
                                <button className="btn btn-sm btn-outline-info">Details</button>
                              </Link>

                              {/* Play Button */}
                              <button
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={() => setSelectedRecording(call)}
                              >
                                <FiPlay />
                              </button>

                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {!loading && totalRecords > 0 && (
                  <div className="d-flex justify-content-center mt-3">
                    <ul className="pagination pagination-sm">

                     <li className={`page-item ${mycurrentPage === 1 ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => handleMyPageChange(mycurrentPage - 1)}
                      disabled={mycurrentPage === 1}
                    >
                      Back page
                    </button>
                  </li>


                      <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                        <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>
                          Prev
                        </button>
                      </li>

                      {getVisiblePages(currentPage, totalPages).map((page, index) => (
                        page === '...' ? (
                          <li key={index} className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        ) : (
                          <li
                            key={index}
                            className={`page-item ${currentPage === page ? 'active' : ''}`}
                          >
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </button>
                          </li>
                        )
                      ))}

                      <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                        <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>
                          Next
                        </button>
                      </li>

                        <li className={`page-item`}>
                        <button className="page-link" onClick={() => handleMyPageChange(mycurrentPage + 1)}>
                          Next page
                        </button>
                      </li>

                    </ul>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recording Modal */}
      {selectedRecording && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => {
            setSelectedRecording(null)
            setAudioUrl(null)
          }}
        >
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Play Recording</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setSelectedRecording(null)
                    setAudioUrl(null)
                  }}
                ></button>
              </div>

              <div className="modal-body">
                {audioUrl ? (
                  <audio controls style={{ width: "100%" }}>
                    <source src={audioUrl} type="audio/mpeg" />
                  </audio>
                ) : (
                  <div>Loading audio...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
