const { pool } = require('../config/db');

// Create a new split group
async function createGroup(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { name, description, memberIds = [] } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Create group
    const [result] = await conn.query(
      'INSERT INTO shared_split_groups (name, description, created_by) VALUES (?, ?, ?)',
      [name, description || '', userId]
    );

    const groupId = result.insertId;

    // Add creator as member
    await conn.query(
      'INSERT INTO shared_split_group_members (group_id, user_id) VALUES (?, ?)',
      [groupId, userId]
    );

    // Add other members
    for (const memberId of memberIds) {
      if (memberId === userId) continue;
      try {
        await conn.query(
          'INSERT INTO shared_split_group_members (group_id, user_id) VALUES (?, ?)',
          [groupId, memberId]
        );

        // Notify member
        const [user] = await conn.query('SELECT username FROM users WHERE id = ?', [userId]);
        const creatorName = user.length > 0 ? user[0].username : 'Someone';
        
        await conn.query(
          `INSERT INTO notifications (user_id, type, title, body, reference_id)
           VALUES (?, 'group_invite', ?, ?, ?)`,
          [memberId, `Added to group: ${name}`, `${creatorName} added you to ${name}`, groupId]
        );
      } catch (err) {
        console.error('Error adding member:', err);
      }
    }

    await conn.commit();
    res.json({ success: true, groupId, name });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to create group' });
  } finally {
    conn.release();
  }
}

