import React from 'react'
import { FiBarChart, FiBriefcase, FiDollarSign, FiEye, FiFilter, FiFlag, FiPaperclip, FiPlus, FiUserCheck, FiUserMinus, FiUsers, FiFile } from 'react-icons/fi'
import { BsFiletypeCsv, BsFiletypeExe, BsFiletypePdf, BsFiletypeTsx, BsFiletypeXml, BsPrinter } from 'react-icons/bs';
import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';
import { useRef } from "react";
import crmInstance from '@/utils/crmInstance';
import Swal from 'sweetalert2';



const filterAction = [
    { label: "All", icon: <FiEye /> },
    { label: "Group", icon: <FiUsers /> },
    { label: "Country", icon: <FiFlag /> },
    { label: "Invoice", icon: <FiDollarSign /> },
    { label: "Project", icon: <FiBriefcase /> },
    { label: "Active", icon: <FiUserCheck /> },
    { label: "Inactive", icon: <FiUserMinus /> },
];
export const fileType = [
    { label: "PDF", icon: <BsFiletypePdf /> },
    { label: "CSV", icon: <BsFiletypeCsv /> },
    { label: "XML", icon: <BsFiletypeXml /> },
    { label: "Text", icon: <BsFiletypeTsx /> },
    { label: "Excel", icon: <BsFiletypeExe /> },
    { label: "Print", icon: <BsPrinter /> },
];


const LeadsHeader = ({ selectedLeads = [], onBulkDraft, onImportSuccess, importEndpoint = '/leads/import', totalLeads, totalAssigned, filteredAssigned, hasFilter, showImportButtons = false, isRowLeads = false, isConvertedLeads = false, unassignedLeads, convertedLeads }) => {
    const { hasPermission } = usePermissions()
    const fileInputRef = useRef(null);

      // Handle file selection
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

      // Yaha aap API call ya file processing kar sakte ho
      // e.g. FormData me append karke backend me bhejo
      const formData = new FormData();
      formData.append("file", file);

      // Show loading
      Swal.fire({
        title: 'Uploading...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Send to API
      crmInstance.post(importEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
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
        Swal.fire({
          title: 'Error',
          text: 'Upload failed. Please try again.',
          icon: 'error'
        });
        // Reset the file input even on error
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      });
    }
  };

    return (
        <>
        <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">

      
       {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {showImportButtons && (
        <>
          <a
            href="http://crm-backend.test/lead_import_sample.xlsx"
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
        </>
      )}
          

        {hasPermission('create-leads') && (
          <Link href="/leads/create" className="btn btn-primary">
            <FiPlus size={16} className="me-2" />
            <span>Create Lead</span>
        </Link>
        )}
        
        {hasPermission('save-draft-button') && (
        <button
            className="btn btn-light-brand"
            onClick={selectedLeads.length > 0 ? onBulkDraft : () => alert('Please select leads to draft')}
            disabled={selectedLeads.length === 0}
        >
            <FiPlus size={16} className="me-2" />
            <span>Save Draft</span>
        </button>
        )}

        {/* Counts Display */}
        <div className="d-flex gap-4 ms-4">
            <div className="text-center">
                <h6 className="mb-1">{totalLeads}</h6>
                <small className="text-muted">Total Leads</small>
            </div>
            {isConvertedLeads ? (
                <>
                    <div className="text-center">
                        <h6 className="mb-1">{totalAssigned}</h6>
                        <small className="text-muted">Assigned Leads</small>
                    </div>
                    <div className="text-center">
                        <h6 className="mb-1">{unassignedLeads}</h6>
                        <small className="text-muted">Unassigned Leads</small>
                    </div>
                    <div className="text-center">
                        <h6 className="mb-1">{convertedLeads}</h6>
                        <small className="text-muted">Converted Leads</small>
                    </div>
                </>
            ) : (
                <div className="text-center">
                    <h6 className="mb-1">{totalAssigned}</h6>
                    <small className="text-muted">{isRowLeads ? 'Unassigned Leads' : 'Assigned Leads'}</small>
                </div>
            )}
            {hasFilter && (
                <div className="text-center">
                    <h6 className="mb-1">{filteredAssigned}</h6>
                    <small className="text-muted">{isConvertedLeads ? 'Converted in Filtered' : (isRowLeads ? 'Unassigned in Filtered' : 'Assigned in Filtered')}</small>
                </div>
            )}
        </div>

            </div>
        </>
    )
}

export default LeadsHeader