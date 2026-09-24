import React from 'react'

const Spinner = ({ classNames = {}, label, variant = 'spinner' }) => {
  const className = classNames.label || '';

  return (
    <div className={`d-flex flex-column align-items-center justify-content-center`}>
      <div className={`spinner-border text-primary ${variant === 'spinner' ? '' : 'spinner-grow'}`} role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      {label && <div className={`mt-2 ${className}`}>{label}</div>}
    </div>
  )
}

export default Spinner