// Static menu configuration with permission mappings.
// Ordered by workflow — what you set up first sits higher: clients →
// companies → roles/permissions → users → CRM (sources → leads → reports) →
// medical billing → settings. Inside a module, "Create" comes before "List".
export const menuConfig = [
    {
        id: 0,
        name: "dashboard",
        path: "/dashboard",
        icon: 'feather-airplay',
        permission: "view-dashboard",
        dropdownMenu: [],
        role: ["superadmin"],
    },
    // Clients, Companies, Users and Sources open their list page directly (no
    // dropdown); Create / Trashed etc. are buttons in that list page's header.
    {
        id: 9,
        name: "clients",
        path: "/clients/list",
        icon: 'feather-grid',
        permission: "view-clients",
        dropdownMenu: []
    },
    {
        id: 6,
        name: "companies",
        path: "/companies/list",
        icon: 'feather-building',
        permission: "view-companies",
        dropdownMenu: []
    },
    {
        id: 1,
        name: "roles & permissions",
        path: "#",
        icon: 'feather-shield',
        permission: "view-roles",
        // Permissions first — a role is built by picking permissions.
        dropdownMenu: [
            {
                id: 3,
                name: "Create Permission",
                path: "/permissions/create",
                icon: 'feather-key',
                permission: "create-permissions",
                role: ["superadmin"],
                subdropdownMenu: false
            },
            {
                id: 4,
                name: "Permissions List",
                path: "/permissions/list",
                icon: 'feather-list',
                permission: "view-permissions",
                role: ["superadmin"],
                subdropdownMenu: false
            },
            {
                id: 1,
                name: "Create Role",
                path: "/roles/create",
                icon: 'feather-plus-circle',
                permission: "create-roles",
                subdropdownMenu: false
            },
            {
                id: 2,
                name: "Roles List",
                path: "/roles/list",
                icon: 'feather-list',
                permission: "view-roles",
                subdropdownMenu: false
            }
        ]
    },
    {
        id: 2,
        name: "users",
        path: "/users/list",
        icon: 'feather-users',
        permission: "view-users",
        dropdownMenu: []
    },
    {
        id: 7,
        name: "sources",
        path: "/sources/list",
        icon: 'feather-file-text',
        permission: "view-sources",
        dropdownMenu: []
    },
    {
        id: 3,
        name: "leads",
        path: "#",
        icon: 'feather-users',
        permission: "view-leads",
        dropdownMenu: [
            {
                id: 1,
                name: "Provider Types",
                path: "/leads/lead-types/list",
                icon: 'feather-tag',
                permission: "view-leads-types",
                subdropdownMenu: false
            },
            {
                id: 2,
                name: "Lead Status",
                path: "/leads/lead-status/list",
                icon: 'feather-activity',
                permission: "view-leads-status",
                subdropdownMenu: false
            },
            {
                id: 3,
                name: "Raw Leads",
                path: "/leads/raw-leads",
                icon: 'feather-inbox',
                permission: "raw-leads",
                subdropdownMenu: false
            },
            {
                id: 4,
                name: "Assigned Leads",
                path: "/leads/list",
                icon: 'feather-user-check',
                permission: "view-leads",
                subdropdownMenu: false
            },
            {
                id: 5,
                name: "Follow Up Leads",
                path: "/leads/User-Follow-Ups",
                icon: 'feather-clock',
                permission: "User-Follow-Ups",
                subdropdownMenu: false
            },
            {
                id: 6,
                name: "Converted Leads",
                path: "/leads/converted-leads",
                icon: 'feather-check-circle',
                permission: "converted-leads",
                subdropdownMenu: false
            },
            {
                id: 7,
                name: "Leads by Users",
                path: "/leads/user-by-leads",
                icon: 'feather-users',
                permission: "user-by-leads",
                subdropdownMenu: false
            },
            {
                id: 8,
                name: "Trash Data",
                path: "/leads/draft",
                icon: 'feather-trash-2',
                permission: "trashed-leads",
                subdropdownMenu: false
            }
        ]
    },
    {
        id: 4,
        name: "reports",
        path: "#",
        icon: 'feather-cast',
        permission: "view-reports",
        dropdownMenu: [
            {
                id: 1,
                name: "Leads Report",
                path: "/reports/leads",
                icon: 'feather-bar-chart-2',
                permission: "view-leads-report",
                subdropdownMenu: false
            }
        ]
    },

//     {
//     id: 9,
//     name: "Zoom Meetings",
//     path: "/zoom/meetings",
//     icon: 'feather-video',   // ya koi bhi Zoom icon
//     permission: "view-zoom-meetings",
//     role: ["superadmin", "admin", "sales"], // jinko dikhana hai
//     dropdownMenu: [] // agar koi sub menu nahi hai
// },
    {
        id: 8,
        name: "medical billing",
        path: "#",
        icon: 'feather-briefcase',
        permission: "medical_patients.view",
        dropdownMenu: [
            {
                id: 0,
                name: "Dashboard",
                path: "/medical-billing/dashboard",
                icon: 'feather-pie-chart',
                permission: "medical_billing.dashboard.view",
                subdropdownMenu: false
            },
            {
                id: 'my-task',
                name: "My Task",
                path: "/medical-billing/my-task",
                icon: 'feather-briefcase',
                permission: "medical_patients.view",
                hideForRoles: ['superadmin', 'admin'],
                subdropdownMenu: false
            },
            // Kept as its own top-level group (not nested inside another
            // group) — the sidebar CSS only styles nesting up to 3 levels of
            // .nxl-submenu, and Master Data already needs its own 2nd level
            // for ICD-10/CPT/etc; nesting it inside another group pushed
            // those items to a 4th, unstyled level and broke the layout.
            // Placed first: codes are set up before any billing work.
            {
                id: 6,
                name: "Master Data",
                path: "#",
                icon: 'feather-list',
                permission: "medical_coding.manage",
                subdropdownMenu: [
                    { id: 1, name: "ICD-10", path: "/medical-billing/master-data/icd10", icon: 'feather-file-text' },
                    { id: 2, name: "CPT", path: "/medical-billing/master-data/cpt", icon: 'feather-file-text' },
                    { id: 3, name: "HCPCS", path: "/medical-billing/master-data/hcpcs", icon: 'feather-file-text' },
                    { id: 4, name: "Modifiers", path: "/medical-billing/master-data/modifiers", icon: 'feather-tag' },
                    { id: 5, name: "Place of Service", path: "/medical-billing/master-data/pos", icon: 'feather-map-pin' },
                ]
            },
            // Credentialing used to be one group with everything as flat
            // siblings. Split into its own groups (Providers / Credentialing
            // Records / Follow-ups) plus one direct link (Dashboard), for
            // the same reason Master Data below is its own top-level group —
            // the sidebar CSS only styles nesting up to 3 levels of
            // .nxl-submenu, so "Credentialing > Providers > All Providers"
            // would be a 4th, unstyled level. Kept adjacent in the array so
            // they still read as one workflow in the sidebar.
            {
                id: 'grp-cred-providers',
                name: "Providers",
                path: "#",
                icon: 'feather-user-check',
                subdropdownMenu: [
                    {
                        id: 2,
                        name: "Add Provider",
                        path: "/medical-billing/providers/create",
                        icon: 'feather-user-plus',
                        permission: "medical_providers.manage",
                    },
                    {
                        id: 1,
                        name: "All Providers",
                        path: "/medical-billing/providers",
                        icon: 'feather-users',
                        permission: "medical_providers.view",
                    },
                ]
            },
            {
                id: 'grp-cred-records',
                name: "Credentialing Records",
                path: "#",
                icon: 'feather-award',
                subdropdownMenu: [
                    {
                        id: 1,
                        name: "All Records",
                        path: "/medical-billing/credentialing",
                        icon: 'feather-award',
                        permission: "medical_credentialing.view",
                    },
                    {
                        id: 2,
                        name: "Documents",
                        path: "/medical-billing/credentialing/documents",
                        icon: 'feather-file-text',
                        permission: "medical_credentialing.view",
                    },
                    {
                        id: 3,
                        name: "Insurance",
                        path: "/medical-billing/credentialing/insurance",
                        icon: 'feather-shield',
                        permission: "medical_credentialing.view",
                    },
                    {
                        id: 4,
                        name: "Payer Enrollments",
                        path: "/medical-billing/credentialing/payer-enrollments",
                        icon: 'feather-file-plus',
                        permission: "medical_credentialing.view",
                    },
                    {
                        id: 5,
                        name: "Agreements",
                        path: "/medical-billing/credentialing/agreements",
                        icon: 'feather-file-text',
                        permission: "medical_credentialing.view",
                    },
                ]
            },
            {
                id: 'grp-cred-dashboard',
                name: "Credentialing Dashboard",
                path: "/medical-billing/credentialing/dashboard",
                icon: 'feather-pie-chart',
                permission: "medical_credentialing.view",
                subdropdownMenu: false
            },
            {
                id: 'grp-cred-followups',
                name: "Follow-ups",
                path: "#",
                icon: 'feather-calendar',
                subdropdownMenu: [
                    {
                        id: 1,
                        name: "All Follow-ups",
                        path: "/medical-billing/credentialing/followups",
                        icon: 'feather-calendar',
                        permission: "medical_credentialing.view",
                    },
                    {
                        id: 2,
                        name: "Overdue",
                        path: "/medical-billing/credentialing/followups?bucket=overdue",
                        icon: 'feather-alert-circle',
                        permission: "medical_credentialing.view",
                    },
                    {
                        id: 3,
                        name: "Due Soon",
                        path: "/medical-billing/credentialing/followups?bucket=due_soon",
                        icon: 'feather-clock',
                        permission: "medical_credentialing.view",
                    },
                    {
                        id: 4,
                        name: "Upcoming",
                        path: "/medical-billing/credentialing/followups?bucket=upcoming",
                        icon: 'feather-calendar',
                        permission: "medical_credentialing.view",
                    },
                ]
            },
            // Front office, in visit order: payer → patient → eligibility →
            // appointment → encounter (the encounter is what gets billed next).
            {
                id: 'grp-1',
                name: "Patients & Care",
                path: "#",
                icon: 'feather-users',
                subdropdownMenu: [
                    {
                        id: 3,
                        name: "Insurance Payers",
                        path: "/medical-billing/insurance/payers",
                        icon: 'feather-shield',
                        permission: "medical_insurance.view",
                    },
                    {
                        id: 1,
                        name: "Patients",
                        path: "/medical-billing/patients",
                        icon: 'feather-user',
                        permission: "medical_patients.view",
                    },
                    {
                        id: 6,
                        name: "Eligibility Verification",
                        path: "/medical-billing/eligibility",
                        icon: 'feather-check-circle',
                        permission: "medical_eligibility.view",
                    },
                    {
                        id: 4,
                        name: "Appointments",
                        path: "/medical-billing/appointments",
                        icon: 'feather-clock',
                        permission: "medical_appointments.manage",
                    },
                    {
                        id: 5,
                        name: "Encounters",
                        path: "/medical-billing/encounters",
                        icon: 'feather-clipboard',
                        permission: "medical_encounters.manage",
                    },
                ]
            },
            {
                id: 'grp-2',
                name: "Billing & Claims",
                path: "#",
                icon: 'feather-layers',
                subdropdownMenu: [
                    {
                        id: 7,
                        name: "Charge Entry",
                        path: "/medical-billing/charges",
                        icon: 'feather-dollar-sign',
                        permission: "medical_charges.manage",
                    },
                    {
                        id: 8,
                        name: "Claims",
                        path: "/medical-billing/claims",
                        icon: 'feather-file-text',
                        permission: "medical_claims.view",
                    },
                    {
                        id: 12,
                        name: "Clearinghouse / Submission Status",
                        path: "/medical-billing/submission-status",
                        icon: 'feather-send',
                        permission: "medical_claims.view",
                    },
                    {
                        id: 9,
                        name: "Payments",
                        path: "/medical-billing/payments",
                        icon: 'feather-check-circle',
                        permission: "medical_payments.view",
                    },
                    {
                        id: 10,
                        name: "Denials",
                        path: "/medical-billing/denials",
                        icon: 'feather-alert-circle',
                        permission: "medical_denials.view",
                    },
                    {
                        id: 11,
                        name: "AR Management",
                        path: "/medical-billing/ar",
                        icon: 'feather-activity',
                        permission: "medical_ar.view",
                    },
                    {
                        id: 13,
                        name: "Patient Statements",
                        path: "/medical-billing/patient-statements",
                        icon: 'feather-file-text',
                        permission: "medical_ar.view",
                    },
                ]
            },
            // Money in (bank account → receipts → deposits), then supplies
            // (vendor → purchase order → stock received into inventory).
            {
                id: 'grp-4',
                name: "Supply & Finance",
                path: "#",
                icon: 'feather-shopping-bag',
                subdropdownMenu: [
                    {
                        id: 17,
                        name: "Account Setup",
                        path: "/medical-billing/accounts",
                        icon: 'feather-lock',
                        permission: "medical_accounts.view",
                    },
                    {
                        id: 18,
                        name: "Receipt Management",
                        path: "/medical-billing/patient-payments",
                        icon: 'feather-file-text',
                        permission: "medical_receipts.view",
                    },
                    {
                        id: 19,
                        name: "Deposit Management",
                        path: "/medical-billing/deposits",
                        icon: 'feather-briefcase',
                        permission: "medical_deposits.view",
                    },
                    {
                        id: 14,
                        name: "Vendors",
                        path: "/medical-billing/vendors",
                        icon: 'feather-globe',
                        permission: "medical_inventory.view",
                    },
                    {
                        id: 16,
                        name: "Purchase Orders",
                        path: "/medical-billing/purchase-orders",
                        icon: 'feather-shopping-cart',
                        permission: "medical_inventory.view",
                    },
                    {
                        id: 15,
                        name: "Inventory",
                        path: "/medical-billing/inventory",
                        icon: 'feather-grid',
                        permission: "medical_inventory.view",
                    },
                ]
            },
            {
                id: 'grp-3',
                name: "Records & Reports",
                path: "#",
                icon: 'feather-inbox',
                subdropdownMenu: [
                    {
                        id: 12,
                        name: "Documents",
                        path: "/medical-billing/documents",
                        icon: 'feather-archive',
                        permission: "medical_documents.view",
                    },
                    {
                        id: 13,
                        name: "Reports",
                        path: "/medical-billing/reports",
                        icon: 'feather-bar-chart-2',
                        permission: "medical_reports.view",
                    },
                ]
            },
            {
                id: 'activity',
                name: "Employee Activity",
                path: "/medical-billing/activity",
                icon: 'feather-activity',
                permission: "medical_patients.view",
                subdropdownMenu: false
            },
            {
                id: 'guide',
                name: "Revenue Cycle Guide",
                path: "/medical-billing/guide",
                icon: 'feather-book-open',
                permission: "medical_patients.view",
                subdropdownMenu: false
            },
        ]
    },
    {
        id: 5,
        name: "settings",
        path: "#",
        icon: 'feather-settings',
        permission: "view-settings",
        dropdownMenu: [
            {
                id: 1,
                name: "Profile",
                path: "/settings/ganeral",
                icon: 'feather-user',
                permission: "view-profile",
                subdropdownMenu: false
            }
        ]
    },

            // {
            //     id: 8,
            //     name: "Outlook Users & Inbox",
            //     path: "/outlookEmail/inbox",
            //     icon: 'feather-mail',
            //     permission: "users-outlook",
            //     role: ["superadmin", "admin", "user"],
            //     subdropdownMenu: false
            // }


];

// Legacy export for backward compatibility - now a function that takes user
export const getMenuList = (user) => {
    return menuConfig.filter(item => {
        if (item.role && !item.role.includes(user.role)) return false;
        return true;
    });
};

// For backward compatibility, export a default menuList without role filtering
export const menuList = menuConfig;