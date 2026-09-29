// Mirrors Permission::SENSITIVE / SUPERADMIN_ONLY on the backend
// (RoleController::grantablePermissionIds): client/company access
// permissions can only be handed out by someone who holds them, and
// platform-wide access only by a superadmin.
export const SENSITIVE_PERMISSIONS = [
    'access-all-companies',
    'access-client-companies',
    'view-clients',
    'create-clients',
    'edit-clients',
    'delete-clients',
    'view-companies',
    'create-companies',
    'edit-companies',
    'delete-companies',
]

export const SUPERADMIN_ONLY_PERMISSIONS = ['access-all-companies']

// Permission management itself stays superadmin-only in the role editor.
const SUPERADMIN_MANAGED = ['view-permissions', 'create-permissions', 'edit-permissions', 'delete-permissions']

/** Whether the current user may tick this permission on a role. */
export const canGrantPermission = (permissionName, { isSuperadmin, heldPermissions = [] }) => {
    if (isSuperadmin) return true
    if (SUPERADMIN_MANAGED.includes(permissionName)) return false
    if (SUPERADMIN_ONLY_PERMISSIONS.includes(permissionName)) return false
    if (SENSITIVE_PERMISSIONS.includes(permissionName)) return heldPermissions.includes(permissionName)
    return true
}
