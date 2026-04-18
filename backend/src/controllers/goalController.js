const { pool } = require('../config/db');

async function getGoals(req, res) {
  try {
    const [goals] = await pool.query(
      'SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
}

async function createGoal(req, res) {
  try {
    const { name, target_amount, deadline, emoji } = req.body;
    if (!name || !target_amount) {
      return res.status(400).json({ error: 'name and target_amount required' });
    }
    const [result] = await pool.query(
      'INSERT INTO goals (user_id, name, target_amount, deadline, emoji) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, name, parseFloat(target_amount), deadline || null, emoji || '🎯']
    );
    const [goal] = await pool.query('SELECT * FROM goals WHERE id = ?', [result.insertId]);
    res.status(201).json(goal[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create goal' });
  }
}

async function updateGoal(req, res) {
  try {
    const { name, target_amount, deadline, emoji } = req.body;
    await pool.query(
      'UPDATE goals SET name=?, target_amount=?, deadline=?, emoji=? WHERE id=? AND user_id=?',
      [name, parseFloat(target_amount), deadline || null, emoji || '🎯', req.params.id, req.user.id]
    );
    res.json({ message: 'Goal updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update goal' });
  }
}

async function deleteGoal(req, res) {
  try {
    await pool.query(
      'DELETE FROM goals WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
}

async function allocateToGoals(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { allocations } = req.body; // [{ goal_id, amount, note }]
    if (!allocations?.length) {
      return res.status(400).json({ error: 'allocations array required' });
    }

    for (const alloc of allocations) {
      if (!alloc.goal_id || !alloc.amount || alloc.amount <= 0) continue;

      const [goals] = await conn.query(
        'SELECT * FROM goals WHERE id = ? AND user_id = ?',
        [alloc.goal_id, req.user.id]
      );
      if (!goals.length) continue;

      await conn.query(
        'UPDATE goals SET current_amount = current_amount + ? WHERE id = ?',
        [parseFloat(alloc.amount), alloc.goal_id]
      );
      await conn.query(
        'INSERT INTO goal_allocations (goal_id, amount, note) VALUES (?, ?, ?)',
        [alloc.goal_id, parseFloat(alloc.amount), alloc.note || null]
      );
    }

    await conn.commit();
    res.json({ message: 'Allocated successfully' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Allocation failed' });
  } finally {
    conn.release();
  }
}

async function getGoalAllocations(req, res) {
  try {
    const [allocs] = await pool.query(
      `SELECT ga.* FROM goal_allocations ga
       JOIN goals g ON ga.goal_id = g.id
       WHERE ga.goal_id = ? AND g.user_id = ?
       ORDER BY ga.allocated_at DESC`,
      [req.params.id, req.user.id]
    );
    res.json(allocs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch allocations' });
  }
}

module.exports = { getGoals, createGoal, updateGoal, deleteGoal, allocateToGoals, getGoalAllocations };
