'use client'
import React, { useEffect, useState } from 'react'
import crmInstance from '@/utils/crmInstance'
import { useUser } from '@/context/UserContext'

/**
 * Client picker for the company create/edit forms. value is a client id or ''.
 * Only platform users choose freely; everyone else sees their own client
 * read-only, because the backend always files their companies under it.
 */
const ClientSelect = ({ value, onChange, disabled }) => {
  const { isPlatform, access } = useUser()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isPlatform) return
    crmInstance.get('/clients', { params: { per_page: 1000 } })
      .then(res => setClients(res.data?.data || []))
      .catch(err => console.error('Failed to load clients:', err))
      .finally(() => setLoading(false))
  }, [isPlatform])

  if (!isPlatform) {
    return <input type="text" className="form-control" value={access?.client?.name || '—'} disabled readOnly />
  }

  return (
    <select
      name="client_id"
      className="form-select"
      value={value ?? ''}
      onChange={onChange}
      disabled={disabled || loading}
    >
      <option value="">{loading ? 'Loading clients...' : '— No client —'}</option>
      {clients.map(client => (
        <option key={client.id} value={client.id}>{client.name}</option>
      ))}
    </select>
  )
}

export default ClientSelect
