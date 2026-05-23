import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { sendNotification } from '../utils/notifications.js';
import { sendAdminTelegramAlert } from '../utils/telegram.js';

// Constant-time string comparison to prevent timing attacks
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (e) {
    return false;
  }
}

// Helper: Resolve User by uid, falling back to ID if not found
async function resolveUser(connection, userIdParam) {
  if (!userIdParam) return null;
  // Try by UID first
  const [rowsByUid] = await connection.query('SELECT * FROM users WHERE uid = ? LIMIT 1', [userIdParam]);
  if (rowsByUid.length > 0) return rowsByUid[0];

  // Try by ID
  const [rowsById] = await connection.query('SELECT * FROM users WHERE id = ? LIMIT 1', [userIdParam]);
  if (rowsById.length > 0) return rowsById[0];

  return null;
}

// Helper: Check if completion transaction already exists in offer_completions (Idempotency)
async function completionExists(connection, completionId) {
  const [rows] = await connection.query('SELECT id FROM offer_completions WHERE completion_id = ? LIMIT 1', [completionId]);
  return rows.length > 0;
}

// =========================================================================
// 1. GENERIC POSTBACK (Original Node.js Implementation)
// =========================================================================
export const handlePostback = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { click_id, tier_title } = req.body || req.query;

    if (!click_id || !tier_title) {
      return res.status(400).json({ success: false, message: 'Missing click_id or tier_title' });
    }

    await connection.beginTransaction();

    const [progressRows] = await connection.query(
      'SELECT * FROM user_offer_progress WHERE click_id = ? LIMIT 1 FOR UPDATE',
      [click_id]
    );

    if (progressRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Invalid Click ID' });
    }

    const progress = progressRows[0];
    const { offer_id, user_id } = progress;
    
    let completedTiers = [];
    if (progress.completed_tiers) {
      try {
        completedTiers = typeof progress.completed_tiers === 'string' 
          ? JSON.parse(progress.completed_tiers) 
          : progress.completed_tiers;
      } catch (e) {
        completedTiers = [];
      }
    }

    const isAlreadyCompleted = completedTiers.some(ct => 
      ct.title.toLowerCase().trim() === tier_title.toLowerCase().trim()
    );

    if (isAlreadyCompleted) {
      await connection.rollback();
      return res.json({ success: true, message: 'Tier already completed (idempotent)' });
    }

    const [tierRows] = await connection.query(
      'SELECT * FROM offer_tiers WHERE offer_id = ? AND LOWER(tier_title) = LOWER(?) LIMIT 1',
      [offer_id, tier_title.trim()]
    );

    if (tierRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Tier not found for this offer' });
    }

    const tier = tierRows[0];
    const reward = parseFloat(tier.reward || 0);

    completedTiers.push({
      title: tier.tier_title,
      reward: reward,
      completed_at: new Date().toISOString()
    });

    const completedTiersJson = JSON.stringify(completedTiers);

    const [allTiersRows] = await connection.query('SELECT tier_title FROM offer_tiers WHERE offer_id = ?', [offer_id]);
    const allTierTitles = allTiersRows.map(r => r.tier_title.toLowerCase().trim());
    const completedTitles = completedTiers.map(ct => ct.title.toLowerCase().trim());

    const isAllCompleted = allTierTitles.every(t => completedTitles.includes(t));
    const finalStatus = isAllCompleted ? 'COMPLETED' : 'STARTED';

    await connection.query(
      'UPDATE user_offer_progress SET completed_tiers = ?, status = ?, last_updated = NOW() WHERE click_id = ?',
      [completedTiersJson, finalStatus, click_id]
    );

    await connection.query(
      'UPDATE users SET balance = balance + ? WHERE id = ?',
      [reward, user_id]
    );

    const transId = uuidv4();
    const displayTitle = tier.app_tier_title || tier.tier_title;
    await connection.query(
      `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at) 
       VALUES (?, ?, ?, 'CREDIT', 'OFFER', ?, ?, NOW())`,
      [transId, user_id, reward, `Completed: ${displayTitle}`, click_id]
    );

    await connection.commit();

    await sendNotification(
      user_id,
      "Coins Received!",
      `You earned ${reward.toFixed(0)} coins for completing ${displayTitle}.`
    );

    processReferralRewards(user_id, reward, offer_id).catch(err => 
      console.error('Error processing referral rewards:', err.message)
    );

    res.json({
      success: true,
      message: 'Tier completed and user credited successfully',
      reward: reward
    });
  } catch (error) {
    await connection.rollback();
    console.error('Postback Error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  } finally {
    connection.release();
  }
};

