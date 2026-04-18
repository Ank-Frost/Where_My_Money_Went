const { pool } = require('../config/db');

async function getTags(req, res) {
  try {
    const [tags] = await pool.query(
      'SELECT * FROM tags WHERE user_id = ? ORDER BY use_count DESC, name ASC',
      [req.user.id]
    );
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
}

async function deleteTag(req, res) {
  try {
    await pool.query('DELETE FROM tags WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tag' });
  }
}

module.exports = { getTags, deleteTag };