// Get all groups for current user
async function getGroups(req, res) {
  try {
    const userId = req.user.id;
    const [groups] = await pool.query(
      `SELECT sg.*, u.username as created_by_name,
              COUNT(DISTINCT sgm.user_id) as member_count
       FROM shared_split_groups sg
       JOIN shared_split_group_members sgm ON sg.id = sgm.group_id
       JOIN users u ON sg.created_by = u.id
       WHERE sgm.user_id = ?
       GROUP BY sg.id
       ORDER BY sg.created_at DESC`,
      [userId]
    );
    res.json(groups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
}

// Get group members
async function getGroupMembers(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check if user is member
    const [membership] = await pool.query(
      'SELECT * FROM shared_split_group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (!membership.length) {
      return res.status(403).json({ error: 'Not a group member' });
    }

    const [members] = await pool.query(
      `SELECT u.id, u.username, sgm.joined_at
       FROM shared_split_group_members sgm
       JOIN users u ON sgm.user_id = u.id
       WHERE sgm.group_id = ?
       ORDER BY sgm.joined_at ASC`,
      [groupId]
    );

    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
}

// Add member to group
async function addMember(req, res) {
  try {
    const { groupId } = req.params;
    const { userId: newMemberId } = req.body;
    const userId = req.user.id;

    // Check if group exists
    const [group] = await pool.query(
      'SELECT * FROM shared_split_groups WHERE id = ?',
      [groupId]
    );

    if (!group.length) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if already member
    const [existing] = await pool.query(
      'SELECT * FROM shared_split_group_members WHERE group_id = ? AND user_id = ?',
      [groupId, newMemberId]
    );

    if (existing.length) {
      return res.status(400).json({ error: 'User already in group' });
    }

    // Add member (any current member can add)
    await pool.query(
      'INSERT INTO shared_split_group_members (group_id, user_id) VALUES (?, ?)',
      [groupId, newMemberId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add member' });
  }
}

// Add expense to group
async function addExpense(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { groupId, description, amount, category, splits } = req.body;
    const userId = req.user.id;

    if (!groupId || !description || !amount || !splits || splits.length === 0) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user is member
    const [membership] = await conn.query(
      'SELECT * FROM shared_split_group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (!membership.length) {
      return res.status(403).json({ error: 'Not a group member' });
    }

    // Insert expense
    const [expenseResult] = await conn.query(
      `INSERT INTO shared_split_expenses (group_id, description, amount, category, paid_by)
       VALUES (?, ?, ?, ?, ?)`,
      [groupId, description, parseFloat(amount), category || null, userId]
    );

    const expenseId = expenseResult.insertId;

    // Add splits for each person
    for (const split of splits) {
      await conn.query(
        `INSERT INTO shared_split_expense_splits (expense_id, user_id, amount, status)
         VALUES (?, ?, ?, 'pending')`,
        [expenseId, split.userId, parseFloat(split.amount)]
      );

      // Notify each person (except payer)
      if (split.userId !== userId) {
        await conn.query(
          `INSERT INTO notifications (user_id, type, title, body, reference_id)
           VALUES (?, 'expense_split', ?, ?, ?)`,
          [
            split.userId,
            `New expense: ${description}`,
            `${req.user.username} added an expense. You owe ₹${split.amount}`,
            expenseId
          ]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, expenseId });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to add expense' });
  } finally {
    conn.release();
  }
}

// Get group expenses
async function getGroupExpenses(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check if user is member
    const [membership] = await pool.query(
      'SELECT * FROM shared_split_group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (!membership.length) {
      return res.status(403).json({ error: 'Not a group member' });
    }

    const [expenses] = await pool.query(
      `SELECT se.id, se.description, se.amount, se.category, se.paid_by, se.created_at,
              u.username as paid_by_name
       FROM shared_split_expenses se
       JOIN users u ON se.paid_by = u.id
       WHERE se.group_id = ?
       ORDER BY se.created_at DESC`,
      [groupId]
    );

    // Get splits for each expense
    for (const expense of expenses) {
      const [splits] = await pool.query(
        `SELECT sses.id, sses.user_id, sses.amount, sses.status, u.username
         FROM shared_split_expense_splits sses
         JOIN users u ON sses.user_id = u.id
         WHERE sses.expense_id = ?`,
        [expense.id]
      );
      expense.splits = splits;
    }

    res.json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
}

// Get group balance summary
async function getGroupBalance(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check if user is member
    const [membership] = await pool.query(
      'SELECT * FROM shared_split_group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (!membership.length) {
      return res.status(403).json({ error: 'Not a group member' });
    }

    // Calculate balances
    const [balances] = await pool.query(
      `SELECT 
        sgm.user_id, 
        u.username,
        COALESCE(SUM(CASE WHEN se.paid_by = sgm.user_id THEN se.amount ELSE 0 END), 0) as paid,
        COALESCE(SUM(CASE WHEN sses.user_id = sgm.user_id THEN sses.amount ELSE 0 END), 0) as owes
       FROM shared_split_group_members sgm
       JOIN users u ON sgm.user_id = u.id
       LEFT JOIN shared_split_expenses se ON se.group_id = ? AND se.group_id = ?
       LEFT JOIN shared_split_expense_splits sses ON se.id = sses.expense_id AND sses.user_id = sgm.user_id
       WHERE sgm.group_id = ?
       GROUP BY sgm.user_id
       ORDER BY u.username ASC`,
      [groupId, groupId, groupId]
    );

    // Calculate net balance for each user
    const summary = balances.map(b => ({
      userId: b.user_id,
      username: b.username,
      paid: parseFloat(b.paid),
      owes: parseFloat(b.owes),
      balance: parseFloat(b.paid) - parseFloat(b.owes)
    }));

    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
}

// Settle split (mark as paid)
async function settleExpenseSplit(req, res) {
  try {
    const { splitId } = req.params;
    const userId = req.user.id;

    // Get the split
    const [split] = await pool.query(
      'SELECT * FROM shared_split_expense_splits WHERE id = ?',
      [splitId]
    );

    if (!split.length) {
      return res.status(404).json({ error: 'Split not found' });
    }

    // Update status
    await pool.query(
      'UPDATE shared_split_expense_splits SET status = ? WHERE id = ?',
      ['settled', splitId]
    );

    // Notify payer
    const [expense] = await pool.query(
      'SELECT paid_by, description FROM shared_split_expenses WHERE id = ?',
      [split[0].expense_id]
    );

    if (expense.length) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body)
         VALUES (?, 'expense_settled', ?, ?)`,
        [expense[0].paid_by, `Payment received for ${expense[0].description}`, `${req.user.username} settled their share of ₹${split[0].amount}`]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to settle split' });
  }
}

module.exports = {
  createGroup,
  getGroups,
  getGroupMembers,
  addMember,
  addExpense,
  getGroupExpenses,
  getGroupBalance,
  settleExpenseSplit
};
