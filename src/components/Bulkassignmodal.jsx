'use client'

// ✅ OPTIMIZATION: Separate chunk — 0KB in initial bundle
import CustomUserDropdown from '@/components/CustomUserDropdown'

export default function BulkAssignModal({
  selectedCount,
  users,
  bulkAssignUserId,
  setBulkAssignUserId,
  usersLoading,
  usersLoadingMore,
  usersError,
  usersHasMore,
  onLoadMore,
  onClose,
  onSubmit,
}) {
  const selectedUser = users.find(u => String(u.value) === String(bulkAssignUserId)) || null

  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Assign Leads to User — {selectedCount} Selected</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Select User</label>
              <CustomUserDropdown
                users={users}
                selectedUser={selectedUser}
                loading={usersLoading}
                loadingMore={usersLoadingMore}
                error={usersError}
                hasMore={usersHasMore}
                onSelect={(user) => setBulkAssignUserId(user?.value || '')}
                onLoadMore={onLoadMore}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={!bulkAssignUserId}>
              Assign Leads
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
