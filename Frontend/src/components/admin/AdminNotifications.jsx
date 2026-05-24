import React, { useState, useEffect } from 'react';
import { Bell, Send, History, Users, Clock, Image, Layers } from 'lucide-react';

export default function AdminNotifications({ getHeaders, showNotice, API_BASE }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetType, setTargetType] = useState('broadcast'); // broadcast, specific, topic
  const [targetUserId, setTargetUserId] = useState('');
  const [topic, setTopic] = useState('offers'); // offers, games, wallet, vip
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
        body: JSON.stringify({
          title,
          body,
          image_url: imageUrl.trim() || undefined,
          target_type: targetType,
          user_id: targetType === 'specific' ? targetUserId.trim() : undefined,
          topic: targetType === 'topic' ? topic : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setSendStatus('success');
        setTitle('');
        setBody('');
        setImageUrl('');
        setTargetUserId('');
        fetchHistory();
        setTimeout(() => setSendStatus(null), 4000);
      } else {
        setSendStatus('error');
        showNotice('error', data.message || 'Failed to send notification');
      }
    } catch (err) {
      setSendStatus('error');
      showNotice('error', 'FCM transmission error');
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
          <Bell size={18} style={{ color: 'var(--primary)' }} /> FCM Notification Engine
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '22px' }}>
          Compose high-fidelity push notifications, configure dynamic targeting and attach banners.
        </p>

        {sendStatus && (
          <div style={{ background: statusBg[sendStatus], border: `1px solid ${statusBorder[sendStatus]}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '18px', color: statusColors[sendStatus], fontSize: '0.88rem' }}>
            {sendStatus === 'sending' && '📡 Broadcasting signal via FCM...'}
            {sendStatus === 'success' && '✅ Push notification processed and delivered successfully.'}
            {sendStatus === 'error' && '❌ Transaction failed. Ensure Firebase parameters are validated.'}
          </div>
        )}

        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Target Type Selector */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={13} /> Targeting Audience
            </label>
            <select className="glass-input" value={targetType} onChange={e => setTargetType(e.target.value)}>
              <option value="broadcast">Broadcast (All Active Users)</option>
              <option value="specific">Specific User (10-Digit ID)</option>
              <option value="topic">Topic-Based Channel</option>
            </select>
          </div>

          {/* Conditional Target UI */}
          {targetType === 'specific' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={13} /> Target User ID (10-char Hex ID)
              </label>
              <input
                type="text"
                className="glass-input"
                placeholder="e.g. SE1A2B3C"
                value={targetUserId}
                onChange={e => setTargetUserId(e.target.value)}
                required
              />
            </div>
          )}

          {targetType === 'topic' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={13} /> Selective Channel Topic
              </label>
              <select className="glass-input" value={topic} onChange={e => setTopic(e.target.value)}>
                <option value="offers">Offers & Survey Completion Alerts</option>
                <option value="games">Lucky Spins & Games Rewards</option>
                <option value="wallet">Wallet Balance & Deductions</option>
                <option value="vip">VIP Status & Elite Bonus Rewards</option>
              </select>
            </div>
          )}

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
              rows={3}
              placeholder="Short description or alert message..."
              value={body}
              onChange={e => setBody(e.target.value)}
              required
            />
          </div>

          {/* Banner URL Input with Preview */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Image size={13} /> Banner / Image URL <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="e.g. https://example.com/banner.png"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
            />
            {imageUrl && (
              <div style={{ marginTop: '10px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <img
                  src={imageUrl}
                  style={{ width: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '6px' }}
                  alt="Banner Preview"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: '4px' }} disabled={sending}>
            <Send size={15} /> {sending ? 'Transmitting FCM Signals...' : 'Dispatch Alert'}
          </button>
        </form>
      </div>

      {/* Notification History */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} style={{ color: 'var(--accent)' }} /> Notification Database Logs
        </h3>

        {loadingHistory ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0', fontSize: '0.9rem' }}>Loading...</p>
        ) : history.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0', fontSize: '0.9rem' }}>No notifications sent yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
            {history.map(n => (
              <div key={n.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#fff' }}>{n.title}</p>
                  
                  {/* Sent Count Badge */}
                  {n.sent_count !== undefined && (
                    <span style={{ fontSize: '0.68rem', background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)', borderRadius: '99px', padding: '2px 8px', color: 'var(--accent)', flexShrink: 0, marginLeft: '8px' }}>
                      {n.sent_count} sent
                    </span>
                  )}
                </div>
                
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>{n.message}</p>

                {/* Banner Log Preview */}
                {n.image_url && (
                  <div style={{ marginBottom: '8px', overflow: 'hidden', borderRadius: '6px', maxHeight: '80px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <img src={n.image_url} style={{ width: '100%', height: '80px', objectFit: 'cover' }} alt="Log Preview" onError={(e) => { e.target.style.display = 'none'; }} />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} /> {new Date(n.created_at).toLocaleString()}
                  </span>
                  
                  {/* Targeting details */}
                  <span style={{ textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.03em', fontWeight: 600 }}>
                    {n.target_type === 'broadcast' && '📢 Global'}
                    {n.target_type === 'specific' && `👤 Hex ID: ${n.target_user_id || 'N/A'}`}
                    {n.target_type === 'topic' && `🏷️ Topic: ${n.target_topic || 'general'}`}
                  </span>
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
