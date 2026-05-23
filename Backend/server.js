import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './initDb.js';

// Load environment variables
dotenv.config();

// Controller Imports
import { loginGoogle, signupUser, loginAdmin, checkUid } from './controllers/authController.js';
import {
  getUserProfile,
  getUserStats,
  updateFcmToken,
  dailyCheckIn,
  getStreakStatus,
  getSpinStatus,
  performSpin,
  getScratchStatus,
  performScratch,
  getVideoAdStatus,
  claimVideoAdReward,
  requestAccountDeletion,
  serveDeleteAccountHTML,
  getAppConfig
} from './controllers/userController.js';
import { listOffers, getOfferById, startOffer, likeOffer, submitProof, getHotOffers, getOfferHistory } from './controllers/offerController.js';
import { getTransactions, requestWithdrawal, getWalletBalance, getEarnings, getRedeems, getPayoutMethods } from './controllers/walletController.js';
import { getReferralInfo, generateReferralCode, getReferralStatus, getReferralSummary, getReferralConfig, getReferralHistory } from './controllers/referralController.js';
import {
  handlePostback,
  handlePubscale,
  handlePubscaleChargeback,
  handleCpxResearch,
  handleAdjump,
  handleOffermaru,
  handleGrowdeck,
  handleOpinionUniverse,
  handlePlaytimeAds,
  handlePocketsfull,
  handleRealOpinion,
  handleOfferCompleted
} from './controllers/webhookController.js';
import {
  listBanners,
  getRecentEarnings,
  getLeaderboard,
  getTopEarners
} from './controllers/feedController.js';
import {
  getLifafaDetail,
  claimLifafaReward
} from './controllers/lifafaController.js';
import {
  generateTelegramToken,
  handleTelegramWebhook
} from './controllers/telegramController.js';
import {
  createTicket,
  listTickets,
  getTicketDetail,
  replyToTicket
} from './controllers/ticketController.js';
import {
  listVisitTasks,
  claimVisitReward,
  adminListVisitTasks,
  adminCreateVisitTask,
  adminUpdateVisitTask,
  adminDeleteVisitTask
} from './controllers/visitEarnController.js';
import {
  getAdminStats,
  listUsers,
  getUserTransactionsAdmin,
  updateUserBalance,
  updateUser,
  banUser,
  unbanUser,
  createOffer,
  updateOffer,
  deleteOffer,
  listAdminOffers,
  listWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  listErasureRequests,
  approveErasureRequest,
  rejectErasureRequest,
  triggerPushNotification,
  listNotificationHistory,
  listAdminBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  listAppConfigs,
  updateAppConfig,
  listPayoutMethods,
  updatePayoutMethod,
  getReferralSettings,
  updateReferralSettings,
  listLifafas,
  createLifafa,
  updateLifafa,
  deleteLifafa,
  listAdminTickets,
  getAdminTicketDetail,
  replyAdminTicket,
  closeAdminTicket,
  getAdminReports,
  getPendingProofs,
  approveProof,
  rejectProof,
  resetAllDailySpins,
  deleteUser
} from './controllers/adminController.js';

// Middleware Imports
import { authenticateUser, authenticateAdmin, verifyAppCheck } from './middlewares/auth.js';

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS and body parsing
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://stuearnindia.satyainfotechnetworks.com',
  'https://stuearn-api.satyainfotechnetworks.com',
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (
      !origin || 
      allowedOrigins.includes(origin) || 
      origin.endsWith('satyainfotechnetworks.com') ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup static uploads directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'StuEarn India Express server is healthy and running.' });
});

// ==========================================
// 1. AUTH ROUTES
// ==========================================
app.post(['/api/auth/google', '/api/auth/google.php'], verifyAppCheck, loginGoogle);
app.post(['/api/auth/check_uid', '/api/auth/check_uid.php'], verifyAppCheck, checkUid);
app.post(['/api/auth/signup', '/api/auth/signup.php'], verifyAppCheck, signupUser);

// ==========================================
// 2. USER ROUTES
// ==========================================
app.get(['/api/user/profile', '/api/user/profile.php'], authenticateUser, getUserProfile);
app.get(['/api/user/stats', '/api/user/stats.php'], authenticateUser, getUserStats);
app.post(['/api/user/fcm-token', '/api/user/update_fcm.php', '/api/user/update_fcm'], authenticateUser, updateFcmToken);
app.post(['/api/user/daily-checkin', '/api/user/streak.php', '/api/user/streak'], authenticateUser, dailyCheckIn);
app.get(['/api/user/streak', '/api/user/streak.php'], authenticateUser, getStreakStatus);
app.get(['/api/user/spin', '/api/user/spin.php'], authenticateUser, getSpinStatus);
app.post(['/api/user/spin', '/api/user/spin.php'], authenticateUser, performSpin);

// Visit & Earn user endpoints
app.get('/api/visit-earn', authenticateUser, listVisitTasks);
app.post('/api/visit-earn/claim', authenticateUser, claimVisitReward);

app.get(['/delete_account.php', '/api/delete_account.php'], serveDeleteAccountHTML);
app.post(['/api/user/delete-account', '/delete_account.php', '/api/delete_account.php'], requestAccountDeletion);

