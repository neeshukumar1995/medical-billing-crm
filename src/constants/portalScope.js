// The portal runs Medical Billing only. The CRM / business-development (BD)
// side — leads, sources, sales reports, the lead board, Outlook, Zoom and the
// CRM dashboards — is hidden everywhere. Its code and backend data stay in
// place, so it can be brought back by editing this file.

/** Landing page after login and for every hidden (BD) page. */
export const HOME_PATH = '/medical-billing/dashboard'

/** Hidden BD pages: the exact path and everything below it. */
const BD_ROUTES = [
    '/dashboard',        // CRM dashboard
    '/user-dashboard',   // CRM employee dashboard
    '/leads',
    '/sources',
    '/reports',
    '/board',
    '/outlookEmail',
    '/zoom',
    '/test',
]

export const isBdRoute = (pathname = '') =>
    BD_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))

/** BD permissions — hidden in the role editor. */
export const BD_PERMISSIONS = [
    'Bulk-Lead-Status', 'converted-leads', 'create-leads', 'create-leads-status', 'create-leads-types',
    'create-sources', 'delete-leads', 'delete-leads-status', 'delete-leads-types', 'delete-sources',
    'edit-leads', 'edit-leads-status', 'edit-leads-types', 'edit-sources', 'filter-by-date',
    'filter-by-lead-type', 'filter-by-status', 'import-leads', 'raw-leads', 'row-leads',
    'save-draft-leads', 'trashed-leads', 'user-by-leads', 'User-Follow-Ups', 'users-outlook',
    'view-dashboard', 'view-leads', 'view-leads-report', 'view-leads-status', 'view-leads-types',
    'view-sources', 'view-zoom-meetings',
]
