import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { sendNotification, broadcastNotification } from '../utils/notifications.js';

// Get administrative overview stats
export const getAdminStats = async (req, res) => {
  try {
    // 1. Total Users
    const [userCountRows] = await pool.query('SELECT COUNT(*) as count FROM users');
    
    // 2. Active Offers
    const [offerCountRows] = await pool.query('SELECT COUNT(*) as count FROM offers WHERE is_active = 1');

    // 3. Pending Withdrawals
    const [pendingWithdrawRows] = await pool.query('SELECT COUNT(*) as count FROM withdrawals WHERE status = "PENDING"');
    const [pendingWithdrawVal] = await pool.query('SELECT SUM(amount) as total FROM withdrawals WHERE status = "PENDING"');

    // 4. Pending Erasures (Account Deletions)
    let pendingErasureCount = 0;
    try {
      const [erasureCountRows] = await pool.query('SELECT COUNT(*) as count FROM deletion_requests WHERE status = "PENDING"');
      pendingErasureCount = erasureCountRows[0].count;
    } catch (e) {
      // Ignore if table does not exist yet
    }

    // 5. Total Settled Payouts (APPROVED)
    const [settledWithdrawVal] = await pool.query('SELECT SUM(amount) as total FROM withdrawals WHERE status = "APPROVED"');

    res.json({
      success: true,
      stats: {
        total_users: userCountRows[0].count,
        active_offers: offerCountRows[0].count,
        pending_withdrawals: pendingWithdrawRows[0].count,
        pending_withdrawals_value: parseFloat(pendingWithdrawVal[0].total || 0),
        pending_erasures: pendingErasureCount,
        settled_payouts_value: parseFloat(settledWithdrawVal[0].total || 0)
      }
    });
  } catch (error) {
    console.error('Get Admin Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// List/Search Users
export const listUsers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT id, uid, name, email, phone_number, balance, referral_code, referred_by, created_at FROM users';
    const params = [];

    if (search) {
      query += ' WHERE name LIKE ? OR email LIKE ? OR referral_code LIKE ?';
      const searchWild = `%${search.trim()}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    query += ' ORDER BY created_at DESC';
    const [users] = await pool.query(query, params);

    res.json({ success: true, users });
  } catch (error) {
    console.error('Admin List Users Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// View User Transactions Ledger
export const getUserTransactionsAdmin = async (req, res) => {
  try {
    const userId = req.params.id;
    const [rows] = await pool.query(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json({ success: true, transactions: rows });
  } catch (error) {
    console.error('Admin Get User Ledger Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Manually Modify User Balance
export const updateUserBalance = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.params.id;
    const { amount, type, description } = req.body;

    if (!amount || !type) {
      return res.status(400).json({ success: false, message: 'Amount and type are required' });
    }

    const adjustVal = parseFloat(amount);
    if (isNaN(adjustVal) || adjustVal <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be positive' });
    }

    await connection.beginTransaction();

    // 1. Verify user exists
    const [userRows] = await connection.query('SELECT name FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 2. Insert transaction
    const transId = uuidv4();
    const transType = type.toUpperCase() === 'CREDIT' ? 'CREDIT' : 'DEBIT';
    const source = 'DAILY_BONUS'; // Fallback manual source
    const descStr = description || `Manual adjustment by Admin (${transType})`;

    await connection.query(
      `INSERT INTO transactions (id, user_id, amount, type, source, description, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [transId, userId, adjustVal, transType, source, descStr]
    );

    // 3. Update balance
    const operator = transType === 'CREDIT' ? '+' : '-';
    await connection.query(
      `UPDATE users SET balance = balance ${operator} ? WHERE id = ?`,
      [adjustVal, userId]
    );

    await connection.commit();

    // Notify user of balance adjustment
    await sendNotification(
      userId,
      "Wallet Updated",
      `Your balance was adjusted by admin. Amount: ${transType === 'CREDIT' ? '+' : '-'}${adjustVal} coins.`
    );

    res.json({ success: true, message: 'User balance adjusted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Update Balance Error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  } finally {
    connection.release();
  }
};

// Create Offer (with Tiers)
export const createOffer = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      external_id, title, description, category, icon_url, tracking_url,
      total_reward, is_active, type, reward_type, estimated_time, difficulty, is_hot,
      tiers
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    await connection.beginTransaction();

    // If marked hot, turn off other hot offers
    if (is_hot) {
      await connection.query('UPDATE offers SET is_hot = 0');
    }

    const offerId = uuidv4();

    // 1. Insert Offer details
    await connection.query(
      `INSERT INTO offers (
        id, external_id, title, description, category, icon_url, tracking_url, 
        total_reward, is_active, type, reward_type, estimated_time, difficulty, is_hot, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        offerId,
        external_id || null,
        title,
        description || '',
        category || 'General',
        icon_url || '',
        tracking_url || '',
        parseFloat(total_reward || 0),
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        type || 'online',
        reward_type || 'Multi Reward',
        estimated_time || '',
        difficulty || 'Medium',
        is_hot ? 1 : 0
      ]
    );

    // 2. Insert associated Tiers if provided
    if (Array.isArray(tiers)) {
      for (const t of tiers) {
        const tierId = uuidv4();
        const stepsJson = t.steps ? JSON.stringify(t.steps) : '[]';

        await connection.query(
          `INSERT INTO offer_tiers (id, offer_id, tier_title, app_tier_title, reward, steps, sequence) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            tierId,
            offerId,
            t.backend_title || t.title,
            t.title,
            parseFloat(t.reward || 0),
            stepsJson,
            parseInt(t.sequence || 1)
          ]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Offer created successfully', offer_id: offerId });
  } catch (error) {
    await connection.rollback();
    console.error('Admin Create Offer Error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  } finally {
    connection.release();
  }
};

// Update Offer (replaces tiers)
export const updateOffer = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const offerId = req.params.id;
    const {
      external_id, title, description, category, icon_url, tracking_url,
      total_reward, is_active, type, reward_type, estimated_time, difficulty, is_hot,
      tiers
    } = req.body;

    await connection.beginTransaction();

    // Verify offer exists
    const [offerRows] = await connection.query('SELECT id FROM offers WHERE id = ?', [offerId]);
    if (offerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    // If marked hot, turn off other hot offers
    if (is_hot) {
      await connection.query('UPDATE offers SET is_hot = 0');
    }

    // 1. Update basic offer parameters
    await connection.query(
      `UPDATE offers SET 
        external_id = ?, title = ?, description = ?, category = ?, 
        icon_url = ?, tracking_url = ?, total_reward = ?, is_active = ?, 
        type = ?, reward_type = ?, estimated_time = ?, difficulty = ?, is_hot = ?
       WHERE id = ?`,
      [
        external_id || null,
        title,
        description || '',
        category || 'General',
        icon_url || '',
        tracking_url || '',
        parseFloat(total_reward || 0),
        is_active ? 1 : 0,
        type || 'online',
        reward_type || 'Multi Reward',
        estimated_time || '',
        difficulty || 'Medium',
        is_hot ? 1 : 0,
        offerId
      ]
    );

    // 2. Delete old tiers & insert new tiers if provided
    if (tiers !== undefined && Array.isArray(tiers)) {
      await connection.query('DELETE FROM offer_tiers WHERE offer_id = ?', [offerId]);

      for (const t of tiers) {
        const tierId = uuidv4();
        const stepsJson = t.steps ? JSON.stringify(t.steps) : '[]';

        await connection.query(
          `INSERT INTO offer_tiers (id, offer_id, tier_title, app_tier_title, reward, steps, sequence) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            tierId,
            offerId,
            t.backend_title || t.title,
            t.title,
            parseFloat(t.reward || 0),
            stepsJson,
            parseInt(t.sequence || 1)
          ]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Offer updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Admin Update Offer Error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  } finally {
    connection.release();
  }
};

// Delete Offer
export const deleteOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    
    // Cascading deletes on offer_tiers happens automatically if schema setup correctly,
    // otherwise we do hard delete
    await pool.query('DELETE FROM offer_tiers WHERE offer_id = ?', [offerId]);
    await pool.query('DELETE FROM offers WHERE id = ?', [offerId]);

    res.json({ success: true, message: 'Offer deleted successfully' });
  } catch (error) {
    console.error('Admin Delete Offer Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// List all withdrawals requests
export const listWithdrawals = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT w.id, w.user_id, w.amount, w.method, w.details, w.status, w.created_at,
             u.name as user_name, u.email as user_email
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
    `;
    const params = [];

    if (status) {
      query += ' WHERE w.status = ?';
      params.push(status);
    }

    query += ' ORDER BY w.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, withdrawals: rows });
  } catch (error) {
    console.error('Admin List Withdrawals Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Approve Withdrawal Request
export const approveWithdrawal = async (req, res) => {
  try {
    const withdrawalId = req.params.id;

    // 1. Verify withdrawal status is pending
    const [rows] = await pool.query('SELECT * FROM withdrawals WHERE id = ? LIMIT 1', [withdrawalId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }
    const withdrawal = rows[0];

    if (withdrawal.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Withdrawal request already processed' });
    }

    // 2. Mark as APPROVED
    await pool.query('UPDATE withdrawals SET status = "APPROVED" WHERE id = ?', [withdrawalId]);

    // Send push notification
    await sendNotification(
      withdrawal.user_id,
      "Withdrawal Settled",
      `Your payout withdrawal of ₹${parseFloat(withdrawal.amount).toFixed(2)} was successfully processed!`
    );

    res.json({ success: true, message: 'Withdrawal approved successfully' });
  } catch (error) {
    console.error('Admin Approve Withdrawal Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Reject Withdrawal Request (Refunds balance)
export const rejectWithdrawal = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const withdrawalId = req.params.id;
    const { reason } = req.body;

    await connection.beginTransaction();

    // 1. Verify pending status
    const [rows] = await connection.query('SELECT * FROM withdrawals WHERE id = ? LIMIT 1 FOR UPDATE', [withdrawalId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }
    const withdrawal = rows[0];

    if (withdrawal.status !== 'PENDING') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Withdrawal request already processed' });
    }

    // 2. Mark withdrawal status as REJECTED
    await connection.query('UPDATE withdrawals SET status = "REJECTED" WHERE id = ?', [withdrawalId]);

    // 3. Refund User balance - Create CREDIT transaction
    const transId = uuidv4();
    const refundAmt = parseFloat(withdrawal.amount);
    const refundReason = reason || 'Payout request rejected';

    await connection.query(
      `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at) 
       VALUES (?, ?, ?, 'CREDIT', 'WITHDRAWAL', ?, ?, NOW())`,
      [
        transId,
        withdrawal.user_id,
        refundAmt,
        `Refund: ${refundReason}`,
        withdrawalId
      ]
    );

    // 4. Update user balance
    await connection.query(
      'UPDATE users SET balance = balance + ? WHERE id = ?',
      [refundAmt, withdrawal.user_id]
    );

    await connection.commit();

    // Send push notification
    await sendNotification(
      withdrawal.user_id,
      "Withdrawal Rejected",
      `Your withdrawal request was rejected and ₹${refundAmt.toFixed(2)} was refunded to your wallet.`
    );

    res.json({ success: true, message: 'Withdrawal rejected and balance refunded successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Admin Reject Withdrawal Error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  } finally {
    connection.release();
  }
};

// List erasure/account deletion requests
export const listErasureRequests = async (req, res) => {
  try {
    // Ensure table exists
    await pool.query(
      `CREATE TABLE IF NOT EXISTS deletion_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id CHAR(36),
        email VARCHAR(255) NOT NULL,
        reason TEXT,
        status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );

    const [rows] = await pool.query('SELECT * FROM deletion_requests ORDER BY created_at DESC');
    res.json({ success: true, requests: rows });
  } catch (error) {
    console.error('Admin List Deletion Requests Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Approve Erasure (Hard Purge User!)
export const approveErasureRequest = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const requestId = req.params.id;

    // Verify request
    const [reqRows] = await connection.query('SELECT * FROM deletion_requests WHERE id = ? LIMIT 1', [requestId]);
    if (reqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Erasure request not found' });
    }
    const request = reqRows[0];

    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    await connection.beginTransaction();

    let userId = request.user_id;
    if (!userId) {
      const [uRows] = await connection.query('SELECT id FROM users WHERE email = ? LIMIT 1', [request.email]);
      if (uRows.length > 0) {
        userId = uRows[0].id;
      }
    }

    // Purge user data (cascade deletes should trigger if foreign keys have ON DELETE CASCADE,
    // otherwise we clear records manually for safety)
    if (userId) {
      await connection.query('DELETE FROM transactions WHERE user_id = ?', [userId]);
      await connection.query('DELETE FROM withdrawals WHERE user_id = ?', [userId]);
      await connection.query('DELETE FROM user_offer_progress WHERE user_id = ?', [userId]);
      await connection.query('DELETE FROM referral_uses WHERE referrer_id = ? OR referred_user_id = ?', [userId, userId]);
      await connection.query('DELETE FROM offer_likes WHERE user_id = ?', [userId]);
      await connection.query('DELETE FROM users WHERE id = ?', [userId]);
    }

    // Update status to APPROVED
    await connection.query('UPDATE deletion_requests SET status = "APPROVED" WHERE id = ?', [requestId]);

    await connection.commit();
    res.json({ success: true, message: 'User account and transaction history purged successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Admin Approve Erasure Error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  } finally {
    connection.release();
  }
};

// Reject Erasure (Dismiss)
export const rejectErasureRequest = async (req, res) => {
  try {
    const requestId = req.params.id;

    await pool.query('UPDATE deletion_requests SET status = "REJECTED" WHERE id = ?', [requestId]);

    res.json({ success: true, message: 'Deletion request dismissed and user retained' });
  } catch (error) {
    console.error('Admin Reject Erasure Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Trigger FCM Push Notifications
export const triggerPushNotification = async (req, res) => {
  try {
    const { title, body, user_id } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required' });
    }

    if (user_id) {
      // Send to specific user
      const success = await sendNotification(user_id, title, body);
      if (success) {
        return res.json({ success: true, message: 'Push notification sent to specific user successfully' });
      } else {
        return res.status(500).json({ success: false, message: 'Failed to send push notification' });
      }
    } else {
      // Broadcast globally
      const success = await broadcastNotification(title, body);
      if (success) {
        return res.json({ success: true, message: 'Global broadcast notification sent successfully' });
      } else {
        return res.status(500).json({ success: false, message: 'Failed to broadcast notifications' });
      }
    }
  } catch (error) {
    console.error('Admin Push Notification Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
