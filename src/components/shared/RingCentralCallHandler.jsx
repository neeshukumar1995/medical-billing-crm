'use client'

import { useState, useEffect } from 'react'
import useRingCentralSubscription from '@/hooks/useRingCentralSubscription'

const RingCentralCallHandler = ({ accessToken }) => {
  const [callStatus, setCallStatus] = useState('Idle')
  const [callDuration, setCallDuration] = useState(0)

  const handleNotification = (msg) => {
    const status = msg?.body?.telephonyStatus

    if (status === 'Ringing') {
      playRingTone()      // 🔔 Portal ring
      setCallStatus('Ringing')
    }

    if (status === 'CallConnected') {
      stopRingTone()
      setCallStatus('Connected')
    }

    if (status === 'NoAnswer' || status === 'Disconnected') {
      stopRingTone()
      setCallStatus('Ended')
    }
  }

  useRingCentralSubscription(accessToken, handleNotification)

  // Duration timer
  useEffect(() => {
    let interval
    if (callStatus === 'Connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    } else {
      setCallDuration(0)
    }
    return () => clearInterval(interval)
  }, [callStatus])

  // Ring Tone (Browser)
  const audio = new Audio('/ringtone.mp3')

  const playRingTone = () => {
    audio.loop = true
    audio.play()
  }

  const stopRingTone = () => {
    audio.pause()
    audio.currentTime = 0
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="ringcentral-call-handler">
      <p>Call Status: {callStatus}</p>
      {callStatus === 'Connected' && (
        <p>Duration: {formatDuration(callDuration)}</p>
      )}
      {/* Add UI for call controls if needed */}
    </div>
  )
}

export default RingCentralCallHandler