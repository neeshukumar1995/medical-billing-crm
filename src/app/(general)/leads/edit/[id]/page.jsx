'use client'
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import PermissionGuard from '@/components/shared/PermissionGuard'
import SelectDropdown from '@/components/shared/SelectDropdown'
import { customerListTagsOptions } from '@/utils/options'
import useLocationData from '@/hooks/useLocationData'
import Loading from '@/components/shared/Loading'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { decryptId } from '@/utils/decryptId';
import { todayInputDate } from '@/utils/formatDate'



const showSwal = (options) => {
  return new Promise((resolve) => {
    // Ensure DOM is ready
    if (typeof window !== 'undefined' && document.readyState === 'complete') {
      Swal.fire(options).then(resolve)
    } else {
      // Wait for DOM to be ready
      const checkReady = () => {
        if (document.readyState === 'complete') {
          Swal.fire(options).then(resolve)
        } else {
          setTimeout(checkReady, 10)
        }
      }
      checkReady()
    }
  })
}

const CustomServiceDropdown = ({ selectedServices, onSelect, customService, setCustomService, showCustomService, setShowCustomService }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const serviceOptions = [
    "Hotels – International",
    "Hotels – Domestic",
    "Air Ticket – International",
    "Air Ticket – Domestic",
    "Packages",
    "Tourist",
    "Travels",
    "Visa",
    "Travel Insurance",
    "Other"
  ]

  const handleToggleService = (service) => {
    if (service === "Other") {
      setShowCustomService(!showCustomService)
      if (!showCustomService) {
        // Adding Other
        if (!selectedServices.includes("Other")) {
          onSelect([...selectedServices, "Other"])
        }
      } else {
        // Removing Other
        onSelect(selectedServices.filter(s => s !== "Other"))
        setCustomService('')
      }
    } else {
      if (selectedServices.includes(service)) {
        onSelect(selectedServices.filter(s => s !== service))
      } else {
        onSelect([...selectedServices, service])
      }
    }
  }

  const handleRemoveService = (service) => {
    if (service === "Other") {
      setShowCustomService(false)
      setCustomService('')
    }
    onSelect(selectedServices.filter(s => s !== service))
  }

  const handleCustomServiceChange = (e) => {
    setCustomService(e.target.value)
  }

  const handleAddCustomService = () => {
    if (customService.trim() && !selectedServices.includes(customService.trim())) {
      onSelect([...selectedServices, customService.trim()])
      setCustomService('')
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="dropdown" ref={dropdownRef}>
      <div
        className="form-control d-flex align-items-center justify-content-between"
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', minHeight: '48px' }}
      >
        <div className="d-flex flex-wrap gap-1">
          {selectedServices.length > 0 ? (
            selectedServices.map((service, index) => (
              <span key={index} className="badge bg-primary d-flex align-items-center gap-1">
                {service}
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  style={{ fontSize: '10px' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveService(service)
                  }}
                ></button>
              </span>
            ))
          ) : (
            <span className="text-muted">Select services</span>
          )}
        </div>
        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`}></i>
      </div>

      {isOpen && (
        <div className="dropdown-menu show w-100" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {serviceOptions.map((service, index) => (
            <div
              key={index}
              className="dropdown-item d-flex align-items-center"
              onClick={() => handleToggleService(service)}
              style={{ cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                className="form-check-input me-2"
                checked={selectedServices.includes(service)}
                onChange={() => {}} // Handled by onClick
              />
              <span>{service}</span>
            </div>
          ))}

          {showCustomService && (
            <div className="dropdown-item">
              <div className="d-flex gap-2 align-items-end">
                <div className="flex-grow-1">
                  <textarea
                    className="form-control form-control-sm"
                    placeholder="Enter custom service description"
                    value={customService}
                    onChange={handleCustomServiceChange}
                    rows="2"
                    style={{ resize: 'vertical', minHeight: '50px', width: '100%' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.shiftKey) {
                        e.preventDefault()
                        handleAddCustomService()
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleAddCustomService}
                  disabled={!customService.trim()}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const CustomUserDropdown = ({ users, selectedUser, loading, loadingMore, error, hasMore, onSelect, onLoadMore }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [localSelectedUser, setLocalSelectedUser] = useState(selectedUser)
  const dropdownRef = useRef(null)

  // Update local selected user when prop changes
  useEffect(() => {
    setLocalSelectedUser(selectedUser)
  }, [selectedUser])

  const filteredUsers = users.filter(user =>
    user.label && user.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollTop + clientHeight >= scrollHeight - 50 && hasMore && !loadingMore) {
      onLoadMore()
    }
  }

  const getAvatarColor = (initial) => {
    const colors = [
      'bg-primary', 'bg-success', 'bg-info', 'bg-warning', 'bg-danger',
      'bg-secondary', 'bg-dark', 'bg-primary-soft', 'bg-success-soft'
    ]
    if (!initial) return colors[0]
    return colors[initial.charCodeAt(0) % colors.length]
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading) {
    return <div className="form-control">Loading users...</div>
  }

  if (error) {
    return <div className="form-control text-danger">{error}</div>
  }

  return (
    <div className="dropdown" ref={dropdownRef}>
      <div
        className="form-control d-flex align-items-center justify-content-between"
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', minHeight: '48px' }}
      >
        <div className="d-flex align-items-center">
          {localSelectedUser ? (
            <>
              <div
                className={`avatar avatar-sm rounded-circle me-2 d-flex align-items-center justify-content-center ${getAvatarColor(localSelectedUser.avatar)}`}
                style={{ width: '32px', height: '32px' }}
              >
                <span className="text-white fw-bold" style={{ fontSize: '14px', lineHeight: '1' }}>
                  {localSelectedUser.avatar || 'U'}
                </span>
              </div>
              <span>{localSelectedUser.label}</span>
            </>
          ) : (
            <span className="text-muted">Select a user</span>
          )}
        </div>
        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`}></i>
      </div>

      {isOpen && (
        <div className="dropdown-menu show w-100" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <div className="px-3 py-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div onScroll={handleScroll} style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filteredUsers.map((user) => (
              <div
                key={user.value}
                className="dropdown-item d-flex align-items-center"
                onClick={() => {
                  onSelect(user)
                  setLocalSelectedUser(user)
                  setIsOpen(false)
                  setSearchTerm('')
                }}
                style={{ cursor: 'pointer' }}
              >
                <div
                  className={`avatar avatar-sm rounded-circle me-2 d-flex align-items-center justify-content-center ${getAvatarColor(user.avatar)}`}
                  style={{ width: '32px', height: '32px', flexShrink: 0 }}
                >
                  <span className="text-white fw-bold" style={{ fontSize: '14px', lineHeight: '1' }}>
                    {user.avatar || 'U'}
                  </span>
                </div>
                <span>{user.label}</span>
              </div>
            ))}

            {loadingMore && (
              <div className="dropdown-item text-center">
                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                Loading more users...
              </div>
            )}

            {!hasMore && users.length > 0 && (
              <div className="dropdown-item text-center text-muted">
                No more users to load
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const page = () => {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id
  const [formData, setFormData] = useState({
    client_name: '',
    username: '',
    company: '',
    designation: '',
    website: '',
    vat: '',
    address: '',
    description: '',
    country: null,
    state: null,
    city: null,
    lead_type_id: null,
    lead_status_id: null,
    email: '',
    phone: '',
    primary_number: '',
    reference_number: '',
    source: '',
    assigned_to: null,
    tags: [],
    groups: [],
    service: [],
    budget: '',
    date_of_travel: '',
    date_of_booking: '',
    user_assign_date: '',
    linkedin: '',
    company_linkedin_url: ''
  })
  const [customService, setCustomService] = useState('')
  const [showCustomService, setShowCustomService] = useState(false)
  const [document, setDocument] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingLead, setLoadingLead] = useState(true)
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
  const [leadData, setLeadData] = useState(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const { countries, states, cities, loading, error, fetchStates, fetchCities } = useLocationData()
  const leadsTags = customerListTagsOptions
  const [companyId, setCompanyId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('companyId')
    }
    return null
  })

  // Calculate selected user based on formData and users array
const selectedUser = useMemo(() => {
  if (!formData.assigned_to || users.length === 0) return null
  return users.find(user => String(user.value) === String(formData.assigned_to)) || null
}, [formData.assigned_to, users])

const selectedSource = useMemo(() =>
  formData.source ? sources.find(opt => opt.value === formData.source) : null,
  [formData.source, sources]
)

  useEffect(() => {
    const fetchLeadStatuses = async () => {
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
    }

    const fetchLeadTypes = async () => {
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
    }

    const fetchSources = async () => {
      try {
        const cid = companyId ? JSON.parse(companyId) : null
        if (!cid) return

        const response = await crmInstance.get(`/sources/${cid}`)
        const data = response.data.data.data || response.data.data || response.data || []
        const options = Array.isArray(data) ? data.map(item => ({
          value: item.name, // Use name as value since we want to save the name
          label: item.name
        })) : []
        setSources(options)
      } catch (error) {
        console.error('Error fetching sources:', error)
      }
    }

    if (companyId) {
      fetchLeadStatuses()
      fetchLeadTypes()
      fetchSources()
      fetchUsers(1, false)
    }
  }, [companyId])

  // Force re-render dropdowns when options are loaded
  useEffect(() => {
    if (leadStatuses.length > 0 || leadTypes.length > 0 || sources.length > 0 || users.length > 0 || countries.length > 0 || states.length > 0 || cities.length > 0) {
      setFormKey(prev => prev + 1)
    }
  }, [leadStatuses, leadTypes, sources, users, countries, states, cities])

  // Ensure CustomUserDropdown updates when users are loaded
  useEffect(() => {
    if (users.length > 0 && formData.assigned_to) {
      setFormKey(prev => prev + 1)
    }
  }, [users, formData.assigned_to])

  // Force re-render dropdowns when location data changes
  useEffect(() => {
    if (states.length > 0 || cities.length > 0) {
      setFormKey(prev => prev + 1)
    }
  }, [states, cities])

  // Check if user is superadmin
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user')
      if (user) {
        const parsedUser = JSON.parse(user)
        setIsSuperAdmin(parsedUser.role === "superadmin")
      }
    }
  }, [])

  // Set form data when lead data and countries are loaded
  useEffect(() => {
    if (leadData && countries.length > 0) {
      // Find country object if country data exists
      let countryValue = null
      let countryObj = null
      if (leadData.country) {
        countryObj = countries.find(c => c.value === String(leadData.country).toLowerCase().trim())
        if (countryObj) {
          countryValue = countryObj.value
          fetchStates(countryObj.label)
        }
      }

      // Pre-populate form with lead data
      const newFormData = {
        client_name: leadData.client_name || '',
        username: leadData.username || '',
        company: leadData.company || '',
        designation: leadData.designation || '',
        website: leadData.website || '',
        vat: leadData.vat || '',
        address: leadData.address || '',
        description: leadData.description || '',
        country: countryValue,
        // Transform state and city values to match dropdown format
        state: leadData.state ? String(leadData.state).toLowerCase().replace(/\s+/g, '-') : null,
        city: leadData.city ? String(leadData.city) : '',
        lead_type_id: leadData.lead_type_id ? String(leadData.lead_type_id) : null,
        lead_status_id: leadData.lead_status_id ? String(leadData.lead_status_id) : null,
        email: leadData.email || '',
        phone: leadData.phone || '',
        primary_number: leadData.primary_number || '',
        reference_number: leadData.reference_number || '',
        source: leadData.source || '',
        assigned_to: leadData.assigned_to ? (typeof leadData.assigned_to === 'object' ? String(leadData.assigned_to.id) : String(leadData.assigned_to)) : null,
        tags: Array.isArray(leadData.tags) ? leadData.tags.map(tag => String(tag)) : [],
        groups: Array.isArray(leadData.groups) ? leadData.groups.map(group => String(group)) : [],
        service: Array.isArray(leadData.service)
          ? leadData.service
          : (leadData.service ? leadData.service.split(',').map(s => s.trim()) : []),
        budget: leadData.budget || '',
        date_of_travel: leadData.date_of_travel || '',
        date_of_booking: leadData.date_of_booking || '',
        user_assign_date: leadData.user_assign_date || '',
        status_notes: leadData.status_notes || '',
        followup_date: leadData.followup_date || '',
        selling_price: '',
        linkedin: leadData.linkedin || '',
        company_linkedin_url: leadData.company_linkedin_url || ''
      }

      setFormData(newFormData)


      // Force re-render of dropdowns after data is loaded
      setFormKey(prev => prev + 1)
    }
  }, [leadData, countries])

  useEffect(() => {
    const fetchLead = async () => {
      if (!leadId) {
        console.error('No lead ID provided')
        return
      }

      try {
        const cid = companyId ? JSON.parse(companyId) : null
        if (!cid) return

        const decryptedId = decryptId(leadId)
        if (!decryptedId) {
          console.error('Invalid lead ID')
          return
        }

        setLoadingLead(true)
        const response = await crmInstance.get(`/leads/${cid}/${decryptedId}/edit`)

        if (response.status === 404) {
          showSwal({
            title: 'Lead Not Found!',
            text: 'The lead you are trying to edit does not exist.',
            icon: 'error',
            confirmButtonText: 'Go Back'
          }).then(() => {
            router.push('/leads/list')
          })
          return
        }

        const fetchedLeadData = response.data.data || response.data

        if (!fetchedLeadData) {
          throw new Error('No lead data received')
        }

        console.log('Fetched lead data:', fetchedLeadData) // Check if status_notes is included

        // Lead data loaded successfully
        setLeadData(fetchedLeadData)
      } catch (error) {
        console.error('Error fetching lead:', error)
        showSwal({
          title: 'Error!',
          text: 'Failed to load lead data. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK'
        }).then(() => {
          router.push('/leads/list')
        })
      } finally {
        setLoadingLead(false)
      }
    }

    if (companyId) {
      fetchLead()
    }
  }, [leadId, router, companyId])

  const fetchUsers = async (page = 1, append = false) => {
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
          label: user.name || 'Unknown User',
          avatar: user.name ? user.name.charAt(0).toUpperCase() : 'U'
        }))
        : []

      // Users loaded successfully

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
  }

  const loadMoreUsers = () => {
    if (!usersLoadingMore && usersHasMore) {
      const nextPage = usersPage + 1
      setUsersPage(nextPage)
      fetchUsers(nextPage, true)
    }
  }


  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelect = (field, option) => {
    let value = option ? option.value : null

    // Handle cascading dropdowns
    if (field === 'country') {

      setFormData(prev => ({
        ...prev,
        [field]: value,
        state: null,
        city: null
      }))

      if (option) {

        fetchStates(option.label)
      }
    } else if (field === 'state') {

      setFormData(prev => ({
        ...prev,
        [field]: value,
        city: null
      }))

      if (option) {

        fetchCities(option.label)
      }
    } else if (field === 'assigned_to') {
      // Set user_assign_date when user is assigned
      const currentDate = value ? todayInputDate() : '';
      setFormData(prev => ({
        ...prev,
        [field]: value,
        user_assign_date: currentDate
      }));
    } else {

      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleSourceSelect = (option) => {
    handleSelect('source', option)
  }

  const handleMultiSelect = (field, selected) => {
    setFormData(prev => ({ ...prev, [field]: selected ? selected.map(s => s.value) : [] }))
  }

  const handleFileChange = (e) => {
    setDocument(e.target.files[0])
  }

  const clearFile = () => {
    setDocument(null)
   
    const fileInput = document.getElementById('documentInput')
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const data = new FormData()

    data.append('_method', 'PUT') 
      Object.keys(formData).forEach(key => {
        if (key === 'service') {
          if (Array.isArray(formData[key]) && formData[key].length > 0) {
            data.append(key, formData[key].join(','))
          }
        } else if (key === 'state') {
          if (formData[key]) {
            let originalValue = formData[key]
            if (states.length > 0) {
              const stateOption = states.find(s => s.value === formData[key])
              if (stateOption) originalValue = stateOption.label
            }
            data.append(key, originalValue)
          }
        } else if (key === 'city') {
          if (formData[key]) {
            data.append(key, formData[key])
          }
        } else if (key === 'status_notes') {
          // Only send status_notes if lead_status_id is set
          if (formData.lead_status_id && formData[key]) {
            data.append(key, formData[key])
          }
        } else if (key === 'followup_date') {
          // Send followup_date when lead status contains "follow up"
          if (formData.lead_status_id && leadStatuses.find(opt => opt.value === formData.lead_status_id)?.label?.includes('Follow Up') && formData[key]) {
            data.append(key, formData[key])
          }
        } else if (key === 'lead_type_id') {
          // Only send lead_type_id if it's a valid number and exists in options
          if (formData[key] && leadTypes.some(type => type.value === formData[key])) {
            data.append(key, formData[key])
          }
        } else if (key === 'lead_status_id') {
          // Only send lead_status_id if it's a valid number and exists in options
          if (formData[key] && leadStatuses.some(status => status.value === formData[key])) {
            data.append(key, formData[key])
          }
        } else if (Array.isArray(formData[key])) {
          if (formData[key].length > 0) {
            formData[key].forEach(val => data.append(`${key}[]`, val))
          }
        } else if (formData[key] !== null && formData[key] !== '') {
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

      const decryptedId = decryptId(leadId)
      if (!decryptedId) {
        console.error('Invalid lead ID')
        return
      }

      const response = await crmInstance.post(`/leads/${cid}/${decryptedId}`, data)

      
   if (response.data && (response.data.status === true || response.status === 200)) {
  showSwal({
    title: 'Success!',
    text: response.data?.message || 'Lead updated successfully!',
    icon: 'success',
    confirmButtonText: 'OK',
    confirmButtonColor: '#007bff'
  })

  // Optional: latest data dobara fetch kar lo taaki form sync rahe
  const cid = companyId ? JSON.parse(companyId) : null
  const decryptedId = decryptId(leadId)
  if (cid && decryptedId) {
    const refreshed = await crmInstance.get(`/leads/${cid}/${decryptedId}/edit`)
    const fetchedLeadData = refreshed.data.data || refreshed.data
    if (fetchedLeadData) setLeadData(fetchedLeadData)
  }
}
    } catch (error) {
      console.error('Lead update failed:', error)

      
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

        showSwal({
          title: 'Validation Error!',
          text: errorMessage,
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#ffc107'
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PermissionGuard permission="edit-leads" redirect={true}>
      <PageHeader>
      </PageHeader>

      <div className='main-content'>
        {loadingLead ? (
          <Loading />
        ) : (
          <form onSubmit={handleSubmit}>
            <div className='row'>
              <>
                {loading && <Loading />}
                <div className="col-lg-12">
                  <div className="card stretch stretch-full">
                    <div className="card-body lead-status">
                      <div className="mb-5 d-flex align-items-center justify-content-between">
                        <h5 className="fw-bold mb-0 me-4">
                          <span className="d-block mb-2">Edit Lead Status :</span>
                          <span className="fs-12 fw-normal text-muted text-truncate-1-line">Update the status and details of this lead</span>
                        </h5>

                      </div>
                      <div className="row">
                        <div className="col-lg-4 mb-6">
                          <label className="form-label">Lead Status</label>
                          <SelectDropdown
                            key={`lead-status-${formKey}`}
                            options={leadStatuses}
                            selectedOption={formData.lead_status_id ? leadStatuses.find(opt => opt.value === formData.lead_status_id) : null}
                            onSelectOption={(option) => handleSelect('lead_status_id', option)}
                          />
                        </div>

                        {formData.lead_status_id && (
                          <div className="col-lg-4 mb-6">
                            <label className="form-label">Notes</label>
                            <textarea
                              className="form-control"
                              rows="2"
                              placeholder="Add notes about this status update..."
                              value={formData.status_notes || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, status_notes: e.target.value }))}
                              name="status_notes"
                            />
                          </div>
                        )}

                        {/* Display existing user notes */}
                 

                        {formData.lead_status_id && leadStatuses.find(status => status.value === formData.lead_status_id)?.label?.includes('Follow Up') && (
                          <div className="col-lg-4 mb-6">
                            <label className="form-label">Follow-up Date</label>
                            <input
                              type="date"
                              className="form-control"
                              value={formData.followup_date || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, followup_date: e.target.value }))}
                              min={todayInputDate()}
                            />
                          </div>
                        )}
 

                        <div className="col-lg-4 mb-6">
                          <label className="form-label">Select Provider Types:</label>
                          <SelectDropdown
                            key={`lead-type-${formKey}`}
                            options={leadTypes}
                            selectedOption={formData.lead_type_id ? leadTypes.find(opt => opt.value === formData.lead_type_id) : null}
                            onSelectOption={(option) => handleSelect('lead_type_id', option)}
                          />
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
                          <span className="d-block mb-2">Edit Lead Info :</span>
                          <span className="fs-12 fw-normal text-muted text-truncate-1-line">Update general information for this lead</span>
                        </h5>
                       
                      </div>
                      <div className="row">
                        <div className="col-lg-4 mb-4">
                          <label className="form-label fw-semibold mb-2">Client Name</label>
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
                              placeholder="Primary Number"
                              name="primary_number"
                              value={formData.primary_number}
                              onChange={handleChange}
                              style={{ minHeight: '48px', fontSize: '16px' }}
                            />
                          </div>
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
                              placeholder="Reference Number"
                              name="reference_number"
                              value={formData.reference_number}
                              onChange={handleChange}
                              style={{ minHeight: '48px', fontSize: '16px' }}
                            />
                          </div>
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
                        <div className="col-lg-6 mb-4">
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
                        <div className="col-lg-6 mb-4">
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
                        <label className="form-label fw-semibold mb-2">Comapny LinkedIn</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
                            </svg>
                          </span>
                          <input
                            type="text"
                            className="form-control form-control-lg"
                            id="comapnylinkedinInput"
                            placeholder="Comapny LinkedIn Profile URL"
                            name="company_linkedin_url"
                            value={formData.company_linkedin_url}
                            onChange={handleChange}
                            style={{ minHeight: '48px', fontSize: '16px' }}
                          />
                        </div>
                      </div>


                        <div className="col-lg-4 mb-4">
                          <label className="form-label fw-semibold mb-2">Alt Number</label>
                          <div className="input-group">
                            <span className="input-group-text">
                               <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z" />
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
                            onSelect={(services) => setFormData(prev => ({ ...prev, service: services }))}
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
                            selectedOption={formData.country ? countries.find(opt => opt.value === formData.country) : null}
                            onSelectOption={(option) => handleSelect('country', option)}
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
                            placeholder="Enter city"
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
                              type="submit"
                              className="btn btn-primary"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                  Updating Lead...
                                </>
                              ) : (
                                'Update Lead'
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
        )}
      </div>
    </PermissionGuard>
  )
}

export default page