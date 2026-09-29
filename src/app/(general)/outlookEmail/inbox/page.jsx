"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { microsoftLogin } from '@/components/outlookconnectbutton';
import { formatTime as formatClockTime } from '@/utils/formatDate';
import BackButton from '@/components/shared/BackButton';

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

const formatEmail = (e, userEmail, userId) => {
  const senderEmail = e.from      || "";
  const senderName  = e.from_name || (e.from ? e.from.split("@")[0] : "Unknown");
  const initial     = (senderName || senderEmail || "?")[0].toUpperCase();
  return {
    id:             e.id,
    userId,
    userEmail,
    sender:         senderName,
    senderEmail,
    senderInitial:  initial,
    subject:        e.subject         || "(No Subject)",
    time:           formatTime(e.received_at),
    body:           e.body            || e.preview || "",
    bodyType:       e.body_type       || "text",
    preview:        e.preview         || "",
    unread:         !(e.is_read       ?? false),
    hasAttachments: e.has_attachments ?? false,
  };
};

const AVATAR_COLORS = ["#0078d4","#00b7c3","#107c10","#d13438","#8764b8","#ca5010","#038387","#7a7574"];
const getColor = (str) => AVATAR_COLORS[(str?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  if (!msg) return null;
  const bg = type === "success" ? "#107c10" : type === "info" ? "#0078d4" : "#a4262c";
  return (
    <div style={{
      position:"fixed", bottom:28, right:28, zIndex:10000,
      background:bg, color:"#fff", padding:"12px 20px", borderRadius:6,
      fontSize:14, fontWeight:500, boxShadow:"0 4px 20px rgba(0,0,0,.2)",
      display:"flex", alignItems:"center", gap:10,
      animation:"toastIn .2s ease", fontFamily:"'Segoe UI', sans-serif", maxWidth:420,
    }}>
      <span style={{ fontSize:16 }}>{type === "success" ? "✓" : type === "info" ? "ℹ" : "✕"}</span>
      <span style={{ flex:1 }}>{msg}</span>
      <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:18,lineHeight:1}}>✕</button>
      <style>{`@keyframes toastIn{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

function ErrorBanner({ msg, onDismiss }) {
  if (!msg) return null;
  const isTokenErr = msg.toLowerCase().includes("not connected") || msg.toLowerCase().includes("reconnect") || msg.toLowerCase().includes("not connected");
  return (
    <div style={{
      display:"flex", alignItems:"flex-start", justifyContent:"space-between",
      gap:8, padding:"12px 16px",
      background: isTokenErr ? "#fff4ce" : "#fde7e9",
      borderLeft: `3px solid ${isTokenErr ? "#c19c00" : "#d13438"}`,
      fontSize:13, color: isTokenErr ? "#6a4f00" : "#a4262c", flexShrink:0,
    }}>
      <div style={{ flex:1, lineHeight:1.6 }}>
        <span>{isTokenErr ? "⚠ " : "✕ "}{msg}</span>
        {isTokenErr && (
          <div style={{ fontSize:12, marginTop:4, opacity:.85 }}>
            This user needs to connect their Outlook account from their own account settings.
          </div>
        )}
      </div>
      <button onClick={onDismiss} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,lineHeight:1,flexShrink:0,color:"inherit"}}>✕</button>
    </div>
  );
}

export default function OutlookInboxPage() {
  const [selectedId,    setSelectedId]    = useState(null);
  const [emails,        setEmails]        = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error,         setError]         = useState(null);
  const [connected,     setConnected]     = useState(false);
  const [checking,      setChecking]      = useState(true);
  const [search,        setSearch]        = useState("");
  const [searchMode,    setSearchMode]    = useState(false);
  const [toast,         setToast]         = useState(null);
  const [users,         setUsers]         = useState([]);
  const [selectedUser,  setSelectedUser]  = useState(null);
  const [loadingUsers,  setLoadingUsers]  = useState(false);

  const usersRef = useRef([]);
  useEffect(() => { usersRef.current = users; }, [users]);

  useEffect(() => {
    const token = getToken();
    if (!token) { setChecking(false); return; }
    axios.get(`${apiUrl}/api/auth/microsoft/status`, { headers: authHeaders() })
      .then(r => setConnected(r.data.connected === true))
      .catch(() => setConnected(false))
      .finally(() => setChecking(false));
  }, []);

  const fetchOutlookUsers = useCallback(async () => {
    if (!getToken()) return;
    setLoadingUsers(true);
    try {
      const r = await axios.get(`${apiUrl}/api/outlook/outlookuser`, { headers: authHeaders() });
      const list = Array.isArray(r.data) ? r.data : [];
      setUsers(list);
      usersRef.current = list;
    } catch {
      setToast({ msg: "Failed to load users list.", type: "error" });
    } finally { setLoadingUsers(false); }
  }, []);

  const fetchUserInbox = useCallback(async (userId) => {
    if (!getToken() || !userId) return;
    setLoading(true);
    setError(null);
    setEmails([]);
    setSelectedId(null);
    try {
      const r = await axios.get(
        `${apiUrl}/api/outlook/inbox/${userId}`,
        { headers: authHeaders() }
      );
      const rawEmails = r.data?.emails ?? [];
      const user      = usersRef.current.find(u => u.user_id === userId || u.id === userId);
      const userEmail = user?.microsoft_email || "";
      const formatted = rawEmails.map(e => formatEmail(e, userEmail, userId));
      setEmails(formatted);
      if (formatted.length > 0) setSelectedId(formatted[0].id);
    } catch (err) {
      const status    = err.response?.status;
      const serverMsg = err.response?.data?.message || "";
      if (status === 404 || serverMsg.toLowerCase().includes("not connected")) {
        const user     = usersRef.current.find(u => u.user_id === userId || u.id === userId);
        const userName = user?.user_name || "This user";
        setError(`${userName} has not connected their Outlook account yet.`);
      } else if (status === 401) {
        setError("Session expired. This user needs to reconnect their Microsoft account.");
      } else {
        setError(serverMsg || "Failed to load inbox. Please try again.");
      }
    } finally { setLoading(false); }
  }, []);

  const fetchDetail = useCallback(async (emailId, userId) => {
    if (!emailId) return;
    setDetailLoading(true);
    try {
      const r = await axios.get(
        `${apiUrl}/api/outlook/message/${emailId}`,
        { headers: authHeaders(), params: { user_id: userId } }
      );
      if (r.data.email) {
        const d = r.data.email;
        setEmails(prev => prev.map(e => e.id === emailId
          ? { ...e, body: d.body?.content || e.body, bodyType: d.body?.contentType || "html" }
          : e
        ));
      }
    } catch { /* silent */ } finally { setDetailLoading(false); }
  }, []);

  const markRead = useCallback(async (emailId, userId) => {
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, unread: false } : e));
    try {
      await axios.patch(
        `${apiUrl}/api/outlook/message/${emailId}/read`,
        {},
        { headers: authHeaders(), params: { user_id: userId } }
      );
    } catch { /* silent */ }
  }, []);

  const selectEmail = useCallback((id) => {
    setSelectedId(id);
    const e = emails.find(x => x.id === id);
    if (!e) return;
    if (e.unread) markRead(id, e.userId);
    const needsBody = !e.body || e.body === e.preview || e.body.length < 100;
    if (needsBody) fetchDetail(id, e.userId);
  }, [emails, markRead, fetchDetail]);

  useEffect(() => { if (connected) fetchOutlookUsers(); }, [connected, fetchOutlookUsers]);
  useEffect(() => { if (selectedUser !== null) fetchUserInbox(selectedUser); }, [selectedUser, fetchUserInbox]);

  const currentEmails = emails.filter(e => {
    if (!searchMode || !search) return true;
    const q = search.toLowerCase();
    return e.subject.toLowerCase().includes(q) || e.sender.toLowerCase().includes(q) || e.preview.toLowerCase().includes(q);
  });

  const selected        = selectedId ? emails.find(e => e.id === selectedId) : null;
  const unreadCount     = emails.filter(e => e.unread).length;
  const selectedUserObj = users.find(u => u.user_id === selectedUser || u.id === selectedUser);

  if (checking) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f5f5f5" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:28, height:28, border:"3px solid #f0f0f0", borderTopColor:"#0078d4", borderRadius:"50%", animation:"spin .7s linear infinite", margin:"0 auto 12px" }}/>
        <p style={{ color:"#666", fontSize:14 }}>Loading…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (!connected) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f5f5f5", fontFamily:"'Segoe UI', sans-serif" }}>
      <div style={{ textAlign:"center", maxWidth:400, padding:40, background:"#fff", borderRadius:8, boxShadow:"0 2px 8px rgba(0,0,0,.12)" }}>
        <svg width="48" height="48" viewBox="0 0 21 21" style={{ margin:"0 auto 16px", display:"block" }}>
          <rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
        </svg>
        <h2 style={{ fontSize:20, fontWeight:600, marginBottom:8, color:"#1a1a1a" }}>Connect your Outlook</h2>
        <p style={{ fontSize:14, color:"#666", marginBottom:28, lineHeight:1.5 }}>Sign in with Microsoft to view and manage email</p>
        <button onClick={microsoftLogin} style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 24px", background:"#0078d4", color:"#fff", border:"none", borderRadius:4, fontSize:14, fontWeight:600, cursor:"pointer" }}>
          <svg width="16" height="16" viewBox="0 0 21 21">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );

  return (
    <div className="ol-root">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      <nav className="ol-nav">
        <div className="ol-nav-top">
          <BackButton label="" />
          <span className="ol-nav-title">Outlook Users</span>
          <button className="ol-icon-btn" title="Refresh" onClick={fetchOutlookUsers} disabled={loadingUsers}>
            <RefreshIcon spinning={loadingUsers}/>
          </button>
        </div>
        <div className="ol-nav-section">
          {loadingUsers ? (
            <div className="ol-nav-state"><div className="ol-spinner-sm"/><span>Loading…</span></div>
          ) : users.length === 0 ? (
            <div className="ol-nav-state">
              <svg width="28" height="28" viewBox="0 0 16 16" fill="#c8c6c4"><path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/></svg>
              <span>No connected users</span>
            </div>
          ) : users.map(user => {
            const uid      = user.user_id || user.id;
            const isActive = selectedUser === uid;
            const initial  = (user.user_name || user.microsoft_email || "U")[0].toUpperCase();
            return (
              <button key={uid} className={`ol-nav-item ${isActive ? "active" : ""}`} onClick={() => setSelectedUser(uid)} title={user.microsoft_email}>
                <div className="ol-nav-avatar" style={{ background: isActive ? "#0078d4" : getColor(user.user_name) }}>
                  {initial}
                </div>
                <div className="ol-nav-user-info">
                  <span className="ol-nav-user-name">{user.user_name || "Unknown"}</span>
                  {user.microsoft_email && <span className="ol-nav-user-email">{user.microsoft_email}</span>}
                </div>
                {user.is_expired && <span title="Token expired" style={{ color:"#c19c00", fontSize:13 }}>⚠</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="ol-list">
        <div className="ol-list-header">
          <div className="ol-list-title-row">
            <div style={{ flex:1, minWidth:0 }}>
              <h2 className="ol-list-title">{selectedUserObj?.microsoft_email || selectedUserObj?.user_name || "Select a User"}</h2>
              {unreadCount > 0 && <span style={{ fontSize:11, color:"#0078d4", fontWeight:600 }}>{unreadCount} unread</span>}
            </div>
            <div className="ol-list-actions">
              <button className="ol-icon-btn" title={searchMode ? "Close" : "Search"} onClick={() => { setSearchMode(s => !s); setSearch(""); }} disabled={!selectedUser}>
                <SearchIcon active={searchMode}/>
              </button>
              <button className="ol-icon-btn" title="Refresh" onClick={() => selectedUser && fetchUserInbox(selectedUser)} disabled={loading || !selectedUser}>
                <RefreshIcon spinning={loading}/>
              </button>
            </div>
          </div>
          {searchMode && (
            <div className="ol-search-wrap">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="#605e5c"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>
              <input className="ol-search" placeholder="Search sender, subject…" value={search} onChange={e => setSearch(e.target.value)} autoFocus/>
              {search && <button className="ol-search-clear" onClick={() => setSearch("")}>✕</button>}
            </div>
          )}
        </div>

        <ErrorBanner msg={error} onDismiss={() => setError(null)}/>

        <div className="ol-list-body">
          {!selectedUser ? (
            <div className="ol-center-state"><SelectEmailIcon/><span>Select a user from the left</span></div>
          ) : loading ? (
            <div className="ol-center-state"><div className="ol-spinner"/><span>Loading emails…</span></div>
          ) : currentEmails.length === 0 ? (
            <div className="ol-center-state"><EmptyIcon/><span>{search ? "No results found" : "No emails"}</span></div>
          ) : currentEmails.map(e => (
            <div key={e.id} className={`ol-email-row ${selectedId === e.id ? "sel" : ""} ${e.unread ? "unread" : ""}`} onClick={() => selectEmail(e.id)}>
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
              {e.unread && <span className="ol-unread-bar"/>}
            </div>
          ))}
        </div>
      </div>

      <div className="ol-reading">
        {!selectedUser ? (
          <div className="ol-no-sel"><SelectEmailIcon size={64}/><p>Select a user to view their inbox</p><p style={{ fontSize:13, color:"#a19f9d", marginTop:4 }}>Choose from the left panel</p></div>
        ) : selected ? (
          <div className="ol-detail">
            <div className="ol-detail-header">
              <h1 className="ol-detail-subject">{selected.subject}</h1>
            </div>
            <div className="ol-detail-meta">
              <div className="ol-detail-avatar" style={{ background: getColor(selected.sender) }}>{selected.senderInitial}</div>
              <div className="ol-detail-sender-info">
                <div className="ol-detail-sender-row">
                  <span className="ol-detail-sender-name">{selected.sender}</span>
                  <span className="ol-detail-time">{selected.time}</span>
                </div>
                {selected.senderEmail && <div className="ol-detail-to">From: {selected.senderEmail}</div>}
                <div className="ol-detail-to">To: {selected.userEmail}</div>
              </div>
            </div>
            <div className="ol-detail-body">
              {detailLoading ? (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, gap:10, color:"#605e5c", fontSize:13 }}>
                  <div className="ol-spinner"/><span>Loading message…</span>
                </div>
              ) : selected.bodyType === "html" ? (
                <iframe srcDoc={selected.body} className="ol-detail-iframe" sandbox="allow-same-origin allow-popups" title="Email"/>
              ) : (
                <div className="ol-detail-text">{selected.body || selected.preview || "(No content)"}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="ol-no-sel"><SelectEmailIcon size={64}/><p>Select an email to read</p><p style={{ fontSize:13, color:"#a19f9d", marginTop:4 }}>Nothing is selected</p></div>
        )}
      </div>

      <style jsx>{`
        .ol-root { display:flex; height:100vh; background:#fff; font-family:'Segoe UI',-apple-system,sans-serif; font-size:14px; color:#1a1a1a; overflow:hidden; }
        .ol-nav { width:240px; flex-shrink:0; background:#f5f5f5; border-right:1px solid #e0e0e0; display:flex; flex-direction:column; overflow-y:auto; }
        .ol-nav-top { display:flex; align-items:center; justify-content:space-between; padding:12px 12px 4px; flex-shrink:0; }
        .ol-nav-title { font-size:11px; font-weight:700; color:#605e5c; text-transform:uppercase; letter-spacing:.6px; }
        .ol-nav-section { padding:4px 4px 8px; }
        .ol-nav-state { display:flex; flex-direction:column; align-items:center; gap:8px; padding:24px 12px; font-size:12px; color:#a19f9d; text-align:center; }
        .ol-nav-item { display:flex; align-items:center; gap:10px; width:100%; padding:8px 10px; background:none; border:none; border-radius:6px; font-size:13px; color:#323130; cursor:pointer; text-align:left; transition:background .12s; margin-bottom:2px; }
        .ol-nav-item:hover { background:#ebebeb; }
        .ol-nav-item.active { background:#deecf9; }
        .ol-nav-avatar { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:13px; flex-shrink:0; }
        .ol-nav-user-info { flex:1; min-width:0; display:flex; flex-direction:column; }
        .ol-nav-user-name { font-size:13px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ol-nav-item.active .ol-nav-user-name { color:#0078d4; font-weight:600; }
        .ol-nav-user-email { font-size:11px; color:#605e5c; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ol-list { width:340px; flex-shrink:0; display:flex; flex-direction:column; border-right:1px solid #e0e0e0; overflow:hidden; }
        .ol-list-header { padding:10px 12px 8px; border-bottom:1px solid #e8e8e8; flex-shrink:0; background:#fff; }
        .ol-list-title-row { display:flex; align-items:flex-start; justify-content:space-between; }
        .ol-list-title { font-size:15px; font-weight:600; color:#1a1a1a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:190px; margin:0; }
        .ol-list-actions { display:flex; align-items:center; gap:2px; flex-shrink:0; }
        .ol-icon-btn { display:flex; align-items:center; justify-content:center; width:32px; height:32px; background:none; border:none; border-radius:4px; cursor:pointer; color:#605e5c; transition:background .12s; }
        .ol-icon-btn:hover { background:#f0f0f0; }
        .ol-icon-btn:disabled { opacity:.5; cursor:default; }
        .ol-search-wrap { display:flex; align-items:center; gap:6px; margin-top:8px; padding:0 8px; background:#f5f5f5; border:1px solid #e0e0e0; border-radius:4px; }
        .ol-search { flex:1; border:none; background:none; padding:7px 0; font-size:13px; outline:none; font-family:inherit; }
        .ol-search-clear { background:none; border:none; cursor:pointer; color:#605e5c; font-size:13px; }
        .ol-list-body { flex:1; overflow-y:auto; }
        .ol-center-state { display:flex; flex-direction:column; align-items:center; justify-content:center; height:240px; color:#a19f9d; gap:10px; font-size:13px; }
        .ol-email-row { display:flex; align-items:flex-start; gap:10px; padding:10px 12px; border-bottom:1px solid #f0f0f0; cursor:pointer; position:relative; transition:background .1s; }
        .ol-email-row:hover { background:#f5f5f5; }
        .ol-email-row.sel { background:#deecf9; }
        .ol-email-row.unread { background:#f0f7ff; }
        .ol-unread-bar { position:absolute; left:0; top:0; bottom:0; width:3px; background:#0078d4; border-radius:0 2px 2px 0; }
        .ol-avatar { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:14px; flex-shrink:0; margin-top:1px; }
        .ol-email-content { flex:1; min-width:0; }
        .ol-email-top { display:flex; align-items:baseline; justify-content:space-between; gap:8px; margin-bottom:3px; }
        .ol-email-sender { font-size:13px; color:#323130; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ol-email-row.unread .ol-email-sender { font-weight:700; }
        .ol-email-time { font-size:11px; color:#605e5c; flex-shrink:0; }
        .ol-email-subject { font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px; }
        .ol-email-row.unread .ol-email-subject { font-weight:600; }
        .ol-email-preview { font-size:12px; color:#605e5c; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ol-attach-icon { font-size:11px; color:#605e5c; margin-top:2px; display:block; }
        .ol-reading { flex:1; display:flex; flex-direction:column; overflow:hidden; background:#fff; min-width:0; }
        .ol-no-sel { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#a19f9d; gap:8px; }
        .ol-no-sel p { font-size:14px; margin:0; }
        .ol-detail { display:flex; flex-direction:column; height:100%; overflow:hidden; }
        .ol-detail-header { padding:16px 24px 12px; border-bottom:1px solid #e0e0e0; flex-shrink:0; }
        .ol-detail-subject { font-size:20px; font-weight:600; color:#1a1a1a; line-height:1.3; margin:0; }
        .ol-detail-meta { display:flex; align-items:flex-start; gap:12px; padding:12px 24px; border-bottom:1px solid #f0f0f0; flex-shrink:0; }
        .ol-detail-avatar { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:16px; flex-shrink:0; }
        .ol-detail-sender-info { flex:1; min-width:0; }
        .ol-detail-sender-row { display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
        .ol-detail-sender-name { font-weight:600; font-size:14px; }
        .ol-detail-time { font-size:12px; color:#605e5c; flex-shrink:0; }
        .ol-detail-to { font-size:12px; color:#605e5c; margin-top:2px; }
        .ol-detail-body { flex:1; overflow:hidden; }
        .ol-detail-iframe { width:100%; height:100%; border:none; display:block; }
        .ol-detail-text { padding:20px 24px; font-size:14px; line-height:1.8; color:#323130; white-space:pre-wrap; overflow-y:auto; height:100%; box-sizing:border-box; }
        .ol-spinner { width:28px; height:28px; border:3px solid #f0f0f0; border-top-color:#0078d4; border-radius:50%; animation:spin .7s linear infinite; }
        .ol-spinner-sm { width:14px; height:14px; border:2px solid #e0e0e0; border-top-color:#0078d4; border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}

function RefreshIcon({ spinning }) {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={spinning ? { animation:"spin .7s linear infinite" } : {}}><path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/><path fillRule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/></svg>;
}
function SearchIcon({ active }) {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill={active ? "#0078d4" : "currentColor"}><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>;
}
function EmptyIcon() {
  return <svg width="48" height="48" viewBox="0 0 16 16" fill="#c8c6c4"><path d="M14.5 2h-13A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2zM1 9h3.5a.5.5 0 0 1 .5.5 3 3 0 0 0 6 0 .5.5 0 0 1 .5-.5H15v3.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5V9zm14-1H11a4 4 0 0 0-7.969 0H1V3.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5V8z"/></svg>;
}
function SelectEmailIcon({ size = 48 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="#c8c6c4"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.708 2.825L15 11.105V5.383zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741zM1 11.105l4.708-2.897L1 5.383v5.722z"/></svg>;
}
