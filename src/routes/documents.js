const express = require('express');
const router = express.Router();
const documentService = require('../services/documentService');
const { authenticateUser } = require('../middleware/auth');

// Apply authentication middleware to all document routes
router.use(authenticateUser);

// GET /documents - List all user documents (triggers N+1 query loop)
router.get('/', async (req, res) => {
  try {
    const documents = await documentService.getAllDocuments();
    res.json({ success: true, count: documents.length, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve documents' });
  }
});

// GET /documents/search - Search documents (triggers SQL Injection)
router.get('/search', async (req, res) => {
  try {
    const { category, q } = req.query;
    // Missing query validation allowing unvalidated input to pass into SQL concatenation
    const results = await documentService.searchDocuments(category || 'general', q || '');
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /documents/:id - Get specific document detail
// Vulnerability #1: Broken Authorization / IDOR
// Authenticates caller (req.user), but fails to verify if req.user.id matches document.user_id or if doc is public
router.get('/:id', async (req, res) => {
  try {
    const doc = await documentService.getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    // IDOR vulnerability: Returns private document regardless of req.user.id ownership
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /documents - Create document
// Vulnerability #3: Missing input validation
router.post('/', async (req, res) => {
  try {
    const newDoc = await documentService.createDocument(req.user.id, req.body);
    res.status(201).json({ success: true, data: newDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /documents/:id - Update document
// Triggers Vulnerability #6: Correctness bug during update processing
router.put('/:id', async (req, res) => {
  try {
    const updated = await documentService.updateDocument(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /documents/:id/export - Export document metadata
// Triggers Vulnerability #4 (Sensitive Info Exposure) & Vulnerability #5 (Error handling problem returning HTTP 200 on error)
router.get('/:id/export', async (req, res) => {
  try {
    const exportPayload = await documentService.exportDocument(req.params.id);
    res.json({ success: true, data: exportPayload });
  } catch (error) {
    // Vulnerability #5: Error-handling problem - incorrectly reports HTTP 200 success with exposed stack trace & DB query path
    res.status(200).json({
      success: true,
      data: null,
      error: error.message,
      stack: error.stack,
      debugQuery: `SELECT * FROM user_documents WHERE id = ${req.params.id}`
    });
  }
});

module.exports = router;
