import React, { useState, useEffect } from 'react'
import TableSearch from './TableSearch'
import TablePagination from './TablePagination'
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa'
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, getRowId, useReactTable } from '@tanstack/react-table'

const Table = ({data, columns, showPagination = true, enableRowSelection = false, onSelectionChange, rowSelection: controlledRowSelection, onRowSelectionChange, onSearch, showEntriesDropdown = true, disablePagination = false, customFilters, getRowClassName}) => {
    // const [data] = useState([...fackData])
    const [sorting, setSorting] = useState([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: disablePagination ? 10000 : 10,
    })
    const [internalRowSelection, setInternalRowSelection] = useState({})

    // Use controlled rowSelection if provided, otherwise use internal state
    const rowSelection = controlledRowSelection !== undefined ? controlledRowSelection : internalRowSelection
    const setRowSelection = controlledRowSelection !== undefined ? onRowSelectionChange || (() => {}) : setInternalRowSelection

    // If onSearch is provided, disable client-side filtering
    const enableFiltering = !onSearch

    const table = useReactTable({
        data,
        columns,
        state: {
            ...(enableFiltering && { globalFilter }),
            pagination,
            ...(enableRowSelection && { rowSelection })
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        ...(enableFiltering && {
            getFilteredRowModel: getFilteredRowModel(),
            onGlobalFilterChange: setGlobalFilter,
        }),
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
        ...(enableRowSelection && {
            enableRowSelection,
            onRowSelectionChange: setRowSelection,
            getRowId: (row) => row.id.toString()
        })
    })

    useEffect(() => {
        if (enableRowSelection && onSelectionChange) {
            const selectedRows = table.getSelectedRowModel().rows.map(row => row.original)
            onSelectionChange(selectedRows)
        }
    }, [rowSelection, enableRowSelection, onSelectionChange, table])


    return (
        <div className="col-lg-12">
                <div className="card stretch stretch-full function-table">
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <div className='dataTables_wrapper dt-bootstrap5 no-footer'>
                            {/* <TableSearch table={table} setGlobalFilter={setGlobalFilter} globalFilter={globalFilter} onSearch={onSearch} showEntriesDropdown={showEntriesDropdown} customFilters={customFilters}/> */}

                            <div className="row dt-row">
                                <div className="col-sm-12 px-0">
                                    <table className="table table-hover dataTable no-footer" id='projectList'>
                                        <thead>
                                            {table.getHeaderGroups().map((headerGroup) => (
                                                <tr key={headerGroup.id} >
                                                    {
                                                        headerGroup.headers.map((header) => {
                                                            return (
                                                                <th key={header.id} className={header.column.columnDef.meta?.headerClassName}>
                                                                    {
                                                                        header.id === "id" ?
                                                                            <div className='d-flex gap-2'>
                                                                                {
                                                                                    flexRender(
                                                                                        header.column.columnDef.header,
                                                                                        header.getContext()
                                                                                    )

                                                                                }
                                                                                <ArrowToggle header={header} />
                                                                            </div>
                                                                            :
                                                                            <ArrowToggle header={header}>
                                                                                {
                                                                                    flexRender(
                                                                                        header.column.columnDef.header,
                                                                                        header.getContext()
                                                                                    )
                                                                                }
                                                                            </ArrowToggle>
                                                                    }
                                                                </th>
                                                            )
                                                        })
                                                    }
                                                </tr>
                                            ))}
                                        </thead>
                                        <tbody>
                                            {
                                                table.getRowModel().rows.map((row) => (
                                                    <tr
                                                        key={row.index}
                                                        className={`single-item chat-single-item ${getRowClassName ? getRowClassName(row.original) : ''}`}
                                                    >
                                                        {row.getVisibleCells().map((cell) => {
                                                            return (
                                                                <td key={cell.id} className={cell.column.columnDef.meta?.className}>
                                                                    {
                                                                        flexRender(
                                                                            cell.column.columnDef.cell,
                                                                            cell.getContext()
                                                                        )
                                                                    }
                                                                </td>
                                                            )
                                                        })}
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {showPagination && <TablePagination table={table} />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Table

const ArrowToggle = ({ header, children }) => {
    const position = header.column.getIsSorted()
    return (
        <div
            className='table-head'
            style={{
                cursor: header.column.getCanSort() ? "pointer" : "default"
            }}
            onClick={header.column.getToggleSortingHandler()}
        >

            {children}
            {
                {
                    asc: <FaSortUp size={13} opacity={position === "asc" ? 1 : .125} />,
                    desc: <FaSortDown size={13} opacity={position === "desc" ? 1 : .125} />
                }[position]
            }
            {header.column.getCanSort() && !position ? (
                <FaSort size={13} opacity={.125} />
            ) : null}
        </div>
    )
}