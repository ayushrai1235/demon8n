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

      CREATE TABLE IF NOT EXISTS user_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        author_name TEXT NOT NULL,
        comment_text TEXT NOT NULL,
        topic TEXT DEFAULT 'general',
        is_pinned INTEGER DEFAULT 0,
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

    const commentCountResult = await dbInstance.get('SELECT COUNT(*) as count FROM user_comments');
    if (commentCountResult.count === 0) {
      await dbInstance.run(`
        INSERT INTO user_comments (user_id, author_name, comment_text, topic, is_pinned, view_count) VALUES
        (1, 'Alice Smith', 'Architecture review completed for microservice authentication.', 'architecture', 1, 35),
        (2, 'Bob Jones', 'Refactored SQLite database initialization routines.', 'database', 0, 12),
        (2, 'Bob Jones', 'Added integration tests for express routing layer.', 'testing', 1, 8),
        (3, 'Charlie Brown', 'Updated dark mode component color tokens.', 'frontend', 0, 42);
      `);
    }
  }
  return dbInstance;
}

module.exports = { getDb };
