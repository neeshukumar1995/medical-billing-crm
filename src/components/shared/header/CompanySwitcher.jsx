'use client'
import React, { useMemo, useState } from 'react'
import { useUser, NO_CLIENT, ALL_CLIENTS, ALL_COMPANIES } from '@/context/UserContext'

/**
 * Header switcher: pick a Client (or "All Clients"), then one of that client's
 * Companies (or "All Companies").
 * Picking a single company makes it the active company — every page of the portal
 * shows its data. Picking "All Clients" / "All Companies" shows combined data
 * across all accessible clients/companies.
 */
const CompanySwitcher = () => {
    const { companies, activeCompanyId, switchCompany, selectedClientKey, setSelectedClientKey } = useUser()
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

    const showClientSelect = clients.length > 1
    const clientCompanies = useMemo(() => {
        if (!selectedClientKey) return []
        if (selectedClientKey === ALL_CLIENTS) return companies
        return companies.filter(c => (c.client ? String(c.client.id) : NO_CLIENT) === selectedClientKey)
    }, [companies, selectedClientKey])

    // Nothing to choose: one client with a single company.
    if (!showClientSelect && companies.length <= 1) {
        return null
    }

    const handleClientChange = (e) => {
        const val = e.target.value
        setSelectedClientKey(val)
        // If "All Clients" is selected, automatically select "All Companies" and reload
        // so all clients & companies data loads immediately.
        if (val === ALL_CLIENTS) {
            setIsChanging(true)
            switchCompany(ALL_COMPANIES)
        } else if (val && activeCompanyId === ALL_COMPANIES) {
            // If already in "All Companies" mode and the user switches to a specific client,
            // reload so the portal shows all companies of that newly chosen client.
            setIsChanging(true)
            switchCompany(ALL_COMPANIES)
        }
    }

    const handleCompanyChange = (e) => {
        if (!e.target.value) return
        setIsChanging(true)
        // Reloads the current page so it shows the newly chosen company's (or all companies') data.
        switchCompany(e.target.value)
    }

    const companyValue = activeCompanyId === ALL_COMPANIES
        ? ALL_COMPANIES
        : (clientCompanies.some(c => c.id === activeCompanyId) ? activeCompanyId : '')

    return (
        <div className="nxl-h-item d-flex align-items-center gap-2">
            {showClientSelect && (
                <select
                    className="form-select form-select-sm ol-company-select"
                    value={selectedClientKey || ''}
                    onChange={handleClientChange}
                    disabled={isChanging}
                    title="Client"
                >
                    <option value="">— Select client —</option>
                    <option value={ALL_CLIENTS}>All Clients ({clients.length})</option>
                    {clients.map(client => (
                        <option key={client.key} value={client.key}>{client.name}</option>
                    ))}
                </select>
            )}
            <select
                className="form-select form-select-sm ol-company-select"
                value={companyValue}
                onChange={handleCompanyChange}
                disabled={isChanging || !selectedClientKey}
                title={selectedClientKey ? 'Company' : 'Select a client first'}
            >
                {!selectedClientKey ? (
                    <option value="">Select a client first</option>
                ) : (
                    <>
                        {companyValue === '' && <option value="">— Select company —</option>}
                        {clientCompanies.length > 1 && (
                            <option value={ALL_COMPANIES}>
                                All Companies ({clientCompanies.length})
                            </option>
                        )}
                        {clientCompanies.map(company => (
                            <option key={company.id} value={company.id}>
                                {company.name}{selectedClientKey === ALL_CLIENTS && company.client?.name ? ` — ${company.client.name}` : ''}{company.status && company.status !== 'Active' ? ` (${company.status})` : ''}
                            </option>
                        ))}
                    </>
                )}
            </select>
        </div>
    )
}

export default CompanySwitcher
