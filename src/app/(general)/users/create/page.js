'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import UsersCreateHeader from '@/components/usersCreate/UsersCreateHeader'
import useImageUpload from '@/hooks/useImageUpload'
import { FiCamera, FiUpload, FiEye, FiEyeOff, FiUser, FiMail, FiPhone, FiMapPin, FiShield, FiBriefcase, FiCheckCircle, FiCalendar, FiUserCheck, FiHash, FiLock } from 'react-icons/fi'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Select from 'react-select'
import { useUser } from '@/context/UserContext'
import { sameClientCompanyOptions } from '@/utils/companyOptions'

const page = () => {
  const { handleImageUpload, uploadedImage } = useImageUpload()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [roles, setRoles] = useState([])
  const [loadingRoles, setLoadingRoles] = useState(true)
  const router = useRouter()
  const [companyId, setCompanyId] = useState(() => localStorage.getItem('companyId'))
  const { isPlatform, access } = useUser()
  // Platform and client-level admins can give a user access to more companies.
  const canAssignCompanies = isPlatform || access?.scope === 'client'

  // Owner/superadmin can grant a user access to more than one company's data.
  // The company the form is being submitted from (companyId above) is always
  // included; this lets them attach additional companies on top of that.
  const [companies, setCompanies] = useState([])
  const [selectedCompanies, setSelectedCompanies] = useState([])

  useEffect(() => {
    if (!canAssignCompanies) return
    const fetchCompanies = async () => {
      try {
        const { data } = await crmInstance.get('/companies')
        const list = Array.isArray(data) ? data : (data?.data || [])
        setCompanies(list)
      } catch (err) {
        console.error('Failed to fetch companies:', err)
      }
    }
    fetchCompanies()
  }, [canAssignCompanies])

  // Custom file handler
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      // Also call the existing handler for preview
      handleImageUpload(e)
    }
  }

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    role: '',
    department: '',
    status: 'Active', // Default to Active
    joining_date: '',
    manager: '',
    employee_id: '',
    password: '',
    confirmPassword: '',
    company_id: companyId || ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch roles on component mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoadingRoles(true)
        const currentCompanyId = localStorage.getItem('companyId')
        const parsedCompanyId = currentCompanyId ? JSON.parse(currentCompanyId) : null
        const response = await crmInstance.get(`/roles/${parsedCompanyId}`)
        const rolesData = response.data.data || response.data || []
        setRoles(rolesData)
      } catch (err) {
        console.error('Failed to fetch roles:', err)
        // Fallback to default roles if API fails
        setRoles([
          { id: 'admin', name: 'Admin' },
          { id: 'user', name: 'User' },
          { id: 'manager', name: 'Manager' }
        ])
      } finally {
        setLoadingRoles(false)
      }
    }

    fetchRoles()
  }, [])

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle form submission
 const handleSubmit = async (e) => {
  e.preventDefault()
  setIsLoading(true)
  setError('')

  // ✅ Password match validation
  if (formData.password !== formData.confirmPassword) {
    setError('Passwords do not match')
    setIsLoading(false)
    return
  }

  // ✅ Role validation
  if (!formData.role) {
    setError('Please select a role')
    setIsLoading(false)
    return
  }

  try {
    const formDataToSend = new FormData()

    // ✅ Append form fields
    formDataToSend.append('name', formData.name)
    formDataToSend.append('email', formData.email)
    formDataToSend.append('phone', formData.phone || '')
    formDataToSend.append('address', formData.address || '')
    formDataToSend.append('role_id', formData.role)
    formDataToSend.append('department', formData.department || '')
    formDataToSend.append('status', formData.status)
    formDataToSend.append('joining_date', formData.joining_date || '')
    formDataToSend.append('manager', formData.manager || '')
    formDataToSend.append('employee_id', formData.employee_id || '')
    formDataToSend.append('password', formData.password)
    formDataToSend.append('company_id', Number(formData.company_id));

    // Assigned companies = the active company this form was opened from,
    // plus any extra companies picked below (superadmin only).
    const assignedCompanyIds = new Set([Number(formData.company_id)])
    selectedCompanies.forEach(c => assignedCompanyIds.add(Number(c.value)))
    assignedCompanyIds.forEach(id => formDataToSend.append('company_ids[]', id))


    // ✅ Profile image append
    if (selectedFile) {
      formDataToSend.append('profile_image', selectedFile)
    }

    // Debug: Log FormData entries
    //console.log('FormData entries:');
    for (let [key, value] of formDataToSend.entries()) {
      console.log(key, value instanceof File ? `File: ${value.name}` : value);
    }

    // Get company ID from localStorage for the API endpoint
    const currentCompanyId = localStorage.getItem('companyId')
    const parsedCompanyId = currentCompanyId ? JSON.parse(currentCompanyId) : null

    const response = await crmInstance.post(`/users/${parsedCompanyId}`, formDataToSend, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    // ✅ Backend se sirf status/message check karenge, token nahi
    if (response.data?.status) {
      Swal.fire({
        title: 'Success!',
        text: response.data?.message || 'User created successfully!',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#007bff'
      }).then(() => {
        router.push('/users/list')
      })
    }
  } catch (err) {
    console.error('User creation failed:', err)
    setError(err.response?.data?.message || 'Failed to create user')
  } finally {
    setIsLoading(false)
  }
}


  return (
    <PermissionGuard permission="create-users" redirect={false}>
      <PageHeader>
        {/* <UsersCreateHeader /> */}
      </PageHeader>
      <div className='main-content'>
        <div className='row'>
          <div className="col-lg-12">

            {/* Form Section */}
            <div className="card border-top-0">
              <div className="card-header d-flex align-items-center">
                <span className="wd-40 ht-40 rounded-circle bg-light-brand text-brand d-flex align-items-center justify-content-center me-3">
                  <FiUser size={18} />
                </span>
                <div>
                  <h5 className="card-title mb-0">Create New User</h5>
                  <span className="fs-12 text-muted">Add a teammate and set up their access</span>
                </div>
              </div>
              <div className="card-body personal-info">
                  {error && <div className="alert alert-danger">{error}</div>}

                  {loadingRoles && (
                      <div className="d-flex justify-content-center align-items-center py-5">
                          <Spinner classNames={{label: "text-foreground mt-4"}} label="spinner" variant="spinner" />
                      </div>
                  )}

                  <form onSubmit={handleSubmit}>
                  {/* Avatar upload */}
                  <div className="mb-4 d-flex align-items-center gap-4 your-brand">
                    <label htmlFor="profileImage" className="wd-100 ht-100 position-relative overflow-hidden border border-gray-2 rounded-circle flex-shrink-0">
                      <img
                        src={uploadedImage || "https://cdn-icons-png.flaticon.com/512/847/847969.png"}
                        className="upload-pic img-fluid rounded-circle h-100 w-100"
                        style={{ objectFit: 'cover' }}
                        alt="Profile preview"
                      />
                      <div className="position-absolute start-50 top-50 end-0 bottom-0 translate-middle h-100 w-100 hstack align-items-center justify-content-center c-pointer upload-button">
                        <i aria-hidden="true" className="camera-icon"><FiCamera /></i>
                      </div>
                      <input
                        type="file"
                        id="profileImage"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="file-upload"
                        hidden
                      />
                    </label>
                    <div className="d-flex flex-column gap-1">
                      <label htmlFor="profileImage" className="btn btn-sm btn-light-brand" style={{ width: 'fit-content' }}>
                        <FiUpload className="me-2" />
                        {uploadedImage ? 'Change Photo' : 'Upload Photo'}
                      </label>
                      <span className="fs-11 text-gray-500">JPG, PNG or GIF, max 2MB</span>
                    </div>
                  </div>
                  <hr className="my-4" />

                  <div className="mb-4">
                    <h6 className="fw-bold mb-1">Personal Information</h6>
                    <span className="fs-12 text-muted">Who this user is and how to reach them</span>
                  </div>
                    <div className="row mb-4 align-items-center">
                      <div className="col-lg-4">
                        <label htmlFor="nameInput" className="fw-semibold">Full Name: <span className="text-danger">*</span></label>
                      </div>
                      <div className="col-lg-8">
                        <div className="input-group">
                          <div className="input-group-text"><FiUser size={16} /></div>
                          <input
                            type="text"
                            id="nameInput"
                            name="name"
                            className="form-control"
                            placeholder="Enter full name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="row mb-4 align-items-center">
                      <div className="col-lg-4">
                        <label htmlFor="emailInput" className="fw-semibold">Email Address: <span className="text-danger">*</span></label>
                      </div>
                      <div className="col-lg-8">
                        <div className="input-group">
                          <div className="input-group-text"><FiMail size={16} /></div>
                          <input
                            type="email"
                            id="emailInput"
                            name="email"
                            className="form-control"
                            placeholder="Enter email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="row mb-4 align-items-center">
                      <div className="col-lg-4">
                        <label htmlFor="phoneInput" className="fw-semibold">Phone Number:</label>
                      </div>
                      <div className="col-lg-8">
                        <div className="input-group">
                          <div className="input-group-text"><FiPhone size={16} /></div>
                          <input
                            type="text"
                            id="phoneInput"
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

                    <div className="row mb-4 align-items-center">
                      <div className="col-lg-4">
                        <label htmlFor="addressInput" className="fw-semibold">Address:</label>
                      </div>
                      <div className="col-lg-8">
                        <div className="input-group">
                          <div className="input-group-text"><FiMapPin size={16} /></div>
                          <input
                            type="text"
                            id="addressInput"
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

                    <hr className="my-4" />
                    <div className="mb-4">
                      <h6 className="fw-bold mb-1">Employment Details</h6>
                      <span className="fs-12 text-muted">Role, department and where they fit in the org</span>
                    </div>

                    <div className="row mb-4 align-items-center">
                      <div className="col-lg-4">
                        <label htmlFor="roleInput" className="fw-semibold">Role: <span className="text-danger">*</span></label>
                      </div>
                      <div className="col-lg-8">
                        <div className="input-group">
                          <div className="input-group-text"><FiShield size={16} /></div>
                          <select
                            id="roleInput"
                            name="role"
                            className="form-select"
                            value={formData.role}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading || loadingRoles}
                          >
                            <option value="">
                              {loadingRoles ? 'Loading roles...' : 'Select role'}
                            </option>
                            {roles.map(role => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="row mb-4 align-items-center">
                      <div className="col-lg-4">
                        <label htmlFor="departmentInput" className="fw-semibold">Department:</label>
                      </div>
                      <div className="col-lg-8">
                        <div className="input-group">
                          <div className="input-group-text"><FiBriefcase size={16} /></div>
                          <input
                            type="text"
                            id="departmentInput"
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

                    <div className="row mb-4 align-items-center">
                      <div className="col-lg-4">
                        <label htmlFor="statusInput" className="fw-semibold">Status: <span className="text-danger">*</span></label>
                      </div>
                      <div className="col-lg-8">
                        <div className="input-group">
                          <div className="input-group-text"><FiCheckCircle size={16} /></div>
                          <select
                            id="statusInput"
                            name="status"
                            className="form-select"
                            value={formData.status}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                          >
                            <option value="">Select status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="row mb-4 align-items-center">
                      <div className="col-lg-4">
                        <label htmlFor="joiningDateInput" className="fw-semibold">Joining Date:</label>
                      </div>
                      <div className="col-lg-8">
                        <div className="input-group">
                          <div className="input-group-text"><FiCalendar size={16} /></div>
                          <input
                            type="date"
                            id="joiningDateInput"
                            name="joining_date"
                            className="form-control"
                            value={formData.joining_date}
                            onChange={handleInputChange}
                            disabled={isLoading}
                          />
                        </div>
                        <div className="form-text">Optional — you can leave this blank and still create the user.</div>
                      </div>
                    </div>

                    <div className="row mb-4 align-items-center">
                      <div className="col-lg-4">
                        <label htmlFor="managerInput" className="fw-semibold">Manager:</label>
                      </div>
                      <div className="col-lg-8">
                        <div className="input-group">
                          <div className="input-group-text"><FiUserCheck size={16} /></div>
                          <input
                            type="text"
                            id="managerInput"
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

                    <div className="row mb-4 align-items-center">
                      <div className="col-lg-4">
                        <label htmlFor="employeeIdInput" className="fw-semibold">Employee ID:</label>
                      </div>
                      <div className="col-lg-8">
                        <div className="input-group">
                          <div className="input-group-text"><FiHash size={16} /></div>
                          <input
                            type="text"
                            id="employeeIdInput"
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

                    <input type="hidden" name="company_id" value={formData.company_id} />

                    {canAssignCompanies && (
                      <>
                      <hr className="my-4" />
                      <div className="mb-4">
                        <h6 className="fw-bold mb-1">Company Access</h6>
                        <span className="fs-12 text-muted">Which other companies' data this user can switch into</span>
                      </div>
                      <div className="row mb-4 align-items-center">
                        <div className="col-lg-4">
                          <label className="fw-semibold">Assign Additional Companies:</label>
                        </div>
                        <div className="col-lg-8">
                          <Select
                            isMulti
                            isSearchable
                            placeholder="Select other companies this user can access..."
                            options={sameClientCompanyOptions(companies, formData.company_id)}
                            value={selectedCompanies}
                            onChange={(opts) => setSelectedCompanies(opts || [])}
                            isDisabled={isLoading}
                            classNamePrefix="select"
                          />
                          <div className="form-text">User always keeps access to the current company; add more here if they should see other companies' patient data too.</div>
                        </div>
                      </div>
                      </>
                    )}

                    <hr className="my-4" />
                    <div className="mb-4">
                      <h6 className="fw-bold mb-1">Security</h6>
                      <span className="fs-12 text-muted">Set the login password for this user</span>
                    </div>

                    <div className="row mb-4 align-items-center">
                      <div className="col-lg-4">
                        <label htmlFor="passwordInput" className="fw-semibold">Password: <span className="text-danger">*</span></label>
                      </div>
                      <div className="col-lg-8">
                        <div className="input-group">
                          <div className="input-group-text"><FiLock size={16} /></div>
                          <input
                            type={showPassword ? "text" : "password"}
                            id="passwordInput"
                            name="password"
                            className="form-control"
                            placeholder="Enter password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            className="input-group-text c-pointer"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                          >
                            {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="row mb-4 align-items-center">
                      <div className="col-lg-4">
                        <label htmlFor="confirmPasswordInput" className="fw-semibold">Confirm Password: <span className="text-danger">*</span></label>
                      </div>
                      <div className="col-lg-8">
                        <div className="input-group">
                          <div className="input-group-text"><FiLock size={16} /></div>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            id="confirmPasswordInput"
                            name="confirmPassword"
                            className="form-control"
                            placeholder="Confirm password"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            className="input-group-text c-pointer"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={isLoading}
                          >
                            {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <hr className="my-4" />
                    <div className="d-flex justify-content-end gap-3">
                      <button type="button" className="btn btn-light-brand" onClick={() => router.back()} disabled={isLoading}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Creating User...
                          </>
                        ) : (
                          'Create User'
                        )}
                      </button>
                    </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}

export default page