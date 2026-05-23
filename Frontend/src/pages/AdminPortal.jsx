import React, { useState, useEffect } from 'react';
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

  // Visit and Earn states
  const [visitTasksList, setVisitTasksList] = useState([]);
  const [editingVisitTask, setEditingVisitTask] = useState(null);
  const [visitTaskForm, setVisitTaskForm] = useState({
    title: '',
    coins: 0,
    visit_url: '',
    timer_seconds: 30,
    is_ad: false,
    is_active: true
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

  // Dynamic Theme Load and Cleanup
  useEffect(() => {
    // Add AdminLTE CSS
    const linkLte = document.createElement('link');
    linkLte.rel = 'stylesheet';
    linkLte.href = 'https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css';
    linkLte.id = 'adminlte-css';
    document.head.appendChild(linkLte);

    // Add FontAwesome Icons
    const linkFa = document.createElement('link');
    linkFa.rel = 'stylesheet';
    linkFa.href = 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.2/css/all.min.css';
    linkFa.id = 'font-awesome-css';
    document.head.appendChild(linkFa);

    // Add Source Sans Pro Font
    const linkFont = document.createElement('link');
    linkFont.rel = 'stylesheet';
    linkFont.href = 'https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,400i,700&display=fallback';
    linkFont.id = 'source-sans-font';
    document.head.appendChild(linkFont);

    // Set body classes for AdminLTE
    document.body.className = 'hold-transition sidebar-mini layout-fixed';
    document.body.style.backgroundColor = '#f4f6f9';
    document.body.style.color = '#212529';
    document.body.style.fontFamily = '"Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

    return () => {
      // Cleanup links on unmount
      document.getElementById('adminlte-css')?.remove();
      document.getElementById('font-awesome-css')?.remove();
      document.getElementById('source-sans-font')?.remove();
      
      // Restore body classes
      document.body.className = '';
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      document.body.style.fontFamily = '';
    };
  }, []);

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

  const fetchVisitTasks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/visit-earn`, { headers: getHeaders() });
      if (!checkResponseStatus(res)) return;
      const data = await res.json();
      if (data.success) setVisitTasksList(data.tasks || []);
    } catch (err) {
      console.error("Error fetching visit tasks:", err);
    }
  };

  // Fetch visit tasks when tab is visit-earn
  useEffect(() => {
    if (isAuthenticated && activeTab === 'visit-earn') {
      fetchVisitTasks();
    }
  }, [activeTab, isAuthenticated]);

  const resetVisitTaskForm = () => {
    setEditingVisitTask(null);
    setVisitTaskForm({
      title: '',
      coins: 0,
      visit_url: '',
      timer_seconds: 30,
      is_ad: false,
      is_active: true
    });
  };

  const handleVisitTaskSubmit = async (e) => {
    e.preventDefault();
    if (!visitTaskForm.title || !visitTaskForm.visit_url) return;
    try {
      const url = editingVisitTask 
        ? `${API_BASE}/api/admin/visit-earn/${editingVisitTask.id}` 
        : `${API_BASE}/api/admin/visit-earn`;
      const method = editingVisitTask ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(visitTaskForm)
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', editingVisitTask ? 'Visit task updated successfully' : 'Visit task created successfully');
        resetVisitTaskForm();
        fetchVisitTasks();
      } else {
        showNotice('error', data.message);
      }
    } catch (err) {
      showNotice('error', 'Failed to save visit task');
    }
  };

  const handleEditVisitTaskClick = (task) => {
    setEditingVisitTask(task);
    setVisitTaskForm({
      title: task.title || '',
      coins: task.coins || 0,
      visit_url: task.visit_url || '',
      timer_seconds: task.timer_seconds || 30,
      is_ad: task.is_ad ? true : false,
      is_active: task.is_active ? true : false
    });
  };

  const handleDeleteVisitTask = async (id) => {
    if (!window.confirm("Are you sure you want to delete this Visit & Earn task?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/visit-earn/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', 'Visit task deleted successfully');
        fetchVisitTasks();
      } else {
        showNotice('error', data.message);
      }
    } catch (err) {
      showNotice('error', 'Failed to delete visit task');
    }
  };

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

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("CRITICAL WARNING: This will permanently delete the user's account, balance, transactions, withdrawals, tickets, referrals, and progress. This action is irreversible. Are you sure you want to proceed?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!checkResponseStatus(res)) return;
      const data = await res.json();
      if (data.success) {
        showNotice('success', 'User permanently deleted');
        setSelectedUser(null);
        fetchUsers();
        fetchDashboardData();
      } else {
        showNotice('error', data.message);
      }
    } catch (err) {
      showNotice('error', 'Failed to delete user');
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
      <div className="login-page bg-light" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="login-box" style={{ width: '400px' }}>
          <div className="card card-outline card-primary shadow-lg rounded-lg border-0">
            <div className="card-header text-center bg-transparent border-0 pt-4">
              <h1 className="h1 font-weight-bold mb-0">StuEarn <b>Admin</b></h1>
              <span className="text-muted text-xs">Master Administration Console</span>
            </div>
            <div className="card-body">
              <p className="login-box-msg text-secondary">Authenticate admin session credentials</p>

              {loginError && (
                <div className="alert alert-danger p-2 text-sm text-left">
                  <i className="fas fa-ban mr-2"></i> {loginError}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="text-muted text-xs uppercase font-weight-bold mb-1">Master Password</label>
                  <div className="input-group">
                    <input 
                      type="password" 
                      className="form-control rounded-left" 
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                    <div className="input-group-append">
                      <div className="input-group-text"><span className="fas fa-lock text-muted"></span></div>
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-block rounded-pill py-2 font-weight-bold mt-4 shadow-sm">
                  Authenticate Master Session
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrapper">
      {/* Navbar Header */}
      <nav className="main-header navbar navbar-expand navbar-white navbar-light border-bottom-0 shadow-xs">
        <ul className="navbar-nav">
          <li className="nav-item">
            <a className="nav-link" data-widget="pushmenu" href="#" role="button"><i className="fas fa-bars"></i></a>
          </li>
          <li className="nav-item d-none d-sm-inline-block">
            <a href="#" onClick={() => setActiveTab('overview')} className="nav-link font-weight-bold text-dark">Dashboard Home</a>
          </li>
        </ul>
        <ul className="navbar-nav ml-auto">
          <li className="nav-item">
            <span className="nav-link text-secondary font-weight-bold text-sm">
              Active Database: <strong className="text-teal text-success"><i className="fas fa-database mr-1"></i>AppDatabase</strong>
            </span>
          </li>
        </ul>
      </nav>

      {/* Sidebar Navigation */}
      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <a href="#" onClick={() => setActiveTab('overview')} className="brand-link border-bottom-0 text-center py-3">
          <span className="brand-text font-weight-bold text-lg text-white">StuEarn Admin</span>
        </a>
        <div className="sidebar">
          <nav className="mt-3">
            <ul className="nav nav-pills nav-sidebar flex-column nav-flat nav-child-indent" data-widget="treeview" role="menu">
              
              <li className="nav-item">
                <a href="#" onClick={() => setActiveTab('overview')} className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-th-large mr-2"></i>
                  <p>Dashboard</p>
                </a>
              </li>
              
              <li className="nav-header font-weight-bold text-xs text-muted uppercase">Users & Growth</li>
              <li className="nav-item">
                <a href="#" onClick={() => setActiveTab('users')} className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-users mr-2"></i>
                  <p>User Database</p>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={() => setActiveTab('referrals')} className={`nav-link ${activeTab === 'referrals' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-share-alt mr-2"></i>
                  <p>Referral Config</p>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={() => setActiveTab('erasures')} className={`nav-link ${activeTab === 'erasures' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-user-times mr-2"></i>
                  <p>Deletion Requests</p>
                </a>
              </li>

              <li className="nav-header font-weight-bold text-xs text-muted uppercase">Promotion</li>
              <li className="nav-item">
                <a href="#" onClick={() => setActiveTab('banners')} className={`nav-link ${activeTab === 'banners' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-image mr-2"></i>
                  <p>App Banners</p>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={() => setActiveTab('push')} className={`nav-link ${activeTab === 'push' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-bell mr-2"></i>
                  <p>Push Notifications</p>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={() => setActiveTab('lifafas')} className={`nav-link ${activeTab === 'lifafas' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-envelope-open-text mr-2"></i>
                  <p>Surprise Envelopes</p>
                </a>
              </li>

              <li className="nav-header font-weight-bold text-xs text-muted uppercase">Inventory</li>
              <li className="nav-item">
                <a href="#" onClick={() => setActiveTab('offers')} className={`nav-link ${activeTab === 'offers' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-tasks mr-2"></i>
                  <p>Manage Offers</p>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={() => setActiveTab('visit-earn')} className={`nav-link ${activeTab === 'visit-earn' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-coins mr-2"></i>
                  <p>Visit & Earn</p>
                </a>
              </li>

              <li className="nav-header font-weight-bold text-xs text-muted uppercase">Financials</li>
              <li className="nav-item">
                <a href="#" onClick={() => setActiveTab('withdrawals')} className={`nav-link ${activeTab === 'withdrawals' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-money-bill-wave mr-2"></i>
                  <p>Withdrawal Queue</p>
                  {stats.pending_withdrawals > 0 && (
                    <span className="badge badge-warning float-right px-2">{stats.pending_withdrawals}</span>
                  )}
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={() => setActiveTab('payouts')} className={`nav-link ${activeTab === 'payouts' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-university mr-2"></i>
                  <p>Payout Methods</p>
                </a>
              </li>

              <li className="nav-header font-weight-bold text-xs text-muted uppercase">Audit & Compliance</li>
              <li className="nav-item">
                <a href="#" onClick={() => setActiveTab('reports')} className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-chart-line mr-2"></i>
                  <p>Business Stats</p>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={() => setActiveTab('proofs')} className={`nav-link ${activeTab === 'proofs' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-images mr-2"></i>
                  <p>Proof Gallery</p>
                  {stats.pending_proofs > 0 && (
                    <span className="badge badge-primary float-right px-2">{stats.pending_proofs}</span>
                  )}
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={() => setActiveTab('tickets')} className={`nav-link ${activeTab === 'tickets' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-comments mr-2"></i>
                  <p>Support Tickets</p>
                  {stats.open_tickets > 0 && (
                    <span className="badge badge-info float-right px-2">{stats.open_tickets}</span>
                  )}
                </a>
              </li>

              <li className="nav-header font-weight-bold text-xs text-muted uppercase">Infrastructure</li>
              <li className="nav-item">
                <a href="#" onClick={() => setActiveTab('configs')} className={`nav-link ${activeTab === 'configs' ? 'active' : ''}`}>
                  <i className="nav-icon fas fa-tools mr-2"></i>
                  <p>System Config</p>
                </a>
              </li>

              <li className="nav-header font-weight-bold text-xs text-muted uppercase">Session</li>
              <li className="nav-item">
                <a href="#" onClick={handleLogout} className="nav-link">
                  <i className="nav-icon fas fa-power-off text-danger mr-2"></i>
                  <p>Sign Out</p>
                </a>
              </li>

            </ul>
          </nav>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="content-wrapper bg-light">
        
        {/* Dynamic Action Alerts */}
        {actionNotice && (
          <div className={`alert alert-${actionNotice.type === 'success' ? 'success' : 'danger'} alert-dismissible shadow`} style={{ position: 'fixed', top: '80px', right: '40px', zIndex: 10000, minWidth: '320px', borderRadius: '12px' }}>
            <button type="button" className="close" onClick={() => setActionNotice(null)}>&times;</button>
            <h5><i className={`icon fas ${actionNotice.type === 'success' ? 'fa-check' : 'fa-ban'}`}></i> Alert</h5>
            {actionNotice.message}
          </div>
        )}

        {/* Content Header Title */}
        <div className="content-header pt-4">
          <div className="container-fluid">
            <div className="row mb-2 align-items-center">
              <div className="col-sm-6">
                <h1 className="m-0 font-weight-bold text-dark text-capitalize">{activeTab.replace('-', ' ')} Management</h1>
              </div>
              <div className="col-sm-6 text-right">
                <span className="badge badge-info px-3 py-2 font-weight-bold"><i className="fas fa-clock mr-1"></i> Live Administrator Console</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Main Body Content */}
        <section className="content">
          <div className="container-fluid">
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div>
                {/* Stats Widgets Box */}
                <div className="row">
                  
                  <div className="col-lg-3 col-6">
                    <div className="small-box bg-primary elevation-1 rounded-lg">
                      <div className="inner">
                        <h3>{stats.total_users}</h3>
                        <p>Total Registered Users</p>
                      </div>
                      <div className="icon"><i className="fas fa-users"></i></div>
                      <a href="#" onClick={() => setActiveTab('users')} className="small-box-footer">Inspect Database <i className="fas fa-arrow-circle-right"></i></a>
                    </div>
                  </div>

                  <div className="col-lg-3 col-6">
                    <div className="small-box bg-success elevation-1 rounded-lg">
                      <div className="inner">
                        <h3>{stats.active_offers}</h3>
                        <p>Active Earning Offers</p>
                      </div>
                      <div className="icon"><i className="fas fa-gift"></i></div>
                      <a href="#" onClick={() => setActiveTab('offers')} className="small-box-footer">Build Offers <i className="fas fa-arrow-circle-right"></i></a>
                    </div>
                  </div>

                  <div className="col-lg-3 col-6">
                    <div className="small-box bg-warning elevation-1 rounded-lg">
                      <div className="inner">
                        <h3 className="text-white">{stats.pending_withdrawals}</h3>
                        <p className="text-white">Pending Withdrawals</p>
                      </div>
                      <div className="icon"><i className="fas fa-hourglass-half text-white-50"></i></div>
                      <a href="#" onClick={() => setActiveTab('withdrawals')} className="small-box-footer text-white-50">Approve Payouts <i className="fas fa-arrow-circle-right text-white-50"></i></a>
                    </div>
                  </div>

                  <div className="col-lg-3 col-6">
                    <div className="small-box bg-danger elevation-1 rounded-lg">
                      <div className="inner">
                        <h3>₹{stats.settled_payouts_value.toFixed(2)}</h3>
                        <p>Total Settled Payouts</p>
                      </div>
                      <div className="icon"><i className="fas fa-money-check-alt"></i></div>
                      <a href="#" onClick={() => setActiveTab('reports')} className="small-box-footer">View Audit Logs <i className="fas fa-arrow-circle-right"></i></a>
                    </div>
                  </div>

                </div>

                {/* DB Credentials Banner */}
                <div className="card card-white shadow-none border rounded-lg mt-4">
                  <div className="card-body p-4">
                    <h5 className="font-weight-bold text-dark"><i className="fas fa-server mr-2 text-primary"></i> Active Database Host Credentials</h5>
                    <p className="text-secondary text-sm mb-0 mt-2 leading-relaxed">
                      You are actively connected to the fresh <strong>AppDatabase</strong> on external node <code>72.61.254.236:3320</code>. This is fully isolated from the legacy PHP schema, preserving all production data. All updates you execute here will be made directly to the fresh client environment.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: USERS DIRECTORY */}
            {activeTab === 'users' && (
              <div className="row">
                
                {/* Users List Grid */}
                <div className={selectedUser ? "col-lg-8" : "col-lg-12"}>
                  <div className="card card-white shadow-none border rounded-lg">
                    <div className="card-header border-0 bg-transparent">
                      <h3 className="card-title font-weight-bold">Member Directory</h3>
                      <div className="card-tools">
                        <div className="input-group input-group-sm" style={{ width: '260px' }}>
                          <input 
                            type="text" 
                            className="form-control rounded-left" 
                            placeholder="Search users..." 
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                          />
                          <div className="input-group-append">
                            <span className="input-group-text rounded-right bg-transparent border-left-0"><i className="fas fa-search"></i></span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="card-body table-responsive p-0">
                      <table className="table table-hover text-nowrap align-middle">
                        <thead>
                          <tr className="text-xs text-muted uppercase">
                            <th>User ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Referral Code</th>
                            <th>Balance</th>
                            <th className="text-right pr-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.map(u => (
                            <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => viewUserLedger(u)} className={selectedUser?.id === u.id ? "table-active" : ""}>
                              <td><code className="text-xs text-indigo font-weight-bold">{u.user_id || 'N/A'}</code></td>
                              <td><strong className="text-dark">{u.name || 'Anonymous'}</strong></td>
                              <td className="text-secondary text-sm">{u.email}</td>
                              <td><code>{u.referral_code || 'None'}</code></td>
                              <td><span className="badge badge-success px-2 py-1">₹{parseFloat(u.balance || 0).toFixed(2)}</span></td>
                              <td className="text-right pr-4">
                                <button className="btn btn-outline-primary btn-xs font-weight-bold px-3 rounded-pill" onClick={(e) => { e.stopPropagation(); viewUserLedger(u); }}>
                                  <i className="fas fa-eye mr-1"></i> Inspect
                                </button>
                              </td>
                            </tr>
                          ))}
                          {usersList.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center text-muted p-4">No users matching search criteria.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {usersPages > 1 && (
                      <div className="card-footer bg-transparent border-0 d-flex justify-content-between align-items-center">
                        <span className="text-muted text-xs">Page <strong>{usersPage}</strong> of <strong>{usersPages}</strong> ({usersTotal} users)</span>
                        <div className="btn-group">
                          <button className="btn btn-outline-secondary btn-sm" disabled={usersPage === 1} onClick={() => setUsersPage(prev => Math.max(prev - 1, 1))}>Previous</button>
                          <button className="btn btn-outline-secondary btn-sm" disabled={usersPage === usersPages} onClick={() => setUsersPage(prev => Math.min(prev + 1, usersPages))}>Next</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inspect Sidebar */}
                {selectedUser && (
                  <div className="col-lg-4">
                    <div className="card card-white shadow-none border rounded-lg">
                      <div className="card-header border-bottom-0 bg-transparent d-flex justify-content-between align-items-center pb-0">
                        <h3 className="card-title font-weight-bold">User Inspector</h3>
                        <button type="button" className="close" onClick={() => setSelectedUser(null)}>&times;</button>
                      </div>
                      
                      <div className="card-body">
                        <div className="text-center mb-4">
                          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name || 'Admin')}&background=007bff&color=fff&size=96`} className="img-circle border elevation-1 mb-3" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                          <h5 className="font-weight-black mb-1">{selectedUser.name || 'Anonymous'}</h5>
                          <span className="badge badge-light border text-muted">{selectedUser.email}</span>
                        </div>

                        {/* Balance adjustment */}
                        <div className="d-flex justify-content-between align-items-center bg-light p-3 rounded-lg border mb-4">
                          <div>
                            <span className="text-xs text-muted uppercase font-weight-bold d-block">Available Coins</span>
                            <h4 className="text-success font-weight-black mb-0">₹{parseFloat(selectedUser.balance || 0).toFixed(2)}</h4>
                          </div>
                          <button className="btn btn-primary btn-sm px-3 rounded-pill" onClick={() => setAdjustBalanceModal(true)}>
                            <i className="fas fa-sliders-h mr-1"></i> Adjust
                          </button>
                        </div>

                        {/* Profile Info details */}
                        <div className="card shadow-none border bg-light mb-4">
                          <div className="card-body p-3">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <span className="font-weight-bold text-secondary text-xs uppercase">User Profile Details</span>
                              <div className="btn-group">
                                <button className="btn btn-xs btn-outline-primary px-3 rounded-pill mr-2" onClick={() => triggerEditUser(selectedUser)}>
                                  <i className="fas fa-edit mr-1"></i> Edit Details
                                </button>
                                <button className="btn btn-xs btn-outline-danger px-3 rounded-pill" onClick={() => handleDeleteUser(selectedUser.id)}>
                                  <i className="fas fa-trash-alt mr-1"></i> Delete User
                                </button>
                              </div>
                            </div>

                            <div className="row text-sm">
                              <div className="col-6 mb-2">
                                <span className="text-xs text-muted d-block">User ID (Public)</span>
                                <strong>{selectedUser.user_id || 'N/A'}</strong>
                              </div>
                              <div className="col-6 mb-2">
                                <span className="text-xs text-muted d-block">Referral Code</span>
                                <code className="text-xs text-indigo font-weight-bold">{selectedUser.referral_code || 'None'}</code>
                              </div>
                              <div className="col-6 mb-2">
                                <span className="text-xs text-muted d-block">Phone Number</span>
                                <strong>{selectedUser.phone_number || 'N/A'}</strong>
                              </div>
                              <div className="col-6 mb-2">
                                <span className="text-xs text-muted d-block">Location</span>
                                <strong>{selectedUser.location || 'N/A'}</strong>
                              </div>
                              <div className="col-6 mb-2">
                                <span className="text-xs text-muted d-block">Current Streak</span>
                                <strong>{selectedUser.current_streak || 0} days</strong>
                              </div>
                              <div className="col-6 mb-2">
                                <span className="text-xs text-muted d-block">Daily Spins Left</span>
                                <strong>{selectedUser.daily_spins_count || 0}</strong>
                              </div>
                              <div className="col-12 mb-2">
                                <span className="text-xs text-muted d-block">Android Identifier</span>
                                <code className="text-xs text-danger">{selectedUser.android_id || 'N/A'}</code>
                              </div>
                              <div className="col-12 mb-2 border-top pt-2">
                                <span className="text-xs text-muted d-block">FCM Push Token</span>
                                <span className="text-xs text-muted text-break">{selectedUser.fcm_token || 'None'}</span>
                              </div>
                              <div className="col-12 border-top pt-2 d-flex justify-content-between align-items-center">
                                <div>
                                  <span className="text-xs text-muted d-block">Status</span>
                                  <strong className={selectedUser.is_banned ? "text-danger" : "text-success"}>
                                    {selectedUser.is_banned ? "🚫 Banned" : "✅ Active"}
                                  </strong>
                                </div>
                                {selectedUser.is_banned ? (
                                  <button className="btn btn-xs btn-success rounded-pill px-3" onClick={() => handleUnbanUser(selectedUser.id)}>Unban</button>
                                ) : (
                                  <button className="btn btn-xs btn-danger rounded-pill px-3" onClick={() => handleBanUser(selectedUser.id)}>Ban User</button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Recent Transactions Ledger */}
                        <h6 className="font-weight-bold mb-3"><i className="fas fa-history mr-1"></i> Transaction History</h6>
                        <div style={{ maxHeight: '240px', overflowY: 'auto' }} className="pr-1">
                          {userTransactions.map(t => (
                            <div key={t.id} className="p-2 border rounded-lg mb-2 bg-light d-flex justify-content-between align-items-center text-sm">
                              <div>
                                <p className="font-weight-bold mb-0 text-dark">{t.description || t.source}</p>
                                <span className="text-xs text-muted">{new Date(t.created_at).toLocaleDateString()}</span>
                              </div>
                              <strong className={t.type === 'CREDIT' ? "text-success" : "text-danger"}>
                                {t.type === 'CREDIT' ? '+' : '-'}{parseFloat(t.amount).toFixed(2)}
                              </strong>
                            </div>
                          ))}
                          {userTransactions.length === 0 && (
                            <p className="text-muted text-xs text-center p-3">No transactions found.</p>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: OFFER BUILDER */}
            {activeTab === 'offers' && (
              <div className="row">
                {/* Offers List */}
                <div className="col-lg-8">
                  <div className="card card-white shadow-none border rounded-lg">
                    <div className="card-header border-0 bg-transparent">
                      <h3 className="card-title font-weight-bold">Earning Campaigns</h3>
                    </div>
                    <div className="card-body table-responsive p-0">
                      <table className="table table-hover text-nowrap align-middle">
                        <thead>
                          <tr className="text-xs text-muted uppercase">
                            <th>Icon</th>
                            <th>Campaign Details</th>
                            <th className="text-center">Category</th>
                            <th className="text-center">Reward</th>
                            <th className="text-center">Status</th>
                            <th className="text-right pr-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {offersList.map(o => (
                            <tr key={o.id}>
                              <td>
                                {o.icon_url ? (
                                  <img src={o.icon_url} alt="" className="img-thumbnail" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '40px', height: '40px' }} className="bg-light border rounded d-flex align-items-center justify-content-center">
                                    <i className="fas fa-gift text-muted"></i>
                                  </div>
                                )}
                              </td>
                              <td>
                                <strong className="text-dark">{o.title}</strong>
                                {o.is_hot === 1 && <span className="badge badge-danger px-2 ml-2">Hot</span>}
                              </td>
                              <td className="text-center">{o.category || 'General'}</td>
                              <td className="text-center"><span className="badge badge-success px-2">₹{parseFloat(o.total_reward || 0).toFixed(2)}</span></td>
                              <td className="text-center">
                                <span className={`badge badge-${o.is_active ? 'success' : 'secondary'} px-2`}>
                                  {o.is_active ? 'Live' : 'Paused'}
                                </span>
                              </td>
                              <td className="text-right pr-4">
                                <button className="btn btn-outline-primary btn-xs font-weight-bold mr-2 px-3 rounded-pill" onClick={() => handleEditOfferClick(o)}>
                                  <i className="fas fa-edit"></i> Edit
                                </button>
                                <button className="btn btn-outline-danger btn-xs font-weight-bold px-3 rounded-pill" onClick={() => handleDeleteOffer(o.id)}>
                                  <i className="fas fa-trash-alt"></i> Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Offer form card */}
                <div className="col-lg-4">
                  <div className="card card-white shadow-none border rounded-lg">
                    <div className="card-header border-bottom-0 bg-transparent">
                      <h3 className="card-title font-weight-bold">{editingOffer ? "✏️ Edit Offer" : "＋ Create Offer"}</h3>
                      {editingOffer && (
                        <button className="close" onClick={resetOfferForm}>&times;</button>
                      )}
                    </div>
                    <div className="card-body">
                      <form onSubmit={handleOfferSubmit}>
                        <div className="form-group mb-3">
                          <label className="text-muted text-xs font-weight-bold mb-1">Offer Title</label>
                          <input type="text" className="form-control" placeholder="e.g. Install GPay" value={offerForm.title} onChange={e => setOfferForm({ ...offerForm, title: e.target.value })} required />
                        </div>
                        <div className="form-group mb-3">
                          <label className="text-muted text-xs font-weight-bold mb-1">External ID / Network Key</label>
                          <input type="text" className="form-control" placeholder="e.g. gpay_install" value={offerForm.external_id} onChange={e => setOfferForm({ ...offerForm, external_id: e.target.value })} />
                        </div>
                        <div className="form-group mb-3">
                          <label className="text-muted text-xs font-weight-bold mb-1">Description</label>
                          <textarea className="form-control" rows={3} placeholder="Steps to complete offer..." value={offerForm.description} onChange={e => setOfferForm({ ...offerForm, description: e.target.value })} />
                        </div>
                        <div className="row">
                          <div className="col-6 form-group mb-3">
                            <label className="text-muted text-xs font-weight-bold mb-1">Category</label>
                            <select className="form-control" value={offerForm.category} onChange={e => setOfferForm({ ...offerForm, category: e.target.value })}>
                              <option value="General">General</option>
                              <option value="Crypto">Crypto</option>
                              <option value="Gaming">Gaming</option>
                              <option value="Surveys">Surveys</option>
                            </select>
                          </div>
                          <div className="col-6 form-group mb-3">
                            <label className="text-muted text-xs font-weight-bold mb-1">Estimated Time</label>
                            <input type="text" className="form-control" value={offerForm.estimated_time} onChange={e => setOfferForm({ ...offerForm, estimated_time: e.target.value })} />
                          </div>
                        </div>
                        <div className="row">
                          <div className="col-6 form-group mb-3">
                            <label className="text-muted text-xs font-weight-bold mb-1">Reward (Coins)</label>
                            <input type="number" className="form-control" value={offerForm.total_reward} onChange={e => setOfferForm({ ...offerForm, total_reward: parseFloat(e.target.value || 0) })} required />
                          </div>
                          <div className="col-6 form-group mb-3">
                            <label className="text-muted text-xs font-weight-bold mb-1">Cost (AdNetwork)</label>
                            <input type="number" className="form-control" value={offerForm.actual_price} onChange={e => setOfferForm({ ...offerForm, actual_price: parseFloat(e.target.value || 0) })} />
                          </div>
                        </div>
                        <div className="form-group mb-3">
                          <label className="text-muted text-xs font-weight-bold mb-1">Tracking URL / App Link</label>
                          <input type="text" className="form-control" value={offerForm.tracking_url} onChange={e => setOfferForm({ ...offerForm, tracking_url: e.target.value })} />
                        </div>
                        <div className="form-group mb-3">
                          <label className="text-muted text-xs font-weight-bold mb-1">Icon Image URL</label>
                          <input type="text" className="form-control" value={offerForm.icon_url} onChange={e => setOfferForm({ ...offerForm, icon_url: e.target.value })} />
                        </div>
                        <div className="row mb-3 align-items-center">
                          <div className="col-6">
                            <div className="custom-control custom-switch">
                              <input type="checkbox" className="custom-control-input" id="isHot" checked={offerForm.is_hot} onChange={e => setOfferForm({ ...offerForm, is_hot: e.target.checked })} />
                              <label className="custom-control-label text-xs uppercase" htmlFor="isHot">Hot Offer</label>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="custom-control custom-switch">
                              <input type="checkbox" className="custom-control-input" id="isActive" checked={offerForm.is_active} onChange={e => setOfferForm({ ...offerForm, is_active: e.target.checked })} />
                              <label className="custom-control-label text-xs uppercase" htmlFor="isActive">Active</label>
                            </div>
                          </div>
                        </div>
                        <button type="submit" className="btn btn-primary btn-block rounded-pill">Publish Offer</button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: VISIT & EARN */}
            {activeTab === 'visit-earn' && (
              <div className="row">
                <div className="col-lg-8">
                  <div className="card card-white shadow-none border rounded-lg">
                    <div className="card-header border-0 bg-transparent">
                      <h3 className="card-title font-weight-bold">Configure Visit & Earn</h3>
                    </div>
                    <div className="card-body table-responsive p-0">
                      <table className="table table-hover text-nowrap align-middle">
                        <thead>
                          <tr className="text-xs text-muted uppercase">
                            <th>Task Title</th>
                            <th className="text-center">Reward</th>
                            <th>Target URL</th>
                            <th className="text-center">Timer</th>
                            <th className="text-center">Ad Status</th>
                            <th className="text-center">State</th>
                            <th className="text-right pr-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visitTasksList.map(task => (
                            <tr key={task.id}>
                              <td><strong>{task.title}</strong></td>
                              <td className="text-center"><span className="badge badge-success px-2">₹{task.coins}</span></td>
                              <td><a href={task.visit_url} target="_blank" rel="noreferrer" className="text-indigo text-xs text-break">{task.visit_url}</a></td>
                              <td className="text-center">{task.timer_seconds}s</td>
                              <td className="text-center">
                                <span className={`badge badge-${task.is_ad ? 'warning' : 'secondary'} px-2`}>{task.is_ad ? 'Ad Required' : 'No Ad'}</span>
                              </td>
                              <td className="text-center">
                                <span className={`badge badge-${task.is_active ? 'success' : 'secondary'} px-2`}>{task.is_active ? 'Live' : 'Paused'}</span>
                              </td>
                              <td className="text-right pr-4">
                                <button className="btn btn-outline-primary btn-xs font-weight-bold mr-2 px-3 rounded-pill" onClick={() => handleEditVisitTaskClick(task)}>Edit</button>
                                <button className="btn btn-outline-danger btn-xs font-weight-bold px-3 rounded-pill" onClick={() => handleDeleteVisitTask(task.id)}>Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="col-lg-4">
                  <div className="card card-white shadow-none border rounded-lg">
                    <div className="card-header border-bottom-0 bg-transparent">
                      <h3 className="card-title font-weight-bold">{editingVisitTask ? "✏️ Edit Task" : "＋ Create Task"}</h3>
                      {editingVisitTask && <button className="close" onClick={resetVisitTaskForm}>&times;</button>}
                    </div>
                    <div className="card-body">
                      <form onSubmit={handleVisitTaskSubmit}>
                        <div className="form-group mb-3">
                          <label className="text-muted text-xs font-weight-bold mb-1">Task Title</label>
                          <input type="text" className="form-control" placeholder="e.g. Visit Blog" value={visitTaskForm.title} onChange={e => setVisitTaskForm({ ...visitTaskForm, title: e.target.value })} required />
                        </div>
                        <div className="form-group mb-3">
                          <label className="text-muted text-xs font-weight-bold mb-1">Visit URL</label>
                          <input type="url" className="form-control" placeholder="https://example.com" value={visitTaskForm.visit_url} onChange={e => setVisitTaskForm({ ...visitTaskForm, visit_url: e.target.value })} required />
                        </div>
                        <div className="row">
                          <div className="col-6 form-group mb-3">
                            <label className="text-muted text-xs font-weight-bold mb-1">Coins Reward</label>
                            <input type="number" className="form-control" value={visitTaskForm.coins} onChange={e => setVisitTaskForm({ ...visitTaskForm, coins: parseInt(e.target.value || 0) })} required />
                          </div>
                          <div className="col-6 form-group mb-3">
                            <label className="text-muted text-xs font-weight-bold mb-1">Timer (seconds)</label>
                            <input type="number" className="form-control" value={visitTaskForm.timer_seconds} onChange={e => setVisitTaskForm({ ...visitTaskForm, timer_seconds: parseInt(e.target.value || 30) })} required />
                          </div>
                        </div>
                        <div className="form-group mb-3">
                          <label className="text-muted text-xs font-weight-bold mb-1">Ad Intercept Trigger</label>
                          <select className="form-control" value={visitTaskForm.is_ad ? 'yes' : 'no'} onChange={e => setVisitTaskForm({ ...visitTaskForm, is_ad: e.target.value === 'yes' })}>
                            <option value="no">No - Direct Visit</option>
                            <option value="yes">Yes - Interstitial Ad first</option>
                          </select>
                        </div>
                        <div className="custom-control custom-switch mb-3">
                          <input type="checkbox" className="custom-control-input" id="isTaskActive" checked={visitTaskForm.is_active} onChange={e => setVisitTaskForm({ ...visitTaskForm, is_active: e.target.checked })} />
                          <label className="custom-control-label text-xs uppercase" htmlFor="isTaskActive">Task is Live</label>
                        </div>
                        <button type="submit" className="btn btn-primary btn-block rounded-pill">Publish task</button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: WITHDRAWALS QUEUE */}
            {activeTab === 'withdrawals' && (
              <div className="card card-white shadow-none border rounded-lg">
                <div className="card-header border-0 bg-transparent d-flex justify-content-between align-items-center">
                  <h3 className="card-title font-weight-bold">Withdrawal Approvals Queue</h3>
                  <div className="btn-group">
                    <button className={`btn btn-xs ${withdrawalStatus === 'PENDING' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setWithdrawalStatus('PENDING')}>Pending</button>
                    <button className={`btn btn-xs ${withdrawalStatus === 'APPROVED' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setWithdrawalStatus('APPROVED')}>Approved</button>
                    <button className={`btn btn-xs ${withdrawalStatus === 'REJECTED' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setWithdrawalStatus('REJECTED')}>Rejected</button>
                    <button className={`btn btn-xs ${withdrawalStatus === 'ALL' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setWithdrawalStatus('ALL')}>All</button>
                  </div>
                </div>
                <div className="card-body table-responsive p-0">
                  <table className="table table-hover text-nowrap align-middle">
                    <thead>
                      <tr className="text-xs text-muted uppercase">
                        <th>User</th>
                        <th>Method</th>
                        <th>Payout Destination</th>
                        <th>Amount</th>
                        <th>Requested On</th>
                        <th>Status</th>
                        <th className="text-right pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawalsList.map(w => (
                        <tr key={w.id}>
                          <td><strong>{w.user_name}</strong><br /><span className="text-xs text-muted">{w.user_email}</span></td>
                          <td><span className="badge badge-light border">{w.method}</span></td>
                          <td><code className="text-xs text-dark">{w.details}</code></td>
                          <td><strong className="text-dark">₹{parseFloat(w.amount).toFixed(2)}</strong></td>
                          <td className="text-sm">{new Date(w.created_at).toLocaleString()}</td>
                          <td><span className={`badge badge-${w.status === 'PENDING' ? 'warning' : (w.status === 'APPROVED' ? 'success' : 'danger')} px-2`}>{w.status}</span></td>
                          <td className="text-right pr-4">
                            {w.status === 'PENDING' ? (
                              <div className="btn-group">
                                <button className="btn btn-xs btn-success rounded-pill px-3 mr-2" onClick={() => handleApproveWithdrawal(w.id)}>Settle</button>
                                <button className="btn btn-xs btn-danger rounded-pill px-3" onClick={() => triggerRejectWithdrawal(w)}>Reject</button>
                              </div>
                            ) : <span className="text-xs text-muted">Processed</span>}
                          </td>
                        </tr>
                      ))}
                      {withdrawalsList.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center text-muted p-4">No withdrawals matching criteria.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 14: OFFLINE SUBMISSIONS */}
            {activeTab === 'proofs' && (
              <div className="card card-white shadow-none border rounded-lg">
                <div className="card-header border-0 bg-transparent d-flex justify-content-between align-items-center">
                  <div>
                    <h3 className="card-title font-weight-bold">Proofs Auditing Gallery</h3>
                  </div>
                  <button className="btn btn-sm btn-outline-secondary rounded-pill" onClick={fetchProofs}><i className="fas fa-sync-alt mr-1"></i> Refresh Queue</button>
                </div>
                <div className="card-body table-responsive p-0">
                  <table className="table table-hover text-nowrap align-middle">
                    <thead>
                      <tr className="text-xs text-muted uppercase">
                        <th>Candidate</th>
                        <th>Target Campaign</th>
                        <th>Evidence / Inputs</th>
                        <th>Compensation</th>
                        <th>Submitted On</th>
                        <th className="text-right pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proofsList.map(p => {
                        let inputs = [];
                        if (p.user_input) {
                          try { inputs = typeof p.user_input === 'string' ? JSON.parse(p.user_input) : p.user_input; }
                          catch(e) {}
                        }
                        return (
                          <tr key={p.id}>
                            <td><strong>{p.user_name || 'Anonymous'}</strong><br /><span className="text-xs text-muted">ID: {p.user_public_id}</span></td>
                            <td><strong>{p.offer_title}</strong></td>
                            <td>
                              <div style={{ maxWidth: '320px', whiteSpace: 'normal' }}>
                                {Array.isArray(inputs) ? inputs.map((inp, idx) => {
                                  if (inp.type === 'file') {
                                    const fileUrl = inp.value.startsWith('http') ? inp.value : `${API_BASE}${inp.value}`;
                                    return (
                                      <div key={idx} className="mt-1">
                                        <a href={fileUrl} target="_blank" rel="noreferrer" className="btn btn-xs btn-outline-info rounded-pill px-2"><i className="fas fa-image mr-1"></i> View Screen</a>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={idx} className="text-xs">
                                      <span className="text-muted font-weight-bold">{inp.label}:</span> <code>{inp.value}</code>
                                    </div>
                                  );
                                }) : <code>{p.user_input}</code>}
                              </div>
                            </td>
                            <td><strong className="text-success">₹{parseFloat(p.offer_reward || 0).toFixed(2)}</strong></td>
                            <td className="text-sm">{new Date(p.last_updated).toLocaleString()}</td>
                            <td className="text-right pr-4">
                              <div className="btn-group">
                                <button className="btn btn-xs btn-success rounded-pill px-3 mr-2" onClick={() => handleApproveProof(p.click_id)}>Pass</button>
                                <button className="btn btn-xs btn-danger rounded-pill px-3" onClick={() => triggerRejectProof(p.click_id)}>Fail</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {proofsList.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center text-muted p-4">No pending campaign proofs to audit.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: DATA ERASURES */}
            {activeTab === 'erasures' && (
              <div className="card card-white shadow-none border rounded-lg">
                <div className="card-header border-0 bg-transparent">
                  <h3 className="card-title font-weight-bold"><i className="fas fa-exclamation-triangle text-danger mr-2"></i> gdpr deletion requests</h3>
                </div>
                <div className="card-body table-responsive p-0">
                  <table className="table table-hover text-nowrap align-middle">
                    <thead>
                      <tr className="text-xs text-muted uppercase">
                        <th>Email</th>
                        <th>User Reason</th>
                        <th>Submitted On</th>
                        <th>Request Status</th>
                        <th className="text-right pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {erasuresList.map(e => (
                        <tr key={e.id}>
                          <td><strong>{e.email}</strong></td>
                          <td style={{ whiteSpace: 'normal', maxWidth: '300px' }}>{e.reason || 'None provided.'}</td>
                          <td className="text-sm">{new Date(e.created_at).toLocaleString()}</td>
                          <td><span className={`badge badge-${e.status === 'PENDING' ? 'warning' : 'success'} px-2`}>{e.status}</span></td>
                          <td className="text-right pr-4">
                            {e.status === 'PENDING' ? (
                              <div className="btn-group">
                                <button className="btn btn-xs btn-danger rounded-pill px-3 mr-2" onClick={() => handleApproveErasure(e.id)}>Purge DB</button>
                                <button className="btn btn-xs btn-outline-secondary rounded-pill px-3" onClick={() => handleRejectErasure(e.id)}>Dismiss</button>
                              </div>
                            ) : <span className="text-xs text-muted">Cleared</span>}
                          </td>
                        </tr>
                      ))}
                      {erasuresList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center text-muted p-4">No deletion logs.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: BROADCAST CENTER */}
            {activeTab === 'push' && (
              <div className="card card-white shadow-none border rounded-lg">
                <div className="card-body">
                  <AdminNotifications getHeaders={getHeaders} showNotice={showNotice} API_BASE={API_BASE} />
                </div>
              </div>
            )}

            {/* TAB 7: APP CONFIGS */}
            {activeTab === 'configs' && (
              <div className="card card-white shadow-none border rounded-lg">
                <div className="card-body">
                  <AdminConfigs getHeaders={getHeaders} showNotice={showNotice} API_BASE={API_BASE} />
                </div>
              </div>
            )}

            {/* TAB 8: BANNERS MANAGER */}
            {activeTab === 'banners' && (
              <div className="card card-white shadow-none border rounded-lg">
                <div className="card-body">
                  <AdminBanners getHeaders={getHeaders} showNotice={showNotice} API_BASE={API_BASE} />
                </div>
              </div>
            )}

            {/* TAB 9: PAYOUT METHODS */}
            {activeTab === 'payouts' && (
              <div className="card card-white shadow-none border rounded-lg">
                <div className="card-body">
                  <AdminPayouts getHeaders={getHeaders} showNotice={showNotice} API_BASE={API_BASE} />
                </div>
              </div>
            )}

            {/* TAB 10: REFERRAL SETTINGS */}
            {activeTab === 'referrals' && (
              <div className="card card-white shadow-none border rounded-lg">
                <div className="card-body">
                  <AdminReferrals getHeaders={getHeaders} showNotice={showNotice} API_BASE={API_BASE} />
                </div>
              </div>
            )}

            {/* TAB 11: SURPRISE ENVELOPES */}
            {activeTab === 'lifafas' && (
              <div className="card card-white shadow-none border rounded-lg">
                <div className="card-body">
                  <AdminLifafas getHeaders={getHeaders} showNotice={showNotice} API_BASE={API_BASE} />
                </div>
              </div>
            )}

            {/* TAB 12: SUPPORT TICKETS */}
            {activeTab === 'tickets' && (
              <div className="card card-white shadow-none border rounded-lg">
                <div className="card-body">
                  <AdminTickets getHeaders={getHeaders} showNotice={showNotice} API_BASE={API_BASE} />
                </div>
              </div>
            )}

            {/* TAB 13: FINANCIAL REPORTS */}
            {activeTab === 'reports' && (
              <div className="card card-white shadow-none border rounded-lg">
                <div className="card-body">
                  <AdminReports getHeaders={getHeaders} showNotice={showNotice} API_BASE={API_BASE} />
                </div>
              </div>
            )}

          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="main-footer bg-white border-top-0 text-sm py-3 text-center text-md-left">
        <strong>Copyright &copy; 2026 StuEarn Admin.</strong> All rights reserved.
      </footer>

      {/* Adjust User Balance Modal */}
      {adjustBalanceModal && selectedUser && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)', zIndex: 10000 }} role="dialog">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content rounded-lg border-0 shadow">
              <div className="modal-header border-bottom-0">
                <h5 className="modal-title font-weight-bold">Adjust Wallet Balance</h5>
                <button type="button" className="close" onClick={() => setAdjustBalanceModal(false)}>&times;</button>
              </div>
              <div className="modal-body pt-0">
                <p className="text-secondary text-xs">Modifying coins balance for: <strong>{selectedUser.name}</strong></p>
                <form onSubmit={handleAdjustBalance}>
                  <div className="btn-group btn-group-toggle w-100 mb-3" data-toggle="buttons">
                    <label className={`btn flex-fill ${adjustType === 'CREDIT' ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => setAdjustType('CREDIT')}>
                      <i className="fas fa-plus mr-1"></i> Credit (Add)
                    </label>
                    <label className={`btn flex-fill ${adjustType === 'DEBIT' ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={() => setAdjustType('DEBIT')}>
                      <i className="fas fa-minus mr-1"></i> Debit (Deduct)
                    </label>
                  </div>
                  <div className="form-group mb-3">
                    <label className="text-muted text-xs font-weight-bold mb-1">Coin Quantity</label>
                    <input type="number" className="form-control" placeholder="0.00" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} step="0.01" required />
                  </div>
                  <div className="form-group mb-3">
                    <label className="text-muted text-xs font-weight-bold mb-1">Ledger Description</label>
                    <input type="text" className="form-control" placeholder="Manual adjustments details" value={adjustDesc} onChange={e => setAdjustDesc(e.target.value)} />
                  </div>
                  <div className="d-flex mt-4 gap-2">
                    <button type="submit" className="btn btn-primary flex-fill rounded-pill py-2">Apply Ledger Entry</button>
                    <button type="button" className="btn btn-outline-secondary flex-fill rounded-pill py-2" onClick={() => setAdjustBalanceModal(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Info Modal */}
      {editUserModal && selectedUser && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)', zIndex: 10000 }} role="dialog">
          <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div className="modal-content rounded-lg border-0 shadow" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="modal-header border-bottom-0">
                <h5 className="modal-title font-weight-bold">Edit Candidate Profile</h5>
                <button type="button" className="close" onClick={() => setEditUserModal(false)}>&times;</button>
              </div>
              <div className="modal-body pt-0">
                <form onSubmit={handleEditUserSubmit}>
                  <div className="row">
                    <div className="col-md-6 form-group mb-3">
                      <label className="text-muted text-xs font-weight-bold mb-1">Full Name</label>
                      <input type="text" className="form-control" value={editUserForm.name} onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })} required />
                    </div>
                    <div className="col-md-6 form-group mb-3">
                      <label className="text-muted text-xs font-weight-bold mb-1">Email Address</label>
                      <input type="email" className="form-control" value={editUserForm.email} onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })} required />
                    </div>
                    <div className="col-md-6 form-group mb-3">
                      <label className="text-muted text-xs font-weight-bold mb-1">Phone Number</label>
                      <input type="text" className="form-control" value={editUserForm.phone_number} onChange={e => setEditUserForm({ ...editUserForm, phone_number: e.target.value })} />
                    </div>
                    <div className="col-md-6 form-group mb-3">
                      <label className="text-muted text-xs font-weight-bold mb-1">Location</label>
                      <input type="text" className="form-control" value={editUserForm.location} onChange={e => setEditUserForm({ ...editUserForm, location: e.target.value })} />
                    </div>
                    <div className="col-md-6 form-group mb-3">
                      <label className="text-muted text-xs font-weight-bold mb-1">Referral Code</label>
                      <input type="text" className="form-control" value={editUserForm.referral_code} onChange={e => setEditUserForm({ ...editUserForm, referral_code: e.target.value })} />
                    </div>
                    <div className="col-md-6 form-group mb-3">
                      <label className="text-muted text-xs font-weight-bold mb-1">Balance</label>
                      <input type="number" className="form-control" step="0.01" value={editUserForm.balance} onChange={e => setEditUserForm({ ...editUserForm, balance: e.target.value })} required />
                    </div>
                    <div className="col-md-6 form-group mb-3">
                      <label className="text-muted text-xs font-weight-bold mb-1">User ID</label>
                      <input type="text" className="form-control" value={editUserForm.user_id} onChange={e => setEditUserForm({ ...editUserForm, user_id: e.target.value })} required />
                    </div>
                    <div className="col-md-6 form-group mb-3">
                      <label className="text-muted text-xs font-weight-bold mb-1">Firebase UID</label>
                      <input type="text" className="form-control" value={editUserForm.uid} onChange={e => setEditUserForm({ ...editUserForm, uid: e.target.value })} required />
                    </div>
                    <div className="col-md-12 form-group mb-3">
                      <label className="text-muted text-xs font-weight-bold mb-1">Android Device Identifier</label>
                      <input type="text" className="form-control" value={editUserForm.android_id} onChange={e => setEditUserForm({ ...editUserForm, android_id: e.target.value })} />
                    </div>
                  </div>
                  <div className="d-flex mt-4 gap-2 pb-3">
                    <button type="submit" className="btn btn-primary flex-fill rounded-pill py-2">Save Changes</button>
                    <button type="button" className="btn btn-outline-secondary flex-fill rounded-pill py-2" onClick={() => setEditUserModal(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Withdrawal Modal */}
      {rejectModal && selectedWithdrawal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)', zIndex: 10000 }} role="dialog">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content rounded-lg border-0 shadow">
              <div className="modal-header border-bottom-0">
                <h5 className="modal-title font-weight-bold">Reject Payout Request</h5>
                <button type="button" className="close" onClick={() => { setRejectModal(false); setSelectedWithdrawal(null); }}>&times;</button>
              </div>
              <div className="modal-body pt-0">
                <form onSubmit={handleRejectWithdrawalSubmit}>
                  <div className="form-group mb-3">
                    <label className="text-muted text-xs font-weight-bold mb-1">Reason for Rejection (visible to candidate)</label>
                    <textarea className="form-control" rows={4} placeholder="e.g. Invalid identifier or metadata verification failure." value={rejectReason} onChange={e => setRejectReason(e.target.value)} required />
                  </div>
                  <div className="d-flex mt-4 gap-2">
                    <button type="submit" className="btn btn-danger flex-fill rounded-pill py-2">Reject & Refund Payout</button>
                    <button type="button" className="btn btn-outline-secondary flex-fill rounded-pill py-2" onClick={() => { setRejectModal(false); setSelectedWithdrawal(null); }}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Proof Modal */}
      {rejectProofModal && rejectProofClickId && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)', zIndex: 10000 }} role="dialog">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content rounded-lg border-0 shadow">
              <div className="modal-header border-bottom-0">
                <h5 className="modal-title font-weight-bold">Reject Campaign Proof</h5>
                <button type="button" className="close" onClick={() => { setRejectProofModal(false); setRejectProofClickId(null); setRejectProofReason(''); }}>&times;</button>
              </div>
              <div className="modal-body pt-0">
                <form onSubmit={handleRejectProofSubmit}>
                  <div className="form-group mb-3">
                    <label className="text-muted text-xs font-weight-bold mb-1">Reason for Rejection (visible to candidate)</label>
                    <textarea className="form-control" rows={4} placeholder="e.g. Evidence image does not verify campaign actions." value={rejectProofReason} onChange={e => setRejectProofReason(e.target.value)} required />
                  </div>
                  <div className="d-flex mt-4 gap-2">
                    <button type="submit" className="btn btn-danger flex-fill rounded-pill py-2">Confirm Reject</button>
                    <button type="button" className="btn btn-outline-secondary flex-fill rounded-pill py-2" onClick={() => { setRejectProofModal(false); setRejectProofClickId(null); setRejectProofReason(''); }}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
