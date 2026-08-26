'use client'

import { useEffect, useRef } from 'react'
import RingCentral from '@ringcentral/sdk'

const useRingCentralSubscription = (accessToken, onNotification) => {
  const subRef = useRef(null)

  useEffect(() => {
    if (!accessToken || !onNotification) return

    const initializeSubscription = async () => {
      try {
        const rc = new RingCentral({
          clientId: process.env.NEXT_PUBLIC_RC_CLIENT_ID,
          server: 'https://platform.ringcentral.com'
        })

        const platform = rc.platform()

        await platform.login({
          access_token: accessToken
        })

        const sub = await platform.createSubscription({
          eventFilters: [
            '/restapi/v1.0/account/~/extension/~/telephony/sessions'
          ],
          deliveryMode: {
            transportType: 'WebSocket'
          }
        })

        sub.on('notification', (event) => {
          onNotification(event)
        })

        subRef.current = sub
      } catch (error) {
        console.error('Error initializing RingCentral subscription:', error)
      }
    }

    initializeSubscription()

    return () => {
      if (subRef.current) {
        subRef.current.cancel()
      }
    }
  }, [accessToken, onNotification])

  return subRef.current
}

export default useRingCentralSubscription