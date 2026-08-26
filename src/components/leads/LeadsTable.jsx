'use client'
import React, { memo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Table from '@/components/shared/table/Table';
import { FiAlertOctagon, FiArchive, FiClock, FiEdit3, FiEye, FiMoreHorizontal, FiPrinter, FiTrash2, FiRefreshCw, FiStar, FiMail, FiPhone } from 'react-icons/fi'
import Dropdown from '@/components/shared/Dropdown';
import SelectDropdown from '@/components/shared/SelectDropdown';
import getIcon from '@/utils/getIcon';
import crmInstance from '@/utils/crmInstance';
import Swal from 'sweetalert2';
import { usePermissions } from '@/hooks/usePermissions';
import { API_BASE_URL } from '@/config/api';
import { encryptId } from "@/utils/encryptId";

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

// ── NEW: strip a stray leading apostrophe from imported phone/number values ──
// Excel (and some CSV imports) prefix numeric-looking text with a `'` to force
// text formatting — e.g. "'+1 865-386-6807". This only affects how the value
// is DISPLAYED (and used for click actions like call/lookup); it never
// mutates the underlying tableData, so nothing else downstream is affected.
const cleanNumberDisplay = (val) => {
    if (val === null || val === undefined) return val
    const str = String(val)
    return str.replace(/^'+/, '').trim()
}

// ── NEW: Hash-based status color system ──
// Instead of a hardcoded map of specific status names -> gradient,
// every status name gets a deterministic color from a fixed palette
// based on a hash of its name. Same name always => same color, and
// any new status added later automatically gets a distinct color
// without needing to touch this code.
const STATUS_COLORS = [
    { accent: '#22c55e', bg: 'rgba(34,197,94,.1)', tc: '#15803d' },
    { accent: '#06b6d4', bg: 'rgba(6,182,212,.1)', tc: '#0e7490' },
    { accent: '#8b5cf6', bg: 'rgba(139,92,246,.1)', tc: '#6d28d9' },
    { accent: '#f59e0b', bg: 'rgba(245,158,11,.1)', tc: '#b45309' },
    { accent: '#ef4444', bg: 'rgba(239,68,68,.1)', tc: '#b91c1c' },
    { accent: '#10b981', bg: 'rgba(16,185,129,.1)', tc: '#065f46' },
    { accent: '#ec4899', bg: 'rgba(236,72,153,.1)', tc: '#9d174d' },
    { accent: '#3b82f6', bg: 'rgba(59,130,246,.1)', tc: '#1d4ed8' },
    { accent: '#a855f7', bg: 'rgba(168,85,247,.1)', tc: '#7e22ce' },
    { accent: '#14b8a6', bg: 'rgba(20,184,166,.1)', tc: '#0f766e' },
    { accent: '#f97316', bg: 'rgba(249,115,22,.1)', tc: '#c2410c' },
    { accent: '#6366f1', bg: 'rgba(99,102,241,.1)', tc: '#4338ca' }
];

const hashStatusName = (name = '') => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const getStatusColor = (status = '') => {
    if (!status) {
        return { accent: '#94a3b8', bg: 'rgba(148,163,184,.1)', tc: '#475569' };
    }
    const index = hashStatusName(status.trim().toLowerCase()) % STATUS_COLORS.length;
    return STATUS_COLORS[index];
};

// ── NEW: Followup row-highlight helpers ──
// These are only ever consulted when `showFollowupDateColumn` is true
// (i.e. only on the Follow Up Leads page), so no other page/table that
// reuses LeadssTable is affected.
const getLeadFollowupDate = (lead) =>
    lead?.followup_date ?? lead?.follow_up_date ?? lead?.next_followup_date ?? null

// Returns 'overdue' | 'today' | 'upcoming' | null
const getFollowupStatus = (lead) => {
    const raw = getLeadFollowupDate(lead)
    if (!raw) return null
    try {
        const followupStr = new Date(raw).toISOString().split('T')[0]
        const todayStr = new Date().toISOString().split('T')[0]
        if (followupStr < todayStr) return 'overdue'
        if (followupStr === todayStr) return 'today'
        return 'upcoming'
    } catch {
        return null
    }
}

// Maps a lead to the CSS class its <tr> should get. 'today' and 'overdue'
// both get the red treatment since both need urgent attention; 'upcoming'
// gets a softer highlight.
const getFollowupRowClass = (lead) => {
    const status = getFollowupStatus(lead)
    if (status === 'today' || status === 'overdue') return 'lr-row-followup-today'
    if (status === 'upcoming') return 'lr-row-followup-upcoming'
    return ''
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


const LeadssTable = ({
    data = [],
    onDataUpdate,
    isTrashed = false,
    onSelectionChange,
    rowSelection,
    onRowSelectionChange,
    onSearch,
    leadStatuses = [],
    allowedActions = ['recordings', 'view', 'edit', 'history', 'delete', 'status'],
    showEntriesInfo = true,
    showEntriesDropdown = false,
    hiddenColumns = [],
    onViewClick,
    onInvoiceClick,
    onInvoiceListClick,
    customFilters,
    showSerialNumbers = false,
    isSelectAll = false,
    allSelectedIds = [],
    onStatusUpdateSuccess,
    // ✅ NEW: when provided, View/Edit open as popups (modals) in the parent
    // instead of navigating to a separate page. If not provided, the old
    // router.push behaviour is used automatically (safe fallback).
    onViewLead,
    onEditLead,
    showFollowupDateColumn = false,
}) => {
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
    const [companyId, setCompanyId] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('companyId')
        }
        return null
    })


    // Statuses jinke liye follow-up date chahiye
    const FOLLOWUP_REQUIRED_STATUSES = ['followup', 'inprogress']

    const normalizeLabel = (label) => {
        if (!label) return ''
        return label.toLowerCase().replace(/[\s\-_]/g, '')
    }

    const requiresFollowupDate = (label) => {
        const normalized = normalizeLabel(label)
        return FOLLOWUP_REQUIRED_STATUSES.some(s => normalized.includes(s))
    }

    const getSelectedStatus = (statusId) =>
        leadStatuses.find(status => String(status.value) === String(statusId))

    // Ensure router is ready before using it
    const [isRouterReady, setIsRouterReady] = useState(false)

    useEffect(() => {
        setIsRouterReady(true)
    }, [])

    useEffect(() => {
        setTableData(data)
    }, [data])

    // ✅ NEW: single place that decides "open the View popup" vs
    // "navigate to the view page" — used by every view trigger below.
    const handleView = (leadId) => {
        if (!leadId) {
            console.error('Lead ID is missing')
            return
        }
        if (onViewLead) {
            onViewLead(leadId)
            return
        }
        if (isRouterReady) {
            router.push(`/leads/view/${encryptId(leadId)}`)
        } else {
            console.error('Router is not ready')
        }
    }

    const handleEdit = (leadId) => {
        if (!leadId) {
            console.error('Lead ID is missing')
            return
        }
        if (onEditLead) {
            onEditLead(leadId)
            return
        }
        if (isRouterReady) {
            router.push(`/leads/edit/${encryptId(leadId)}`)
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

            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            📌 Lead Details
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            • Lead Status : ${lead.lead_status?.name || 'N/A'}
            • Provider Types   : ${lead.lead_type?.name || 'N/A'}
            • Company     : ${lead.company || 'N/A'}
            • Service     : ${Array.isArray(lead.service) ? lead.service.join(", ") : lead.service || 'N/A'}
            • Budget      : ${lead.budget || 'N/A'}
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

            const cid = companyId ? JSON.parse(companyId) : null
            if (!cid) {
                showSwal({
                    title: 'Error!',
                    text: 'Company ID not found. Please refresh the page and try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                })
                return
            }

            const response = await crmInstance.post(`/leads/email-history/${cid}`, formData, {
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

    const handleMakeCall = async (lead) => {
        if (!lead || !lead.phone) {
            showSwal({
                title: 'Error!',
                text: 'Phone number not found for this lead.',
                icon: 'error',
                confirmButtonText: 'OK'
            })
            return
        }

        try {
            const response = await fetch(`${API_BASE_URL}/ringcentral/make-call`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone_number: cleanNumberDisplay(lead.phone)
                })
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()

            if (data.status) {
                // Open RingCentral Web App in new tab
                const width = 400;
                const height = 600;

                // Bottom-left calculation
                const left = 20; // 20px margin from left
                const top = window.screen.height - height - 40; // 40px margin from bottom

                let ringCentralWindow = null;

                if (!ringCentralWindow || ringCentralWindow.closed) {
                    ringCentralWindow = window.open(
                        "https://app.ringcentral.com",
                        "ringcentral-dialer",
                        `width=400,height=600,top=${top},left=${left},resizable=yes`
                    );
                } else {
                    ringCentralWindow.focus();
                }

            } else {
                throw new Error(data.message || 'Failed to initiate call')
            }
        } catch (error) {
            console.error('Make call failed:', error)
            showSwal({
                title: 'Error!',
                text: error.message || 'Failed to initiate call. Please try again.',
                icon: 'error',
                confirmButtonText: 'OK'
            })
        }
    }

    const handleStatusSubmit = async () => {
        if (!selectedLead || !selectedStatusId) return

        try {
            const payload = {
                user_id: null, // Will be set by backend based on lead assignment
                leads_id: selectedLead.id,
                status_id: parseInt(selectedStatusId),
                note: statusNotes || null
            }
            // Add followup_date if status contains "follow up" and date is provided
            const selectedStatus = getSelectedStatus(selectedStatusId)
            if (requiresFollowupDate(selectedStatus?.label) && followupDate) {
                payload.followup_date = followupDate
            }

            const cid = companyId ? JSON.parse(companyId) : null
            if (!cid) {
                showSwal({
                    title: 'Error!',
                    text: 'Company ID not found. Please refresh the page and try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                })
                return
            }

            const response = await crmInstance.post(`/leads/${cid}/${selectedLead.id}/update-status-with-note`, payload)

            if (response.data && (response.data.status === true || response.status === 200)) {
                // Create followup notification if status contains "follow up"
                const selectedStatus = leadStatuses.find(status => status.value === selectedStatusId)
                if (selectedStatus && selectedStatus.label?.toLowerCase().includes('follow up')) {
                    try {
                        // Check if a followup notification already exists for this lead in the last 5 minutes
                        const existingNotifications = await crmInstance.get(`/followup-notifications/${cid}`)
                        const recentNotifications = existingNotifications.data.data.data || []
                        const recentFollowup = recentNotifications.find(n =>
                            n.lead_id === selectedLead.id &&
                            n.action === 'followup_reminder' &&
                            new Date(n.created_at) > new Date(Date.now() - 5 * 60 * 1000) // Within last 5 minutes
                        )

                        if (!recentFollowup) {
                            const followupData = {
                                user_id: selectedLead.assigned_to?.id || null,
                                lead_id: selectedLead.id,
                                action: 'followup_reminder',
                                message: `Follow-up reminder for lead: ${selectedLead.client_name || 'Unknown'} on ${new Date().toLocaleDateString()}`
                            }
                            console.log('Creating followup notification:', followupData, 'for company:', cid)
                            await crmInstance.post(`/followup-notifications/${cid}`, followupData)
                        }
                    } catch (followupError) {
                        console.error('Failed to create followup notification from table:', followupError)
                        // Don't fail the whole operation if followup creation fails
                    }
                }

                // Update the lead in the table data
                const updatedData = tableData.map(lead => {
                    if (lead.id === selectedLead.id) {
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

                // Call success callback if provided
                if (onStatusUpdateSuccess) {
                    onStatusUpdateSuccess()
                }

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
            const cid = companyId ? JSON.parse(companyId) : null
            if (!cid) {
                showSwal({
                    title: 'Error!',
                    text: 'Company ID not found. Please refresh the page and try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                })
                return
            }

            const response = await crmInstance.delete(`/leads/${cid}/${encryptId(leadId)}`)

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
            const cid = companyId ? JSON.parse(companyId) : null
            if (!cid) {
                showSwal({
                    title: 'Error!',
                    text: 'Company ID not found. Please refresh the page and try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                })
                return
            }

            const response = await crmInstance.delete(`/leads/${cid}/${encryptId(leadId)}/force-delete`);

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
                const cid = companyId ? JSON.parse(companyId) : null
                if (!cid) {
                    showSwal({
                        title: 'Error!',
                        text: 'Company ID not found. Please refresh the page and try again.',
                        icon: 'error',
                        confirmButtonText: 'OK'
                    })
                    return
                }

                const response = await crmInstance.post(`/leads/${cid}/${encryptId(leadId)}/restore`)

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
        // if (allowedActions.includes('history')) {
        //     actions.push({
        //         label: "View History",
        //         icon: <FiClock />,
        //         onClick: () => {
        //             router.push(`/leads/history/${encryptId(leadId)}`)
        //         },
        //     })
        // }

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
                onClick: () => {
                    const cid = companyId ? JSON.parse(companyId) : null
                    if (cid) {
                        router.push(`/leads/${encryptId(leadId)}/email-history/${encryptId(cid)}`)
                    } else {
                        showSwal({
                            title: 'Error!',
                            text: 'Company ID not found. Please refresh the page and try again.',
                            icon: 'error',
                            confirmButtonText: 'OK'
                        })
                    }
                },
            })
        }

        // Make Call action
        // if (allowedActions.includes('call')) {
        //     actions.push({
        //         label: "Make Call",
        //         icon: <FiPhone />,
        //         onClick: () => handleMakeCall(tableData.find(lead => lead.id === leadId)),
        //     })
        // }

        // if (allowedActions.includes('email-history')) {
        //     actions.push({
        //         label: "Recordings",
        //         icon: <FiMail />,
        //         onClick: () => router.push(`/leads/recordings`),
        //     })
        // }




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
                const cid = companyId ? JSON.parse(companyId) : null
                if (cid) {
                    router.push(`/leads/history/${encryptId(cid)}/${encryptId(leadId)}`);
                } else {
                    showSwal({
                        title: 'Error!',
                        text: 'Company ID not found. Please refresh the page and try again.',
                        icon: 'error',
                        confirmButtonText: 'OK'
                    })
                }
                break
            case "Send Email":
                const emailLead = tableData.find(lead => lead.id === leadId)
                handleEmailClick(emailLead)
                break
            case "Email History":
                const emailHistoryCid = companyId ? JSON.parse(companyId) : null
                if (emailHistoryCid) {
                    router.push(`/leads/${encryptId(leadId)}/email-history/${encryptId(emailHistoryCid)}`);
                } else {
                    showSwal({
                        title: 'Error!',
                        text: 'Company ID not found. Please refresh the page and try again.',
                        icon: 'error',
                        confirmButtonText: 'OK'
                    })
                }
                break

            case "Recordings":
                const recordingsLead = tableData.find(l => l.id === leadId)
                const phoneNumber = recordingsLead?.phone
                if (phoneNumber) {
                    router.push(`/leads/recording/detail/${encodeURIComponent(cleanNumberDisplay(phoneNumber))}`);
                } else {
                    showSwal({
                        title: 'Error!',
                        text: 'Phone number not found for this lead.',
                        icon: 'error',
                        confirmButtonText: 'OK'
                    })
                }
                break

            case "Make Call":
                const callLead = tableData.find(lead => lead.id === leadId)
                handleMakeCall(callLead)
                break

            default:
                console.log("Unknown action:", actionLabel)
        }
    }

    const allColumns = [
        ...((isTrashed || showSerialNumbers) ? [{
            accessorKey: 'serial',
            header: () => 'S.No',
            cell: ({ row }) => row.index + 1,
            meta: {
                headerClassName: 'width-30',
            },
        }] : [{
            accessorKey: 'id',
            header: ({ table }) => {
                const checkboxRef = React.useRef(null);

                useEffect(() => {
                    if (checkboxRef.current) {
                        checkboxRef.current.indeterminate = table.getIsSomeRowsSelected();
                    }
                }, [table.getIsSomeRowsSelected()]);

                return (
                    <input
                        type="checkbox"
                        className="custom-table-checkbox"
                        ref={checkboxRef}
                        checked={isSelectAll || table.getIsAllRowsSelected()}
                        onChange={table.getToggleAllRowsSelectedHandler()}
                    />
                );
            },
            cell: ({ row }) => {
                const isChecked = isSelectAll ? allSelectedIds.includes(row.original.id) : row.getIsSelected();
                return (
                    <input
                        type="checkbox"
                        className="custom-table-checkbox"
                        checked={isChecked}
                        disabled={!row.getCanSelect()}
                        onChange={row.getToggleSelectedHandler()}
                    />
                );
            },
            meta: {
                headerClassName: 'width-30',
            },
        }]),

        // ── Status column (2nd column, right after checkbox) ──
        {
            accessorKey: 'lead_status',
            header: () => <span title="Lead Status">Status</span>,
            cell: (info) => {
                const status = info.getValue()
                if (!status) return 'N/A'

                let statusName = 'N/A'
                if (typeof status === 'object' && status.name) {
                    statusName = status.name
                } else if (typeof status === 'string' || typeof status === 'number') {
                    const found = leadStatuses.find(s => s.value == status)
                    statusName = found ? found.label : status
                }

                const colors = getStatusColor(statusName)

                return (
                    <span
                        className="badge d-inline-flex align-items-center justify-content-center text-center"
                        style={{
                            background: colors.bg,
                            color: colors.tc,
                            border: `1px solid ${colors.accent}`,
                            padding: '7px',
                            borderRadius: '0.375rem',
                            fontSize: '0.70rem',
                            fontWeight: '500',
                            minWidth: '90px',
                            maxWidth: '150px',
                            display: 'inline-block',
                            wordWrap: 'break-word',
                            whiteSpace: 'normal',
                            lineHeight: '1.2'
                        }}
                        title={statusName}
                    >
                        {statusName}
                    </span>
                )
            }
        },

        // ── Follow Up Date column — placed right after Status, ONLY on the
        // Follow Up page (only there is showFollowupDateColumn=true passed in).
        // Shows a colored badge: red = today/overdue, cyan = upcoming. ──
        ...(showFollowupDateColumn ? [{
            accessorFn: row => row.followup_date ?? row.follow_up_date ?? row.next_followup_date ?? '',
            id: 'followup_date',
            header: () => <span title="Follow Up Date">Follow Up Date</span>,
            cell: ({ row }) => {
                const lead = row.original
                const d = getLeadFollowupDate(lead)
                if (!d) return 'N/A'

                let formatted = 'N/A'
                try {
                    formatted = new Date(d).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC'
                    })
                } catch {
                    return 'N/A'
                }

                const status = getFollowupStatus(lead)
                const badgeStyle =
                    status === 'today' || status === 'overdue'
                        ? { background: 'rgba(239,68,68,.15)', color: '#b91c1c', border: '1px solid #ef4444' }
                        : status === 'upcoming'
                            ? { background: 'rgba(6,182,212,.12)', color: '#0e7490', border: '1px solid #06b6d4' }
                            : { background: 'rgba(148,163,184,.1)', color: '#475569', border: '1px solid #94a3b8' }

                return (
                    <span
                        className="badge d-inline-flex align-items-center justify-content-center"
                        style={{
                            ...badgeStyle,
                            padding: '6px 9px',
                            borderRadius: '0.375rem',
                            fontSize: '0.70rem',
                            fontWeight: '600',
                            whiteSpace: 'nowrap'
                        }}
                        title={status === 'today' ? "Today's followup" : status === 'overdue' ? 'Overdue followup' : status === 'upcoming' ? 'Upcoming followup' : ''}
                    >
                        {formatted}
                    </span>
                )
            },
            enableGlobalFilter: true,
        }] : []),

        {
            accessorKey: 'client_name',
            header: () => <span title="Customer Name">Client Name</span>,
            cell: (info) => {
                const name = info.getValue();
                const leadId = info.row.original.id;
                if (name === 'Data not found') {
                    return <div style={{ color: 'red', textAlign: 'center', fontWeight: 'bold', padding: '10px' }}>Data not found</div>
                }
                return (
                    <a
                        href="#"
                        className="hstack gap-3"
                        onClick={(e) => {
                            e.preventDefault()
                            handleView(leadId)
                        }}
                        style={{ cursor: 'pointer' }}
                        title={name}
                    >
                        {/* <div className="text-white avatar-text user-avatar-text avatar-md">{name?.substring(0, 1)}</div> */}
                        <div>
                            <span className="text-truncate-1-line">{name}</span>
                        </div>
                    </a>
                )
            }
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
                            handleView(leadId)
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
            accessorKey: 'phone',
            header: () => <span title="Phone Number">Phone</span>,
            cell: (info) => {
                const leadId = info.row.original.id;
                // ── strip stray leading apostrophe from imported values ──
                const phone = cleanNumberDisplay(info.getValue());
                return (
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault()
                           // router.push(`/leads/recording/detail/${encodeURIComponent(phone)}`)
                        }}
                        style={{ cursor: 'pointer' }}
                        title={phone}
                    >
                        {phone}
                    </a>
                )
            }
        },
        {
            accessorFn: row => row.primary_number ?? '',
            id: 'primary_number',
            header: () => <span title="Direct Number">Direct No</span>,
            // ── strip stray leading apostrophe from imported values ──
            cell: ({ getValue }) => cleanNumberDisplay(getValue()) || 'N/A',
            enableGlobalFilter: true,
        },

        {
            accessorFn: row => row.reference_number ?? '',
            id: 'reference_number',
            header: () => <span title="HQ Number">HQ Number</span>,
            // ── strip stray leading apostrophe from imported values ──
            cell: ({ getValue }) => cleanNumberDisplay(getValue()) || 'N/A',
            enableGlobalFilter: true,
        },


        // ✅ Permission based column (SAFE WAY)
        ...(hasPermission('raw-leads')
            ? [{
                accessorFn: row => row.assigned_to?.name ?? 'N/A',
                id: 'assigned_to',
                header: () => <span title="Assigned To">Assign to</span>,
                enableGlobalFilter: true,
            }]
            : []),

        {
            accessorFn: row => row.lead_type?.name ?? 'N/A',
            id: 'lead_type',
            header: () => <span title="Provider Types">Provider Types</span>,
            cell: info => info.getValue(),
            enableGlobalFilter: true,
        },

        {
            accessorFn: row => row.state ?? '',
            id: 'state',
            header: () => <span title="State">State</span>,
            cell: ({ getValue }) => getValue() || 'N/A',
            enableGlobalFilter: true,
        },


        {
            accessorFn: row => row.designation ?? '',
            id: 'designation',
            header: () => <span title="Designation">Designation</span>,
            cell: ({ getValue }) => getValue() || 'N/A',
            enableGlobalFilter: true,
        },
        {
            accessorFn: row => row.source ?? '',
            id: 'source',
            header: () => <span title="Lead Source">Lead Source</span>,
            cell: ({ getValue }) => getValue() || 'N/A',
            enableGlobalFilter: true,
        },



        {
            accessorKey: 'user_assign_date',
            header: () => <span title="User Assigned Date">Assigned Date</span>,
            cell: (info) => {
                const assignDate = info.getValue()
                if (!assignDate) return 'N/A'
                return new Date(assignDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    timeZone: 'UTC',  // 👈 ye add karo
                    day: 'numeric'
                })
            }
        },
        {
            accessorKey: 'updated_at',
            id: 'updated_at',
            header: () => <span title="Last Worked Date">Last Worked Date</span>,
            cell: ({ getValue }) => {
                const updatedDate = getValue()
                if (!updatedDate) return 'N/A'
                return new Date(updatedDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC'   // 👈 ye add karo
                })
            }
        },

        {
            accessorKey: 'created_at',
            header: () => <span title="Lead Age">Lead Age</span>,
            cell: (info) => {
                const createdAt = info.getValue()
                if (!createdAt) return 'N/A'

                try {
                    const createdDate = new Date(createdAt)
                    const today = new Date()
                    const diffTime = today - createdDate
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

                    if (diffDays === 0) return 'Today'
                    if (diffDays === 1) return '1 day'
                    return `${diffDays} days`
                } catch {
                    return 'N/A'
                }
            }
        },
        // ── UPDATED: Actions column — static icons (no hover-reveal hack),
        // sticky to the right edge via meta.className / meta.headerClassName
        // which Table.jsx already supports natively. No shared files touched. ──
        {
            accessorKey: 'actions',
            header: () => <span title="Actions">Actions</span>,
            cell: info => {
                if (info.row.original.id === 'no-data') return null;
                const lead = info.row.original
                return (
                    <div className="lr-action-cell">
                        {isTrashed ? (
                            <div className="lr-action-btn" title="Restore Lead" onClick={() => handleRestore(lead.id)}>
                                <FiRefreshCw size={14} />
                            </div>
                        ) : onViewClick && onInvoiceClick ? (
                            <div className="lr-action-btn" title="View Lead" onClick={() => handleView(lead.id)}>
                                <FiEye size={14} />
                            </div>
                        ) : (
                            <>
                                {(allowedActions.includes('status') || allowedActions.includes('status-update')) && hasPermission('update-status') && (
                                    <div className="lr-action-btn" title="Update Status" onClick={() => handleStatusClick(lead)}>
                                        <FiStar size={14} />
                                    </div>
                                )}

                                {allowedActions.includes('view') && (
                                    <div className="lr-action-btn" title="View Lead" onClick={() => handleView(lead.id)}>
                                        <FiEye size={14} />
                                    </div>
                                )}

                                {allowedActions.some(action => ['edit', 'history', 'delete'].includes(action)) && getActionsForLead(lead.id).length > 0 && (
                                    <Dropdown
                                        dropdownItems={getActionsForLead(lead.id)}
                                        triggerClass='avatar-md lr-action-btn'
                                        triggerPosition={"0,21"}
                                        triggerIcon={<FiMoreHorizontal size={14} />}
                                        onClick={(actionLabel) => handleDropdownClick(actionLabel, lead.id)}
                                        id={lead.id}
                                    />
                                )}
                            </>
                        )}
                    </div>
                )
            },
            meta: {
                headerClassName: 'text-end lr-th-actions',
                className: 'lr-td-actions'
            }
        },
    ]

    // Filter out hidden columns
    const columns = allColumns.filter(column => !hiddenColumns.includes(column.accessorKey))
    return (
        <>
            {/* ── UPDATED style block ──
                All selectors below are scoped either to .lr-embedded-table
                (a wrapper only this component renders) or to classes
                (.lr-action-cell / .lr-action-btn / .lr-th-actions / .lr-td-actions /
                .lr-row-followup-today / .lr-row-followup-upcoming) that ONLY exist on
                columns/rows produced by this file. No other page using the shared
                Table.jsx is affected. */}
            <style>{`
                .lr-embedded-table .dataTables_filter,
                .lr-embedded-table .dataTables_length {
                    display: none;
                }
                .lr-embedded-table table.dataTable {
                    border-collapse: separate;
                    border-spacing: 0;
                }
                .lr-embedded-table thead th {
                    background: #f8f9fa;
                    font-size: 11px;
                    font-weight: 600;
                    color: #6c757d;
                    text-transform: uppercase;
                    letter-spacing: 0.4px;
                    white-space: nowrap;
                    border-bottom: 0.5px solid rgba(0,0,0,0.08);
                    position: sticky;
                    top: 0;
                    z-index: 3;
                }
                /* Scrollable body so the sticky header has a boundary to stick within.
                   Adjust max-height as needed for your layout. */
                .lr-embedded-table .table-responsive,
                .lr-embedded-table .dataTables_wrapper .table-responsive {
                    max-height: 65vh;
                    overflow-y: auto;
                }
                .lr-embedded-table tbody td {
                    font-size: 13px;
                    color: #212529;
                    vertical-align: middle;
                    border-bottom: 0.5px solid rgba(0,0,0,0.06);
                }
                .lr-embedded-table .table-hover tbody tr:hover {
                    background-color: #f8fafc;
                }

                /* ── Followup row highlighting — only applies when the Follow Up
                   Date column is on, i.e. only on the Follow Up Leads page ── */
                .lr-embedded-table tbody tr.lr-row-followup-today {
                    background-color: rgba(239, 68, 68, 0.12) !important;
                    border-left: 3px solid #ef4444;
                }
                .lr-embedded-table .table-hover tbody tr.lr-row-followup-today:hover {
                    background-color: rgba(239, 68, 68, 0.18) !important;
                }
                .lr-embedded-table tbody tr.lr-row-followup-upcoming {
                    background-color: rgba(6, 182, 212, 0.10) !important;
                    border-left: 3px solid #06b6d4;
                }
                .lr-embedded-table .table-hover tbody tr.lr-row-followup-upcoming:hover {
                    background-color: rgba(6, 182, 212, 0.16) !important;
                }

                .lr-action-cell {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    justify-content: flex-end;
                }
                .lr-action-btn {
                    width: 28px;
                    height: 28px;
                    border-radius: 7px;
                    border: 0.5px solid rgba(0, 0, 0, 0.12);
                    background: #f8f9fa;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #6c757d;
                    transition: all 0.15s;
                }
                .lr-action-btn:hover {
                    background: #0DCAF0;
                    color: #fff;
                    border-color: #0DCAF0;
                }
                .lr-th-actions,
                .lr-td-actions {
                    position: sticky;
                    right: 0;
                    z-index: 2;
                    width: 120px;
                    min-width: 120px;
                    background-color: #fff;
                    box-shadow: -6px 0 6px -6px rgba(0, 0, 0, 0.15);
                }
                .lr-th-actions {
                    background-color: #f8f9fa;
                    z-index: 5;
                }
            `}</style>
            <div className="lr-embedded-table">
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
                    getRowClassName={showFollowupDateColumn ? getFollowupRowClass : undefined}
                />
            </div>

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
                                {requiresFollowupDate(getSelectedStatus(selectedStatusId)?.label) && (
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

export default LeadssTable