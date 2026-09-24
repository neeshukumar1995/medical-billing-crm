"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { microsoftLogin } from '@/components/outlookconnectbutton';
import { formatTime as formatClockTime } from '@/utils/formatDate';

const apiUrl   = process.env.NEXT_PUBLIC_API_URL || "http://crm-backend.test";
const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("access_token") : null);
const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  Accept: "application/json",
  "Content-Type": "application/json",
});

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Inbox-style adaptive timestamp: clock time for today, weekday name within the
// last week, else short month/day — distinct from the record date/time helpers
// in @/utils/formatDate, which always show a fixed format.
const formatTime = (dt) => {
  if (!dt) return "";
  const d = new Date(dt), now = new Date(), diff = now - d;
  if (isNaN(d.getTime())) return "";
  if (d.toDateString() === now.toDateString())
    return formatClockTime(d);
  if (diff < 7 * 86400000) return WEEKDAYS_SHORT[d.getDay()];
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
};

const formatEmail = (e, folder) => ({
  id: e.id,
  sender: e.from?.emailAddress?.name || e.from?.emailAddress?.address || "Unknown",
  senderEmail: e.from?.emailAddress?.address || "",
  senderInitial: (e.from?.emailAddress?.name || e.from?.emailAddress?.address || "?")[0].toUpperCase(),
  subject: e.subject || "(No Subject)",
  time: formatTime(folder === "sent" ? e.sentDateTime : e.receivedDateTime),
  body: e.body?.content || e.bodyPreview || "",
  bodyType: e.body?.contentType || "text",
  preview: e.bodyPreview || "",
  unread: !e.isRead,
  hasAttachments: e.hasAttachments || false,
});

