import React, { useState, useEffect, useRef } from 'react'

const CustomUserDropdown = ({
  users,
  selectedUser,
  loading,
  loadingMore,
  error,
  hasMore,
  onSelect,
  onLoadMore
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)

  const filteredUsers = users.filter(user =>
    user.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollTop + clientHeight >= scrollHeight - 50 && hasMore && !loadingMore) {
      onLoadMore()
    }
  }

  const getAvatarColor = (initial) => {
    const colors = [
      'bg-primary', 'bg-success', 'bg-info', 'bg-warning', 'bg-danger',
      'bg-secondary', 'bg-dark', 'bg-primary-soft', 'bg-success-soft'
    ]
    return colors[initial.charCodeAt(0) % colors.length]
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

  if (loading) {
    return <div className="form-control">Loading users...</div>
  }

  if (error) {
    return <div className="form-control text-danger">{error}</div>
  }

  return (
    <div className="dropdown" ref={dropdownRef}>
      <div
        className="form-control d-flex align-items-center justify-content-between"
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', minHeight: '48px' }}
      >
        <div className="d-flex align-items-center">
          {selectedUser ? (
            <>
              <div
                className={`avatar avatar-sm rounded-circle me-2 d-flex align-items-center justify-content-center ${getAvatarColor(selectedUser.avatar)}`}
                style={{ width: '32px', height: '32px' }}
              >
                <span className="text-white fw-bold" style={{ fontSize: '14px', lineHeight: '1' }}>
                  {selectedUser.avatar}
                </span>
              </div>
              <span>{selectedUser.label}</span>
            </>
          ) : (
            <span className="text-muted">Select a user</span>
          )}
        </div>
        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`}></i>
      </div>

      {isOpen && (
        <div className="dropdown-menu show w-100" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <div className="px-3 py-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div onScroll={handleScroll} style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filteredUsers.map((user) => (
              <div
                key={user.value}
                className="dropdown-item d-flex align-items-center"
                onClick={() => {
                  onSelect(user)
                  setIsOpen(false)
                  setSearchTerm('')
                }}
                style={{ cursor: 'pointer' }}
              >
                <div
                  className={`avatar avatar-sm rounded-circle me-2 d-flex align-items-center justify-content-center ${getAvatarColor(user.avatar)}`}
                  style={{ width: '32px', height: '32px', flexShrink: 0 }}
                >
                  <span className="text-white fw-bold" style={{ fontSize: '14px', lineHeight: '1' }}>
                    {user.avatar}
                  </span>
                </div>
                <span>{user.label}</span>
              </div>
            ))}

            {loadingMore && (
              <div className="dropdown-item text-center">
                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                Loading more users...
              </div>
            )}

            {!hasMore && users.length > 0 && (
              <div className="dropdown-item text-center text-muted">
                No more users to load
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomUserDropdown