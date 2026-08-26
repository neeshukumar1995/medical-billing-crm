import React, { useState, useEffect, useRef } from 'react'

const CustomServiceDropdown = ({
  selectedServices,
  onSelect,
  customService,
  setCustomService,
  showCustomService,
  setShowCustomService
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const serviceOptions = [
    "Add service"
  ]

  const handleToggleService = (service) => {
    if (service === "Add service") {
      setShowCustomService(!showCustomService)
    } else {
      if (selectedServices.includes(service)) {
        onSelect(selectedServices.filter(s => s !== service))
      } else {
        onSelect([...selectedServices, service])
      }
    }
  }

  const handleRemoveService = (service) => {
    onSelect(selectedServices.filter(s => s !== service))
  }

  const handleCustomServiceChange = (e) => {
    setCustomService(e.target.value)
  }

  const handleAddCustomService = () => {
    if (customService.trim() && !selectedServices.includes(customService.trim())) {
      onSelect([...selectedServices, customService.trim()])
      setCustomService('')
      setShowCustomService(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="dropdown" ref={dropdownRef}>
      <div
        className="form-control d-flex align-items-center justify-content-between"
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', minHeight: '48px' }}
      >
        <div className="d-flex flex-wrap gap-1">
          {selectedServices.length > 0 ? (
            selectedServices.map((service, index) => (
              <span key={index} className="badge bg-primary d-flex align-items-center gap-1">
                {service}
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  style={{ fontSize: '10px' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveService(service)
                  }}
                ></button>
              </span>
            ))
          ) : (
            <span className="text-muted">Select services</span>
          )}
        </div>
        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`}></i>
      </div>

      {isOpen && (
        <div className="dropdown-menu show w-100" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {serviceOptions.map((service, index) => (
            <div
              key={index}
              className="dropdown-item d-flex align-items-center"
              onClick={() => handleToggleService(service)}
              style={{ cursor: 'pointer' }}
            >
              <span>{service}</span>
            </div>
          ))}

          {showCustomService && (
            <div className="dropdown-item">
              <div className="d-flex gap-2 align-items-end" style={{width:'100%'}}>
                <div className="flex-grow-1">
                  <textarea
                    className="form-control form-control-sm"
                    placeholder="Enter custom service description"
                    value={customService}
                    onChange={handleCustomServiceChange}
                    rows="2"
                    style={{ resize: 'vertical', minHeight: '50px', width: '100%' }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleAddCustomService}
                  disabled={!customService.trim()}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CustomServiceDropdown