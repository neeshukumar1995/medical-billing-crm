'use client'
import React, { useEffect, useState } from 'react'
import { config, getApiUrl } from '@/utils/config'

const ApiExample = () => {
  const [apiStatus, setApiStatus] = useState('Checking...')

  useEffect(() => {
    // Example of using the API URL from environment
    //console.log('API Base URL:', config.API_BASE_URL)
    //console.log('Full Login URL:', getApiUrl(config.endpoints.auth.login))

    // Simulate API call
    setApiStatus(`API URL configured: ${config.API_BASE_URL}`)
  }, [])

  return (
    <div className="p-4 bg-light rounded">
      <h6 className="mb-2">Environment Configuration</h6>
      <p className="mb-1"><strong>API Base URL:</strong> {config.API_BASE_URL}</p>
      <p className="mb-1"><strong>App Name:</strong> {config.APP_NAME}</p>
      <p className="mb-1"><strong>Status:</strong> {apiStatus}</p>
      <small className="text-muted">
        This demonstrates how environment variables are used in the application.
      </small>
    </div>
  )
}

export default ApiExample