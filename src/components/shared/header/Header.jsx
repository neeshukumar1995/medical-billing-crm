'use client'
import React, { useContext, useEffect, useRef, useState } from 'react'
import {
    FiAlignLeft, FiArrowLeft, FiArrowRight, FiMaximize, FiMinimize, FiFileText,
} from "react-icons/fi";

import Notifications from './Notifications';
import MedicalNotifications from './MedicalNotifications';
import ProfileModal from './ProfileModal';

import DialPad from '../DialPad';
 
import { NavigationContext } from '@/contentApi/navigationProvider';
import { StickyNotesContext } from '@/contentApi/stickyNotesProvider'
import crmInstance from '@/utils/crmInstance';
import { useUser } from '@/context/UserContext';

import '@/styles/Header.css'


const Header = () => {
    const { navigationOpen, setNavigationOpen } = useContext(NavigationContext)
    const { addNote } = useContext(StickyNotesContext)
    const [navigationExpend, setNavigationExpend] = useState(false)
    const miniButtonRef = useRef(null);
    const expendButtonRef = useRef(null);
    // ✅ "/me" ab yahan alag se call nahi hota — shared UserContext se role milta hai
    const { role: userRole, user } = useUser()
    const [companies, setCompanies] = useState([])
    const [selectedCompany, setSelectedCompany] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('companyId') ? JSON.parse(localStorage.getItem('companyId')) : null
        }
        return null
    })
    const [isCompanyChanging, setIsCompanyChanging] = useState(false)
    const [showDialPad, setShowDialPad] = useState(false)
    const [isDarkTheme, setIsDarkTheme] = useState(false)

    const handleThemeMode = (type) => {
        if (type === "dark") {
            document.documentElement.classList.add("app-skin-dark")
            localStorage.setItem("skinTheme", "dark");
            setIsDarkTheme(true)
        }
        else {
            document.documentElement.classList.remove("app-skin-dark")
            localStorage.setItem("skinTheme", "light");
            setIsDarkTheme(false)
        }
    }

    // ✅ selectedCompany ko shared user context se sync karo (jab tak koi
    // company already localStorage se selected na ho)
    useEffect(() => {
        if (user?.company_id && !selectedCompany) {
            setSelectedCompany(user.company_id)
        }
    }, [user, selectedCompany])

    // Superadmin sees every company. A regular user only sees the switcher
    // if an owner/superadmin has explicitly assigned them to more than one
    // company (backend: GET /my-companies) — falls back to no switcher if
    // that endpoint isn't available yet.
    useEffect(() => {
        if (!userRole) return

        const fetchCompanies = async () => {
            try {
                if (userRole === 'superadmin') {
                    const { data } = await crmInstance.get('/companies')
                    if (Array.isArray(data)) {
                        setCompanies(data)
                    } else if (data.status && data.data) {
                        setCompanies(data.data)
                    }
                    return
                }

                const { data } = await crmInstance.get('/my-companies')
                const list = Array.isArray(data) ? data : (data?.data || [])
                if (list.length > 1) setCompanies(list)
            } catch (error) {
                if (userRole === 'superadmin') {
                    console.error('Error fetching companies:', error)
                }
            }
        }

        fetchCompanies()
    }, [userRole])

    useEffect(() => {
        const handleResize = () => {
            const newWindowWidth = window.innerWidth;
            if (newWindowWidth <= 1024) {
                document.documentElement.classList.remove('minimenu');
                document.querySelector('.navigation-down-1600').style.display = 'none';
            }
            else if (newWindowWidth >= 1025 && newWindowWidth <= 1400) {
                document.documentElement.classList.add('minimenu');
                document.querySelector('.navigation-up-1600').style.display = 'none';
                document.querySelector('.navigation-down-1600').style.display = 'block';
            }
            else {
                document.documentElement.classList.remove('minimenu');
                document.querySelector('.navigation-up-1600').style.display = 'block';
                document.querySelector('.navigation-down-1600').style.display = 'none';
            }
        };

        window.addEventListener('resize', handleResize);

        handleResize();

        const savedSkinTheme = localStorage.getItem("skinTheme");
        handleThemeMode(savedSkinTheme)
        setIsDarkTheme(savedSkinTheme === "dark")

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Listen to call status updates
    useEffect(() => {
        if (typeof window !== 'undefined' && window.Echo) {
            window.Echo.channel('call-status')
                .listen('CallStatusUpdated', (e) => {
                    console.log('CallStatusUpdated event received:', e);
                    setCallStatus(e.status);
                });

            return () => {
                if (window.Echo) {
                    window.Echo.leave('call-status');
                }
            };
        }
    }, []);

    const handleNavigationExpendUp = (e, pram) => {
        e.preventDefault()
        if (pram === "show") {
            setNavigationExpend(true);
            document.documentElement.classList.add('minimenu')
        }
        else {
            setNavigationExpend(false);
            document.documentElement.classList.remove('minimenu')
        }
    }

    const handleNavigationExpendDown = (e, pram) => {
        e.preventDefault()
        if (pram === "show") {
            setNavigationExpend(true);
            document.documentElement.classList.remove('minimenu')
        }
        else {
            setNavigationExpend(false);
            document.documentElement.classList.add('minimenu')
        }
    }

    const fullScreenMaximize = () => {
        const elem = document.documentElement;

        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }

        document.documentElement.classList.add("fsh-infullscreen")
        document.querySelector("body").classList.add("full-screen-helper")

    };
    const fullScreenMinimize = () => {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }

        document.documentElement.classList.remove("fsh-infullscreen")
        document.querySelector("body").classList.remove("full-screen-helper")
    }

    const handleCompanyChange = (e) => {
        const newCompanyId = parseInt(e.target.value)
        setIsCompanyChanging(true)
        localStorage.setItem('companyId', JSON.stringify(newCompanyId))
        // Also update user data in localStorage
        const userData = JSON.parse(localStorage.getItem('user') || '{}')
        if (userData && Object.keys(userData).length > 0) {
            userData.company_id = newCompanyId
            localStorage.setItem('user', JSON.stringify(userData))
        }
        setSelectedCompany(newCompanyId)
        window.location.reload() // Refresh the page to ensure all data is updated
    }




    return (
        <header className="nxl-header nxl-header--outlook">
            <div className="header-wrapper">
                {/* <!--! [Start] Header Left !--> */}
                <div className="header-left d-flex align-items-center gap-4">
                    {/* <!--! [Start] nxl-head-mobile-toggler !--> */}
                    <a href="#" className="nxl-head-mobile-toggler" onClick={(e) => { e.preventDefault(), setNavigationOpen(true) }} id="mobile-collapse">
                        <div className={`hamburger hamburger--arrowturn ${navigationOpen ? "is-active" : ""}`}>
                            <div className="hamburger-box">
                                <div className="hamburger-inner"></div>
                            </div>
                        </div>
                    </a>

                    {/* <!--! [Start] nxl-navigation-toggle !--> */}
                    <div className="nxl-navigation-toggle navigation-up-1600">
                        <a href="#" onClick={(e) => handleNavigationExpendUp(e, "show")} id="menu-mini-button" ref={miniButtonRef} style={{ display: navigationExpend ? "none" : "block" }}>
                            <FiAlignLeft size={22} />
                        </a>
                        <a href="#" onClick={(e) => handleNavigationExpendUp(e, "hide")} id="menu-expend-button" ref={expendButtonRef} style={{ display: navigationExpend ? "block" : "none" }}>
                            <FiArrowRight size={22} />
                        </a>
                    </div>
                    <div className="nxl-navigation-toggle navigation-down-1600">
                        <a href="#" onClick={(e) => handleNavigationExpendDown(e, "hide")} id="menu-mini-button" ref={miniButtonRef} style={{ display: navigationExpend ? "block" : "none" }}>
                            <FiAlignLeft size={22} />
                        </a>
                        <a href="#" onClick={(e) => handleNavigationExpendDown(e, "show")} id="menu-expend-button" ref={expendButtonRef} style={{ display: navigationExpend ? "none" : "block" }}>
                            <FiArrowRight size={22} />
                        </a>
                    </div>
                    {/* <!--! [End] nxl-navigation-toggle !--> */}
                </div>


                {/* <!--! [Start] Header Right !--> */}
                <div className="header-right ms-auto">
                    <div className="d-flex align-items-center">

                        {/* Company selector: superadmin always, others only when assigned to 2+ companies */}
                        {(userRole === 'superadmin' || companies.length > 1) && (
                            <div className="nxl-h-item">
                                <select
                                    className="form-select form-select-sm ol-company-select"
                                    value={selectedCompany || ''}
                                    onChange={handleCompanyChange}
                                    disabled={isCompanyChanging}
                                >
                                    {companies.length > 0 ? (
                                        companies.map(company => (
                                            <option key={company.id} value={company.id}>
                                                {company.name}
                                            </option>
                                        ))
                                    ) : (
                                        <option disabled>Loading companies...</option>
                                    )}
                                </select>
                            </div>
                        )}

                        {/* Grouped toolbar: fullscreen + notifications + profile, Outlook-style pill */}
                        {/* Grouped toolbar: fullscreen + notifications + profile, Outlook-style pill */}
                        <div className="ol-toolbar">
                            <div className="nxl-h-item d-none d-sm-flex ol-toolbar-item">
                                <span className="nxl-head-link me-0" title="Sticky Notes" onClick={addNote} style={{ cursor: 'pointer' }}>
                                    <FiFileText size={18} />
                                </span>
                            </div>

                            <div className="ol-toolbar-divider" />

                            <div className="nxl-h-item d-none d-sm-flex ol-toolbar-item">
                                <div className="full-screen-switcher">
                                    <span className="nxl-head-link me-0">
                                        <FiMaximize size={18} className="maximize" onClick={fullScreenMaximize} />
                                        <FiMinimize size={18} className="minimize" onClick={fullScreenMinimize} />
                                    </span>
                                </div>
                            </div>

                            <div className="ol-toolbar-divider" />

                            <div className="ol-toolbar-item">
                                <Notifications />
                            </div>

                            <div className="ol-toolbar-item">
                                <MedicalNotifications />
                            </div>

                            <div className="ol-toolbar-divider" />

                            <div className="ol-toolbar-item ol-toolbar-profile">
                                <ProfileModal />
                            </div>
                        </div>
                    </div>
                </div>
                {/* <!--! [End] Header Right !--> */}
            </div>


            {/* Dial Pad Popup */}
            <DialPad show={showDialPad} onClose={() => setShowDialPad(false)} />
        </header>
    )
}

export default Header