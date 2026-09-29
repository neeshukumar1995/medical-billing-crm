'use client'
import React, { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useUser, NO_CLIENT } from '@/context/UserContext'
import { usePermissions } from '@/hooks/usePermissions'

const COMPANIES_PAGE = '/companies/list'

/**
 * Header client switcher. Picking a client opens the Companies list, which
 * shows that client's companies — each row's "Open" button makes a company
 * the active one for the whole portal.
 *
 * Users who can't open the Companies list (no view-companies) but work in
 * several companies still get a company dropdown here, since they would
 * otherwise have no way to switch.
 */
const CompanySwitcher = () => {
    const { companies, activeCompanyId, switchCompany, selectedClientKey, setSelectedClientKey } = useUser()
    const { hasPermission } = usePermissions()
    const router = useRouter()
    const pathname = usePathname()
    const [isChanging, setIsChanging] = useState(false)

    const clients = useMemo(() => {
        const map = new Map()
        companies.forEach(company => {
            const key = company.client ? String(company.client.id) : NO_CLIENT
            if (!map.has(key)) {
                map.set(key, { key, name: company.client?.name || 'No client' })
            }
        })
        return [...map.values()].sort((a, b) => {
            if (a.key === NO_CLIENT) return 1
            if (b.key === NO_CLIENT) return -1
            return a.name.localeCompare(b.name)
        })
    }, [companies])

    const handleClientChange = (e) => {
        const key = e.target.value
        setSelectedClientKey(key)
        // Show the chosen client's companies right away.
        if (key && hasPermission('view-companies') && pathname !== COMPANIES_PAGE) {
            router.push(COMPANIES_PAGE)
        }
    }

    const showClientSelect = clients.length > 1
    const needsCompanyFallback = !hasPermission('view-companies') && companies.length > 1

    if (!showClientSelect && !needsCompanyFallback) {
        return null
    }

    const fallbackCompanies = selectedClientKey
        ? companies.filter(c => (c.client ? String(c.client.id) : NO_CLIENT) === selectedClientKey)
        : companies

    return (
        <div className="nxl-h-item d-flex align-items-center gap-2">
            {showClientSelect && (
                <select
                    className="form-select form-select-sm ol-company-select"
                    value={selectedClientKey || ''}
                    onChange={handleClientChange}
                    title="Client"
                >
                    <option value="">— Select client —</option>
                    {clients.map(client => (
                        <option key={client.key} value={client.key}>{client.name}</option>
                    ))}
                </select>
            )}
            {needsCompanyFallback && (
                <select
                    className="form-select form-select-sm ol-company-select"
                    value={fallbackCompanies.some(c => c.id === activeCompanyId) ? activeCompanyId : ''}
                    onChange={(e) => {
                        if (!e.target.value) return
                        setIsChanging(true)
                        switchCompany(e.target.value)
                    }}
                    disabled={isChanging}
                    title="Company"
                >
                    <option value="">— Select company —</option>
                    {fallbackCompanies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                </select>
            )}
        </div>
    )
}

export default CompanySwitcher