// ==========================================
// 3. OFFERS ROUTES
// ==========================================
app.get(['/api/offers/hot', '/api/offers/hot.php'], getHotOffers);
app.get(['/api/offers/history', '/api/offers/history.php'], getOfferHistory);
app.get(['/api/offers', '/api/offers/list.php', '/api/offers/list'], listOffers);
app.get(['/api/offers/detail', '/api/offers/detail.php', '/api/offers/:id'], getOfferById);
app.post(['/api/offers/start', '/api/offers/start.php'], authenticateUser, startOffer);
app.post(['/api/offers/like', '/api/offers/like.php', '/api/offers/:id/like'], authenticateUser, likeOffer);
app.post(['/api/offers/submit-proof', '/api/offers/submit_proof.php'], submitProof);

// ==========================================
// 4. WALLET ROUTES
// ==========================================
app.get('/api/wallet/transactions', authenticateUser, getTransactions);
app.get(['/api/wallet/balance', '/api/wallet/balance.php'], authenticateUser, getWalletBalance);
app.get(['/api/wallet/earnings', '/api/wallet/earnings.php'], authenticateUser, getEarnings);
app.get(['/api/wallet/redeems', '/api/wallet/redeems.php'], authenticateUser, getRedeems);
app.post(['/api/wallet/withdraw', '/api/wallet/withdraw.php'], authenticateUser, requestWithdrawal);
app.get(['/api/wallet/payout-methods', '/api/wallet/payout_methods.php'], getPayoutMethods);

// ==========================================
// 5. REFERRAL ROUTES
// ==========================================
app.get('/api/referral/info', authenticateUser, getReferralInfo);
app.post(['/api/referral/generate', '/api/referral/generate.php'], authenticateUser, generateReferralCode);
app.get(['/api/referral/status', '/api/referral/status.php'], authenticateUser, getReferralStatus);
app.get(['/api/referral/summary', '/api/referral/summary.php'], authenticateUser, getReferralSummary);
app.get(['/api/referral/config', '/api/referral/config.php'], getReferralConfig);
app.get(['/api/referral/history', '/api/referral/history.php'], authenticateUser, getReferralHistory);

// ==========================================
// 6. FEED & LEADERBOARD ROUTES
// ==========================================
app.get(['/api/banners/list', '/api/banners', '/api/banners/list.php'], listBanners);
app.get(['/api/leaderboard/list', '/api/leaderboard/list.php'], getLeaderboard);
app.get(['/api/leaderboard/top', '/api/leaderboard/top_earners.php'], getTopEarners);
app.get(['/api/ticker/earnings', '/api/ticker/recent_earnings.php'], getRecentEarnings);

// ==========================================
// 7. SURPRISE BONUS ENVELOPE (LIFAFA) ROUTES
// ==========================================
app.get(['/api/lifafa/detail', '/api/lifafa/detail.php', '/api/lifafa/detail/:id'], getLifafaDetail);
app.post(['/api/lifafa/claim', '/api/lifafa/claim.php'], claimLifafaReward);

// ==========================================
// 8. TELEGRAM VERIFICATION ROUTES
// ==========================================
app.post(['/api/telegram/generate', '/api/telegram/generate.php'], generateTelegramToken);
app.get(['/api/telegram/generate', '/api/telegram/generate.php'], generateTelegramToken);
app.post('/api/telegram/webhook', handleTelegramWebhook);

// ==========================================
// 9. SUPPORT TICKET ROUTES
// ==========================================
app.post(['/api/tickets', '/api/tickets/create.php', '/api/tickets/create'], authenticateUser, createTicket);
app.get(['/api/tickets', '/api/tickets/list.php', '/api/tickets/list'], authenticateUser, listTickets);
app.get(['/api/tickets/detail', '/api/tickets/detail.php', '/api/tickets/:id'], authenticateUser, getTicketDetail);
app.post(['/api/tickets/reply', '/api/tickets/reply.php', '/api/tickets/:id/reply'], authenticateUser, replyToTicket);

// ==========================================
// 11. APP CONFIGURATION
// ==========================================
app.get(['/api/config/app_config.php', '/api/config/app_config', '/api/config/app-config'], getAppConfig);

// ==========================================
// 10. AD WEBHOOKS (POSTBACKS)
// ==========================================
app.post('/api/webhook/postback', handlePostback);
app.get('/api/webhook/postback', handlePostback);

// Legacy Ad Networks Webhook S2S Payouts
app.get('/api/webhook/pubscale', handlePubscale);
app.get('/api/webhook/pubscale-chargeback', handlePubscaleChargeback);
app.get('/api/webhook/cpx-research', handleCpxResearch);
app.get('/api/webhook/adjump', handleAdjump);
app.get('/api/webhook/offermaru', handleOffermaru);
app.get('/api/webhook/growdeck', handleGrowdeck);
app.get('/api/webhook/opinionuniverse', handleOpinionUniverse);
app.get('/api/webhook/playtimeads', handlePlaytimeAds);
app.post('/api/webhook/playtimeads', handlePlaytimeAds);
app.get('/api/webhook/pocketsfull', handlePocketsfull);
app.post('/api/webhook/pocketsfull', handlePocketsfull);
app.post('/api/webhook/realopinion', handleRealOpinion);
app.post('/api/webhook/offer-completed', handleOfferCompleted);