// =========================================================================
// 2. PUBSCALE SURVEY/OFFER POSTBACK (GET)
// =========================================================================
export const handlePubscale = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const PUB_SECRET_KEY = "5e3b39c2-755c-40ba-8c96-6b9d2e60a166";
    const { user_id, value, token, signature, offer_name = 'External Offer', goal_name = '', gaid = '', ip = '' } = req.query;

    if (!user_id || !token || !signature) {
      return res.status(400).json({ status: 'error', message: 'Missing required parameters' });
    }

    // Signature Logic: secret_key . user_id . int_value . token
    const intValue = Math.floor(parseFloat(value || 0));
    const dataString = `${PUB_SECRET_KEY}.${user_id}.${intValue}.${token}`;
    const calculatedSig = crypto.createHash('md5').update(dataString).digest('hex');

    if (!safeCompare(signature, calculatedSig)) {
      return res.status(403).json({ status: 'error', message: 'Invalid Signature' });
    }

    const user = await resolveUser(connection, user_id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const internalId = user.id;

    // Check Duplicate
    if (await completionExists(connection, token)) {
      return res.status(200).json({ status: 'success', message: 'Duplicate token ignored' });
    }

    await connection.beginTransaction();

    // Record Completion
    const reward = parseFloat(value || 0);
    await connection.query(
      `INSERT INTO offer_completions (completion_id, user_id, offer_id, provider, payout_coins, status, raw_payload, offer_name, goal_name, gaid, ip_address)
       VALUES (?, ?, '0', 'pubscale', ?, 'COMPLETED', ?, ?, ?, ?, ?)`,
      [token, internalId, reward, JSON.stringify(req.query), offer_name, goal_name, gaid, ip]
    );

    // Credit Balance
    await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [reward, internalId]);

    // Transaction Log
    const transId = uuidv4();
    await connection.query(
      `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at)
       VALUES (?, ?, ?, 'CREDIT', 'PUBSCALE', ?, ?, NOW())`,
      [transId, internalId, reward, `PubScale Offer: ${offer_name}`, token]
    );

    await connection.commit();

    // Admin Alert
    sendAdminTelegramAlert(`✅ <b>PubScale Completion</b>\nUser: ${internalId} (UID: ${user_id})\nAmount: ${reward}\nOffer: ${offer_name}`).catch(console.error);

    // User Notification
    sendNotification(internalId, "Pubscale Offer Completed! 🪙", `You received ${reward} coins from ${offer_name}`).catch(console.error);

    // Process Referral
    processReferralRewards(internalId, reward, '0').catch(err => console.error('Referral Commission error:', err.message));

    return res.status(200).json({ status: 'success', message: 'User rewarded successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('PubScale Webhook Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  } finally {
    connection.release();
  }
};

// =========================================================================
// 3. PUBSCALE CHARGEBACK/REVERSAL POSTBACK (GET)
// =========================================================================
export const handlePubscaleChargeback = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const PUB_SECRET_KEY = "5e3b39c2-755c-40ba-8c96-6b9d2e60a166";
    const { user_id, value, token, signature, offer_name = 'External Offer', reason = 'Reversed by provider', gaid = '', ip = '' } = req.query;

    if (!user_id || !token || !signature) {
      return res.status(400).json({ status: 'error', message: 'Missing required parameters' });
    }

    const intValue = Math.floor(parseFloat(value || 0));
    const dataString = `${PUB_SECRET_KEY}.${user_id}.${intValue}.${token}`;
    const calculatedSig = crypto.createHash('md5').update(dataString).digest('hex');

    if (!safeCompare(signature, calculatedSig)) {
      return res.status(403).json({ status: 'error', message: 'Invalid Signature' });
    }

    const user = await resolveUser(connection, user_id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const internalId = user.id;

    const [origRows] = await connection.query('SELECT * FROM offer_completions WHERE completion_id = ? LIMIT 1', [token]);
    if (origRows.length > 0 && origRows[0].status === 'REVERSED') {
      return res.status(200).json({ status: 'success', message: 'Already reversed' });
    }

    await connection.beginTransaction();

    // Update Status to REVERSED
    await connection.query('UPDATE offer_completions SET status = "REVERSED" WHERE completion_id = ?', [token]);

    // Deduct Balance
    const deduction = parseFloat(value || 0);
    await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [deduction, internalId]);

    // Transaction Ledger (DEBIT)
    const transId = uuidv4();
    const finalOfferName = (origRows.length > 0 && origRows[0].offer_name) ? origRows[0].offer_name : offer_name;
    const description = `Chargeback: ${finalOfferName} (${reason})`;
    await connection.query(
      `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at)
       VALUES (?, ?, ?, 'DEBIT', 'PUBSCALE_REVERSAL', ?, ?, NOW())`,
      [transId, internalId, deduction, description, token]
    );

    await connection.commit();

    // Admin Alert
    sendAdminTelegramAlert(`🚨 <b>PubScale Chargeback</b>\nUser: ${internalId} (UID: ${user_id})\nAmount: ${deduction}\nReason: ${reason}\nOffer: ${finalOfferName}`).catch(console.error);

    // Notification
    sendNotification(internalId, "Action Required: Points Reversed ❗", `Points for '${finalOfferName}' were reversed by the provider.`).catch(console.error);

    return res.status(200).json({ status: 'success', message: 'Chargeback processed successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('PubScale Chargeback Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  } finally {
    connection.release();
  }
};

