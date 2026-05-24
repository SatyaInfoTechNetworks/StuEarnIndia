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
export async function sendNotification(userId, title, body, imageUrl = null) {
  try {
    // 1. Get user fcm_token & uid
    const [rows] = await pool.query('SELECT fcm_token, uid FROM users WHERE id = ? LIMIT 1', [userId]);
    
    if (rows.length === 0) return false;
    const user = rows[0];

    // Log to notification history
    await pool.query(
      'INSERT INTO notifications (id, title, message, image_url, target_type, target_user_id, sent_count, created_at) VALUES (UUID(), ?, ?, ?, "specific", ?, 1, NOW())',
      [title, body, imageUrl || null, userId]
    );

    if (!user.fcm_token) {
      console.log(`ℹ️ User ${userId} has no FCM token. Notification logged but not sent.`);
      return true;
    }

    if (firebaseApp) {
      const message = {
        token: user.fcm_token,
        notification: {
          title,
          body,
          ...(imageUrl ? { image: imageUrl } : {})
        },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          title,
          body,
          image: imageUrl || '',
          type: 'general'
        }
      };

      await admin.messaging().send(message);
      console.log(`📲 Push notification sent to user ${userId}`);
    } else {
      console.log(`📲 [Mock Push] ${title}: ${body} (Sent to token: ${user.fcm_token}, Banner: ${imageUrl || 'None'})`);
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
export async function broadcastNotification(title, body, imageUrl = null) {
  try {
    const [cnt] = await pool.query('SELECT COUNT(*) as c FROM users WHERE fcm_token IS NOT NULL AND fcm_token != ""');
    const sentCount = cnt[0].c;

    // Log to notification history
    await pool.query(
      'INSERT INTO notifications (id, title, message, image_url, target_type, target_user_id, sent_count, created_at) VALUES (UUID(), ?, ?, ?, "broadcast", NULL, ?, NOW())',
      [title, body, imageUrl || null, sentCount]
    );

    if (firebaseApp) {
      // Broadcast via topic (e.g., 'all')
      const message = {
        topic: 'all',
        notification: {
          title,
          body,
          ...(imageUrl ? { image: imageUrl } : {})
        },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          title,
          body,
          image: imageUrl || '',
          type: 'general'
        }
      };

      await admin.messaging().send(message);
      console.log(`📢 Global push broadcast sent.`);
    } else {
      console.log(`📢 [Mock Global Broadcast] ${title}: ${body} (Banner: ${imageUrl || 'None'})`);
    }

    return true;
  } catch (error) {
    console.error('❌ Broadcast Notification Error:', error.message);
    return false;
  }
}

/**
 * Send push notification to a specific topic (e.g. offers, games, wallet, vip)
 */
export async function sendTopicNotification(topic, title, body, imageUrl = null) {
  try {
    // Log to notification history
    await pool.query(
      'INSERT INTO notifications (id, title, message, image_url, target_type, target_topic, sent_count, created_at) VALUES (UUID(), ?, ?, ?, "topic", ?, 0, NOW())',
      [title, body, imageUrl || null, topic]
    );

    if (firebaseApp) {
      const message = {
        topic: topic,
        notification: {
          title,
          body,
          ...(imageUrl ? { image: imageUrl } : {})
        },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          title,
          body,
          image: imageUrl || '',
          type: 'topic'
        }
      };

      await admin.messaging().send(message);
      console.log(`📢 Topic push broadcast sent to: ${topic}`);
    } else {
      console.log(`📢 [Mock Topic Broadcast] ${topic} -> ${title}: ${body} (Banner: ${imageUrl || 'None'})`);
    }

    return true;
  } catch (error) {
    console.error('❌ Topic Notification Error:', error.message);
    return false;
  }
}