// ==========================================
// 7. ADMINISTRATIVE ROUTES
// ==========================================
app.post('/api/admin/login', loginAdmin);
app.get('/api/admin/stats', authenticateAdmin, getAdminStats);
app.get('/api/admin/reports', authenticateAdmin, getAdminReports);

// User Management
app.get('/api/admin/users', authenticateAdmin, listUsers);
app.get('/api/admin/users/:id/transactions', authenticateAdmin, getUserTransactionsAdmin);
app.post('/api/admin/users/:id/balance', authenticateAdmin, updateUserBalance);
app.put('/api/admin/users/:id', authenticateAdmin, updateUser);
app.post('/api/admin/users/:id/ban', authenticateAdmin, banUser);
app.post('/api/admin/users/:id/unban', authenticateAdmin, unbanUser);
app.delete('/api/admin/users/:id', authenticateAdmin, deleteUser);

// Offers Management
app.get('/api/admin/offers', authenticateAdmin, listAdminOffers);
app.post('/api/admin/offers', authenticateAdmin, createOffer);
app.put('/api/admin/offers/:id', authenticateAdmin, updateOffer);
app.delete('/api/admin/offers/:id', authenticateAdmin, deleteOffer);

// Withdrawals
app.get('/api/admin/withdrawals', authenticateAdmin, listWithdrawals);
app.post('/api/admin/withdrawals/:id/approve', authenticateAdmin, approveWithdrawal);
app.post('/api/admin/withdrawals/:id/reject', authenticateAdmin, rejectWithdrawal);

// Payout Methods
app.get('/api/admin/payout-methods', authenticateAdmin, listPayoutMethods);
app.post('/api/admin/payout-methods/:id', authenticateAdmin, updatePayoutMethod);

// Erasure
app.get('/api/admin/erasures', authenticateAdmin, listErasureRequests);
app.post('/api/admin/erasures/:id/approve', authenticateAdmin, approveErasureRequest);
app.post('/api/admin/erasures/:id/reject', authenticateAdmin, rejectErasureRequest);

// Notifications
app.post('/api/admin/push', authenticateAdmin, triggerPushNotification);
app.get('/api/admin/notifications', authenticateAdmin, listNotificationHistory);

// Banners
app.get('/api/admin/banners', authenticateAdmin, listAdminBanners);
app.post('/api/admin/banners', authenticateAdmin, createBanner);
app.put('/api/admin/banners/:id', authenticateAdmin, updateBanner);
app.delete('/api/admin/banners/:id', authenticateAdmin, deleteBanner);

// App Configs
app.get('/api/admin/configs', authenticateAdmin, listAppConfigs);
app.post('/api/admin/configs', authenticateAdmin, updateAppConfig);

// Referral Settings
app.get('/api/admin/referral-settings', authenticateAdmin, getReferralSettings);
app.post('/api/admin/referral-settings', authenticateAdmin, updateReferralSettings);

// Lifafas
app.get('/api/admin/lifafas', authenticateAdmin, listLifafas);
app.post('/api/admin/lifafas', authenticateAdmin, createLifafa);
app.put('/api/admin/lifafas/:id', authenticateAdmin, updateLifafa);
app.delete('/api/admin/lifafas/:id', authenticateAdmin, deleteLifafa);

// Tickets
app.get('/api/admin/tickets', authenticateAdmin, listAdminTickets);
app.get('/api/admin/tickets/:id', authenticateAdmin, getAdminTicketDetail);
app.post('/api/admin/tickets/:id/reply', authenticateAdmin, replyAdminTicket);
app.post('/api/admin/tickets/:id/close', authenticateAdmin, closeAdminTicket);

// Offline Task Proof Verification
app.get('/api/admin/proofs', authenticateAdmin, getPendingProofs);
app.post('/api/admin/proofs/:clickId/approve', authenticateAdmin, approveProof);
app.post('/api/admin/proofs/:clickId/reject', authenticateAdmin, rejectProof);

// Reset Daily Spins
app.post('/api/admin/users/reset-spins', authenticateAdmin, resetAllDailySpins);

// Visit & Earn Management
app.get('/api/admin/visit-earn', authenticateAdmin, adminListVisitTasks);
app.post('/api/admin/visit-earn', authenticateAdmin, adminCreateVisitTask);
app.put('/api/admin/visit-earn/:id', authenticateAdmin, adminUpdateVisitTask);
app.delete('/api/admin/visit-earn/:id', authenticateAdmin, adminDeleteVisitTask);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, message: 'Critical internal server error occurred.' });
});

// Start Server
(async () => {
  try {
    await initializeDatabase();
    app.listen(port, () => {
      console.log(`🚀 Server is listening on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('❌ Failed to initialize database. Server cannot start:', err);
    process.exit(1);
  }
})();
