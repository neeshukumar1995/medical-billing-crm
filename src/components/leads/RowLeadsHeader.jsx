import React, { useRef } from 'react'
import Link from 'next/link';
import { FiFile, FiPlus } from 'react-icons/fi'
import { usePermissions } from '@/hooks/usePermissions';
import crmInstance from '@/utils/crmInstance';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

const RowLeadsHeader = ({ selectedLeads = [], onBulkDraft, onImportSuccess, totalLeads, unassignedLeads, filteredUnassigned, hasFilter }) => {
    const { hasPermission } = usePermissions()
    const fileInputRef = useRef(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            console.log("Selected file:", file.name);

            // Validation (allow only CSV or Excel)
            const allowedTypes = [
                "text/csv",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ];
            if (!allowedTypes.includes(file.type)) {
                Swal.fire({
                    title: 'Error',
                    text: 'Please upload only CSV or Excel files.',
                    icon: 'error'
                });
                return;
            }

            // Read the file to get headers
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                const headers = jsonData[0]; // First row as headers

                if (!headers || headers.length === 0) {
                    Swal.fire({
                        title: 'Error',
                        text: 'No headers found in the file.',
                        icon: 'error'
                    });
                    return;
                }

                // Show popup to select fields
                const htmlContent = `
                    <style>
                        .form-check { padding-left: 5px !important; }
                        .form-check .form-check-input { margin-left: 0.5em !important; }
                        .p-3 { padding: 9px !important; }
                        div:where(.swal2-container) div:where(.swal2-popup) {
                            width: 1000px !important;
                            padding: 26px 0 1.25em !important;
                            border-radius: 15px !important;
                            background: #fff !important;
                            font-size:13px !important;
                          
                            
                        }
                    </style>
                    <div class="container-fluid">
                        <div class="row">
                            ${headers.map(header => `
                                <div class="col-md-4 mb-3">
                                    <div class="form-check border rounded p-3">
                                        <input class="form-check-input" type="checkbox" id="${header}" value="${header}" checked>
                                        <label class="form-check-label fw-bold text-dark" for="${header}">
                                            ${header}
                                        </label>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;

                Swal.fire({
                    title: '🎯 Select Fields to Import',
                    html: htmlContent,
                    showCancelButton: true,
                    confirmButtonText: 'Import',
                    cancelButtonText: 'Cancel',
                    customClass: {
                        popup: 'swal-wide-popup',
                        confirmButton: 'btn btn-success',
                        cancelButton: 'btn btn-secondary'
                    },
                    width: '1000px',
                    preConfirm: () => {
                        const selected = headers.filter(header => {
                            const checkbox = document.getElementById(header);
                            return checkbox && checkbox.checked;
                        });
                        if (selected.length === 0) {
                            Swal.showValidationMessage('⚠️ Please select at least one field to proceed');
                            return false;
                        }
                        return selected;
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        const selectedFields = result.value;

                        // Show loading
                        Swal.fire({
                            title: 'Uploading...',
                            allowOutsideClick: false,
                            didOpen: () => {
                                Swal.showLoading();
                            }
                        });

                        // Send to API
                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("fields", JSON.stringify(selectedFields));
                        
                        // Get company_id from localStorage
                        const companyId = localStorage.getItem('companyId');
                        if (companyId) {
                            formData.append("company_id", companyId);
                            console.log("Adding company_id:", companyId);
                        }

                        crmInstance.post('/leads/import', formData)
                        .then(response => {
                            //console.log('Upload successful', response);
                            Swal.close();
                            Swal.fire({
                                title: 'Success',
                                text: 'File uploaded successfully!',
                                icon: 'success'
                            }).then(() => {
                                if (onImportSuccess) {
                                    onImportSuccess();
                                }
                                // Reset the file input to allow re-uploading the same file
                                if (fileInputRef.current) {
                                    fileInputRef.current.value = '';
                                }
                            });
                        })
                        .catch(error => {
                            console.error('Upload failed', error);
                            // Detailed error message
                            let errorMessage = 'Upload failed. Please try again.';
                            if (error.response) {
                                // Server responded with an error
                                console.error('Response data:', error.response.data);
                                console.error('Response status:', error.response.status);
                                console.error('Response headers:', error.response.headers);
                                if (error.response.data && error.response.data.message) {
                                    errorMessage = error.response.data.message;
                                } else if (typeof error.response.data === 'string') {
                                    errorMessage = error.response.data;
                                }
                            } else if (error.request) {
                                // No response received
                                console.error('No response received:', error.request);
                                errorMessage = 'No response from server. Please check your connection.';
                            } else {
                                // Request setup error
                                console.error('Request error:', error.message);
                                errorMessage = error.message;
                            }
                            Swal.fire({
                                title: 'Error',
                                text: errorMessage,
                                icon: 'error'
                            });
                            // Reset the file input even on error
                            if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                            }
                        });
                    }
                });
            };
            reader.readAsArrayBuffer(file);
        }
    };

    return (
        <>
        <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
         {hasPermission('create-leads') && (
            
          <Link href="/leads/skipped-rows" className="btn btn-danger">
            
            <span>Skip Row Lead</span>
        </Link>
        )}
        {hasPermission('create-leads') && (
            
          <Link href="/leads/create" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Create Lead</span>
        </Link>
        )}

        {/* {hasPermission('save-draft-button') && (
        <button
            className="btn btn-light-brand"
            onClick={selectedLeads.length > 0 ? onBulkDraft : () => alert('Please select leads to draft')}
            disabled={selectedLeads.length === 0}
        >
            <FiPlus size={16} className="me-2" />
            <span>Save Draft</span>
        </button>
        )} */}

        {/* Hidden File Input */}

        
        <input
            type="file"
            ref={fileInputRef}
            accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileChange}
            style={{ display: "none" }}
        />

        <a
            href="http://187.127.174.249:8000/lead_import_sample_crm.xlsx"
            download
            className="btn btn-lg fw-bold shadow-lg text-white"
            style={{backgroundColor:'rgba(13, 202, 240, 1)'}}>
            ⬇️ Sample Data
        </a>

        {/* Button to trigger file input */}
        {hasPermission('import-leads') && (
            <button
                className="btn btn-lg px-4 fw-bold shadow-lg text-white"
                style={{ backgroundColor: "#be5e5d", border: "none" }}
                onClick={() => fileInputRef.current.click()}
            >
                <FiFile size={16} className="me-2" />
                <span>Import </span>
            </button>
        )}

        {/* Counts Display */}
        <div className="d-flex gap-4 ms-4">
            
            
            <div className="text-center">
                <h6 className="mb-1">{unassignedLeads}</h6>
                <small className="text-muted">Unassigned Leads</small>
            </div>
            {hasFilter && (
                <div className="text-center">
                    <h6 className="mb-1">{filteredUnassigned}</h6>
                    <small className="text-muted">Unassigned in Filtered</small>
                </div>
            )}
        </div>

            </div>
        </>
    )
}

export default RowLeadsHeader
