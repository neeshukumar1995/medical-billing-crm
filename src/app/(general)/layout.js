'use client'
import { usePathname, useRouter } from "next/navigation";
import Header from "@/components/shared/header/Header";
import NavigationManu from "@/components/shared/navigationMenu/NavigationMenu";
import dynamic from "next/dynamic";
import useBootstrapUtils from "@/hooks/useBootstrapUtils";
import { useEffect, useState } from "react";

const layout = ({ children }) => {
    const pathName = usePathname()
    const router = useRouter()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useBootstrapUtils(pathName)

    useEffect(() => {
        const isLoggedIn = typeof window !== 'undefined' ? localStorage.getItem('isLoggedIn') === 'true' : false
        if (!isLoggedIn) {
            router.push('/')
        } else {
            setIsAuthenticated(true)
        }
        setIsLoading(false)
    }, [router])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return null
    }

    return (
        <>
            <Header />
            <NavigationManu />
            <main className="nxl-container">
                <div className="nxl-content">
                    {children}
                </div>
            </main>
        </>
    )
}

export default layout
