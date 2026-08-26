'use client'
import React, { memo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Table from '@/components/shared/table/Table';
import { FiAlertOctagon, FiArchive, FiClock, FiEdit3, FiEye, FiMoreHorizontal, FiPrinter, FiTrash2, FiRefreshCw, FiStar, FiMail } from 'react-icons/fi'
import Dropdown from '@/components/shared/Dropdown';
import SelectDropdown from '@/components/shared/SelectDropdown';
import getIcon from '@/utils/getIcon';
import crmInstance from '@/utils/crmInstance';
import Swal from 'sweetalert2';
import { usePermissions } from '@/hooks/usePermissions';

// Configure SweetAlert2 to prevent backdrop issues
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




const TableCell = memo(({ options, defaultSelect }) => {
    const [selectedOption, setSelectedOption] = useState(null);


    return (

        <SelectDropdown
            options={options}
            defaultSelect={defaultSelect}
            selectedOption={selectedOption}
            onSelectOption={(option) => setSelectedOption(option)}
        />
    );
});


const RowLeadsTable = ({ data = [], onDataUpdate, isTrashed = false, onSelectionChange, rowSelection, onRowSelectionChange, onSearch, leadStatuses = [], allowedActions = ['view', 'edit', 'history', 'delete', 'status'], showEntriesInfo = true, showEntriesDropdown = false, hiddenColumns = [], onViewClick, onInvoiceClick, customFilters, showSerialNumbers = false }) => {
    const router = useRouter()
    const [tableData, setTableData] = useState(data)
    const [selectedRows, setSelectedRows] = useState([])
    const { hasPermission } = usePermissions()
    const [showStatusModal, setShowStatusModal] = useState(false)
    const [selectedLead, setSelectedLead] = useState(null)
    const [statusNotes, setStatusNotes] = useState('')
    const [selectedStatusId, setSelectedStatusId] = useState('')
    const [followupDate, setFollowupDate] = useState('')
    const [showEmailModal, setShowEmailModal] = useState(false)
    const [selectedEmailLead, setSelectedEmailLead] = useState(null)
    const [emailSubject, setEmailSubject] = useState('')
    const [emailBody, setEmailBody] = useState('')
    const [emailAttachments, setEmailAttachments] = useState([])
    const [sendingEmail, setSendingEmail] = useState(false)

    // Color mapping for statuses
    const getStatusColor = (status) => {
        const colorMap = {
            'Converted': 'linear-gradient(90deg, #28a745, #85e085)',
            'No Poc': 'linear-gradient(90deg, #adb5bd, #dee2e6)',
            'follow up scheduled': 'linear-gradient(90deg, #17a2b8, #66d9e8)',
            'Unresponsive': 'linear-gradient(90deg, #fd7e14, #ffb84d)',
            'Wrong Number': 'linear-gradient(90deg, #dc3545, #ff6b6b)',
            'In Progress': 'linear-gradient(90deg, #0d6efd, #66b2ff)',
            'Denied': 'linear-gradient(90deg, #842029, #b94a48)'
        }
        return colorMap[status] || 'linear-gradient(90deg, #6c757d, #adb5bd)'
    }

    // Ensure router is ready before using it
    const [isRouterReady, setIsRouterReady] = useState(false)

    useEffect(() => {
        setIsRouterReady(true)
    }, [])

    useEffect(() => {
        setTableData(data)
    }, [data])

    const handleEdit = (leadId) => {
        if (leadId && isRouterReady) {
            router.push(`/leads/edit/${leadId}`)
        } else if (!leadId) {
            console.error('Lead ID is missing')
        } else {
            console.error('Router is not ready')
        }
    }

    const handleStatusClick = (lead) => {
        setSelectedLead(lead)
        setSelectedStatusId(lead.lead_status?.id?.toString() || '')
        setStatusNotes('')
        setFollowupDate('')
        setShowStatusModal(true)
    }

    const handleEmailClick = (lead) => {
        setSelectedEmailLead(lead)
        setEmailSubject(`Status ${lead.lead_status?.name || 'N/A'}`)
        setEmailBody(`
Hello ${lead.client_name},

I hope this email finds you well. Below are the details of your lead:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 Lead Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Lead Status : ${lead.lead_status?.name || 'N/A'}
• Provider Types   : ${lead.lead_type?.name || 'N/A'}
• Company     : ${lead.company || 'N/A'}
• Service     : ${Array.isArray(lead.service) ? lead.service.join(", ") : lead.service || 'N/A'}
• Budget      : ${lead.budget || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you have any questions or would like to proceed further, please feel free to reply to this email.
Looking forward to hearing from you.

Best regards,
Your CRM Team
        `.trim())
        setEmailAttachments([])
        setShowEmailModal(true)
    }


    const handleEmailSubmit = async () => {
        if (!selectedEmailLead || !emailSubject.trim() || !emailBody.trim()) return

        try {
            setSendingEmail(true)

            const formData = new FormData()
            formData.append('lead_id', selectedEmailLead.id)
            formData.append('to_email', selectedEmailLead.email)
            formData.append('subject', emailSubject)
            formData.append('body', emailBody)

            // Add attachments
            emailAttachments.forEach((file, index) => {
                formData.append(`attachments[${index}]`, file)
            })

            const response = await crmInstance.post('/leads/email-history', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })

            if (response.data && response.data.status) {
                showSwal({
                    title: 'Success!',
                    text: 'Email sent successfully!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                })

                setShowEmailModal(false)
                setSelectedEmailLead(null)
                setEmailSubject('')
                setEmailBody('')
                setEmailAttachments([])
            } else {
                throw new Error('Failed to send email')
            }
        } catch (error) {
            console.error('Email send failed:', error)
            let errorMessage = 'Failed to send email'
            if (error.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.'
            } else if (error.response?.status === 403) {
                errorMessage = 'You do not have permission to send emails.'
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message
            }
            showSwal({
                title: 'Error!',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'OK'
            })
        } finally {
            setSendingEmail(false)
        }
    }

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files)
        setEmailAttachments(prev => [...prev, ...files])
    }

    const removeAttachment = (index) => {
        setEmailAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const handleStatusSubmit = async () => {
        if (!selectedLead || !selectedStatusId) return

        try {
            const payload = {
                user_id: selectedLead.assigned_to?.id || null, // Include user_id if available
                leads_id: selectedLead.id,
                status_id: selectedStatusId,
                note: statusNotes || null
            }

            // Add followup_date if status is "follow up scheduled" and date is provided
            const selectedStatus = leadStatuses.find(status => status.value === selectedStatusId)
            if (selectedStatus?.label === 'follow up scheduled' && followupDate) {
                payload.followup_date = followupDate
            }

            const response = await crmInstance.post(`/leads/${selectedLead.id}/update-status-with-note`, payload)

            if (response.data && (response.data.status === true || response.status === 200)) {
                // Update the lead in the table data
                const updatedData = tableData.map(lead => {
                    if (lead.id === selectedLead.id) {
                        const selectedStatus = leadStatuses.find(status => status.value === selectedStatusId)
                        return {
                            ...lead,
                            lead_status: selectedStatus ? { id: parseInt(selectedStatusId), name: selectedStatus.label } : lead.lead_status
                        }
                    }
                    return lead
                })
                setTableData(updatedData)

                // Notify parent component if callback provided
                if (onDataUpdate) {
                    onDataUpdate(updatedData)
                }

                setShowStatusModal(false)
                setSelectedLead(null)
                setStatusNotes('')
                setSelectedStatusId('')
                setFollowupDate('')

                showSwal({
                    title: 'Success!',
                    text: 'Lead status updated successfully!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                })
            } else {
                throw new Error('Status update failed')
            }
        } catch (error) {
            console.error('Status update failed:', error)
            let errorMessage = 'Failed to update lead status'
            if (error.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.'
            } else if (error.response?.status === 403) {
                errorMessage = 'You do not have permission to update this lead.'
            } else if (error.response?.status === 404) {
                errorMessage = 'Lead not found.'
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message
            }
            showSwal({
                title: 'Error!',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'OK'
            })
        }
    }

    const handleDelete = async (leadId, leadName) => {
        // Show custom dialog with two options
        const result = await showSwal({
            title: 'Delete Lead',
            text: `Choose how to delete lead "${leadName || 'this lead'}":`,
            icon: 'warning',
            showCancelButton: true,
            showConfirmButton: false, // Hide default confirm button
            cancelButtonText: 'Cancel',
            cancelButtonColor: '#6c757d',
            html: `
                <div class="d-flex justify-content-center gap-3 mt-3">
                    <button id="soft-delete-btn" class="btn btn-warning">
                        <i class="me-2">📝</i>Save as Draft
                    </button>
                    <button id="hard-delete-btn" class="btn btn-danger">
                        <i class="me-2">🗑️</i>Delete Permanently
                    </button>
                </div>
                <div class="mt-3 text-muted small">
                    <div><strong>Save as Draft:</strong> Lead will be moved to trashed leads</div>
                    <div><strong>Delete Permanently:</strong> Lead will be removed from database (cannot be undone)</div>
                </div>
            `,
            didOpen: () => {
                // Add event listeners to custom buttons
                document.getElementById('soft-delete-btn').addEventListener('click', async () => {
                    Swal.close();
                    await performSoftDelete(leadId, leadName);
                });
                document.getElementById('hard-delete-btn').addEventListener('click', async () => {
                    Swal.close();
                    await performHardDelete(leadId, leadName);
                });
            }
        });
    };

    // Perform soft delete
    const performSoftDelete = async (leadId, leadName) => {
        try {
            const response = await crmInstance.delete(`/leads/${leadId}`)

            // Remove lead from local state
            const updatedData = tableData.filter(lead => lead.id !== leadId);
            setTableData(updatedData);

            // Notify parent component if callback provided
            if (onDataUpdate) {
                onDataUpdate(updatedData);
            }

            showSwal({
                title: 'Saved as Draft!',
                text: `Lead ${leadName || 'this lead'} has been saved as draft successfully.`,
                icon: 'success',
                confirmButtonText: 'OK',
                confirmButtonColor: '#007bff',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Soft delete failed:', error);
            let errorMessage = 'Failed to save this lead as draft';
            if (error.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.';
            } else if (error.response?.status === 403) {
                errorMessage = 'You do not have permission to delete this lead.';
            } else if (error.response?.status === 404) {
                errorMessage = 'Lead not found.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            showSwal({
                title: 'Error!',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    };

    // Perform hard delete
    const performHardDelete = async (leadId, leadName) => {
        try {
            const response = await crmInstance.delete(`/leads/${leadId}/force-delete`);

            // Remove lead from local state
            const updatedData = tableData.filter(lead => lead.id !== leadId);
            setTableData(updatedData);

            // Notify parent component if callback provided
            if (onDataUpdate) {
                onDataUpdate(updatedData);
            }

            showSwal({
                title: 'Deleted!',
                text: `Lead ${leadName || 'this lead'} has been permanently deleted.`,
                icon: 'success',
                confirmButtonText: 'OK',
                confirmButtonColor: '#007bff',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Hard delete failed:', error);
            let errorMessage = 'Failed to delete this lead';
            if (error.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again.';
            } else if (error.response?.status === 403) {
                errorMessage = 'You do not have permission to delete this lead.';
            } else if (error.response?.status === 404) {
                errorMessage = 'Lead not found.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            showSwal({
                title: 'Error!',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    };

    const handleRestore = async (leadId) => {
        const result = await showSwal({
            title: 'Restore Lead?',
            text: 'Are you sure you want to restore this lead?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Restore',
            cancelButtonText: 'Cancel'
        })

        if (result.isConfirmed) {
            try {
                const response = await crmInstance.post(`/leads/${leadId}/restore`)

                if (response.data && (response.data.status === true || response.status === 200)) {
                    // Remove the restored lead from the table data
                    const updatedData = tableData.filter(lead => lead.id !== leadId)
                    setTableData(updatedData)

                    // Notify parent component if callback provided
                    if (onDataUpdate) {
                        onDataUpdate(updatedData)
                    }

                    showSwal({
                        title: 'Restored!',
                        text: 'Lead has been restored successfully.',
                        icon: 'success',
                        confirmButtonText: 'OK',
                        timer: 2000,
                        timerProgressBar: true
                    })
                } else {
                    throw new Error('Restore failed')
                }
            } catch (error) {
                console.error('Restore failed:', error)
                showSwal({
                    title: 'Error!',
                    text: 'Failed to restore lead. Please try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                })
            }
        }
    }

    const getActionsForLead = (leadId) => {
        const actions = []

        // View action - always included if allowed


        // Edit action
        if (allowedActions.includes('edit') && hasPermission('edit-leads')) {
            actions.push({
                label: "Edit",
                icon: <FiEdit3 />
            })
        }

        // View History action
        if (allowedActions.includes('history')) {
            actions.push({
                label: "View History",
                icon: <FiClock />,
                onClick: () => router.push(`/leads/history/${leadId}`),
            })
        }

        // Email action
        if (allowedActions.includes('email')) {
            actions.push({
                label: "Send Email",
                icon: <FiMail />,
                onClick: () => handleEmailClick(tableData.find(lead => lead.id === leadId)),
            })
        }

        // Email History action
        if (allowedActions.includes('email-history')) {
            actions.push({
                label: "Email History",
                icon: <FiMail />,
                onClick: () => router.push(`/leads/email-history/${leadId}`),
            })
        }


        // Divider if there are more actions
        if (allowedActions.some(action => ['edit', 'history', 'email', 'delete'].includes(action))) {
            actions.push({ type: "divider" })
        }

        // Delete action
        if (allowedActions.includes('delete') && hasPermission('delete-leads')) {
            actions.push({
                label: "Delete",
                icon: <FiTrash2 />
            })
        }

        return actions
    }

    const handleDropdownClick = (actionLabel, leadId) => {
        switch (actionLabel) {
            case "Edit":
                handleEdit(leadId)
                break
            case "Delete":
                const lead = tableData.find(l => l.id === leadId)
                handleDelete(leadId, lead?.client_name || lead?.name)
                break
            case "View History":
                router.push(`/leads/history/${leadId}`);
                break
            case "Send Email":
                const emailLead = tableData.find(lead => lead.id === leadId)
                handleEmailClick(emailLead)
                break
            case "Email History":
                router.push(`/leads/email-history/${leadId}`);
                break

            default:
                console.log("Unknown action:", actionLabel)
        }
    }

    const allColumns = [
        {
            accessorKey: 'created_by',
            header: () => <span title="Added By">Added By</span>,
            cell: (info) => {
                if (info.row.original.id === 'no-data') return ''
                const createdBy = info.getValue()
                return createdBy ? createdBy.name : 'N/A'
            }
        },

        {
            accessorKey: 'client_name',
            header: () => <span title="Customer Name">Client Name</span>,
            cell: (info) => {
                const name = info.getValue();
                const leadId = info.row.original.id;
              
                return (
                    <a
                        href="#"
                        className="hstack gap-3"
                        onClick={(e) => {
                            e.preventDefault()
                            router.push(`/leads/view/${leadId}`)
                        }}
                        style={{ cursor: 'pointer' }}
                        title={name}
                    >
                        <div className="text-white avatar-text user-avatar-text avatar-md">{name?.substring(0, 1)}</div>
                        <div>
                            <span className="text-truncate-1-line">{name}</span>
                        </div>
                    </a>
                )
            }
        },
        {
            accessorKey: 'company',
            header: () => <span title="Company Name">Company Name</span>,
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'phone',
            header: () => <span title="Phone Number">Phone No</span>,
            cell: (info) => {
                const leadId = info.row.original.id;
                const phone = info.getValue();
                return (
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault()
                            router.push(`/leads/view/${leadId}`)
                        }}
                        style={{ cursor: 'pointer' }}
                        title={phone}
                    >
                        {phone}
                    </a>
                )
            }
            // meta: {
            //     className: "fw-bold text-dark"
            // }
        },

        {
            accessorKey: 'email',
            header: () => <span title="Email Address">Email</span>,
            cell: (info) => {
                const leadId = info.row.original.id;
                const email = info.getValue();
                return (
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault()
                            router.push(`/leads/view/${leadId}`)
                        }}
                        style={{ cursor: 'pointer' }}
                        title={email}
                    >
                        {email}
                    </a>
                )
            }
        },

        {
            accessorKey: 'designation',
            header: () => <span title="Designation">Designation</span>,
            cell: (info) => {
                if (info.row.original.id === 'no-data') return ''
                const designation = info.getValue()
                return designation || 'N/A'
            }
        },

        {
            accessorKey: 'source',
            header: () => <span title="Lead Source">Source</span>,
            cell: (info) => info.getValue()
        },
        {
            accessorKey: 'lead_type',
            header: () => <span title="Provider Types">Type</span>,
            cell: (info) => {
                if (info.row.original.id === 'no-data') return ''
                const leadType = info.getValue()
                return leadType ? leadType.name : 'N/A'
            }
        },
        {
            accessorKey: 'actions',
            header: () => <span title="Actions">Actions</span>,
            cell: info => {
                if (info.row.original.id === 'no-data') return null
                return (
                    <div className="hstack gap-2 justify-content-end">
                        {isTrashed ? (
                            <a
                                href="#"
                                className="avatar-text avatar-md"
                                onClick={(e) => {
                                    e.preventDefault()
                                    handleRestore(info.row.original.id)
                                }}
                                title="Restore Lead"
                            >
                                <FiRefreshCw />
                            </a>
                        ) : (
                            <>
                                {/* Custom View and Invoice buttons for converted leads */}
                                {onViewClick && onInvoiceClick ? (
                                    <>
                                         <a
                                             href="#"
                                             className="avatar-text avatar-md"
                                             onClick={(e) => {
                                                 e.preventDefault()
                                                 router.push(`/leads/view/${info.row.original.id}`)
                                             }}
                                             title="View Lead"
                                         >
                                             <FiEye />
                                         </a>
                                        <button
                                            className="btn btn-sm btn-success"
                                            onClick={() => onInvoiceClick(info.row.original)}
                                            title="Generate Invoice"
                                        >
                                            <i className="bi bi-receipt me-1"></i>
                                            Invoice
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {allowedActions.includes('view') && (
                                            <a
                                                href="#"
                                                className="avatar-text avatar-md"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    router.push(`/leads/view/${info.row.original.id}`)
                                                }}
                                                title="View Lead"
                                            >
                                                <FiEye />
                                            </a>
                                        )}
                                        {allowedActions.some(action => ['edit', 'history', 'delete'].includes(action)) && getActionsForLead(info.row.original.id).length > 0 && (
                                            <Dropdown
                                                dropdownItems={getActionsForLead(info.row.original.id)}
                                                triggerClass='avatar-md'
                                                triggerPosition={"0,21"}
                                                triggerIcon={<FiMoreHorizontal />}
                                                onClick={(actionLabel) => handleDropdownClick(actionLabel, info.row.original.id)}
                                                id={info.row.original.id}
                                            />
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                )
            },
            meta: {
                headerClassName: 'text-end'
            }
        },
    ]

    // Filter out hidden columns
    const columns = allColumns.filter(column => !hiddenColumns.includes(column.accessorKey))
    return (
        <>
            <Table
                data={tableData}
                columns={columns}
                showPagination={false}
                enableRowSelection={!(isTrashed || showSerialNumbers)}
                onSelectionChange={onSelectionChange}
                onSearch={onSearch}
                showEntriesDropdown={showEntriesDropdown}
                disablePagination={true}
                customFilters={customFilters}
            />

            {/* Status Update Modal */}
            {showStatusModal && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Update Lead Status - {selectedLead?.client_name}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowStatusModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">Status</label>
                                    <SelectDropdown
                                        options={leadStatuses}
                                        selectedOption={leadStatuses.find(status => status.value === selectedStatusId) || null}
                                        onSelectOption={(option) => setSelectedStatusId(option?.value || '')}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Notes</label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        placeholder="Add notes about this status update..."
                                        value={statusNotes}
                                        onChange={(e) => setStatusNotes(e.target.value)}
                                    ></textarea>
                                </div>
                                {leadStatuses.find(status => status.value === selectedStatusId)?.label === 'follow up scheduled' && (
                                    <div className="mb-3">
                                        <label className="form-label">Follow-up Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={followupDate}
                                            onChange={(e) => setFollowupDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]} // Prevent past dates
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>
                                    Cancel
                                </button>
                                <button type="button" className="btn btn-primary" onClick={handleStatusSubmit}>
                                    Update Status
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showStatusModal && <div className="modal-backdrop fade show"></div>}

            {/* Email Send Modal */}
            {showEmailModal && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Send Email - {selectedEmailLead?.client_name}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowEmailModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">To</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={selectedEmailLead?.email || ''}
                                        readOnly
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Subject</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={emailSubject}
                                        onChange={(e) => setEmailSubject(e.target.value)}
                                        placeholder="Enter email subject"
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Message</label>
                                    <textarea
                                        className="form-control"
                                        rows="8"
                                        value={emailBody}
                                        onChange={(e) => setEmailBody(e.target.value)}
                                        placeholder="Enter your message"
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Attachments</label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        multiple
                                        onChange={handleFileChange}
                                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                                    />
                                    <small className="text-muted">Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF</small>
                                </div>
                                {emailAttachments.length > 0 && (
                                    <div className="mb-3">
                                        <label className="form-label">Attached Files:</label>
                                        <div className="border rounded p-2">
                                            {emailAttachments.map((file, index) => (
                                                <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="small">
                                                        📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => removeAttachment(index)}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowEmailModal(false)}
                                    disabled={sendingEmail}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleEmailSubmit}
                                    disabled={sendingEmail || !emailSubject.trim() || !emailBody.trim()}
                                >
                                    {sendingEmail ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                            Sending...
                                        </>
                                    ) : (
                                        'Send Email'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showEmailModal && <div className="modal-backdrop fade show"></div>}


        </>
    )
}

export default RowLeadsTable