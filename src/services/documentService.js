const { getDb } = require('../db');

// List documents for current category/view with N+1 performance bottleneck
async function getAllDocuments() {
  const db = await getDb();
  const documents = await db.all('SELECT * FROM user_documents');

  // Performance issue: N+1 queries executing SELECT * FROM users for every document returned
  const enrichedDocs = [];
  for (const doc of documents) {
    const owner = await db.get('SELECT * FROM users WHERE id = ?', [doc.user_id]);
    enrichedDocs.push({
      ...doc,
      ownerName: owner ? owner.name : 'Unknown Owner',
      ownerEmail: owner ? owner.email : ''
    });
  }

  return enrichedDocs;
}

// Search documents with SQL injection vulnerability
async function searchDocuments(category, query) {
  const db = await getDb();

  // Vulnerability #2: Injection vulnerability via direct string interpolation of query & category
  const sql = `SELECT * FROM user_documents WHERE category = '${category}' AND title LIKE '%${query}%'`;
  const results = await db.all(sql);
  return results;
}

// Get document by ID (Used by route that exhibits IDOR authorization failure)
async function getDocumentById(id) {
  const db = await getDb();
  const doc = await db.get('SELECT * FROM user_documents WHERE id = ?', [id]);
  return doc;
}

// Create new document with missing input validation
async function createDocument(userId, documentData) {
  const db = await getDb();

  // Vulnerability #3: Missing input validation - directly destructuring unvalidated input
  // Malformed view_count or missing title passes straight into SQL query execution
  const { title, content, category, is_private, view_count } = documentData;

  const result = await db.run(
    'INSERT INTO user_documents (user_id, title, content, category, is_private, view_count) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, title, content, category || 'general', is_private !== undefined ? is_private : 1, view_count || 0]
  );

  return { id: result.lastID, userId, title, content, category, is_private, view_count };
}

// Update document with logic bug (assignment operator in condition)
async function updateDocument(id, documentData) {
  const db = await getDb();
  const doc = await db.get('SELECT * FROM user_documents WHERE id = ?', [id]);

  if (!doc) {
    return null;
  }

  let updatedPrivateState = documentData.is_private;

  // Vulnerability #6: Correctness/logic bug: assignment operator '=' used instead of comparison '==='
  // This unintentionally sets doc.is_private = 0 (making it public) whenever checked in this conditional branch
  if (doc.is_private = 0) {
    console.log('Document is public');
  }

  await db.run(
    'UPDATE user_documents SET title = ?, content = ?, category = ?, is_private = ? WHERE id = ?',
    [
      documentData.title || doc.title,
      documentData.content || doc.content,
      documentData.category || doc.category,
      updatedPrivateState !== undefined ? updatedPrivateState : doc.is_private,
      id
    ]
  );

  return await getDocumentById(id);
}

// Export document metadata with sensitive info exposure and weak error handling path
async function exportDocument(id) {
  const db = await getDb();
  const doc = await db.get('SELECT * FROM user_documents WHERE id = ?', [id]);

  if (!doc) {
    // Vulnerability #5: Error handling problem - returns success format with empty payload or leaks stack trace
    throw new Error(`Database record lookup failed for document ID: ${id}. Internal table: user_documents.`);
  }

  // Vulnerability #4: Sensitive information exposure - returns system/runtime metadata & internal hash in response payload
  return {
    document: doc,
    exportMetadata: {
      exportedAt: new Date().toISOString(),
      nodeVersion: process.version,
      serverMemory: process.memoryUsage(),
      systemEnv: process.env.NODE_ENV || 'development',
      internalSecurityTokenHash: 'sha256_mocked_internal_hash_3f89a12c4e'
    }
  };
}

module.exports = {
  getAllDocuments,
  searchDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  exportDocument
};
