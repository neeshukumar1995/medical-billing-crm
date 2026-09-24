import React, { useState } from 'react';
import Select from 'react-select';
import {
  FiUser, FiMail, FiPhone, FiMapPin, FiShield, FiBriefcase,
  FiCheckCircle, FiCalendar, FiUserCheck, FiHash, FiLock, FiEye, FiEyeOff
} from 'react-icons/fi';
import styles from './UserEditForm.module.css';

/**
 * User form fields component
 * @param {Object} props - Component props
 * @param {Object} props.formData - Form data
 * @param {Object} props.errors - Form errors
 * @param {Function} props.onInputChange - Input change handler
 * @param {Array} props.roles - Available roles
 * @param {boolean} props.loadingRoles - Loading roles state
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.showCompanyAssignment - Whether to show the multi-company assignment field (superadmin only)
 * @param {Array} props.companyOptions - react-select options ({value,label}) of companies other than the active one
 * @param {Array} props.selectedCompanies - react-select value of companies additionally assigned to this user
 * @param {Function} props.onCompaniesChange - Handler called with the new selected companies array
 */
const UserFormFields = ({
  formData, errors, onInputChange, roles, loadingRoles, disabled,
  showCompanyAssignment, companyOptions, selectedCompanies, onCompaniesChange
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const SectionHeader = ({ title, subtitle }) => (
    <>
      <hr className="my-4" />
      <div className="mb-4">
        <h6 className="fw-bold mb-1">{title}</h6>
        {subtitle && <span className="fs-12 text-muted">{subtitle}</span>}
      </div>
    </>
  );

  const renderInput = (name, label, type = 'text', placeholder = '', icon, required = false, options = null, fieldDisabled = false, helpText = '') => (
    <div className="row mb-4 align-items-center">
      <div className="col-lg-4">
        <label htmlFor={`${name}Input`} className="fw-semibold">
          {label}: {required && <span className="text-danger">*</span>}
        </label>
      </div>
      <div className="col-lg-8">
        <div className="input-group">
          {icon && <div className="input-group-text">{React.cloneElement(icon, { size: 16 })}</div>}
          {options ? (
            <select
              id={`${name}Input`}
              name={name}
              className="form-select"
              value={formData[name]}
              onChange={onInputChange}
              required={required}
              disabled={fieldDisabled || disabled}
            >
              <option value="">
                {loadingRoles ? 'Loading roles...' : 'Select role'}
              </option>
              {options.map(option => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              id={`${name}Input`}
              name={name}
              className="form-control"
              placeholder={placeholder}
              value={formData[name]}
              onChange={onInputChange}
              required={required}
              disabled={fieldDisabled || disabled || (name === 'company_id')}
            />
          )}
          {name === 'password' && (
            <button
              type="button"
              className="input-group-text c-pointer"
              onClick={() => setShowPassword(!showPassword)}
              disabled={disabled}
            >
              {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
          )}
          {name === 'confirmPassword' && (
            <button
              type="button"
              className="input-group-text c-pointer"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={disabled}
            >
              {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
          )}
        </div>
        {helpText && <div className="form-text">{helpText}</div>}
        {errors[name] && <div className={styles.errorText}>{errors[name]}</div>}
      </div>
    </div>
  );

  return (
    <div className="personal-info">
      <SectionHeader title="Personal Information" subtitle="Who this user is and how to reach them" />
      {renderInput('name', 'Full Name', 'text', 'Enter full name', <FiUser />, true)}
      {renderInput('email', 'Email Address', 'email', 'Enter email', <FiMail />, true)}
      {renderInput('phone', 'Phone Number', 'text', 'Enter phone number', <FiPhone />)}
      {renderInput('address', 'Address', 'text', 'Enter address', <FiMapPin />)}

      <SectionHeader title="Employment Details" subtitle="Role, department and where they fit in the org" />
      {renderInput('role', 'Role', 'select', '', <FiShield />, true, roles)}
      {renderInput('department', 'Department', 'text', 'Enter department', <FiBriefcase />)}
      {renderInput('status', 'Status', 'select', '', <FiCheckCircle />, true, [
        { id: 'Active', name: 'Active' },
        { id: 'Inactive', name: 'Inactive' }
      ])}
      {renderInput('joining_date', 'Joining Date', 'date', '', <FiCalendar />, false, null, false, 'Optional — you can leave this blank.')}
      {renderInput('manager', 'Manager', 'text', 'Enter manager name', <FiUserCheck />)}
      {renderInput('employee_id', 'Employee ID', 'text', 'Enter employee ID', <FiHash />)}

      {showCompanyAssignment && (
        <>
          <SectionHeader title="Company Access" subtitle="Which other companies' data this user can switch into" />
          <div className="row mb-4 align-items-center">
            <div className="col-lg-4">
              <label className="fw-semibold">Assign Additional Companies:</label>
            </div>
            <div className="col-lg-8">
              <Select
                isMulti
                isSearchable
                placeholder="Select other companies this user can access..."
                options={companyOptions || []}
                value={selectedCompanies || []}
                onChange={(opts) => onCompaniesChange && onCompaniesChange(opts || [])}
                isDisabled={disabled}
                classNamePrefix="select"
              />
            </div>
          </div>
        </>
      )}

      <SectionHeader title="Security" subtitle="Only fill this in to change the login password" />
      {renderInput('password', 'Password (Leave empty to keep current)', showPassword ? 'text' : 'password', 'Enter new password', <FiLock />)}
      {renderInput('confirmPassword', 'Confirm Password', showConfirmPassword ? 'text' : 'password', 'Confirm new password', <FiLock />)}
    </div>
  );
};

export default UserFormFields;
