const { pool } = require('../config/db');

// Get all users (for member selection)
async function getAllUsers(req, res) {
  try {
    const [users] = await pool.query(
      'SELECT id, username FROM users WHERE id != ? ORDER BY username ASC',
      [req.user.id]
    );
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

// Search users by username
async function searchUsers(req, res) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json([]);
    }
    const searchTerm = `%${q.trim()}%`;
    const [users] = await pool.query(
      'SELECT id, username FROM users WHERE id != ? AND username LIKE ? ORDER BY username ASC LIMIT 20',
      [req.user.id, searchTerm]
    );
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to search users' });
  }
}

module.exports = {
  getAllUsers,
  searchUsers
};
