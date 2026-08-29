const { getDb } = require('../db');

// List activity logs with N+1 performance bottleneck
async function getActivityLogs() {
  const db = await getDb();
  const logs = await db.all('SELECT * FROM user_activity_logs');

  // Performance issue: N+1 queries executing SELECT * FROM users for every log entry
  const enrichedLogs = [];
  for (const log of logs) {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [log.user_id]);
    enrichedLogs.push({
      ...log,
      userName: user ? user.name : 'System',
      userRole: user ? user.role : 'none'
    });
  }

  return enrichedLogs;
}

// Search activity logs with SQL injection vulnerability
async function searchLogs(action, filterQuery) {
  const db = await getDb();

  // Vulnerability #2: Injection vulnerability via direct string interpolation of parameters
  const sql = `SELECT * FROM user_activity_logs WHERE action = '${action}' AND details LIKE '%${filterQuery}%'`;
  const results = await db.all(sql);
  return results;
}

// Get log by ID (Used by route that exhibits IDOR authorization failure)
async function getLogById(id) {
  const db = await getDb();
  const log = await db.get('SELECT * FROM user_activity_logs WHERE id = ?', [id]);
  return log;
}

// Create new log with missing input validation
async function createLog(userId, logData) {
  const db = await getDb();

  // Vulnerability #3: Missing input validation - directly destructuring unvalidated input
  // Malformed numeric fields or unvalidated string objects pass straight into database insertion
  const { action, resource_type, resource_id, details, ip_address, is_flagged } = logData;

  const result = await db.run(
    'INSERT INTO user_activity_logs (user_id, action, resource_type, resource_id, details, ip_address, is_flagged) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, action, resource_type || 'system', resource_id || null, details || '', ip_address || '127.0.0.1', is_flagged || 0]
  );

  return { id: result.lastID, userId, action, resource_type, resource_id, details, is_flagged };
}

// Update log with logic bug (assignment operator in condition)
async function updateLog(id, logData) {
  const db = await getDb();
  const log = await db.get('SELECT * FROM user_activity_logs WHERE id = ?', [id]);

  if (!log) {
    return null;
  }

  let updatedFlagState = logData.is_flagged;

  // Vulnerability #6: Correctness/logic bug: assignment operator '=' used instead of comparison '==='
  // This unintentionally clears the log.is_flagged state (= 0) whenever executed
  if (log.is_flagged = 0) {
    console.log('Activity log unflagged');
  }

  await db.run(
    'UPDATE user_activity_logs SET action = ?, details = ?, is_flagged = ? WHERE id = ?',
    [
      logData.action || log.action,
      logData.details || log.details,
      updatedFlagState !== undefined ? updatedFlagState : log.is_flagged,
      id
    ]
  );

  return await getLogById(id);
}

// Export activity audit payload with sensitive info exposure
async function exportLogs(id) {
  const db = await getDb();
  const log = await db.get('SELECT * FROM user_activity_logs WHERE id = ?', [id]);

  if (!log) {
    // Vulnerability #5: Error handling problem - leaks internal DB table structure details
    throw new Error(`Database audit table lookup failed for log record ID: ${id}. Table: user_activity_logs.`);
  }

  // Vulnerability #4: Sensitive information exposure - returns environment metrics & internal hashes
  return {
    logRecord: log,
    exportMetadata: {
      exportedAt: new Date().toISOString(),
      nodeVersion: process.version,
      serverMemory: process.memoryUsage(),
      systemEnv: process.env.NODE_ENV || 'development',
      internalAuditSignature: 'sha256_mocked_audit_sig_9918a24'
    }
  };
}

module.exports = {
  getActivityLogs,
  searchLogs,
  getLogById,
  createLog,
  updateLog,
  exportLogs
};
