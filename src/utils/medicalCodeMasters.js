// Config for the 5 Medical Billing "code master" screens (blueprint Phase 5).
// They're all the same shape (code + description + status, searchable,
// paginated) so one set of pages renders all 5 instead of duplicating the
// same ~200 lines five times. Only the endpoint/labels/extra field differ.

export const MEDICAL_CODE_MASTERS = {
    icd10: {
        label: 'ICD-10 Codes',
        endpoint: '/medical-billing/icd10-codes',
        extraField: { name: 'version', label: 'Version', placeholder: 'e.g. 2026' },
    },
    cpt: {
        label: 'CPT Codes',
        endpoint: '/medical-billing/cpt-codes',
        extraField: { name: 'category', label: 'Category', placeholder: 'e.g. E/M' },
    },
    hcpcs: {
        label: 'HCPCS Codes',
        endpoint: '/medical-billing/hcpcs-codes',
        extraField: { name: 'level', label: 'Level', placeholder: 'e.g. II' },
    },
    modifiers: {
        label: 'Modifiers',
        endpoint: '/medical-billing/modifiers',
        extraField: null,
    },
    pos: {
        label: 'Place of Service',
        endpoint: '/medical-billing/place-of-services',
        extraField: null,
    },
}
