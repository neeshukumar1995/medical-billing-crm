'use client'

// ✅ OPTIMIZATION: This entire modal is a separate chunk
// It's ~0KB in initial bundle, downloaded only when first opened
import SelectDropdown from '@/components/shared/SelectDropdown'

export default function AddNoteModal({
  leadName,
  leadStatuses,
  statusId,
  setStatusId,
  noteText,
  setNoteText,
  followupDate,
  setFollowupDate,
  sellingPrice,
  setSellingPrice,
  submitting,
  onClose,
  onSubmit,
}) {
  const selectedStatus = leadStatuses.find(s => s.value === statusId)

  // ✅ case-insensitive match — handles "Follow Up", "follow up",
  // "In Progress", "in progress", etc.
  const isFollowUp  = /follow up|progress/i.test(selectedStatus?.label || '')
  const isConverted = /convert/i.test(selectedStatus?.label || '')

  const canSubmit =
    !submitting &&
    noteText.trim().length > 0 &&
    (!isFollowUp || (isFollowUp && followupDate))

  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Add Note{leadName ? ` for ${leadName}` : ''}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Status</label>
              <SelectDropdown
                options={leadStatuses}
                selectedOption={selectedStatus || null}
                onSelectOption={(opt) => {
                  setStatusId(opt?.value || '')
                  // status badalte hi purani follow-up date clear kar do
                  // taaki galat status ke sath purani date submit na ho
                  setFollowupDate('')
                }}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">
                Note <span className="text-danger">*</span>
              </label>
              <textarea
                className="form-control"
                rows="4"
                placeholder="Write a note about this lead..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                autoFocus
              />
              {!noteText.trim() && (
                <div className="text-danger" style={{ fontSize: 12, marginTop: 4 }}>
                  Note text is required
                </div>
              )}
            </div>

            {isFollowUp && (
              <div className="mb-3">
                <label className="form-label">
                  Follow-up Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={followupDate}
                  onChange={e => setFollowupDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
                {!followupDate && (
                  <div className="text-danger" style={{ fontSize: 12, marginTop: 4 }}>
                    Follow-up date is required for this status
                  </div>
                )}
              </div>
            )}

            {isConverted && (
              <div className="mb-3">
                <label className="form-label">Selling Price</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Enter selling price"
                  value={sellingPrice}
                  onChange={e => setSellingPrice(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onSubmit}
              disabled={!canSubmit}
            >
              {submitting ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}