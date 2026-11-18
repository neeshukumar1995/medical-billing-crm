'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ClientIdRedirectPage() {
    const params = useParams()
    const router = useRouter()

    useEffect(() => {
        if (params?.id) {
            router.replace(`/clients/${encodeURIComponent(params.id)}/view`)
        } else {
            router.replace('/clients/list')
        }
    }, [params, router])

    return null
}