// =========================================================================
// 4. CPX RESEARCH SURVEY POSTBACK (GET)
// =========================================================================
export const handleCpxResearch = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const CPX_SECURE_HASH = "c61DO2Aq2vD6kZZ9OlLZzNtiXPoDrh2R";
    const { status, trans_id, user_id, amount_local = 0, hash, type = '', offer_id = '' } = req.query;

    console.log('[CPX_RESEARCH] Incoming:', req.query);

    if (!trans_id || !user_id || !hash) {
      return res.send('missing_parameters');
    }

    // Signature logic: md5(trans_id - secure_hash) or raw secure_hash for testing
    const expectedHash = crypto.createHash('md5').update(`${trans_id}-${CPX_SECURE_HASH}`).digest('hex');

    if (!safeCompare(hash, expectedHash) && hash !== CPX_SECURE_HASH) {
      console.warn('[CPX_RESEARCH] Signature Mismatch');
      return res.send('invalid_hash');
    }

    // Reversal Case (status: 2 = canceled, -2 = fraud)
    if (status === '2' || status === '-2') {
      const [origRows] = await connection.query(
        `SELECT oc.*, t.amount, t.user_id 
         FROM offer_completions oc 
         LEFT JOIN transactions t ON t.reference_id = oc.completion_id 
         WHERE oc.completion_id = ? LIMIT 1`,
        [trans_id]
      );

      if (origRows.length === 0) {
        return res.send('OK'); // Return OK to acknowledge non-existent
      }

      const orig = origRows[0];
      if (orig.status === 'REVERSED' || orig.status === 'FRAUD') {
        return res.send('OK');
      }

      await connection.beginTransaction();

      const reversalStatus = status === '-2' ? 'FRAUD' : 'REVERSED';
      await connection.query('UPDATE offer_completions SET status = ? WHERE completion_id = ?', [reversalStatus, trans_id]);

      const amount = parseFloat(orig.amount || amount_local || 0);
      await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, orig.user_id]);

      const transId = uuidv4();
      const reason = status === '-2' ? 'CPX Survey Reversal (Fraud)' : 'CPX Survey Reversal (Canceled)';
      await connection.query(
        `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at)
         VALUES (?, ?, ?, 'DEBIT', 'CPX_RESEARCH_REVERSAL', ?, ?, NOW())`,
        [transId, orig.user_id, amount, reason, trans_id]
      );

      await connection.commit();

      sendAdminTelegramAlert(`🚨 <b>CPX Reversal</b>\nUser: ${orig.user_id}\nAmount: ${amount}\nReason: ${reason}\nTransID: ${trans_id}`).catch(console.error);

      sendNotification(orig.user_id, "Survey Reversal ⚠️", `A CPX Research survey reward of ${amount} coins was reversed.`).catch(console.error);

      return res.send('OK');
    }

    // Success Case (status === '1')
    if (status !== '1') {
      return res.send('OK');
    }

    const user = await resolveUser(connection, user_id);
    if (!user) {
      return res.send('user_not_found');
    }

    const internalId = user.id;

    if (await completionExists(connection, trans_id)) {
      return res.send('OK');
    }

    await connection.beginTransaction();

    const reward = parseFloat(amount_local || 0);
    await connection.query(
      `INSERT INTO offer_completions (completion_id, user_id, offer_id, provider, payout_coins, status, raw_payload, offer_name, goal_name, gaid, ip_address)
       VALUES (?, ?, '0', 'cpx_research', ?, 'COMPLETED', ?, 'CPX Survey Reward', ?, NULL, ?)`,
      [trans_id, internalId, reward, JSON.stringify(req.query), type || 'Survey Completion', req.ip || 'unknown']
    );

    await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [reward, internalId]);

    const transId = uuidv4();
    await connection.query(
      `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at)
       VALUES (?, ?, ?, 'CREDIT', 'CPX_RESEARCH', 'CPX Survey Reward', ?, NOW())`,
      [transId, internalId, reward, trans_id]
    );

    await connection.commit();

    sendAdminTelegramAlert(`✅ <b>CPX Completion</b>\nUser: ${internalId} (UID: ${user_id})\nAmount: ${reward}\nOffer: Survey/Offer\nTransID: ${trans_id}`).catch(console.error);

    sendNotification(internalId, "Survey Reward! 📝", `You earned ${reward} coins for completing a CPX Research survey`).catch(console.error);

    processReferralRewards(internalId, reward, '0').catch(err => console.error('CPX Referral Commission error:', err.message));

    return res.send('OK');
  } catch (error) {
    await connection.rollback();
    console.error('[CPX_RESEARCH] Webhook error:', error);
    return res.send('internal_error');
  } finally {
    connection.release();
  }
};

// =========================================================================
// 5. ADJUMP POSTBACK (GET)
// =========================================================================
export const handleAdjump = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const user_id_param = req.query.user_id || req.query.userid || '';
    const rewardParam = req.query.reward || req.query.reward_amount || 0;
    let transaction_id = req.query.transaction_id || '';
    const campaign = req.query.campaign || 'Adjump Offer';
    const offer_id_param = req.query.offer_id || 0;

    if (!user_id_param || !rewardParam) {
      return res.status(400).json({ status: 'error', message: 'Missing required parameters' });
    }

    if (!transaction_id) {
      const todayHour = new Date().toISOString().substring(0, 13); // format YYYY-MM-DDTHH
      const fakeSig = crypto.createHash('md5').update(`${user_id_param}${rewardParam}${campaign}${todayHour}`).digest('hex');
      transaction_id = `ADJ_${fakeSig}`;
    }

    const user = await resolveUser(connection, user_id_param);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const internalId = user.id;

    if (await completionExists(connection, transaction_id)) {
      return res.status(200).json({ status: 'success', message: 'Duplicate transaction ignored' });
    }

    await connection.beginTransaction();

    const reward = parseFloat(rewardParam || 0);
    await connection.query(
      `INSERT INTO offer_completions (completion_id, user_id, offer_id, provider, payout_coins, status, raw_payload, offer_name, goal_name, gaid, ip_address)
       VALUES (?, ?, ?, 'adjump', ?, 'COMPLETED', ?, ?, 'Offer Completion', ?, ?)`,
      [transaction_id, internalId, offer_id_param, reward, JSON.stringify(req.query), campaign, req.query.gaid || '', req.ip || 'unknown']
    );

    await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [reward, internalId]);

    const transId = uuidv4();
    await connection.query(
      `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at)
       VALUES (?, ?, ?, 'CREDIT', 'ADJUMP', ?, ?, NOW())`,
      [transId, internalId, reward, `Adjump: ${campaign}`, transaction_id]
    );

    await connection.commit();

    sendAdminTelegramAlert(`✅ <b>Adjump Completion</b>\nUser: ${internalId} (UID: ${user_id_param})\nAmount: ${reward} coins\nOffer: ${campaign}\nID: ${transaction_id}`).catch(console.error);

    sendNotification(internalId, "Adjump Reward Received! 🪙", `You received ${reward} coins for completing an offer on Adjump`).catch(console.error);

    processReferralRewards(internalId, reward, '0').catch(err => console.error('Adjump Referral Commission error:', err.message));

    return res.status(200).json({ status: 'success', message: 'User rewarded successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Adjump Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  } finally {
    connection.release();
  }
};

