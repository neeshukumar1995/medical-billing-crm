"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ComposePage() {
  const router = useRouter();
  const [composeData, setComposeData] = useState({ to: "", cc: "", subject: "", body: "" });

  const handleSend = () => {
    if (!composeData.to || !composeData.subject || !composeData.body) return;
    // Simulate sending - in real app, send to backend
    alert("Email sent!");
    router.push('/outlookEmail');
  };

  const handleDiscard = () => {
    router.push('/outlookEmail');
  };

  return (
    <>
      <div className="compose-page">
        <div className="compose-header">
          <button className="back-btn" onClick={() => router.push('/outlookEmail')}>←</button>
          <h3>New Message</h3>
          <button className="close-btn" onClick={() => router.push('/outlookEmail')}>✕</button>
        </div>
        <div className="compose-body">
          <div className="compose-field">
            <label>To:</label>
            <input
              type="text"
              value={composeData.to}
              onChange={e => setComposeData(prev => ({ ...prev, to: e.target.value }))}
              placeholder="Enter recipient email"
            />
          </div>
          <div className="compose-field">
            <label>Cc:</label>
            <input
              type="text"
              value={composeData.cc}
              onChange={e => setComposeData(prev => ({ ...prev, cc: e.target.value }))}
              placeholder="Enter CC emails"
            />
          </div>
          <div className="compose-field">
            <label>Subject:</label>
            <input
              type="text"
              value={composeData.subject}
              onChange={e => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Enter subject"
            />
          </div>
          <div className="compose-field body-field">
            <textarea
              value={composeData.body}
              onChange={e => setComposeData(prev => ({ ...prev, body: e.target.value }))}
              placeholder="Compose your message..."
              rows="15"
            />
          </div>
        </div>
        <div className="compose-footer">
          <button className="send-btn" onClick={handleSend}>Send</button>
          <button className="discard-btn" onClick={handleDiscard}>Discard</button>
        </div>
      </div>

      <style jsx>{`
        * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: #f3f2f1; margin: 0; }
        .compose-page { display: flex; flex-direction: column; height: 100vh; background: white; }
        .compose-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e1e1e1; background: #f8f8f8; }
        .compose-header h3 { margin: 0; font-size: 18px; font-weight: 600; }
        .back-btn, .close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #666; }
        .compose-body { flex: 1; padding: 20px; overflow-y: auto; }
        .compose-field { margin-bottom: 16px; }
        .compose-field label { display: block; font-weight: 600; margin-bottom: 4px; font-size: 14px; }
        .compose-field input, .compose-field textarea { width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
        .body-field textarea { resize: vertical; min-height: 200px; }
        .compose-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 20px; border-top: 1px solid #e1e1e1; background: #f8f8f8; }
        .send-btn { padding: 8px 16px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
        .discard-btn { padding: 8px 16px; background: #f3f2f1; color: #333; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; }
      `}</style>
    </>
  );
}