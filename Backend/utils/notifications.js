import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import pool from '../db.js';

let firebaseApp = null;
const serviceAccountPath = process.env.FCM_SERVICE_ACCOUNT_PATH || './config/service-account.json';

try {
  if (process.env.FCM_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK initialized successfully from env variable.');
  } else if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(serviceAccountPath), 'utf8'));
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK initialized successfully from file.');
  } else {
    console.warn(`⚠️ Firebase service-account.json not found. Push notifications will be mocked. Define FCM_SERVICE_ACCOUNT_JSON in environment or place file at ${serviceAccountPath}.`);
  }
} catch (err) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', err.message);
}

/**
 * Send push notification to a specific user
 */
export async function sendNotification(userId, title, body) {
  try {
    // 1. Get user fcm_token & uid
    const [rows] = await pool.query('SELECT fcm_token, uid FROM users WHERE id = ? LIMIT 1', [userId]);
    
    if (rows.length === 0) return false;
    const user = rows[0];

    // Log to notification history
    await pool.query(
      'INSERT INTO notifications (id, title, message, target_type, target_uid, created_at) VALUES (UUID(), ?, ?, "specific", ?, NOW())',
      [title, body, user.uid]
    );

    if (!user.fcm_token) {
      console.log(`ℹ️ User ${userId} has no FCM token. Notification logged but not sent.`);
      return true;
    }

    if (firebaseApp) {
      const message = {
        token: user.fcm_token,
        notification: { title, body },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          title,
          body,
          type: 'general'
        }
      };

      await admin.messaging().send(message);
      console.log(`📲 Push notification sent to user ${userId}`);
    } else {
      console.log(`📲 [Mock Push] ${title}: ${body} (Sent to token: ${user.fcm_token})`);
    }

    return true;
  } catch (error) {
    console.error('❌ Notification Error:', error.message);
    return false;
  }
}

/**
 * Broadcast notification to all users
 */
export async function broadcastNotification(title, body) {
  try {
    // Log to notification history
    await pool.query(
      'INSERT INTO notifications (id, title, message, target_type, target_uid, created_at) VALUES (UUID(), ?, ?, "global", NULL, NOW())',
      [title, body]
    );

    if (firebaseApp) {
      // Broadcast via topic (e.g., 'all')
      const message = {
        topic: 'all',
        notification: { title, body },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          title,
          body,
          type: 'general'
        }
      };

      await admin.messaging().send(message);
      console.log(`📢 Global push broadcast sent.`);
    } else {
      console.log(`📢 [Mock Global Broadcast] ${title}: ${body}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Broadcast Notification Error:', error.message);
    return false;
  }
}
