'use client'
import React, { useMemo, useState } from 'react'
import { useUser, NO_CLIENT } from '@/context/UserContext'

/**
 * Header switcher: pick a Client, then one of that client's Companies.
 * Picking a company makes it the active company — every page of the portal
 * (patients, claims, leads, users, dashboard, ...) then shows its data.
 *
 * The Client dropdown appears only when the user's companies span more than
 * one client; otherwise the client is chosen automatically (UserContext).
 * The chosen client is shared with the Companies list and is also set by
 * opening a client from the sidebar's Clients list.
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
    const clientCompanies = selectedClientKey
        ? companies.filter(c => (c.client ? String(c.client.id) : NO_CLIENT) === selectedClientKey)
        : []

    // Nothing to choose: one client with a single company.
    if (!showClientSelect && companies.length <= 1) {
        return null
    }

    const handleCompanyChange = (e) => {
        if (!e.target.value) return
        setIsChanging(true)
        // Reloads the current page so it shows the newly chosen company's data.
        switchCompany(e.target.value)
    }

    const companyValue = clientCompanies.some(c => c.id === activeCompanyId) ? activeCompanyId : ''

    return (
        <div className="nxl-h-item d-flex align-items-center gap-2">
            {showClientSelect && (
                <select
                    className="form-select form-select-sm ol-company-select"
                    value={selectedClientKey || ''}
                    onChange={(e) => setSelectedClientKey(e.target.value)}
                    disabled={isChanging}
                    title="Client"
                >
                    <option value="">— Select client —</option>
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
                        {clientCompanies.map(company => (
                            <option key={company.id} value={company.id}>
                                {company.name}{company.status && company.status !== 'Active' ? ` (${company.status})` : ''}
                            </option>
                        ))}
                    </>
                )}
            </select>
        </div>
    )
}

export default CompanySwitcher
