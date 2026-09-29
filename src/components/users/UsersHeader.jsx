import React from 'react'
import { FiBarChart, FiBriefcase, FiDollarSign, FiEye, FiFilter, FiFlag, FiPaperclip, FiPlus, FiTrash2, FiUserCheck, FiUserMinus, FiUsers } from 'react-icons/fi'
import { BsFiletypeCsv, BsFiletypeExe, BsFiletypePdf, BsFiletypeTsx, BsFiletypeXml, BsPrinter } from 'react-icons/bs';
import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';

const filterAction = [
    { label: "All", icon: <FiEye /> },
    { label: "Group", icon: <FiUsers /> },
    { label: "Country", icon: <FiFlag /> },
    { label: "Invoice", icon: <FiDollarSign /> },
    { label: "Project", icon: <FiBriefcase /> },
    { label: "Active", icon: <FiUserCheck /> },
    { label: "Inactive", icon: <FiUserMinus /> },
];
const fileType = [
    { label: "PDF", icon: <BsFiletypePdf /> },
    { label: "CSV", icon: <BsFiletypeCsv /> },
    { label: "XML", icon: <BsFiletypeXml /> },
    { label: "Text", icon: <BsFiletypeTsx /> },
    { label: "Excel", icon: <BsFiletypeExe /> },
    { label: "Print", icon: <BsPrinter /> },
];

const UsersHeader = ({ onSaveDraft, selectedUsersCount = 0 }) => {
  const { hasPermission } = usePermissions()

  const handleSaveDraft = (e) => {
    e.preventDefault()
    if (onSaveDraft && selectedUsersCount > 0) {
      onSaveDraft()
    }
  }

    return (
 <>
   <div className="d-flex align-items-center gap-3 page-header-right-items-wrapper">
     {/* Save Draft Button - Color Changed */}

   {hasPermission('view-trashed-users') && (
     <button
       onClick={handleSaveDraft}
       className={`btn ${selectedUsersCount > 0 ? 'btn-light-brand' : 'btn-outline-secondary'}`}
       disabled={selectedUsersCount === 0}
       title={selectedUsersCount > 0 ? `Save ${selectedUsersCount} selected user(s) to draft` : 'Select users to save to draft'}
     >
       <FiPlus size={16} className="me-2" />
       <span>Save Draft</span>
       {selectedUsersCount > 0 && (
         <span className="badge bg-danger ms-2">{selectedUsersCount}</span>
       )}
     </button>
   )}

  {/* Trashed users (used to be a sidebar sub-menu item) */}
  {hasPermission('view-trashed-users') && (
    <Link href="/users/trashedUsers" className="btn btn-outline-secondary">
      <FiTrash2 size={16} className="me-2" />
      <span>Trashed Data</span>
    </Link>
  )}

  {/* Create User Button - Primary Color */}
  {hasPermission('create-users') && (
    <Link href="/users/create" className="btn btn-primary">
      <FiPlus size={16} className="me-2" />
      <span>Create User</span>
    </Link>
  )}


  </div>
</>
    )
}

export default UsersHeader