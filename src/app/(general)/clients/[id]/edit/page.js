'use client'
import React, { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter, useParams } from 'next/navigation'
import Swal from 'sweetalert2'
import Spinner from '@/components/shared/Spinner'
import PermissionGuard from '@/components/shared/PermissionGuard'
import ClientForm from '@/components/clients/ClientForm'
import { decryptId } from '@/utils/decryptId'

const page = () => {
  const router = useRouter()
  const params = useParams()
  const actualId = useMemo(() => decryptId(params.id), [params.id])
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!actualId) return
    const fetchClient = async () => {
      try {
        setLoading(true)
        const response = await crmInstance.get(`/clients/${actualId}`)
        setClient(response.data)
        setError('')
      } catch (err) {
        console.error(err)
        setError('Failed to load client data')
      } finally {
        setLoading(false)
      }
    }
    fetchClient()
  }, [actualId])

  const handleSubmit = async (values) => {
    await crmInstance.put(`/clients/${actualId}`, values)
    await Swal.fire({
      title: 'Success!',
      text: 'Client updated successfully',
      icon: 'success',
      confirmButtonText: 'OK',
      confirmButtonColor: '#007bff'
    })
    router.push(`/clients/${params.id}/view`)
  }

  return (
    <PermissionGuard permission="edit-clients" redirect={false}>
      <PageHeader>
      </PageHeader>
      <div className='main-content'>
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">Edit Client</h5>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center py-5">
                <Spinner classNames={{ label: "text-foreground mt-4" }} label="Loading..." variant="spinner" />
              </div>
            ) : error ? (
              <div className="alert alert-danger">{error}</div>
            ) : (
              <ClientForm
                initialValues={client}
                submitLabel="Update Client"
                savingLabel="Updating Client..."
                onSubmit={handleSubmit}
              />
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}

export default page
