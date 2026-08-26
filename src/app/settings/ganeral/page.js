'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import UsersCreateHeader from '@/components/usersCreate/UsersCreateHeader'
import { FiCamera, FiEye, FiEyeOff } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import getIcon from '@/utils/getIcon'
import PermissionGuard from '@/components/shared/PermissionGuard';
import { getImageUrl } from '@/config/api';

const page = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [profileImage, setProfileImage] = useState('/images/avatar/1.png')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [error, setError] = useState('')

  // Form data state - updated to match API fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    manager: '',
    employee_id: '',
    address: '',
    password: '',
    confirmPassword: ''
  })

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle image change
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileImage(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Fetch profile data on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true)
        const response = await crmInstance.get('/profile')
        const userData = response.data.user // API returns { status, message, user }

        // Populate form with user data
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          department: userData.department || '',
          manager: userData.manager || '',
          employee_id: userData.employee_id || '',
          address: userData.address || '',
          password: '',
          confirmPassword: ''
        })

        // Set profile image if available
        if (userData.profile_image) {
          if (userData.profile_image.startsWith('data:image')) {
            // It's already a base64 data URL
            setProfileImage(userData.profile_image)
          } else {
            // Use centralized image URL function
            setProfileImage(getImageUrl(userData.profile_image))
          }
        } else {
          setProfileImage('/images/avatar/1.png')
        }

      } catch (err) {
        console.error('Failed to fetch profile:', err)
        setError('Failed to load profile data')
      } finally {
        setIsLoadingProfile(false)
      }
    }

    fetchProfile()
  }, [])

  // Handle form submission
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsLoading(true);
  setError('');

  if (formData.password && formData.password !== formData.confirmPassword) {
    setError('Passwords do not match');
    setIsLoading(false);
    return;
  }

  try {
    const updateData = new FormData();
    updateData.append('name', formData.name);
    updateData.append('email', formData.email);
    updateData.append('phone', formData.phone || '');
    updateData.append('department', formData.department || '');
    updateData.append('manager', formData.manager || '');
    updateData.append('employee_id', formData.employee_id || '');
    updateData.append('address', formData.address || '');

    if (formData.password) {
      updateData.append('password', formData.password);
    }

    if (selectedFile) {
      updateData.append('profile_image', selectedFile);
    }

    const response = await crmInstance.post('/profile?_method=PUT', updateData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.data?.status) {
      Swal.fire({
        title: 'Success!',
        text: response.data.message,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#007bff',
      });

      const updatedUser = response.data.user;
      // Remove permissions from localStorage
      const { permissions, ...userWithoutPermissions } = updatedUser;
      localStorage.setItem('user', JSON.stringify(userWithoutPermissions));

      // Dispatch custom event to update ProfileModal
      window.dispatchEvent(new Event('userUpdated'));

      setFormData((prev) => ({
        ...prev,
        ...updatedUser,
        password: '',
        confirmPassword: '',
      }));

      if (updatedUser.profile_image) {
        if (updatedUser.profile_image.startsWith('data:image')) {
          setProfileImage(updatedUser.profile_image)
        } else {
          setProfileImage(getImageUrl(updatedUser.profile_image))
        }
      }
    }
  } catch (err) {
    console.error('Failed to update profile:', err);
    setError(
      err.response?.data?.message ||
      err.response?.data?.error ||
      'Failed to update profile'
    );
  } finally {
    setIsLoading(false);
  }
};




  return (
     <PermissionGuard permission="view-settings" redirect={false}>
      <PageHeader>
        {/* <UsersCreateHeader /> */}
      </PageHeader >

      <div className='main-content'>
        <div className='row'>
          <div className="col-lg-12">


            {/* Form Section */}
            <div className="card">
              
              <div className="card-body">
                {error && <div className="alert alert-danger">{error}</div>}

                {isLoadingProfile ? (
                  <div className="text-center py-4">
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <span className="ms-2">Loading profile...</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                  {/* Profile Image Section */}
                  <div className="row align-items-center py-4">
                    {/* LEFT SIDE - Profile Image */}
                    <div className="col-md-4 d-flex justify-content-center">
                      <div
                        style={{
                          width: '180px',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            width: '180px',
                            height: '180px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '4px solid #f0f0f0',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            margin: '0 auto',
                          }}
                        >
                          <img
                            src={profileImage}
                            alt="Admin Profile"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        </div>

                        {/* Upload Button */}
                        <div className="mt-3">
                          <input
                            type="file"
                            id="profileImage"
                            accept="image/*"
                            className="d-none"
                            onChange={handleImageChange}
                          />
                          <label
                            htmlFor="profileImage"
                            className="btn btn-outline-primary btn-sm px-3"
                            style={{ borderRadius: '50px' }}
                          >
                            <FiCamera className="me-1" size={16} />
                            Change Photo
                          </label>
                        </div>


                      </div>
                    </div>

                    {/* RIGHT SIDE - Details */}
                    <div className="col-md-8">
                      <h2 className="fw-bold mb-1">Hello, I’m <span className="text-primary">{formData.name || 'User'}</span></h2>
                      <p className="text-muted mb-3" style={{ fontSize: '14px' }}>
                        Welcome to your profile dashboard. You can update your details anytime to keep your information accurate.
                      </p>

                      <div className="p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                        <ul className="list-unstyled mb-0">
                          <li className="mb-2">
                            <span className="fw-semibold">📞 Phone:</span> <span className="text-muted">{formData.phone || 'Not provided'}</span>
                          </li>
                          <li className="mb-2">
                            <span className="fw-semibold">📧 Email:</span> <span className="text-muted">{formData.email || 'Not provided'}</span>
                          </li>
                          <li className="mb-2">
                            <span className="fw-semibold">🏢 Department:</span> <span className="text-muted">{formData.department || 'Not provided'}</span>
                          </li>
                          <li className="mb-0">
                            <span className="fw-semibold">🆔 Employee ID:</span> <span className="text-muted">{formData.employee_id || 'Not provided'}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>


                  <div className="row">
                    <div className="col-md-6 mb-4">
                      <div className="row align-items-center">
                        <div className="col-lg-4">
                          <label className="fw-semibold">Full Name: <span className="text-danger">*</span></label>
                        </div>
                        <div className="col-lg-8">
                          <div className="input-group">
                            <div className="input-group-text">{getIcon('feather-user')}</div>
                            <input
                              type="text"
                              name="name"
                              className="form-control"
                              placeholder="Enter full name"
                              value={formData.name}
                              onChange={handleInputChange}
                              disabled={isLoading}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 mb-4">
                      <div className="row align-items-center">
                        <div className="col-lg-4">
                          <label className="fw-semibold">Email: <span className="text-danger">*</span></label>
                        </div>
                        <div className="col-lg-8">
                          <div className="input-group">
                            <div className="input-group-text">{getIcon('feather-mail')}</div>
                            <input
                              type="email"
                              name="email"
                              className="form-control"
                              placeholder="Enter email"
                              value={formData.email}
                              onChange={handleInputChange}
                              disabled={isLoading}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 mb-4">
                      <div className="row align-items-center">
                        <div className="col-lg-4">
                          <label className="fw-semibold">Phone: </label>
                        </div>
                        <div className="col-lg-8">
                          <div className="input-group">
                            <div className="input-group-text">{getIcon('feather-phone')}</div>
                            <input
                              type="text"
                              name="phone"
                              className="form-control"
                              placeholder="Enter phone number"
                              value={formData.phone}
                              onChange={handleInputChange}
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 mb-4">
                      <div className="row align-items-center">
                        <div className="col-lg-4">
                          <label className="fw-semibold">Department: </label>
                        </div>
                        <div className="col-lg-8">
                          <div className="input-group">
                            <div className="input-group-text">{getIcon('feather-briefcase')}</div>
                            <input
                              type="text"
                              name="department"
                              className="form-control"
                              placeholder="Enter department"
                              value={formData.department}
                              onChange={handleInputChange}
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 mb-4">
                      <div className="row align-items-center">
                        <div className="col-lg-4">
                          <label className="fw-semibold">Manager: </label>
                        </div>
                        <div className="col-lg-8">
                          <div className="input-group">
                            <div className="input-group-text">{getIcon('feather-user-check')}</div>
                            <input
                              type="text"
                              name="manager"
                              className="form-control"
                              placeholder="Enter manager name"
                              value={formData.manager}
                              onChange={handleInputChange}
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 mb-4">
                      <div className="row align-items-center">
                        <div className="col-lg-4">
                          <label className="fw-semibold">Employee ID: </label>
                        </div>
                        <div className="col-lg-8">
                          <div className="input-group">
                            <div className="input-group-text">{getIcon('feather-hash')}</div>
                            <input
                              type="text"
                              name="employee_id"
                              className="form-control"
                              placeholder="Enter employee ID"
                              value={formData.employee_id}
                              onChange={handleInputChange}
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-12 mb-4">
                      <div className="row align-items-center">
                        <div className="col-lg-2">
                          <label className="fw-semibold">Address: </label>
                        </div>
                        <div className="col-lg-10">
                          <div className="input-group">
                            <div className="input-group-text">{getIcon('feather-map-pin')}</div>
                            <input
                              type="text"
                              name="address"
                              className="form-control"
                              placeholder="Enter address"
                              value={formData.address}
                              onChange={handleInputChange}
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 mb-4">
                      <div className="row align-items-center">
                        <div className="col-lg-4">
                          <label className="fw-semibold">Password: </label>
                        </div>
                        <div className="col-lg-8">
                          <div className="input-group">
                            <div className="input-group-text">{getIcon('feather-lock')}</div>
                            <input
                              type={showPassword ? "text" : "password"}
                              name="password"
                              className="form-control"
                              placeholder="Enter new password (leave empty to keep current)"
                              value={formData.password}
                              onChange={handleInputChange}
                              disabled={isLoading}
                            />
                            <button
                              type="button"
                              className="btn input-group-text"
                              onClick={() => setShowPassword(!showPassword)}
                              disabled={isLoading}
                            >
                              {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 mb-4">
                      <div className="row align-items-center">
                        <div className="col-lg-4">
                          <label className="fw-semibold">Confirm Password: </label>
                        </div>
                        <div className="col-lg-8">
                          <div className="input-group">
                            <div className="input-group-text">{getIcon('feather-lock')}</div>
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              name="confirmPassword"
                              className="form-control"
                              placeholder="Confirm new password"
                              value={formData.confirmPassword}
                              onChange={handleInputChange}
                              disabled={isLoading}
                            />
                            <button
                              type="button"
                              className="btn input-group-text"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              disabled={isLoading}
                            >
                              {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Updating Profile...
                        </>
                      ) : (
                        'Update Profile'
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
     </PermissionGuard>
  )
}

export default page