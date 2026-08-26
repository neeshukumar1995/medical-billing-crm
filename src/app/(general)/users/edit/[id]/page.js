'use client';

import React, { useState, useEffect, useCallback, useMemo, use } from 'react';
import { FiUser } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import axios from 'axios';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Spinner from '@/components/shared/Spinner';
import crmInstance from '@/utils/crmInstance';
import { API_BASE_URL } from '@/config/api';
import { useUserForm } from '@/hooks/useUserForm';
import ImageUploadSection from '@/components/users/ImageUploadSection';
import UserFormFields from '@/components/users/UserFormFields';
import styles from '@/components/users/UserEditForm.module.css';
import PermissionGuard from '@/components/shared/PermissionGuard';
import { decryptId } from '@/utils/decryptId'
import { useUser } from '@/context/UserContext'

/**
 * User Edit Page Component
 * Handles editing user information with image upload and form validation
 * @param {Object} props - Component props
 * @param {Object} props.params - Route parameters containing user ID
 */
const UserEditPage = ({ params }) => {
  const router = useRouter();
  const resolvedParams = use(params);
  const actualId = useMemo(() => decryptId(resolvedParams.id), [resolvedParams.id])
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [companyId, setCompanyId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('companyId')
    }
    return null
  });
  const { role: userRole } = useUser();

  // Owner/superadmin can grant this user access to more than one company's data.
  const [companies, setCompanies] = useState([]);
  const [selectedCompanies, setSelectedCompanies] = useState([]);

  const { formData, setFormData, errors, handleInputChange, validateForm } = useUserForm();

  // Constants
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB (matches backend limit)
  const DEFAULT_ROLES = [
    { id: 'admin', name: 'Admin' },
    { id: 'user', name: 'User' },
    { id: 'manager', name: 'Manager' }
  ];

  /**
   * Handles image file selection and validation
   */
  const handleImageChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type (match backend allowed types)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPG, PNG, GIF)');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    setSelectedFile(file);
    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.onerror = () => setError('Failed to read the selected file');
    reader.readAsDataURL(file);
  }, [MAX_FILE_SIZE]);

  /**
   * Fetches user data from API
   */
  const fetchUser = useCallback(async () => {
    if (!actualId) {
      setError('Invalid User ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const cid = companyId ? JSON.parse(companyId) : null;
      if (!cid) {
        setError('Company ID not found. Please refresh the page and try again.')
        setLoading(false)
        return
      }

      const response = await crmInstance.get(`/users/${cid}/${actualId}`);
      const userData = response.data;

      if (!userData) {
        throw new Error('User data not found');
      }

      setUser(userData);
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        address: userData.address || '',
        role: userData.role_id || '',
        department: userData.department || '',
        status: userData.status || 'Active',
        joining_date: userData.joining_date || '',
        manager: userData.manager || '',
        employee_id: userData.employee_id || '',
        password: '',
        confirmPassword: '',
        company_id: companyId ? JSON.parse(companyId) : userData.company_id || ''
      });

      // Prefill companies already assigned to this user (beyond the active one)
      const activeCompanyId = companyId ? JSON.parse(companyId) : userData.company_id;
      const assignedCompanies = Array.isArray(userData.companies) ? userData.companies : [];
      setSelectedCompanies(
        assignedCompanies
          .filter(c => Number(c.id) !== Number(activeCompanyId))
          .map(c => ({ value: c.id, label: c.name }))
      );

      setError('');
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setError(err.response?.data?.message || 'Failed to load user data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [actualId, setFormData, companyId]);

  /**
   * Fetches available roles from API
   */
  const fetchRoles = useCallback(async () => {
    try {
      setLoadingRoles(true);
      const cid = companyId ? JSON.parse(companyId) : null;
      if (!cid) {
        setRoles(DEFAULT_ROLES);
        setLoadingRoles(false);
        return;
      }
      const response = await crmInstance.get(`/roles/${cid}`);
      const rolesData = response.data?.data || response.data || [];
      setRoles(Array.isArray(rolesData) ? rolesData : DEFAULT_ROLES);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      setRoles(DEFAULT_ROLES);
      // Don't show error for roles fetch failure as we have fallbacks
    } finally {
      setLoadingRoles(false);
    }
  }, [companyId]);

  /**
   * Handles form submission
   */


  


  const handleSubmitold = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Validate form
    if (!validateForm()) {
      setSaving(false);
      return;
    }

    // Additional validation for role
    if (!formData.role) {
      setError('Please select a role');
      setSaving(false);
      return;
    }

    try {
      // Get company ID from localStorage for the API endpoint
      const currentCompanyId = localStorage.getItem('companyId')
      const parsedCompanyId = currentCompanyId ? JSON.parse(currentCompanyId) : null

      if (!parsedCompanyId) {
        setError('Company ID not found. Please refresh the page and try again.')
        setSaving(false)
        return
      }

      let response;

      if (selectedFile) {
        // Handle file upload
        const formDataToSend = new FormData();

        // Add form fields
        Object.keys(formData).forEach(key => {
          if (formData[key] && key !== 'confirmPassword') {
            if (key === 'role') {
              formDataToSend.append('role_id', formData[key]);
            } else {
              formDataToSend.append(key, formData[key]);
            }
          }
        });

        // User ID is now in the route parameter, no need to send in form data

        // Add file
        formDataToSend.append('profile_image', selectedFile);

        // Debug: Log FormData entries
        console.log('Edit FormData entries:');
        for (let [key, value] of formDataToSend.entries()) {
          console.log(key, value instanceof File ? `File: ${value.name}` : value);
        }

        response = await crmInstance.put(`/users/${parsedCompanyId}/${actualId}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000 // 30 second timeout
        });
      } else {
        // Handle regular update
        const updateData = { ...formData };
        delete updateData.confirmPassword;
        if (!updateData.password) delete updateData.password;

        // Convert role to role_id for API
        if (updateData.role) {
          updateData.role_id = updateData.role;
          delete updateData.role;
        }

        // User ID is now in the route parameter, no need to send in request data

        // Debug: Log update data
        console.log('Edit update data:', updateData);

        response = await crmInstance.put(`/users/${parsedCompanyId}/${actualId}`, updateData, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        });
      }

      // Success handling
      await Swal.fire({
        title: 'Success!',
        text: 'User updated successfully!',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#007bff'
      });


      router.push('/users/list');
    } catch (err) {
      console.error('Update failed:', err);
      const errorMessage = err.response?.data?.message ||
                          err.message ||
                          'Failed to update user. Please try again.';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [formData, selectedFile, actualId, validateForm, router]);


  const handleSubmit = useCallback(async (e) => {
  e.preventDefault();
  setSaving(true);
  setError('');

  // Validate form
  if (!validateForm()) {
    setSaving(false);
    return;
  }

  if (!formData.role) {
    setError('Please select a role');
    setSaving(false);
    return;
  }

  try {
    const currentCompanyId = localStorage.getItem('companyId');
    const parsedCompanyId = currentCompanyId ? JSON.parse(currentCompanyId) : null;

    if (!parsedCompanyId) {
      setError('Company ID not found. Please refresh and try again.');
      setSaving(false);
      return;
    }

    let response;

    // ✅ Use FormData in ALL cases (simplifies backend handling)
    const formDataToSend = new FormData();

    Object.keys(formData).forEach((key) => {
      if (key === 'confirmPassword') return;

      let value = formData[key] ?? '';
      if (key === 'role') key = 'role_id'; // rename field for API
      formDataToSend.append(key, value);
    });

    // Add file if selected
    if (selectedFile) {
      formDataToSend.append('profile_image', selectedFile);
    }

    // Assigned companies = the active company, plus any extra companies
    // picked in the multi-select above (superadmin only).
    const assignedCompanyIds = new Set([Number(formData.company_id)]);
    selectedCompanies.forEach(c => assignedCompanyIds.add(Number(c.value)));
    assignedCompanyIds.forEach(id => formDataToSend.append('company_ids[]', id));

    // For Laravel, if you're sending PUT via FormData, you MUST spoof method
    formDataToSend.append('_method', 'PUT');

    console.log('Edit FormData entries:');
    for (let [key, value] of formDataToSend.entries()) {
      console.log(key, value instanceof File ? `File: ${value.name}` : value);
    }

    // ✅ Use crmInstance.post with _method for PUT
    response = await crmInstance.post(
      `/users/${parsedCompanyId}/${actualId}`,
      formDataToSend,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      }
    );

    await Swal.fire({
      title: 'Success!',
      text: 'User updated successfully!',
      icon: 'success',
      confirmButtonText: 'OK',
      confirmButtonColor: '#007bff'
    });

    router.push('/users/list');
  } catch (err) {
    console.error('Update failed:', err);
    const errorMessage =
      err.response?.data?.message || err.message || 'Failed to update user.';
    setError(errorMessage);
  } finally {
    setSaving(false);
  }
}, [formData, selectedFile, selectedCompanies, resolvedParams.id, validateForm, router]);

  /**
   * Fetches the full companies list (superadmin only) so they can assign extras
   */
  const fetchCompanies = useCallback(async () => {
    if (userRole !== 'superadmin') return;
    try {
      const { data } = await crmInstance.get('/companies');
      const list = Array.isArray(data) ? data : (data?.data || []);
      setCompanies(list);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    }
  }, [userRole]);

  // Effects
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Loading state
  const isLoading = loading || loadingRoles;

  return (
    <PermissionGuard permission="edit-users" redirect={false}>
      <PageHeader>
        <button
          onClick={() => router.back()}
          className="btn btn-outline-primary"
        >
          <i className="me-2">⬅️</i>
          Back
        </button>
      </PageHeader>
      <div className="main-content">
        <div className="row">
          <div className="col-lg-12">
            <div className="card border-top-0">
              <div className="card-header d-flex align-items-center">
                <span className="wd-40 ht-40 rounded-circle bg-light-brand text-brand d-flex align-items-center justify-content-center me-3">
                  <FiUser size={18} />
                </span>
                <div>
                  <h5 className="card-title mb-0">Edit User</h5>
                  <span className="fs-12 text-muted">{user?.name ? `Updating ${user.name}'s profile and access` : 'Update this user\'s profile and access'}</span>
                </div>
              </div>
              <div className="card-body">
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                {isLoading ? (
                  <div className={styles.loadingSpinner}>
                    <Spinner label="Loading user data..." />
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <ImageUploadSection
                      imagePreview={imagePreview}
                      user={user}
                      onImageChange={handleImageChange}
                      disabled={saving}
                    />

                    <UserFormFields
                      formData={formData}
                      errors={errors}
                      onInputChange={handleInputChange}
                      roles={roles}
                      loadingRoles={loadingRoles}
                      disabled={saving}
                      showCompanyAssignment={userRole === 'superadmin'}
                      companyOptions={companies
                        .filter(c => Number(c.id) !== Number(formData.company_id))
                        .map(c => ({ value: c.id, label: c.name }))}
                      selectedCompanies={selectedCompanies}
                      onCompaniesChange={setSelectedCompanies}
                    />

                    <hr className="my-4" />
                    <div className="d-flex justify-content-end gap-3">
                      <button
                        type="button"
                        className="btn btn-light-brand"
                        onClick={() => router.back()}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Updating User...
                          </>
                        ) : (
                          'Update User'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
   </PermissionGuard>
    
  );
};

export default UserEditPage;