import React from 'react'

const TableSearch = ({table, setGlobalFilter, globalFilter, showEntriesDropdown = true, customFilters}) => {
    return (
        <div className='row gy-2'>
            {showEntriesDropdown && (
                <div className='col-sm-12 col-md-6 ps-0 m-0 pb-10'>
                    <div className='dataTables_length d-flex justify-content-md-start justify-content-center'>
                        <label className='d-flex align-items-center gap-1'>
                            Show
                            <select
                                className='form-select form-select-sm w-auto pe-4'
                                value={table.getState().pagination.pageSize}
                                onChange={e => {
                                    table.setPageSize(Number(e.target.value))
                                }}
                            >
                                {[10, 20, 30, 40, 50].map(pageSize => (
                                    <option key={pageSize} value={pageSize}>
                                        {pageSize}
                                    </option>
                                ))}
                            </select>
                            entries
                        </label>
                    </div>
                </div>
            )}
            <div className={`col-sm-12 ${showEntriesDropdown ? 'col-md-6' : 'col-md-12'} ps-0 m-0 pb-10`}>
                <div className='dataTables_filter'>
                    <div className='d-flex align-items-center gap-3'>
                        <div className='flex-fill'>
                            <label className='d-flex align-items-center gap-2 mb-0'>
                                Search:
                                <input
                                    type="text"
                                    value={globalFilter ?? ""}
                                    onChange={(e) => setGlobalFilter(e.target.value)}
                                    placeholder='Search...'
                                    className="form-control form-control-sm"
                                />
                            </label>
                        </div>
                        <div className='flex-fill'>
                            {customFilters && React.Children.toArray(customFilters)[0]}
                        </div>
                        <div className='flex-fill'>
                            {customFilters && React.Children.toArray(customFilters)[1]}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TableSearch