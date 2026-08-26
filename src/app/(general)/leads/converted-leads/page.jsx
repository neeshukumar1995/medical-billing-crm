'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import ConvertedLeadsHeader from '@/components/leads/ConvertedLeadsHeader'
import LeadssTable from '@/components/leads/LeadsTable'
import Footer from '@/components/shared/Footer'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Loading from '@/components/shared/Loading'
import SelectDropdown from '@/components/shared/SelectDropdown'
import crmInstance from '@/utils/crmInstance'
import Swal from 'sweetalert2'
import { usePermissions } from '@/hooks/usePermissions';
import { useSearchParams, useRouter } from 'next/navigation'
import { FiFilter, FiSearch, FiArrowLeft } from 'react-icons/fi'
import dynamic from 'next/dynamic'
import '@/styles/leadsReport.css'

// ── View / Edit modals — loaded client-side only, same pattern as RawLeads page ──
const LeadViewModal = dynamic(() => import('@/components/leads/LeadViewModal'), { ssr: false })
const LeadEditModal = dynamic(() => import('@/components/leads/LeadEditModal'), { ssr: false })

const page = () => {
    const { hasPermission } = usePermissions()
    const router = useRouter()
    const searchParams = useSearchParams()
    const cardBodyRef = useRef(null)
    const [filterYear, setFilterYear] = useState(() => {
        const param = searchParams.get('year')
        return param ? parseInt(param) : ''
    })
    const [filterMonth, setFilterMonth] = useState(() => {
        const param = searchParams.get('month')
        return param ? parseInt(param) : ''
    })
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [selectedLeads, setSelectedLeads] = useState([])
    const [currentPage, setCurrentPage] = useState(1)
    const [leadStatuses, setLeadStatuses] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [filterTypeId, setFilterTypeId] = useState('')
    const [filterState, setFilterState] = useState('')
    const [filterDesignation, setFilterDesignation] = useState('')
    const [filterUserId, setFilterUserId] = useState('')
    const [leadTypes, setLeadTypes] = useState([])
    const [states, setStates] = useState([])
    const [designations, setDesignations] = useState([])
    const [users, setUsers] = useState([])
    const [bulkStatusId, setBulkStatusId] = useState('')
    const [bulkStatusNotes, setBulkStatusNotes] = useState('')
    const [showBulkStatusModal, setShowBulkStatusModal] = useState(false)
    const [totalLeads, setTotalLeads] = useState(0)
    const [assignedLeads, setAssignedLeads] = useState(0)
    const [unassignedLeads, setUnassignedLeads] = useState(0)
    const [convertedLeads, setConvertedLeads] = useState(0)
    const [filteredAssigned, setFilteredAssigned] = useState(0)
    const [showInvoiceModal, setShowInvoiceModal] = useState(false)
    const [selectedLeadForInvoice, setSelectedLeadForInvoice] = useState(null)
    const [invoiceAmount, setInvoiceAmount] = useState('')
    const [sellingPrice, setSellingPrice] = useState('')
    const [invoiceDescription, setInvoiceDescription] = useState('')
    const [invoiceDueDate, setInvoiceDueDate] = useState('')
    const [generatingInvoice, setGeneratingInvoice] = useState(false)
    const [showInvoiceDetailsModal, setShowInvoiceDetailsModal] = useState(false)
    const [generatedInvoice, setGeneratedInvoice] = useState(null)
    const [editingInvoice, setEditingInvoice] = useState(false)
    const [showInvoiceListModal, setShowInvoiceListModal] = useState(false)
    const [selectedLeadForInvoiceList, setSelectedLeadForInvoiceList] = useState(null)
    const [invoiceList, setInvoiceList] = useState([])
    const [invoiceCount, setInvoiceCount] = useState(0)
    const [loadingInvoiceList, setLoadingInvoiceList] = useState(false)
    const [isSuperAdmin, setIsSuperAdmin] = useState(false)
    const [editInvoiceAmount, setEditInvoiceAmount] = useState('')
    const [editInvoiceDescription, setEditInvoiceDescription] = useState('')
    const [editInvoiceDueDate, setEditInvoiceDueDate] = useState('')
    const [editInvoiceStatus, setEditInvoiceStatus] = useState('')
    const [invoiceStatuses] = useState([
        { value: 'Converted', label: 'Converted' },
        { value: 'paid', label: 'Paid' },
        { value: 'overdue', label: 'Overdue' }
    ])
    const [showEditLeadModal, setShowEditLeadModal] = useState(false)
    const [selectedLeadForEdit, setSelectedLeadForEdit] = useState(null)
    const [editSellingPrice, setEditSellingPrice] = useState('')
    const [updatingLead, setUpdatingLead] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [companyId, setCompanyId] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('companyId')
        }
        return null
    })

    // ── purely visual — sidebar show/hide, same pattern as the Leads Report page ──
    const [sidebarOpen, setSidebarOpen] = useState(true)

    // ── View / Edit lead popup state — same pattern as RawLeads page ──
    const [showViewModal, setShowViewModal] = useState(false)
    const [viewLeadId, setViewLeadId] = useState(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editLeadId, setEditLeadId] = useState(null)

    const handleOpenView = useCallback((leadId) => {
        setViewLeadId(leadId)
        setShowViewModal(true)
    }, [])
    const handleCloseView = useCallback(() => {
        setShowViewModal(false)
        setViewLeadId(null)
    }, [])
    const handleOpenEdit = useCallback((leadId) => {
        setEditLeadId(leadId)
        setShowEditModal(true)
    }, [])
    const handleCloseEdit = useCallback(() => {
        setShowEditModal(false)
        setEditLeadId(null)
    }, [])

    // Fetch lead statuses
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

    // Fetch Provider Typess for filter
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

    // Fetch states for filter
    const fetchStates = async () => {
        try {
            const cid = companyId ? JSON.parse(companyId) : null
            if (!cid) return

            const response = await crmInstance.get(`/converted-leads/states/${cid}`)
            const data = response.data.data || []
            setStates(data)
        } catch (error) {
            console.error('Error fetching states:', error)
        }
    }

    // Fetch designations for filter
    const fetchDesignations = async () => {
        try {
            const cid = companyId ? JSON.parse(companyId) : null
            if (!cid) return

            const response = await crmInstance.get(`/converted-leads/designation/${cid}`)
            const data = response.data.data || []
            setDesignations(data)
        } catch (error) {
            console.error('Error fetching designations:', error)
        }
    }

    // Fetch counts
    const fetchCounts = async () => {
        try {
            const cid = companyId ? JSON.parse(companyId) : null
            if (!cid) return

            const response = await crmInstance.get(`/leads/counts/${cid}`)
            const data = response.data.data || {}
            setTotalLeads(data.total_leads || 0)
            setAssignedLeads(data.assigned_leads || 0)
            setUnassignedLeads(data.unassigned_leads || 0)
            setConvertedLeads(data.converted_leads || 0)
        } catch (error) {
            console.error('Error fetching counts:', error)
            // If counts API fails, try to get count from converted leads API
            try {
                const countResponse = await crmInstance.get(`/leads/converted-leads/${cid}?page=1&per_page=1`)
                if (countResponse.data.status && countResponse.data.data) {
                    // Since we can't get total count easily, set a placeholder or keep existing
                    // The converted leads count will be updated when leads are fetched
                }
            } catch (countError) {
                console.error('Error fetching converted leads count:', countError)
            }
        }
    }

    // Fetch users for filter - users with converted leads
    const fetchUsers = async () => {
        try {
            const cid = companyId ? JSON.parse(companyId) : null
            if (!cid) return

            const response = await crmInstance.get(`/converted-leads/users/${cid}`)

            if (response.data.success) {
                const usersData = response.data.data || []

                const userOptions = Array.isArray(usersData)
                    ? usersData.map(user => ({
                        value: String(user.value),
                        label: user.label.split(' (')[0], // Remove role part
                        avatar: user.label ? user.label.charAt(0).toUpperCase() : 'U'
                    }))
                    : []

                setUsers(userOptions)
            } else {
                setUsers([])
            }
        } catch (error) {
            console.error('Error fetching users:', error)
            setUsers([])
        }
    }

    // Fetch converted leads count
    const fetchConvertedLeadsCount = async () => {
        try {
            const cid = companyId ? JSON.parse(companyId) : null
            if (!cid) return

            // Get count by fetching all pages
            let allLeads = []
            let page = 1
            let hasMore = true

            while (hasMore) {
                const response = await crmInstance.get(`/leads/converted-leads/${cid}?page=${page}&per_page=1000`)
                if (response.data.status) {
                    const leads = response.data.data || []
                    allLeads = [...allLeads, ...leads]
                    hasMore = response.data.has_more || false
                    page++
                } else {
                    hasMore = false
                }
            }

            setConvertedLeads(allLeads.length)
        } catch (error) {
            console.error('Error fetching converted leads count:', error)
        }
    }

    // Fetch converted leads function using master filter API
    const fetchLeads = useCallback(async (page = 1, append = false) => {
        try {
            if (page === 1) {
                setLoading(true)
                setError(null)
            } else {
                setLoadingMore(true)
            }

            const cid = companyId ? JSON.parse(companyId) : null
            if (!cid) return

            // Build params for master filter API
            const params = {
                page,
                per_page: 10,
                sort_by: 'id',
                sort_order: 'desc'
            }

            // Add filters
            if (filterTypeId) params.lead_type_id = filterTypeId
            if (filterState) params.state = filterState
            if (filterDesignation) params.designation = filterDesignation
            if (filterUserId) params.assigned_to = filterUserId
            if (searchTerm) params.search = searchTerm
            if (filterYear) params.year = filterYear
            if (filterMonth) params.month = filterMonth

            const response = await crmInstance.get(`/converted-leads/master-filter/${cid}`, { params })

            if (response.data.success) {
                const paginationData = response.data.data
                const newLeads = paginationData.data || []

                if (append) {
                    setLeads(prevLeads => {
                        const combined = [...prevLeads, ...newLeads]
                        // Remove duplicates based on id
                        const unique = combined.filter((lead, index, self) =>
                            index === self.findIndex(l => l.id === lead.id)
                        )
                        return unique
                    })
                } else {
                    setLeads(newLeads)
                    setFilteredAssigned(newLeads.length)
                }

                setHasMore(paginationData.current_page < paginationData.last_page)
                setCurrentPage(page)
                setError(null) // Clear any previous errors on successful load
            } else {
                // No data found
                if (!append) {
                    setLeads([])
                }
                setHasMore(false)
                setCurrentPage(page)
            }
        } catch (error) {
            console.error('Error fetching converted leads:', error)
            setError('Failed to load converted leads. Please try again.')
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }, [filterTypeId, filterState, filterDesignation, filterUserId, searchTerm, companyId, filterYear, filterMonth])

    // Fetch lead statuses, types, states, designations, and users on mount
    useEffect(() => {
        if (companyId) {
            fetchLeadStatuses()
            fetchLeadTypes()
            fetchStates()
            fetchDesignations()
            fetchUsers()
            fetchCounts()
            fetchConvertedLeadsCount()
        }
    }, [companyId])

    // Check if user is superadmin
    useEffect(() => {
        const user = localStorage.getItem("user")
        if (user) {
            const parsedUser = JSON.parse(user)
            setIsSuperAdmin(parsedUser.role === "superadmin")
        }
    }, [])

    // Initial load
    useEffect(() => {
        if (companyId) {
            fetchLeads(1, false)
        }
    }, [companyId])

    // Handle search - only trigger if search term is not empty and has changed
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setCurrentPage(1)
            setLeads([])
            setHasMore(true)
            fetchLeads(1, false)
        }, 500)

        return () => clearTimeout(timeoutId)
    }, [searchTerm])

    // Handle filter type change
    useEffect(() => {
        setCurrentPage(1)
        setLeads([])
        setHasMore(true)
        fetchLeads(1, false)
    }, [filterTypeId])

    // Handle filter state change
    useEffect(() => {
        setCurrentPage(1)
        setLeads([])
        setHasMore(true)
        fetchLeads(1, false)
    }, [filterState])

    // Handle filter designation change
    useEffect(() => {
        setCurrentPage(1)
        setLeads([])
        setHasMore(true)
        fetchLeads(1, false)
    }, [filterDesignation])

    // Handle filter user change
    useEffect(() => {
        setCurrentPage(1)
        setLeads([])
        setHasMore(true)
        fetchLeads(1, false)
    }, [filterUserId])

    // Handle year or month filter change
    useEffect(() => {
        setCurrentPage(1)
        setLeads([])
        setHasMore(true)
        fetchLeads(1, false)
    }, [filterYear, filterMonth])

    // Update filters from URL params
    useEffect(() => {
        const yearParam = searchParams.get('year')
        const monthParam = searchParams.get('month')
        setFilterYear(yearParam ? parseInt(yearParam) : '')
        setFilterMonth(monthParam ? parseInt(monthParam) : '')
    }, [searchParams])

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value)
    }

    // Load more data function
    const loadMoreLeads = useCallback(() => {
        if (!loadingMore && hasMore) {
            const nextPage = currentPage + 1
            setCurrentPage(nextPage)
            fetchLeads(nextPage, true)
        }
    }, [loadingMore, hasMore, currentPage])

    // Scroll event handler
    const handleScroll = useCallback(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight

        // Load more when user is 50px from bottom
        if (scrollTop + windowHeight >= documentHeight - 50) {
            loadMoreLeads()
        }
    }, [loadMoreLeads])

    // Handle invoice generation for a specific lead - opens modal
    const handleGenerateInvoice = (lead, cid) => {
        setSelectedLeadForInvoice(lead)
        setInvoiceAmount(lead.budget || '') // Pre-fill with lead budget if available
        setSellingPrice(lead.selling_price || '') // Pre-fill with selling price if available
        setInvoiceDescription(`${lead.description || ''} - ${lead.client_name}`);
        setInvoiceDueDate('') // Optional
        setShowInvoiceModal(true)
    }

    // Handle invoice list for a specific lead - opens modal
    const handleInvoiceList = async (lead, cid) => {
        setSelectedLeadForInvoiceList(lead)
        setLoadingInvoiceList(true)
        setShowInvoiceListModal(true)
        try {
            const response = await crmInstance.get(`/leads/${lead.id}/invoices/${cid}`)
            if (response.data.status) {
                const invoices = response.data.data || []
                // Map status to "Converted" if it's "pending"
                const mappedInvoices = invoices.map(invoice => ({
                    ...invoice,
                    status: invoice.status === 'pending' ? 'Converted' : invoice.status
                }))
                setInvoiceList(mappedInvoices)
                setInvoiceCount(response.data.count || 0)
            }
        } catch (error) {
            console.error('Error fetching invoice list:', error)
            setInvoiceList([])
            setInvoiceCount(0)
        } finally {
            setLoadingInvoiceList(false)
        }
    }

    // Handle invoice form submission
    const handleInvoiceSubmit = async () => {
        if (!selectedLeadForInvoice || !invoiceAmount.trim()) {
            Swal.fire({
                title: 'Error!',
                text: 'Please enter the invoice amount.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Validate amount
        const amount = parseFloat(invoiceAmount);
        if (isNaN(amount) || amount <= 0) {
            Swal.fire({
                title: 'Error!',
                text: 'Please enter a valid amount greater than 0.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Validate due date if provided
        if (invoiceDueDate) {
            const dueDate = new Date(invoiceDueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to start of day

            if (dueDate <= today) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Due date must be after today.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
                return;
            }
        }

        try {
            setGeneratingInvoice(true);

            const sellingPriceValue = sellingPrice.trim() ? parseFloat(sellingPrice) : (selectedLeadForInvoice.selling_price ? parseFloat(selectedLeadForInvoice.selling_price) : amount);

            const requestData = {
                amount: amount,
                selling_price: sellingPriceValue,
                description: invoiceDescription.trim() || null,
                due_date: invoiceDueDate || null
            };

            const cid = companyId ? JSON.parse(companyId) : null
            if (!cid) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Company ID not found. Please refresh the page and try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                })
                return
            }

            const response = await crmInstance.post(`/leads/${selectedLeadForInvoice.id}/invoices/${cid}`, requestData);

            if (response.data.status) {
                // Store the generated invoice data with selling price fallback
                const invoiceData = response.data.data;
                // If API doesn't return selling_price, use the one we sent or from lead
                if (!invoiceData.selling_price) {
                    invoiceData.selling_price = sellingPriceValue;
                }
                // If API doesn't return date_of_booking, use it from the lead
                if (!invoiceData.date_of_booking && selectedLeadForInvoice.date_of_booking) {
                    invoiceData.date_of_booking = selectedLeadForInvoice.date_of_booking;
                }

                // Update the lead's selling price in the table if it was entered and wasn't previously set
                if (sellingPrice.trim() && !selectedLeadForInvoice.selling_price) {
                    setLeads(prevLeads =>
                        prevLeads.map(lead =>
                            lead.id === selectedLeadForInvoice.id
                                ? { ...lead, selling_price: parseFloat(sellingPrice) }
                                : lead
                        )
                    );
                }

                setGeneratedInvoice(invoiceData);

                // Close the generation modal and open the details modal
                setShowInvoiceModal(false);
                setShowInvoiceDetailsModal(true);

                // Reset form
                setSelectedLeadForInvoice(null);
                setInvoiceAmount('');
                setSellingPrice('');
                setInvoiceDescription('');
                setInvoiceDueDate('');
            } else {
                throw new Error(response.data.message || 'Failed to generate invoice');
            }
        } catch (error) {
            console.error('Invoice generation failed:', error);
            console.error('Error response:', error.response);
            console.error('Error response data:', error.response?.data);

            let errorMessage = 'Failed to generate invoice. Please try again.';

            if (error.response?.status === 400) {
                errorMessage = error.response.data.message || 'Invoice can only be generated for converted leads.';
            } else if (error.response?.status === 422) {
                // Log validation errors
                console.error('Validation errors:', error.response.data);
                if (error.response.data.errors) {
                    const validationErrors = Object.values(error.response.data.errors).flat();
                    errorMessage = validationErrors.join(', ');
                } else {
                    errorMessage = 'Please check your input data.';
                }
            }

            Swal.fire({
                title: 'Error!',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        } finally {
            setGeneratingInvoice(false);
        }
    }

    // Handle edit invoice
    const handleEditInvoice = () => {
        // Amount should be the budget from the lead data, Selling Price should be selling_price field
        setEditInvoiceAmount(selectedLeadForInvoice?.budget?.toString() || generatedInvoice.amount?.toString() || '')
        setEditInvoiceDescription(generatedInvoice.description || '')
        setEditInvoiceDueDate(generatedInvoice.due_date || '')
        setEditInvoiceStatus(generatedInvoice.status || 'Converted')

        // Safely handle selling price conversion - this should be the selling_price field
        const sellingPrice = generatedInvoice.amount || generatedInvoice.selling_price;
        const sellingPriceStr = (typeof sellingPrice === 'number' && !isNaN(sellingPrice))
            ? sellingPrice.toString()
            : (sellingPrice ? sellingPrice.toString() : '');
        setEditSellingPrice(sellingPriceStr);

        setEditingInvoice(true)
    }

    // Handle edit lead selling price
    const handleEditLeadSellingPrice = (lead) => {
        setSelectedLeadForEdit(lead)
        setEditSellingPrice(lead.selling_price || '')
        setShowEditLeadModal(true)
    }

    // Handle update lead selling price
    const handleUpdateLeadSellingPrice = async () => {
        if (!selectedLeadForEdit || !editSellingPrice.trim()) {
            Swal.fire({
                title: 'Error!',
                text: 'Please enter a selling price.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            return;
        }

        const price = parseFloat(editSellingPrice);
        if (isNaN(price) || price <= 0) {
            Swal.fire({
                title: 'Error!',
                text: 'Please enter a valid selling price greater than 0.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            return;
        }

        try {
            setUpdatingLead(true);

            const response = await crmInstance.put(`/leads/${selectedLeadForEdit.id}`, {
                selling_price: price
            });

            if (response.data.status) {
                // Update the lead in the list
                setLeads(prevLeads =>
                    prevLeads.map(lead =>
                        lead.id === selectedLeadForEdit.id
                            ? { ...lead, selling_price: price }
                            : lead
                    )
                );

                setShowEditLeadModal(false);
                setSelectedLeadForEdit(null);
                setEditSellingPrice('');

                Swal.fire({
                    title: 'Success!',
                    text: 'Selling price updated successfully',
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
            } else {
                throw new Error(response.data.message || 'Failed to update selling price');
            }
        } catch (error) {
            console.error('Update failed:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to update selling price. Please try again.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        } finally {
            setUpdatingLead(false);
        }
    }

    // Handle update invoice
    const handleUpdateInvoice = async () => {
        const sellingPriceValue = parseFloat(editSellingPrice);
        if (isNaN(sellingPriceValue) || sellingPriceValue <= 0) {
            Swal.fire({
                title: 'Error!',
                text: 'Please enter a valid selling price greater than 0.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Validate client name
        if (!generatedInvoice.lead?.client_name?.trim()) {
            Swal.fire({
                title: 'Error!',
                text: 'Client name is required.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            return;
        }

        if (editInvoiceDueDate) {
            const dueDate = new Date(editInvoiceDueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dueDate <= today) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Due date must be after today.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
                return;
            }
        }

        try {
            const updateData = {
                selling_price: sellingPriceValue,
                description: editInvoiceDescription.trim() || null,
                due_date: editInvoiceDueDate || null,
                status: editInvoiceStatus,
                // Client information fields
                client_name: generatedInvoice.lead?.client_name?.trim() || null,
                company: generatedInvoice.lead?.company?.trim() || null,
                email: generatedInvoice.lead?.email?.trim() || null,
                phone: generatedInvoice.lead?.phone?.trim() || null,
                address: generatedInvoice.lead?.address?.trim() || null,
                city: generatedInvoice.lead?.city?.trim() || null,
                state: generatedInvoice.lead?.state?.trim() || null,
                country: generatedInvoice.lead?.country?.trim() || null,
                vat: generatedInvoice.lead?.vat?.trim() || null
            };

            const cid = companyId ? JSON.parse(companyId) : null
            if (!cid) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Company ID not found. Please refresh the page and try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                })
                return
            }

            const response = await crmInstance.put(`/invoices/${generatedInvoice.id}/${cid}`, updateData);

            if (response.data.status) {
                // Update the invoice state with the response data
                const updatedInvoice = response.data.data;

                // Update the invoice state - controller returns updated invoice with lead data
                setGeneratedInvoice(updatedInvoice);

                // Update the lead in the table with updated information
                if (updatedInvoice.lead) {
                    setLeads(prevLeads =>
                        prevLeads.map(lead => {
                            if (lead.id === updatedInvoice.lead.id) {
                                return {
                                    ...lead,
                                    ...updatedInvoice.lead, // Update all lead fields
                                    selling_price: parseFloat(updatedInvoice.lead.selling_price || updatedInvoice.amount),
                                    amount: parseFloat(updatedInvoice.amount)
                                };
                            }
                            return lead;
                        })
                    );
                }

                setEditingInvoice(false);
                Swal.fire({
                    title: 'Success!',
                    text: 'Invoice and client information updated successfully',
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
            } else {
                throw new Error(response.data.message || 'Failed to update invoice');
            }
        } catch (error) {
            console.error('Update failed:', error);
            console.error('Error response:', error.response?.data);

            let errorMessage = 'Failed to update invoice. Please try again.';
            if (error.response?.status === 422) {
                // Handle validation errors
                const validationErrors = error.response.data.errors;
                if (validationErrors) {
                    const errorMessages = Object.values(validationErrors).flat();
                    errorMessage = errorMessages.join(', ');
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            Swal.fire({
                title: 'Error!',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    }

    // Handle download invoice
    const handleDownloadInvoice = async () => {
        try {
            const cid = companyId ? JSON.parse(companyId) : null
            if (!cid) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Company ID not found. Please refresh the page and try again.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                })
                return
            }

            const response = await crmInstance.get(`/invoices/${generatedInvoice.id}/download/${cid}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice-${generatedInvoice.invoice_number}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to download invoice. Please try again.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    }

    // Handle data updates (for delete operations)
    const handleDataUpdate = useCallback((updatedData) => {
        setLeads(updatedData)
    }, [])

    // Handle selection changes
    const handleSelectionChange = useCallback((selectedRows) => {
        setSelectedLeads(selectedRows)
    }, [])

    // Handle bulk draft
    const handleBulkDraft = useCallback(async () => {
        if (selectedLeads.length === 0) {
            return
        }

        const result = await Swal.fire({
            title: 'Draft Selected Leads?',
            text: `Are you sure you want to draft ${selectedLeads.length} selected lead(s)?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Draft Them',
            cancelButtonText: 'Cancel'
        })

        if (!result.isConfirmed) return

        try {
            const leadIds = selectedLeads.map(lead => lead.id)
            const response = await crmInstance.post('/leads/bulk-draft', { lead_ids: leadIds, status: "deleted" })

            if (response.status >= 200 && response.status < 300) {
                // Remove drafted leads from the list
                const updatedLeads = leads.filter(lead => !leadIds.includes(lead.id))
                setLeads(updatedLeads)
                setSelectedLeads([])

                await Swal.fire({
                    title: 'Success!',
                    text: `Successfully drafted ${selectedLeads.length} lead(s)`,
                    icon: 'success',
                    confirmButtonText: 'OK'
                })
            } else {
                throw new Error('Bulk draft failed')
            }
        } catch (error) {
            console.error('Bulk draft error:', error)
            await Swal.fire({
                title: 'Error!',
                text: 'Failed to draft selected leads. Please try again.',
                icon: 'error',
                confirmButtonText: 'OK'
            })
        }
    }, [selectedLeads, leads])

    // Handle bulk status selection (opens modal)
    const handleBulkStatusSelect = useCallback((leadStatusId) => {
        if (selectedLeads.length === 0) {
            return
        }
        setBulkStatusId(leadStatusId)
        setBulkStatusNotes('')
        setShowBulkStatusModal(true)
    }, [selectedLeads])

    // Handle bulk status update with notes
    const handleBulkStatusUpdate = useCallback(async () => {
        if (selectedLeads.length === 0 || !bulkStatusId) {
            return
        }

        const selectedStatus = leadStatuses.find(status => status.value === bulkStatusId)
        if (!selectedStatus) return

        try {
            const leadIds = selectedLeads.map(lead => lead.id)
            const response = await crmInstance.post('/leads/bulk-update-status', {
                lead_ids: leadIds,
                lead_status_id: parseInt(bulkStatusId),
                note: bulkStatusNotes || null
            })

            if (response.status >= 200 && response.status < 300) {
                // Update the leads in the list with new status
                const updatedLeads = leads.map(lead => {
                    if (leadIds.includes(lead.id)) {
                        return { ...lead, lead_status: { id: parseInt(bulkStatusId), name: selectedStatus.label } }
                    }
                    return lead
                })
                setLeads(updatedLeads)

                await Swal.fire({
                    title: 'Success!',
                    text: `Successfully updated status of ${selectedLeads.length} lead(s)`,
                    icon: 'success',
                    confirmButtonText: 'OK'
                })
                // Clear modal and selection
                setShowBulkStatusModal(false)
                setSelectedLeads([]);
                setBulkStatusId('')
                setBulkStatusNotes('')
            } else {
                throw new Error('Bulk status update failed')
            }
        } catch (error) {
            console.error('Bulk status update error:', error)
            await Swal.fire({
                title: 'Error!',
                text: 'Failed to update status of selected leads. Please try again.',
                icon: 'error',
                confirmButtonText: 'OK'
            })
        }
    }, [selectedLeads, leads, leadStatuses, bulkStatusId, bulkStatusNotes])

    // Add scroll event listener
    useEffect(() => {
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [handleScroll])

    // ── purely presentational — builds the filter-summary text shown in the toolbar ──
    const buildFilterSummary = () => {
        const parts = []
        if (filterTypeId) {
            const t = leadTypes.find(x => x.value === filterTypeId)
            if (t) parts.push(`Type: ${t.label}`)
        }
        if (filterState) parts.push(`State: ${filterState}`)
        if (filterDesignation) parts.push(`Designation: ${filterDesignation}`)
        if (isSuperAdmin && filterUserId) {
            const u = users.find(x => x.value === filterUserId)
            if (u) parts.push(`User: ${u.label}`)
        }
        if (searchTerm.trim()) parts.push(`Search: ${searchTerm}`)
        return parts.length ? parts.join(' | ') : 'All Converted Leads'
    }

    return (
        <PermissionGuard permission="view-leads">
            <PageHeader>
                <ConvertedLeadsHeader assignedLeads={assignedLeads} unassignedLeads={unassignedLeads} convertedLeads={convertedLeads} filteredAssigned={filteredAssigned} hasFilter={filterTypeId || filterState || filterDesignation || filterUserId} />
            </PageHeader>
            <div className='main-content'>

                {/* ── Toolbar ── */}
                <div className="lr-toolbar">
                    <div className="lr-toolbar-left">
                        <button
                            type="button"
                            className="lr-toolbar-btn"
                            onClick={() => router.back()}
                        >
                            <FiArrowLeft size={14} />
                            Back
                        </button>
                        <button
                            type="button"
                            className={`lr-toolbar-btn ${sidebarOpen ? 'lr-active' : ''}`}
                            onClick={() => setSidebarOpen(o => !o)}
                        >
                            <FiFilter size={14} />
                            Filter
                        </button>
                        <div className="lr-toolbar-divider" />
                        <span className="lr-page-info">
                            {selectedLeads.length > 0 ? `${selectedLeads.length} selected` : buildFilterSummary()}
                        </span>
                    </div>

                    <div className="lr-toolbar-right">
                        <div className="lr-toolbar-search-wrap">
                            <span className="lr-toolbar-search-icon"><FiSearch size={14} /></span>
                            <input
                                type="text"
                                className="lr-toolbar-search-input"
                                placeholder="Search leads..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                        </div>
                    </div>
                </div>

                <div className="lr-layout">

                    {/* ── Sidebar filter panel ── */}
                    <div className={`lr-sidebar ${sidebarOpen ? '' : 'lr-hidden'}`}>
                        <h4 className="lr-sidebar-title">Filter Leads by</h4>

                        <div className="lr-filter-group">
                            <label className="lr-filter-label">Filter by Type</label>
                            <SelectDropdown
                                options={[{ value: '', label: 'Select Type' }, ...leadTypes]}
                                selectedOption={leadTypes.find(type => type.value === filterTypeId) ? { value: filterTypeId, label: leadTypes.find(type => type.value === filterTypeId)?.label || 'Select Type' } : { value: '', label: 'Select Type' }}
                                defaultSelect={{ value: '', label: 'Select Type' }}
                                onSelectOption={(option) => setFilterTypeId(option.value)}
                            />
                        </div>

                        <div className="lr-filter-group">
                            <label className="lr-filter-label">Filter by State</label>
                            <SelectDropdown
                                options={[{ value: '', label: 'Select State' }, ...states.map(state => ({ value: state, label: state }))]}
                                selectedOption={states.find(state => state === filterState) ? { value: filterState, label: filterState } : { value: '', label: 'Select State' }}
                                defaultSelect={{ value: '', label: 'Select State' }}
                                onSelectOption={(option) => setFilterState(option.value)}
                            />
                        </div>

                        <div className="lr-filter-group">
                            <label className="lr-filter-label">Filter by Designation</label>
                            <SelectDropdown
                                options={[{ value: '', label: 'Select Designation' }, ...designations.map(designation => ({ value: designation, label: designation }))]}
                                selectedOption={designations.find(designation => designation === filterDesignation) ? { value: filterDesignation, label: filterDesignation } : { value: '', label: 'Select Designation' }}
                                defaultSelect={{ value: '', label: 'Select Designation' }}
                                onSelectOption={(option) => setFilterDesignation(option.value)}
                            />
                        </div>

                        {isSuperAdmin && (
                            <div className="lr-filter-group">
                                <label className="lr-filter-label">Filter by User</label>
                                <SelectDropdown
                                    options={[{ value: '', label: 'Select User' }, ...users]}
                                    selectedOption={users.find(user => user.value === filterUserId) ? { value: filterUserId, label: users.find(user => user.value === filterUserId)?.label || 'Select User' } : { value: '', label: 'Select User' }}
                                    defaultSelect={{ value: '', label: 'Select User' }}
                                    onSelectOption={(option) => setFilterUserId(option.value)}
                                />
                            </div>
                        )}

                        <button
                            className="lr-sidebar-reset-btn"
                            type="button"
                            onClick={() => {
                                setFilterTypeId('')
                                setFilterState('')
                                setFilterDesignation('')
                                setFilterUserId('')
                                setSearchTerm('')
                                setCurrentPage(1)
                                setLeads([])
                                setHasMore(true)
                                setSelectedLeads([])
                                fetchLeads(1, false)
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="1 4 1 10 7 10" />
                                <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
                            </svg>
                            Reset Filters
                        </button>
                    </div>

                    {/* ── Table ── */}
                    <div className="lr-content">
                        <div className="lr-table-card">
                            <div style={{ padding: '14px' }} ref={cardBodyRef}>
                                {error && <div className="alert alert-danger">{error}</div>}

                                {loading && (
                                    <div className="d-flex justify-content-center align-items-center py-5">
                                        <Loading />
                                    </div>
                                )}

                                {!loading && (
                                    <>
                                        <LeadssTable
                                            data={leads}
                                            onDataUpdate={handleDataUpdate}
                                            onSelectionChange={handleSelectionChange}
                                            leadStatuses={leadStatuses}
                                            allowedActions={['view', 'edit']}
                                            showSerialNumbers={true}
                                            onViewClick={(leadId) => {
                                                // Open the View modal instead of navigating away
                                                handleOpenView(leadId);
                                            }}
                                            onViewLead={(leadId) => {
                                                handleOpenView(leadId);
                                            }}
                                            onEditLead={(leadId) => {
                                                handleOpenEdit(leadId);
                                            }}
                                            onInvoiceClick={(lead) => {
                                                // Handle invoice generation for this specific lead
                                                handleGenerateInvoice(lead, companyId ? JSON.parse(companyId) : null);
                                            }}
                                            onInvoiceListClick={(lead) => {
                                                // Handle invoice list for this specific lead
                                                handleInvoiceList(lead, companyId ? JSON.parse(companyId) : null);
                                            }}
                                            onEditSellingPriceClick={(lead) => {
                                                // Handle selling price edit for this specific lead
                                                handleEditLeadSellingPrice(lead);
                                            }}
                                        />

                                        {/* Loading more spinner (same as users page) */}
                                        {loadingMore && (
                                            <div className="text-center py-4">
                                                <div className="d-flex justify-content-center align-items-center">
                                                    <div className="spinner-border spinner-border-sm" role="status">
                                                        <span className="visually-hidden">Loading...</span>
                                                    </div>
                                                    <span className="ms-2">Loading more leads...</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* No more data indicator (same as users page) */}
                                        {!loadingMore && !hasMore && leads.length > 0 && (
                                            <div className="text-center py-4 text-muted">
                                                <small>No more leads to load</small>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />

            {/* Bulk Status Update Modal */}



            {/* Invoice Generation Modal */}
            {showInvoiceModal && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Generate Lead Invoice - {selectedLeadForInvoice?.client_name}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowInvoiceModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Budget <span className="text-danger">*</span></label>
                                        <div className="input-group">
                                            <span className="input-group-text">₹</span>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={invoiceAmount}
                                                onChange={(e) => setInvoiceAmount(e.target.value)}
                                                placeholder="Enter budget amount"
                                                min="0"
                                                step="0.01"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Selling Price</label>
                                        <div className="input-group">
                                            <span className="input-group-text">₹</span>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={sellingPrice}
                                                onChange={(e) => setSellingPrice(e.target.value)}
                                                placeholder="Enter selling price"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        value={invoiceDescription}
                                        onChange={(e) => setInvoiceDescription(e.target.value)}
                                        placeholder="Enter invoice description"
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Due Date</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={invoiceDueDate}
                                        onChange={(e) => setInvoiceDueDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    <small className="text-muted">Optional: Leave empty for no due date</small>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowInvoiceModal(false)}
                                    disabled={generatingInvoice}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={handleInvoiceSubmit}
                                    disabled={generatingInvoice || !invoiceAmount.trim()}
                                >
                                    {generatingInvoice ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-receipt me-2"></i>
                                            Generate Invoice
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Details Modal */}
            {showInvoiceDetailsModal && generatedInvoice && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Invoice Details - {generatedInvoice.invoice_number}</h5>
                                <button type="button" className="btn-close" onClick={() => { setShowInvoiceDetailsModal(false); setEditingInvoice(false); setGeneratedInvoice(null); }}></button>
                            </div>
                            <div className="modal-body">
                                {editingInvoice ? (
                                    <div className="invoice-edit-form">
                                        {/* Invoice Information Section */}
                                        <div className="card border-primary mb-4">
                                            <div className="card-header bg-primary text-white">
                                                <h6 className="card-title mb-0">
                                                    <i className="bi bi-receipt me-2"></i>
                                                    Invoice Information
                                                </h6>
                                            </div>
                                            <div className="card-body">
                                                <div className="row">
                                                    <div className="col-md-6 mb-3">
                                                        <label className="form-label fw-bold">
                                                            <i className="bi bi-cash-stack me-2 text-info"></i>
                                                            Selling Price <span className="text-danger">*</span>
                                                        </label>
                                                        <div className="input-group">
                                                            <span className="input-group-text bg-info text-white">₹</span>
                                                            <input
                                                                type="number"
                                                                className="form-control form-control-lg"
                                                                value={editSellingPrice}
                                                                onChange={(e) => setEditSellingPrice(e.target.value)}
                                                                min="0"
                                                                step="0.01"
                                                                required
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6 mb-3">
                                                        <label className="form-label fw-bold">
                                                            <i className="bi bi-calendar-event me-2 text-primary"></i>
                                                            Due Date
                                                        </label>
                                                        <input
                                                            type="date"
                                                            className="form-control form-control-lg"
                                                            value={editInvoiceDueDate}
                                                            onChange={(e) => setEditInvoiceDueDate(e.target.value)}
                                                            min={new Date().toISOString().split('T')[0]}
                                                        />
                                                    </div>
                                                    <div className="col-md-6 mb-3">
                                                        <label className="form-label fw-bold">
                                                            <i className="bi bi-flag me-2 text-warning"></i>
                                                            Status
                                                        </label>
                                                        <select
                                                            className="form-select form-select-lg"
                                                            value={editInvoiceStatus}
                                                            onChange={(e) => setEditInvoiceStatus(e.target.value)}
                                                        >
                                                            {invoiceStatuses.map(status => (
                                                                <option key={status.value} value={status.value}>
                                                                    {status.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="col-12 mb-3">
                                                        <label className="form-label fw-bold">
                                                            <i className="bi bi-file-text me-2 text-info"></i>
                                                            Description
                                                        </label>
                                                        <textarea
                                                            className="form-control form-control-lg"
                                                            rows="3"
                                                            value={editInvoiceDescription}
                                                            onChange={(e) => setEditInvoiceDescription(e.target.value)}
                                                            placeholder="Enter invoice description..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Client Information Section - Full Edit Form */}
                                        <div className="card border-info">
                                            <div className="card-header bg-info text-white">
                                                <h6 className="card-title mb-0">
                                                    <i className="bi bi-person-circle me-2"></i>
                                                    Client Information
                                                </h6>
                                            </div>
                                            <div className="card-body">
                                                <div className="row">
                                                    <div className="col-md-6 mb-3">
                                                        <label className="form-label fw-bold">Client Name <span className="text-danger">*</span></label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={generatedInvoice.lead?.client_name || ''}
                                                            onChange={(e) => {
                                                                // Update lead data in invoice
                                                                setGeneratedInvoice(prev => ({
                                                                    ...prev,
                                                                    lead: {
                                                                        ...prev.lead,
                                                                        client_name: e.target.value
                                                                    }
                                                                }));
                                                            }}
                                                            placeholder="Enter client name"
                                                        />
                                                    </div>
                                                    <div className="col-md-6 mb-3">
                                                        <label className="form-label fw-bold">Email</label>
                                                        <input
                                                            type="email"
                                                            className="form-control"
                                                            value={generatedInvoice.lead?.email || ''}
                                                            onChange={(e) => {
                                                                setGeneratedInvoice(prev => ({
                                                                    ...prev,
                                                                    lead: {
                                                                        ...prev.lead,
                                                                        email: e.target.value
                                                                    }
                                                                }));
                                                            }}
                                                            placeholder="Enter email"
                                                        />
                                                    </div>
                                                    <div className="col-md-6 mb-3">
                                                        <label className="form-label fw-bold">Phone</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={generatedInvoice.lead?.phone || ''}
                                                            onChange={(e) => {
                                                                setGeneratedInvoice(prev => ({
                                                                    ...prev,
                                                                    lead: {
                                                                        ...prev.lead,
                                                                        phone: e.target.value
                                                                    }
                                                                }));
                                                            }}
                                                            placeholder="Enter phone"
                                                        />
                                                    </div>
                                                    <div className="col-md-6 mb-3">
                                                        <label className="form-label fw-bold">Company</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={generatedInvoice.lead?.company || ''}
                                                            onChange={(e) => {
                                                                setGeneratedInvoice(prev => ({
                                                                    ...prev,
                                                                    lead: {
                                                                        ...prev.lead,
                                                                        company: e.target.value
                                                                    }
                                                                }));
                                                            }}
                                                            placeholder="Enter company"
                                                        />
                                                    </div>
                                                    <div className="col-md-6 mb-3">
                                                        <label className="form-label fw-bold">Address</label>
                                                        <textarea
                                                            className="form-control"
                                                            rows="2"
                                                            value={generatedInvoice.lead?.address || ''}
                                                            onChange={(e) => {
                                                                setGeneratedInvoice(prev => ({
                                                                    ...prev,
                                                                    lead: {
                                                                        ...prev.lead,
                                                                        address: e.target.value
                                                                    }
                                                                }));
                                                            }}
                                                            placeholder="Enter address"
                                                        />
                                                    </div>
                                                    <div className="col-md-6 mb-3">
                                                        <label className="form-label fw-bold">City</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={generatedInvoice.lead?.city || ''}
                                                            onChange={(e) => {
                                                                setGeneratedInvoice(prev => ({
                                                                    ...prev,
                                                                    lead: {
                                                                        ...prev.lead,
                                                                        city: e.target.value
                                                                    }
                                                                }));
                                                            }}
                                                            placeholder="Enter city"
                                                        />
                                                    </div>
                                                    <div className="col-md-6 mb-3">
                                                        <label className="form-label fw-bold">State</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={generatedInvoice.lead?.state || ''}
                                                            onChange={(e) => {
                                                                setGeneratedInvoice(prev => ({
                                                                    ...prev,
                                                                    lead: {
                                                                        ...prev.lead,
                                                                        state: e.target.value
                                                                    }
                                                                }));
                                                            }}
                                                            placeholder="Enter state"
                                                        />
                                                    </div>
                                                    <div className="col-md-6 mb-3">
                                                        <label className="form-label fw-bold">Country</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={generatedInvoice.lead?.country || ''}
                                                            onChange={(e) => {
                                                                setGeneratedInvoice(prev => ({
                                                                    ...prev,
                                                                    lead: {
                                                                        ...prev.lead,
                                                                        country: e.target.value
                                                                    }
                                                                }));
                                                            }}
                                                            placeholder="Enter country"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="invoice-details">
                                        {/* Invoice Header Card */}
                                        <div className="card border-primary mb-4">
                                            <div className="card-header bg-primary text-white">
                                                <h5 className="card-title mb-0" style={{ color: 'white' }}>
                                                    <i className="bi bi-receipt me-2"></i>
                                                    Invoice Information
                                                </h5>
                                            </div>
                                            <div className="card-body">
                                                <div className="row g-3">
                                                    <div className="col-md-6">
                                                        <div className="p-3 bg-light rounded">
                                                            <small className="text-muted d-block">Invoice Number</small>
                                                            <strong className="fs-5 text-primary">{generatedInvoice.invoice_number}</strong>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="p-3 bg-light rounded">
                                                            <small className="text-muted d-block">Selling Price</small>
                                                            <strong className="fs-6 text-info">₹{generatedInvoice.amount || generatedInvoice.selling_price}</strong>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="p-3 bg-light rounded">
                                                            <small className="text-muted d-block">GST @18%</small>
                                                            <strong className="fs-6 text-warning">₹{((generatedInvoice.amount || generatedInvoice.selling_price) * 0.18).toFixed(2)}</strong>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="p-3 bg-light rounded">
                                                            <small className="text-muted d-block">Total Amount (incl. GST)</small>
                                                            <strong className="fs-5 text-success">₹{((generatedInvoice.amount || generatedInvoice.selling_price) * 1.18).toFixed(2)}</strong>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-4">
                                                        <div className="p-3 bg-light rounded">
                                                            <small className="text-muted d-block">Issued Date</small>
                                                            <strong>{new Date(generatedInvoice.issued_date).toLocaleDateString()}</strong>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-4">
                                                        <div className="p-3 bg-light rounded">
                                                            <small className="text-muted d-block">Booking Date</small>
                                                            <strong>{generatedInvoice.date_of_booking ? new Date(generatedInvoice.date_of_booking).toLocaleDateString() : 'N/A'}</strong>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-4">
                                                        <div className="p-3 bg-light rounded">
                                                            <small className="text-muted d-block">Due Date</small>
                                                            <strong>{generatedInvoice.due_date ? new Date(generatedInvoice.due_date).toLocaleDateString() : 'N/A'}</strong>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-4">
                                                        <div className="p-3 bg-light rounded">
                                                            <small className="text-muted d-block">Status</small>
                                                            <span className={`badge fs-6 ${generatedInvoice.status === 'paid' ? 'bg-success' : generatedInvoice.status === 'overdue' ? 'bg-danger' : 'bg-warning'}`}>
                                                                {generatedInvoice.status || 'Converted'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Client Information Card */}
                                        <div className="card border-info mb-4">
                                            <div className="card-header bg-info text-white">
                                                <h5 className="card-title mb-0" style={{ color: 'white' }}>
                                                    <i className="bi bi-person-circle me-2"></i>
                                                    Client Information
                                                </h5>
                                            </div>
                                            <div className="card-body">
                                                <div className="row g-3">
                                                    <div className="col-md-6">
                                                        <div className="d-flex align-items-center">
                                                            <i className="bi bi-person text-primary me-2"></i>
                                                            <div>
                                                                <small className="text-muted d-block">Client Name</small>
                                                                <strong>{generatedInvoice.lead?.client_name || 'N/A'}</strong>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="d-flex align-items-center">
                                                            <i className="bi bi-building text-primary me-2"></i>
                                                            <div>
                                                                <small className="text-muted d-block">Company</small>
                                                                <strong>{generatedInvoice.lead?.company || 'N/A'}</strong>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="d-flex align-items-center">
                                                            <i className="bi bi-envelope text-primary me-2"></i>
                                                            <div>
                                                                <small className="text-muted d-block">Email</small>
                                                                <strong>{generatedInvoice.lead?.email || 'N/A'}</strong>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="d-flex align-items-center">
                                                            <i className="bi bi-telephone text-primary me-2"></i>
                                                            <div>
                                                                <small className="text-muted d-block">Phone</small>
                                                                <strong>{generatedInvoice.lead?.phone || 'N/A'}</strong>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="d-flex align-items-center">
                                                            <i className="bi bi-globe text-primary me-2"></i>
                                                            <div>
                                                                <small className="text-muted d-block">Source</small>
                                                                <strong>{generatedInvoice.lead?.source || 'N/A'}</strong>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="d-flex align-items-center">
                                                            <i className="bi bi-tools text-primary me-2"></i>
                                                            <div>
                                                                <small className="text-muted d-block">Service</small>
                                                                <strong>{generatedInvoice.lead?.service || 'N/A'}</strong>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Address Section */}
                                                <div className="mt-3 p-3 bg-light rounded">
                                                    <h6 className="text-primary mb-2">
                                                        <i className="bi bi-geo-alt me-2"></i>
                                                        Address Details
                                                    </h6>
                                                    <div className="row g-2">
                                                        <div className="col-12">
                                                            <small className="text-muted">Address:</small>
                                                            <div><strong>{generatedInvoice.lead?.address || 'N/A'}</strong></div>
                                                        </div>
                                                        <div className="col-md-4">
                                                            <small className="text-muted">City:</small>
                                                            <div><strong>{generatedInvoice.lead?.city || 'N/A'}</strong></div>
                                                        </div>
                                                        <div className="col-md-4">
                                                            <small className="text-muted">State:</small>
                                                            <div><strong>{generatedInvoice.lead?.state || 'N/A'}</strong></div>
                                                        </div>
                                                        <div className="col-md-4">
                                                            <small className="text-muted">Country:</small>
                                                            <div><strong>{generatedInvoice.lead?.country || 'N/A'}</strong></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description Card */}
                                        {generatedInvoice.description && (
                                            <div className="card border-secondary">
                                                <div className="card-header bg-secondary text-white">
                                                    <h6 className="card-title mb-0">
                                                        <i className="bi bi-file-text me-2"></i>
                                                        Description
                                                    </h6>
                                                </div>
                                                <div className="card-body">
                                                    <p className="mb-0">{generatedInvoice.description}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                {editingInvoice ? (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => setEditingInvoice(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-success"
                                            onClick={handleUpdateInvoice}
                                        >
                                            <i className="bi bi-check me-2"></i>
                                            Save Changes
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleEditInvoice}
                                        >
                                            <i className="bi bi-pencil me-2"></i>
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-success"
                                            onClick={handleDownloadInvoice}
                                        >
                                            <i className="bi bi-download me-2"></i>
                                            Download PDF
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => { setShowInvoiceDetailsModal(false); setGeneratedInvoice(null); }}
                                        >
                                            Close
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Invoice List Modal */}
            {showInvoiceListModal && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Invoice List - {selectedLeadForInvoiceList?.client_name} ({invoiceCount} invoices)</h5>
                                <button type="button" className="btn-close" onClick={() => { setShowInvoiceListModal(false); setInvoiceList([]); setInvoiceCount(0); setSelectedLeadForInvoiceList(null); }}></button>
                            </div>
                            <div className="modal-body">
                                {loadingInvoiceList ? (
                                    <div className="d-flex justify-content-center align-items-center py-4">
                                        <div className="spinner-border spinner-border-sm" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <span className="ms-2">Loading invoices...</span>
                                    </div>
                                ) : invoiceList.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-muted">No invoices found for this lead.</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-striped">
                                            <thead>
                                                <tr>
                                                    <th>Invoice Number</th>
                                                    <th>Amount</th>
                                                    <th>Status</th>
                                                    <th>Issued Date</th>
                                                    <th>Due Date</th>
                                                    <th>Created By</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {invoiceList.map((invoice) => (
                                                    <tr key={invoice.id}>
                                                        <td>{invoice.invoice_number}</td>
                                                        <td>₹{invoice.amount}</td>
                                                        <td>
                                                            <span className={`badge ${invoice.status === 'paid' ? 'bg-success' : invoice.status === 'overdue' ? 'bg-danger' : 'bg-warning'}`}>
                                                                {invoice.status}
                                                            </span>
                                                        </td>
                                                        <td>{new Date(invoice.issued_date).toLocaleDateString()}</td>
                                                        <td>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</td>
                                                        <td>{invoice.created_by?.name || 'N/A'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => { setShowInvoiceListModal(false); setInvoiceList([]); setInvoiceCount(0); setSelectedLeadForInvoiceList(null); }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Lead Selling Price Modal */}
            {showEditLeadModal && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Edit Selling Price - {selectedLeadForEdit?.client_name}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowEditLeadModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label fw-bold">
                                        <i className="bi bi-cash me-2 text-success"></i>
                                        Selling Price <span className="text-danger">*</span>
                                    </label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-success text-white">₹</span>
                                        <input
                                            type="number"
                                            className="form-control form-control-lg"
                                            value={editSellingPrice}
                                            onChange={(e) => setEditSellingPrice(e.target.value)}
                                            placeholder="Enter selling price"
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowEditLeadModal(false)}
                                    disabled={updatingLead}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={handleUpdateLeadSellingPrice}
                                    disabled={updatingLead || !editSellingPrice.trim()}
                                >
                                    {updatingLead ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-check me-2"></i>
                                            Update Selling Price
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(showBulkStatusModal || showInvoiceModal || showInvoiceDetailsModal || showInvoiceListModal || showEditLeadModal) && <div className="modal-backdrop fade show"></div>}

            {/* ── Lead View Modal — same component & pattern as RawLeads page ── */}
            {showViewModal && (
                <LeadViewModal
                    show={showViewModal}
                    leadId={viewLeadId}
                    onClose={handleCloseView}
                    onStatusUpdated={() => fetchLeads(1, false)}
                />
            )}

            {/* ── Lead Edit Modal — same component & pattern as RawLeads page ── */}
            {showEditModal && (
                <LeadEditModal
                    leadId={editLeadId}
                    onClose={handleCloseEdit}
                    onUpdated={() => fetchLeads(1, false)}
                />
            )}
        </PermissionGuard>
    )
}

export default page