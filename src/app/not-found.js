'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { HOME_PATH } from '@/constants/portalScope';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <div className="text-center">
        <div className="display-1 text-warning mb-4">
          <i className="bi bi-exclamation-triangle-fill"></i>
        </div>
        <h2 className="mb-3">Page Not Found</h2>
        <p className="text-muted mb-4">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="d-flex gap-3 justify-content-center">
          <button
            className="btn btn-primary"
            onClick={() => router.push(HOME_PATH)}
          >
            <i className="bi bi-house-door me-2"></i>
            Go to Dashboard
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => router.back()}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}