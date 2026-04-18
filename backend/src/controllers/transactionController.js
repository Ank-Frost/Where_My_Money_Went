const { pool } = require('../config/db');
const { checkBudgetAndNotify } = require('./budgetController');

async function getTransactions(req, res) {
  try {
    const userId = req.user.id;
    const { view, date, month, year, week } = req.query;
    
    let dateCondition = '';
    let params = [userId];

    if (view === 'daily' && date) {
      dateCondition = 'AND DATE(t.transaction_date) = ?';
      params.push(date);
    } else if (view === 'weekly' && week && year) {
      dateCondition = 'AND YEARWEEK(t.transaction_date, 1) = YEARWEEK(STR_TO_DATE(?, "%Y-%u"), 1)';
      params.push(`${year}-${week}`);
    } else if (view === 'monthly' && month && year) {
      dateCondition = 'AND MONTH(t.transaction_date) = ? AND YEAR(t.transaction_date) = ?';
      params.push(Number(month), Number(year));
    } else if (view === 'yearly' && year) {
      dateCondition = 'AND YEAR(t.transaction_date) = ?';
      params.push(Number(year));
    }

    const [transactions] = await pool.query(`
      SELECT t.*, 
        GROUP_CONCAT(tg.name ORDER BY tg.name SEPARATOR ',') as tags
      FROM transactions t
      LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      WHERE t.user_id = ? ${dateCondition}
      GROUP BY t.id
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `, params);

    // Parse tags into arrays
    const result = transactions.map(t => ({
      ...t,
      tags: t.tags ? t.tags.split(',') : []
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

async function createTransaction(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const userId = req.user.id;
    const { type, amount, description, category, account_mode, transaction_date, tags = [] } = req.body;

    if (!type || !amount || !description || !category || !account_mode || !transaction_date) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const [result] = await conn.query(
      `INSERT INTO transactions (user_id, type, amount, description, category, account_mode, transaction_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, type, parseFloat(amount), description, category, account_mode, transaction_date]
    );

    const transactionId = result.insertId;

    // Handle tags
    for (const tagName of tags) {
      const trimmed = tagName.trim();
      if (!trimmed) continue;
      
      // Upsert tag
      await conn.query(
        `INSERT INTO tags (user_id, name, use_count) VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE use_count = use_count + 1`,
        [userId, trimmed]
      );
      
      const [tagRows] = await conn.query(
        'SELECT id FROM tags WHERE user_id = ? AND name = ?',
        [userId, trimmed]
      );
      
      if (tagRows.length) {
        await conn.query(
          'INSERT IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)',
          [transactionId, tagRows[0].id]
        );
      }
    }

    await conn.commit();

    // Fetch the created transaction with tags
    const [newTx] = await pool.query(`
      SELECT t.*, GROUP_CONCAT(tg.name SEPARATOR ',') as tags
      FROM transactions t
      LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      WHERE t.id = ?
      GROUP BY t.id
    `, [transactionId]);

    const transaction = {
      ...newTx[0],
      tags: newTx[0].tags ? newTx[0].tags.split(',') : []
    };

    // Check budget and send notification (async, don't await to not delay response)
    checkBudgetAndNotify(userId, transaction).catch(console.error);

    res.status(201).json(transaction);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to create transaction' });
  } finally {
    conn.release();
  }
}

async function updateTransaction(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const userId = req.user.id;
    const { type, amount, description, category, account_mode, transaction_date, tags = [] } = req.body;

    const [existing] = await conn.query(
      'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (!existing.length) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await conn.query(
      `UPDATE transactions SET type=?, amount=?, description=?, category=?, account_mode=?, transaction_date=?
       WHERE id = ? AND user_id = ?`,
      [type, parseFloat(amount), description, category, account_mode, transaction_date, id, userId]
    );

    // Re-sync tags
    await conn.query('DELETE FROM transaction_tags WHERE transaction_id = ?', [id]);
    
    for (const tagName of tags) {
      const trimmed = tagName.trim();
      if (!trimmed) continue;
      await conn.query(
        `INSERT INTO tags (user_id, name, use_count) VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE use_count = use_count + 1`,
        [userId, trimmed]
      );
      const [tagRows] = await conn.query(
        'SELECT id FROM tags WHERE user_id = ? AND name = ?',
        [userId, trimmed]
      );
      if (tagRows.length) {
        await conn.query(
          'INSERT IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)',
          [id, tagRows[0].id]
        );
      }
    }

    await conn.commit();
    res.json({ message: 'Transaction updated' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to update transaction' });
  } finally {
    conn.release();
  }
}

async function deleteTransaction(req, res) {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
}

async function getStats(req, res) {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    const [summary] = await pool.query(`
      SELECT 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expense,
        COUNT(*) as total_transactions
      FROM transactions
      WHERE user_id = ? AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?
    `, [userId, m, y]);

    const [byCategory] = await pool.query(`
      SELECT category, SUM(amount) as total
      FROM transactions
      WHERE user_id = ? AND type='expense' AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?
      GROUP BY category
      ORDER BY total DESC
    `, [userId, m, y]);

    const [byDay] = await pool.query(`
      SELECT DATE(transaction_date) as day,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE user_id = ? AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?
      GROUP BY DATE(transaction_date)
      ORDER BY day
    `, [userId, m, y]);

    const [monthlyTrend] = await pool.query(`
      SELECT 
        YEAR(transaction_date) as year,
        MONTH(transaction_date) as month,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE user_id = ?
      GROUP BY YEAR(transaction_date), MONTH(transaction_date)
      ORDER BY year DESC, month DESC
      LIMIT 12
    `, [userId]);

    res.json({
      summary: summary[0],
      byCategory,
      byDay,
      monthlyTrend: monthlyTrend.reverse()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

async function searchTransactions(req, res) {
  try {
    const userId = req.user.id;
    const { q, category, account_mode, tag, startDate, endDate, type } = req.query;
    
    let conditions = ['t.user_id = ?'];
    let params = [userId];

    if (q) {
      conditions.push('t.description LIKE ?');
      params.push(`%${q}%`);
    }
    if (category) {
      conditions.push('t.category = ?');
      params.push(category);
    }
    if (account_mode) {
      conditions.push('t.account_mode = ?');
      params.push(account_mode);
    }
    if (type) {
      conditions.push('t.type = ?');
      params.push(type);
    }
    if (startDate) {
      conditions.push('DATE(t.transaction_date) >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('DATE(t.transaction_date) <= ?');
      params.push(endDate);
    }
    if (tag) {
      conditions.push('tg.name = ?');
      params.push(tag);
    }

    const where = conditions.join(' AND ');

    const [transactions] = await pool.query(`
      SELECT DISTINCT t.*,
        GROUP_CONCAT(DISTINCT tg2.name ORDER BY tg2.name SEPARATOR ',') as tags
      FROM transactions t
      LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      LEFT JOIN transaction_tags tt2 ON t.id = tt2.transaction_id
      LEFT JOIN tags tg2 ON tt2.tag_id = tg2.id
      WHERE ${where}
      GROUP BY t.id
      ORDER BY t.transaction_date DESC
      LIMIT 200
    `, params);

    res.json(transactions.map(t => ({
      ...t,
      tags: t.tags ? t.tags.split(',') : []
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
}

module.exports = {
  getTransactions, createTransaction, updateTransaction,
  deleteTransaction, getStats, searchTransactions
};
