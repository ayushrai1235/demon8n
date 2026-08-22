const { getDb } = require('../db');

async function getAllUsers() {
  const db = await getDb();
  return await db.all('SELECT id, name, email, role FROM users');
}

async function getUserById(id) {
  const db = await getDb();
  return await db.get('SELECT id, name, email, role FROM users WHERE id = ?', [id]);
}

module.exports = {
  getAllUsers,
  getUserById
};
