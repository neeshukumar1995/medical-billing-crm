'use client'
import React from 'react'
import Checkbox from './Checkbox';
import { FiMoreVertical } from 'react-icons/fi';

const Dropdown = ({
    triggerPosition,
    triggerClass = "avatar-sm",
    triggerIcon,
    triggerText,
    dropdownItems = [],
    dropdownPosition = "dropdown-menu-end",
    dropdownAutoClose,
    dropdownParentStyle,
    dataBsToggle = "dropdown",
    tooltipTitle,
    dropdownMenuStyle,
    iconStrokeWidth = 1.7,
    isItemIcon = true,
    isAvatar = true,
    onClick,
    active,
    id
}) => {

    return (
        <>
            <div className={`filter-dropdown ${dropdownParentStyle}`}>
                {/* Dropdown Trigger */}
                {
                    tooltipTitle ?
                        <div className="d-flex" style={{cursor: 'pointer'}} data-bs-toggle="dropdown" data-bs-offset={triggerPosition} data-bs-auto-close={dropdownAutoClose}>
                            {
                                isAvatar ?
                                    <div className={`avatar-text ${triggerClass}`} data-toggle="tooltip" data-bs-trigger="hover" data-title={tooltipTitle} >
                                        {triggerIcon || <FiMoreVertical />} {triggerText}
                                    </div>
                                    :
                                    <div className={`${triggerClass}`} data-toggle="tooltip" data-bs-trigger="hover" data-title={tooltipTitle}>
                                        {triggerIcon || <FiMoreVertical />} {triggerText}
                                    </div>
                            }
                        </div>
                        :
                        isAvatar ?
                            <div className={`avatar-text ${triggerClass}`} data-bs-toggle="dropdown" data-bs-offset={triggerPosition} data-bs-auto-close={dropdownAutoClose} style={{cursor: 'pointer'}}>
                                {triggerIcon || <FiMoreVertical />} {triggerText}
                            </div>
                            :
                            <div className={`${triggerClass}`} data-bs-toggle="dropdown" data-bs-offset={triggerPosition} data-bs-auto-close={dropdownAutoClose} style={{cursor: 'pointer'}}>
                                {triggerIcon || <FiMoreVertical />} {triggerText}
                            </div>
                }


                {/* Dropdown Menu */}
                <ul className={`dropdown-menu ${dropdownMenuStyle} ${dropdownPosition}`}>
                    {dropdownItems.map((item, index) => {
                        if (item.type === "divider") {
                            return <li className="dropdown-divider" key={index}></li>;
                        }
                        return (
                            <li key={index} className={`${item.checkbox ? "dropdown-item" : ""}`}>
                                {
                                    item.checkbox ?
                                        <Checkbox checked={item.checked} id={item.id} name={item.label} className={""} />
                                        :

                                        <a href="#" className={`${active === item.label ? "active" : ""} dropdown-item`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                onClick && onClick(item.label, id);
                                            }}
                                        >
                                            {
                                                isItemIcon ?
                                                    item.icon && React.cloneElement(item.icon, { className: "me-3", size: 16, strokeWidth: iconStrokeWidth })
                                                    :
                                                    <span className={`wd-7 ht-7 rounded-circle me-3 ${item.color}`}></span>
                                            }
                                            <span>{item.label}</span>
                                        </a>
                                }
                            </li>
                        );
                    })}
                </ul>
            </div>
        </>
    )
}

export default Dropdown