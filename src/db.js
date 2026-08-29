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

      CREATE TABLE IF NOT EXISTS user_activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        resource_type TEXT DEFAULT 'system',
        resource_id INTEGER,
        details TEXT,
        ip_address TEXT DEFAULT '127.0.0.1',
        is_flagged INTEGER DEFAULT 0,
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

    const logCountResult = await dbInstance.get('SELECT COUNT(*) as count FROM user_activity_logs');
    if (logCountResult.count === 0) {
      await dbInstance.run(`
        INSERT INTO user_activity_logs (user_id, action, resource_type, resource_id, details, ip_address, is_flagged) VALUES
        (1, 'USER_LOGIN', 'auth', 1, 'Successful login via web interface', '192.168.1.10', 0),
        (2, 'EXPORT_DATA', 'reports', 102, 'Exported monthly user audit reports', '192.168.1.12', 1),
        (2, 'UPDATE_PROFILE', 'user', 2, 'Updated profile preferences and bio', '192.168.1.12', 0),
        (3, 'DELETE_ASSET', 'media', 45, 'Deleted temporary UI asset files', '192.168.1.15', 0);
      `);
    }
  }
  return dbInstance;
}

module.exports = { getDb };
