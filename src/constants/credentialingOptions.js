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

export const AGREEMENT_DOCUMENT_TYPE_OPTIONS = [
    { value: 'payer_agreement', label: 'Payer Agreement / Contract' },
    { value: 'approval_letter', label: 'Approval Letter' },
    { value: 'confirmation_letter', label: 'Confirmation Letter' },
    { value: 'effective_date_document', label: 'Effective Date Documentation' },
];

export const PROVIDER_DOCUMENT_TYPE_OPTIONS = [
    { value: 'accreditation', label: 'Accreditation' },
    { value: 'w9', label: 'W-9' },
    { value: 'irs_ein_letter', label: 'IRS/EIN Letter' },
    { value: 'business_license', label: 'Business License' },
    { value: 'professional_license', label: 'Professional License' },
];

export const DOCUMENT_TYPE_OPTIONS = [
    ...VERIFICATION_TYPE_OPTIONS,
    ...AGREEMENT_DOCUMENT_TYPE_OPTIONS,
    ...PROVIDER_DOCUMENT_TYPE_OPTIONS,
    { value: 'other', label: 'Other' },
];

export const DOCUMENT_STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'expired', label: 'Expired' },
    { value: 'rejected', label: 'Rejected' },
];

export const INSURANCE_POLICY_STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' },
];

// Additive union of the client's requested vocabulary (not_started..rejected)
// plus the pre-existing legacy values (enrolled/expired/terminated) — kept so
// a record already carrying a legacy value stays selectable/round-trippable
// through the credentialing form's full-array resubmit-on-save instead of
// being silently coerced to a different status. See PAYER_ENROLLMENT_STATUS_LABELS
// for how legacy values are relabeled for display.
export const PAYER_ENROLLMENT_STATUS_OPTIONS = [
    { value: 'not_started', label: 'Not Started' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected / Denied' },
    { value: 'expired', label: 'Expired' },
    { value: 'terminated', label: 'Terminated' },
    { value: 'enrolled', label: 'Approved (Legacy)' },
];

export const PAYER_ENROLLMENT_STATUS_LABELS = PAYER_ENROLLMENT_STATUS_OPTIONS.reduce((acc, opt) => {
    acc[opt.value] = opt.label;
    return acc;
}, {});

export const payerEnrollmentStatusLabel = (value) => {
    if (!value) return 'N/A';
    return PAYER_ENROLLMENT_STATUS_LABELS[value] || formatStatusLabel(value);
};

export const STATUS_BADGE = {
    not_started: 'secondary',
    in_progress: 'warning',
    verified: 'success',
    expired: 'danger',
    rejected: 'danger',
    completed: 'success',
    approved: 'success',
    pending: 'secondary',
    blocked: 'danger',
    submitted: 'info',
    enrolled: 'success',
    terminated: 'dark',
    active: 'success',
    cancelled: 'dark',
};

export const FOLLOW_UP_BUCKET_OPTIONS = [
    { value: 'overdue', label: 'Overdue' },
    { value: 'due_soon', label: 'Due Soon' },
    { value: 'upcoming', label: 'Upcoming' },
];

export const FOLLOW_UP_BUCKET_BADGE = {
    overdue: 'danger',
    due_soon: 'warning',
    upcoming: 'info',
};

export const PSV_STATUS_BADGE = STATUS_BADGE;
export const PAYER_ENROLLMENT_STATUS_BADGE = STATUS_BADGE;
export const DOCUMENT_STATUS_BADGE = STATUS_BADGE;
export const INSURANCE_POLICY_STATUS_BADGE = STATUS_BADGE;

export const formatStatusLabel = (value) => {
    if (!value) return 'N/A';
    return value
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};
