import React, { useState, useEffect } from 'react';
import { Settings, Save, Plus, Edit3, X, RefreshCw } from 'lucide-react';

export default function AdminConfigs({ getHeaders, showNotice, API_BASE }) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [savingKey, setSavingKey] = useState(null);
  // New config form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/configs`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setConfigs(data.configs || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchConfigs(); }, []);

  const startEditing = (cfg) => {
    setEditingKey(cfg.key);
    setEditingValue(cfg.value);
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditingValue('');
  };

  const saveConfig = async (key) => {
    setSavingKey(key);
    try {
      const res = await fetch(`${API_BASE}/api/admin/configs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ key, value: editingValue })
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', `Config "${key}" updated.`);
        setEditingKey(null);
        fetchConfigs();
      } else {
        showNotice('error', data.message);
      }
    } catch (err) {
      showNotice('error', 'Failed to update config');
    }
    setSavingKey(null);
  };

  const saveNewConfig = async (e) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/configs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ key: newKey, value: newValue, description: newDescription })
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', `Config "${newKey}" saved.`);
        setShowNewForm(false);
        setNewKey(''); setNewValue(''); setNewDescription('');
        fetchConfigs();
      } else {
        showNotice('error', data.message);
      }
    } catch (err) {
      showNotice('error', 'Failed to save config');
    }
  };

  const getValuePreview = (value) => {
    if (!value) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>empty</span>;
    if (value.length > 60) return <span title={value}>{value.substring(0, 60)}...</span>;
    return value;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} style={{ color: 'var(--primary)' }} /> App Configurations
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Edit live key-value configurations used by the mobile app.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }} onClick={fetchConfigs}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem' }} onClick={() => setShowNewForm(!showNewForm)}>
            <Plus size={14} /> New Config
          </button>
        </div>
      </div>

      {/* New Config Form */}
      {showNewForm && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', border: '1px solid rgba(168,85,247,0.2)', background: 'rgba(168,85,247,0.03)' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '0.95rem' }}>Add New Configuration Key</h4>
          <form onSubmit={saveNewConfig} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Key</label>
              <input className="glass-input" placeholder="e.g. watch_video_max" value={newKey} onChange={e => setNewKey(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Value</label>
              <input className="glass-input" placeholder="e.g. 10" value={newValue} onChange={e => setNewValue(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Description</label>
              <input className="glass-input" placeholder="Short description" value={newDescription} onChange={e => setNewDescription(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 16px' }}><Save size={14} /></button>
          </form>
        </div>
      )}

      {/* Config Table */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Loading configurations...</p>
      ) : (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div className="table-container">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Description</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {configs.map(cfg => (
                  <tr key={cfg.key}>
                    <td>
                      <code style={{ background: 'rgba(168,85,247,0.1)', padding: '3px 8px', borderRadius: '5px', fontSize: '0.82rem', color: 'var(--primary-hover)' }}>
                        {cfg.key}
                      </code>
                    </td>
                    <td>
                      {editingKey === cfg.key ? (
                        <input
                          className="glass-input"
                          style={{ padding: '7px 12px', fontSize: '0.85rem' }}
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <span style={{ fontSize: '0.88rem', fontFamily: 'monospace' }}>{getValuePreview(cfg.value)}</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{cfg.description || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {cfg.updated_at ? new Date(cfg.updated_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      {editingKey === cfg.key ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={() => saveConfig(cfg.key)} disabled={savingKey === cfg.key}>
                            <Save size={12} /> {savingKey === cfg.key ? 'Saving...' : 'Save'}
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={cancelEditing}><X size={12} /></button>
                        </div>
                      ) : (
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={() => startEditing(cfg)}>
                          <Edit3 size={12} /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {configs.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>No configs found. Add one above!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