const AVATAR_COLORS = ["#0078d4","#00b7c3","#107c10","#d13438","#8764b8","#ca5010","#038387","#7a7574"];
const getColor = (str) => AVATAR_COLORS[(str?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ✅ Check if an error means "need to reconnect Microsoft"
const isReconnectError = (msg = "") => {
  const m = msg.toLowerCase();
  return m.includes("reconnect") || 
         m.includes("session expired") || 
         m.includes("not connected") || 
         m.includes("please connect") ||
         m.includes("unauthorized") ||
         m.includes("401") ||
         m.includes("token") && m.includes("expired") ||
         m.includes("invalid") && m.includes("token");
};

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────
function DeleteConfirmDialog({ open, count, onConfirm, onCancel, deleting }) {
  if (!open) return null;
  const isBulk = count > 1;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.45)", backdropFilter:"blur(3px)" }}>
      <div style={{ background:"#fff", borderRadius:8, width:420, boxShadow:"0 8px 40px rgba(0,0,0,.18)", fontFamily:"'Segoe UI', sans-serif", overflow:"hidden", animation:"dlFadeIn .15s ease" }}>
        <div style={{ padding:"22px 24px 0", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:42, height:42, borderRadius:"50%", flexShrink:0, background:"#fde7e9", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="#a4262c"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:"#1a1a1a" }}>{isBulk ? `Delete ${count} messages` : "Delete message"}</div>
            {isBulk && <div style={{ fontSize:12, color:"#a4262c", marginTop:3, fontWeight:600 }}>{count} emails selected</div>}
          </div>
        </div>
        <p style={{ margin:"14px 24px 0 80px", fontSize:14, color:"#605e5c", lineHeight:1.65 }}>
          {isBulk ? `Are you sure you want to move ${count} selected messages to Deleted Items?` : "Are you sure you want to move this message to Deleted Items?"}
        </p>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", padding:"16px 24px", marginTop:20, background:"#fafafa", borderTop:"1px solid #f0f0f0" }}>
          <button onClick={onCancel} disabled={deleting} style={{ padding:"7px 20px", borderRadius:4, border:"1px solid #e0e0e0", background:"#fff", fontSize:14, cursor:"pointer", color:"#323130", fontFamily:"inherit" }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting} style={{ padding:"7px 20px", borderRadius:4, border:"none", background:deleting?"#c8c6c4":"#d13438", color:"#fff", fontSize:14, fontWeight:600, cursor:deleting?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:6, minWidth:95, justifyContent:"center", fontFamily:"inherit" }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
      <style>{`@keyframes dlFadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Recall Confirm Dialog ────────────────────────────────────────────────────
function RecallConfirmDialog({ open, email, onConfirm, onCancel, recalling }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.45)", backdropFilter:"blur(3px)" }}>
      <div style={{ background:"#fff", borderRadius:8, width:460, boxShadow:"0 8px 40px rgba(0,0,0,.18)", fontFamily:"'Segoe UI', sans-serif", overflow:"hidden", animation:"dlFadeIn .15s ease" }}>
        <div style={{ padding:"22px 24px 0", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:42, height:42, borderRadius:"50%", flexShrink:0, background:"#fff4ce", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="#c19c00"><path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:"#1a1a1a" }}>Recall this message?</div>
            <div style={{ fontSize:12, color:"#797775", marginTop:3 }}>{email?.subject || "(No Subject)"}</div>
          </div>
        </div>
        <div style={{ margin:"14px 24px 0 80px" }}>
          <p style={{ fontSize:14, color:"#605e5c", lineHeight:1.65, margin:0 }}>This will attempt to recall the message from the recipient's inbox and delete it from your Sent Items.</p>
          <div style={{ marginTop:12, padding:"10px 14px", background:"#f0f6ff", borderLeft:"3px solid #0078d4", borderRadius:"0 4px 4px 0", fontSize:12, color:"#004578", lineHeight:1.6 }}>
            <strong>Note:</strong> Recall only works if the recipient is on the same Microsoft 365 / Exchange organization and has <strong>not yet read</strong> the email.
          </div>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", padding:"16px 24px", marginTop:20, background:"#fafafa", borderTop:"1px solid #f0f0f0" }}>
          <button onClick={onCancel} disabled={recalling} style={{ padding:"7px 20px", borderRadius:4, border:"1px solid #e0e0e0", background:"#fff", fontSize:14, cursor:"pointer", color:"#323130", fontFamily:"inherit" }}>Cancel</button>
          <button onClick={onConfirm} disabled={recalling} style={{ padding:"7px 20px", borderRadius:4, border:"none", background:recalling?"#c8c6c4":"#ca5010", color:"#fff", fontSize:14, fontWeight:600, cursor:recalling?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:6, minWidth:110, justifyContent:"center", fontFamily:"inherit" }}>
            {recalling ? "Recalling…" : "Recall Message"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  if (!msg) return null;
  const bg = type === "success" ? "#107c10" : type === "recall" ? "#ca5010" : "#a4262c";
  return (
    <div style={{ position:"fixed", bottom:28, right:28, zIndex:10000, background:bg, color:"#fff", padding:"12px 20px", borderRadius:6, fontSize:14, fontWeight:500, boxShadow:"0 4px 20px rgba(0,0,0,.2)", display:"flex", alignItems:"center", gap:10, animation:"toastIn .2s ease", fontFamily:"'Segoe UI', sans-serif" }}>
      <span style={{ fontSize:16 }}>{type === "success" ? "✓" : type === "recall" ? "↩" : "✕"}</span>
      {msg}
      <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:18,lineHeight:1,marginLeft:4}}>✕</button>
      <style>{`@keyframes toastIn{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

// ✅ NEW: Reconnect Banner — shows only when session expired
function ReconnectBanner({ onReconnect }) {
  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:9998, background:"#fff4ce", borderBottom:"2px solid #c19c00", padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", fontFamily:"'Segoe UI', sans-serif", fontSize:13 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, color:"#6a4f00" }}>
        <span style={{ fontSize:16 }}>⚠</span>
        <span>Your Outlook session has expired. Please reconnect to continue using email.</span>
      </div>
      <button
        onClick={onReconnect}
        style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 16px", background:"#0078d4", color:"#fff", border:"none", borderRadius:4, fontSize:13, fontWeight:600, cursor:"pointer" }}
      >
        <svg width="14" height="14" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
        Reconnect Outlook
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OutlookPage() {
  const [folder,       setFolder]       = useState("inbox");
  const [selectedId,   setSelectedId]   = useState(null);
  const [compose,      setCompose]      = useState(false);
  const [replyTo,      setReplyTo]      = useState(null);
  const [form,         setForm]         = useState({ to:"", cc:"", subject:"", body:"" });
  const [emails,       setEmails]       = useState({ inbox:[], sent:[] });
  const [loading,      setLoading]      = useState(false);
  const [sending,      setSending]      = useState(false);
  const [error,        setError]        = useState(null);
  const [nextToken,    setNextToken]    = useState(null);
  const [connected,    setConnected]    = useState(false);
  const [checking,     setChecking]     = useState(true);
  const [search,       setSearch]       = useState("");
  const [searchMode,   setSearchMode]   = useState(false);
  // ✅ NEW: Track session expired state separately from "not connected at all"
  const [sessionExpired, setSessionExpired] = useState(false);

  const [selectedEmails, setSelectedEmails] = useState([]);
  const [showConfirm,    setShowConfirm]    = useState(false);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [deleteType,     setDeleteType]     = useState("single");
  const [deleting,       setDeleting]       = useState(false);
  const [toast,          setToast]          = useState(null);

  const [showRecallConfirm, setShowRecallConfirm] = useState(false);
  const [recallTarget,      setRecallTarget]      = useState(null);
  const [recalling,         setRecalling]         = useState(false);

  // ── Connection check ────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) { setChecking(false); return; }
    
    const refreshToken = async () => {
      try {
        // Attempt to refresh the token proactively
        const r = await axios.post(`${apiUrl}/api/auth/microsoft/refresh`, {}, { headers: authHeaders() });
        if (r.data.status) {
          setSessionExpired(false);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };
    
    const checkConnection = async () => {
      try {
        const r = await axios.get(`${apiUrl}/api/auth/microsoft/status`, { headers: authHeaders() });
        setConnected(r.data.connected === true);
        
        // ✅ If connected but token expired — try to refresh automatically
        if (r.data.connected && r.data.is_expired) {
          const refreshed = await refreshToken();
          if (!refreshed) {
            // Only show reconnect banner if refresh failed
            setSessionExpired(true);
          }
        } else if (r.data.connected && !r.data.is_expired) {
          setSessionExpired(false); // Clear expired state if token is valid
        }
      } catch {
        setConnected(false);
      } finally {
        setChecking(false);
      }
    };
    
    checkConnection();
    
    // ✅ Proactively refresh token every 50 minutes (before 1-hour expiration)
    const refreshIntervalId = setInterval(async () => {
      if (connected && !sessionExpired) {
        await refreshToken();
      }
    }, 50 * 60 * 1000); // 50 minutes
    
    // ✅ Also check connection status every 30 minutes as backup
    const checkIntervalId = setInterval(() => {
      if (connected && !sessionExpired) {
        checkConnection();
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    return () => {
      clearInterval(refreshIntervalId);
      clearInterval(checkIntervalId);
    };
  }, [connected, sessionExpired]);

  const currentEmails = (emails[folder] || []).filter(e =>
    !searchMode || !search ||
    e.subject.toLowerCase().includes(search.toLowerCase()) ||
    e.sender.toLowerCase().includes(search.toLowerCase())
  );

  const currentIds  = currentEmails.map(e => e.id);
  const allChecked  = currentIds.length > 0 && currentIds.every(id => selectedEmails.includes(id));
  const someChecked = selectedEmails.length > 0;
  const selected    = selectedId ? (emails[folder] || []).find(e => e.id === selectedId) : null;

  // ✅ Centralized error handler — detects session expired
  const handleApiError = useCallback(async (err, fallbackMsg) => {
    const msg = err.response?.data?.message || fallbackMsg || "Something went wrong.";
    const statusCode = err.response?.status;
    
    // Check for 401 Unauthorized or token-related errors
    if (statusCode === 401 || isReconnectError(msg)) {
      // Try to refresh token automatically before showing reconnect banner
      try {
        const r = await axios.post(`${apiUrl}/api/auth/microsoft/refresh`, {}, { headers: authHeaders() });
        if (r.data.status) {
          // Token refreshed successfully, don't show banner
          setSessionExpired(false);
          return;
        }
      } catch {
        // Refresh failed, show reconnect banner
      }
      setSessionExpired(true);
      return;
    }
    setError(msg);
  }, []);

  // ── Fetch emails ────────────────────────────────────────────────────────────
  const fetchEmails = useCallback(async (f = folder, append = false) => {
    if (!getToken() || (f !== "inbox" && f !== "sent")) return;
    setLoading(true); setError(null);
    try {
      const params = { top: 25 };
      if (append && nextToken) params.skipToken = nextToken;
      const r = await axios.get(`${apiUrl}/api/outlook/${f}`, { headers: authHeaders(), params });
      if (r.data.status) {
        const fmt = r.data.emails.map(e => formatEmail(e, f));
        setEmails(prev => ({ ...prev, [f]: append ? [...prev[f], ...fmt] : fmt }));
        setNextToken(r.data.next_token ?? null);
        if (!append && fmt.length > 0) setSelectedId(fmt[0].id);
        if (!append) setSelectedEmails([]);
        setSessionExpired(false); // ✅ Success means session is valid
      }
    } catch(err) {
      handleApiError(err, `Failed to load ${f}`);
    } finally { setLoading(false); }
  }, [folder, nextToken, handleApiError]);

  const fetchDetail = useCallback(async (id) => {
    if (!getToken() || !id) return;
    try {
      const r = await axios.get(`${apiUrl}/api/outlook/message/${id}`, { headers: authHeaders() });
      if (r.data.status) {
        const d = r.data.email;
        setEmails(prev => ({
          ...prev,
          [folder]: prev[folder].map(e => e.id === id
            ? { ...e, body: d.body?.content || e.body, bodyType: d.body?.contentType || "text" }
            : e)
        }));
      }
    } catch(err) {
      handleApiError(err, null);
    }
  }, [folder, handleApiError]);

  const markRead = useCallback(async (id) => {
    setEmails(prev => ({
      ...prev,
      [folder]: prev[folder].map(e => e.id === id ? { ...e, unread: false } : e)
    }));
    try {
      await axios.patch(`${apiUrl}/api/outlook/message/${id}/read`, {}, { headers: authHeaders() });
    } catch { /* silent */ }
  }, [folder]);

  const toggleCheck    = (id) => setSelectedEmails(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleCheckAll = () => {
    if (allChecked) setSelectedEmails(prev => prev.filter(id => !currentIds.includes(id)));
    else setSelectedEmails(prev => [...new Set([...prev, ...currentIds])]);
  };

  const triggerDeleteSingle = (id) => { setDeleteTarget(id); setDeleteType("single"); setShowConfirm(true); };
  const triggerDeleteBulk   = () => { if (selectedEmails.length) { setDeleteType("bulk"); setShowConfirm(true); } };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      if (deleteType === "single") {
        await axios.delete(`${apiUrl}/api/outlook/message/${deleteTarget}`, { headers: authHeaders() });
        setEmails(prev => ({ ...prev, [folder]: prev[folder].filter(e => e.id !== deleteTarget) }));
        if (selectedId === deleteTarget) setSelectedId(null);
        setToast({ msg: "Message moved to Deleted Items", type: "success" });
      } else {
        const r = await axios.post(`${apiUrl}/api/outlook/messages/bulk-delete`, { ids: selectedEmails }, { headers: authHeaders() });
        const deletedCount = r.data.deleted || selectedEmails.length;
        const failedCount  = r.data.failed?.length || 0;
        const idsToRemove  = failedCount > 0 ? selectedEmails.filter(id => !(r.data.failed || []).includes(id)) : selectedEmails;
        setEmails(prev => ({ ...prev, [folder]: prev[folder].filter(e => !idsToRemove.includes(e.id)) }));
        if (idsToRemove.includes(selectedId)) setSelectedId(null);
        setSelectedEmails([]);
        setToast({ msg: failedCount > 0 ? `${deletedCount} deleted, ${failedCount} failed` : `${deletedCount} message(s) moved to Deleted Items`, type: failedCount > 0 ? "error" : "success" });
      }
      setShowConfirm(false); setDeleteTarget(null);
    } catch (err) {
      setShowConfirm(false);
      handleApiError(err, "Failed to delete message(s).");
    } finally { setDeleting(false); }
  };

  const triggerRecall = (email) => { setRecallTarget(email); setShowRecallConfirm(true); };

  const handleConfirmRecall = async () => {
    if (!recallTarget) return;
    setRecalling(true);
    try {
      const r = await axios.post(`${apiUrl}/api/outlook/message/${recallTarget.id}/recall`, {}, { headers: authHeaders() });
      if (r.data.status) {
        setEmails(prev => ({ ...prev, sent: prev.sent.filter(e => e.id !== recallTarget.id) }));
        if (selectedId === recallTarget.id) setSelectedId(null);
        setToast({ msg: `"${r.data.original_subject}" recalled from Sent Items.`, type: "recall" });
      }
      setShowRecallConfirm(false); setRecallTarget(null);
    } catch (err) {
      setShowRecallConfirm(false);
      handleApiError(err, "Recall failed. Please try again.");
    } finally { setRecalling(false); }
  };

  const handleSend = async () => {
    const bodyText = form.body.replace(/<[^>]*>/g, '').trim();
    if (!form.to || !form.subject || !bodyText) { alert("To, Subject and Body are required."); return; }
    setSending(true);
    try {
      const r = await axios.post(`${apiUrl}/api/outlook/send`, { to: form.to, cc: form.cc, subject: form.subject, body: form.body }, { headers: authHeaders() });
      if (r.data.status) {
        setForm({ to:"", cc:"", subject:"", body:"" }); setCompose(false); setReplyTo(null);
        setToast({ msg: "Message sent successfully", type: "success" });
        if (folder === "sent") fetchEmails("sent");
      }
    } catch(err) {
      handleApiError(err, "Failed to send email.");
    } finally { setSending(false); }
  };

  const openReply = (e) => {
    if (!e.senderEmail) { alert("Sender email not found."); return; }
    setReplyTo(e);
    setForm({ to: e.senderEmail, cc: "", subject: `RE: ${e.subject}`, body: `\n\n\n________________________________________\nFrom: ${e.sender}\nSent: ${e.time}\nSubject: ${e.subject}\n\n${e.preview}` });
    setCompose(true);
  };

  const selectEmail = (id) => {
    setSelectedId(id);
    const e = (emails[folder] || []).find(x => x.id === id);
    if (e?.unread) markRead(id);
    if (e && !e.body?.includes("<") && e.body === e.preview) fetchDetail(id);
  };

  useEffect(() => {
    setSelectedId(null); setNextToken(null); setSelectedEmails([]);
    if (connected && !sessionExpired) fetchEmails(folder);
  }, [folder, connected]);

  const unreadCount = emails.inbox.filter(e => e.unread).length;

  if (checking) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f5f5f5" }}>
      <div style={{ textAlign:"center" }}>
        <svg width="32" height="32" viewBox="0 0 32 32" style={{ animation:"spin 1s linear infinite", display:"block", margin:"0 auto 12px" }}>
          <circle cx="16" cy="16" r="12" fill="none" stroke="#0078d4" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
        </svg>
        <p style={{ color:"#666", fontSize:14 }}>Loading…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (!connected) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f5f5f5", fontFamily:"'Segoe UI', sans-serif" }}>
      <div style={{ textAlign:"center", maxWidth:400, padding:40, background:"#fff", borderRadius:8, boxShadow:"0 2px 8px rgba(0,0,0,.12)" }}>
        <h2 style={{ fontSize:20, fontWeight:600, marginBottom:8, color:"#1a1a1a" }}>Connect your Outlook</h2>
        <p style={{ fontSize:14, color:"#666", marginBottom:28, lineHeight:1.5 }}>Sign in with Microsoft to view and manage your email</p>
        <button onClick={microsoftLogin} style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 24px", background:"#0078d4", color:"#fff", border:"none", borderRadius:4, fontSize:14, fontWeight:600, cursor:"pointer" }}>
          <svg width="16" height="16" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );

  const FOLDERS = [
    { id:"inbox", label:"Inbox",      icon:<InboxIcon/>, badge: unreadCount },
    { id:"sent",  label:"Sent Items", icon:<SentIcon/> },
  ];

  return (
    <div className="ol-root">

      {/* ✅ Session expired banner — non-blocking, stays on top */}
      {sessionExpired && (
        <ReconnectBanner onReconnect={() => {
          setSessionExpired(false);
          microsoftLogin();
        }}/>
      )}

      <DeleteConfirmDialog open={showConfirm} count={deleteType === "bulk" ? selectedEmails.length : 1} deleting={deleting} onConfirm={handleConfirmDelete} onCancel={() => { setShowConfirm(false); setDeleteTarget(null); }}/>
      <RecallConfirmDialog open={showRecallConfirm} email={recallTarget} recalling={recalling} onConfirm={handleConfirmRecall} onCancel={() => { setShowRecallConfirm(false); setRecallTarget(null); }}/>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      {/* NAV */}
      <nav className="ol-nav" style={{ marginTop: sessionExpired ? 48 : 0 }}>
        <button className="ol-new-btn" onClick={() => { setReplyTo(null); setForm({to:"",cc:"",subject:"",body:""}); setCompose(true); }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM11 2.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0zm.854 3.646-7 7a.5.5 0 0 0-.146.354V15.5a.5.5 0 0 0 .5.5h2.5a.5.5 0 0 0 .354-.146l7-7a.5.5 0 0 0 0-.708l-2.5-2.5a.5.5 0 0 0-.708 0z"/></svg>
          New mail
        </button>
        <div className="ol-nav-section">
          {FOLDERS.map(f => (
            <button key={f.id} className={`ol-nav-item ${folder===f.id?"active":""}`} onClick={() => setFolder(f.id)}>
              <span className="ol-nav-icon">{f.icon}</span>
              <span className="ol-nav-label">{f.label}</span>
              {f.badge > 0 && <span className="ol-badge">{f.badge}</span>}
            </button>
          ))}
        </div>
        <div className="ol-nav-divider"/>
        <div className="ol-nav-section">
          <div className="ol-nav-group-label">Favorites</div>
          <button className="ol-nav-item" onClick={() => setFolder("inbox")}>
            <span className="ol-nav-icon"><InboxIcon/></span>
            <span className="ol-nav-label">Inbox</span>
          </button>
        </div>
      </nav>

      {/* EMAIL LIST */}
      <div className="ol-list" style={{ marginTop: sessionExpired ? 48 : 0 }}>
        <div className="ol-list-header">
          <div className="ol-list-title-row">
            <h2 className="ol-list-title">{FOLDERS.find(f2=>f2.id===folder)?.label}</h2>
            <div className="ol-list-actions">
              {currentEmails.length > 0 && (
                <label style={{ display:"flex", alignItems:"center", padding:"0 6px", cursor:"pointer" }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleCheckAll} style={{ width:15, height:15, cursor:"pointer", accentColor:"#0078d4" }}/>
                </label>
              )}
              <button className="ol-icon-btn" onClick={() => setSearchMode(s => !s)}><FilterIcon active={searchMode}/></button>
              <button className="ol-icon-btn" onClick={() => fetchEmails(folder)} disabled={loading}><RefreshIcon spinning={loading}/></button>
            </div>
          </div>
          {searchMode && (
            <div className="ol-search-wrap">
              <SearchIcon/>
              <input className="ol-search" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} autoFocus/>
              {search && <button className="ol-search-clear" onClick={() => setSearch("")}>✕</button>}
            </div>
          )}
          {someChecked && (
            <div className="ol-bulk-bar">
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:24, height:24, borderRadius:"50%", background:"#d13438", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ color:"#fff", fontWeight:700, fontSize:11 }}>{selectedEmails.length}</span>
                </div>
                <span style={{ fontSize:13, fontWeight:600, color:"#a4262c" }}>{selectedEmails.length} selected</span>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button className="ol-bulk-delete-btn" onClick={triggerDeleteBulk}><TrashIcon/> Delete ({selectedEmails.length})</button>
                <button onClick={() => setSelectedEmails([])} style={{ background:"none", border:"none", color:"#605e5c", cursor:"pointer", fontSize:12, padding:"4px 8px", borderRadius:4 }}>Clear</button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="ol-error">
            <span>⚠ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div className="ol-list-body">
          {loading && currentEmails.length === 0 ? (
            <div className="ol-center-state"><div className="ol-spinner"/><span>Loading</span></div>
          ) : currentEmails.length === 0 ? (
            <div className="ol-center-state"><EmptyIcon/><span style={{marginTop:8, color:"#605e5c"}}>Nothing to see here</span></div>
          ) : currentEmails.map(e => {
            const isChecked = selectedEmails.includes(e.id);
            return (
              <div key={e.id} className={`ol-email-row ${selectedId===e.id?"sel":""} ${e.unread?"unread":""} ${isChecked?"ol-checked":""}`} onClick={() => selectEmail(e.id)}>
                <div className="ol-row-check" onClick={ev => ev.stopPropagation()}>
                  <input type="checkbox" checked={isChecked} onChange={() => toggleCheck(e.id)} style={{ width:15, height:15, cursor:"pointer", accentColor:"#0078d4" }}/>
                </div>
                <div className="ol-avatar" style={{ background: getColor(e.sender) }}>{e.senderInitial}</div>
                <div className="ol-email-content">
                  <div className="ol-email-top">
                    <span className="ol-email-sender">{e.sender}</span>
                    <span className="ol-email-time">{e.time}</span>
                  </div>
                  <div className="ol-email-subject">{e.subject}</div>
                  <div className="ol-email-preview">{e.preview}</div>
                  {e.hasAttachments && <span className="ol-attach-icon">📎</span>}
                </div>
                <div className="ol-hover-actions" onClick={ev => ev.stopPropagation()}>
                  {folder === "sent" && (
                    <button className="ol-hover-recall" title="Recall message" onClick={ev => { ev.stopPropagation(); triggerRecall(e); }}><RecallIcon/></button>
                  )}
                  <button className="ol-hover-delete" title="Delete" onClick={ev => { ev.stopPropagation(); triggerDeleteSingle(e.id); }}><TrashIcon/></button>
                </div>
                {e.unread && <span className="ol-unread-bar"/>}
              </div>
            );
          })}
          {nextToken && (
            <button className="ol-load-more" onClick={() => fetchEmails(folder, true)} disabled={loading}>
              {loading ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      </div>

      {/* READING PANE */}
      <div className="ol-reading" style={{ marginTop: sessionExpired ? 48 : 0 }}>
        {compose ? (
          <div className="ol-compose">
            <div className="ol-compose-header">
              <span className="ol-compose-title">{replyTo ? "Reply" : "New Message"}</span>
              <div style={{display:"flex",gap:4}}>
                <button className="ol-icon-btn" onClick={() => setCompose(false)}>—</button>
                <button className="ol-icon-btn" onClick={() => { setCompose(false); setReplyTo(null); }}>✕</button>
              </div>
            </div>
            <div className="ol-compose-toolbar">
              <button className="ol-send-btn" onClick={handleSend} disabled={sending}>
                {sending ? <><div className="ol-btn-spinner"/><span>Sending…</span></> : <><SendIcon/><span>Send</span></>}
              </button>
              <div className="ol-toolbar-divider"/>
              <button className="ol-toolbar-btn" onClick={() => { setCompose(false); setReplyTo(null); }}><TrashIcon/> Discard</button>
            </div>
            <div className="ol-compose-fields">
              <div className="ol-compose-row">
                <span className="ol-field-label">To</span>
                <input className="ol-field-input" type="text" value={form.to} onChange={e => setForm(p=>({...p,to:e.target.value}))} placeholder="To" autoFocus={!replyTo}/>
              </div>
              <div className="ol-compose-row">
                <span className="ol-field-label">Cc</span>
                <input className="ol-field-input" type="text" value={form.cc} onChange={e => setForm(p=>({...p,cc:e.target.value}))} placeholder="Cc"/>
              </div>
              <div className="ol-compose-row ol-subject-row">
                <input className="ol-subject-input" type="text" value={form.subject} onChange={e => setForm(p=>({...p,subject:e.target.value}))} placeholder="Add a subject"/>
              </div>
            </div>
            <div className="ol-compose-body" style={{ padding: 0, overflow: 'auto' }}>
              <CKEditor editor={ClassicEditor} data={form.body} onChange={(event, editor) => setForm(p => ({ ...p, body: editor.getData() }))} config={{ toolbar: ['heading','|','bold','italic','underline','|','bulletedList','numberedList','|','link','blockQuote','|','undo','redo'], placeholder: 'Write your message here…' }}/>
            </div>
          </div>

        ) : selected ? (
          <div className="ol-detail">
            <div className="ol-detail-header">
              <h1 className="ol-detail-subject">{selected.subject}</h1>
              <div className="ol-detail-actions">
                {folder === "inbox" && <button className="ol-action-btn" onClick={() => openReply(selected)}><ReplyIcon/> Reply</button>}
                {folder === "sent" && (
                  <button className="ol-action-btn ol-recall-btn" onClick={() => triggerRecall(selected)} disabled={recalling} title="Recall this message">
                    {recalling && recallTarget?.id === selected.id ? <><div className="ol-btn-spinner-dark"/> Recalling…</> : <><RecallIcon/> Recall</>}
                  </button>
                )}
                <button className="ol-action-btn ol-delete-btn" onClick={() => triggerDeleteSingle(selected.id)}><TrashIcon/> Delete</button>
              </div>
            </div>
            <div className="ol-detail-meta">
              <div className="ol-detail-avatar" style={{ background: getColor(selected.sender) }}>{selected.senderInitial}</div>
              <div className="ol-detail-sender-info">
                <div className="ol-detail-sender-row">
                  <span className="ol-detail-sender-name">{selected.sender}</span>
                  <span className="ol-detail-time">{selected.time}</span>
                </div>
                <div className="ol-detail-to">To: me</div>
                {selected.senderEmail && <div className="ol-detail-email">&lt;{selected.senderEmail}&gt;</div>}
              </div>
            </div>
            <div className="ol-detail-body">
              {selected.bodyType === "html"
                ? <iframe srcDoc={selected.body} className="ol-detail-iframe" sandbox="allow-same-origin allow-scripts allow-popups" title="Email"/>
                : <div className="ol-detail-text">{selected.body}</div>}
            </div>
          </div>

        ) : (
          <div className="ol-no-sel">
            <SelectEmailIcon/>
            <p>Select an item to read</p>
            <p style={{fontSize:13, color:"#a19f9d", marginTop:4}}>Nothing is selected</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .ol-root { display:flex; height:100vh; background:#fff; font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif; font-size:14px; color:#1a1a1a; overflow:hidden; }
        .ol-nav { width:220px; flex-shrink:0; background:#f5f5f5; border-right:1px solid #e0e0e0; display:flex; flex-direction:column; padding:8px 0; overflow-y:auto; transition:margin-top .2s; }
        .ol-new-btn { display:flex; align-items:center; gap:8px; margin:4px 12px 8px; padding:8px 16px; background:#0078d4; color:#fff; border:none; border-radius:4px; font-size:14px; font-weight:600; cursor:pointer; transition:background .15s; }
        .ol-new-btn:hover { background:#106ebe; }
        .ol-nav-section { padding:0 4px; }
        .ol-nav-group-label { padding:8px 12px 4px; font-size:11px; font-weight:600; color:#605e5c; text-transform:uppercase; letter-spacing:.5px; }
        .ol-nav-item { display:flex; align-items:center; gap:8px; width:100%; padding:6px 12px; background:none; border:none; border-radius:4px; font-size:14px; color:#323130; cursor:pointer; text-align:left; transition:background .12s; }
        .ol-nav-item:hover { background:#ebebeb; }
        .ol-nav-item.active { background:#deecf9; color:#0078d4; font-weight:600; }
        .ol-nav-icon { display:flex; align-items:center; flex-shrink:0; }
        .ol-nav-label { flex:1; }
        .ol-badge { background:#0078d4; color:#fff; border-radius:10px; padding:1px 7px; font-size:11px; font-weight:700; min-width:20px; text-align:center; }
        .ol-nav-divider { height:1px; background:#e0e0e0; margin:8px 12px; }
        .ol-list { width:340px; flex-shrink:0; display:flex; flex-direction:column; border-right:1px solid #e0e0e0; overflow:hidden; transition:margin-top .2s; }
        .ol-list-header { padding:10px 12px 8px; border-bottom:1px solid #e8e8e8; flex-shrink:0; background:#fff; }
        .ol-list-title-row { display:flex; align-items:center; justify-content:space-between; }
        .ol-list-title { font-size:18px; font-weight:600; color:#1a1a1a; }
        .ol-list-actions { display:flex; align-items:center; gap:2px; }
        .ol-icon-btn { display:flex; align-items:center; justify-content:center; width:32px; height:32px; background:none; border:none; border-radius:4px; cursor:pointer; color:#605e5c; transition:background .12s; }
        .ol-icon-btn:hover { background:#f0f0f0; }
        .ol-icon-btn:disabled { opacity:.5; cursor:default; }
        .ol-bulk-bar { display:flex; align-items:center; justify-content:space-between; margin-top:8px; padding:8px 10px; background:#fde7e9; border-radius:5px; border:1px solid #f4b8bb; }
        .ol-bulk-delete-btn { display:flex; align-items:center; gap:5px; padding:5px 12px; background:#d13438; color:#fff; border:none; border-radius:4px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; }
        .ol-bulk-delete-btn:hover { background:#a4262c; }
        .ol-search-wrap { display:flex; align-items:center; gap:6px; margin-top:6px; padding:0 8px; background:#f5f5f5; border:1px solid #e0e0e0; border-radius:4px; }
        .ol-search { flex:1; border:none; background:none; padding:6px 0; font-size:14px; outline:none; }
        .ol-search-clear { background:none; border:none; cursor:pointer; color:#666; font-size:12px; }
        .ol-error { display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:#fde7e9; font-size:13px; color:#a4262c; flex-shrink:0; }
        .ol-error button { background:none; border:none; cursor:pointer; }
        .ol-list-body { flex:1; overflow-y:auto; }
        .ol-center-state { display:flex; flex-direction:column; align-items:center; justify-content:center; height:200px; color:#a19f9d; gap:8px; font-size:13px; }
        .ol-email-row { display:flex; align-items:flex-start; gap:8px; padding:10px 8px 10px 10px; border-bottom:1px solid #f0f0f0; cursor:pointer; position:relative; transition:background .1s; }
        .ol-email-row:hover { background:#f5f5f5; }
        .ol-email-row:hover .ol-hover-actions { opacity:1; }
        .ol-email-row.sel { background:#deecf9; }
        .ol-email-row.unread { background:#f0f7ff; }
        .ol-email-row.ol-checked { background:#fff4f4; }
        .ol-unread-bar { position:absolute; left:0; top:0; bottom:0; width:3px; background:#0078d4; border-radius:0 2px 2px 0; }
        .ol-row-check { display:flex; align-items:center; flex-shrink:0; padding-top:2px; }
        .ol-hover-actions { opacity:0; flex-shrink:0; align-self:center; display:flex; align-items:center; gap:4px; transition:opacity .12s; }
        .ol-hover-recall { display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:4px; border:1px solid #f0c080; background:#fff8ec; color:#ca5010; cursor:pointer; transition:all .12s; }
        .ol-hover-recall:hover { background:#ca5010; color:#fff; border-color:#ca5010; }
        .ol-hover-delete { display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:4px; border:1px solid #f4b8bb; background:#fde7e9; color:#a4262c; cursor:pointer; transition:all .12s; }
        .ol-hover-delete:hover { background:#d13438; color:#fff; border-color:#d13438; }
        .ol-avatar { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:15px; flex-shrink:0; margin-top:1px; }
        .ol-email-content { flex:1; min-width:0; }
        .ol-email-top { display:flex; align-items:baseline; justify-content:space-between; gap:8px; margin-bottom:3px; }
        .ol-email-sender { font-size:14px; color:#323130; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ol-email-row.unread .ol-email-sender { font-weight:700; }
        .ol-email-time { font-size:12px; color:#605e5c; flex-shrink:0; }
        .ol-email-subject { font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px; }
        .ol-email-row.unread .ol-email-subject { font-weight:600; }
        .ol-email-preview { font-size:12px; color:#605e5c; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ol-attach-icon { font-size:11px; color:#605e5c; }
        .ol-load-more { width:100%; padding:12px; background:none; border:none; border-top:1px solid #f0f0f0; color:#0078d4; font-size:13px; cursor:pointer; }
        .ol-load-more:hover { background:#f5f5f5; }
        .ol-reading { flex:1; display:flex; flex-direction:column; overflow:hidden; background:#fff; min-width:0; transition:margin-top .2s; }
        .ol-no-sel { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#a19f9d; gap:8px; }
        .ol-no-sel p { font-size:14px; }
        .ol-compose { display:flex; flex-direction:column; height:100%; background:#fff; }
        .ol-compose-header { display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-bottom:1px solid #e0e0e0; background:#f5f5f5; flex-shrink:0; }
        .ol-compose-title { font-size:15px; font-weight:600; }
        .ol-compose-toolbar { display:flex; align-items:center; gap:4px; padding:6px 12px; border-bottom:1px solid #e0e0e0; flex-shrink:0; }
        .ol-send-btn { display:flex; align-items:center; gap:6px; padding:6px 16px; background:#0078d4; color:#fff; border:none; border-radius:4px; font-size:14px; font-weight:600; cursor:pointer; }
        .ol-send-btn:disabled { background:#c8c6c4; cursor:not-allowed; }
        .ol-toolbar-divider { width:1px; height:24px; background:#e0e0e0; margin:0 4px; }
        .ol-toolbar-btn { display:flex; align-items:center; gap:4px; padding:6px 10px; background:none; border:none; border-radius:4px; font-size:13px; color:#323130; cursor:pointer; }
        .ol-toolbar-btn:hover { background:#f0f0f0; }
        .ol-compose-fields { flex-shrink:0; border-bottom:1px solid #e0e0e0; }
        .ol-compose-row { display:flex; align-items:center; border-bottom:1px solid #f0f0f0; padding:0 16px; min-height:40px; }
        .ol-field-label { width:32px; color:#605e5c; font-size:14px; flex-shrink:0; }
        .ol-field-input { flex:1; border:none; outline:none; font-size:14px; padding:8px 0; font-family:inherit; }
        .ol-subject-row { padding:0 16px; }
        .ol-subject-input { width:100%; border:none; outline:none; font-size:16px; font-weight:600; padding:10px 0; font-family:inherit; }
        .ol-compose-body { flex:1; overflow:auto; }
        .ol-detail { display:flex; flex-direction:column; height:100%; overflow:hidden; }
        .ol-detail-header { padding:16px 24px 12px; border-bottom:1px solid #e0e0e0; flex-shrink:0; }
        .ol-detail-subject { font-size:20px; font-weight:600; color:#1a1a1a; line-height:1.3; margin-bottom:12px; }
        .ol-detail-actions { display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
        .ol-action-btn { display:flex; align-items:center; gap:5px; padding:5px 12px; background:none; border:1px solid #e0e0e0; border-radius:4px; font-size:13px; color:#323130; cursor:pointer; transition:all .12s; }
        .ol-action-btn:hover { background:#f5f5f5; border-color:#c8c6c4; }
        .ol-action-btn:disabled { opacity:.6; cursor:not-allowed; }
        .ol-recall-btn { color:#ca5010 !important; border-color:#f0c080 !important; }
        .ol-recall-btn:hover:not(:disabled) { background:#fff8ec !important; border-color:#ca5010 !important; }
        .ol-delete-btn { color:#a4262c; }
        .ol-delete-btn:hover { background:#fde7e9; border-color:#a4262c; }
        .ol-detail-meta { display:flex; align-items:flex-start; gap:12px; padding:12px 24px; border-bottom:1px solid #f0f0f0; flex-shrink:0; }
        .ol-detail-avatar { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:16px; flex-shrink:0; }
        .ol-detail-sender-info { flex:1; min-width:0; }
        .ol-detail-sender-row { display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
        .ol-detail-sender-name { font-weight:600; font-size:14px; }
        .ol-detail-time { font-size:12px; color:#605e5c; flex-shrink:0; }
        .ol-detail-to { font-size:12px; color:#605e5c; margin-top:2px; }
        .ol-detail-email { font-size:12px; color:#605e5c; }
        .ol-detail-body { flex:1; overflow:hidden; }
        .ol-detail-iframe { width:100%; height:100%; border:none; }
        .ol-detail-text { padding:20px 24px; font-size:14px; line-height:1.7; color:#323130; white-space:pre-wrap; overflow-y:auto; height:100%; }
        .ol-spinner { width:28px; height:28px; border:3px solid #f0f0f0; border-top-color:#0078d4; border-radius:50%; animation:spin .7s linear infinite; }
        .ol-btn-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
        .ol-btn-spinner-dark { width:12px; height:12px; border:2px solid rgba(202,80,16,.3); border-top-color:#ca5010; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}

function InboxIcon()  { return <svg width="16" height="16" viewBox="0 0 16 16" fill="#605e5c"><path d="M14.5 2h-13A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2zM1 9h3.5a.5.5 0 0 1 .5.5 3 3 0 0 0 6 0 .5.5 0 0 1 .5-.5H15v3.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5V9zm14-1H11a4 4 0 0 0-7.969 0H1V3.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5V8z"/></svg>; }
function SentIcon()   { return <svg width="16" height="16" viewBox="0 0 16 16" fill="#605e5c"><path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.109zm-6.3 9.647-3.25-5.098 7.8-4.953-4.55 10.051z"/></svg>; }
function SendIcon()   { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.109z"/></svg>; }
function TrashIcon()  { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>; }
function ReplyIcon()  { return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6.598 5.013a.144.144 0 0 1 .202.134V6.3a.5.5 0 0 0 .5.5c.667 0 2.013.005 3.3.822.984.624 1.99 1.76 2.595 3.876-1.02-.983-2.185-1.516-3.205-1.799a8.74 8.74 0 0 0-1.921-.306 7.404 7.404 0 0 0-.798.008h-.013l-.005.001h-.001L7.3 9.9l-.05-.498a.5.5 0 0 0-.45.498v1.153c0 .108-.11.176-.202.134L2.614 8.254a.503.503 0 0 0-.042-.028.147.147 0 0 1 0-.252.499.499 0 0 0 .042-.028l3.984-2.933z"/></svg>; }
function RecallIcon() { return <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg>; }
function RefreshIcon({spinning}) { return <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={spinning?{animation:"spin .7s linear infinite"}:{}}><path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/><path fillRule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/></svg>; }
function FilterIcon({active}) { return <svg width="16" height="16" viewBox="0 0 16 16" fill={active?"#0078d4":"currentColor"}><path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>; }
function SearchIcon() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="#605e5c"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>; }
function EmptyIcon()  { return <svg width="48" height="48" viewBox="0 0 16 16" fill="#c8c6c4"><path d="M14.5 2h-13A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2zM1 9h3.5a.5.5 0 0 1 .5.5 3 3 0 0 0 6 0 .5.5 0 0 1 .5-.5H15v3.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5V9zm14-1H11a4 4 0 0 0-7.969 0H1V3.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5V8z"/></svg>; }
function SelectEmailIcon() { return <svg width="64" height="64" viewBox="0 0 16 16" fill="#c8c6c4"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.708 2.825L15 11.105V5.383zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741zM1 11.105l4.708-2.897L1 5.383v5.722z"/></svg>; }
