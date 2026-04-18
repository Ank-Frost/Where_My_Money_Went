const { pool } = require('../config/db');
const webpush = require('web-push');

// Configure web push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendPushToUser(userId, title, body, data = {}) {
  try {
    const [subs] = await pool.query(
      'SELECT * FROM push_subscriptions WHERE user_id = ?',
      [userId]
    );
    const payload = JSON.stringify({ title, body, data });
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload
        );
      } catch (err) {
        if (err.statusCode === 410) {
          // Subscription expired, remove it
          await pool.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
        }
      }
    }
  } catch (err) {
    console.error('Push send error:', err);
  }
}

async function createNotification(userId, title, body, type, referenceId = null) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, title, body, type, reference_id) VALUES (?, ?, ?, ?, ?)',
      [userId, title, body, type, referenceId]
    );
  } catch (err) {
    console.error('Create notification error:', err);
  }
}

async function subscribePush(req, res) {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth_key = VALUES(auth_key)`,
      [req.user.id, endpoint, keys.p256dh, keys.auth]
    );
    res.json({ message: 'Push subscription saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save push subscription' });
  }
}

async function unsubscribePush(req, res) {
  try {
    const { endpoint } = req.body;
    await pool.query(
      'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      [req.user.id, endpoint]
    );
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
}

async function getNotifications(req, res) {
  try {
    const [notifs] = await pool.query(
      `SELECT * FROM notifications WHERE user_id = ? 
       AND (snooze_until IS NULL OR snooze_until <= NOW())
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

async function markRead(req, res) {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification' });
  }
}

async function markAllRead(req, res) {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications' });
  }
}

async function snoozeNotification(req, res) {
  try {
    const { snoozeMinutes } = req.body;
    const snoozeUntil = new Date(Date.now() + (snoozeMinutes || 60) * 60 * 1000);
    await pool.query(
      'UPDATE notifications SET snooze_until = ? WHERE id = ? AND user_id = ?',
      [snoozeUntil, req.params.id, req.user.id]
    );
    res.json({ message: 'Notification snoozed', snoozeUntil });
  } catch (err) {
    res.status(500).json({ error: 'Failed to snooze' });
  }
}

async function getVapidPublicKey(req, res) {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
}

module.exports = {
  sendPushToUser, createNotification,
  subscribePush, unsubscribePush,
  getNotifications, markRead, markAllRead,
  snoozeNotification, getVapidPublicKey
};
