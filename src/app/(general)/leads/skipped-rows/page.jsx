'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import PermissionGuard from '@/components/shared/PermissionGuard'
import crmInstance from '@/utils/crmInstance'

const SkippedRowsPage = () => {
  const router = useRouter()
  const [skippedRows, setSkippedRows]   = useState([])
  const [meta, setMeta]                 = useState(null)
  const [searchTerm, setSearchTerm]     = useState('')
  const [currentPage, setCurrentPage]   = useState(1)
  const [loading, setLoading]           = useState(true)
  const [selectedIds, setSelectedIds]   = useState([])   // ✅ selected checkboxes
  const [deleting, setDeleting]         = useState(null) // ✅ single delete loading id
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const perPage = 10

  const getParsedCid = () => JSON.parse(localStorage.getItem('companyId'))

  // ── Fetch from API ────────────────────────────────────────────────────────
  const fetchSkippedLeads = async () => {
    try {
      setLoading(true)
      const cid      = getParsedCid()
      const response = await crmInstance.get(`/skipped-leads/${cid}`)
      if (response.data.status) {
        setSkippedRows(response.data.data)
        setMeta({
          skipped_count : response.data.meta.total,
          error_count   : response.data.meta.not_found,
          imported_at   : response.data.data?.[0]?.created_at ?? null,
        })
      }
    } catch (error) {
      console.error('Failed to fetch skipped leads:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSkippedLeads() }, [])

  // ── Single delete ─────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      setDeleting(id)
      const cid = getParsedCid()
      await crmInstance.delete(`/skipped-leads/${cid}/${id}`)
      setSkippedRows(prev => {
        const updated = prev.filter(r => r.id !== id)
        setMeta(m => m ? { ...m, skipped_count: updated.length } : m)
        return updated
      })
      setSelectedIds(prev => prev.filter(sid => sid !== id))
    } catch (error) {
      console.error('Failed to delete skipped lead:', error)
    } finally {
      setDeleting(null)
    }
  }

  // ── Bulk delete selected ──────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    try {
      setBulkDeleting(true)
      const cid = getParsedCid()
      await Promise.all(
        selectedIds.map(id => crmInstance.delete(`/skipped-leads/${cid}/${id}`))
      )
      setSkippedRows(prev => {
        const updated = prev.filter(r => !selectedIds.includes(r.id))
        setMeta(m => m ? { ...m, skipped_count: updated.length } : m)
        return updated
      })
      setSelectedIds([])
    } catch (error) {
      console.error('Failed to bulk delete:', error)
    } finally {
      setBulkDeleting(false)
    }
  }

  // ── Clear all ─────────────────────────────────────────────────────────────
  const handleClearData = async () => {
    try {
      const cid = getParsedCid()
      await crmInstance.delete(`/skipped-leads/${cid}`)
      setSkippedRows([])
      setSelectedIds([])
      setMeta(null)
    } catch (error) {
      console.error('Failed to clear skipped leads:', error)
    }
  }

  // ── Filter + Pagination — pehle define karo ──────────────────────────────
  const filtered   = skippedRows.filter(row =>
    row.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated  = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)

  // ── Checkbox helpers — paginated ke baad define karo ─────────────────────
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    )
  }

  const isAllSelected =
    paginated.length > 0 && paginated.every(r => selectedIds.includes(r.id))

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !paginated.map(r => r.id).includes(id)))
    } else {
      const newIds = paginated.map(r => r.id).filter(id => !selectedIds.includes(id))
      setSelectedIds(prev => [...prev, ...newIds])
    }
  }

  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <PermissionGuard permission="raw-leads">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <PageHeader>
        <div className="d-flex align-items-center justify-content-between w-100 px-3 py-2">
          <div className="d-flex align-items-center gap-3">
            <button
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              onClick={() => router.back()}
            >
              <i className="bi bi-arrow-left"></i> Back
            </button>
            <div>
              <h5 className="mb-0 fw-semibold">Skipped Rows</h5>
              <small className="text-muted">Leads skipped during Excel import</small>
            </div>
          </div>

          {skippedRows.length > 0 && (
            <button
              className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
              onClick={handleClearData}
            >
              <i className="bi bi-trash3"></i> Clear All
            </button>
          )}
        </div>
      </PageHeader>

      <div className="main-content" style={{ minHeight: '100vh' }}>
        <div className="row">
          <div className="col-lg-12">

            {/* ── Summary Cards ────────────────────────────────────────────── */}
            {meta && (
              <div className="row mb-4">
                <div className="col-md-3">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body d-flex align-items-center gap-3">
                      <div className="rounded-circle bg-warning-subtle d-flex align-items-center justify-content-center"
                        style={{ width: 48, height: 48, flexShrink: 0 }}>
                        <i className="bi bi-skip-forward-fill text-warning fs-5"></i>
                      </div>
                      <div>
                        <div className="fs-4 fw-bold">{meta.skipped_count}</div>
                        <div className="text-muted small">Total Skipped</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body d-flex align-items-center gap-3">
                      <div className="rounded-circle bg-danger-subtle d-flex align-items-center justify-content-center"
                        style={{ width: 48, height: 48, flexShrink: 0 }}>
                        <i className="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
                      </div>
                      <div>
                        <div className="fs-4 fw-bold">{meta.error_count}</div>
                        <div className="text-muted small">Lead Type Not Found</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body d-flex align-items-center gap-3">
                      <div className="rounded-circle bg-info-subtle d-flex align-items-center justify-content-center"
                        style={{ width: 48, height: 48, flexShrink: 0 }}>
                        <i className="bi bi-clock-history text-info fs-5"></i>
                      </div>
                      <div>
                        <div className="fw-semibold">{formatDate(meta.imported_at)}</div>
                        <div className="text-muted small">Last Skipped Entry</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Main Table Card ───────────────────────────────────────────── */}
            <div className="card stretch stretch-full">
              <div className="card-body">

                {/* ── Loading ──────────────────────────────────────────────── */}
                {loading && (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted mt-2 small">Fetching skipped rows...</p>
                  </div>
                )}

                {/* ── Toolbar: Search + Bulk Delete ─────────────────────────── */}
                {!loading && skippedRows.length > 0 && (
                  <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted small">
                        Showing <strong>{paginated.length}</strong> of <strong>{filtered.length}</strong> rows
                      </span>

                      {/* ✅ Bulk delete button — selected hone par dikhao */}
                      {selectedIds.length > 0 && (
                        <button
                          className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                          onClick={handleBulkDelete}
                          disabled={bulkDeleting}
                        >
                          {bulkDeleting ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <i className="bi bi-trash3"></i>
                          )}
                          Delete Selected ({selectedIds.length})
                        </button>
                      )}
                    </div>

                    {/* Search input */}
                    <div style={{ minWidth: 260 }}>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text bg-transparent">
                          <i className="bi bi-search text-muted"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search by name or reason..."
                          value={searchTerm}
                          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                        />
                        {searchTerm && (
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setSearchTerm('')}
                          >
                            <i className="bi bi-x"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Empty State ───────────────────────────────────────────── */}
                {!loading && skippedRows.length === 0 && (
                  <div className="text-center py-5">
                    <div className="rounded-circle bg-success-subtle d-inline-flex align-items-center justify-content-center mb-3"
                      style={{ width: 72, height: 72 }}>
                      <i className="bi bi-check-circle-fill text-success" style={{ fontSize: 32 }}></i>
                    </div>
                    <h6 className="fw-semibold text-dark mb-1">No Skipped Rows</h6>
                    <p className="text-muted small mb-3">
                      All rows were imported successfully, or no import has been done yet.
                    </p>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => router.push('/leads/raw-leads')}
                    >
                      <i className="bi bi-arrow-left me-1"></i>Go to Leads
                    </button>
                  </div>
                )}

                {/* ── Table ────────────────────────────────────────────────── */}
                {!loading && skippedRows.length > 0 && (
                  <>
                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            {/* ✅ Select All checkbox */}
                            <th style={{ width: 40 }}>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={isAllSelected}
                                onChange={toggleSelectAll}
                              />
                            </th>
                            <th style={{ width: 50 }}>#</th>
                            <th style={{ width: 90 }}>Row No.</th>
                            <th>Lead Name</th>
                            <th>Email</th>
                            <th>Reason for Skipping</th>
                            <th>Date</th>
                            <th style={{ width: 80 }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginated.map((row, index) => (
                            <tr
                              key={row.id ?? index}
                              className={selectedIds.includes(row.id) ? 'table-warning' : ''}
                            >
                              {/* ✅ Row checkbox */}
                              <td>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={selectedIds.includes(row.id)}
                                  onChange={() => toggleSelect(row.id)}
                                />
                              </td>

                              {/* Serial */}
                              <td className="text-muted small">
                                {(currentPage - 1) * perPage + index + 1}
                              </td>

                              {/* Row number */}
                              <td>
                                <span className="badge bg-secondary-subtle text-secondary px-2 py-1">
                                  Row {row.row_number}
                                </span>
                              </td>

                              {/* Name */}
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <div className="rounded-circle bg-warning-subtle d-flex align-items-center justify-content-center"
                                    style={{ width: 34, height: 34, flexShrink: 0 }}>
                                    <span className="fw-bold text-warning small">
                                      {row.name?.charAt(0)?.toUpperCase() || '?'}
                                    </span>
                                  </div>
                                  <span className="fw-medium">
                                    {row.name || <span className="text-muted fst-italic">Unknown</span>}
                                  </span>
                                </div>
                              </td>

                              {/* Email */}
                              <td className="text-muted small">{row.email || '—'}</td>

                              {/* Reason */}
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <i className="bi bi-info-circle-fill text-warning"></i>
                                  <span className="text-danger small">{row.reason}</span>
                                </div>
                              </td>

                              {/* Date */}
                              <td className="text-muted small">{formatDate(row.created_at)}</td>

                              {/* ✅ Single delete button */}
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                                  onClick={() => handleDelete(row.id)}
                                  disabled={deleting === row.id}
                                  title="Delete this row"
                                >
                                  {deleting === row.id ? (
                                    <span className="spinner-border spinner-border-sm" />
                                  ) : (
                                    <i className="bi bi-trash3"></i>
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* ── Pagination ──────────────────────────────────────────── */}
                    {totalPages > 1 && (
                      <div className="d-flex align-items-center justify-content-between mt-3 flex-wrap gap-2">
                        <small className="text-muted">Page {currentPage} of {totalPages}</small>
                        <nav>
                          <ul className="pagination pagination-sm mb-0">
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                              <button className="page-link"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                                <i className="bi bi-chevron-left"></i>
                              </button>
                            </li>

                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                              .reduce((acc, p, idx, arr) => {
                                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                                acc.push(p)
                                return acc
                              }, [])
                              .map((p, i) =>
                                p === '...' ? (
                                  <li key={`e-${i}`} className="page-item disabled">
                                    <span className="page-link">…</span>
                                  </li>
                                ) : (
                                  <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                                    <button className="page-link" onClick={() => setCurrentPage(p)}>{p}</button>
                                  </li>
                                )
                              )}

                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                              <button className="page-link"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                                <i className="bi bi-chevron-right"></i>
                              </button>
                            </li>
                          </ul>
                        </nav>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </PermissionGuard>
  )
}

export default SkippedRowsPage