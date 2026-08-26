'use client'

// ✅ Ab ye sirf StatusUpdateModal ko wrap karta hai, taaki
// jahan BulkStatusModal already use ho raha hai wahan kuch change na karna pade.
import StatusUpdateModal from '@/components/shared/StatusUpdateModal'

export default function BulkStatusModal({
  selectedCount,
  leadStatuses,
  bulkStatusId,
  setBulkStatusId,
  bulkStatusNotes,
  setBulkStatusNotes,
  bulkFollowupDate,
  setBulkFollowupDate,
  onClose,
  onSubmit,
}) {
  return (
    <StatusUpdateModal
      title={`Update Status for ${selectedCount} Selected Lead(s)`}
      leadStatuses={leadStatuses}
      statusId={bulkStatusId}
      setStatusId={setBulkStatusId}
      notes={bulkStatusNotes}
      setNotes={setBulkStatusNotes}
      followupDate={bulkFollowupDate}
      setFollowupDate={setBulkFollowupDate}
      onClose={onClose}
      onSubmit={onSubmit}
      submitLabel="Update Status"
    />
  )
}