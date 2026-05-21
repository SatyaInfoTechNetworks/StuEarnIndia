import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  BarChart3, 
  Users as UsersIcon, 
  Layers, 
  TrendingUp,
  Inbox, 
  Bell, 
  LogOut, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Edit3, 
  Search, 
  Eye, 
  PlusCircle, 
  MinusCircle,
  Coins, 
  AlertTriangle 
} from 'lucide-react';
import { API_BASE } from '../config';

export default function AdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Navigation
  const [activeTab, setActiveTab] = useState('overview');

  // Admin Data states
  const [stats, setStats] = useState({
    total_users: 0,
    active_offers: 0,
    pending_withdrawals: 0,
    pending_withdrawals_value: 0,
    pending_erasures: 0,
    settled_payouts_value: 0
  });

  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTransactions, setUserTransactions] = useState([]);
  const [adjustBalanceModal, setAdjustBalanceModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState('CREDIT');
  const [adjustDesc, setAdjustDesc] = useState('');

  // Offer manager states
  const [offersList, setOffersList] = useState([]);
  const [editingOffer, setEditingOffer] = useState(null);
  const [offerForm, setOfferForm] = useState({
    title: '',
    external_id: '',
    description: '',
    category: 'General',
    icon_url: '',
    tracking_url: '',
    total_reward: 0,
    is_active: true,
    type: 'online',
    reward_type: 'Multi Reward',
    estimated_time: '5 mins',
    difficulty: 'Medium',
    is_hot: false,
    tiers: []
  });

  // Withdrawals states
  const [withdrawalsList, setWithdrawalsList] = useState([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectModal, setRejectModal] = useState(false);

  // Erasures states
  const [erasuresList, setErasuresList] = useState([]);

  // FCM states
  const [fcmTargetUserId, setFcmTargetUserId] = useState('');
  const [fcmTitle, setFcmTitle] = useState('');
  const [fcmBody, setFcmBody] = useState('');
  const [fcmStatus, setFcmStatus] = useState(null);

  // Global Loader/Notice
  const [actionNotice, setActionNotice] = useState(null);

  // Check auth on load
  useEffect(() => {
    const token = localStorage.getItem('stuearn_admin_token');
    if (token) {
      setIsAuthenticated(true);
      fetchDashboardData(token);
    }
  }, []);

  const getHeaders = () => {
    const token = localStorage.getItem('stuearn_admin_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('stuearn_admin_token', data.token);
        setIsAuthenticated(true);
        fetchDashboardData(data.token);
      } else {
        setLoginError(data.message || 'Invalid admin credentials');
      }
    } catch (err) {
      setLoginError('Connection failure. Check if backend is running.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('stuearn_admin_token');
    setIsAuthenticated(false);
  };

  const showNotice = (type, message) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 5000);
  };

  const fetchDashboardData = async (tokenOverride) => {
    const headers = tokenOverride 
      ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenOverride}` }
      : getHeaders();
      
    try {
      // 1. Stats
      const statsRes = await fetch(`${API_BASE}/api/admin/stats`, { headers });
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.stats);

      // 2. Users
      fetchUsers(headers);

      // 3. Offers
      const offersRes = await fetch(`${API_BASE}/api/offers`, { headers });
      const offersData = await offersRes.json();
      if (offersData.success) setOffersList(offersData.offers || []);

      // 4. Withdrawals
      const withdrawRes = await fetch(`${API_BASE}/api/admin/withdrawals`, { headers });
      const withdrawData = await withdrawRes.json();
      if (withdrawData.success) setWithdrawalsList(withdrawData.withdrawals || []);

      // 5. Erasures
      const erasureRes = await fetch(`${API_BASE}/api/admin/erasures`, { headers });
      const erasureData = await erasureRes.json();
      if (erasureData.success) setErasuresList(erasureData.requests || []);

    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  };

  const fetchUsers = async (customHeaders) => {
    try {
      const headers = customHeaders || getHeaders();
      const res = await fetch(`${API_BASE}/api/admin/users?search=${userSearch}`, { headers });
      const data = await res.json();
      if (data.success) setUsersList(data.users || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [userSearch, isAuthenticated]);

  const viewUserLedger = async (user) => {
    setSelectedUser(user);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${user.id}/transactions`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setUserTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    if (!selectedUser || !adjustAmount) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${selectedUser.id}/balance`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount: adjustAmount, type: adjustType, description: adjustDesc })
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', 'User balance modified successfully');
        setAdjustBalanceModal(false);
        setAdjustAmount('');
        setAdjustDesc('');
        
        // Refresh selected user and ledger
        const [updatedUserRes] = await Promise.all([
          fetch(`${API_BASE}/api/admin/users?search=${selectedUser.email}`, { headers: getHeaders() }),
          viewUserLedger(selectedUser)
        ]);
        const updatedUserData = await updatedUserRes.json();
        if (updatedUserData.success && updatedUserData.users.length > 0) {
          setSelectedUser(updatedUserData.users[0]);
        }
        
        // Refresh stats
        fetchDashboardData();
      } else {
        showNotice('error', data.message);
      }
    } catch (err) {
      showNotice('error', 'Failed to adjust balance');
    }
  };

  // Offers Manager methods
  const resetOfferForm = () => {
    setEditingOffer(null);
    setOfferForm({
      title: '',
      external_id: '',
      description: '',
      category: 'General',
      icon_url: '',
      tracking_url: '',
      total_reward: 0,
      is_active: true,
      type: 'online',
      reward_type: 'Multi Reward',
      estimated_time: '5 mins',
      difficulty: 'Medium',
      is_hot: false,
      tiers: []
    });
  };

  const addTierToForm = () => {
    const nextSeq = offerForm.tiers.length + 1;
    setOfferForm({
      ...offerForm,
      tiers: [
        ...offerForm.tiers,
        { title: `Tier ${nextSeq}`, backend_title: `tier_${nextSeq}`, reward: 10, steps: ['Click link', 'Submit proof'], sequence: nextSeq }
      ]
    });
  };

  const removeTierFromForm = (index) => {
    const updated = offerForm.tiers.filter((_, i) => i !== index);
    // Renumber sequences
    const renumbered = updated.map((t, idx) => ({ ...t, sequence: idx + 1 }));
    setOfferForm({ ...offerForm, tiers: renumbered });
  };

  const updateTierField = (index, field, value) => {
    const updated = [...offerForm.tiers];
    updated[index][field] = value;
    setOfferForm({ ...offerForm, tiers: updated });
  };

  const updateTierStep = (tierIndex, stepIndex, value) => {
    const updated = [...offerForm.tiers];
    updated[tierIndex].steps[stepIndex] = value;
    setOfferForm({ ...offerForm, tiers: updated });
  };

  const addStepToTier = (tierIndex) => {
    const updated = [...offerForm.tiers];
    updated[tierIndex].steps.push('');
    setOfferForm({ ...offerForm, tiers: updated });
  };

  const removeStepFromTier = (tierIndex, stepIndex) => {
    const updated = [...offerForm.tiers];
    updated[tierIndex].steps = updated[tierIndex].steps.filter((_, idx) => idx !== stepIndex);
    setOfferForm({ ...offerForm, tiers: updated });
  };

  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    if (!offerForm.title) return;

    try {
      const url = editingOffer ? `${API_BASE}/api/admin/offers/${editingOffer.id}` : `${API_BASE}/api/admin/offers`;
      const method = editingOffer ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(offerForm)
      });
      const data = await res.json();
      
      if (data.success) {
        showNotice('success', editingOffer ? 'Offer updated successfully' : 'Offer created successfully');
        resetOfferForm();
        fetchDashboardData();
      } else {
        showNotice('error', data.message);
      }
    } catch (err) {
      showNotice('error', 'Failed to save offer');
    }
  };

  const handleEditOfferClick = (offer) => {
    setEditingOffer(offer);
    
    // Fetch offer details to populate tiers
    fetch(`${API_BASE}/api/offers/${offer.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const fetched = data.offer;
          // Maps tiers
          const loadedTiers = fetched.tiers ? fetched.tiers.map(t => ({
            title: t.app_tier_title || t.title,
            backend_title: t.tier_title || t.title,
            reward: parseFloat(t.reward || 0),
            steps: typeof t.steps === 'string' ? JSON.parse(t.steps) : (t.steps || []),
            sequence: parseInt(t.sequence || 1)
          })) : [];

          setOfferForm({
            title: fetched.title || '',
            external_id: fetched.external_id || '',
            description: fetched.description || '',
            category: fetched.category || 'General',
            icon_url: fetched.icon_url || '',
            tracking_url: fetched.tracking_url || '',
            total_reward: parseFloat(fetched.total_reward || 0),
            is_active: fetched.is_active ? true : false,
            type: fetched.type || 'online',
            reward_type: fetched.reward_type || 'Multi Reward',
            estimated_time: fetched.estimated_time || '5 mins',
            difficulty: fetched.difficulty || 'Medium',
            is_hot: fetched.is_hot ? true : false,
            tiers: loadedTiers
          });
        }
      });
  };

  const handleDeleteOffer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/offers/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', 'Offer deleted successfully');
        fetchDashboardData();
      }
    } catch (err) {
      showNotice('error', 'Failed to delete offer');
    }
  };

  // Withdrawals approvals
  const handleApproveWithdrawal = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/withdrawals/${id}/approve`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', 'Withdrawal payout marked settled');
        fetchDashboardData();
      }
    } catch (err) {
      showNotice('error', 'Failed to approve withdrawal');
    }
  };

  const triggerRejectWithdrawal = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setRejectReason('');
    setRejectModal(true);
  };

  const handleRejectWithdrawalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWithdrawal) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/admin/withdrawals/${selectedWithdrawal.id}/reject`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reason: rejectReason })
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', 'Withdrawal rejected and balance refunded');
        setRejectModal(false);
        setSelectedWithdrawal(null);
        fetchDashboardData();
      }
    } catch (err) {
      showNotice('error', 'Failed to reject withdrawal');
    }
  };

  // Account erasure methods
  const handleApproveErasure = async (id) => {
    if (!window.confirm("CRITICAL PURGE: This will hard-delete the user's entire account, transactions, and files permanently. Proceed?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/erasures/${id}/approve`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', 'User permanently deleted from system');
        fetchDashboardData();
      }
    } catch (err) {
      showNotice('error', 'Failed to process purge');
    }
  };

  const handleRejectErasure = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/erasures/${id}/reject`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', 'Deletion request dismissed');
        fetchDashboardData();
      }
    } catch (err) {
      showNotice('error', 'Failed to dismiss request');
    }
  };

  // FCM Sender
  const handlePushSubmit = async (e) => {
    e.preventDefault();
    if (!fcmTitle || !fcmBody) return;
    
    setFcmStatus('sending');
    try {
      const res = await fetch(`${API_BASE}/api/admin/push`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title: fcmTitle,
          body: fcmBody,
          user_id: fcmTargetUserId || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setFcmStatus('success');
        setFcmTitle('');
        setFcmBody('');
        setFcmTargetUserId('');
        setTimeout(() => setFcmStatus(null), 3000);
      } else {
        setFcmStatus('error');
      }
    } catch (err) {
      setFcmStatus('error');
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '40px 30px', textAlign: 'center' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            width: '60px', 
            height: '60px', 
            borderRadius: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 24px',
            color: '#fff'
          }}>
            <Lock size={28} />
          </div>
          
          <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>Admin Control Hub</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '30px' }}>Enter password to access administrative panels</p>

          {loginError && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.25)', 
              borderRadius: '10px', 
              padding: '12px', 
              color: 'var(--danger)', 
              fontSize: '0.85rem',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Master Admin Password</label>
              <input 
                type="password" 
                className="glass-input" 
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '10px' }}>
              Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Sidebar navigation */}
      <aside style={{ 
        width: '260px', 
        borderRight: '1px solid var(--border-glass)', 
        background: 'rgba(10, 11, 16, 0.8)', 
        display: 'flex', 
        flexDirection: 'column', 
        flexShrink: 0 
      }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1rem',
            color: '#fff'
          }}>S</div>
          <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>
            StuEarn<span style={{ color: 'var(--primary)' }}>Admin</span>
          </span>
        </div>

        <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('overview')}
            className="btn" 
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'overview' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeTab === 'overview' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'overview' ? '1px solid var(--border-glass)' : 'none',
              padding: '12px 16px',
              textAlign: 'left'
            }}
          >
            <BarChart3 size={18} style={{ color: activeTab === 'overview' ? 'var(--primary)' : 'var(--text-muted)' }} /> Overview Stats
          </button>

          <button 
            onClick={() => setActiveTab('users')}
            className="btn" 
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'users' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeTab === 'users' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'users' ? '1px solid var(--border-glass)' : 'none',
              padding: '12px 16px',
              textAlign: 'left'
            }}
          >
            <UsersIcon size={18} style={{ color: activeTab === 'users' ? 'var(--primary)' : 'var(--text-muted)' }} /> User ledgers
          </button>

          <button 
            onClick={() => setActiveTab('offers')}
            className="btn" 
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'offers' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeTab === 'offers' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'offers' ? '1px solid var(--border-glass)' : 'none',
              padding: '12px 16px',
              textAlign: 'left'
            }}
          >
            <Layers size={18} style={{ color: activeTab === 'offers' ? 'var(--primary)' : 'var(--text-muted)' }} /> Offer Builder
          </button>

          <button 
            onClick={() => setActiveTab('withdrawals')}
            className="btn" 
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'withdrawals' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeTab === 'withdrawals' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'withdrawals' ? '1px solid var(--border-glass)' : 'none',
              padding: '12px 16px',
              textAlign: 'left'
            }}
          >
            <Inbox size={18} style={{ color: activeTab === 'withdrawals' ? 'var(--primary)' : 'var(--text-muted)' }} /> Payout Approvals
            {stats.pending_withdrawals > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--warning)', color: '#000', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '99px', fontWeight: 700 }}>
                {stats.pending_withdrawals}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('erasures')}
            className="btn" 
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'erasures' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeTab === 'erasures' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'erasures' ? '1px solid var(--border-glass)' : 'none',
              padding: '12px 16px',
              textAlign: 'left'
            }}
          >
            <Trash2 size={18} style={{ color: activeTab === 'erasures' ? 'var(--danger)' : 'var(--text-muted)' }} /> Data Erasures
            {stats.pending_erasures > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '99px', fontWeight: 700 }}>
                {stats.pending_erasures}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('push')}
            className="btn" 
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'push' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeTab === 'push' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'push' ? '1px solid var(--border-glass)' : 'none',
              padding: '12px 16px',
              textAlign: 'left'
            }}
          >
            <Bell size={18} style={{ color: activeTab === 'push' ? 'var(--primary)' : 'var(--text-muted)' }} /> Broadcast Center
          </button>
        </nav>

        <div style={{ padding: '20px 12px', borderTop: '1px solid var(--border-glass)' }}>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main panel container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        {/* Hub Header */}
        <header style={{ 
          height: '70px', 
          borderBottom: '1px solid var(--border-glass)', 
          background: 'rgba(10, 11, 16, 0.4)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0 40px',
          flexShrink: 0
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0, textTransform: 'capitalize' }}>
              {activeTab} Management
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Active Database: <strong style={{ color: 'var(--accent)' }}>AppDatabase</strong>
            </span>
          </div>
        </header>

        {/* Dynamic Action Alerts */}
        {actionNotice && (
          <div style={{
            position: 'absolute',
            top: '80px',
            right: '40px',
            zIndex: 1000,
            background: actionNotice.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '12px',
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.3s'
          }}>
            {actionNotice.message}
          </div>
        )}

        {/* Content body */}
        <main style={{ flex: 1, padding: '40px' }}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Registered Users</p>
                  <h3 style={{ fontSize: '2.2rem', marginTop: '8px', color: 'var(--primary-hover)' }}>{stats.total_users}</h3>
                  <div style={{ position: 'absolute', bottom: '20px', right: '20px', color: 'rgba(255,255,255,0.05)' }}>
                    <UsersIcon size={48} />
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Active Earning Offers</p>
                  <h3 style={{ fontSize: '2.2rem', marginTop: '8px', color: 'var(--accent)' }}>{stats.active_offers}</h3>
                  <div style={{ position: 'absolute', bottom: '20px', right: '20px', color: 'rgba(255,255,255,0.05)' }}>
                    <Layers size={48} />
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pending Withdrawals</p>
                  <h3 style={{ fontSize: '2.2rem', marginTop: '8px', color: 'var(--warning)' }}>{stats.pending_withdrawals}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Value: {stats.pending_withdrawals_value.toFixed(2)} coins</p>
                </div>

                <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Settled Payouts</p>
                  <h3 style={{ fontSize: '2.2rem', marginTop: '8px', color: 'var(--success)' }}>₹{stats.settled_payouts_value.toFixed(2)}</h3>
                  <div style={{ position: 'absolute', bottom: '20px', right: '20px', color: 'rgba(255,255,255,0.05)' }}>
                    <TrendingUp size={48} />
                  </div>
                </div>
              </div>

              {/* Informative Banner */}
              <div className="glass-panel" style={{ 
                padding: '30px', 
                background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(168,85,247,0.05) 100%)',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Active Database Host Credentials</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
                  You are actively connected to the fresh <strong>AppDatabase</strong> on external node <code>72.61.254.236:3320</code>. This is fully isolated from the legacy PHP schema, preserving all production data. All updates you execute here will be made directly to the fresh client environment.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: USERS DIRECTORY */}
          {activeTab === 'users' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedUser ? '1fr 380px' : '1fr', gap: '30px', alignItems: 'start' }}>
              {/* Users List Panel */}
              <div className="glass-panel" style={{ padding: '30px' }}>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="Search users by name, email, or referral code..." 
                      style={{ paddingLeft: '48px' }}
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-container">
                  <table className="glass-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Referral Code</th>
                        <th>Balance</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(u => (
                        <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => viewUserLedger(u)}>
                          <td>
                            <strong style={{ color: selectedUser?.id === u.id ? 'var(--primary-hover)' : '#fff' }}>{u.name || 'Anonymous'}</strong>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                          <td><code>{u.referral_code || 'None'}</code></td>
                          <td><strong style={{ color: 'var(--accent)' }}>{parseFloat(u.balance || 0).toFixed(2)}</strong></td>
                          <td>
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={(e) => { e.stopPropagation(); viewUserLedger(u); }}>
                              <Eye size={12} /> Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                      {usersList.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>No users matching criteria.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Selected User Ledger Inspect Panel */}
              {selectedUser && (
                <div className="glass-panel" style={{ padding: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem' }}>{selectedUser.name}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{selectedUser.email}</p>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setSelectedUser(null)}>
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Balance</span>
                      <h4 style={{ fontSize: '1.6rem', color: 'var(--accent)' }}>{parseFloat(selectedUser.balance || 0).toFixed(2)} coins</h4>
                    </div>
                    <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => setAdjustBalanceModal(true)}>
                      Adjust
                    </button>
                  </div>

                  <h5 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Transaction History</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                    {userTransactions.map(t => (
                      <div key={t.id} style={{ 
                        background: 'rgba(255,255,255,0.01)', 
                        border: '1px solid rgba(255,255,255,0.04)', 
                        borderRadius: '10px', 
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.description || t.source}</p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleDateString()}</span>
                        </div>
                        <strong style={{ fontSize: '0.85rem', color: t.type === 'CREDIT' ? 'var(--success)' : 'var(--danger)' }}>
                          {t.type === 'CREDIT' ? '+' : '-'}{parseFloat(t.amount).toFixed(2)}
                        </strong>
                      </div>
                    ))}
                    {userTransactions.length === 0 && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No transaction history.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OFFER BUILDER */}
          {activeTab === 'offers' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px', alignItems: 'start' }}>
              {/* Existing Offers */}
              <div className="glass-panel" style={{ padding: '30px' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Active Earning Tasks</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                  {offersList.map(o => (
                    <div key={o.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: editingOffer?.id === o.id ? '1px solid var(--primary-hover)' : '1px solid var(--border-glass)' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {o.icon_url ? (
                          <img src={o.icon_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}><Layers size={18} /></div>
                        )}
                        <div>
                          <h4 style={{ fontSize: '1rem', margin: 0 }}>{o.title}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} className="badge badge-pending">{o.category || 'General'}</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Reward Pool</span>
                          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>{parseFloat(o.total_reward || 0).toFixed(2)} coins</p>
                        </div>
                        {o.is_hot === 1 && <span className="badge badge-completed" style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--primary-hover)', border: '1px solid rgba(168,85,247,0.2)' }}>Hot</span>}
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                        <button className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: '0.8rem' }} onClick={() => handleEditOfferClick(o)}>
                          <Edit3 size={12} /> Edit
                        </button>
                        <button className="btn btn-danger" style={{ padding: '6px' }} onClick={() => handleDeleteOffer(o.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Offer Editor form panel */}
              <div className="glass-panel" style={{ padding: '30px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{editingOffer ? 'Modify Offer' : 'Create Offer'}</span>
                  {editingOffer && <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={resetOfferForm}>Cancel</button>}
                </h3>

                <form onSubmit={handleOfferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Offer Title</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="e.g. Sign up on Jupiter Bank" 
                      value={offerForm.title}
                      onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">External Identifier (Campaign ID)</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="e.g. jupiter_01" 
                      value={offerForm.external_id}
                      onChange={(e) => setOfferForm({ ...offerForm, external_id: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Description / Instructions</label>
                    <textarea 
                      className="glass-input" 
                      rows={3}
                      placeholder="Provide step details..." 
                      value={offerForm.description}
                      onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Category</label>
                      <input 
                        type="text" 
                        className="glass-input" 
                        value={offerForm.category}
                        onChange={(e) => setOfferForm({ ...offerForm, category: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Reward Amount</label>
                      <input 
                        type="number" 
                        className="glass-input" 
                        value={offerForm.total_reward}
                        onChange={(e) => setOfferForm({ ...offerForm, total_reward: parseFloat(e.target.value || 0) })}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Icon Image URL</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="https://..." 
                      value={offerForm.icon_url}
                      onChange={(e) => setOfferForm({ ...offerForm, icon_url: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Campaign Click / Tracking URL</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="https://..." 
                      value={offerForm.tracking_url}
                      onChange={(e) => setOfferForm({ ...offerForm, tracking_url: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input 
                        type="checkbox" 
                        checked={offerForm.is_active}
                        onChange={(e) => setOfferForm({ ...offerForm, is_active: e.target.checked })}
                      />
                      Active (Display in mobile App)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input 
                        type="checkbox" 
                        checked={offerForm.is_hot}
                        onChange={(e) => setOfferForm({ ...offerForm, is_hot: e.target.checked })}
                      />
                      Hot Campaign
                    </label>
                  </div>

                  {/* Tier Editor Section */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h4 style={{ fontSize: '0.95rem' }}>Task Milestone Tiers ({offerForm.tiers.length})</h4>
                      <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={addTierToForm}>
                        <Plus size={14} /> Add
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                      {offerForm.tiers.map((t, tierIdx) => (
                        <div key={tierIdx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-hover)' }}>Milestone {t.sequence}</span>
                            <button type="button" className="btn btn-danger" style={{ padding: '2px 4px' }} onClick={() => removeTierFromForm(tierIdx)}>
                              <Trash2 size={12} />
                            </button>
                          </div>

                          <div className="form-group" style={{ marginBottom: '10px' }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>App Display Title</label>
                            <input 
                              type="text" 
                              className="glass-input" 
                              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                              value={t.title}
                              onChange={(e) => updateTierField(tierIdx, 'title', e.target.value)}
                              required
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '10px', marginBottom: '10px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Backend Callback Title</label>
                              <input 
                                type="text" 
                                className="glass-input" 
                                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                value={t.backend_title}
                                onChange={(e) => updateTierField(tierIdx, 'backend_title', e.target.value)}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Coins</label>
                              <input 
                                type="number" 
                                className="glass-input" 
                                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                value={t.reward}
                                onChange={(e) => updateTierField(tierIdx, 'reward', parseFloat(e.target.value || 0))}
                              />
                            </div>
                          </div>

                          {/* Tier Step instructions */}
                          <div style={{ borderTop: '1px dotted rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Step Instructions</span>
                              <button type="button" className="btn btn-secondary" style={{ padding: '2px 4px', fontSize: '0.65rem' }} onClick={() => addStepToTier(tierIdx)}>
                                + Step
                              </button>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {t.steps.map((step, stepIdx) => (
                                <div key={stepIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <input 
                                    type="text" 
                                    className="glass-input" 
                                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                    value={step}
                                    onChange={(e) => updateTierStep(tierIdx, stepIdx, e.target.value)}
                                  />
                                  <button type="button" className="btn btn-danger" style={{ padding: '4px' }} onClick={() => removeStepFromTier(tierIdx, stepIdx)}>
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: '10px' }}>
                    {editingOffer ? 'Save Changes' : 'Publish Offer'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: WITHDRAWALS QUEUE */}
          {activeTab === 'withdrawals' && (
            <div className="glass-panel" style={{ padding: '30px' }}>
              <div className="table-container">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Method</th>
                      <th>Payout Details</th>
                      <th>Amount</th>
                      <th>Request Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalsList.map(w => (
                      <tr key={w.id}>
                        <td>
                          <strong>{w.user_name}</strong>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{w.user_email}</p>
                        </td>
                        <td><span className="badge badge-pending" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>{w.method}</span></td>
                        <td><code style={{ fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>{w.details}</code></td>
                        <td><strong style={{ color: 'var(--primary-hover)' }}>₹{parseFloat(w.amount).toFixed(2)}</strong></td>
                        <td style={{ fontSize: '0.85rem' }}>{new Date(w.created_at).toLocaleString()}</td>
                        <td>
                          <span className={`badge badge-${w.status.toLowerCase()}`}>{w.status}</span>
                        </td>
                        <td>
                          {w.status === 'PENDING' ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'var(--success)', border: 'none' }} onClick={() => handleApproveWithdrawal(w.id)}>
                                <Check size={12} /> Settle
                              </button>
                              <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => triggerRejectWithdrawal(w)}>
                                <X size={12} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {withdrawalsList.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>No payout requests matching parameters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: DATA ERASURES */}
          {activeTab === 'erasures' && (
            <div className="glass-panel" style={{ padding: '30px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px', padding: '16px' }}>
                <AlertTriangle size={24} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  <strong>COMPLIANCE BOARD:</strong> According to data protection rights, users have requested permanent deletion of their account databases. Approving a request will completely remove their records from the <code>users</code> table, wiping ledger history, transaction transactions, and metadata completely.
                </p>
              </div>

              <div className="table-container">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Requested Email</th>
                      <th>Feedback Reason</th>
                      <th>Request Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {erasuresList.map(e => (
                      <tr key={e.id}>
                        <td><strong>{e.email}</strong></td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{e.reason || 'No feedback shared.'}</td>
                        <td style={{ fontSize: '0.85rem' }}>{new Date(e.created_at).toLocaleString()}</td>
                        <td>
                          <span className={`badge badge-${e.status.toLowerCase()}`}>{e.status}</span>
                        </td>
                        <td>
                          {e.status === 'PENDING' ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleApproveErasure(e.id)}>
                                <Trash2 size={12} /> Purge Data
                              </button>
                              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleRejectErasure(e.id)}>
                                <X size={12} /> Dismiss
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Finished</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {erasuresList.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>No deletion requests in system database.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: BROADCAST CENTER */}
          {activeTab === 'push' && (
            <div className="glass-panel" style={{ padding: '30px', maxWidth: '600px', margin: '0 auto' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Broadcast Push Notification</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>Send custom notifications to mobile clients instantly using Firebase Cloud Messaging (FCM).</p>

              {fcmStatus && (
                <div style={{ 
                  background: fcmStatus === 'success' ? 'rgba(16, 185, 129, 0.1)' : fcmStatus === 'sending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: fcmStatus === 'success' ? '1px solid rgba(16, 185, 129, 0.25)' : fcmStatus === 'sending' ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '24px',
                  color: fcmStatus === 'success' ? 'var(--success)' : fcmStatus === 'sending' ? 'var(--warning)' : 'var(--danger)',
                  fontSize: '0.9rem'
                }}>
                  {fcmStatus === 'sending' && 'Broadcasting signals via FCM...'}
                  {fcmStatus === 'success' && 'Push notifications broadcast successfully.'}
                  {fcmStatus === 'error' && 'Failed to trigger notifications. Make sure service-account.json is loaded at backend.'}
                </div>
              )}

              <form onSubmit={handlePushSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Target Specific User UUID (Optional)</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="Leave blank to broadcast to ALL users globally"
                    value={fcmTargetUserId}
                    onChange={(e) => setFcmTargetUserId(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Notification Title</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="e.g. Earn 2x Coins on Jupiter Bank"
                    value={fcmTitle}
                    onChange={(e) => setFcmTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Message Body</label>
                  <textarea 
                    className="glass-input" 
                    rows={4}
                    placeholder="Enter short description alert message..."
                    value={fcmBody}
                    onChange={(e) => setFcmBody(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: '10px' }} disabled={fcmStatus === 'sending'}>
                  {fcmStatus === 'sending' ? 'Sending Signals...' : 'Broadcast Notification'}
                </button>
              </form>
            </div>
          )}

        </main>
      </div>

      {/* Adjust User Balance Modal */}
      {adjustBalanceModal && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '30px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Adjust Balance for {selectedUser.name}</h3>
            
            <form onSubmit={handleAdjustBalance} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ 
                    background: adjustType === 'CREDIT' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: adjustType === 'CREDIT' ? '1px solid var(--success)' : '1px solid var(--border-glass)',
                    color: adjustType === 'CREDIT' ? 'var(--success)' : 'var(--text-secondary)'
                  }}
                  onClick={() => setAdjustType('CREDIT')}
                >
                  <PlusCircle size={16} /> Credit (Add)
                </button>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ 
                    background: adjustType === 'DEBIT' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: adjustType === 'DEBIT' ? '1px solid var(--danger)' : '1px solid var(--border-glass)',
                    color: adjustType === 'DEBIT' ? 'var(--danger)' : 'var(--text-secondary)'
                  }}
                  onClick={() => setAdjustType('DEBIT')}
                >
                  <MinusCircle size={16} /> Debit (Deduct)
                </button>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Coin Amount</label>
                <input 
                  type="number" 
                  className="glass-input" 
                  placeholder="0.00" 
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Adjustment Reason / Source Description</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="e.g. Special community reward"
                  value={adjustDesc}
                  onChange={(e) => setAdjustDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>Execute</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setAdjustBalanceModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Withdrawal Modal */}
      {rejectModal && selectedWithdrawal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '30px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Reject Payout for {selectedWithdrawal.user_name}</h3>
            
            <form onSubmit={handleRejectWithdrawalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Reason for Rejection (Visible to User)</label>
                <textarea 
                  className="glass-input" 
                  rows={4}
                  placeholder="e.g. Invalid UPI identifier or proof verification failed."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-danger" style={{ flex: 1, padding: '10px' }}>Reject & Refund</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => { setRejectModal(false); setSelectedWithdrawal(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
