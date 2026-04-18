const { pool } = require('../config/db');

async function getSubscriptions(req, res) {
  try {
    const [subs] = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY next_billing_date ASC',
      [req.user.id]
    );
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
}

async function createSubscription(req, res) {
  try {
    const { name, amount, billing_cycle, next_billing_date, category, notes } = req.body;
    if (!name || !amount || !billing_cycle || !next_billing_date) {
      return res.status(400).json({ error: 'name, amount, billing_cycle, next_billing_date required' });
    }
    const [result] = await pool.query(
      `INSERT INTO subscriptions (user_id, name, amount, billing_cycle, next_billing_date, category, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, name, parseFloat(amount), billing_cycle, next_billing_date, category || 'others', notes || null]
    );
    const [sub] = await pool.query('SELECT * FROM subscriptions WHERE id = ?', [result.insertId]);
    res.status(201).json(sub[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
}

async function updateSubscription(req, res) {
  try {
    const { name, amount, billing_cycle, next_billing_date, category, notes, is_active } = req.body;
    await pool.query(
      `UPDATE subscriptions SET name=?, amount=?, billing_cycle=?, next_billing_date=?, 
       category=?, notes=?, is_active=? WHERE id=? AND user_id=?`,
      [name, parseFloat(amount), billing_cycle, next_billing_date, category, notes, is_active, req.params.id, req.user.id]
    );
    res.json({ message: 'Subscription updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update subscription' });
  }
}

async function deleteSubscription(req, res) {
  try {
    await pool.query(
      'DELETE FROM subscriptions WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Subscription deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
}

module.exports = { getSubscriptions, createSubscription, updateSubscription, deleteSubscription };
