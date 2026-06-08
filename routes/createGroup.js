const router = require('express').Router();
const db = require('../configuration/databaseConnection');

async function ensureGroupsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS groups (
      group_id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      group_code VARCHAR(20) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS group_code VARCHAR(20)
  `);

  await db.query(`
    ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS groups_group_code_idx
    ON groups (group_code)
  `);
}

function generateGroupCode() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

router.post("/createGroup", async (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.redirect('/dashboard?group=missing-name');
  }

  try {
    await ensureGroupsTable();

    const groupCode = generateGroupCode();

    await db.query(
      'INSERT INTO groups (name, description, group_code) VALUES ($1, $2, $3)',
      [name.trim(), description || null, groupCode]
    );

    res.redirect(`/dashboard?group=created&code=${groupCode}`);

  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.post("/joinGroup", async (req, res) => {
  const { group_code } = req.body;
  const cleanCode = (group_code || '').trim();

  if (!cleanCode) {
    return res.redirect('/dashboard?group=missing-code');
  }

  try {
    await ensureGroupsTable();

    const result = await db.query(
      'SELECT name FROM groups WHERE group_code = $1',
      [cleanCode]
    );

    if (result.rows.length === 0) {
      return res.redirect('/dashboard?group=not-found');
    }

    res.redirect(`/dashboard?group=joined&code=${cleanCode}`);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