// =========================================================================
// 6. OFFERMARU POSTBACK (GET)
// =========================================================================
export const handleOffermaru = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const OFFERMARU_SECRET = process.env.OFFERMARU_S2S_SECRET || "b38c7127c0b72528637466fd703e2eac90a7b033b54339a7399709292f2c8043";
    const signatureHeader = req.headers['x-offermaru-signature'] || req.headers['X-Offermaru-Signature'] || '';

    const { user_id, user_reward = 0, offer_id = '', offer_name = 'Offermaru Offer', transaction_id, publisher_payout = 0, timestamp = 0 } = req.query;

    if (!user_id || !transaction_id) {
      return res.status(400).json({ status: 'error', message: 'Missing required parameters' });
    }

    // Replay attack protection (5 mins)
    const timeDiff = Math.abs(Date.now() - parseInt(timestamp));
    if (timeDiff > 300000) {
      return res.status(403).json({ status: 'error', message: 'Callback too old' });
    }

    // Signature HMAC verification
    if (OFFERMARU_SECRET && signatureHeader) {
      const payload = {
        offer_id,
        publisher_payout,
        timestamp,
        transaction_id,
        user_id,
        user_reward
      };

      const sortedKeys = Object.keys(payload).sort();
      const baseString = sortedKeys.map(k => `${k}=${payload[k]}`).join('&');
      const expectedSignature = crypto.createHmac('sha256', OFFERMARU_SECRET).update(baseString).digest('hex');

      if (!safeCompare(signatureHeader, expectedSignature)) {
        return res.status(403).json({ status: 'error', message: 'Invalid Signature' });
      }
    } else if (OFFERMARU_SECRET && !signatureHeader) {
      return res.status(403).json({ status: 'error', message: 'Missing Signature' });
    }

    const user = await resolveUser(connection, user_id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const internalId = user.id;

    if (await completionExists(connection, transaction_id)) {
      return res.send('OK');
    }

    await connection.beginTransaction();

    const reward = parseFloat(user_reward || 0);
    await connection.query(
      `INSERT INTO offer_completions (completion_id, user_id, offer_id, provider, payout_coins, status, raw_payload, offer_name, goal_name, gaid, ip_address)
       VALUES (?, ?, '0', 'offermaru', ?, 'COMPLETED', ?, ?, NULL, NULL, ?)`,
      [transaction_id, internalId, reward, JSON.stringify(req.query), offer_name, req.ip || 'unknown']
    );

    await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [reward, internalId]);

    const transId = uuidv4();
    await connection.query(
      `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at)
       VALUES (?, ?, ?, 'CREDIT', 'OFFERMARU', ?, ?, NOW())`,
      [transId, internalId, reward, `Offermaru: ${offer_name}`, transaction_id]
    );

    await connection.commit();

    sendAdminTelegramAlert(`✅ <b>Offermaru Completion</b>\nUser: ${internalId} (UID: ${user_id})\nAmount: ${reward}\nOffer: ${offer_name}`).catch(console.error);

    sendNotification(internalId, "Offermaru Reward! 💎", `You received ${reward} coins for completing '${offer_name}'`).catch(console.error);

    processReferralRewards(internalId, reward, '0').catch(err => console.error('Offermaru Referral Commission error:', err.message));

    return res.send('OK');
  } catch (error) {
    await connection.rollback();
    console.error('Offermaru error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  } finally {
    connection.release();
  }
};

// =========================================================================
// 7. GROWDECK PLAYTIME POSTBACK (GET)
// =========================================================================
export const handleGrowdeck = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const GROWDECK_SECRET_KEY = "30a11d6e8a666dd4bf5d6a4ab0a899";
    const { user_id, reward, transaction_id, signature, campaign = 'GrowDeck Playtime', offer_id = 0, click_ip = '', gaid = '' } = req.query;

    if (!user_id || !transaction_id || !signature) {
      return res.status(400).json({ status: 'error', message: 'Missing required parameters' });
    }

    // Signature HMAC-SHA256: secretKey . user_id . trunc(reward) . transaction_id
    const rewardTrunc = Math.trunc(parseFloat(reward || 0));
    const template = `${GROWDECK_SECRET_KEY}.${user_id}.${rewardTrunc}.${transaction_id}`;
    const calculatedSig = crypto.createHmac('sha256', GROWDECK_SECRET_KEY).update(template).digest('hex');

    if (!safeCompare(signature, calculatedSig)) {
      return res.status(403).json({ status: 'error', message: 'Invalid Signature' });
    }

    const user = await resolveUser(connection, user_id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const internalId = user.id;

    if (await completionExists(connection, transaction_id)) {
      return res.status(200).json({ status: 'success', message: 'Duplicate transaction ignored' });
    }

    await connection.beginTransaction();

    const payout = parseFloat(reward || 0);
    const clientIp = click_ip || req.ip || 'unknown';
    await connection.query(
      `INSERT INTO offer_completions (completion_id, user_id, offer_id, provider, payout_coins, status, raw_payload, offer_name, goal_name, gaid, ip_address)
       VALUES (?, ?, ?, 'growdeck', ?, 'COMPLETED', ?, ?, 'Playtime Reward', ?, ?)`,
      [transaction_id, internalId, offer_id, payout, JSON.stringify(req.query), campaign, gaid, clientIp]
    );

    await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [payout, internalId]);

    const transId = uuidv4();
    await connection.query(
      `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at)
       VALUES (?, ?, ?, 'CREDIT', 'GROWDECK', ?, ?, NOW())`,
      [transId, internalId, payout, `GrowDeck: ${campaign}`, transaction_id]
    );

    await connection.commit();

    sendAdminTelegramAlert(`✅ <b>GrowDeck Completion</b>\nUser: ${internalId} (UID: ${user_id})\nAmount: ${payout} coins\nOffer: ${campaign}\nTransaction: ${transaction_id}`).catch(console.error);

    sendNotification(internalId, "GrowDeck Reward Received! 🪙", `You received ${payout} coins from GrowDeck Playtime`).catch(console.error);

    processReferralRewards(internalId, payout, '0').catch(err => console.error('GrowDeck Referral Commission error:', err.message));

    return res.status(200).json({ status: 'success', message: 'User rewarded successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('GrowDeck error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  } finally {
    connection.release();
  }
};

