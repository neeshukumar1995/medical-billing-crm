'use client'
import Link from 'next/link'
import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import crmInstance from '@/utils/crmInstance'
import Image from 'next/image'

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid reset link. Please request a new password reset.')
    }
  }, [token, email])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setIsLoading(false)
      return
    }

    try {
      const response = await crmInstance.post('/reset-password', { token, email, password })

      if (response.data) {
        setSuccess('Password has been reset successfully. You can now log in with your new password.')
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="auth-creative-wrapper">
      <div className="auth-creative-inner">
        <div className="creative-card-wrapper">
          <div className="card my-4 overflow-hidden" style={{ zIndex: 1 }}>
            <div className="row flex-1 g-0">
              <div className="col-lg-6 h-100 my-auto order-1 order-lg-0">
                <div className="wd-50 bg-white p-2 rounded-circle shadow-lg position-absolute translate-middle top-50 start-50 d-none d-lg-block">
                  <img src="/images/logo-abbr.png" alt="img" className="img-fluid" />
                </div>
                <div className="creative-card-body card-body p-sm-5">
                  <h2 className="fs-20 fw-bolder mb-4">Reset Password</h2>
                  <h4 className="fs-13 fw-bold mb-2">Enter your new password</h4>

                  {error && <div className="alert alert-danger">{error}</div>}
                  {success && <div className="alert alert-success">{success}</div>}

                  <form onSubmit={handleSubmit} className="w-100 mt-4 pt-2">
                    <div className="mb-4">
                      <input
                        type="password"
                        className="form-control"
                        placeholder="New Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading || !token || !email}
                      />
                    </div>

                    <div className="mb-4">
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading || !token || !email}
                      />
                    </div>

                    <div className="mt-5">
                      <button type="submit" className="btn btn-lg btn-primary w-100" disabled={isLoading || !token || !email}>
                        {isLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Resetting...
                          </>
                        ) : (
                          'Reset Password'
                        )}
                      </button>
                    </div>
                  </form>

                  <div className="mt-4 text-center">
                    <Link href="/" className="fs-11 text-primary">
                      Back to Login
                    </Link>
                  </div>
                </div>
              </div>
              <div className="col-lg-6 bg-primary order-0 order-lg-1">
                <div className="h-100 d-flex align-items-center justify-content-center">
                  <Image width={499} height={499} sizes='100vw' src="/images/auth/auth-user.png" alt="img" className="img-fluid" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default ResetPasswordPage