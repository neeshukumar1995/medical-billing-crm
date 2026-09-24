export const PROVIDER_TYPE_OPTIONS = [
    { value: 'individual', label: 'Individual Provider' },
    { value: 'organization_group', label: 'Organization / Group' },
    { value: 'dme_facility', label: 'DME Facility' },
    { value: 'clinical_laboratory', label: 'Clinical Laboratory' },
];

export const PROVIDER_TYPE_BADGE = {
    individual: 'primary',
    organization_group: 'info',
    dme_facility: 'warning',
    clinical_laboratory: 'success',
};

export const providerTypeLabel = (value) => {
    const match = PROVIDER_TYPE_OPTIONS.find(opt => opt.value === value);
    return match ? match.label : (value || 'N/A');
};
