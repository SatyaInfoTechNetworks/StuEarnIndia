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
      if (data.success) {
        const rawMethods = data.methods || [];
        const rawTiers = data.tiers || [];
        const mapped = rawMethods.map(m => ({
          ...m,
          tiers: rawTiers.filter(t => t.method_id === m.id)
        }));
        setMethods(mapped);
      }
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
      is_active: !!m.is_active,
      input_type: m.input_type || m.inputType || 'text',
      input_label: m.input_label || m.inputLabel || 'Details',
      input_placeholder: m.input_placeholder || m.inputPlaceholder || 'Enter details',
      tiers: m.tiers ? m.tiers.map(t => ({ coin_cost: t.coin_cost, monetary_value: t.monetary_value, currency_symbol: t.currency_symbol || '₹' })) : []
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
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

                    {/* Custom Input Settings */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Input Type</label>
                        <select className="glass-input" value={editForm.input_type} onChange={e => setEditForm({ ...editForm, input_type: e.target.value })}>
                          <option value="text">Text (UPI/ID)</option>
                          <option value="email">Email</option>
                          <option value="number">Number</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Input Label</label>
                        <input className="glass-input" value={editForm.input_label} onChange={e => setEditForm({ ...editForm, input_label: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Input Placeholder</label>
                      <input className="glass-input" value={editForm.input_placeholder} onChange={e => setEditForm({ ...editForm, input_placeholder: e.target.value })} />
                    </div>

                    {/* Fixed Payout Tiers Sub-Form */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                      <label className="form-label" style={{ fontWeight: 600, marginBottom: '6px' }}>Fixed Redeem Tiers</label>
                      {editForm.tiers.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0 0 10px' }}>No fixed tiers configured yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                          {editForm.tiers.map((t, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px' }}>
                              <span style={{ fontSize: '0.8rem', flex: 1 }}>🪙 {t.coin_cost} Coins = {t.currency_symbol}{t.monetary_value}</span>
                              <button type="button" className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem', color: 'var(--danger)' }} onClick={() => {
                                const newTiers = [...editForm.tiers];
                                newTiers.splice(idx, 1);
                                setEditForm({ ...editForm, tiers: newTiers });
                              }}>Remove</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.7rem' }}>Coins</label>
                          <input type="number" id="new_tier_coins" className="glass-input" style={{ padding: '4px 8px', fontSize: '0.8rem' }} placeholder="1000" />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.7rem' }}>Value (INR)</label>
                          <input type="number" id="new_tier_val" className="glass-input" style={{ padding: '4px 8px', fontSize: '0.8rem' }} placeholder="10" />
                        </div>
                        <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => {
                          const coinEl = document.getElementById('new_tier_coins');
                          const valEl = document.getElementById('new_tier_val');
                          const coin_cost = parseInt(coinEl?.value || 0);
                          const monetary_value = parseFloat(valEl?.value || 0);
                          if (coin_cost > 0 && monetary_value > 0) {
                            const newTiers = [...editForm.tiers, { coin_cost, monetary_value, currency_symbol: '₹' }];
                            setEditForm({ ...editForm, tiers: newTiers });
                            if (coinEl) coinEl.value = '';
                            if (valEl) valEl.value = '';
                          } else {
                            showNotice('error', 'Enter valid coins and value amount.');
                          }
                        }}>Add</button>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '12px' }}>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Minimum Coins</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--warning)', margin: 0 }}>{m.min_coins ?? '—'}</p>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '12px' }}>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Conversion Rate</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)', margin: 0 }}>{m.conversion_rate ?? '—'}×</p>
                      </div>
                    </div>

                    {/* Display Custom Inputs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.01)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem', margin: '0 0 2px' }}>Input Type</p>
                        <p style={{ margin: 0, fontWeight: 600 }}>{m.input_type || m.inputType || 'text'}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem', margin: '0 0 2px' }}>Input Label</p>
                        <p style={{ margin: 0, fontWeight: 600 }}>{m.input_label || m.inputLabel || 'Details'}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem', margin: '0 0 2px' }}>Placeholder</p>
                        <p style={{ margin: 0, fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{m.input_placeholder || m.inputPlaceholder || 'Enter details'}</p>
                      </div>
                    </div>

                    {/* Display Payout Tiers */}
                    <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.01)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '6px', margin: '0 0 6px' }}>Configured Tiers</p>
                      {(!m.tiers || m.tiers.length === 0) ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: 0 }}>No fixed tiers (Uses dynamic rate)</p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {m.tiers.map((t, idx) => (
                            <span key={idx} className="badge badge-info" style={{ fontSize: '0.68rem', padding: '4px 8px', background: 'rgba(59,130,246,0.08)', color: 'rgb(147,197,253)', border: '1px solid rgba(59,130,246,0.15)' }}>
                              🪙 {t.coin_cost} = {t.currency_symbol || '₹'}{t.monetary_value}
                            </span>
                          ))}
                        </div>
                      )}
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
