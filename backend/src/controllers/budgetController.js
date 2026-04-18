const { pool } = require('../config/db');
const { sendPushToUser, createNotification } = require('./notificationController');

async function getBudgets(req, res) {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    const [budgets] = await pool.query(
      'SELECT * FROM budgets WHERE user_id = ? AND year = ? AND (month = ? OR type = "category")',
      [userId, y, m]
    );

    // Get spending for each budget
    const result = [];
    for (const budget of budgets) {
      let spentQuery, spentParams;
      if (budget.type === 'monthly') {
        spentQuery = `SELECT COALESCE(SUM(amount),0) as spent FROM transactions 
                      WHERE user_id=? AND type='expense' AND MONTH(transaction_date)=? AND YEAR(transaction_date)=?`;
        spentParams = [userId, budget.month, budget.year];
      } else {
        spentQuery = `SELECT COALESCE(SUM(amount),0) as spent FROM transactions 
                      WHERE user_id=? AND type='expense' AND category=? AND MONTH(transaction_date)=? AND YEAR(transaction_date)=?`;
        spentParams = [userId, budget.category, m, y];
      }
      const [[{ spent }]] = await pool.query(spentQuery, spentParams);
      result.push({ ...budget, spent: parseFloat(spent) });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
}

async function createBudget(req, res) {
  try {
    const userId = req.user.id;
    const { type, month, year, category, amount } = req.body;

    if (!type || !year || !amount) {
      return res.status(400).json({ error: 'type, year, and amount are required' });
    }
    if (type === 'monthly' && !month) {
      return res.status(400).json({ error: 'month required for monthly budget' });
    }
    if (type === 'category' && !category) {
      return res.status(400).json({ error: 'category required for category budget' });
    }

    const [result] = await pool.query(
      `INSERT INTO budgets (user_id, type, month, year, category, amount) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
      [userId, type, month || null, year, category || null, parseFloat(amount)]
    );

    res.status(201).json({ id: result.insertId, message: 'Budget saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save budget' });
  }
}

async function updateBudget(req, res) {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    await pool.query(
      'UPDATE budgets SET amount = ? WHERE id = ? AND user_id = ?',
      [parseFloat(amount), id, req.user.id]
    );
    res.json({ message: 'Budget updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update budget' });
  }
}

async function deleteBudget(req, res) {
  try {
    await pool.query(
      'DELETE FROM budgets WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Budget deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete budget' });
  }
}

// Called after each transaction to notify budget remaining
async function checkBudgetAndNotify(userId, transaction) {
  try {
    if (transaction.type !== 'expense') return;

    const now = new Date(transaction.transaction_date);
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Check monthly budget
    const [monthlyBudgets] = await pool.query(
      'SELECT * FROM budgets WHERE user_id=? AND type="monthly" AND month=? AND year=?',
      [userId, month, year]
    );

    for (const budget of monthlyBudgets) {
      const [[{ spent }]] = await pool.query(
        `SELECT COALESCE(SUM(amount),0) as spent FROM transactions 
         WHERE user_id=? AND type='expense' AND MONTH(transaction_date)=? AND YEAR(transaction_date)=?`,
        [userId, month, year]
      );
      const remaining = budget.amount - parseFloat(spent);
      const pct = (parseFloat(spent) / budget.amount) * 100;

      let msg = null;
      if (remaining < 0) {
        msg = `⚠️ You've exceeded your monthly budget by ₹${Math.abs(remaining).toFixed(2)}!`;
      } else if (pct >= 90) {
        msg = `🔴 Monthly budget alert: Only ₹${remaining.toFixed(2)} left (${(100 - pct).toFixed(0)}% remaining)`;
      } else if (pct >= 75) {
        msg = `🟡 Monthly budget: ₹${remaining.toFixed(2)} remaining (${(100 - pct).toFixed(0)}% left)`;
      } else {
        msg = `💰 Monthly budget: ₹${remaining.toFixed(2)} remaining after this transaction`;
      }

      if (msg) {
        await sendPushToUser(userId, 'Budget Update', msg);
        await createNotification(userId, 'Budget Update', msg, 'budget', budget.id);
      }
    }

    // Check category budget
    const [catBudgets] = await pool.query(
      'SELECT * FROM budgets WHERE user_id=? AND type="category" AND category=? AND year=?',
      [userId, transaction.category, year]
    );

    for (const budget of catBudgets) {
      const [[{ spent }]] = await pool.query(
        `SELECT COALESCE(SUM(amount),0) as spent FROM transactions 
         WHERE user_id=? AND type='expense' AND category=? AND MONTH(transaction_date)=? AND YEAR(transaction_date)=?`,
        [userId, transaction.category, month, year]
      );
      const remaining = budget.amount - parseFloat(spent);
      const pct = (parseFloat(spent) / budget.amount) * 100;
      const catLabel = transaction.category.replace('_', ' ');

      let msg = null;
      if (remaining < 0) {
        msg = `⚠️ ${catLabel} budget exceeded by ₹${Math.abs(remaining).toFixed(2)}!`;
      } else if (pct >= 90) {
        msg = `🔴 ${catLabel} budget: Only ₹${remaining.toFixed(2)} left!`;
      } else if (pct >= 75) {
        msg = `🟡 ${catLabel} budget: ₹${remaining.toFixed(2)} remaining`;
      } else {
        msg = `💳 ${catLabel} budget: ₹${remaining.toFixed(2)} left this month`;
      }

      if (msg) {
        await sendPushToUser(userId, 'Category Budget', msg);
        await createNotification(userId, 'Category Budget', msg, 'budget_category', budget.id);
      }
    }
  } catch (err) {
    console.error('Budget notify error:', err);
  }
}

module.exports = { getBudgets, createBudget, updateBudget, deleteBudget, checkBudgetAndNotify };
