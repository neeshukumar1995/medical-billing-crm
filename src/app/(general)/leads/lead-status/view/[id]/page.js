'use client'
import React, { useState, useEffect, useMemo} from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { FiPlus } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import { useParams } from 'next/navigation'
import Spinner from '@/components/shared/Spinner'
import { useRouter } from 'next/navigation'
import { decryptId } from '@/utils/decryptId'
import { encryptId } from '@/utils/encryptId'
import { formatDate } from '@/utils/formatDate'

const LeadStatusViewHeader = () => {
const router = useRouter()
  return (
    <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
       <button
            onClick={() => router.back()}
            className="btn btn-outline-primary"
          >
            <i className="me-2">⬅️</i>
            Back
          </button>
      <Link href="/leads/lead-status/create" className="btn btn-primary">
        <FiPlus size={16} className='me-2' />
        <span>Create Lead Status</span>
      </Link>
    </div>
  )
}

const TabOverviewContent = ({ leadStatus }) => {
  const dynamicInformationData = [
    { label: 'Name', value: leadStatus?.name || 'N/A' },
    { label: 'Created At', value: leadStatus?.created_at ? formatDate(leadStatus.created_at) : 'N/A' },
    { label: 'Updated At', value: leadStatus?.updated_at ? formatDate(leadStatus.updated_at) : 'N/A' },
  ]

  return (
    <div
      className="tab-pane fade show active p-4"
      id="overviewTab"
      role="tabpanel"
    >
      <div className="profile-details mb-5">
        <div className="mb-4 d-flex align-items-center justify-content-between">
          <h5 className="fw-bold mb-0">Lead Status Details:</h5>
          <Link href={`/leads/lead-status/edit/${encryptId(leadStatus?.id)}`} className="btn btn-sm btn-light-brand">
            Edit Lead Status
          </Link>
        </div>
        {dynamicInformationData.map((item, index) => (
          <div key={index} className={`row g-0 ${index === dynamicInformationData.length - 1 ? 'mb-0' : 'mb-4'}`}>
            <div className="col-sm-6 text-muted">{item.label}:</div>
            <div className="col-sm-6 fw-semibold">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const page = () => {
  const params = useParams()
   const actualId = useMemo(() => decryptId(params.id), [params.id])
  const [leadStatus, setLeadStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [companyId, setCompanyId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('companyId')
    }
    return null
  })

  useEffect(() => {
    const fetchLeadStatus = async () => {
      try {
        setLoading(true)
        const cid = companyId ? JSON.parse(companyId) : null
        if (!cid) {
          setError('Company ID not found. Please refresh the page and try again.')
          setLoading(false)
          return
        }

        const response = await crmInstance.get(`/lead-status/${cid}/${actualId}`)


        // Handle API response structure: { status, message, data: {...} }
        let leadStatusData = {}
        if (response.data && response.data.data && typeof response.data.data === 'object') {
          leadStatusData = response.data.data
        } else if (response.data && typeof response.data === 'object' && response.data.id) {
          leadStatusData = response.data
        }

        setLeadStatus(leadStatusData)
        setError('')
      } catch (err) {

        setError('Failed to load lead status details.')
      } finally {
        setLoading(false)
      }
    }

    if (actualId && companyId) {
      fetchLeadStatus()
    }
  }, [actualId, companyId])

  if (loading) {
    return (
      <>
        <PageHeader>
          <LeadStatusViewHeader />
        </PageHeader>
        <div className='main-content'>
          <div className='row'>
            <div className="col-12">
              <div className="card">
                <div className="card-body text-center py-5">
                  <Spinner classNames={{ label: "text-foreground mt-4" }} label="spinner" variant="spinner" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (error || !leadStatus) {
    return (
      <>
        <PageHeader>
          <LeadStatusViewHeader />
        </PageHeader>
        <div className='main-content'>
          <div className="alert alert-danger">{error || 'Lead status not found'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader>
        <LeadStatusViewHeader />
      </PageHeader>
      <div className='main-content'>
        <div className='row'>
          <div className="col-12">
            <div className="card">
              <div className="tab-content">
                <TabOverviewContent leadStatus={leadStatus} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default page