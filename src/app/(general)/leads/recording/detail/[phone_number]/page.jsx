'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { FiPlay } from 'react-icons/fi'

const RecordingDetailHeader = () => {
  return (
    <div className="d-flex align-items-center justify-content-between">
      <div className="d-flex align-items-center">
        <Link href="/leads/recording" className="btn btn-outline-secondary me-3">
          <i className="bi bi-arrow-left"></i> Back
        </Link>
        <div>
          <h4 className="mb-0">Recording Details</h4>
          <p className="text-muted mb-0">Detailed view of call recordings</p>
        </div>
      </div>
    </div>
  )
}

export default function page() {
  const params = useParams()
  const phone_number = decodeURIComponent(params.phone_number)

  const [allRecordings, setAllRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRecording, setSelectedRecording] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)

  const fetchRecordings = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await crmInstance.get('/recordings/all?page=1')
      const res = response.data

      if (res.status && res.data) {
        const allData = res.data.data || []
        // Filter recordings where to or from phone matches
        const filtered = allData.filter(call =>
          call.call_info?.to?.phoneNumber === phone_number ||
          call.call_info?.from?.phoneNumber === phone_number
        )
        setAllRecordings(filtered)
      } else {
        setAllRecordings([])
      }
    } catch (error) {
      setError('Failed to load recordings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecordings()
  }, [phone_number])

  useEffect(() => {
    if (selectedRecording) {
      setAudioUrl(selectedRecording.recording_url)
    }
  }, [selectedRecording])

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      <PageHeader>
        <RecordingDetailHeader />
      </PageHeader>

      <div className="main-content">
        <div className="row">
          <div className="col-lg-12">
            <div className="card stretch stretch-full">
              <div className="card-body">
                <div className="mb-4">
                  <h5>Phone Number Details</h5>
                  <p><strong>Phone Number:</strong> {phone_number}</p>
                  <p><strong>Total Recordings:</strong> {allRecordings.length}</p>
                </div>

                {error && <div className="alert alert-danger">{error}</div>}

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
                            No recordings found for this phone number.
                          </td>
                        </tr>
                      ) : (
                        allRecordings.map((call, index) => (
                          <tr key={call.call_id}>
                            <td>{index + 1}</td>
                            <td>{call?.call_info?.direction || '-'}</td>
                            <td>{formatDate(call.start_time)}</td>
                            <td>{call.call_info?.from?.phoneNumber || '-'}</td>
                            <td>{call.call_info?.to?.phoneNumber || '-'}</td>
                            <td>{formatDuration(call.call_info?.duration)}</td>
                            <td>
                              <span className="badge bg-primary">
                                {call.call_info?.result || '-'}
                              </span>
                            </td>
                            <td className="text-end">
                              <button
                                className="btn btn-sm btn-outline-primary"
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recording Modal */}
      {selectedRecording && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
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
                  <audio controls style={{ width: '100%' }}>
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
