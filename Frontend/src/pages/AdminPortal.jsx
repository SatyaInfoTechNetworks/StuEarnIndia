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
  AlertTriangle,
  RefreshCw,
  Ban,
  ShieldCheck,
  Calendar,
  Grid,
  Settings,
  CreditCard,
  Gift,
  Percent,
  MessageSquare
} from 'lucide-react';
import { API_BASE } from '../config';

// Import Admin Subcomponents
import AdminTickets from '../components/admin/AdminTickets';
import AdminNotifications from '../components/admin/AdminNotifications';
import AdminBanners from '../components/admin/AdminBanners';
import AdminConfigs from '../components/admin/AdminConfigs';
import AdminPayouts from '../components/admin/AdminPayouts';
import AdminReferrals from '../components/admin/AdminReferrals';
import AdminLifafas from '../components/admin/AdminLifafas';
import AdminReports from '../components/admin/AdminReports';

export default function AdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Navigation
  const [activeTab, setActiveTab] = useState('overview');

  // Admin Data states
  const [stats, setStats] = useState({
    total_users: 0,
    banned_users: 0,
    new_users_today: 0,
    active_offers: 0,
    pending_withdrawals: 0,
    pending_withdrawals_value: 0,
    settled_payouts_value: 0,
    total_coins_issued: 0,
    total_completions: 0,
    open_tickets: 0,
    pending_erasures: 0,
    pending_proofs: 0
  });

  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit, setUsersLimit] = useState(15);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPages, setUsersPages] = useState(1);
  const [usersStatus, setUsersStatus] = useState('ALL'); // ALL, ACTIVE, BANNED
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTransactions, setUserTransactions] = useState([]);
  const [adjustBalanceModal, setAdjustBalanceModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState('CREDIT');
  const [adjustDesc, setAdjustDesc] = useState('');
  
  const [editUserModal, setEditUserModal] = useState(false);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    phone_number: '',
    location: '',
    referral_code: '',
    balance: ''
  });

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
    actual_price: 0,
    is_active: true,
    type: 'online',
    reward_type: 'Multi Reward',
    estimated_time: '5 mins',
    difficulty: 'Medium',
    is_hot: false,
    extra_label: '',
    input_type: '',
    input_instruction: [],
    tiers: [],
    daily_completion_cap: 0,
    country_targeting: 'IN'
  });

  // Withdrawals states
  const [withdrawalsList, setWithdrawalsList] = useState([]);
  const [withdrawalStatus, setWithdrawalStatus] = useState('PENDING'); // PENDING, APPROVED, REJECTED, ALL
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectModal, setRejectModal] = useState(false);

  // Erasures states
  const [erasuresList, setErasuresList] = useState([]);

  // Offline task manual proof verification states
  const [proofsList, setProofsList] = useState([]);
  const [rejectProofClickId, setRejectProofClickId] = useState(null);
  const [rejectProofReason, setRejectProofReason] = useState('');
  const [rejectProofModal, setRejectProofModal] = useState(false);

  // FCM states
  const [fcmTargetUserId, setFcmTargetUserId] = useState('');
  const [fcmTitle, setFcmTitle] = useState('');
  const [fcmBody, setFcmBody] = useState('');
  const [fcmStatus, setFcmStatus] = useState(null);

  // Global Loader/Notice
  const [actionNotice, setActionNotice] = useState(null);

  // Debounce user search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(userSearch);
      setUsersPage(1); // Reset page on search
    }, 400);
    return () => clearTimeout(timer);
  }, [userSearch]);

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

  // Helper check for 401
  const checkResponseStatus = (res) => {
    if (res.status === 401) {
      handleLogout();
      showNotice('error', 'Session expired. Please log in again.');
      return false;
    }
    return true;
  };

  const fetchDashboardData = async (tokenOverride) => {
    const headers = tokenOverride 
      ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenOverride}` }
      : getHeaders();
      
    try {
      // 1. Stats
      const statsRes = await fetch(`${API_BASE}/api/admin/stats`, { headers });
      if (!checkResponseStatus(statsRes)) return;
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.stats);

      // 2. Offers (Admin list includes completion counts)
      const offersRes = await fetch(`${API_BASE}/api/admin/offers`, { headers });
      if (!checkResponseStatus(offersRes)) return;
      const offersData = await offersRes.json();
      if (offersData.success) setOffersList(offersData.offers || []);

      // 3. Erasures
      const erasureRes = await fetch(`${API_BASE}/api/admin/erasures`, { headers });
      if (!checkResponseStatus(erasureRes)) return;
      const erasureData = await erasureRes.json();
      if (erasureData.success) setErasuresList(erasureData.requests || []);

    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const headers = getHeaders();
      const statusParam = usersStatus !== 'ALL' ? `&status=${usersStatus.toLowerCase()}` : '';
      const res = await fetch(`${API_BASE}/api/admin/users?search=${debouncedSearch}&page=${usersPage}&limit=${usersLimit}${statusParam}`, { headers });
      if (!checkResponseStatus(res)) return;
      const data = await res.json();
      if (data.success) {
        setUsersList(data.users || []);
        if (data.pagination) {
          setUsersTotal(data.pagination.total);
          setUsersPages(data.pagination.pages);
        }
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  // Fetch users when query, page or status changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [debouncedSearch, usersPage, usersStatus, isAuthenticated]);

  const fetchWithdrawals = async () => {
    try {
      const statusParam = withdrawalStatus !== 'ALL' ? `?status=${withdrawalStatus}` : '';
      const res = await fetch(`${API_BASE}/api/admin/withdrawals${statusParam}`, { headers: getHeaders() });
      if (!checkResponseStatus(res)) return;
      const data = await res.json();
      if (data.success) setWithdrawalsList(data.withdrawals || []);
    } catch (err) {
      console.error("Error fetching withdrawals:", err);
    }
  };

  // Fetch withdrawals when status tab changes
  useEffect(() => {
    if (isAuthenticated && activeTab === 'withdrawals') {
      fetchWithdrawals();
    }
  }, [withdrawalStatus, activeTab, isAuthenticated]);

  const fetchProofs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/proofs`, { headers: getHeaders() });
      if (!checkResponseStatus(res)) return;
      const data = await res.json();
      if (data.success) setProofsList(data.proofs || []);
    } catch (err) {
      console.error("Error fetching proofs:", err);
    }
  };

  // Fetch proofs when tab is proofs
  useEffect(() => {
    if (isAuthenticated && activeTab === 'proofs') {
      fetchProofs();
    }
  }, [activeTab, isAuthenticated]);

  const viewUserLedger = async (user) => {
    setSelectedUser(user);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${user.id}/transactions`, { headers: getHeaders() });
      if (!checkResponseStatus(res)) return;
      const data = await res.json();
      if (data.success) {
        setUserTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBanUser = async (userId) => {
    const reason = window.prompt("Enter reason for banning this user:");
    if (reason === null) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reason })
      });
      if (!checkResponseStatus(res)) return;
      const data = await res.json();
      if (data.success) {
        showNotice('success', 'User banned successfully');
        fetchUsers();
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser({ ...selectedUser, is_banned: 1, ban_reason: reason });
        }
      } else {
        showNotice('error', data.message);
      }
    } catch (err) {
      showNotice('error', 'Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId) => {
    if (!window.confirm("Are you sure you want to unban this user?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/unban`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!checkResponseStatus(res)) return;
      const data = await res.json();
      if (data.success) {
        showNotice('success', 'User unbanned successfully');
        fetchUsers();
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser({ ...selectedUser, is_banned: 0, ban_reason: null });
        }
      } else {
        showNotice('error', data.message);
      }
    } catch (err) {
      showNotice('error', 'Failed to unban user');
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

  const triggerEditUser = (user) => {
    setEditUserForm({
      name: user.name || '',
      email: user.email || '',
      phone_number: user.phone_number || '',
      location: user.location || '',
      referral_code: user.referral_code || '',
      balance: user.balance || 0,
      android_id: user.android_id || '',
      fcm_token: user.fcm_token || '',
      daily_spins_count: user.daily_spins_count || 0,
      current_streak: user.current_streak || 0,
      referred_by: user.referred_by || '',
      user_id: user.user_id || '',
      uid: user.uid || ''
    });
    setEditUserModal(true);
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(editUserForm)
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', 'User information updated successfully');
        setEditUserModal(false);
        const updatedUser = { ...selectedUser, ...editUserForm, balance: parseFloat(editUserForm.balance) };
        setSelectedUser(updatedUser);
        fetchUsers();
        fetchDashboardData();
      } else {
        showNotice('error', data.message);
      }
    } catch (err) {
      showNotice('error', 'Failed to update user info');
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
      actual_price: 0,
      is_active: true,
      type: 'online',
      reward_type: 'Multi Reward',
      estimated_time: '5 mins',
      difficulty: 'Medium',
      is_hot: false,
      extra_label: '',
      input_type: '',
      input_instruction: [],
      tiers: [],
      daily_completion_cap: 0,
      country_targeting: 'IN'
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

          // Safe parsing of input_instruction
          let loadedInstructions = [];
          if (fetched.input_instruction) {
            try {
              loadedInstructions = typeof fetched.input_instruction === 'string' 
                ? JSON.parse(fetched.input_instruction) 
                : fetched.input_instruction;
              if (!Array.isArray(loadedInstructions)) loadedInstructions = [];
            } catch (e) {
              console.error("Error parsing input_instruction:", e);
            }
          }

          setOfferForm({
            title: fetched.title || '',
            external_id: fetched.external_id || '',
            description: fetched.description || '',
            category: fetched.category || 'General',
            icon_url: fetched.icon_url || '',
            tracking_url: fetched.tracking_url || '',
            total_reward: parseFloat(fetched.total_reward || 0),
            actual_price: parseFloat(fetched.actual_price || 0),
            is_active: fetched.is_active ? true : false,
            type: fetched.type || 'online',
            reward_type: fetched.reward_type || 'Multi Reward',
            estimated_time: fetched.estimated_time || '5 mins',
            difficulty: fetched.difficulty || 'Medium',
            is_hot: fetched.is_hot ? true : false,
            extra_label: fetched.extra_label || '',
            input_type: fetched.input_type || '',
            input_instruction: loadedInstructions,
            tiers: loadedTiers,
            daily_completion_cap: fetched.daily_completion_cap || 0,
            country_targeting: fetched.country_targeting || 'IN'
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

  const handleApproveProof = async (clickId) => {
    if (!window.confirm("Are you sure you want to approve this proof submission and credit the user's balance?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/proofs/${clickId}/approve`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', data.message || 'Proof submission approved and coins credited');
        fetchProofs();
        fetchDashboardData();
      } else {
        showNotice('error', data.message);
      }
    } catch (err) {
      showNotice('error', 'Failed to approve proof submission');
    }
  };

  const triggerRejectProof = (clickId) => {
    setRejectProofClickId(clickId);
    setRejectProofReason('');
    setRejectProofModal(true);
  };

  const handleRejectProofSubmit = async (e) => {
    e.preventDefault();
    if (!rejectProofClickId) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/proofs/${rejectProofClickId}/reject`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reason: rejectProofReason })
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', 'Proof submission rejected and user notified');
        setRejectProofModal(false);
        setRejectProofClickId(null);
        setRejectProofReason('');
        fetchProofs();
        fetchDashboardData();
      } else {
        showNotice('error', data.message);
      }
    } catch (err) {
      showNotice('error', 'Failed to reject proof submission');
    }
  };

  const addInstructionField = () => {
    setOfferForm({
      ...offerForm,
      input_instruction: [
        ...(offerForm.input_instruction || []),
        { label: '', type: 'text' }
      ]
    });
  };

  const removeInstructionField = (idx) => {
    const updated = offerForm.input_instruction.filter((_, i) => i !== idx);
    setOfferForm({ ...offerForm, input_instruction: updated });
  };

  const updateInstructionField = (idx, key, val) => {
    const updated = [...offerForm.input_instruction];
    updated[idx] = { ...updated[idx], [key]: val };
    setOfferForm({ ...offerForm, input_instruction: updated });
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

        <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
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
            <UsersIcon size={18} style={{ color: activeTab === 'users' ? 'var(--primary)' : 'var(--text-muted)' }} /> User Ledgers
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
            onClick={() => setActiveTab('proofs')}
            className="btn" 
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'proofs' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeTab === 'proofs' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'proofs' ? '1px solid var(--border-glass)' : 'none',
              padding: '12px 16px',
              textAlign: 'left'
            }}
          >
            <ShieldCheck size={18} style={{ color: activeTab === 'proofs' ? 'var(--primary)' : 'var(--text-muted)' }} /> Offline Submissions
            {stats.pending_proofs > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--primary)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '99px', fontWeight: 700 }}>
                {stats.pending_proofs}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('payouts')}
            className="btn" 
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'payouts' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeTab === 'payouts' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'payouts' ? '1px solid var(--border-glass)' : 'none',
              padding: '12px 16px',
              textAlign: 'left'
            }}
          >
            <CreditCard size={18} style={{ color: activeTab === 'payouts' ? 'var(--primary)' : 'var(--text-muted)' }} /> Payout Methods
          </button>

          <button 
            onClick={() => setActiveTab('configs')}
            className="btn" 
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'configs' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeTab === 'configs' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'configs' ? '1px solid var(--border-glass)' : 'none',
              padding: '12px 16px',
              textAlign: 'left'
            }}
          >
            <Settings size={18} style={{ color: activeTab === 'configs' ? 'var(--primary)' : 'var(--text-muted)' }} /> App Configs
          </button>

          <button 
            onClick={() => setActiveTab('banners')}
            className="btn" 
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'banners' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeTab === 'banners' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'banners' ? '1px solid var(--border-glass)' : 'none',
              padding: '12px 16px',
              textAlign: 'left'
            }}
          >
            <Grid size={18} style={{ color: activeTab === 'banners' ? 'var(--primary)' : 'var(--text-muted)' }} /> Banners Manager
          </button>

          <button 
            onClick={() => setActiveTab('referrals')}
            className="btn" 
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'referrals' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeTab === 'referrals' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'referrals' ? '1px solid var(--border-glass)' : 'none',
              padding: '12px 16px',
              textAlign: 'left'
            }}
          >
            <Percent size={18} style={{ color: activeTab === 'referrals' ? 'var(--primary)' : 'var(--text-muted)' }} /> Referral Settings
          </button>

          <button 
            onClick={() => setActiveTab('lifafas')}
            className="btn" 
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'lifafas' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeTab === 'lifafas' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'lifafas' ? '1px solid var(--border-glass)' : 'none',
              padding: '12px 16px',
              textAlign: 'left'
            }}
          >
            <Gift size={18} style={{ color: activeTab === 'lifafas' ? 'var(--primary)' : 'var(--text-muted)' }} /> Surprise Envelopes
          </button>

          <button 
            onClick={() => setActiveTab('tickets')}
            className="btn" 
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'tickets' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeTab === 'tickets' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'tickets' ? '1px solid var(--border-glass)' : 'none',
              padding: '12px 16px',
              textAlign: 'left'
            }}
          >
            <MessageSquare size={18} style={{ color: activeTab === 'tickets' ? 'var(--primary)' : 'var(--text-muted)' }} /> Support Tickets
            {stats.open_tickets > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--primary)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '99px', fontWeight: 700 }}>
                {stats.open_tickets}
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

          <button 
            onClick={() => setActiveTab('reports')}
            className="btn" 
            style={{ 
              justifyContent: 'flex-start',
              background: activeTab === 'reports' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeTab === 'reports' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'reports' ? '1px solid var(--border-glass)' : 'none',
              padding: '12px 16px',
              textAlign: 'left'
            }}
          >
            <TrendingUp size={18} style={{ color: activeTab === 'reports' ? 'var(--primary)' : 'var(--text-muted)' }} /> Financial Reports
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
                        <th>User ID</th>
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
                            <code style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{u.user_id || 'N/A'}</code>
                          </td>
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

                {/* Pagination Controls */}
                {usersPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Page <strong>{usersPage}</strong> of <strong>{usersPages}</strong> ({usersTotal} users)
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        disabled={usersPage === 1}
                        onClick={() => setUsersPage(prev => Math.max(prev - 1, 1))}
                      >
                        Previous
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        disabled={usersPage === usersPages}
                        onClick={() => setUsersPage(prev => Math.min(prev + 1, usersPages))}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected User Ledger Inspect Panel */}
              {selectedUser && (
                <div className="glass-panel" style={{ padding: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem' }}>{selectedUser.name || 'Anonymous'}</h3>
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => setAdjustBalanceModal(true)}>
                        Adjust
                      </button>
                    </div>
                  </div>

                  {/* Full User Profile Information Section */}
                  <div style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid rgba(255,255,255,0.04)', 
                    borderRadius: '12px', 
                    padding: '16px', 
                    marginBottom: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>User Profile Details</span>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => triggerEditUser(selectedUser)}>
                        <Edit3 size={12} /> Edit Details
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8rem', marginTop: '4px' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>User ID (Public)</span>
                        <strong style={{ color: '#fff' }}>{selectedUser.user_id || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Referral Code</span>
                        <code style={{ color: 'var(--accent)' }}>{selectedUser.referral_code || 'None'}</code>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Phone Number</span>
                        <strong style={{ color: '#fff' }}>{selectedUser.phone_number || 'Not Provided'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Location</span>
                        <strong style={{ color: '#fff' }}>{selectedUser.location || 'Not Provided'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Android ID</span>
                        <strong style={{ color: '#fff', wordBreak: 'break-all' }}>{selectedUser.android_id || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Current Streak</span>
                        <strong style={{ color: '#fff' }}>{selectedUser.current_streak || 0} days</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Daily Spins Left</span>
                        <strong style={{ color: '#fff' }}>{selectedUser.daily_spins_count || 0}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Referred By (User ID)</span>
                        <span style={{ color: 'var(--text-muted)' }}>{selectedUser.referred_by || 'Organic / Direct'}</span>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>FCM Push Token</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', wordBreak: 'break-all' }}>{selectedUser.fcm_token || 'None'}</span>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Firebase UID</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', wordBreak: 'break-all' }}>{selectedUser.uid}</span>
                      </div>
                      <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Account Status</span>
                          <strong style={{ color: selectedUser.is_banned ? 'var(--danger)' : 'var(--success)' }}>
                            {selectedUser.is_banned ? '🚫 BANNED' : '✅ Active'}
                          </strong>
                          {selectedUser.is_banned && selectedUser.ban_reason && (
                            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Reason: {selectedUser.ban_reason}</span>
                          )}
                        </div>
                        {selectedUser.is_banned ? (
                          <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }} onClick={() => handleUnbanUser(selectedUser.id)}>
                            Unban
                          </button>
                        ) : (
                          <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleBanUser(selectedUser.id)}>
                            <Ban size={12} /> Ban User
                          </button>
                        )}
                      </div>
                    </div>
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
                <div className="table-container">
                  <table className="glass-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Icon</th>
                        <th>Offer Title & Details</th>
                        <th style={{ textAlign: 'center' }}>Category</th>
                        <th style={{ textAlign: 'center' }}>Reward</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offersList.map(o => (
                        <tr key={o.id} style={{ background: editingOffer?.id === o.id ? 'rgba(255, 255, 255, 0.03)' : 'transparent' }}>
                          <td>
                            {o.icon_url ? (
                              <img src={o.icon_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Layers size={18} style={{ color: 'var(--text-muted)' }} />
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{o.title}</strong>
                              {o.is_hot === 1 && (
                                <span className="badge badge-completed" style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(168,85,247,0.1)', color: 'var(--primary-hover)', border: '1px solid rgba(168,85,247,0.2)' }}>
                                  Hot
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={o.description}>
                              {o.description || 'No instructions provided.'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge badge-pending" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                              {o.category || 'General'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <strong style={{ color: 'var(--success)', fontSize: '0.95rem' }}>
                              ₹{parseFloat(o.total_reward || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </strong>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${o.is_active ? 'badge-completed' : 'badge-failed'}`} style={{
                              background: o.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: o.is_active ? 'var(--success)' : 'var(--danger)',
                              border: o.is_active ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                            }}>
                              {o.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '4px' }} onClick={() => handleEditOfferClick(o)}>
                                <Edit3 size={12} /> Edit
                              </button>
                              <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '4px' }} onClick={() => handleDeleteOffer(o.id)}>
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {offersList.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>No active earning tasks.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
                      <select 
                        className="glass-input" 
                        value={offerForm.category}
                        onChange={(e) => setOfferForm({ ...offerForm, category: e.target.value })}
                        style={{ background: '#0a0b10', color: '#fff' }}
                      >
                        <option value="Top Offers">Top Offers</option>
                        <option value="New Apps">New Apps</option>
                        <option value="Install & Earn">Install & Earn</option>
                        <option value="Surveys">Surveys</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">User Reward (Coins)</label>
                      <input 
                        type="number" 
                        className="glass-input" 
                        value={offerForm.total_reward}
                        onChange={(e) => setOfferForm({ ...offerForm, total_reward: parseFloat(e.target.value || 0) })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Company Price ( Advertiser Payout ₹ )</label>
                      <input 
                        type="number" 
                        className="glass-input" 
                        step="0.01"
                        placeholder="e.g. 15.50"
                        value={offerForm.actual_price}
                        onChange={(e) => setOfferForm({ ...offerForm, actual_price: parseFloat(e.target.value || 0) })}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Integration Mode</label>
                      <select 
                        className="glass-input" 
                        value={offerForm.type}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOfferForm({ 
                            ...offerForm, 
                            type: val, 
                            input_type: val === 'offline' ? 'multi' : offerForm.input_type 
                          });
                        }}
                        style={{ background: '#0a0b10', color: '#fff' }}
                      >
                        <option value="online">Online Campaign (Auto Webhook)</option>
                        <option value="offline">Offline Campaign (Manual Proof Review)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Extra Badge Label (e.g. "HOT", "EASY SIGNUP")</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="Leave blank for none" 
                      value={offerForm.extra_label}
                      onChange={(e) => setOfferForm({ ...offerForm, extra_label: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Daily Completion Cap</label>
                      <input 
                        type="number" 
                        className="glass-input" 
                        placeholder="0 for unlimited" 
                        value={offerForm.daily_completion_cap}
                        onChange={(e) => setOfferForm({ ...offerForm, daily_completion_cap: parseInt(e.target.value || 0) })}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Country Targeting (ISO Codes)</label>
                      <input 
                        type="text" 
                        className="glass-input" 
                        placeholder="e.g. IN,US or ALL" 
                        value={offerForm.country_targeting}
                        onChange={(e) => setOfferForm({ ...offerForm, country_targeting: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Offline Submissions Fields Schema Builder */}
                  {offerForm.type === 'offline' && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Proof Request Fields ({offerForm.input_instruction?.length || 0})</h4>
                        <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={addInstructionField}>
                          <Plus size={14} /> Add Field
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {offerForm.input_instruction?.map((field, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '10px' }}>
                            <div style={{ flex: 1 }}>
                              <input 
                                type="text" 
                                className="glass-input" 
                                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                placeholder="Field Label (e.g., Enter registered email)"
                                value={field.label}
                                onChange={(e) => updateInstructionField(idx, 'label', e.target.value)}
                                required
                              />
                            </div>
                            <div style={{ width: '120px' }}>
                              <select
                                className="glass-input"
                                style={{ padding: '8px 12px', fontSize: '0.85rem', background: '#0a0b10', color: '#fff' }}
                                value={field.type}
                                onChange={(e) => updateInstructionField(idx, 'type', e.target.value)}
                              >
                                <option value="text">Text Input</option>
                                <option value="file">Image Upload</option>
                              </select>
                            </div>
                            <button type="button" className="btn btn-danger" style={{ padding: '8px' }} onClick={() => removeInstructionField(idx)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        {(!offerForm.input_instruction || offerForm.input_instruction.length === 0) && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                            No custom proof fields added. By default, users will see a text input.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

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

          {/* TAB 14: OFFLINE SUBMISSIONS AUDIT PANEL */}
          {activeTab === 'proofs' && (
            <div className="glass-panel" style={{ padding: '30px' }}>
              <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Offline Submissions Audit Panel</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Review evidence files and credentials submitted by candidates to approve rewards.
                  </p>
                </div>
                <button className="btn btn-secondary" style={{ padding: '8px 16px', gap: '6px' }} onClick={fetchProofs}>
                  <RefreshCw size={16} /> Refresh Queue
                </button>
              </div>

              <div className="table-container">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>User Candidate</th>
                      <th>Target Campaign</th>
                      <th>Submitted Evidence</th>
                      <th>Campaign Payout</th>
                      <th>Submission Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proofsList.map(p => {
                      // Safe parsing of user_input JSON
                      let inputs = [];
                      if (p.user_input) {
                        try {
                          inputs = typeof p.user_input === 'string' ? JSON.parse(p.user_input) : p.user_input;
                        } catch (err) {
                          console.error("Error parsing user_input:", err);
                        }
                      }

                      return (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.user_name || 'Anonymous'}</strong>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: <code>{p.user_public_id}</code></p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.user_email}</p>
                          </td>
                          <td>
                            <strong>{p.offer_title}</strong>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Category: <span className="badge badge-pending" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '2px 6px' }}>{p.input_type || 'Manual'}</span></p>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '300px' }}>
                              {Array.isArray(inputs) ? (
                                inputs.map((inp, idx) => {
                                  if (inp.type === 'file') {
                                    // Make sure URL is complete
                                    const fileUrl = inp.value && inp.value.startsWith('http') 
                                      ? inp.value 
                                      : `${API_BASE}${inp.value}`;
                                    return (
                                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{inp.label}:</span>
                                        <a 
                                          href={fileUrl} 
                                          target="_blank" 
                                          rel="noreferrer" 
                                          className="btn btn-secondary" 
                                          style={{ 
                                            padding: '6px 12px', 
                                            fontSize: '0.75rem', 
                                            display: 'inline-flex', 
                                            alignItems: 'center', 
                                            gap: '6px',
                                            alignSelf: 'flex-start',
                                            textDecoration: 'none',
                                            background: 'rgba(59, 130, 246, 0.1)',
                                            color: '#60a5fa',
                                            border: '1px solid rgba(59, 130, 246, 0.2)'
                                          }}
                                        >
                                          <Eye size={12} /> View Screenshot / Image
                                        </a>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div key={idx} style={{ fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{inp.label}: </span>
                                        <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', wordBreak: 'break-all' }}>{inp.value || 'N/A'}</code>
                                      </div>
                                    );
                                  }
                                })
                              ) : (
                                <div style={{ fontSize: '0.85rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>Input: </span>
                                  <code>{p.user_input || 'N/A'}</code>
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>User Reward</span>
                              <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent)', margin: 0 }}>{parseFloat(p.offer_reward || 0).toFixed(2)} coins</p>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>{new Date(p.last_updated).toLocaleString()}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'var(--success)', border: 'none' }} 
                                onClick={() => handleApproveProof(p.click_id)}
                              >
                                <Check size={12} /> Pass
                              </button>
                              <button 
                                className="btn btn-danger" 
                                style={{ padding: '6px 12px', fontSize: '0.75rem' }} 
                                onClick={() => triggerRejectProof(p.click_id)}
                              >
                                <X size={12} /> Fail
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {proofsList.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                          No pending offline proofs to audit.
                        </td>
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
            <div>
              <AdminNotifications getHeaders={getHeaders} showNotice={showNotice} API_BASE={API_BASE} />
            </div>
          )}

          {/* TAB 7: APP CONFIGS */}
          {activeTab === 'configs' && (
            <div>
              <AdminConfigs getHeaders={getHeaders} showNotice={showNotice} API_BASE={API_BASE} />
            </div>
          )}

          {/* TAB 8: BANNERS MANAGER */}
          {activeTab === 'banners' && (
            <div>
              <AdminBanners getHeaders={getHeaders} showNotice={showNotice} API_BASE={API_BASE} />
            </div>
          )}

          {/* TAB 9: PAYOUT METHODS */}
          {activeTab === 'payouts' && (
            <div>
              <AdminPayouts getHeaders={getHeaders} showNotice={showNotice} API_BASE={API_BASE} />
            </div>
          )}

          {/* TAB 10: REFERRAL SETTINGS */}
          {activeTab === 'referrals' && (
            <div>
              <AdminReferrals getHeaders={getHeaders} showNotice={showNotice} API_BASE={API_BASE} />
            </div>
          )}

          {/* TAB 11: SURPRISE ENVELOPES */}
          {activeTab === 'lifafas' && (
            <div>
              <AdminLifafas getHeaders={getHeaders} showNotice={showNotice} API_BASE={API_BASE} />
            </div>
          )}

          {/* TAB 12: SUPPORT TICKETS */}
          {activeTab === 'tickets' && (
            <div>
              <AdminTickets getHeaders={getHeaders} showNotice={showNotice} API_BASE={API_BASE} />
            </div>
          )}

          {/* TAB 13: FINANCIAL REPORTS */}
          {activeTab === 'reports' && (
            <div>
              <AdminReports getHeaders={getHeaders} showNotice={showNotice} API_BASE={API_BASE} />
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

      {/* Edit User Info Modal */}
      {editUserModal && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Edit Profile Details</span>
              <button className="btn btn-secondary" style={{ padding: '4px' }} onClick={() => setEditUserModal(false)}><X size={16} /></button>
            </h3>
            
            <form onSubmit={handleEditUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="glass-input" 
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Phone Number</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  value={editUserForm.phone_number}
                  onChange={(e) => setEditUserForm({ ...editUserForm, phone_number: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Location / Country</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  value={editUserForm.location}
                  onChange={(e) => setEditUserForm({ ...editUserForm, location: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Referral Code</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  value={editUserForm.referral_code}
                  onChange={(e) => setEditUserForm({ ...editUserForm, referral_code: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Wallet Balance (Coins)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="glass-input" 
                  value={editUserForm.balance}
                  onChange={(e) => setEditUserForm({ ...editUserForm, balance: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Public User ID</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  value={editUserForm.user_id}
                  onChange={(e) => setEditUserForm({ ...editUserForm, user_id: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Firebase UID</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  value={editUserForm.uid}
                  onChange={(e) => setEditUserForm({ ...editUserForm, uid: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Android Device ID</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  value={editUserForm.android_id}
                  onChange={(e) => setEditUserForm({ ...editUserForm, android_id: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Daily Spins Count</label>
                <input 
                  type="number" 
                  className="glass-input" 
                  value={editUserForm.daily_spins_count}
                  onChange={(e) => setEditUserForm({ ...editUserForm, daily_spins_count: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Current Streak Days</label>
                <input 
                  type="number" 
                  className="glass-input" 
                  value={editUserForm.current_streak}
                  onChange={(e) => setEditUserForm({ ...editUserForm, current_streak: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Referred By (User UUID)</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="Direct / Organic"
                  value={editUserForm.referred_by}
                  onChange={(e) => setEditUserForm({ ...editUserForm, referred_by: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">FCM Push Notification Token</label>
                <textarea 
                  rows={2}
                  className="glass-input" 
                  value={editUserForm.fcm_token}
                  onChange={(e) => setEditUserForm({ ...editUserForm, fcm_token: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>Save Changes</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setEditUserModal(false)}>Cancel</button>
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

      {/* Reject Proof Modal */}
      {rejectProofModal && rejectProofClickId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '30px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Reject Proof Submission</h3>
            
            <form onSubmit={handleRejectProofSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Reason for Rejection (Visible to User)</label>
                <textarea 
                  className="glass-input" 
                  rows={4}
                  placeholder="e.g. Screenshot does not match target instructions, or credentials could not be verified."
                  value={rejectProofReason}
                  onChange={(e) => setRejectProofReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-danger" style={{ flex: 1, padding: '10px' }}>Confirm Rejection</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => { setRejectProofModal(false); setRejectProofClickId(null); setRejectProofReason(''); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
