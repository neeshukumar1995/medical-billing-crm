import { useState, useCallback } from 'react';

/**
 * Custom hook for managing user form state and validation
 * @param {Object} initialData - Initial form data
 * @returns {Object} Form state and handlers
 */
export const useUserForm = (initialData = {}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    role: '',
    department: '',
    status: '',
    joining_date: '',
    manager: '',
    employee_id: '',
    password: '',
    confirmPassword: '',
    ...initialData
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }, [errors]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.role) newErrors.role = 'Role is required';
    if (!formData.status) newErrors.status = 'Status is required';

    if (formData.password) {
      if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      role: '',
      department: '',
      status: '',
      joining_date: '',
      manager: '',
      employee_id: '',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
  }, []);

  return {
    formData,
    setFormData,
    errors,
    handleInputChange,
    validateForm,
    resetForm
  };
};