'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import PermissionGuard from '@/components/shared/PermissionGuard'
import SelectDropdown from '@/components/shared/SelectDropdown'
import CustomServiceDropdown from '@/components/CustomServiceDropdown'
import CustomUserDropdown from '@/components/CustomUserDropdown'
import StatusUpdateModal from '@/components/shared/StatusUpdateModal'
import useLocationData from '@/hooks/useLocationData'
import { useLeadForm } from '@/hooks/useLeadForm'
import Loading from '@/components/shared/Loading'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { useRouter } from 'next/navigation'

const LeadCreatePage = () => {
  const router = useRouter()

  // Form state
  const [customService, setCustomService] = useState('')
  const [showCustomService, setShowCustomService] = useState(false)
  const [document, setDocument] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // API data state
  const [leadStatuses, setLeadStatuses] = useState([])
  const [leadTypes, setLeadTypes] = useState([])
  const [sources, setSources] = useState([])
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [usersPage, setUsersPage] = useState(1)
  const [usersHasMore, setUsersHasMore] = useState(true)
  const [usersLoadingMore, setUsersLoadingMore] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [tempStatusData, setTempStatusData] = useState({
    status_id: '',
    note: '',
    followup_date: ''
  })
  const [companyId, setCompanyId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('companyId')
    }
    return null
  })

  // Location data hook
  const { countries, states, cities, loading, error, fetchStates, fetchCities } = useLocationData()

  // Custom form hook
  const { formData, errors, handleChange, handleSelect, updateFormData, validateForm, resetForm } = useLeadForm(leadStatuses)


  // Memoize API fetch functions
  const fetchLeadStatuses = useCallback(async () => {
    try {
      const cid = companyId ? JSON.parse(companyId) : null
      if (!cid) return

      const response = await crmInstance.get(`/lead-status/${cid}`)
      const data = response.data.data.data || response.data.data || response.data || []
      const options = Array.isArray(data) ? data.map(item => ({
        value: String(item.id),
        label: item.name
      })) : []
      setLeadStatuses(options)
    } catch (error) {
      console.error('Error fetching lead statuses:', error)
    }
  }, [companyId])

  const fetchLeadTypes = useCallback(async () => {
    try {
      const cid = companyId ? JSON.parse(companyId) : null
      if (!cid) return

      const response = await crmInstance.get(`/lead-types/${cid}`)
      const data = response.data.data.data || response.data.data || response.data || []
      const options = Array.isArray(data) ? data.map(item => ({
        value: String(item.id),
        label: item.name
      })) : []
      setLeadTypes(options)
    } catch (error) {
      console.error('Error fetching Provider Typess:', error)
    }
  }, [companyId])

  const fetchSources = useCallback(async () => {
    try {
      const cid = companyId ? JSON.parse(companyId) : null
      if (!cid) return

      const response = await crmInstance.get(`/sources/${cid}`)
      const data = response.data.data.data || response.data.data || response.data || []
      const options = Array.isArray(data) ? data.map(item => ({
        value: item.name,
        label: item.name
      })) : []
      setSources(options)
    } catch (error) {
      console.error('Error fetching sources:', error)
    }
  }, [companyId])

  useEffect(() => {
    if (companyId) {
      fetchLeadStatuses()
      fetchLeadTypes()
      fetchSources()
      fetchUsers(1, false)
    }
  }, [fetchLeadStatuses, fetchLeadTypes, fetchSources, companyId])

  // Force re-render dropdowns when options are loaded
  useEffect(() => {
    if (leadStatuses.length > 0 || leadTypes.length > 0 || sources.length > 0 || users.length > 0 || countries.length > 0 || states.length > 0 || cities.length > 0) {
      setFormKey(prev => prev + 1)
    }
  }, [leadStatuses, leadTypes, sources, users, countries, states, cities])

  const fetchUsers = useCallback(async (page = 1, append = false) => {
    try {
      const cid = companyId ? JSON.parse(companyId) : null
      if (!cid) return

      if (page === 1) {
        setUsersLoading(true)
      } else {
        setUsersLoadingMore(true)
      }

      const params = { page }
      const response = await crmInstance.get(`/users/${cid}`, { params })
      const usersData = response.data?.data?.data || response.data?.data || response.data || []

      const userOptions = Array.isArray(usersData)
        ? usersData.map(user => ({
          value: String(user.id),
          label: user.name,
          avatar: user.name ? user.name.charAt(0).toUpperCase() : 'U'
        }))
        : []

      if (append) {
        setUsers(prevUsers => [...prevUsers, ...userOptions])
      } else {
        setUsers(userOptions)
      }

      setUsersHasMore(userOptions.length === 5)
      setUsersError('')
    } catch (error) {
      let errorMessage = 'Failed to load users. Please try again.'
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.'
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view users.'
      } else if (error.response?.status === 404) {
        errorMessage = 'Users endpoint not found. Please check API configuration.'
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      setUsersError(errorMessage)
      if (!append) {
        setUsers([])
      }
    } finally {
      setUsersLoading(false)
      setUsersLoadingMore(false)
    }
  }, [companyId])

  const loadMoreUsers = useCallback(() => {
    if (!usersLoadingMore && usersHasMore) {
      const nextPage = usersPage + 1
      setUsersPage(nextPage)
      fetchUsers(nextPage, true)
    }
  }, [usersLoadingMore, usersHasMore, usersPage, fetchUsers])


  // Memoize expensive computations
  const selectedLeadStatus = useMemo(() =>
    formData.lead_status_id ? leadStatuses.find(opt => opt.value === formData.lead_status_id) : null,
    [formData.lead_status_id, leadStatuses]
  )

  const selectedLeadType = useMemo(() =>
    formData.lead_type_id ? leadTypes.find(opt => opt.value === formData.lead_type_id) : null,
    [formData.lead_type_id, leadTypes]
  )

  const selectedSource = useMemo(() =>
    formData.source ? sources.find(opt => opt.value === formData.source) : null,
    [formData.source, sources]
  )

  const selectedCountry = useMemo(() =>
    formData.country ? countries.find(opt => opt.value === formData.country) : null,
    [formData.country, countries]
  )

  // Memoize handlers
  const handleServiceSelect = useCallback((services) => {
    updateFormData('service', services)
  }, [updateFormData])

  const handleLeadStatusSelect = useCallback((option) => {
    if (option) {
      // Open modal for status selection with notes
      setTempStatusData({
        status_id: option.value,
        note: '',
        followup_date: ''
      })
      setShowStatusModal(true)
    } else {
      handleSelect('lead_status_id', option)
    }
  }, [handleSelect])

  const handleLeadTypeSelect = useCallback((option) => {
    handleSelect('lead_type_id', option)
  }, [handleSelect])

  const handleSourceSelect = useCallback((option) => {
    handleSelect('source', option)
  }, [handleSelect])

  const handleCountrySelect = useCallback((option) => {
    handleSelect('country', option)
  }, [handleSelect])

  const handleFormSubmit = useCallback(async (e, isDraft = false) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const data = new FormData()

      Object.keys(formData).forEach(key => {
        if (key === 'service') {
          if (Array.isArray(formData[key]) && formData[key].length > 0) {
            data.append(key, formData[key].join(','))
          }
        } else if (key === 'user_assign_date') {
          if (formData.assigned_to && formData[key]) {
            data.append(key, formData[key])
          }
        } else if (key === 'followup_date') {
          if (formData.lead_status_id && selectedLeadStatus?.label?.includes("Follow Up")) {
            data.append(key, formData[key] || null)
          }
        } else if (key === 'status_notes') {
          if (formData.lead_status_id && formData[key]) {
            data.append('note', formData[key])
          }
        } else if (Array.isArray(formData[key])) {
          if (formData[key].length > 0) {
            formData[key].forEach(val => data.append(`${key}[]`, val))
          }
        } else if (formData[key] !== null && formData[key] !== '' && formData[key] !== undefined) {
          data.append(key, formData[key])
        }
      })

      if (document) {
        data.append('document', document)
      }

      if (isDraft) {
        data.append('is_draft', '1')
      }

      const cid = companyId ? JSON.parse(companyId) : null
      if (!cid) return

      const response = await crmInstance.post(`/leads/${cid}`, data)

      if (response.status === 200 || response.status === 201) {
        await Swal.fire({
          title: 'Success!',
          text: response.data?.message || 'Lead created successfully!',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#007bff'
        })

        resetForm()
        setDocument(null)
        setCustomService('')
        setShowCustomService(false)
        setFormKey(prev => prev + 1)
      } else {
        await Swal.fire({
          title: 'Warning!',
          text: response.data?.message || 'Lead may have been created but please verify',
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#ffc107'
        })
      }
    } catch (error) {
      console.error('Lead creation failed:', error)

      if (error.response?.status === 422) {
        const validationErrors = error.response.data.errors
        let errorMessage = 'Validation failed:'
        if (validationErrors) {
          Object.keys(validationErrors).forEach(field => {
            errorMessage += `\n• ${field}: ${validationErrors[field].join(', ')}`
          })
        } else {
          errorMessage = error.response.data.message || 'Validation failed'
        }

        await Swal.fire({
          title: 'Validation Error!',
          text: errorMessage,
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#ffc107'
        })
      } else {
        if (error.response && error.response.status !== 200 && error.response.status !== 201) {
          await Swal.fire({
            title: 'Error!',
            text: error.response?.data?.message || 'Failed to create lead. Please try again.',
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#dc3545'
          })
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, selectedLeadStatus, validateForm, resetForm, document])

  // ✅ FIX: case-insensitive match, same as shared modal
  const handleStatusModalSubmit = useCallback(() => {
    const selectedStatus = leadStatuses.find(s => s.value === tempStatusData.status_id)
    const isFollowUp = /follow up|progress/i.test(selectedStatus?.label || '')

    if (isFollowUp && !tempStatusData.followup_date) {
      Swal.fire({
        title: 'Required Field Missing',
        text: 'Please select a follow-up date for this status.',
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#ffc107'
      })
      return
    }

    updateFormData('lead_status_id', tempStatusData.status_id)
    updateFormData('status_notes', tempStatusData.note)
    if (tempStatusData.followup_date) {
      updateFormData('followup_date', tempStatusData.followup_date)
    }

    setShowStatusModal(false)
    setTempStatusData({ status_id: '', note: '', followup_date: '' })
  }, [tempStatusData, updateFormData, leadStatuses])

  return (
    <PermissionGuard permission="create-leads" redirect={false}>
      <PageHeader>
        <button
            onClick={() => router.back()}
            className="btn btn-outline-primary"
          >
            <i className="me-2">⬅️</i>
            Back
          </button>

      </PageHeader>

      <div className='main-content'>
        <form onSubmit={handleFormSubmit}>
          <div className='row'>
            <>
              {loading && <Loading />}
              <div className="col-lg-12">
                <div className="card stretch stretch-full">
                  <div className="card-body lead-status">
                    <div className="mb-5 d-flex align-items-center justify-content-between">
                      <h5 className="fw-bold mb-0 me-4">
                        <span className="d-block mb-2">Lead Status :</span>
                        <span className="fs-12 fw-normal text-muted text-truncate-1-line">Typically refers to adding a new potential customer or sales prospect</span>
                      </h5>

                    </div>
                    <div className="row">
                      <div className="col-lg-4 mb-6">
                        <label className="form-label">Lead Status</label>
                        <SelectDropdown
                          key={`lead-status-${formKey}`}
                          options={leadStatuses}
                          selectedOption={selectedLeadStatus}
                          onSelectOption={handleLeadStatusSelect}
                        />
                        {errors.lead_status_id && <div className="text-danger small mt-1">{errors.lead_status_id}</div>}
                      </div>

                      {formData.lead_status_id && selectedLeadStatus?.label?.includes("Follow Up") && (
                        <div className="col-lg-4 mb-6">
                          <label className="form-label">Follow Up Date <span className="text-danger">*</span></label>
                          <input
                            type="date"
                            name="followup_date"
                            className="form-control"
                            value={formData.followup_date || ""}
                            onChange={handleChange}
                          />
                          {errors.followup_date && <div className="text-danger small mt-1">{errors.followup_date}</div>}
                        </div>
                      )}

                      <div className="col-lg-4 mb-6">
                        <label className="form-label">Select Provider Types:</label>
                        <SelectDropdown
                          key={`lead-type-${formKey}`}
                          options={leadTypes}
                          selectedOption={selectedLeadType}
                          onSelectOption={handleLeadTypeSelect}
                        />
                        {errors.lead_type_id && <div className="text-danger small mt-1">{errors.lead_type_id}</div>}
                      </div>

                      <div className="col-lg-4 mb-6">
                        <label className="form-label">Source</label>
                        <SelectDropdown
                          key={`source-${formKey}`}
                          options={sources}
                          selectedOption={selectedSource}
                          onSelectOption={handleSourceSelect}
                          placeholder="Select source"
                        />
                      </div>


                    </div>
                  </div>
                  <hr className="mt-0" />
                  <div className="card-body general-info">
                    <div className="mb-5 d-flex align-items-center justify-content-between">
                      <h5 className="fw-bold mb-0 me-4">
                        <span className="d-block mb-2">Lead Info :</span>
                        <span className="fs-12 fw-normal text-muted text-truncate-1-line">General information for your lead</span>
                      </h5>

                    </div>
                    <div className="row">
                      <div className="col-lg-4 mb-4">
                        <label className="form-label fw-semibold mb-2">Client Name <span className="text-danger">*</span></label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z" />
                            </svg>
                          </span>
                          <input
                            type="text"
                            className="form-control form-control-lg"
                            id="nameInput"
                            placeholder="Name"
                            name="client_name"
                            value={formData.client_name}
                            onChange={handleChange}
                            style={{ minHeight: '48px', fontSize: '16px' }}
                          />
                        </div>
                        {errors.client_name && <div className="text-danger small mt-1">{errors.client_name}</div>}
                      </div>
                      <div className="col-lg-4 mb-4">
                        <label className="form-label fw-semibold mb-2">Email</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z" />
                            </svg>
                          </span>
                          <input
                            type="email"
                            className="form-control form-control-lg"
                            id="emailInput"
                            placeholder="Email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            style={{ minHeight: '48px', fontSize: '16px' }}
                          />
                        </div>
                        {errors.email && <div className="text-danger small mt-1">{errors.email}</div>}
                      </div>

                      <div className="col-lg-4 mb-4">
                        <label className="form-label fw-semibold mb-2">Mobile Number</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z" />
                            </svg>
                          </span>
                          <input
                            type="text"
                            className="form-control form-control-lg"
                            id="phoneInput"
                            placeholder="Phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            style={{ minHeight: '48px', fontSize: '16px' }}
                          />
                        </div>
                        {errors.phone && <div className="text-danger small mt-1">{errors.phone}</div>}
                      </div>
                      <div className="col-lg-4 mb-4">
                        <label className="form-label fw-semibold mb-2">Direct Number</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z" />
                            </svg>
                          </span>
                          <input
                            type="text"
                            className="form-control form-control-lg"
                            id="primaryNumberInput"
                            placeholder="Direct Number"
                            name="primary_number"
                            value={formData.primary_number}
                            onChange={handleChange}
                            style={{ minHeight: '48px', fontSize: '16px' }}
                          />
                        </div>
                        {errors.primary_number && <div className="text-danger small mt-1">{errors.primary_number}</div>}
                      </div>
                      <div className="col-lg-4 mb-4">
                        <label className="form-label fw-semibold mb-2">HQ Number</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z" />
                            </svg>
                          </span>
                          <input
                            type="text"
                            className="form-control form-control-lg"
                            id="referenceNumberInput"
                            placeholder="HQ Number"
                            name="reference_number"
                            value={formData.reference_number}
                            onChange={handleChange}
                            style={{ minHeight: '48px', fontSize: '16px' }}
                          />
                        </div>
                        {errors.reference_number && <div className="text-danger small mt-1">{errors.reference_number}</div>}
                      </div>
                      <div className="col-lg-4 mb-4">
                        <label className="form-label fw-semibold mb-2">Company</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M14.763.075A.5.5 0 0 1 15 .5v15a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V14H6v1.5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V10a.5.5 0 0 1 .342-.474L6 7.64V4.5a.5.5 0 0 1 .276-.447l8-4a.5.5 0 0 0 .487-.675ZM6 8.694 1 10.36V15h3V9.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5V15h3V8.694ZM7 4.5V7.64l7 3.061V1.19L7 4.5Z" />
                            </svg>
                          </span>
                          <input
                            type="text"
                            className="form-control form-control-lg"
                            id="companyInput"
                            placeholder="Company"
                            name="company"
                            value={formData.company}
                            onChange={handleChange}
                            style={{ minHeight: '48px', fontSize: '16px' }}
                          />
                        </div>
                      </div>
                      <div className="col-lg-4 mb-4">
                        <label className="form-label fw-semibold mb-2">Designation</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M8.5 5.5a.5.5 0 0 0-1 0v3.362l-1.429 2.38a.5.5 0 1 0 .858.515l1.5-2.5A.5.5 0 0 0 8.5 9V5.5z" />
                              <path d="M6.5 0a.5.5 0 0 0 0 1H7v1.07a7.001 7.001 0 0 0-3.273 12.474l-.602.602a.5.5 0 0 0 .707.708l.746-.746A6.97 6.97 0 0 0 8 16a6.97 6.97 0 0 0 3.422-.892l.746.746a.5.5 0 0 0 .707-.708l-.601-.602A7.001 7.001 0 0 0 9 2.07V1h.5a.5.5 0 0 0 0-1h-3zm1.038 3.018a6.093 6.093 0 0 1 .924 0 6 6 0 1 1-.924 0zM0 3.5c0 .753.333 1.429.86 1.887A8.035 8.035 0 0 1 4.387 1.86 8.035 8.035 0 0 1 6.05.773a9.89 9.89 0 0 0-3.025.504 7.002 7.002 0 0 0-3.95 3.99 7.002 7.002 0 0 0-.095 2.023h-.679c.169-1.077.998-1.907 2.073-2.072A8.026 8.026 0 0 0 0 3.5zm2.5 0c0-.959.5-1.85 1.308-2.373A8.026 8.026 0 0 0 2.5 3.5z" />
                            </svg>
                          </span>
                          <input
                            type="text"
                            className="form-control form-control-lg"
                            id="designationInput"
                            placeholder="Designation"
                            name="designation"
                            value={formData.designation}
                            onChange={handleChange}
                            style={{ minHeight: '48px', fontSize: '16px' }}
                          />
                        </div>
                      </div>
                      <div className="col-lg-4 mb-4">
                        <label className="form-label fw-semibold mb-2">Website</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1-1.302 1.302 1.002 1.002 0 0 0-.154.199 2 2 0 0 1-1.302 1.302A1 1 0 0 0 6 12.73a.5.5 0 1 1-.5.5 3 3 0 0 1-3-3 3 3 0 0 1 3-3 .5.5 0 1 1 0 1zm7-4.673a3 3 0 0 0-2.829-2.83l-.794.79a2 2 0 0 1 1.302 1.302.5.5 0 1 0 .738-.674zm.976-2.829a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4h8zm0 1H4a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V4a3 3 0 0 0-3-3z" />
                            </svg>
                          </span>
                          <input
                            type="text"
                            className="form-control form-control-lg"
                            id="websiteInput"
                            placeholder="Website"
                            name="website"
                            value={formData.website}
                            onChange={handleChange}
                            style={{ minHeight: '48px', fontSize: '16px' }}
                          />
                        </div>
                      </div>

                      <div className="col-lg-4 mb-4">
                      <label className="form-label fw-semibold mb-2">LinkedIn</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
                          </svg>
                        </span>
                        <input
                          type="text"
                          className="form-control form-control-lg"
                          id="linkedinInput"
                          placeholder="LinkedIn Profile URL"
                          name="linkedin"
                          value={formData.linkedin}
                          onChange={handleChange}
                          style={{ minHeight: '48px', fontSize: '16px' }}
                        />
                      </div>
                    </div>

             <div className="col-lg-4 mb-4">
              <label className="form-label fw-semibold mb-2">Alt Number</label>
              <div className="input-group">
                <span className="input-group-text">
                  <svg
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M3.654 1.328a.678.678 0 0 1 .736-.157l2.522 1.009c.27.108.45.367.45.654v2.025c0 .308-.187.582-.465.687l-1.2.45a11.88 11.88 0 0 0 5.184 5.184l.45-1.2a.734.734 0 0 1 .687-.465h2.025c.287 0 .546.18.654.45l1.009 2.522a.678.678 0 0 1-.157.736l-1.494 1.494a1.745 1.745 0 0 1-1.82.403c-2.68-1.01-5.18-3.044-7.292-5.156C2.695 7.64.66 5.14-.35 2.46A1.745 1.745 0 0 1 .053.64L1.547-.854a.678.678 0 0 1 .736-.157z" />
                  </svg>
                </span>

                <input
                  type="text"
                  className="form-control form-control-lg"
                  id="vatInput"
                  placeholder="Alt Number"
                  name="vat"
                  value={formData.vat}
                  onChange={handleChange}
                  style={{ minHeight: '48px', fontSize: '16px' }}
                />
              </div>
            </div>


                     <div className="col-lg-4 mb-4">
                    <label className="form-label">Service</label>
                    <CustomServiceDropdown
                      selectedServices={formData.service}
                      onSelect={handleServiceSelect}
                      customService={customService}
                      setCustomService={setCustomService}
                      showCustomService={showCustomService}
                      setShowCustomService={setShowCustomService}
                    />
                    <small className="text-muted">
                      Select one or more services
                    </small>
                  </div>

                      <div className="col-lg-4 mb-4">
                        <label className="form-label fw-semibold mb-2">Country</label>
                        <SelectDropdown
                          key={`country-${formKey}`}
                          options={countries}
                          selectedOption={selectedCountry}
                          onSelectOption={handleCountrySelect}
                        />
                      </div>
                      <div className="col-lg-4 mb-4">
                        <label className="form-label fw-semibold mb-2">State</label>
                          <input
                          type="text"
                          name="state"
                          className="form-control"
                          placeholder="Enter State"
                          value={formData.state || ""}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-lg-4 mb-4">
                        <label className="form-label fw-semibold mb-2">City</label>
                          <input
                          type="text"
                          name="city"
                          className="form-control"
                          placeholder="Enter City"
                          value={formData.city || ""}
                          onChange={handleChange}
                        />
                      </div>
                      
                   

                      <div className="col-lg-4 mb-4">
                        <label className="form-label fw-semibold mb-2">Address</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
                            </svg>
                          </span>
                          <textarea
                            className="form-control form-control-lg"
                            id="addressInput"
                            placeholder="Address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            rows="1"
                            style={{ minHeight: '48px', fontSize: '16px', resize: 'vertical' }}
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  

                    <div className="row">
                      <div className="col-12">
                        <div className="d-flex justify-content-end gap-3 mt-4">
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => window.history.back()}
                            disabled={isSubmitting}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={async (e) => {
                              const result = await Swal.fire({
                                title: 'Create Lead?',
                                text: 'Are you sure you want to create this lead?',
                                icon: 'question',
                                showCancelButton: true,
                                confirmButtonColor: '#3085d6',
                                cancelButtonColor: '#d33',
                                confirmButtonText: 'Create Lead',
                                cancelButtonText: 'Cancel'
                              })
                              if (result.isConfirmed) {
                                handleFormSubmit(e, false)
                              }
                            }}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Creating Lead...
                              </>
                            ) : (
                              'Create Lead'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </>
          </div>
        </form>
      </div>

      {/* Status Selection Modal — ab shared component use ho raha hai */}
      {showStatusModal && (
        <StatusUpdateModal
          title="Select Lead Status"
          leadStatuses={leadStatuses}
          statusId={tempStatusData.status_id}
          setStatusId={(val) => setTempStatusData(prev => ({ ...prev, status_id: val }))}
          notes={tempStatusData.note}
          setNotes={(val) => setTempStatusData(prev => ({ ...prev, note: val }))}
          followupDate={tempStatusData.followup_date}
          setFollowupDate={(val) => setTempStatusData(prev => ({ ...prev, followup_date: val }))}
          onClose={() => setShowStatusModal(false)}
          onSubmit={handleStatusModalSubmit}
          submitLabel="Confirm Status"
        />
      )}
    </PermissionGuard>
  )
}

export default LeadCreatePage