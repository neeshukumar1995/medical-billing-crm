// Extra companies a user can be assigned to: every company of the same
// client as their primary company (the backend rejects cross-client
// assignments — a user never spans two clients), minus the primary itself.
export const sameClientCompanyOptions = (companies, primaryCompanyId) => {
    const primary = companies.find(c => Number(c.id) === Number(primaryCompanyId))
    const clientId = primary?.client_id ?? null
    return companies
        .filter(c => Number(c.id) !== Number(primaryCompanyId))
        .filter(c => (c.client_id ?? null) === clientId)
        .map(c => ({ value: c.id, label: c.name }))
}