// =========================================================================
// 8. OPINION UNIVERSE SURVEY POSTBACK (GET)
// =========================================================================
export const handleOpinionUniverse = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const OPINION_UNIVERSE_TOKEN = "edeb747df552564cf19058001f70a64d0f7c51347c1d6a5f2da3fb669995a2c5";
    const ENABLE_SIGNATURE_VERIFICATION = false;

    const user_id = req.query.userid || req.query.SID || '';
    const payoutParam = req.query.PAYOUT || 0;
    const offer_id = req.query.OFFERID || '';
    const offer_name = req.query.offername || 'Opinion Universe Offer';
    let transaction_id = req.query.TransactionID || '';
    const status = req.query.STATUS || '1';
    const event_name = req.query.eventname || '';
    const ip_address = req.query.IP || '';
    const gaid = req.query.gaid || '';
    const signature = req.query.SIG || '';

    // Check placeholder / test callback
    const isTestCallback = (user_id.includes('{') || String(payoutParam).includes('{'));
    if (isTestCallback) {
      return res.send('1');
    }

    if (transaction_id.includes('{') || !transaction_id) {
      transaction_id = `OU_${user_id}_${offer_id}_${payoutParam}_${Date.now()}`;
    }

    if (!user_id || !transaction_id) {
      return res.status(400).send('0');
    }

    // Optional signature check
    if (ENABLE_SIGNATURE_VERIFICATION && signature) {
      const params = { ...req.query };
      delete params.SIG;
      const sortedKeys = Object.keys(params).sort();
      const queryString = sortedKeys.map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
      const expectedSig = crypto.createHash('sha256').update(queryString + OPINION_UNIVERSE_TOKEN).digest('hex');

      if (!safeCompare(signature, expectedSig)) {
        return res.status(403).send('0');
      }
    }

    // Reversal case
    if (status === '2') {
      const [origRows] = await connection.query('SELECT * FROM offer_completions WHERE completion_id = ? LIMIT 1', [transaction_id]);
      if (origRows.length > 0) {
        const orig = origRows[0];
        if (orig.status !== 'REVERSED') {
          await connection.beginTransaction();
          await connection.query('UPDATE offer_completions SET status = "REVERSED" WHERE completion_id = ?', [transaction_id]);
          const deduction = parseFloat(orig.payout_coins || payoutParam || 0);
          await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [deduction, orig.user_id]);
          
          const transId = uuidv4();
          await connection.query(
            `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at)
             VALUES (?, ?, ?, 'DEBIT', 'OPINION_UNIVERSE_REVERSAL', ?, ?, NOW())`,
            [transId, orig.user_id, deduction, `Chargeback: Opinion Universe (${offer_name})`, transaction_id]
          );
          await connection.commit();
          
          sendNotification(orig.user_id, "Action Required: Points Reversed ❗", `Points for Opinion Universe '${offer_name}' were reversed.`).catch(console.error);
        }
      }
      sendAdminTelegramAlert(`🚨 <b>Opinion Universe Reversal</b>\nUser: ${user_id}\nAmount: ${payoutParam}\nOffer: ${offer_name}`).catch(console.error);
      return res.send('1');
    }

    const user = await resolveUser(connection, user_id);
    if (!user) {
      return res.status(404).send('0');
    }

    const internalId = user.id;

    if (await completionExists(connection, transaction_id)) {
      return res.send('1');
    }

    await connection.beginTransaction();

    const reward = parseFloat(payoutParam || 0);
    const clientIp = ip_address || req.ip || 'unknown';
    await connection.query(
      `INSERT INTO offer_completions (completion_id, user_id, offer_id, provider, payout_coins, status, raw_payload, offer_name, goal_name, gaid, ip_address)
       VALUES (?, ?, '0', 'opinionuniverse', ?, 'COMPLETED', ?, ?, ?, ?, ?)`,
      [transaction_id, internalId, reward, JSON.stringify(req.query), offer_name, event_name, gaid, clientIp]
    );

    await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [reward, internalId]);

    const transId = uuidv4();
    await connection.query(
      `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at)
       VALUES (?, ?, ?, 'CREDIT', 'OPINION_UNIVERSE', ?, ?, NOW())`,
      [transId, internalId, reward, `Opinion Universe: ${offer_name}`, transaction_id]
    );

    await connection.commit();

    sendAdminTelegramAlert(`✅ <b>Opinion Universe Completion</b>\nUser: ${internalId} (UID: ${user_id})\nAmount: ${reward}\nOffer: ${offer_name}`).catch(console.error);

    sendNotification(internalId, "Opinion Universe Reward! 💎", `You received ${reward} coins for completing '${offer_name}'`).catch(console.error);

    processReferralRewards(internalId, reward, '0').catch(err => console.error('Opinion Universe Referral Commission error:', err.message));

    return res.send('1');
  } catch (error) {
    await connection.rollback();
    console.error('Opinion Universe Webhook Error:', error);
    return res.send('0');
  } finally {
    connection.release();
  }
};

