import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { sendNotification } from '../utils/notifications.js';

// ==========================================
// ADMIN CONTEST CONTROLLERS
// ==========================================

// 1. List all contests with summary stats
export const listAdminContests = async (req, res) => {
  try {
    const query = `
      SELECT c.*, 
             COALESCE(SUM(ce.entries_count), 0) as total_entries, 
             COUNT(DISTINCT ce.user_id) as total_participants,
             (SELECT COUNT(*) FROM contest_winners WHERE contest_id = c.id) as total_winners_drawn
      FROM contests c
      LEFT JOIN contest_entries ce ON c.id = ce.contest_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
    const [rows] = await pool.query(query);

    const contests = [];
    for (const row of rows) {
      // Fetch rewards for each contest
      const [rewards] = await pool.query(
        'SELECT reward_position, reward_type, reward_value FROM contest_rewards WHERE contest_id = ? ORDER BY reward_position ASC',
        [row.id]
      );
      contests.push({
        ...row,
        total_entries: parseInt(row.total_entries),
        total_participants: parseInt(row.total_participants),
        rewards
      });
    }

    res.json({ success: true, contests });
  } catch (error) {
    console.error('Admin List Contests Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 2. Create a new contest with tiered reward structures
export const createContest = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { 
      title, description, type, start_time, end_time, 
      max_entries_per_day = 3, total_winners = 1, rewards 
    } = req.body;

    if (!title || !type || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'Missing required contest properties' });
    }

    await connection.beginTransaction();

    const contestId = uuidv4();
    await connection.query(
      `INSERT INTO contests (id, title, description, type, start_time, end_time, max_entries_per_day, total_winners, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW())`,
      [contestId, title, description || '', type, start_time, end_time, parseInt(max_entries_per_day), parseInt(total_winners)]
    );

    // Sync rewards
    if (Array.isArray(rewards)) {
      for (const r of rewards) {
        const rewardId = uuidv4();
        await connection.query(
          `INSERT INTO contest_rewards (id, contest_id, reward_position, reward_type, reward_value, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [rewardId, contestId, parseInt(r.reward_position || 1), r.reward_type, parseFloat(r.reward_value || 0)]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Contest launched successfully', contest_id: contestId });
  } catch (error) {
    await connection.rollback();
    console.error('Admin Create Contest Error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  } finally {
    connection.release();
  }
};

// 3. Update an existing contest details
export const updateContest = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const contestId = req.params.id;
    const { 
      title, description, start_time, end_time, 
      max_entries_per_day, total_winners, status, rewards 
    } = req.body;

    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT id FROM contests WHERE id = ?', [contestId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Contest not found' });
    }

    await connection.query(
      `UPDATE contests 
       SET title=?, description=?, start_time=?, end_time=?, max_entries_per_day=?, total_winners=?, status=?
       WHERE id=?`,
      [title, description || '', start_time, end_time, parseInt(max_entries_per_day), parseInt(total_winners), status || 'ACTIVE', contestId]
    );

    // Sync rewards
    if (rewards !== undefined && Array.isArray(rewards)) {
      await connection.query('DELETE FROM contest_rewards WHERE contest_id = ?', [contestId]);
      for (const r of rewards) {
        const rewardId = uuidv4();
        await connection.query(
          `INSERT INTO contest_rewards (id, contest_id, reward_position, reward_type, reward_value, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [rewardId, contestId, parseInt(r.reward_position || 1), r.reward_type, parseFloat(r.reward_value || 0)]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Contest updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Admin Update Contest Error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  } finally {
    connection.release();
  }
};

// 4. Delete/Cancel a contest
export const deleteContest = async (req, res) => {
  try {
    const contestId = req.params.id;
    const [rows] = await pool.query('SELECT id FROM contests WHERE id = ?', [contestId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contest not found' });
    }

    await pool.query('DELETE FROM contests WHERE id = ?', [contestId]);
    res.json({ success: true, message: 'Contest deleted successfully' });
  } catch (error) {
    console.error('Admin Delete Contest Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 5. Fetch all entries for audit list
export const getContestEntries = async (req, res) => {
  try {
    const contestId = req.params.id;
    const query = `
      SELECT ce.id, ce.entries_count, ce.entry_source, ce.created_at,
             u.name as user_name, u.email as user_email, u.user_id as user_public_id, u.id as user_internal_id
      FROM contest_entries ce
      JOIN users u ON ce.user_id = u.id
      WHERE ce.contest_id = ?
      ORDER BY ce.entries_count DESC, ce.created_at DESC
    `;
    const [entries] = await pool.query(query, [contestId]);
    res.json({ success: true, entries });
  } catch (error) {
    console.error('Admin Get Entries Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 6. Draw winners using weighted random selection raffle
export const drawContestWinners = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const contestId = req.params.id;

    await connection.beginTransaction();

    // A. FETCH CONTEST details
    const [contestRows] = await connection.query('SELECT * FROM contests WHERE id = ? FOR UPDATE', [contestId]);
    if (contestRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Contest not found' });
    }
    const contest = contestRows[0];

    if (contest.status === 'COMPLETED') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Contest winners have already been drawn.' });
    }

    // B. FETCH ALL REWARDS
    const [rewards] = await connection.query(
      'SELECT * FROM contest_rewards WHERE contest_id = ? ORDER BY reward_position ASC',
      [contestId]
    );

    // C. FETCH ALL ENTRIES GROUPED BY USER
    const [entries] = await connection.query(
      'SELECT user_id, SUM(entries_count) as total_tickets FROM contest_entries WHERE contest_id = ? GROUP BY user_id',
      [contestId]
    );

    if (entries.length === 0) {
      // No participants - mark completed and return
      await connection.query("UPDATE contests SET status = 'COMPLETED' WHERE id = ?", [contestId]);
      await connection.commit();
      return res.json({ success: true, message: 'No entries found. Contest closed with zero winners.' });
    }

    // D. BUILD WEIGHTED RAFFLE BASKET
    // 1 ticket = 1 index chance, 3 tickets = 3 indices
    let raffleBasket = [];
    entries.forEach(e => {
      const count = parseInt(e.total_tickets || 0);
      for (let i = 0; i < count; i++) {
        raffleBasket.push(e.user_id);
      }
    });

    const winnersDrawn = [];
    
    // Sort rewards by position to select Rank 1 first
    for (const reward of rewards) {
      if (raffleBasket.length === 0) break;

      // Select random index from the basket
      const randIdx = Math.floor(Math.random() * raffleBasket.length);
      const winnerUserId = raffleBasket[randIdx];

      winnersDrawn.push({
        userId: winnerUserId,
        position: reward.reward_position,
        type: reward.reward_type,
        value: parseFloat(reward.reward_value)
      });

      // Remove this user completely from the raffle basket so they cannot win multiple positions
      raffleBasket = raffleBasket.filter(uid => uid !== winnerUserId);
    }

    // E. ATOMIC REWARD CREDITING LEDGER
    for (const w of winnersDrawn) {
      const winnerId = uuidv4();
      const giveInstant = (w.type === 'COINS' || w.type === 'CASH');

      await connection.query(
        `INSERT INTO contest_winners (id, contest_id, user_id, reward_position, reward_type, reward_value, reward_given, selected_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [winnerId, contestId, w.userId, w.position, w.type, w.value, giveInstant ? 1 : 0]
      );

      // Ledger credit immediately for Coins or cash wallet balance
      if (giveInstant) {
        // Credit user balance
        await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [w.value, w.userId]);

        // Insert ledger double-entry transaction record
        const transId = uuidv4();
        const description = `Won Rank #${w.position} in Contest: ${contest.title}`;
        await connection.query(
          `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at)
           VALUES (?, ?, ?, 'CREDIT', 'CONTEST_REWARD', ?, ?, NOW())`,
          [transId, w.userId, w.value, description, winnerId]
        );

        // Notify winner
        sendNotification(
          w.userId, 
          'Contest Winner! 🏆', 
          `Congratulations! You won ${w.value.toFixed(0)} ${w.type === 'COINS' ? 'Coins' : 'UPI Cash'} (Rank #${w.position}) in: "${contest.title}"`
        ).catch(err => console.error('Push notification error:', err));
      } else {
        // Gift Card (Requires manual review / approval by admin to send code)
        sendNotification(
          w.userId,
          'Contest Winner! 🏆',
          `You won Rank #${w.position} (Gift Card Reward)! The admin will review and dispatch your code shortly.`
        ).catch(err => console.error('Push notification error:', err));
      }
    }

    // F. MARK CONTEST COMPLETED
    await connection.query("UPDATE contests SET status = 'COMPLETED' WHERE id = ?", [contestId]);

    await connection.commit();
    res.json({ success: true, message: `Successfully drew ${winnersDrawn.length} winners!`, winners: winnersDrawn });
  } catch (error) {
    await connection.rollback();
    console.error('Admin Contest Draw Error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  } finally {
    connection.release();
  }
};

