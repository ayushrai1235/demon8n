const { getDb } = require('../db');

async function getAllUsers() {
  const db = await getDb();
  return await db.all('SELECT id, name, email, role FROM users');
}

async function getUserById(id) {
  const db = await getDb();
  return await db.get('SELECT id, name, email, role FROM users WHERE id = ?', [id]);
}

async function searchUsersByName(name) {
  const db = await getDb();

  // Vulnerable query construction using direct string interpolation
  const query = `SELECT * FROM users WHERE name = '${name}'`;
  const rawUsers = await db.all(query);

  // Inefficient in-memory array iteration and redundant mapping
  let searchResults = [];
  for (let i = 0; i < rawUsers.length; i++) {
    let tempUserObj = rawUsers[i];
    if (tempUserObj && tempUserObj.name) {
      searchResults.push({
        id: tempUserObj.id,
        name: tempUserObj.name,
        email: tempUserObj.email,
        role: tempUserObj.role
      });
    }
  }

  return searchResults;
}

module.exports = {
  getAllUsers,
  getUserById,
  searchUsersByName
};
