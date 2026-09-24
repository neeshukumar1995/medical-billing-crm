'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { FiPlus } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import { useParams } from 'next/navigation'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard';
import { useRouter } from 'next/navigation'
import { decryptId } from '@/utils/decryptId'
import { encryptId } from '@/utils/encryptId'
import { formatDate } from '@/utils/formatDate'


const SourcesViewHeader = () => {
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

      <Link href="/sources/create" className="btn btn-primary">
        <FiPlus size={16} className='me-2' />
        <span>Create Source</span>
      </Link>
    </div>
  )
}

const TabOverviewContent = ({ source }) => {
  const dynamicInformationData = [
    { label: 'Name', value: source?.name || 'N/A' },
    { label: 'Created At', value: source?.created_at ? formatDate(source.created_at) : 'N/A' },
    { label: 'Updated At', value: source?.updated_at ? formatDate(source.updated_at) : 'N/A' },
  ]

  return (
    <div
      className="tab-pane fade show active p-4"
      id="overviewTab"
      role="tabpanel"
    >
      <div className="profile-details mb-5">
        <div className="mb-4 d-flex align-items-center justify-content-between">
          <h5 className="fw-bold mb-0">Source Details:</h5>
          <Link href={`/sources/edit/${encryptId(source?.id)}`} className="btn btn-sm btn-light-brand">
            Edit Source
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
  const [source, setSource] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [companyId, setCompanyId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('companyId')
    }
    return null
  })

  useEffect(() => {
    const fetchSource = async () => {
      try {
        setLoading(true)

        const cid = companyId ? JSON.parse(companyId) : null
        if (!cid) {
          setError('Company ID not found. Please refresh the page and try again.')
          setLoading(false)
          return
        }

        const response = await crmInstance.get(`/sources/${cid}/${actualId}`)

        // Handle API response structure: { status, message, data: {...} }
        let sourceData = {}
        if (response.data && response.data.data && typeof response.data.data === 'object') {
          sourceData = response.data.data
        } else if (response.data && typeof response.data === 'object' && response.data.id) {
          sourceData = response.data
        }

        setSource(sourceData)
        setError('')
      } catch (err) {

        setError('Failed to load source details.')
      } finally {
        setLoading(false)
      }
    }

    if (actualId && companyId) {
      fetchSource()
    }
  }, [actualId, companyId])

  if (loading) {
    return (
      <PermissionGuard permission="view-sources" redirect={false}>
        <PageHeader>
          <SourcesViewHeader />

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
      </PermissionGuard>
    )
  }

  if (error || !source) {
    return (
      <PermissionGuard permission="view-sources" redirect={false}>
        <PageHeader>
          <SourcesViewHeader />
        </PageHeader>
        <div className='main-content'>
          <div className="alert alert-danger">{error || 'Source not found'}</div>
        </div>
      </PermissionGuard>
    )
  }

  return (
    <PermissionGuard permission="view-sources" redirect={false}>
      <PageHeader>
        <SourcesViewHeader />
      </PageHeader>
      <div className='main-content'>
        <div className='row'>
          <div className="col-12">
            <div className="card">
              <div className="tab-content">
                <TabOverviewContent source={source} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}

export default page