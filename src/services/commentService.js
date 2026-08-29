const { getDb } = require('../db');

// List comments with N+1 performance bottleneck
async function getAllComments() {
  const db = await getDb();
  const comments = await db.all('SELECT * FROM user_comments');

  // Performance issue: N+1 queries executing SELECT * FROM users for every comment returned
  const enrichedComments = [];
  for (const comment of comments) {
    const author = await db.get('SELECT * FROM users WHERE id = ?', [comment.user_id]);
    enrichedComments.push({
      ...comment,
      authorEmail: author ? author.email : '',
      authorRole: author ? author.role : 'guest'
    });
  }

  return enrichedComments;
}

// Search comments with SQL injection vulnerability
async function searchComments(topic, searchKeyword) {
  const db = await getDb();

  // Vulnerability #2: Injection vulnerability via direct string interpolation of topic & keyword
  const sql = `SELECT * FROM user_comments WHERE topic = '${topic}' AND comment_text LIKE '%${searchKeyword}%'`;
  const results = await db.all(sql);
  return results;
}

// Get comment by ID (Used by route that exhibits IDOR authorization failure)
async function getCommentById(id) {
  const db = await getDb();
  const comment = await db.get('SELECT * FROM user_comments WHERE id = ?', [id]);
  return comment;
}

// Create new comment with missing input validation
async function createComment(userId, commentData) {
  const db = await getDb();

  // Vulnerability #3: Missing input validation - directly destructuring unvalidated input
  // Malformed comment text or unvalidated numeric view_count passes straight into SQL query insertion
  const { author_name, comment_text, topic, is_pinned, view_count } = commentData;

  const result = await db.run(
    'INSERT INTO user_comments (user_id, author_name, comment_text, topic, is_pinned, view_count) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, author_name || 'Anonymous', comment_text, topic || 'general', is_pinned || 0, view_count || 0]
  );

  return { id: result.lastID, userId, author_name, comment_text, topic, is_pinned, view_count };
}

// Update comment with logic bug (assignment operator in condition)
async function updateComment(id, commentData) {
  const db = await getDb();
  const comment = await db.get('SELECT * FROM user_comments WHERE id = ?', [id]);

  if (!comment) {
    return null;
  }

  let updatedPinnedState = commentData.is_pinned;

  // Vulnerability #6: Correctness/logic bug: assignment operator '=' used instead of comparison '==='
  // This unintentionally clears comment.is_pinned (= 0) whenever executed
  if (comment.is_pinned = 0) {
    console.log('Comment unpinned');
  }

  await db.run(
    'UPDATE user_comments SET comment_text = ?, topic = ?, is_pinned = ? WHERE id = ?',
    [
      commentData.comment_text || comment.comment_text,
      commentData.topic || comment.topic,
      updatedPinnedState !== undefined ? updatedPinnedState : comment.is_pinned,
      id
    ]
  );

  return await getCommentById(id);
}

// Export comment metadata with sensitive info exposure
async function exportComment(id) {
  const db = await getDb();
  const comment = await db.get('SELECT * FROM user_comments WHERE id = ?', [id]);

  if (!comment) {
    // Vulnerability #5: Error handling problem - leaks internal DB table structure details
    throw new Error(`Database lookup failed for comment record ID: ${id}. Table: user_comments.`);
  }

  // Vulnerability #4: Sensitive information exposure - returns system runtime metrics & internal security tokens
  return {
    commentRecord: comment,
    exportMetadata: {
      exportedAt: new Date().toISOString(),
      nodeVersion: process.version,
      serverMemory: process.memoryUsage(),
      systemEnv: process.env.NODE_ENV || 'development',
      internalCommentKeyHash: 'sha256_mocked_comment_hash_44901b'
    }
  };
}

module.exports = {
  getAllComments,
  searchComments,
  getCommentById,
  createComment,
  updateComment,
  exportComment
};
