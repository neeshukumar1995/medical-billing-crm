// Temporary component to test permissions - Remove after testing
'use client'
import React, { useState, useEffect } from 'react'

const PermissionTest = () => {
    const [userData, setUserData] = useState({})
    const [permissions, setPermissions] = useState([])

    useEffect(() => {
        const data = JSON.parse(localStorage.getItem('user') || '{}')
        setUserData(data)
        setPermissions(data.permissions || [])
    }, [])

    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 9999,
            maxWidth: '300px'
        }}>
            <strong>Permission Debug:</strong><br/>
            Role: {userData.role || 'None'}<br/>
            Permissions: {permissions.length > 0 ? permissions.join(', ') : 'None'}<br/>
            <button
                onClick={() => {
                    localStorage.removeItem('user')
                    window.location.reload()
                }}
                style={{ marginTop: '5px', fontSize: '10px' }}
            >
                Clear & Reload
            </button>
        </div>
    )
}

export default PermissionTest