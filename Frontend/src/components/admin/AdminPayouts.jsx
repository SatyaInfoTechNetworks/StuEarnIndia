import React, { useState, useEffect } from 'react';
import { CreditCard, Edit3, Save, X, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';

export default function AdminPayouts({ getHeaders, showNotice, API_BASE }) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/payout-methods`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setMethods(data.methods || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchMethods(); }, []);

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditForm({
      name: m.name || '',
      description: m.description || '',
      min_coins: m.min_coins ?? 0,
      conversion_rate: m.conversion_rate ?? 1,
      is_active: !!m.is_active
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/payout-methods/${editingId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', 'Payout method updated!');
        setEditingId(null);
        fetchMethods();
      } else {
        showNotice('error', data.message);
      }
    } catch (err) {
      showNotice('error', 'Failed to update payout method');
    }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} style={{ color: 'var(--primary)' }} /> Payout Methods
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Configure withdrawal methods, conversion rates, and minimum thresholds.
          </p>
        </div>
        <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }} onClick={fetchMethods}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Loading payout methods...</p>
      ) : methods.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <CreditCard size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <p style={{ color: 'var(--text-muted)' }}>No payout methods configured yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {methods.map(m => {
            const isEditing = editingId === m.id;
            return (
              <div key={m.id} className="glass-panel" style={{ padding: '24px', border: isEditing ? '1px solid rgba(168,85,247,0.3)' : undefined }}>
                {isEditing ? (
                  /* Edit Mode */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--primary-hover)' }}>Editing</h4>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={cancelEdit}><X size={14} /></button>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Name</label>
                      <input className="glass-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Description</label>
                      <textarea className="glass-input" rows={2} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Min Coins</label>
                        <input type="number" className="glass-input" value={editForm.min_coins} onChange={e => setEditForm({ ...editForm, min_coins: parseFloat(e.target.value || 0) })} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Conversion Rate</label>
                        <input type="number" step="0.001" className="glass-input" value={editForm.conversion_rate} onChange={e => setEditForm({ ...editForm, conversion_rate: parseFloat(e.target.value || 0) })} />
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })} />
                      Active (available to users)
                    </label>
                    <button className="btn btn-primary" style={{ padding: '10px' }} onClick={handleSave} disabled={saving}>
                      <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                ) : (
                  /* Display Mode */
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '12px',
                          background: m.is_active ? 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.2))' : 'rgba(255,255,255,0.04)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <CreditCard size={20} style={{ color: m.is_active ? 'var(--primary-hover)' : 'var(--text-muted)' }} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem' }}>{m.name}</h4>
                          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{m.description || 'No description'}</p>
                        </div>
                      </div>
                      {m.is_active ? (
                        <span className="badge badge-approved" style={{ fontSize: '0.68rem' }}>ACTIVE</span>
                      ) : (
                        <span className="badge badge-rejected" style={{ fontSize: '0.68rem' }}>DISABLED</span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '12px' }}>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Minimum Coins</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--warning)', margin: 0 }}>{m.min_coins ?? '—'}</p>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '12px' }}>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Conversion Rate</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)', margin: 0 }}>{m.conversion_rate ?? '—'}×</p>
                      </div>
                    </div>

                    <button className="btn btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '0.82rem' }} onClick={() => startEdit(m)}>
                      <Edit3 size={13} /> Edit Method
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
