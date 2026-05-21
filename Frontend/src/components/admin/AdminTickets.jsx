import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, X, Clock, CheckCircle, AlertCircle, Search, ChevronLeft, Lock } from 'lucide-react';

export default function AdminTickets({ getHeaders, showNotice, API_BASE }) {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [thread, setThread] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [closeOnSend, setCloseOnSend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const statusParam = filterStatus !== 'ALL' ? `?status=${filterStatus}` : '';
      const res = await fetch(`${API_BASE}/api/admin/tickets${statusParam}`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setTickets(data.tickets || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchThread = async (ticketId) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/tickets/${ticketId}`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setThread(data.replies || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchTickets(); }, [filterStatus]);

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    setReplyText('');
    fetchThread(ticket.id);
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message: replyText })
      });
      const data = await res.json();
      if (data.success) {
        if (closeOnSend) {
          await fetch(`${API_BASE}/api/admin/tickets/${selectedTicket.id}/close`, {
            method: 'POST', headers: getHeaders()
          });
          setSelectedTicket({ ...selectedTicket, status: 'CLOSED' });
        } else {
          setSelectedTicket({ ...selectedTicket, status: 'REPLIED' });
        }
        setReplyText('');
        fetchThread(selectedTicket.id);
        fetchTickets();
        showNotice('success', closeOnSend ? 'Replied and ticket closed.' : 'Reply sent.');
      } else {
        showNotice('error', data.message);
      }
    } catch (err) {
      showNotice('error', 'Failed to send reply');
    }
    setSending(false);
  };

  const filtered = tickets.filter(t =>
    t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColor = (s) => {
    if (s === 'OPEN') return 'var(--warning)';
    if (s === 'REPLIED') return 'var(--primary)';
    if (s === 'CLOSED') return 'var(--text-muted)';
    return 'var(--text-secondary)';
  };

  const statusIcon = (s) => {
    if (s === 'OPEN') return <AlertCircle size={14} />;
    if (s === 'REPLIED') return <CheckCircle size={14} />;
    if (s === 'CLOSED') return <Lock size={14} />;
    return <Clock size={14} />;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '340px 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>
      {/* Ticket List */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} style={{ color: 'var(--primary)' }} /> Support Tickets
        </h3>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
          <input
            className="glass-input"
            placeholder="Search by subject or email..."
            style={{ paddingLeft: '40px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {['ALL', 'OPEN', 'REPLIED', 'CLOSED'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="btn"
              style={{
                fontSize: '0.75rem',
                padding: '5px 12px',
                background: filterStatus === s ? 'rgba(168,85,247,0.15)' : 'transparent',
                border: filterStatus === s ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                color: filterStatus === s ? 'var(--primary-hover)' : 'var(--text-secondary)'
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0', fontSize: '0.9rem' }}>Loading tickets...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0', fontSize: '0.9rem' }}>No tickets found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
            {filtered.map(t => (
              <div
                key={t.id}
                onClick={() => openTicket(t)}
                style={{
                  background: selectedTicket?.id === t.id ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.02)',
                  border: selectedTicket?.id === t.id ? '1px solid rgba(168,85,247,0.3)' : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', margin: 0, flex: 1 }}>{t.subject || 'No Subject'}</p>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: statusColor(t.status), flexShrink: 0, marginLeft: '8px' }}>
                    {statusIcon(t.status)} {t.status}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>{t.user_email || 'Unknown User'}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(t.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Thread View */}
      {selectedTicket && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-glass)', paddingBottom: '14px' }}>
            <div>
              <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.75rem', marginBottom: '8px' }} onClick={() => setSelectedTicket(null)}>
                <ChevronLeft size={14} /> Back
              </button>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{selectedTicket.subject}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {selectedTicket.user_email} &mdash;
                <span style={{ color: statusColor(selectedTicket.status), marginLeft: '6px' }}>
                  {statusIcon(selectedTicket.status)} {selectedTicket.status}
                </span>
              </p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
            {/* Original message */}
            <div style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {selectedTicket.user_email} &bull; {new Date(selectedTicket.created_at).toLocaleString()}
              </p>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px 12px 12px 2px', padding: '12px 16px' }}>
                <p style={{ fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>{selectedTicket.message}</p>
              </div>
            </div>

            {/* Replies */}
            {thread.map(r => (
              <div key={r.id} style={{ alignSelf: r.is_admin ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', textAlign: r.is_admin ? 'right' : 'left' }}>
                  {r.is_admin ? '⚡ Admin' : selectedTicket.user_email} &bull; {new Date(r.created_at).toLocaleString()}
                </p>
                <div style={{
                  background: r.is_admin ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.04)',
                  border: r.is_admin ? '1px solid rgba(168,85,247,0.25)' : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: r.is_admin ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  padding: '12px 16px'
                }}>
                  <p style={{ fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>{r.message}</p>
                </div>
              </div>
            ))}

            {thread.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '10px' }}>No replies yet.</p>
            )}
          </div>

          {/* Reply Form */}
          {selectedTicket.status !== 'CLOSED' && (
            <form onSubmit={handleReply} style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                className="glass-input"
                rows={3}
                placeholder="Write your admin reply..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={closeOnSend} onChange={e => setCloseOnSend(e.target.checked)} />
                  Close ticket after sending
                </label>
                <button type="submit" className="btn btn-primary" style={{ padding: '9px 20px', fontSize: '0.85rem' }} disabled={sending}>
                  <Send size={14} /> {sending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </form>
          )}
          {selectedTicket.status === 'CLOSED' && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Lock size={14} style={{ marginRight: '6px' }} /> This ticket is closed. No further replies can be added.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
