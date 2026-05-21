import React, { useState, useEffect } from 'react';
import { Bell, Send, History, Users, Clock } from 'lucide-react';

export default function AdminNotifications({ getHeaders, showNotice, API_BASE }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications?page=${page}&limit=${PER_PAGE}`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setHistory(data.notifications || []);
    } catch (err) {
      console.error(err);
    }
    setLoadingHistory(false);
  };

  useEffect(() => { fetchHistory(); }, [page]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title || !body) return;
    setSending(true);
    setSendStatus('sending');
    try {
      const res = await fetch(`${API_BASE}/api/admin/push`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title, body, user_id: targetUserId || undefined })
      });
      const data = await res.json();
      if (data.success) {
        setSendStatus('success');
        setTitle('');
        setBody('');
        setTargetUserId('');
        fetchHistory();
        setTimeout(() => setSendStatus(null), 4000);
      } else {
        setSendStatus('error');
        showNotice('error', data.message || 'Failed to send notification');
      }
    } catch (err) {
      setSendStatus('error');
    }
    setSending(false);
  };

  const statusColors = { sending: 'var(--warning)', success: 'var(--success)', error: 'var(--danger)' };
  const statusBg = { sending: 'rgba(245,158,11,0.1)', success: 'rgba(16,185,129,0.1)', error: 'rgba(239,68,68,0.1)' };
  const statusBorder = { sending: 'rgba(245,158,11,0.25)', success: 'rgba(16,185,129,0.25)', error: 'rgba(239,68,68,0.25)' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'start' }}>
      {/* Compose Notification */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={18} style={{ color: 'var(--primary)' }} /> Broadcast Push Notification
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '22px' }}>
          Send instant push alerts via Firebase Cloud Messaging. Leave User ID blank to reach all users.
        </p>

        {sendStatus && (
          <div style={{ background: statusBg[sendStatus], border: `1px solid ${statusBorder[sendStatus]}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '18px', color: statusColors[sendStatus], fontSize: '0.88rem' }}>
            {sendStatus === 'sending' && '📡 Broadcasting signal via FCM...'}
            {sendStatus === 'success' && '✅ Notifications delivered successfully.'}
            {sendStatus === 'error' && '❌ Failed. Ensure service-account.json is configured.'}
          </div>
        )}

        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={13} /> Target User ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — blank = broadcast all)</span>
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="e.g. SE1A2B3C (leave blank for everyone)"
              value={targetUserId}
              onChange={e => setTargetUserId(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Notification Title</label>
            <input
              type="text"
              className="glass-input"
              placeholder="e.g. 🎉 Earn 3x coins this weekend!"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Message Body</label>
            <textarea
              className="glass-input"
              rows={4}
              placeholder="Short description or alert message..."
              value={body}
              onChange={e => setBody(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: '4px' }} disabled={sending}>
            <Send size={15} /> {sending ? 'Sending Signals...' : 'Broadcast Notification'}
          </button>
        </form>
      </div>

      {/* Notification History */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} style={{ color: 'var(--accent)' }} /> Notification History
        </h3>

        {loadingHistory ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0', fontSize: '0.9rem' }}>Loading...</p>
        ) : history.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0', fontSize: '0.9rem' }}>No notifications sent yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }}>
            {history.map(n => (
              <div key={n.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#fff' }}>{n.title}</p>
                  {n.sent_count !== undefined && (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.2)', borderRadius: '99px', padding: '2px 8px', color: 'var(--accent)', flexShrink: 0, marginLeft: '8px' }}>
                      {n.sent_count} sent
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 6px' }}>{n.body}</p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} /> {new Date(n.created_at).toLocaleString()}
                  </span>
                  {n.user_id && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→ User: {n.user_id}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '16px' }}>
          <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>Page {page}</span>
          <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => setPage(p => p + 1)} disabled={history.length < PER_PAGE}>Next →</button>
        </div>
      </div>
    </div>
  );
}
