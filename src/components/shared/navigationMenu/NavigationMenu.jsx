'use client'
import React, { useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation';
import PerfectScrollbar from "react-perfect-scrollbar";
import Menus from './Menus';
import { NavigationContext } from '@/contentApi/navigationProvider';
import crmInstance from '@/utils/crmInstance';
import { IMAGE_BASE_URL } from '@/config/api'

const NavigationManu = () => {
    const { navigationOpen, setNavigationOpen } = useContext(NavigationContext)
    const pathName = usePathname()
    const router = useRouter()
    const [companyLogo, setCompanyLogo] = useState('/images/crm.png')
    const [logoLoaded, setLogoLoaded] = useState(false)

    // Get company logo and name based on logged-in user
    useEffect(() => {
        const getCompanyData = async () => {
            try {
                const companyId = JSON.parse(localStorage.getItem('companyId'))
                if (companyId) {
                    const response = await crmInstance.get(`/companies/${companyId}`)
                    if (response.data.logo) {
                        setCompanyLogo(`${IMAGE_BASE_URL}/${response.data.logo}`)

                    }
                    // Update document title with company name
                    if (response.data.name) {
                        document.title = `${response.data.name}`;
                    }
                }
                setLogoLoaded(true)
            } catch (error) {
                console.error('Failed to fetch company data:', error)
                // Keep default logo and title if fetch fails
                document.title = "";
                setLogoLoaded(true)
            }
        }

        getCompanyData()
    }, [])

    useEffect(() => {
        setNavigationOpen(false)
    }, [pathName])
    return (
        <nav className={`nxl-navigation ${navigationOpen ? "mob-navigation-active" : ""}`}>
            <div className="navbar-wrapper">
                <div className="m-header flex flex-col items-center mb-6">
  <div className="b-brand text-center">
    {logoLoaded && (
      <img
        src={companyLogo}
        alt="Company Logo"
        className="mx-auto w-20 h-20 object-contain"
      style={{ width: '65px' ,height: '40px'}} />
    )}

  </div>
</div>

                <div className={`navbar-content`}>
                    <PerfectScrollbar>
                        <ul className="nxl-navbar">
                            <li className="nxl-item nxl-caption">
                                <label>Navigation</label>
                            </li>
                            <Menus />
                             {/* <li className="nxl-item">
                                {isOutlookConnected ? (
                                    <a 
                                        href="/outlookEmail" 
                                        className="nxl-link"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 16px',
                                            color: '#333',
                                            textDecoration: 'none',
                                            borderRadius: '4px',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseOver={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                                        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >
                                        <span className="nxl-micon">
                                            📧
                                        </span>
                                        <span className="nxl-mtext">Outlook Email</span>
                                    </a>
                                ) : (
                                    <OutlookConnectButton />
                                )}
                            </li> */}
                        </ul>
                    </PerfectScrollbar>

                   
                </div>
            </div>
            <div onClick={() => setNavigationOpen(false)} className={`${navigationOpen ? "nxl-menu-overlay" : ""}`}></div>
        </nav>
    )
}

export default NavigationManu