'use client'
import React, { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiX } from 'react-icons/fi';
import getIcon from '@/utils/getIcon';

const SelectDropdown = ({ options, selectedOption, onSelectOption, className, defaultSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [openUpwards, setOpenUpwards] = useState(false);
    const [localSelectedOption, setLocalSelectedOption] = useState();
    const ref = useRef()

    const dropdownRef = useRef(null);

    useEffect(() => {
        //console.log('SelectDropdown useEffect:', { selectedOption, defaultSelect, optionsLength: options?.length })
        if (selectedOption) {
            //console.log('Setting selectedOption:', selectedOption)
            setLocalSelectedOption(selectedOption);
        } else if (defaultSelect) {
            const defaultOption = options?.find(option => option.value?.toLowerCase() === defaultSelect?.value?.toLowerCase());
            //console.log('Setting defaultOption:', defaultOption)
            setLocalSelectedOption(defaultOption || null); // Set default if found
        }

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [selectedOption, defaultSelect, options]);

    const toggleDropdown = () => setIsOpen(!isOpen);


    const filteredOptions = options?.filter(option =>
        option.label && typeof option.label === 'string' && option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) {
            const dropdown = dropdownRef.current;
            const dropdownRect = dropdown.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            if (dropdownRect.bottom + 200 > windowHeight) {
                setOpenUpwards(true);
            } else {
                setOpenUpwards(false);
            }
        }
    }, [isOpen]);

    const handleOptionClick = (option) => {
        onSelectOption(option); // Notify parent of the selected option
        setLocalSelectedOption(option);
        setIsOpen(false); // Close the dropdown
    };

    const handleClear = () => {
        const clearOption = defaultSelect || { value: '', label: 'Select...' };
        onSelectOption(clearOption);
        setLocalSelectedOption(clearOption);
        setIsOpen(false);
    };

    return (
        <div className={`select-dropdown ${className ? className : ""} ${openUpwards ? 'open-upwards' : ''}`} ref={dropdownRef}>
            <div className={"select-box"} onClick={toggleDropdown}>
                <span className="selected-label">
                    {localSelectedOption?.color ? <span className="status-dot" style={{ backgroundColor: localSelectedOption?.color }}></span> : ""}
                    {localSelectedOption?.icon ? <span className={`lh-1 fs-16 ${localSelectedOption.iconClassName}`}>{getIcon(localSelectedOption?.icon)} </span> : ""}
                    {localSelectedOption?.img ? <img src={localSelectedOption.img} className="avatar-image avatar-sm" /> : ""}
                    {localSelectedOption?.label}
                </span>
                {/* Clear button removed as per client request */}
                <span className="arrow">{isOpen ? <FiChevronUp /> : <FiChevronDown />}</span>
            </div>

            {isOpen && (
                <div className="dropdown-list">
                    <div className='search-input-outer'>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <ul>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <li
                                    key={option.value}
                                    onClick={() => handleOptionClick(option)}
                                    className={`${option?.value === localSelectedOption?.value ? 'active' : ''}`}
                                >
                                    {option?.color ? <span className="status-dot" style={{ backgroundColor: option?.color }}></span> : ""}
                                    {option?.icon ? <span className={`lh-1 me-3 fs-16 ${option.iconClassName}`}>{getIcon(option?.icon)}</span> : ""}
                                    {option?.img ? <img src={option.img} className="avatar-image avatar-sm me-2" /> : ""}

                                    {option?.label}
                                </li>
                            ))
                        ) : (
                            <li className="no-result">No results found</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SelectDropdown;

// SelectDropdown.propTypes = {
//     options: PropTypes.array.isRequired,
//     defaultSelect: PropTypes.number,
//     currentSelect: PropTypes.func
// };

// SelectDropdown.defaultProps = {
//     currentSelect: () => { }
// };