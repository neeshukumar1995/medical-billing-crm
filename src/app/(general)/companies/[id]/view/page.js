'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { FiArrowLeft, FiMapPin, FiBriefcase, FiCalendar, FiEdit, FiBuilding, FiPlus, FiSettings } from 'react-icons/fi'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import { useParams } from 'next/navigation'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { decryptId } from '@/utils/decryptId'
import { encryptId } from '@/utils/encryptId'
import { formatDate } from '@/utils/formatDate'

const CompaniesViewHeader = () => {
    return (
        <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
            <Link href="/companies/list" className="btn btn-outline-secondary">
                <FiArrowLeft size={16} className='me-2' />
                <span>Back</span>
            </Link>
            <Link href="/companies/create" className="btn btn-primary">
                <FiPlus size={16} className='me-2' />
                <span>Create Company</span>
            </Link>
        </div>
    )
}

const page = () => {
  const params = useParams()
  const actualId = useMemo(() => decryptId(params.id), [params.id])
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!actualId) return

    const fetchCompany = async () => {
      try {
        setLoading(true)
        const response = await crmInstance.get(`/companies/${actualId}`)
        setCompany(response.data)
        setError('')
      } catch (err) {
        console.error('Failed to fetch company:', err)
        setError('Failed to load company details.')
      } finally {
        setLoading(false)
      }
    }

    fetchCompany()
  }, [actualId])

  if (loading) {
    return (
      <PermissionGuard permission="view-companies">
        <PageHeader>
          <CompaniesViewHeader />
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

  if (error || !company) {
    return (
      <PermissionGuard permission="view-companies">
        <PageHeader>
          <CompaniesViewHeader />
        </PageHeader>
        <div className='main-content'>
          <div className="alert alert-danger">{error || 'Company not found'}</div>
        </div>
      </PermissionGuard>
    )
  }

  return (
    <PermissionGuard permission="view-companies">
      <PageHeader>
        <CompaniesViewHeader />
      </PageHeader>
      <div className='main-content'>
        <div className='row'>
            <div className="col-12">
                <div className="card">
                    <div className="card-body">
                        <h4>Company Details</h4>
                        <div className="row mt-4">
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Company Name</label>
                                    <p className="form-control-plaintext">{company?.name || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Address</label>
                                    <p className="form-control-plaintext">{company?.address || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Created Date</label>
                                    <p className="form-control-plaintext">
                                        {company?.created_at ? formatDate(company.created_at) : 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Updated Date</label>
                                    <p className="form-control-plaintext">
                                        {company?.updated_at ? formatDate(company.updated_at) : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <Link href={`/companies/${encryptId(company?.id)}/edit`} className="btn btn-primary" style={{width:'16%'}}>
                                <FiEdit className="me-2" />
                                Edit Company
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </PermissionGuard>
  )
}

export default page