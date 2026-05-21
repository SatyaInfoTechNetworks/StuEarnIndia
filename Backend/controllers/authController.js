import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

// Generates legacy token
function generateLegacyToken(userId) {
  return Buffer.from(`${userId}:${Date.now()}`).toString('base64');
}

// Generates new JWT token
function generateJwtToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'stuearn_super_secret_jwt_key_2026', {
    expiresIn: '30d'
  });
}

// Google Login
export const loginGoogle = async (req, res) => {
  try {
    const { uid, email, name, android_id } = req.body;

    if (!uid || !email || !name) {
      return res.status(400).json({ success: false, message: 'Incomplete data' });
    }

    // 1. Device Lock Check
    if (android_id) {
      const [devRows] = await pool.query(
        'SELECT uid FROM users WHERE android_id = ? AND uid != ? LIMIT 1',
        [android_id, uid]
      );
      if (devRows.length > 0) {
        return res.json({ success: false, message: 'Device already registered with another account' });
      }
    }

    // 2. Check if user exists
    const [userRows] = await pool.query('SELECT * FROM users WHERE uid = ? LIMIT 1', [uid]);

    if (userRows.length > 0) {
      const user = userRows[0];

      // Update existing user properties
      await pool.query(
        'UPDATE users SET name = ?, email = ?, android_id = ? WHERE uid = ?',
        [name, email, android_id || user.android_id, uid]
      );

      // Fetch fresh row
      const [updatedUserRows] = await pool.query('SELECT * FROM users WHERE uid = ? LIMIT 1', [uid]);
      const updatedUser = updatedUserRows[0];

      // Return both modern JWT and legacy token
      return res.json({
        success: true,
        message: 'Login successful',
        token: generateLegacyToken(updatedUser.id),
        jwt: generateJwtToken({ id: updatedUser.id, role: 'user' }),
        user: updatedUser
      });
    } else {
      // User not found -> client will trigger signup
      return res.json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Google Login Error:', error);
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// User Signup
export const signupUser = async (req, res) => {
  try {
    const { uid, name, email, phone_number, profile_pic, location, referred_by, fcm_token, android_id } = req.body;

    if (!uid || !name || !email) {
      return res.status(400).json({ success: false, message: 'Incomplete data' });
    }

    // 1. Device Lock Check
    if (android_id) {
      const [devRows] = await pool.query(
        'SELECT uid FROM users WHERE android_id = ? AND uid != ? LIMIT 1',
        [android_id, uid]
      );
      if (devRows.length > 0) {
        return res.json({ success: false, message: 'Device already registered with another account' });
      }
    }

    // 2. Check if UID already exists (Update logic)
    const [userRows] = await pool.query('SELECT * FROM users WHERE uid = ? LIMIT 1', [uid]);

    if (userRows.length > 0) {
      const user = userRows[0];
      
      // Update details
      await pool.query(
        `UPDATE users SET 
          name = ?, email = ?, phone_number = ?, android_id = ?,
          referred_by = ?, location = ?, fcm_token = ?
         WHERE uid = ?`,
        [
          name,
          email,
          phone_number || user.phone_number,
          android_id || user.android_id,
          referred_by || user.referred_by,
          location || user.location,
          fcm_token || user.fcm_token,
          uid
        ]
      );

      // Handle referral mapping if referred_by is set
      if (referred_by) {
        await handleReferralMapping(user.id, referred_by);
      }

      const [updatedUser] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [user.id]);

      return res.json({
        success: true,
        message: 'User updated successfully',
        token: generateLegacyToken(user.id),
        jwt: generateJwtToken({ id: user.id, role: 'user' }),
        user: updatedUser[0]
      });
    }

    // 3. New User Registration
    const newUserId = uuidv4();
    
    // Generate referral code (Case-insensitive unique code, e.g. uppercase base36)
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    await pool.query(
      `INSERT INTO users 
        (id, uid, name, email, phone_number, profile_pic, location, referred_by, fcm_token, android_id, referral_code, balance, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, NOW())`,
      [
        newUserId,
        uid,
        name,
        email,
        phone_number || null,
        profile_pic || '',
        location || '',
        referred_by || null,
        fcm_token || '',
        android_id || '',
        referralCode
      ]
    );

    // Handle referral mapping if referred_by is set
    if (referred_by) {
      await handleReferralMapping(newUserId, referred_by);
    }

    const [newUserRows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [newUserId]);
    const newUser = newUserRows[0];

    res.json({
      success: true,
      message: 'User created successfully',
      token: generateLegacyToken(newUserId),
      jwt: generateJwtToken({ id: newUserId, role: 'user' }),
      user: newUser
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// Admin Login
export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const adminPass = process.env.ADMIN_PASSWORD || 'admin_stuearn_secure_pass';

    if (username === 'admin' && password === adminPass) {
      const jwtToken = generateJwtToken({ role: 'admin' });
      return res.json({
        success: true,
        message: 'Admin login successful',
        token: jwtToken
      });
    }

    res.status(401).json({ success: false, message: 'Invalid admin credentials' });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Helper: Handle Referral relation mapping in referral_uses / database table
async function handleReferralMapping(referredUserId, referrerCode) {
  try {
    if (!referrerCode) return;
    
    // Find referrer ID by referral code
    const [refRows] = await pool.query(
      'SELECT id FROM users WHERE LOWER(referral_code) = LOWER(?) LIMIT 1',
      [referrerCode.trim()]
    );
    
    if (refRows.length === 0) return;
    const referrerId = refRows[0].id;

    // Check if referral mapping already exists
    const [existRows] = await pool.query(
      'SELECT id FROM referral_uses WHERE referred_user_id = ? LIMIT 1',
      [referredUserId]
    );

    if (existRows.length === 0) {
      // Insert into referral_uses (if the table exists in user's DB, otherwise we support it)
      // Check if table 'referral_uses' exists or create it
      await pool.query(
        `CREATE TABLE IF NOT EXISTS referral_uses (
          id CHAR(36) PRIMARY KEY,
          referrer_id CHAR(36) NOT NULL,
          referred_user_id CHAR(36) NOT NULL,
          referral_code VARCHAR(50) NOT NULL,
          status ENUM('PENDING', 'COMPLETED') DEFAULT 'PENDING',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
        )`
      );

      await pool.query(
        'INSERT INTO referral_uses (id, referrer_id, referred_user_id, referral_code) VALUES (?, ?, ?, ?)',
        [uuidv4(), referrerId, referredUserId, referrerCode]
      );
    }
  } catch (err) {
    console.error('Error in handleReferralMapping:', err.message);
  }
}

// Check if UID exists and optionally update FCM token
export const checkUid = async (req, res) => {
  try {
    const { uid, fcm_token } = req.body;

    if (!uid) {
      return res.status(400).json({ success: false, exist: null, message: 'UID is required' });
    }

    // Update FCM token if provided and user exists
    if (fcm_token) {
      await pool.query('UPDATE users SET fcm_token = ? WHERE uid = ?', [fcm_token, uid]);
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE uid = ? LIMIT 1', [uid]);

    if (rows.length > 0) {
      const user = rows[0];
      return res.json({
        success: true,
        exist: true,
        is_new_user: false,
        message: 'Login successful',
        token: generateLegacyToken(user.id),
        jwt: generateJwtToken({ id: user.id, role: 'user' }),
        user: user
      });
    } else {
      return res.json({
        success: false,
        exist: false,
        is_new_user: true,
        message: 'Please register first'
      });
    }
  } catch (error) {
    console.error('Check UID Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
