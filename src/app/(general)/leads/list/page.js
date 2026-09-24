import { Suspense } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Loading from '@/components/shared/Loading'

import dynamic from 'next/dynamic'

const LeadsPageClient = dynamic(
  () => import('@/components/Leadspageclient'),
  {
    loading: () => (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Loading />
      </div>
    ),
  }
)

export default function LeadsPage() {
  return (
    <PermissionGuard permission="view-leads">
     
      <div className="main-content" style={{ minHeight: '100vh' }}>
        {/* ✅ Suspense boundary: shows Loading while LeadsPageClient chunk downloads */}
        <Suspense fallback={
          <div className="d-flex justify-content-center align-items-center py-5">
            <Loading />
          </div>
        }>
          <LeadsPageClient />
        </Suspense>
      </div>

      <Footer />
    </PermissionGuard>
  )
}