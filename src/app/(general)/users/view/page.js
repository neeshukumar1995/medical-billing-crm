'use client'
import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { FiAlertTriangle, FiFacebook, FiGithub, FiGlobe, FiLinkedin, FiLock, FiPlus, FiSettings, FiStar, FiTwitter, FiUserCheck, FiUsers, FiYoutube } from 'react-icons/fi'
import Dropdown from '@/components/shared/Dropdown'
import topTost from '@/utils/topTost'
import Link from 'next/link'
import crmInstance from '@/utils/crmInstance'
import { useParams } from 'next/navigation'
import PermissionGuard from '@/components/shared/PermissionGuard';

const customerProfileOption = [
    { label: "Only Me", icon: <FiLock /> },
    { label: "Everyone", icon: <FiGlobe /> },
    { label: "Anonymous", icon: <FiUsers /> },
    { label: "People I Follow", icon: <FiUserCheck /> },
    { label: "Custom Selections Ever", icon: <FiSettings /> },
]

const informationData = [
    { label: 'Full Name', value: 'John Doe' },
    { label: 'Email Address', value: 'john.doe@example.com' },
    { label: 'Phone Number', value: '+1 (555) 123-4567' },
    { label: 'Address', value: '123 Main St, Anytown, USA' },
    { label: 'Role', value: 'Software Engineer' },
    { label: 'Department', value: 'Engineering' },
    { label: 'Status', value: 'Active' },
    { label: 'Joining Date', value: '15 Jan, 2022' },
    { label: 'Manager', value: 'Jane Smith' },
    { label: 'Employee ID', value: 'EMP001' },
    { label: 'Communication', value: 'Email, Phone' },
    { label: 'Allow Changes', value: 'YES' },
]

const UsersViewHeader = () => {
    const handleClick = () => {
        topTost()
    }
    return (
        <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
            <a href="#" className="btn btn-icon btn-light-brand" onClick={handleClick}>
                <FiStar size={16} />
            </a>
            <Link href="/users/create" className="btn btn-primary">
                <FiPlus size={16} className='me-2' />
                <span>Create User</span>
            </Link>
        </div>
    )
}



const TabOverviewContent = ({ user }) => {
    const informationData = [
        { label: 'Full Name', value: user?.name || 'N/A' },
        { label: 'Email Address', value: user?.email || 'N/A' },
        { label: 'Phone Number', value: user?.phone || 'N/A' },
        { label: 'Address', value: user?.address || 'N/A' },
        { label: 'Role', value: user?.role || 'N/A' },
        { label: 'Department', value: user?.department || 'N/A' },
        { label: 'Status', value: user?.status || 'N/A' },
        { label: 'Joining Date', value: user?.joining_date || 'N/A' },
        { label: 'Manager', value: user?.manager || 'N/A' },
        { label: 'Employee ID', value: user?.employee_id || 'N/A' },
        { label: 'Communication', value: 'Email, Phone' },
        { label: 'Allow Changes', value: 'YES' },
    ]

    return (
      
        <div
            className="tab-pane fade show active p-4"
            id="overviewTab"
            role="tabpanel"
        >
            <div className="profile-details mb-5">
                <div className="mb-4 d-flex align-items-center justify-content-between">
                    <h5 className="fw-bold mb-0">Profile Details:</h5>
                    <Link href={`/users/edit/${user?.id}`} className="btn btn-sm btn-light-brand">
                        Edit Profile
                    </Link>
                </div>
                {informationData.map((item, index) => (
                    <div key={index}  className={`row g-0 ${index === informationData.length - 1 ? 'mb-0' : 'mb-4'}`}>
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
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        const response = await crmInstance.get(`/users/${params.id}`)
        setUser(response.data)
        setError('')
      } catch (err) {
        console.error('Failed to fetch user:', err)
        setError('Failed to load user details.')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchUser()
    }
  }, [params.id])

  if (loading) {
    return (
    <PermissionGuard permission="view-users" redirect={false}>
        <PageHeader>
          <UsersViewHeader />
        </PageHeader>
        <div className='main-content'>
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <span className="ms-2">Loading user details...</span>
          </div>
        </div>
      </PermissionGuard>
    )
  }

  if (error || !user) {
    return (
    <PermissionGuard permission="view-users" redirect={false}>
        <PageHeader>
          <UsersViewHeader />
        </PageHeader>
        <div className='main-content'>
          <div className="alert alert-danger">{error || 'User not found'}</div>
        </div>
      </PermissionGuard>
    )
  }

  return (
  <PermissionGuard permission="view-users" redirect={false}>
      <PageHeader>
        <UsersViewHeader />
      </PageHeader>
      <div className='main-content'>
        <div className='row'>
            <div className="col-xxl-4 col-xl-6">
                <div className="card">
                    <div className="card-body text-center">
                        {user.profile_image ? (
                            <img
                                src={user.profile_image}
                                alt="Profile"
                                className="img-fluid rounded-circle mb-3"
                                style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                            />
                        ) : (
                            <div className="avatar-text avatar-xl user-avatar-text mx-auto mb-3">
                                {user.name?.substring(0, 1)}
                            </div>
                        )}
                        <h4>{user.name}</h4>
                        <p className="text-muted">{user.email}</p>
                        <span className={`badge ${user.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
                            {user.status || 'Active'}
                        </span>
                    </div>
                </div>
            </div>
            <div className="col-xxl-12 col-xl-6">
                <div className="card border-top-0">
                    <div className="tab-content">
                        <TabOverviewContent user={user} />
                    </div>
                </div>
            </div>
        </div>
      </div>
   </PermissionGuard >
  )
}

export default page