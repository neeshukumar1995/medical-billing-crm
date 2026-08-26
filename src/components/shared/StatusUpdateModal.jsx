'use client'

import SelectDropdown from '@/components/shared/SelectDropdown'

export default function StatusUpdateModal({
  title = 'Update Status',
  leadStatuses,
  statusId,
  setStatusId,
  notes,
  setNotes,
  followupDate,
  setFollowupDate,
  onClose,
  onSubmit,
  submitLabel = 'Update Status',
}) {
  const selectedStatus = leadStatuses.find(s => s.value === statusId)

  // case-insensitive match — "Follow Up", "follow up", "In Progress" etc. sab match honge
  const isFollowUp = /follow up|progress/i.test(selectedStatus?.label || '')

  const canSubmit = statusId && (!isFollowUp || (isFollowUp && followupDate))

  return (
    <>
      <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
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
                    setFollowupDate('')
                  }}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Add notes about this status update..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
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
                {submitLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  )
}