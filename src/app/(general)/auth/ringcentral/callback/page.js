"use client";

import { useEffect, useState, useRef } from "react";
import crmInstance from "@/utils/crmInstance";
import { useRouter, useSearchParams } from "next/navigation";

export default function RingCentralCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Connecting to RingCentral...");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const apiExecuted = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // RingCentral ne error bheja
    if (error) {
      setStatus(`RingCentral Error: ${searchParams.get("error_description") || error} ❌`);
      return;
    }

    if (!code || apiExecuted.current) return;

    // User ID lo
    const userData = localStorage.getItem("user");
    let userId = null;
    try {
      userId = userData ? JSON.parse(userData)?.id : null;
    } catch (e) {
      console.error("User data parse error", e);
    }

    if (!userId) {
      setStatus("User not logged in ❌");
      return;
    }

    const exchangeToken = async () => {
      apiExecuted.current = true;
      setIsProcessing(true);

      // ✅ Exactly wahi URI jo RingCentral console mein registered hai
      const redirectUri = "http://localhost:3000/auth/ringcentral/callback";

      console.log("Code:", code);
      console.log("UserId:", userId);
      console.log("RedirectUri:", redirectUri);

      try {
        const response = await crmInstance.post('/ringcentral/token', {
          code: code,
          user_id: userId,
          redirect_uri: redirectUri
        });

        console.log("Backend response:", response.data);

        // ✅ 'success' check karo - backend yahi return karta hai
        if (response.data.success) {
          setStatus("RingCentral Connected Successfully! ✅");
          
          // URL clean karo
          window.history.replaceState({}, '', '/auth/ringcentral/callback');

          setTimeout(() => {
            router.push('/user-dashboard');
          }, 2000);
        } else {
          throw new Error(response.data.message || "Connection failed");
        }
      } catch (err) {
        console.error("Full Error:", err);
        console.error("Error Response:", err.response?.data);
        
        const errMsg = err.response?.data?.message || err.message || "Unknown error";
        
        if (errMsg.includes("OAU-149") || errMsg.includes("invalid_grant")) {
          setStatus("Link expired ya already use ho gaya. Please dobara Connect karo ❌");
        } else if (errMsg.includes("OAU-251") || errMsg.includes("Redirect URIs do not match")) {
          setStatus("Redirect URI mismatch. Admin se contact karo ❌");
        } else {
          setStatus(`Error: ${errMsg} ❌`);
        }
      } finally {
        setIsProcessing(false);
      }
    };

    exchangeToken();
  }, [searchParams, router]);

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', 
      justifyContent: 'center', minHeight: '100vh', 
      fontFamily: 'Plus Jakarta Sans, sans-serif', background: '#f5f6fa'
    }}>
      <div style={{
        background: '#fff', padding: '40px', borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '450px'
      }}>

        {/* Icon */}
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          {status.includes('✅') ? '🎉' : status.includes('❌') ? '❌' : '🔄'}
        </div>

        <h2 style={{ 
          color: status.includes('❌') ? '#e74c3c' : 
                 status.includes('✅') ? '#27ae60' : '#1a1d2e', 
          marginBottom: '15px',
          fontSize: '18px'
        }}>
          {status}
        </h2>

        {isProcessing && (
          <div style={{ color: '#3498db', fontSize: '14px', marginTop: '8px' }}>
            ⏳ Server se baat kar rahe hain...
          </div>
        )}

        <p style={{ color: '#8b92a5', fontSize: '13px', marginTop: '10px' }}>
          {status.includes('✅') 
            ? "Dashboard pe redirect ho rahe hain..." 
            : status.includes('❌') 
            ? "Settings mein jaake dobara Connect karo." 
            : "Please wait..."}
        </p>

        {status.includes('❌') && (
          <button 
            onClick={() => router.push('/user-dashboard')}
            style={{
              marginTop: '20px', padding: '10px 25px', border: 'none',
              background: '#1a1d2e', color: '#fff', borderRadius: '8px', 
              cursor: 'pointer', fontSize: '14px'
            }}
          >
            Dashboard Pe Jaao
          </button>
        )}
      </div>
    </div>
  );
}