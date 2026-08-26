// Permission Seeder - Browser Console Script
// Copy and paste this into browser console to seed permissions

const permissions = [
    // Dashboard
    { name: 'view-dashboard', description: 'Can view dashboard' },

    // Users
    { name: 'view-users', description: 'Can view users list' },
    { name: 'create-users', description: 'Can create new users' },
    { name: 'edit-users', description: 'Can edit users' },
    { name: 'delete-users', description: 'Can delete users' },
    { name: 'view-trashed-users', description: 'Can view trashed users' },

    // Roles
    { name: 'view-roles', description: 'Can view roles list' },
    { name: 'create-roles', description: 'Can create new roles' },
    { name: 'edit-roles', description: 'Can edit roles' },
    { name: 'delete-roles', description: 'Can delete roles' },
    { name: 'manage-roles-permissions', description: 'Can manage roles and permissions' },

    // Permissions
    { name: 'view-permissions', description: 'Can view permissions list' },
    { name: 'create-permissions', description: 'Can create new permissions' },
    { name: 'edit-permissions', description: 'Can edit permissions' },
    { name: 'delete-permissions', description: 'Can delete permissions' },

    // Leads
    { name: 'view-leads', description: 'Can view leads list' },
    { name: 'create-leads', description: 'Can create new leads' },
    { name: 'edit-leads', description: 'Can edit leads' },
    { name: 'delete-leads', description: 'Can delete leads' },

    // Reports
    { name: 'view-reports', description: 'Can view reports' },
    { name: 'view-sales-report', description: 'Can view sales reports' },
    { name: 'view-leads-report', description: 'Can view leads reports' },

    // Settings
    { name: 'view-settings', description: 'Can access settings' },
    { name: 'view-profile', description: 'Can view and edit profile' },
    { name: 'edit-profile', description: 'Can edit profile settings' },
];

async function seedPermissions() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.error('No access token found. Please login first.');
        return;
    }

    //console.log('Starting permission seeding...');

    for (const permission of permissions) {
        try {
            const response = await fetch('http://crm-backend.test/api/permissions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(permission)
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`✅ Created: ${permission.name}`);
            } else {
                console.log(`⚠️  Skipped (may already exist): ${permission.name}`, data);
            }
        } catch (error) {
            console.error(`❌ Failed: ${permission.name}`, error);
        }
    }

    //console.log('Permission seeding completed!');
}

// To use: Copy this entire file content and paste in browser console, then run:
// seedPermissions()

export { seedPermissions, permissions };