'use client'
import React, { Fragment, useEffect, useState } from "react";
import { FiChevronRight } from "react-icons/fi";
import { menuList } from "@/utils/fackData/menuList";
import getIcon from "@/utils/getIcon";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/context/UserContext";

const Menus = () => {
    const [openDropdown, setOpenDropdown] = useState(null);
    const [openKeys, setOpenKeys] = useState(() => new Set());
    const [activeParent, setActiveParent] = useState("");
    const [userPermissions, setUserPermissions] = useState([]);
    const [userRole, setUserRole] = useState('');
    const [loadingPermissions, setLoadingPermissions] = useState(true);
    const { user, permissions, loading, isPlatform } = useUser();


    const pathName = usePathname();

    // "roles & permissions" -> "roles" and "medical billing" -> "medical-billing"
    // (matching their actual URL segments) are special-cased here because
    // name.split(' ')[0] alone only works for single-word menu names —
    // multi-word names need to map to their real route slug or the dropdown
    // open-state (set from the URL on navigation) never matches the key this
    // component computes for rendering, and the menu closes itself right
    // after you click into it.
    const getDropdownKey = (name) => {
        if (name === 'roles & permissions') return 'roles';
        if (name === 'medical billing') return 'medical-billing';
        return name.split(' ')[0];
    };

    const handleMainMenu = (e, name) => {
        const dropdownKey = name === 'roles' ? 'roles' : name;
        if (openDropdown === dropdownKey) {
            setOpenDropdown(null);
        } else {
            setOpenDropdown(dropdownKey);
        }
    };

    useEffect(() => {
        if (pathName !== "/") {
            const x = pathName.split("/");
            let parent = x[1];

            const pathToMenuMap = {
                'roles': 'roles',
                'permissions': 'roles',
                'users': 'users',
                'settings': 'settings',
                'dashboard': 'dashboard',
                'companies': 'companies',
                'clients': 'clients'
            };

            // The top-level Dashboard item is the medical billing dashboard.
            parent = pathName === '/medical-billing/dashboard' ? 'dashboard' : (pathToMenuMap[parent] || parent);

            setActiveParent(parent);
            setOpenDropdown(parent);
        } else {
            setActiveParent("dashboard");
            setOpenDropdown("dashboard");
        }
    }, [pathName]);

    useEffect(() => {
        if (loading) return;

        if (user) {
            const perms = permissions || [];
            setUserPermissions(perms);
            setUserRole(user.user_role?.name || user.role || '');
            setLoadingPermissions(false);
        } else {
            const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
            if (cachedUser.permissions && cachedUser.permissions.length > 0) {
                setUserPermissions(cachedUser.permissions);
                setUserRole(cachedUser.user_role?.name || cachedUser.role || '');
            } else {
                localStorage.removeItem('user');
                window.location.href = '/';
                return;
            }
            setLoadingPermissions(false);
        }
    }, [user, permissions, loading]);


    const hasPermission = (permission) => {
        if (userPermissions.includes('*')) return true;
        return userPermissions.includes(permission);
    };

    // Group items (Master Data, and now every "section" inside Medical
    // Billing) carry a subdropdownMenu array at ANY depth — this needs to be
    // recursive rather than hard-coded to two levels.
    const isGroup = (item) => Array.isArray(item.subdropdownMenu) && item.subdropdownMenu.length > 0;

    const itemKey = (item) => (item.path && item.path !== '#') ? item.path : `grp-${item.name}`;

    const containsActivePath = (item) => {
        if (item.path && item.path !== '#' && (pathName === item.path || pathName.startsWith(item.path + '/'))) {
            return true;
        }
        if (isGroup(item)) {
            return item.subdropdownMenu.some(containsActivePath);
        }
        return false;
    };

    const toggleKey = (key) => {
        setOpenKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    // Permission filtering needs to recurse into groups too — a group with
    // zero visible children shouldn't render an empty dropdown.
    const filterItems = (items) => items
        .map(item => {
            if (item.isCaption) return item;
            if (item.role && !item.role.includes(userRole)) return null;
            if (item.hideForRoles && item.hideForRoles.includes(userRole)) return null;
            if (item.platformOnly && !isPlatform) return null;
            if (isGroup(item)) {
                // A group's own permission (e.g. Master Data's) gates the whole
                // branch; a wrapper group with no permission of its own (the
                // Patients & Care / Billing & Claims style sections) is visible
                // purely based on whether any child survives filtering below.
                if (item.permission && !hasPermission(item.permission)) return null;
                const filteredChildren = filterItems(item.subdropdownMenu);
                if (filteredChildren.length === 0) return null;
                return { ...item, subdropdownMenu: filteredChildren };
            }
            // Leaf items with no permission of their own (ICD-10, CPT, ...)
            // inherit access from their parent group's permission instead of
            // needing one individually.
            if (!item.permission) return item;
            return hasPermission(item.permission) ? item : null;
        })
        .filter(Boolean);

    const renderItems = (items) => items.map((item, index) => {
        const key = `${itemKey(item)}-${index}`;

        if (item.isCaption) {
            return (
                <li className="nxl-item nxl-caption" key={key}>
                    <label>{item.name}</label>
                </li>
            );
        }

        if (isGroup(item)) {
            const gKey = itemKey(item);
            const active = containsActivePath(item);
            const open = openKeys.has(gKey) || active;
            return (
                <li
                    key={key}
                    className={`nxl-item nxl-hasmenu ${active ? "active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleKey(gKey); }}
                >
                    <Link
                        href={item.path || '#'}
                        className="nxl-link text-capitalize"
                        title={item.name}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleKey(gKey); }}
                    >
                        {item.icon && <span className="nxl-micon"> {getIcon(item.icon)} </span>}
                        <span className="nxl-mtext">{item.name}</span>
                        <span className="nxl-arrow fs-16">
                            <FiChevronRight />
                        </span>
                    </Link>
                    <ul className={`nxl-submenu ${open ? "nxl-menu-visible" : "nxl-menu-hidden"}`}>
                        {renderItems(item.subdropdownMenu)}
                    </ul>
                </li>
            );
        }

        return (
            <li className={`nxl-item ${pathName === item.path ? "active" : ""}`} key={key}>
                <Link
                    className="nxl-link"
                    href={item.path}
                    target={item.target}
                    title={item.name}
                    onClick={(e) => e.stopPropagation()}
                >
                    {item.icon && <span className="nxl-micon"> {getIcon(item.icon)} </span>}
                    <span className="nxl-mtext">{item.name}</span>
                </Link>
            </li>
        );
    });

    const medicalBillingEnabled = user?.company?.medical_billing_enabled !== false;

    const filteredMenuList = menuList.map(menu => {
        if ((menu.name === 'medical billing' || menu.name === 'dashboard') && !medicalBillingEnabled) {
            return null;
        }

        if (menu.dropdownMenu && menu.dropdownMenu.length > 0) {
            const filteredDropdown = filterItems(menu.dropdownMenu);

            if (filteredDropdown.length > 0) {
                return {
                    ...menu,
                    dropdownMenu: filteredDropdown
                };
            }
            return null;
        }

        return hasPermission(menu.permission) ? menu : null;
    }).filter(menu => menu !== null);

    return (
        <>
            {loadingPermissions ? (
                <li className="nxl-item">
                    <a href="#" className="nxl-link">
                        <span className="nxl-mtext">Loading menu...</span>
                    </a>
                </li>
            ) : (
                filteredMenuList.map(({ dropdownMenu, id, name, path, icon }) => {
                const hasDropdown = dropdownMenu && dropdownMenu.length > 0;
                return (
                    <li
                        key={id}
                        onClick={(e) => hasDropdown ? handleMainMenu(e, getDropdownKey(name)) : null}
                        className={`nxl-item ${hasDropdown ? 'nxl-hasmenu' : ''} ${activeParent === getDropdownKey(name) ? "active nxl-trigger" : ""}`}
                    >
                        {hasDropdown ? (
                            <a href="#" className="nxl-link text-capitalize" onClick={(e) => e.preventDefault()}>
                                <span className="nxl-micon"> {getIcon(icon)} </span>
                                <span className="nxl-mtext" style={{ paddingLeft: "2.5px" }}>
                                    {name}
                                </span>
                                <span className="nxl-arrow fs-16">
                                    <FiChevronRight />
                                </span>
                            </a>
                        ) : (
                            <Link href={path} className="nxl-link text-capitalize">
                                <span className="nxl-micon"> {getIcon(icon)} </span>
                                <span className="nxl-mtext" style={{ paddingLeft: "2.5px" }}>
                                    {name}
                                </span>
                                {hasDropdown && (
                                    <span className="nxl-arrow fs-16">
                                        <FiChevronRight />
                                    </span>
                                )}
                            </Link>
                        )}
                        {dropdownMenu && dropdownMenu.length > 0 && (
                            <ul className={`nxl-submenu ${openDropdown === getDropdownKey(name) ? "nxl-menu-visible" : "nxl-menu-hidden"}`}>
                                {renderItems(dropdownMenu)}
                            </ul>
                        )}
                    </li>
                );
            })
        )
    }
</>
);
};

export default Menus;