// 7. Get winners list for contest
export const getContestWinnersAdmin = async (req, res) => {
  try {
    const contestId = req.params.id;
    const query = `
      SELECT cw.*, u.name as user_name, u.email as user_email, u.user_id as user_public_id
      FROM contest_winners cw
      JOIN users u ON cw.user_id = u.id
      WHERE cw.contest_id = ?
      ORDER BY cw.reward_position ASC
    `;
    const [winners] = await pool.query(query, [contestId]);
    res.json({ success: true, winners });
  } catch (error) {
    console.error('Admin Get Winners Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 8. Deliver pending Gift Card code or mark cash as paid
export const giveContestRewardAdmin = async (req, res) => {
  try {
    const winnerId = req.params.winnerId;
    const { remark } = req.body; // e.g. "Google Play Code: GC-XXXX"

    if (!remark) {
      return res.status(400).json({ success: false, message: 'Delivery code / proof details are required' });
    }

    const [rows] = await pool.query('SELECT * FROM contest_winners WHERE id = ?', [winnerId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Winner log not found' });
    }
    const winner = rows[0];

    await pool.query('UPDATE contest_winners SET reward_given = 1 WHERE id = ?', [winnerId]);

    // Send push notification containing the code
    sendNotification(
      winner.user_id,
      'Gift Card Delivered! 🎁',
      `Your code for Rank #${winner.reward_position} is: ${remark}. Thanks for participating!`
    ).catch(console.error);

    res.json({ success: true, message: 'Reward marked as delivered successfully' });
  } catch (error) {
    console.error('Admin Give Reward Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// ==========================================
// USER / MOBILE APP CONTEST CONTROLLERS
// ==========================================

// 1. Get all active and upcoming contests with my ticket counts
export const getActiveContestsUser = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;

    const query = `
      SELECT c.*, 
             (SELECT COUNT(*) FROM contest_entries WHERE contest_id = c.id) as global_entries_count
      FROM contests c
      WHERE c.status = 'ACTIVE' AND c.end_time > NOW()
      ORDER BY c.end_time ASC
    `;
    const [contests] = await pool.query(query);

    const formattedContests = [];
    for (const c of contests) {
      // Get rewards
      const [rewards] = await pool.query(
        'SELECT reward_position, reward_type, reward_value FROM contest_rewards WHERE contest_id = ? ORDER BY reward_position ASC',
        [c.id]
      );

      // Get my tickets
      let myTickets = 0;
      if (userId) {
        const [entryRows] = await pool.query(
          'SELECT SUM(entries_count) as tickets FROM contest_entries WHERE contest_id = ? AND user_id = ?',
          [c.id, userId]
        );
        myTickets = parseInt(entryRows[0]?.tickets || 0);
      }

      formattedContests.push({
        id: c.id,
        title: c.title,
        description: c.description,
        type: c.type,
        startTime: c.start_time,
        endTime: c.end_time,
        maxEntriesPerDay: c.max_entries_per_day,
        totalWinners: c.total_winners,
        globalEntriesCount: parseInt(c.global_entries_count),
        myTickets,
        rewards: rewards.map(r => ({
          position: r.reward_position,
          type: r.reward_type,
          value: parseFloat(r.reward_value)
        }))
      });
    }

    res.json({ success: true, contests: formattedContests });
  } catch (error) {
    console.error('User Get Contests Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 2. Fetch details for a specific contest
export const getContestDetailUser = async (req, res) => {
  try {
    const contestId = req.params.id;
    const userId = req.user ? req.user.id : null;

    const [rows] = await pool.query('SELECT * FROM contests WHERE id = ?', [contestId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contest not found' });
    }
    const c = rows[0];

    const [rewards] = await pool.query(
      'SELECT reward_position, reward_type, reward_value FROM contest_rewards WHERE contest_id = ? ORDER BY reward_position ASC',
      [contestId]
    );

    // Get total tickets in contest
    const [totalRows] = await pool.query(
      'SELECT SUM(entries_count) as total FROM contest_entries WHERE contest_id = ?',
      [contestId]
    );
    const totalEntries = parseInt(totalRows[0]?.total || 0);

    // Get my tickets details
    let myTickets = 0;
    let entriesLeftToday = c.max_entries_per_day;

    if (userId) {
      const [entryRows] = await pool.query(
        'SELECT SUM(entries_count) as tickets FROM contest_entries WHERE contest_id = ? AND user_id = ?',
        [contestId, userId]
      );
      myTickets = parseInt(entryRows[0]?.tickets || 0);

      // Daily limit remaining checker
      const today = new Date().toISOString().split('T')[0];
      const [todayRows] = await pool.query(
        'SELECT SUM(entries_count) as tickets FROM contest_entries WHERE contest_id = ? AND user_id = ? AND DATE(created_at) = ?',
        [contestId, userId, today]
      );
      const todayEntries = parseInt(todayRows[0]?.tickets || 0);
      entriesLeftToday = Math.max(0, c.max_entries_per_day - todayEntries);
    }

    res.json({
      success: true,
      contest: {
        id: c.id,
        title: c.title,
        description: c.description,
        type: c.type,
        startTime: c.start_time,
        endTime: c.end_time,
        maxEntriesPerDay: c.max_entries_per_day,
        totalWinners: c.total_winners,
        status: c.status,
        totalEntries,
        myTickets,
        entriesLeftToday,
        rewards: rewards.map(r => ({
          position: r.reward_position,
          type: r.reward_type,
          value: parseFloat(r.reward_value)
        }))
      }
    });
  } catch (error) {
    console.error('User Get Contest Detail Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 3. User watches ad/rewarded action to earn 1 ticket
export const enterContestUser = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const contestId = req.params.id;
    const userId = req.user.id;
    const { source = 'AD' } = req.body; // AD, FREE

    await connection.beginTransaction();

    const [contestRows] = await connection.query('SELECT * FROM contests WHERE id = ? FOR UPDATE', [contestId]);
    if (contestRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Contest not found' });
    }
    const contest = contestRows[0];

    if (contest.status !== 'ACTIVE') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'This contest has already ended or is inactive.' });
    }

    if (contest.type !== 'LUCKY_DRAW') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Direct ticket claiming is only allowed for Lucky Draws.' });
    }

    // Check daily limit
    const today = new Date().toISOString().split('T')[0];
    const [todayRows] = await connection.query(
      'SELECT SUM(entries_count) as tickets FROM contest_entries WHERE contest_id = ? AND user_id = ? AND DATE(created_at) = ?',
      [contestId, userId, today]
    );
    const todayEntries = parseInt(todayRows[0]?.tickets || 0);

    if (todayEntries >= contest.max_entries_per_day) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `Daily entry limit reached. You can only earn up to ${contest.max_entries_per_day} tickets per day.` 
      });
    }

    // Insert or update entry
    await connection.query(
      `INSERT INTO contest_entries (id, user_id, contest_id, entry_source, entries_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE entries_count = entries_count + 1, updated_at = NOW()`,
      [uuidv4(), userId, contestId, source]
    );

    await connection.commit();
    res.json({ success: true, message: 'Congratulations! You earned 1 raffle ticket.' });
  } catch (error) {
    await connection.rollback();
    console.error('User Enter Contest Error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  } finally {
    connection.release();
  }
};

// 4. Get list of historical winners for completed contests
export const getContestWinnersUser = async (req, res) => {
  try {
    const query = `
      SELECT cw.reward_position, cw.reward_type, cw.reward_value, cw.selected_at,
             c.title as contest_title, u.name as user_name
      FROM contest_winners cw
      JOIN contests c ON cw.contest_id = c.id
      JOIN users u ON cw.user_id = u.id
      ORDER BY cw.selected_at DESC, cw.reward_position ASC
      LIMIT 100
    `;
    const [winners] = await pool.query(query);
    res.json({ success: true, winners });
  } catch (error) {
    console.error('User Get Winners Feed Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
