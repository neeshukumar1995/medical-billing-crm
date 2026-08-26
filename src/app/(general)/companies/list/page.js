'use client'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { FiEdit3, FiEye, FiTrash2, FiUser, FiMapPin, FiImage, FiEdit } from 'react-icons/fi'
import SelectDropdown from '@/components/shared/SelectDropdown';
import Link from 'next/link';
import crmInstance from '@/utils/crmInstance';
import Swal from 'sweetalert2';
import Spinner from '@/components/shared/Spinner';
import { usePermissions } from '@/hooks/usePermissions';
import PermissionGuard from '@/components/shared/PermissionGuard';
import { IMAGE_BASE_URL } from '@/config/api'
import { COMPANY_STATUS_OPTIONS, getCompanyStatusOption } from '@/constants/companyStatus';

// Constants
const PAGE_SIZE = 5;
const DEBOUNCE_DELAY = 300;

const statusOptions = COMPANY_STATUS_OPTIONS;
const getStatusOption = getCompanyStatusOption;

// Extracted component for better maintainability
const StatusTableCell = React.memo(({ options, defaultSelect, onStatusChange, companyId }) => {
    const [selectedOption, setSelectedOption] = useState(() => {
        return options.find(opt => opt.value === defaultSelect) || options[0];
    });

    const handleStatusChange = useCallback(async (option) => {
        const previousOption = selectedOption;
        setSelectedOption(option);
        if (onStatusChange) {
            const statusValue = option?.value || option;
            try {
                await onStatusChange(companyId, statusValue);
            } catch {
                // Revert on failure
                setSelectedOption(previousOption);
            }
        }
    }, [selectedOption, onStatusChange, companyId]);

    return (
        <SelectDropdown
            options={options}
            selectedOption={selectedOption}
            onSelectOption={handleStatusChange}
        />
    );
});

// Debounce hook
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

