const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let dbInstance = null;

async function getDb() {
  if (!dbInstance) {
    dbInstance = await open({
      filename: ':memory:',
      driver: sqlite3.Database
    });

    await dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL
      );
    `);

    const countResult = await dbInstance.get('SELECT COUNT(*) as count FROM users');
    if (countResult.count === 0) {
      await dbInstance.run(`
        INSERT INTO users (name, email, role) VALUES
        ('Alice Smith', 'alice@example.com', 'admin'),
        ('Bob Jones', 'bob@example.com', 'developer'),
        ('Charlie Brown', 'charlie@example.com', 'designer'),
        ('Diana Prince', 'diana@example.com', 'manager'),
        ('Evan Wright', 'evan@example.com', 'developer');
      `);
    }
  }
  return dbInstance;
}

module.exports = { getDb };
