export const CREDENTIALING_STATUS_OPTIONS = [
    { value: 'not_started', label: 'Not Started' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'verified', label: 'Verified' },
    { value: 'expired', label: 'Expired' },
    { value: 'rejected', label: 'Rejected' },
];

export const PSV_STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
];

export const VERIFICATION_TYPE_OPTIONS = [
    { value: 'npi', label: 'NPI Verification' },
    { value: 'state_license', label: 'State License' },
    { value: 'dea', label: 'DEA Registration' },
    { value: 'board_certification', label: 'Board Certification' },
    { value: 'malpractice_insurance', label: 'Malpractice Insurance' },
    { value: 'education', label: 'Education / Training' },
    { value: 'work_history', label: 'Work History' },
    { value: 'hospital_privileges', label: 'Hospital Privileges' },
    { value: 'oig_exclusion', label: 'OIG Exclusion Check' },
    { value: 'sam_exclusion', label: 'SAM Exclusion Check' },
    { value: 'caqh_profile', label: 'CAQH Profile' },
];

export const VERIFICATION_STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'verified', label: 'Verified' },
    { value: 'expired', label: 'Expired' },
    { value: 'rejected', label: 'Rejected' },
];

export const TASK_STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'blocked', label: 'Blocked' },
];

export const DOCUMENT_TYPE_OPTIONS = [
    ...VERIFICATION_TYPE_OPTIONS,
    { value: 'other', label: 'Other' },
];

export const PAYER_ENROLLMENT_STATUS_OPTIONS = [
    { value: 'not_started', label: 'Not Started' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'pending', label: 'Pending' },
    { value: 'enrolled', label: 'Enrolled' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' },
    { value: 'terminated', label: 'Terminated' },
];

export const STATUS_BADGE = {
    not_started: 'secondary',
    in_progress: 'warning',
    verified: 'success',
    expired: 'danger',
    rejected: 'danger',
    completed: 'success',
    pending: 'secondary',
    blocked: 'danger',
    submitted: 'info',
    enrolled: 'success',
    terminated: 'dark',
};

export const PSV_STATUS_BADGE = STATUS_BADGE;
export const PAYER_ENROLLMENT_STATUS_BADGE = STATUS_BADGE;

export const formatStatusLabel = (value) => {
    if (!value) return 'N/A';
    return value
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};
