import React, { useState, useEffect } from 'react';
import { CreditCard, Edit3, Save, X, RefreshCw, Trash2, Plus, Info, Image, Clock } from 'lucide-react';

export default function AdminPayouts({ getHeaders, showNotice, API_BASE }) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // New Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    id: '',
    name: '',
    description: '',
    icon_url: '',
    min_coins: 1000,
    conversion_rate: 0.01,
    processing_time: 'Instant',
    is_active: true,
    fields: [{ label: 'UPI ID', placeholder: 'e.g. paytm@upi', type: 'text' }],
    tiers: []
  });

  const parseFields = (labelStr, placeholderStr, typeStr) => {
    if (!labelStr && !placeholderStr && !typeStr) return [];
    const labels = (labelStr || 'Details').split(',').map(s => s.trim());
    const placeholders = (placeholderStr || 'Enter details').split(',').map(s => s.trim());
    const types = (typeStr || 'text').split(',').map(s => s.trim());
    const maxLength = Math.max(labels.length, placeholders.length, types.length);
    const fields = [];
    for (let i = 0; i < maxLength; i++) {
      fields.push({
        label: labels[i] || 'Details',
        placeholder: placeholders[i] || 'Enter details',
        type: types[i] || 'text'
      });
    }
    return fields;
  };

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
      showNotice('error', 'Failed to retrieve payout methods');
    }
    setLoading(false);
  };

  useEffect(() => { fetchMethods(); }, []);

  const startEdit = (m) => {
    setEditingId(m.id);
    const parsedFields = parseFields(
      m.input_label || m.inputLabel || 'Details',
      m.input_placeholder || m.inputPlaceholder || 'Enter details',
      m.input_type || m.inputType || 'text'
    );
    setEditForm({
      name: m.name || '',
      description: m.description || '',
      icon_url: m.icon_url || '',
      min_coins: m.min_coins ?? 0,
      conversion_rate: m.conversion_rate ?? 1,
      processing_time: m.processing_time || 'Instant',
      is_active: !!m.is_active,
      fields: parsedFields,
      tiers: m.tiers ? m.tiers.map(t => ({ coin_cost: t.coin_cost, monetary_value: t.monetary_value, currency_symbol: t.currency_symbol || '₹' })) : []
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editForm.name.trim()) {
      showNotice('error', 'Display name is required');
      return;
    }
    setSaving(true);
    try {
      const labels = editForm.fields.map(f => f.label.replace(/,/g, '').trim()).join(',');
      const placeholders = editForm.fields.map(f => f.placeholder.replace(/,/g, '').trim()).join(',');
      const types = editForm.fields.map(f => f.type.replace(/,/g, '').trim()).join(',');

      const payload = {
        name: editForm.name,
        description: editForm.description,
        icon_url: editForm.icon_url,
        min_coins: editForm.min_coins,
        conversion_rate: editForm.conversion_rate,
        processing_time: editForm.processing_time,
        is_active: editForm.is_active,
        input_label: labels,
        input_placeholder: placeholders,
        input_type: types,
        tiers: editForm.tiers
      };

      const res = await fetch(`${API_BASE}/api/admin/payout-methods/${editingId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', 'Payout method updated successfully!');
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

  const handleCreate = async () => {
    if (!createForm.id.trim() || !createForm.name.trim()) {
      showNotice('error', 'ID/Slug and Display Name are required');
      return;
    }
    setCreating(true);
    try {
      const labels = createForm.fields.map(f => f.label.replace(/,/g, '').trim()).join(',');
      const placeholders = createForm.fields.map(f => f.placeholder.replace(/,/g, '').trim()).join(',');
      const types = createForm.fields.map(f => f.type.replace(/,/g, '').trim()).join(',');

      const payload = {
        id: createForm.id.toLowerCase().trim(),
        name: createForm.name,
        description: createForm.description,
        icon_url: createForm.icon_url,
        min_coins: createForm.min_coins,
        conversion_rate: createForm.conversion_rate,
        processing_time: createForm.processing_time,
        is_active: createForm.is_active,
        input_label: labels,
        input_placeholder: placeholders,
        input_type: types,
        tiers: createForm.tiers
      };

      const res = await fetch(`${API_BASE}/api/admin/payout-methods`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', 'New payout method created successfully!');
        setIsCreating(false);
        setCreateForm({
          id: '',
          name: '',
          description: '',
          icon_url: '',
          min_coins: 1000,
          conversion_rate: 0.01,
          processing_time: 'Instant',
          is_active: true,
          fields: [{ label: 'UPI ID', placeholder: 'e.g. paytm@upi', type: 'text' }],
          tiers: []
        });
        fetchMethods();
      } else {
        showNotice('error', data.message);
      }
    } catch (err) {
      showNotice('error', 'Failed to create payout method');
    }
    setCreating(false);
  };

  // Multiple Inputs Editor Helpers
  const addField = (isEdit) => {
    const newField = { label: 'New Field', placeholder: 'Enter details', type: 'text' };
    if (isEdit) {
      setEditForm({ ...editForm, fields: [...editForm.fields, newField] });
    } else {
      setCreateForm({ ...createForm, fields: [...createForm.fields, newField] });
    }
  };

  const removeField = (isEdit, index) => {
    if (isEdit) {
      const updated = [...editForm.fields];
      updated.splice(index, 1);
      setEditForm({ ...editForm, fields: updated });
    } else {
      const updated = [...createForm.fields];
      updated.splice(index, 1);
      setCreateForm({ ...createForm, fields: updated });
    }
  };

  const updateFieldProperty = (isEdit, index, prop, val) => {
    if (isEdit) {
      const updated = [...editForm.fields];
      updated[index][prop] = val;
      setEditForm({ ...editForm, fields: updated });
    } else {
      const updated = [...createForm.fields];
      updated[index][prop] = val;
      setCreateForm({ ...createForm, fields: updated });
    }
  };

  return (
    <div>
      {/* Top Banner and Navigation Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} style={{ color: 'var(--primary)' }} /> Payout Methods Suite
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Manage active payment gateways, user detail field configurations, and fixed cash redemption tiers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }} onClick={fetchMethods}>
            <RefreshCw size={14} /> Refresh
          </button>
          {!isCreating && (
            <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem' }} onClick={() => setIsCreating(true)}>
              <Plus size={14} /> Add Payout Method
            </button>
          )}
        </div>
      </div>

      {/* Creation Mode Drawer */}
      {isCreating && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', border: '1px solid rgba(168,85,247,0.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--primary-hover)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Register New Payout Method
            </h4>
            <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setIsCreating(false)}><X size={14} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Left Block - Credentials */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">ID/Slug (Unique Key)</label>
                  <input className="glass-input" placeholder="e.g. upi, paytm" value={createForm.id} onChange={e => setCreateForm({ ...createForm, id: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Display Name</label>
                  <input className="glass-input" placeholder="e.g. UPI Transfer" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description</label>
                <textarea className="glass-input" rows={2} placeholder="Explain processing terms or minimum thresholds..." value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Min Coins</label>
                  <input type="number" className="glass-input" value={createForm.min_coins} onChange={e => setCreateForm({ ...createForm, min_coins: parseInt(e.target.value || 0) })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Conversion Rate</label>
                  <input type="number" step="0.001" className="glass-input" value={createForm.conversion_rate} onChange={e => setCreateForm({ ...createForm, conversion_rate: parseFloat(e.target.value || 0) })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Processing Time</label>
                  <input className="glass-input" placeholder="e.g. Instant" value={createForm.processing_time} onChange={e => setCreateForm({ ...createForm, processing_time: e.target.value })} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Image size={13} /> Logo / Icon Asset URL</label>
                <input className="glass-input" placeholder="e.g. https://img.icons8.com/color/48/paytm.png" value={createForm.icon_url} onChange={e => setCreateForm({ ...createForm, icon_url: e.target.value })} />
                {createForm.icon_url && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <img src={createForm.icon_url} style={{ width: '28px', height: '28px', objectFit: 'contain' }} alt="Preview" onError={(e) => { e.target.style.display = 'none'; }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Branding preview active</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Block - Fields & Tiers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Dynamic Inputs */}
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>Required User Details</label>
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem', gap: '4px' }} onClick={() => addField(false)}>
                    <Plus size={11} /> Add Field
                  </button>
                </div>
                {createForm.fields.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0 0 10px' }}>No input fields. Users can withdraw without entering details.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '150px', overflowY: 'auto' }}>
                    {createForm.fields.map((f, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '8px' }}>
                        <input className="glass-input" style={{ padding: '6px 10px', fontSize: '0.8rem', flex: 1.5 }} placeholder="Label (e.g. UPI ID)" value={f.label} onChange={e => updateFieldProperty(false, idx, 'label', e.target.value)} />
                        <input className="glass-input" style={{ padding: '6px 10px', fontSize: '0.8rem', flex: 1.5 }} placeholder="Placeholder" value={f.placeholder} onChange={e => updateFieldProperty(false, idx, 'placeholder', e.target.value)} />
                        <select className="glass-input" style={{ padding: '6px 10px', fontSize: '0.8rem', flex: 1, height: '32px' }} value={f.type} onChange={e => updateFieldProperty(false, idx, 'type', e.target.value)}>
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="number">Number</option>
                        </select>
                        <button type="button" className="btn btn-secondary" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => removeField(false, idx)}><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>💡 Fields are dynamically rendered on Android Jetpack Compose client.</p>
              </div>

              {/* Tiers */}
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '6px' }}>Fixed Exchange Tiers</label>
                {createForm.tiers.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0 0 10px' }}>No fixed tiers configured. Uses conversion rate calculation.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px', maxHeight: '80px', overflowY: 'auto' }}>
                    {createForm.tiers.map((t, idx) => (
                      <span key={idx} className="badge badge-info" style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', background: 'rgba(59,130,246,0.08)' }}>
                        🪙 {t.coin_cost} = ₹{t.monetary_value}
                        <X size={10} style={{ cursor: 'pointer' }} onClick={() => {
                          const updated = [...createForm.tiers];
                          updated.splice(idx, 1);
                          setCreateForm({ ...createForm, tiers: updated });
                        }} />
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                  <input type="number" id="new_create_coins" className="glass-input" style={{ padding: '6px 10px', fontSize: '0.8rem' }} placeholder="Coins (e.g. 1000)" />
                  <input type="number" id="new_create_val" className="glass-input" style={{ padding: '6px 10px', fontSize: '0.8rem' }} placeholder="Value (₹10)" />
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => {
                    const cEl = document.getElementById('new_create_coins');
                    const vEl = document.getElementById('new_create_val');
                    const coin_cost = parseInt(cEl?.value || 0);
                    const monetary_value = parseFloat(vEl?.value || 0);
                    if (coin_cost > 0 && monetary_value > 0) {
                      setCreateForm({ ...createForm, tiers: [...createForm.tiers, { coin_cost, monetary_value, currency_symbol: '₹' }] });
                      if (cEl) cEl.value = '';
                      if (vEl) vEl.value = '';
                    } else {
                      showNotice('error', 'Please enter valid coins cost and INR monetary value.');
                    }
                  }}>Add</button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', marginRight: 'auto', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={createForm.is_active} onChange={e => setCreateForm({ ...createForm, is_active: e.target.checked })} />
              Enable this payout gateway immediately
            </label>
            <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.82rem' }} onClick={() => setIsCreating(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem' }} onClick={handleCreate} disabled={creating}>
              {creating ? 'Saving Gateway...' : 'Save & Publish Payout'}
            </button>
          </div>
        </div>
      )}

      {/* Methods Display and Edit Panel */}
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
              <div key={m.id} className="glass-panel" style={{ padding: '24px', border: isEditing ? '1px solid rgba(168,85,247,0.35)' : undefined }}>
                {isEditing ? (
                  /* Edit Mode */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--primary-hover)' }}>Editing: {m.id}</h4>
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
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Min Coins</label>
                        <input type="number" className="glass-input" value={editForm.min_coins} onChange={e => setEditForm({ ...editForm, min_coins: parseFloat(e.target.value || 0) })} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Rate (1 Coin)</label>
                        <input type="number" step="0.001" className="glass-input" value={editForm.conversion_rate} onChange={e => setEditForm({ ...editForm, conversion_rate: parseFloat(e.target.value || 0) })} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Processing</label>
                        <input className="glass-input" value={editForm.processing_time} onChange={e => setEditForm({ ...editForm, processing_time: e.target.value })} />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Logo / Icon URL</label>
                      <input className="glass-input" value={editForm.icon_url} onChange={e => setEditForm({ ...editForm, icon_url: e.target.value })} />
                    </div>

                    {/* Custom Multiple Inputs Editor */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label className="form-label" style={{ fontWeight: 600, margin: 0, fontSize: '0.8rem' }}>Required Inputs</label>
                        <button type="button" className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem', gap: '2px' }} onClick={() => addField(true)}>
                          <Plus size={10} /> Add
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                        {editForm.fields.map((f, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input className="glass-input" style={{ padding: '4px 8px', fontSize: '0.75rem', flex: 1.2 }} placeholder="Label" value={f.label} onChange={e => updateFieldProperty(true, idx, 'label', e.target.value)} />
                            <input className="glass-input" style={{ padding: '4px 8px', fontSize: '0.75rem', flex: 1.2 }} placeholder="Placeholder" value={f.placeholder} onChange={e => updateFieldProperty(true, idx, 'placeholder', e.target.value)} />
                            <select className="glass-input" style={{ padding: '4px 8px', fontSize: '0.75rem', flex: 0.8, height: '28px' }} value={f.type} onChange={e => updateFieldProperty(true, idx, 'type', e.target.value)}>
                              <option value="text">Text</option>
                              <option value="email">Email</option>
                              <option value="number">Number</option>
                            </select>
                            <button type="button" className="btn btn-secondary" style={{ padding: '4px', color: 'var(--danger)' }} onClick={() => removeField(true, idx)}><Trash2 size={12} /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Fixed Payout Tiers Sub-Form */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                      <label className="form-label" style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.8rem' }}>Redeem Tiers</label>
                      {editForm.tiers.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0 0 10px' }}>No fixed tiers configured.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                          {editForm.tiers.map((t, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '6px' }}>
                              <span style={{ fontSize: '0.78rem', flex: 1 }}>🪙 {t.coin_cost} Coins = ₹{t.monetary_value}</span>
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
                        <input type="number" id={`new_tier_coins_${m.id}`} className="glass-input" style={{ padding: '4px 8px', fontSize: '0.75rem' }} placeholder="Coins" />
                        <input type="number" id={`new_tier_val_${m.id}`} className="glass-input" style={{ padding: '4px 8px', fontSize: '0.75rem' }} placeholder="Value" />
                        <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem' }} onClick={() => {
                          const coinEl = document.getElementById(`new_tier_coins_${m.id}`);
                          const valEl = document.getElementById(`new_tier_val_${m.id}`);
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
                          width: '46px', height: '46px', borderRadius: '12px',
                          background: m.is_active ? 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(99,102,241,0.1))' : 'rgba(255,255,255,0.04)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid rgba(255,255,255,0.08)',
                          overflow: 'hidden'
                        }}>
                          {m.icon_url ? (
                            <img src={m.icon_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
                          ) : (
                            <CreditCard size={20} style={{ color: m.is_active ? 'var(--primary-hover)' : 'var(--text-muted)' }} />
                          )}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>{m.name}</h4>
                          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{m.description || 'No description'}</p>
                        </div>
                      </div>
                      {m.is_active ? (
                        <span className="badge badge-approved" style={{ fontSize: '0.68rem' }}>ACTIVE</span>
                      ) : (
                        <span className="badge badge-rejected" style={{ fontSize: '0.68rem' }}>DISABLED</span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Minimum Coins</p>
                        <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--warning)', margin: 0 }}>{m.min_coins ?? '—'}</p>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Conversion Rate</p>
                        <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent)', margin: 0 }}>{m.conversion_rate ?? '—'}×</p>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Processing Time</p>
                        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={11} style={{ color: 'var(--text-muted)' }} /> {m.processing_time || 'Instant'}</p>
                      </div>
                    </div>

                    {/* Display Custom Inputs */}
                    <div style={{ marginBottom: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '6px', margin: '0 0 6px' }}>Required User Inputs</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {parseFields(m.input_label, m.input_placeholder, m.input_type).map((f, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.78rem' }}>
                            <span style={{ fontWeight: 600, color: '#fff' }}>{f.label}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>({f.type})</span>
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.72rem' }}>{f.placeholder}</span>
                          </div>
                        ))}
                        {(!m.input_label && !m.input_type) && (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0, fontStyle: 'italic' }}>No input fields required</p>
                        )}
                      </div>
                    </div>

                    {/* Display Payout Tiers */}
                    <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.01)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '6px', margin: '0 0 6px' }}>Configured redeem Tiers</p>
                      {(!m.tiers || m.tiers.length === 0) ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: 0, fontStyle: 'italic' }}>No fixed tiers (Uses dynamic rate)</p>
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
