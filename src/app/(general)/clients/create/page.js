'use client'
import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import crmInstance from '@/utils/crmInstance'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import PermissionGuard from '@/components/shared/PermissionGuard'
import ClientForm from '@/components/clients/ClientForm'
import { encryptId } from '@/utils/encryptId'

const page = () => {
  const router = useRouter()

  const handleSubmit = async (values) => {
    const response = await crmInstance.post('/clients', values)
    await Swal.fire({
      title: 'Success!',
      text: 'Client created successfully',
      icon: 'success',
      confirmButtonText: 'OK',
      confirmButtonColor: '#007bff'
    })
    router.push(`/clients/${encryptId(response.data.id)}/view`)
  }

  return (
    <PermissionGuard permission="create-clients" redirect={false}>
      <PageHeader>
      </PageHeader>
      <div className='main-content'>
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">Create New Client</h5>
          </div>
          <div className="card-body">
            <ClientForm submitLabel="Create Client" savingLabel="Creating Client..." onSubmit={handleSubmit} />
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}

export default page
