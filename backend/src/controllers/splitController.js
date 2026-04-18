const { pool } = require('../config/db');

// People
async function getPeople(req, res) {
  try {
    const [people] = await pool.query(
      'SELECT * FROM split_people WHERE user_id = ? ORDER BY name',
      [req.user.id]
    );
    res.json(people);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch people' });
  }
}

async function addPerson(req, res) {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    const [result] = await pool.query(
      'INSERT IGNORE INTO split_people (user_id, name) VALUES (?, ?)',
      [req.user.id, name.trim()]
    );
    res.status(201).json({ id: result.insertId, name: name.trim() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add person' });
  }
}

async function deletePerson(req, res) {
  try {
    await pool.query(
      'DELETE FROM split_people WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Person deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete person' });
  }
}

// Groups
async function getGroups(req, res) {
  try {
    const [groups] = await pool.query(
      'SELECT * FROM split_groups WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    const result = [];
    for (const group of groups) {
      const [expenses] = await pool.query(
        'SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as total FROM split_expenses WHERE group_id = ?',
        [group.id]
      );
      const [balance] = await pool.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN ss.direction='owes_you' AND ss.is_settled=0 THEN ss.amount ELSE 0 END),0) as owed_to_you,
          COALESCE(SUM(CASE WHEN ss.direction='you_owe' AND ss.is_settled=0 THEN ss.amount ELSE 0 END),0) as you_owe
        FROM split_expenses se
        JOIN split_shares ss ON se.id = ss.split_expense_id
        WHERE se.group_id = ? AND se.user_id = ?
      `, [group.id, req.user.id]);

      result.push({
        ...group,
        expense_count: expenses[0].count,
        total_amount: parseFloat(expenses[0].total),
        owed_to_you: parseFloat(balance[0].owed_to_you),
        you_owe: parseFloat(balance[0].you_owe),
        net: parseFloat(balance[0].owed_to_you) - parseFloat(balance[0].you_owe)
      });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
}

async function createGroup(req, res) {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Group name required' });
    const [result] = await pool.query(
      'INSERT INTO split_groups (user_id, name, description) VALUES (?, ?, ?)',
      [req.user.id, name.trim(), description || null]
    );
    res.status(201).json({ id: result.insertId, name: name.trim() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group' });
  }
}

// Expenses
async function getExpenses(req, res) {
  try {
    const { groupId } = req.query;
    let query = `
      SELECT se.*, sg.name as group_name
      FROM split_expenses se
      LEFT JOIN split_groups sg ON se.group_id = sg.id
      WHERE se.user_id = ?
    `;
    const params = [req.user.id];
    if (groupId) {
      query += ' AND se.group_id = ?';
      params.push(groupId);
    }
    query += ' ORDER BY se.expense_date DESC, se.created_at DESC';

    const [expenses] = await pool.query(query, params);

    const result = [];
    for (const exp of expenses) {
      const [shares] = await pool.query(`
        SELECT ss.*, sp.name as person_name
        FROM split_shares ss
        JOIN split_people sp ON ss.person_id = sp.id
        WHERE ss.split_expense_id = ?
      `, [exp.id]);
      result.push({ ...exp, shares });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
}

async function createExpense(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { description, total_amount, expense_date, group_id, shares } = req.body;

    if (!description || !total_amount || !expense_date || !shares?.length) {
      return res.status(400).json({ error: 'description, total_amount, expense_date, and shares required' });
    }

    const [result] = await conn.query(
      'INSERT INTO split_expenses (user_id, description, total_amount, expense_date, group_id) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, description, parseFloat(total_amount), expense_date, group_id || null]
    );

    for (const share of shares) {
      await conn.query(
        'INSERT INTO split_shares (split_expense_id, person_id, amount, direction) VALUES (?, ?, ?, ?)',
        [result.insertId, share.person_id, parseFloat(share.amount), share.direction]
      );
    }

    await conn.commit();
    res.status(201).json({ id: result.insertId, message: 'Expense created' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to create expense' });
  } finally {
    conn.release();
  }
}

async function deleteExpense(req, res) {
  try {
    await pool.query(
      'DELETE FROM split_expenses WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
}

async function settleShare(req, res) {
  try {
    const { shareId } = req.params;
    await pool.query(
      `UPDATE split_shares ss
       JOIN split_expenses se ON ss.split_expense_id = se.id
       SET ss.is_settled = TRUE, ss.settled_at = NOW()
       WHERE ss.id = ? AND se.user_id = ?`,
      [shareId, req.user.id]
    );
    res.json({ message: 'Settled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to settle' });
  }
}

async function getSummary(req, res) {
  try {
    const userId = req.user.id;
    const [people] = await pool.query('SELECT * FROM split_people WHERE user_id = ?', [userId]);

    const summary = [];
    for (const person of people) {
      const [[bal]] = await pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN ss.direction='owes_you' AND ss.is_settled=0 THEN ss.amount ELSE 0 END),0) as owes_you,
          COALESCE(SUM(CASE WHEN ss.direction='you_owe' AND ss.is_settled=0 THEN ss.amount ELSE 0 END),0) as you_owe
        FROM split_shares ss
        JOIN split_expenses se ON ss.split_expense_id = se.id
        WHERE ss.person_id = ? AND se.user_id = ?
      `, [person.id, userId]);

      const net = parseFloat(bal.owes_you) - parseFloat(bal.you_owe);
      if (bal.owes_you > 0 || bal.you_owe > 0) {
        summary.push({
          person,
          owes_you: parseFloat(bal.owes_you),
          you_owe: parseFloat(bal.you_owe),
          net
        });
      }
    }

    const totalOwedToYou = summary.reduce((s, i) => s + i.owes_you, 0);
    const totalYouOwe = summary.reduce((s, i) => s + i.you_owe, 0);

    res.json({ summary, totalOwedToYou, totalYouOwe, netBalance: totalOwedToYou - totalYouOwe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
}

module.exports = {
  getPeople, addPerson, deletePerson,
  getGroups, createGroup,
  getExpenses, createExpense, deleteExpense, settleShare,
  getSummary
};
