export const COMPANY_STATUS_OPTIONS = [
    { value: 'Active', label: 'Active', description: 'Full Access', color: '#17c666' },
    { value: 'Inactive', label: 'Inactive', description: 'Disabled (No Access)', color: '#6c757d' },
    { value: 'Suspended', label: 'Suspended', description: 'Locked (Preview Only)', color: '#dc3545' },
];

export const getCompanyStatusOption = (statusValue) =>
    COMPANY_STATUS_OPTIONS.find(option => option.value === statusValue) || COMPANY_STATUS_OPTIONS[0];
