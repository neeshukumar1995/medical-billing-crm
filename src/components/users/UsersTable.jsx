'use client'
import React, { memo, useEffect, useState } from 'react'
import Table from '@/components/shared/table/Table';
import { FiAlertOctagon, FiArchive, FiClock, FiEdit3, FiEye, FiMoreHorizontal, FiMoreVertical, FiPrinter, FiSend, FiTrash2 } from 'react-icons/fi'
import Dropdown from '@/components/shared/Dropdown';
import SelectDropdown from '@/components/shared/SelectDropdown';
import Select from 'react-select'
import { usersTableData } from '@/utils/fackData/usersTableData';
import Link from 'next/link';

const actions = [
    { label: "Edit", icon: <FiEdit3 /> },
    { label: "Print", icon: <FiPrinter /> },
    { type: "divider" },
    { label: "Archive", icon: <FiArchive /> },
    { type: "divider" },
    { label: "Delete", icon: <FiTrash2 />, },
];

const TableCell = memo(({ options, defaultSelect }) => {
    const [selectedOption, setSelectedOption] = useState(null);

    return (
        <SelectDropdown
            options={options}
            defaultSelect={defaultSelect}
            selectedOption={selectedOption}
            onSelectOption={(option) => setSelectedOption(option)}
        />
    );
});

const UsersTable = () => {

    const columns = [
        {
            accessorKey: 'id',
            header: ({ table }) => {
                const checkboxRef = React.useRef(null);

                useEffect(() => {
                    if (checkboxRef.current) {
                        checkboxRef.current.indeterminate = table.getIsSomeRowsSelected();
                    }
                }, [table.getIsSomeRowsSelected()]);

                return (
                    <input
                        type="checkbox"
                        className="custom-table-checkbox"
                        ref={checkboxRef}
                        checked={table.getIsAllRowsSelected()}
                        onChange={table.getToggleAllRowsSelectedHandler()}
                    />
                );
            },
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    className="custom-table-checkbox"
                    checked={row.getIsSelected()}
                    disabled={!row.getCanSelect()}
                    onChange={row.getToggleSelectedHandler()}
                />
            ),
            meta: {
                headerClassName: 'width-30',
            },
        },

        {
            accessorKey: 'user',
            header: () => 'User',
            cell: (info) => {
                const user = info.getValue();
                return (
                    <a href="#" className="hstack gap-3">
                        {
                            user?.img ?
                                <div className="avatar-image avatar-md">
                                    <img src={user?.img} alt="" className="img-fluid" />
                                </div>
                                :
                                <div className="text-white avatar-text user-avatar-text avatar-md">{user?.name.substring(0, 1)}</div>
                        }
                        <div>
                            <span className="text-truncate-1-line">{user?.name}</span>
                        </div>
                    </a>
                )
            }
        },
        {
            accessorKey: 'email',
            header: () => 'Email',
            cell: (info) => <a href="apps-email.html">{info.getValue()}</a>
        },

        {
            accessorKey: 'phone',
            header: () => 'Phone',
            cell: (info) => <a href="tel:">{info.getValue()}</a>
        },
        {
            accessorKey: 'role',
            header: () => 'Role',
        },
        {
            accessorKey: 'department',
            header: () => 'Department',
        },
        {
            accessorKey: 'date',
            header: () => 'Joining Date',
        },
        {
            accessorKey: 'status',
            header: () => 'Status',
            cell: (info) => <TableCell options={info?.getValue().status} defaultSelect={info?.getValue().defaultSelect} />
        },
        {
            accessorKey: 'actions',
            header: () => "Actions",
            cell: info => (
                <div className="hstack gap-2 justify-content-end">
                    <Link href="/users/view" className="avatar-text avatar-md">
                        <FiEye />
                    </Link>
                    <Dropdown dropdownItems={actions} triggerClass='avatar-md' triggerPosition={"0,21"} triggerIcon={<FiMoreHorizontal />} />
                </div>
            ),
            meta: {
                headerClassName: 'text-end'
            }
        },
    ]

    return (
        <div>
            <Table data={usersTableData} columns={columns} />
        </div>
    )
}

export default UsersTable