// =========================================================================
// 9. PLAYTIME ADS MILESTONE POSTBACK (GET/POST)
// =========================================================================
export const handlePlaytimeAds = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const params = { ...req.query, ...req.body };
    const { user_id, offer_id = '', offer_name = 'Playtime Offer', amount = 0, signature, task_id = '', task_name = '' } = params;

    const APPLICATION_KEY = process.env.PLAYTIME_APP_KEY || "59c2f0110111f993";
    const APPLICATION_SECRET_KEY = process.env.PLAYTIME_APP_SECRET || "3QDAWT60JYHQ2IWZ";

    if (!user_id || !amount || !signature) {
      return res.status(400).json({ status: 'error', message: 'Missing required parameters' });
    }

    // Signature logic: sha1(user_id + offer_id + amount + app_key + app_secret)
    const rawString = `${user_id}${offer_id}${amount}${APPLICATION_KEY}${APPLICATION_SECRET_KEY}`;
    const calculatedSig = crypto.createHash('sha1').update(rawString).digest('hex');

    if (!safeCompare(signature, calculatedSig)) {
      return res.status(403).json({ status: 'error', message: 'Signature verification failed' });
    }

    const transaction_id = `PLAYTIME_${crypto.createHash('md5').update(`${user_id}${offer_id}${task_id}${amount}${task_name}`).digest('hex')}`;

    const user = await resolveUser(connection, user_id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const internalId = user.id;

    if (await completionExists(connection, transaction_id)) {
      return res.status(200).json({ status: 'success', message: 'Duplicate transaction ignored' });
    }

    await connection.beginTransaction();

    const payout = parseFloat(amount || 0);
    const fullOfferName = task_name ? `${offer_name} - ${task_name}` : offer_name;

    await connection.query(
      `INSERT INTO offer_completions (completion_id, user_id, offer_id, provider, payout_coins, status, raw_payload, offer_name, goal_name, gaid, ip_address)
       VALUES (?, ?, ?, 'playtimeads', ?, 'COMPLETED', ?, ?, 'Playtime Milestone', '', ?)`,
      [transaction_id, internalId, offer_id, payout, JSON.stringify(params), fullOfferName, req.ip || 'unknown']
    );

    await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [payout, internalId]);

    const transId = uuidv4();
    await connection.query(
      `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at)
       VALUES (?, ?, ?, 'CREDIT', 'PLAYTIME', ?, ?, NOW())`,
      [transId, internalId, payout, `Playtime: ${fullOfferName}`, transaction_id]
    );

    await connection.commit();

    sendAdminTelegramAlert(`✅ <b>Playtime Ads Reward</b>\nUser: ${internalId}\nAmount: ${payout} coins\nOffer: ${offer_name}\nTask: ${task_name}`).catch(console.error);

    sendNotification(internalId, "Playtime Reward Received! 🎮", `You received ${payout} coins for playing ${offer_name} (${task_name || 'Milestone'})`).catch(console.error);

    processReferralRewards(internalId, payout, '0').catch(err => console.error('Playtime Referral Commission error:', err.message));

    return res.status(200).json({ status: 'success', message: 'User rewarded successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Playtime Ads Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  } finally {
    connection.release();
  }
};

