import { useState, useCallback } from 'react'

const initialFormData = {
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
  followup_date: '',
  linkedin: ''
}

export const useLeadForm = (leadStatuses = []) => {
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState({})

  const updateFormData = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }, [errors])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    updateFormData(name, value)
  }, [updateFormData])

  const handleSelect = useCallback((field, option) => {
    let value = (option && option.value !== undefined && option.value !== "")
      ? option.value
      : null

    if (field === 'country') {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        state: null,
        city: null
      }))
    } else if (field === 'state') {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        city: null
      }))
    } else if (field === 'assigned_to') {
      // Set user_assign_date when user is assigned
      const currentDate = value ? new Date().toISOString().split('T')[0] : ''
      setFormData(prev => ({
        ...prev,
        [field]: value,
        user_assign_date: currentDate
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }, [])

  const validateForm = useCallback(() => {
    const newErrors = {}

    // Only require client name, make everything else optional
    if (!formData.client_name.trim()) {
      newErrors.client_name = 'Client name is required'
    }

    // Optional email validation (only if provided)
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    // Conditional validation for follow-up date (only if status is set to follow up scheduled)
    if (formData.lead_status_id && leadStatuses.find(opt => opt.value === formData.lead_status_id)?.label?.toLowerCase() === "follow up scheduled" && !formData.followup_date) {
      newErrors.followup_date = 'Follow-up date is required when status is "Follow Up Scheduled"'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, leadStatuses])

  const resetForm = useCallback(() => {
    setFormData(initialFormData)
    setErrors({})
  }, [])

  const setFormErrors = useCallback((fieldErrors) => {
    setErrors(fieldErrors)
  }, [])

  return {
    formData,
    errors,
    handleChange,
    handleSelect,
    updateFormData,
    validateForm,
    resetForm,
    setFormErrors
  }
}