const CompaniesListPage = () => {
    const { hasPermission } = usePermissions()
    const [companies, setCompanies] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const observerRef = useRef(null);

    const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAY);
    const colSpanCount = hasPermission('edit-companies') ? 7 : 6;

    // Add/Edit company popup
    const [showFormModal, setShowFormModal] = useState(false)
    const [modalMode, setModalMode] = useState('create')
    const [editingCompanyId, setEditingCompanyId] = useState(null)
    const [formData, setFormData] = useState({ name: '', address: '', title: '', status: 'Active', crm_enabled: true, medical_billing_enabled: true, logo: null })
    const [formSaving, setFormSaving] = useState(false)
    const [formError, setFormError] = useState('')

    // View company popup
    const [showViewModal, setShowViewModal] = useState(false)
    const [viewCompany, setViewCompany] = useState(null)

    // Memoized filtered companies for performance
    const filteredCompanies = useMemo(() => {
        if (debouncedSearchTerm) {
            return companies.filter(company =>
                company.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                (company.title && company.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
                (company.address && company.address.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
            );
        }
        return companies;
    }, [companies, debouncedSearchTerm]);

    const fetchCompanies = useCallback(async (page = 1, append = false) => {
        try {
            if (page === 1) {
                setLoading(true)
            } else {
                setLoadingMore(true)
            }

            const params = { page, limit: PAGE_SIZE }
            const response = await crmInstance.get('/companies', { params })

            const companiesData = response.data.data || response.data || []

            if (append) {
                setCompanies(prevCompanies => [...prevCompanies, ...companiesData])
            } else {
                setCompanies(companiesData)
            }

            setHasMore(companiesData.length === PAGE_SIZE)
            setError('')
        } catch (err) {
            let errorMessage = 'Failed to load companies. Please try again.'

            if (err.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.'
            } else if (err.response?.status === 403) {
                errorMessage = 'You do not have permission to view companies.'
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message
            }

            setError(errorMessage)
            if (!append) {
                setCompanies([])
            }
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }, [])

    // Initial load
    useEffect(() => {
        fetchCompanies(1, false)
    }, [fetchCompanies])

    // Infinite scroll using IntersectionObserver
    const loadMoreCompanies = useCallback(() => {
        if (!loadingMore && hasMore && !debouncedSearchTerm) {
            const nextPage = currentPage + 1
            setCurrentPage(nextPage)
            fetchCompanies(nextPage, true)
        }
    }, [loadingMore, hasMore, currentPage, fetchCompanies, debouncedSearchTerm])

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreCompanies()
                }
            },
            { threshold: 1.0 }
        );

        if (observerRef.current) {
            observer.observe(observerRef.current);
        }

        return () => {
            if (observerRef.current) {
                observer.unobserve(observerRef.current);
            }
        };
    }, [loadMoreCompanies]);

    const handleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value)
    }, [])

    // Delete company handler
    const handleDeleteCompany = useCallback(async (company) => {
        const result = await Swal.fire({
            title: 'Delete Company',
            text: `Are you sure you want to delete ${company.name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                await crmInstance.delete(`/companies/${company.id}`);

                setCompanies(prevCompanies => prevCompanies.filter(c => c.id !== company.id));

                Swal.fire({
                    title: 'Deleted!',
                    text: 'Company has been deleted.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (err) {
                console.error('Failed to delete company:', err);
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to delete company.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        }
    }, []);

    // Status update handler with proper revert
    const handleStatusChange = useCallback(async (companyId, newStatus) => {
        const company = companies.find(c => c.id === companyId);
        const previousStatus = company?.status;

        // Optimistically update
        setCompanies(prevCompanies =>
            prevCompanies.map(company =>
                company.id === companyId ? { ...company, status: newStatus } : company
            )
        );

        try {
            await crmInstance.patch(`/companies/${companyId}`, {
                status: newStatus
            });

            Swal.fire({
                title: 'Updated!',
                text: `Company status has been updated to ${newStatus}.`,
                icon: 'success',
                confirmButtonText: 'OK',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (err) {
            console.error('Failed to update company status:', err);

            // Revert on failure
            setCompanies(prevCompanies =>
                prevCompanies.map(company =>
                    company.id === companyId ? { ...company, status: previousStatus } : company
                )
            );

            let errorMessage = 'Failed to update company status';

            if (err.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.';
            } else if (err.response?.status === 403) {
                errorMessage = 'You do not have permission to update this company.';
            } else if (err.response?.status === 404) {
                errorMessage = 'Company not found.';
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            }

            Swal.fire({
                title: 'Error!',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    }, [companies]);

    const openCreateModal = useCallback(() => {
        setModalMode('create')
        setEditingCompanyId(null)
        setFormData({ name: '', address: '', title: '', status: 'Active', crm_enabled: true, medical_billing_enabled: true, logo: null })
        setFormError('')
        setShowFormModal(true)
    }, []);

    const openEditModal = useCallback((company) => {
        setModalMode('edit')
        setEditingCompanyId(company.id)
        setFormData({
            name: company.name || '',
            address: company.address || '',
            title: company.title || '',
            status: company.status || 'Active',
            crm_enabled: company.crm_enabled !== false,
            medical_billing_enabled: company.medical_billing_enabled !== false,
            logo: null
        })
        setFormError('')
        setShowFormModal(true)
    }, []);

    const closeFormModal = useCallback(() => {
        if (formSaving) return
        setShowFormModal(false)
    }, [formSaving]);

    const openViewModal = useCallback((company) => {
        setViewCompany(company)
        setShowViewModal(true)
    }, []);

    const closeViewModal = useCallback(() => {
        setShowViewModal(false)
        setViewCompany(null)
    }, []);

    const handleFormInputChange = useCallback((e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    }, []);

    const handleFormFileChange = useCallback((e) => {
        const file = e.target.files[0]
        setFormData(prev => ({ ...prev, logo: file }))
    }, []);

    const handleFormSubmit = useCallback(async (e) => {
        e.preventDefault()
        setFormSaving(true)
        setFormError('')

        try {
            const formDataToSend = new FormData()
            formDataToSend.append('name', formData.name)
            formDataToSend.append('address', formData.address || '')
            formDataToSend.append('title', formData.title || '')
            formDataToSend.append('status', formData.status)
            formDataToSend.append('crm_enabled', formData.crm_enabled ? '1' : '0')
            formDataToSend.append('medical_billing_enabled', formData.medical_billing_enabled ? '1' : '0')
            if (formData.logo) {
                formDataToSend.append('logo', formData.logo)
            }

            if (modalMode === 'edit') {
                formDataToSend.append('_method', 'PUT')
                const response = await crmInstance.post(`/companies/${editingCompanyId}`, formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                const updated = response.data?.data || response.data || {}
                setCompanies(prev => prev.map(c => c.id === editingCompanyId ? { ...c, ...updated } : c))
            } else {
                const response = await crmInstance.post('/companies', formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                const created = response.data?.data || response.data
                setCompanies(prev => [created, ...prev])
            }

            setShowFormModal(false)
            Swal.fire({
                title: 'Success!',
                text: modalMode === 'edit' ? 'Company updated successfully' : 'Company created successfully',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            })
        } catch (err) {
            console.error('Company save failed:', err)
            setFormError(err.response?.data?.message || `Failed to ${modalMode === 'edit' ? 'update' : 'create'} company`)
        } finally {
            setFormSaving(false)
        }
    }, [formData, modalMode, editingCompanyId]);

    return (
        <PermissionGuard permission="view-companies" redirect={false}>
            <PageHeader>
                <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex gap-2">
                        {hasPermission('create-companies') && (
                            <button type="button" className="btn btn-primary" onClick={openCreateModal}>
                                Create Company
                            </button>
                        )}
                    </div>
                </div>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <div className="col-lg-12">
                        <div className="card stretch stretch-full">
                            <div className="card-body">
                                {error && <div className="alert alert-danger">{error}</div>}

                                {loading && (
                                    <div className="d-flex justify-content-center align-items-center py-5">
                                        <Spinner classNames={{label: "text-foreground mt-4"}} label="spinner" variant="spinner" />
                                    </div>
                                )}

                                {/* Search */}
                                <div className='row gy-2'>
                                    <div className='col-sm-12 ps-0 m-0 pb-10'>
                                        <div className='dataTables_filter d-flex justify-content-end'>
                                            <label className='d-inline-flex align-items-center gap-2'>
                                                Search:
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={handleSearchChange}
                                                    placeholder='Search companies...'
                                                    className="form-control form-control-sm"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <div className='dataTables_wrapper dt-bootstrap5 no-footer'>
                                        <div className="row dt-row">
                                            <div className="col-sm-12 px-0">
                                                <table className="table table-hover dataTable no-footer" id='companyList'>
                                                    <thead>
                                                        <tr>
                                                            <th>S.No</th>
                                                            <th>Logo</th>
                                                            <th>Company Name</th>
                                                            <th>Title</th>
                                                            <th>Address</th>
                                                            {hasPermission('edit-companies') && (
                                                                <th>Status</th>
                                                            )}
                                                            <th className="text-end">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {loading ? (
                                                            <tr>
                                                                <td colSpan={colSpanCount} className="text-center py-4">
                                                                    <div className="d-flex justify-content-center">
                                                                        <div className="spinner-border spinner-border-sm" role="status">
                                                                            <span className="visually-hidden">Loading...</span>
                                                                        </div>
                                                                        <span className="ms-2">Loading companies...</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ) : filteredCompanies.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={colSpanCount} className="text-center py-4">
                                                                    {debouncedSearchTerm ? 'No companies found matching your search.' : 'No companies found.'}
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            filteredCompanies.map((company, index) => (
                                                                <tr key={`${company.id}-${index}`}>
                                                                    <td>{index + 1}</td>
                                                                    <td>
                                                                        {company.logo ? (
                                                                            <img
                                                                                src={`${IMAGE_BASE_URL}/${company.logo}`}
                                                                                alt={`${company.name} logo`}
                                                                                className="rounded"
                                                                                style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                                                                            />
                                                                        ) : (
                                                                            <div
                                                                                className="bg-light rounded d-flex align-items-center justify-content-center"
                                                                                style={{ width: '40px', height: '40px' }}
                                                                            >
                                                                                <span className="text-muted fw-bold">
                                                                                    {company.name?.charAt(0).toUpperCase() || '?'}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <div className="hstack gap-3">
                                                                            <div className="text-truncate-1-line">{company.name || 'N/A'}</div>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div className="hstack gap-3">
                                                                            <div className="text-truncate-1-line">{company.title || 'N/A'}</div>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        {company.address || 'N/A'}
                                                                    </td>
                                                                    {hasPermission('edit-companies') && (
                                                                        <td>
                                                                            <StatusTableCell
                                                                                options={statusOptions}
                                                                                defaultSelect={company.status || 'Active'}
                                                                                onStatusChange={handleStatusChange}
                                                                                companyId={company.id}
                                                                            />
                                                                        </td>
                                                                    )}
                                                                    <td className="text-end">
                                                                        <div className="hstack gap-2 justify-content-end">
                                                                            {hasPermission('view-companies') && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="avatar-text avatar-md"
                                                                                    onClick={() => openViewModal(company)}
                                                                                    title="View"
                                                                                >
                                                                                    <FiEye />
                                                                                </button>
                                                                            )}
                                                                            {hasPermission('edit-companies') && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="avatar-text avatar-md"
                                                                                    onClick={() => openEditModal(company)}
                                                                                    title="Edit"
                                                                                >
                                                                                    <FiEdit3 />
                                                                                </button>
                                                                            )}
                                                                            {hasPermission('delete-companies') && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="avatar-text avatar-md"
                                                                                    onClick={() => handleDeleteCompany(company)}
                                                                                    title="Delete"
                                                                                >
                                                                                    <FiTrash2 />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}

                                                        {/* Loading more spinner */}
                                                        {loadingMore && !debouncedSearchTerm && (
                                                            <tr>
                                                                <td colSpan={colSpanCount} className="text-center py-4">
                                                                    <div className="d-flex justify-content-center align-items-center">
                                                                        <Spinner classNames={{label: "text-foreground mt-4"}} label="spinner" variant="spinner" />
                                                                        <span className="ms-2">Loading more companies...</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}

                                                        {/* No more data indicator */}
                                                        {!loadingMore && !hasMore && companies.length > 0 && !debouncedSearchTerm && (
                                                            <tr>
                                                                <td colSpan={colSpanCount} className="text-center py-4 text-muted">
                                                                    <small>No more companies to load</small>
                                                                </td>
                                                            </tr>
                                                        )}

                                                        {/* Intersection observer target */}
                                                        <tr ref={observerRef} style={{ height: '1px' }}></tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add / Edit Company Modal */}
            {showFormModal && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <form onSubmit={handleFormSubmit}>
                                <div className="modal-header">
                                    <h5 className="modal-title">{modalMode === 'edit' ? 'Edit Company' : 'Create New Company'}</h5>
                                    <button type="button" className="btn-close" onClick={closeFormModal} disabled={formSaving}></button>
                                </div>
                                <div className="modal-body">
                                    {formError && <div className="alert alert-danger">{formError}</div>}

                                    <div className="mb-3">
                                        <label className="form-label">Company Name <span className="text-danger">*</span></label>
                                        <div className="position-relative">
                                            <FiUser className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                                            <input
                                                type="text"
                                                name="name"
                                                className="form-control ps-5"
                                                placeholder="Enter company name"
                                                value={formData.name}
                                                onChange={handleFormInputChange}
                                                required
                                                disabled={formSaving}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Address</label>
                                        <div className="position-relative">
                                            <FiMapPin className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                                            <input
                                                type="text"
                                                name="address"
                                                className="form-control ps-5"
                                                placeholder="Enter company address"
                                                value={formData.address}
                                                onChange={handleFormInputChange}
                                                disabled={formSaving}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Title</label>
                                        <div className="position-relative">
                                            <FiUser className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                                            <input
                                                type="text"
                                                name="title"
                                                className="form-control ps-5"
                                                placeholder="Enter company title"
                                                value={formData.title}
                                                onChange={handleFormInputChange}
                                                disabled={formSaving}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Status</label>
                                        <select
                                            name="status"
                                            className="form-select"
                                            value={formData.status}
                                            onChange={handleFormInputChange}
                                            disabled={formSaving}
                                        >
                                            {COMPANY_STATUS_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label} — {option.description}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label d-block">Modules</label>
                                        <div className="form-check form-check-inline">
                                            <input
                                                type="checkbox"
                                                name="crm_enabled"
                                                id="modal_crm_enabled"
                                                className="form-check-input"
                                                checked={formData.crm_enabled}
                                                onChange={handleFormInputChange}
                                                disabled={formSaving}
                                            />
                                            <label htmlFor="modal_crm_enabled" className="form-check-label">Enable CRM</label>
                                        </div>
                                        <div className="form-check form-check-inline">
                                            <input
                                                type="checkbox"
                                                name="medical_billing_enabled"
                                                id="modal_medical_billing_enabled"
                                                className="form-check-input"
                                                checked={formData.medical_billing_enabled}
                                                onChange={handleFormInputChange}
                                                disabled={formSaving}
                                            />
                                            <label htmlFor="modal_medical_billing_enabled" className="form-check-label">Enable Medical Billing</label>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Company Logo</label>
                                        <div className="position-relative">
                                            <FiImage className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                                            <input
                                                type="file"
                                                name="logo"
                                                className="form-control ps-5"
                                                accept="image/*"
                                                onChange={handleFormFileChange}
                                                disabled={formSaving}
                                            />
                                        </div>
                                        {modalMode === 'edit' && (
                                            <small className="text-muted">Leave empty to keep current logo</small>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeFormModal} disabled={formSaving}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={formSaving}>
                                        {formSaving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                {modalMode === 'edit' ? 'Updating...' : 'Creating...'}
                                            </>
                                        ) : (
                                            modalMode === 'edit' ? 'Update Company' : 'Create Company'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {showFormModal && <div className="modal-backdrop fade show"></div>}

            {/* View Company Modal */}
            {showViewModal && viewCompany && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Company Details</h5>
                                <button type="button" className="btn-close" onClick={closeViewModal}></button>
                            </div>
                            <div className="modal-body">
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    {viewCompany.logo ? (
                                        <img
                                            src={`${IMAGE_BASE_URL}/${viewCompany.logo}`}
                                            alt={`${viewCompany.name} logo`}
                                            className="rounded"
                                            style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <div
                                            className="bg-light rounded d-flex align-items-center justify-content-center"
                                            style={{ width: '64px', height: '64px' }}
                                        >
                                            <span className="text-muted fw-bold fs-4">
                                                {viewCompany.name?.charAt(0).toUpperCase() || '?'}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <h5 className="mb-0">{viewCompany.name || 'N/A'}</h5>
                                        <span className="text-muted">{viewCompany.title || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label fw-bold">Address</label>
                                        <p className="form-control-plaintext mb-0">{viewCompany.address || 'N/A'}</p>
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label fw-bold">Status</label>
                                        <p className="form-control-plaintext mb-0">
                                            {getStatusOption(viewCompany.status).label} — {getStatusOption(viewCompany.status).description}
                                        </p>
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label fw-bold">Modules</label>
                                        <p className="form-control-plaintext mb-0">
                                            <span className={`badge bg-soft-${viewCompany.crm_enabled !== false ? 'success' : 'secondary'} text-${viewCompany.crm_enabled !== false ? 'success' : 'secondary'} me-1`}>
                                                CRM {viewCompany.crm_enabled !== false ? 'On' : 'Off'}
                                            </span>
                                            <span className={`badge bg-soft-${viewCompany.medical_billing_enabled !== false ? 'success' : 'secondary'} text-${viewCompany.medical_billing_enabled !== false ? 'success' : 'secondary'}`}>
                                                Medical Billing {viewCompany.medical_billing_enabled !== false ? 'On' : 'Off'}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label fw-bold">Created Date</label>
                                        <p className="form-control-plaintext mb-0">
                                            {viewCompany.created_at ? new Date(viewCompany.created_at).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label fw-bold">Updated Date</label>
                                        <p className="form-control-plaintext mb-0">
                                            {viewCompany.updated_at ? new Date(viewCompany.updated_at).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeViewModal}>
                                    Close
                                </button>
                                {hasPermission('edit-companies') && (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => {
                                            closeViewModal()
                                            openEditModal(viewCompany)
                                        }}
                                    >
                                        <FiEdit className="me-2" />
                                        Edit Company
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showViewModal && viewCompany && <div className="modal-backdrop fade show"></div>}
        </PermissionGuard>
    )
}

export default CompaniesListPage