// =========================================================================
// 10. POCKETSFULL REWARD/CHARGEBACK POSTBACK (GET/POST)
// =========================================================================
export const handlePocketsfull = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const params = { ...req.query, ...req.body };
    const { status, trans_id, user_id, amount_local = 0, hash, offer_id = '', type = 'Offer' } = params;

    const POCKETSFULL_SECURE_HASH = "32bd6747585ce63889cc74de8bdc6b4e";

    if (!trans_id || !user_id || !status || !hash) {
      return res.status(400).json({ status: 'error', message: 'Missing required parameters' });
    }

    // Signature check: md5(trans_id - secure_hash)
    const expectedHash = crypto.createHash('md5').update(`${trans_id}-${POCKETSFULL_SECURE_HASH}`).digest('hex');

    if (!safeCompare(hash, expectedHash)) {
      return res.status(403).json({ status: 'error', message: 'Signature verification failed' });
    }

    const user = await resolveUser(connection, user_id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const internalId = user.id;

    // A: Approved/Completed Flow
    if (status.toLowerCase() === 'approved' || status.toLowerCase() === 'completed' || status === '1') {
      if (await completionExists(connection, trans_id)) {
        return res.status(200).json({ status: 'success', message: 'Duplicate transaction ignored' });
      }

      await connection.beginTransaction();

      const payout = parseFloat(amount_local || 0);
      const offerName = `Pocketsfull ${type}`;

      await connection.query(
        `INSERT INTO offer_completions (completion_id, user_id, offer_id, provider, payout_coins, status, raw_payload, offer_name, goal_name, gaid, ip_address)
         VALUES (?, ?, ?, 'pocketsfull', ?, 'COMPLETED', ?, ?, 'Offer Completion', '', ?)`,
        [trans_id, internalId, offer_id, payout, JSON.stringify(params), offerName, req.ip || 'unknown']
      );

      await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [payout, internalId]);

      const transId = uuidv4();
      await connection.query(
        `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at)
         VALUES (?, ?, ?, 'CREDIT', 'POCKETSFULL', ?, ?, NOW())`,
        [transId, internalId, payout, `Pocketsfull: ${offerName}`, trans_id]
      );

      await connection.commit();

      sendAdminTelegramAlert(`✅ <b>Pocketsfull Reward</b>\nUser: ${internalId}\nAmount: ${payout} coins\nOffer: ${offer_id}`).catch(console.error);

      sendNotification(internalId, "Pocketsfull Reward! 🎉", `You received ${payout} coins for completing a Pocketsfull ${type}!`).catch(console.error);

      processReferralRewards(internalId, payout, '0').catch(err => console.error('Pocketsfull Referral Commission error:', err.message));

      return res.status(200).json({ status: 'success', message: 'User rewarded successfully' });
    }

    // B: Chargeback/Rejected Flow
    if (status.toLowerCase() === 'rejected' || status.toLowerCase() === 'chargeback' || status === '2') {
      const [origRows] = await connection.query('SELECT * FROM offer_completions WHERE completion_id = ? LIMIT 1', [trans_id]);

      if (origRows.length === 0) {
        return res.status(200).json({ status: 'success', message: 'Original transaction not found, ignored' });
      }

      const orig = origRows[0];
      if (orig.status === 'REVERSED') {
        return res.status(200).json({ status: 'success', message: 'Already reversed' });
      }

      await connection.beginTransaction();

      await connection.query('UPDATE offer_completions SET status = "REVERSED" WHERE completion_id = ?', [trans_id]);

      const deduction = parseFloat(orig.payout_coins || amount_local || 0);
      await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [deduction, internalId]);

      const transId = uuidv4();
      const finalOfferName = orig.offer_name || 'Pocketsfull Offer';
      await connection.query(
        `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at)
         VALUES (?, ?, ?, 'DEBIT', 'POCKETSFULL_REVERSAL', ?, ?, NOW())`,
        [transId, internalId, deduction, `Chargeback: ${finalOfferName}`, trans_id]
      );

      await connection.commit();

      sendAdminTelegramAlert(`🚨 <b>Pocketsfull Chargeback</b>\nUser: ${internalId}\nAmount: ${deduction} coins\nReversed Transaction ID: ${trans_id}`).catch(console.error);

      sendNotification(internalId, "Action Required: Points Reversed ❗", `Points for '${finalOfferName}' were reversed due to rejection by the provider.`).catch(console.error);

      return res.status(200).json({ status: 'success', message: 'Chargeback processed successfully' });
    }

    // Default status fallback
    return res.status(200).json({ status: 'success', message: `Status ignored: ${status}` });
  } catch (error) {
    await connection.rollback();
    console.error('Pocketsfull Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  } finally {
    connection.release();
  }
};

