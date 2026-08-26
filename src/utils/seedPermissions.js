// Permission seeder utility
// Run this to create all necessary permissions in the database

import crmInstance from './crmInstance'

const permissionsToCreate = [
    // Dashboard permissions
    { name: 'view-dashboard', description: 'Can view dashboard' },

    // User management permissions
    { name: 'view-users', description: 'Can view users list' },
    { name: 'create-users', description: 'Can create new users' },
    { name: 'edit-users', description: 'Can edit users' },
    { name: 'delete-users', description: 'Can delete users' },
    { name: 'view-trashed-users', description: 'Can view trashed users' },

    // Role management permissions
    { name: 'view-roles', description: 'Can view roles list' },
    { name: 'create-roles', description: 'Can create new roles' },
    { name: 'edit-roles', description: 'Can edit roles' },
    { name: 'delete-roles', description: 'Can delete roles' },
    { name: 'manage-roles-permissions', description: 'Can manage roles and permissions' },

    // Permission management permissions
    { name: 'view-permissions', description: 'Can view permissions list' },
    { name: 'create-permissions', description: 'Can create new permissions' },
    { name: 'edit-permissions', description: 'Can edit permissions' },
    { name: 'delete-permissions', description: 'Can delete permissions' },

    // Lead management permissions
    { name: 'view-leads', description: 'Can view leads list' },
    { name: 'create-leads', description: 'Can create new leads' },
    { name: 'edit-leads', description: 'Can edit leads' },
    { name: 'delete-leads', description: 'Can delete leads' },

    // Report permissions
    { name: 'view-reports', description: 'Can view reports' },
    { name: 'view-sales-report', description: 'Can view sales reports' },
    { name: 'view-leads-report', description: 'Can view leads reports' },

    // Settings permissions
    { name: 'view-settings', description: 'Can access settings' },
    { name: 'view-profile', description: 'Can view and edit profile' },
    { name: 'edit-profile', description: 'Can edit profile settings' },

]

export const seedPermissions = async () => {
    //console.log('Starting permission seeding...')

    try {
        const response = await crmInstance.post('/permissions/seed', {
            permissions: permissionsToCreate
        })

        //console.log('Permissions seeded successfully:', response.data)
        return { success: true, data: response.data }
    } catch (error) {
        console.error('Failed to seed permissions:', error)

        // Fallback: Try creating permissions one by one
        //console.log('Trying individual permission creation...')
        const results = []

        for (const permission of permissionsToCreate) {
            try {
                const response = await crmInstance.post('/permissions', permission)
                results.push({ permission: permission.name, success: true, data: response.data })
                console.log(`Created permission: ${permission.name}`)
            } catch (err) {
                console.error(`Failed to create permission: ${permission.name}`, err.response?.data)
                results.push({ permission: permission.name, success: false, error: err.response?.data })
            }
        }

        return { success: false, fallback: true, results }
    }
}

// Function to check existing permissions
export const checkExistingPermissions = async () => {
    try {
        const response = await crmInstance.get('/permissions')
        const existingPermissions = response.data.data || response.data || []
        return existingPermissions.map(p => p.name)
    } catch (error) {
        console.error('Failed to check existing permissions:', error)
        return []
    }
}

// Function to create missing permissions only
export const seedMissingPermissions = async () => {
    //console.log('Checking existing permissions...')

    const existingPermissions = await checkExistingPermissions()
    const missingPermissions = permissionsToCreate.filter(
        p => !existingPermissions.includes(p.name)
    )

    if (missingPermissions.length === 0) {
        //console.log('All permissions already exist!')
        return { success: true, message: 'All permissions already exist' }
    }

    console.log(`Creating ${missingPermissions.length} missing permissions...`)

    const results = []
    for (const permission of missingPermissions) {
        try {
            const response = await crmInstance.post('/permissions', permission)
            results.push({ permission: permission.name, success: true, data: response.data })
            console.log(`Created permission: ${permission.name}`)
        } catch (err) {
            console.error(`Failed to create permission: ${permission.name}`, err.response?.data)
            results.push({ permission: permission.name, success: false, error: err.response?.data })
        }
    }

    return { success: true, results }
}

// Auto-run function for development
export const autoSeedPermissions = async () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        //console.log('Development environment detected, checking permissions...')
        await seedMissingPermissions()
    }
}