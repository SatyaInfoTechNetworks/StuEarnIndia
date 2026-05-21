import crypto from 'crypto';
import pool from '../db.js';

// Character set: uppercase + lowercase + digits (no confusing chars like 0/O, 1/l)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

/**
 * Generates a cryptographically random 10-character alphanumeric user ID.
 * Uses a safe character set (mixed case + digits, no confusable characters).
 * Format example: "Xk7mP2nQwR"
 */
export function generateUserId() {
  const bytes = crypto.randomBytes(10);
  let id = '';
  for (let i = 0; i < 10; i++) {
    id += CHARS[bytes[i] % CHARS.length];
  }
  return id;
}

/**
 * Generates a unique user ID that doesn't already exist in the DB.
 * Retries up to 10 times on collision (practically impossible but safe).
 */
export async function generateUniqueUserId() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = generateUserId();
    const [rows] = await pool.query('SELECT 1 FROM users WHERE user_id = ? LIMIT 1', [id]);
    if (rows.length === 0) return id;
  }
  throw new Error('Failed to generate unique user_id after 10 attempts');
}