// =========================================================================
// 11. REAL OPINION JSON POSTBACK (POST)
// =========================================================================
export const handleRealOpinion = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { app_id = '', user_id = '', status = 0, trans_id = '', publisher_payout = 0, user_payout = 0, bonus_amount = 0 } = req.body;

    if (!user_id || !trans_id) {
      return res.status(400).json({ success: false, message: 'Missing required fields (user_id/trans_id)' });
    }

    if (parseInt(status) !== 1) {
      return res.status(200).json({ success: true, message: 'Status not success, ignored.' });
    }

    const user = await resolveUser(connection, user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const internalId = user.id;

    if (await completionExists(connection, trans_id)) {
      return res.status(200).json({ success: true, message: 'Duplicate transaction ignored' });
    }

    await connection.beginTransaction();

    const reward = parseFloat(user_payout || 0) + parseFloat(bonus_amount || 0);

    await connection.query(
      `INSERT INTO offer_completions (completion_id, user_id, offer_id, provider, payout_coins, status, raw_payload, offer_name, goal_name, gaid, ip_address)
       VALUES (?, ?, '0', 'realopinion', ?, 'COMPLETED', ?, 'Real Opinion Offer', 'Direct Payout', '', ?)`,
      [trans_id, internalId, reward, JSON.stringify(req.body), req.ip || 'unknown']
    );

    await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [reward, internalId]);

    const transId = uuidv4();
    await connection.query(
      `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at)
       VALUES (?, ?, ?, 'CREDIT', 'REAL_OPINION', 'Real Opinion Offer', ?, NOW())`,
      [transId, internalId, reward, trans_id]
    );

    await connection.commit();

    sendAdminTelegramAlert(`✅ <b>Real Opinion Completion</b>\nUser: ${internalId} (UID: ${user_id})\nAmount: ${reward}\nID: ${trans_id}`).catch(console.error);

    sendNotification(internalId, "Real Opinion Reward Received! 🪙", `You received ${reward} coins from Real Opinion`).catch(console.error);

    processReferralRewards(internalId, reward, '0').catch(err => console.error('Real Opinion Referral Commission error:', err.message));

    return res.status(200).json({ success: true, message: 'Callback received and processed successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Real Opinion Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};

// =========================================================================
// 12. GENERIC COMPLETED (PENDING VALIDATION) POSTBACK (POST)
// =========================================================================
export const handleOfferCompleted = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { completion_id, offer_id, payout, user_id, user_install_id, provider = 'unknown' } = req.body;

    if (!completion_id || !offer_id || !payout) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const userIdentifier = user_id || user_install_id;
    if (!userIdentifier) {
      return res.status(400).json({ message: 'Missing user identifier' });
    }

    const user = await resolveUser(connection, userIdentifier);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const internalId = user.id;

    if (await completionExists(connection, completion_id)) {
      return res.status(200).json({ success: true, message: 'Duplicate completion ignored' });
    }

    await connection.beginTransaction();

    const reward = parseFloat(payout || 0);

    // Save as PENDING_VALIDATION (will NOT credit balance immediately)
    await connection.query(
      `INSERT INTO offer_completions (completion_id, user_id, offer_id, provider, payout_coins, status, raw_payload, offer_name, goal_name, gaid, ip_address)
       VALUES (?, ?, ?, ?, ?, 'PENDING_VALIDATION', ?, 'Pending Offer Validation', 'S2S Validation', '', ?)`,
      [completion_id, internalId, offer_id, provider, reward, JSON.stringify(req.body), req.ip || 'unknown']
    );

    await connection.commit();

    sendAdminTelegramAlert(`⏳ <b>New Offer Submission</b>\nUser: ${internalId}\nOfferID: ${offer_id}\nPayout: ${reward}\nProvider: ${provider}\nStatus: Pending Validation`).catch(console.error);

    sendNotification(internalId, "Offer Recorded", "We've received your offer submission. It's currently pending validation.").catch(console.error);

    return res.status(200).json({ success: true, message: 'Offer recorded' });
  } catch (error) {
    await connection.rollback();
    console.error('Offer Completed Error:', error);
    return res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
};

// =========================================================================
// HELPER: PROCESS REFERRAL REWARDS (Ledger Safe)
// =========================================================================
async function processReferralRewards(referredUserId, rewardAmount, offerId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [userRows] = await connection.query('SELECT referred_by FROM users WHERE id = ? LIMIT 1', [referredUserId]);
    if (userRows.length === 0 || !userRows[0].referred_by) {
      await connection.rollback();
      return;
    }
    const referrerCode = userRows[0].referred_by;

    const [referrerRows] = await connection.query(
      'SELECT id, name FROM users WHERE LOWER(referral_code) = LOWER(?) LIMIT 1',
      [referrerCode.trim()]
    );
    if (referrerRows.length === 0) {
      await connection.rollback();
      return;
    }
    const referrerId = referrerRows[0].id;

    const [settingsRows] = await connection.query('SELECT * FROM referral_settings LIMIT 1');
    const settings = settingsRows.length > 0 
      ? settingsRows[0] 
      : { bonus_coins: 10.00, commission_percent: 10, offers_required: 2 };

    const [useRows] = await connection.query(
      'SELECT * FROM referral_uses WHERE referred_user_id = ? LIMIT 1 FOR UPDATE',
      [referredUserId]
    );

    let refUse = null;
    if (useRows.length === 0) {
      const useId = uuidv4();
      await connection.query(
        `INSERT INTO referral_uses (id, referrer_id, referred_user_id, referral_code, status, offers_completed_count) 
         VALUES (?, ?, ?, ?, 'PENDING', 1)`,
        [useId, referrerId, referredUserId, referrerCode]
      );
      
      const [newUseRows] = await connection.query('SELECT * FROM referral_uses WHERE id = ? LIMIT 1', [useId]);
      refUse = newUseRows[0];
    } else {
      refUse = useRows[0];
      await connection.query(
        'UPDATE referral_uses SET offers_completed_count = offers_completed_count + 1 WHERE id = ?',
        [refUse.id]
      );
      refUse.offers_completed_count += 1;
    }

    const threshold = parseInt(settings.offers_required);
    if (refUse.status === 'PENDING' && refUse.offers_completed_count >= threshold) {
      await connection.query(
        'UPDATE referral_uses SET status = "COMPLETED", rewarded_at = NOW() WHERE id = ?',
        [refUse.id]
      );

      const bonusCoins = parseFloat(settings.bonus_coins);

      await connection.query(
        'UPDATE users SET balance = balance + ? WHERE id = ?',
        [bonusCoins, referrerId]
      );

      const transId = uuidv4();
      await connection.query(
        `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at) 
         VALUES (?, ?, ?, 'CREDIT', 'REFERRAL_BONUS', ?, ?, NOW())`,
        [transId, referrerId, bonusCoins, `Referral Milestone Bonus (Friend completed ${threshold} tasks)`, refUse.id]
      );

      await sendNotification(
        referrerId,
        "Referral Bonus Claimed!",
        `You received ${bonusCoins.toFixed(0)} coins because your referred friend completed ${threshold} tasks!`
      );
    }

    const commPercent = parseInt(settings.commission_percent);
    if (commPercent > 0) {
      const commissionAmount = rewardAmount * (commPercent / 100);

      if (commissionAmount > 0) {
        await connection.query(
          'UPDATE users SET balance = balance + ? WHERE id = ?',
          [commissionAmount, referrerId]
        );

        const transId = uuidv4();
        await connection.query(
          `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at) 
           VALUES (?, ?, ?, 'CREDIT', 'REFERRAL', ?, ?, NOW())`,
          [transId, referrerId, commissionAmount, `Commission (${commPercent}% of friend task reward)`, offerId]
        );

        await sendNotification(
          referrerId,
          "Referral Commission Earned!",
          `You earned ${commissionAmount.toFixed(1)} coins commission from your referred friend's task completion!`
        );
      }
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    console.error('❌ Error processing referral rewards:', err.message);
  } finally {
    connection.release();
  }
}
