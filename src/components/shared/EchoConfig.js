'use client'

import { useEffect } from 'react'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

const EchoConfig = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.Pusher = Pusher

      window.Echo = new Echo({
        broadcaster: 'pusher',
        key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'PUSHER_KEY',
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'PUSHER_CLUSTER',
        forceTLS: true
      })
    }
  }, [])

  return null
}

export default EchoConfig