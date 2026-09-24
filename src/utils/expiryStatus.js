// Centralized Active / Expiring Soon / Expired classification, used anywhere
// a document/insurance-policy/payer-enrollment expiration date is rendered
// (credentialing list, credentialing edit page, provider profile). Replaces
// three previously-duplicated isExpiringSoon() implementations.

export const getExpiryStatus = (dateStr, { expiringSoonDays = 30 } = {}) => {
    if (!dateStr) return null;

    const diffDays = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);

    if (diffDays < 0) return 'expired';
    if (diffDays <= expiringSoonDays) return 'expiring_soon';
    return 'active';
};

export const isExpiringSoon = (dateStr, options) => {
    const status = getExpiryStatus(dateStr, options);
    return status === 'expiring_soon' || status === 'expired';
};

export const EXPIRY_STATUS_LABELS = {
    active: 'Active',
    expiring_soon: 'Expiring Soon',
    expired: 'Expired',
};

export const EXPIRY_STATUS_BADGE = {
    active: 'success',
    expiring_soon: 'warning',
    expired: 'danger',
};

export const expiryStatusLabel = (dateStr, options) => {
    const status = getExpiryStatus(dateStr, options);
    return status ? EXPIRY_STATUS_LABELS[status] : 'N/A';
};
