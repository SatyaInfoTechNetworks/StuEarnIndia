import pool from '../db.js';

// ----------------------------------------------------
// BANNERS API
// ----------------------------------------------------
export const listBanners = async (req, res) => {
  try {
    const query = `
      SELECT id, image_url, action_url 
      FROM banners 
      WHERE is_active = 1 
      ORDER BY display_order ASC, created_at DESC
    `;
    const [rows] = await pool.query(query);

    const banners = rows.map(row => ({
      id: String(row.id),
      imageUrl: row.image_url,
      actionUrl: row.action_url
    }));

    res.json({
      success: true,
      banners: banners
    });
  } catch (error) {
    console.error('List Banners Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ----------------------------------------------------
// TICKER API (RECENT EARNINGS)
// ----------------------------------------------------
export const getRecentEarnings = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 20);
    const maxLimit = Math.min(100, Math.max(1, limit));

    // Select recent credits from transactions table matching standard sources
    const query = `
      SELECT 
        u.name as username,
        t.amount,
        t.source,
        t.created_at as timestamp,
        t.description
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.type = 'CREDIT' 
      AND t.source IN ('OFFER', 'PUBSCALE', 'OFFERMARU', 'OPINION_UNIVERSE', 'CPX_RESEARCH', 'GROWDECK', 'ADJUMP', 'REAL_OPINION', 'PLAYTIME', 'POCKETSFULL', 'STREAK_REWARD', 'LUCKY_SPIN', 'SCRATCH_CARD', 'WATCH_VIDEO')
      ORDER BY t.created_at DESC
      LIMIT ?
    `;

    const [rows] = await pool.query(query, [maxLimit]);

    const earnings = rows.map(row => {
      const source = row.source;
      let iconUrl = '';

      // Default icons mapping based on source
      switch (source) {
        case 'PUBSCALE':
          iconUrl = 'https://i.ibb.co/68gPz3Y/pubscale.png';
          break;
        case 'OFFERMARU':
          iconUrl = 'https://i.ibb.co/1fWfN9k/offermaru.png';
          break;
        case 'OPINION_UNIVERSE':
          iconUrl = 'https://i.ibb.co/zXgYqKB/opinionuniverse.png';
          break;
        case 'CPX_RESEARCH':
          iconUrl = 'https://i.ibb.co/LdQyJt8/cpx.png';
          break;
        case 'GROWDECK':
          iconUrl = 'https://i.ibb.co/YyYgX4C/growdeck.png';
          break;
        case 'ADJUMP':
          iconUrl = 'https://i.ibb.co/v4SgYqK/adjump.png';
          break;
        case 'REAL_OPINION':
          iconUrl = 'https://i.ibb.co/9pyqK8H/realopinion.png';
          break;
        case 'PLAYTIME':
          iconUrl = 'https://i.ibb.co/RpyqK8H/playtime.png';
          break;
        case 'POCKETSFULL':
          iconUrl = 'https://i.ibb.co/rpnYqKB/pocketsfull.png';
          break;
        case 'LIFAFA_BONUS':
          iconUrl = 'https://i.ibb.co/vvHv7WTx/envelope.png';
          break;
        case 'REFERRAL':
        case 'REFERRAL_BONUS':
          iconUrl = 'https://img.icons8.com/color/96/conference-call.png';
          break;
        case 'STREAK_REWARD':
        case 'DAILY_BONUS':
          iconUrl = 'https://img.icons8.com/color/96/calendar.png';
          break;
        case 'LUCKY_SPIN':
          iconUrl = 'https://www.vhv.rs/dpng/d/574-5746224_spin-the-wheel-png-png-download-spin-the.png';
          break;
        case 'SCRATCH_CARD':
          iconUrl = 'https://i.ibb.co/twLPSHST/giftbox-1139982.png';
          break;
        case 'WATCH_VIDEO':
          iconUrl = 'https://img.icons8.com/color/96/youtube-play.png';
          break;
        default:
          iconUrl = 'https://i.ibb.co/twLPSHST/giftbox-1139982.png';
          break;
      }

      // Calculate time ago
      const timestamp = new Date(row.timestamp).getTime();
      const now = Date.now();
      const diff = now - timestamp;
      let timeAgo = '';

      if (diff < 60000) {
        timeAgo = 'just now';
      } else if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        timeAgo = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      } else if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
      } else {
        timeAgo = new Date(row.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      return {
        username: row.username,
        amount: parseFloat(row.amount),
        offer_name: row.description || `${row.source} Reward`,
        logo_url: iconUrl,
        timestamp: row.timestamp,
        time_ago: timeAgo
      };
    });

    res.json({
      success: true,
      data: earnings,
      count: earnings.length
    });
  } catch (error) {
    console.error('Get Recent Earnings Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ----------------------------------------------------
// LEADERBOARD (REFERRALS)
// ----------------------------------------------------
export const getLeaderboard = async (req, res) => {
  try {
    const range = req.query.range || 'daily';
    let currentUserId = req.query.user_id || req.query.uid || null;

    // Resolve userId if UID is passed
    if (currentUserId && currentUserId.length !== 36) {
      const [uRows] = await pool.query('SELECT id FROM users WHERE uid = ? LIMIT 1', [currentUserId]);
      currentUserId = uRows.length > 0 ? uRows[0].id : null;
    }

    let dateCondition = '';
    if (range === 'daily') {
      dateCondition = 'AND r.created_at >= CURDATE()';
    } else if (range === 'weekly') {
      dateCondition = 'AND r.created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
    } else if (range === 'monthly') {
      dateCondition = 'AND r.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
    }

    // Query to get top referrers
    const query = `
      SELECT 
        u.id, 
        u.name, 
        u.profile_pic, 
        u.balance as total_earnings, 
        COUNT(r.id) as total_referrals
      FROM users u
      JOIN referral_uses r ON u.id = r.referrer_id
      WHERE 1=1 ${dateCondition}
      GROUP BY u.id
      ORDER BY total_referrals DESC
      LIMIT 100
    `;

    const [rows] = await pool.query(query);

    const leaderboard = [];
    let rank = 1;
    let currentUserRankData = null;

    for (const row of rows) {
      const item = {
        rank: rank,
        name: row.name,
        profile_pic: row.profile_pic,
        total_referrals: parseInt(row.total_referrals || 0),
        total_earnings: parseFloat(row.total_earnings || 0)
      };

      leaderboard.push(item);

      if (currentUserId && row.id === currentUserId) {
        currentUserRankData = {
          ...item,
          rank_text: `Your current rank #${rank}`
        };
      }
      rank++;
    }

    // If current user is not in the top 100
    if (currentUserId && !currentUserRankData) {
      const [refCountRows] = await pool.query(
        `SELECT COUNT(id) as total FROM referral_uses r WHERE r.referrer_id = ? ${dateCondition}`,
        [currentUserId]
      );
      const userReferrals = parseInt(refCountRows[0].total || 0);

      const [uDetailsRows] = await pool.query('SELECT name, profile_pic, balance FROM users WHERE id = ?', [currentUserId]);
      if (uDetailsRows.length > 0) {
        const uDetails = uDetailsRows[0];

        if (userReferrals > 0) {
          // Calculate rank
          const rankSql = `
            SELECT COUNT(*) as rank FROM (
              SELECT COUNT(r.id) as refs
              FROM referral_uses r
              WHERE 1=1 ${dateCondition}
              GROUP BY r.referrer_id
              HAVING refs > ?
            ) as higher_ranks
          `;
          const [rankRows] = await pool.query(rankSql, [userReferrals]);
          const betterUsersCount = parseInt(rankRows[0].rank || 0);
          const myRank = betterUsersCount + 1;

          currentUserRankData = {
            rank: myRank,
            rank_text: `Your current rank #${myRank}`,
            name: uDetails.name,
            profile_pic: uDetails.profile_pic,
            total_referrals: userReferrals,
            total_earnings: parseFloat(uDetails.balance || 0)
          };
        } else {
          currentUserRankData = {
            rank: 0,
            rank_text: 'You are currently unranked',
            name: uDetails.name,
            profile_pic: uDetails.profile_pic,
            total_referrals: 0,
            total_earnings: parseFloat(uDetails.balance || 0)
          };
        }
      }
    }

    res.json({
      success: true,
      data: leaderboard,
      user_rank: currentUserRankData,
      message: 'Success'
    });
  } catch (error) {
    console.error('Get Leaderboard Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ----------------------------------------------------
// TOP EARNERS LEADERBOARD (BY EARNINGS)
// ----------------------------------------------------
export const getTopEarners = async (req, res) => {
  try {
    const period = req.query.period || 'today';
    const limit = parseInt(req.query.limit || 10);
    const maxLimit = Math.min(100, Math.max(1, limit));

    let dateFilterOC = '';
    let dateFilterT = '';

    switch (period) {
      case 'today':
        dateFilterOC = 'AND DATE(oc.created_at) = CURDATE()';
        dateFilterT = 'AND DATE(t.created_at) = CURDATE()';
        break;
      case 'week':
        dateFilterOC = 'AND oc.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        dateFilterT = 'AND t.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case 'month':
        dateFilterOC = 'AND oc.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        dateFilterT = 'AND t.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      case 'all_time':
      default:
        dateFilterOC = '';
        dateFilterT = '';
        break;
    }

    // Dynamic top earners query aggregating all CREDIT transactions (excluding cashback or non-real tasks)
    const query = `
      SELECT 
        u.id as user_id,
        u.name as username,
        u.profile_pic as profile_picture,
        (
          COALESCE(
            (SELECT SUM(t.amount) 
             FROM transactions t 
             WHERE t.user_id = u.id 
             AND t.type = 'CREDIT'
             AND t.source NOT IN ('LIFAFA_BONUS', 'LUCKY_SPIN')
             ${dateFilterT}
            ), 0
          )
        ) as total_earnings,
        (
          COALESCE(
            (SELECT COUNT(oc.id) 
             FROM offer_completions oc 
             WHERE oc.user_id = u.id 
             AND oc.status = 'COMPLETED'
             ${dateFilterOC}
            ), 0
          )
        ) as transactions_count
      FROM users u
      WHERE EXISTS (
        SELECT 1 FROM transactions t 
        WHERE t.user_id = u.id 
        AND t.type = 'CREDIT'
        AND t.source NOT IN ('LIFAFA_BONUS', 'LUCKY_SPIN')
        ${dateFilterT}
      )
      HAVING total_earnings > 0
      ORDER BY total_earnings DESC
      LIMIT ?
    `;

    const [rows] = await pool.query(query, [maxLimit]);

    const leaderboard = rows.map((row, index) => ({
      rank: index + 1,
      user_id: row.user_id,
      username: row.username,
      total_earnings: parseFloat(row.total_earnings || 0),
      transactions_count: parseInt(row.transactions_count || 0),
      profile_picture: row.profile_picture
    }));

    res.json({
      success: true,
      period: period,
      data: leaderboard,
      count: leaderboard.length
    });
  } catch (error) {
    console.error('Get Top Earners Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
