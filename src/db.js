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

      CREATE TABLE IF NOT EXISTS user_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        category TEXT DEFAULT 'general',
        is_private INTEGER DEFAULT 1,
        view_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
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

    const docCountResult = await dbInstance.get('SELECT COUNT(*) as count FROM user_documents');
    if (docCountResult.count === 0) {
      await dbInstance.run(`
        INSERT INTO user_documents (user_id, title, content, category, is_private, view_count) VALUES
        (1, 'System Architecture Blueprint', 'Confidential core architecture specs and API keys guidelines.', 'engineering', 1, 42),
        (2, 'Backend Optimization Guide', 'Best practices for Node.js microservices performance.', 'engineering', 0, 15),
        (2, 'Developer Onboarding Notes', 'Steps to set up local environment and SQLite DB.', 'onboarding', 1, 5),
        (3, 'UI Design Guidelines', 'Color palettes, typography, and component specs.', 'design', 0, 88);
      `);
    }
  }
  return dbInstance;
}

module.exports = { getDb };
