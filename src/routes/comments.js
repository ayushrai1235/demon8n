const express = require('express');
const router = express.Router();
const commentService = require('../services/commentService');
const { authenticateUser } = require('../middleware/auth');

// Apply authentication middleware to all comment routes
router.use(authenticateUser);

// GET /comments - List all user comments (triggers N+1 query loop)
router.get('/', async (req, res) => {
  try {
    const comments = await commentService.getAllComments();
    res.json({ success: true, count: comments.length, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve comments' });
  }
});

// GET /comments/search - Search user comments (triggers SQL Injection)
router.get('/search', async (req, res) => {
  try {
    const { topic, q } = req.query;
    // Missing query validation allowing unvalidated input to pass into SQL concatenation
    const results = await commentService.searchComments(topic || 'general', q || '');
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /comments/:id - Get specific comment
// Vulnerability #1: Broken Authorization / IDOR
// Authenticates caller (req.user), but fails to verify if req.user.id matches comment.user_id or if comment is pinned/private
router.get('/:id', async (req, res) => {
  try {
    const comment = await commentService.getCommentById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    // IDOR vulnerability: Returns private/pinned comment regardless of req.user.id ownership
    res.json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /comments - Create new comment
// Vulnerability #3: Missing input validation
router.post('/', async (req, res) => {
  try {
    const newComment = await commentService.createComment(req.user.id, req.body);
    res.status(201).json({ success: true, data: newComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /comments/:id - Update comment
// Triggers Vulnerability #6: Correctness bug during update processing
router.put('/:id', async (req, res) => {
  try {
    const updated = await commentService.updateComment(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /comments/:id/export - Export comment payload
// Triggers Vulnerability #4 (Sensitive Info Exposure) & Vulnerability #5 (Error handling problem returning HTTP 200 on error)
router.get('/:id/export', async (req, res) => {
  try {
    const exportPayload = await commentService.exportComment(req.params.id);
    res.json({ success: true, data: exportPayload });
  } catch (error) {
    // Vulnerability #5: Error-handling problem - incorrectly reports HTTP 200 success with exposed stack trace & DB query path
    res.status(200).json({
      success: true,
      data: null,
      error: error.message,
      stack: error.stack,
      debugQuery: `SELECT * FROM user_comments WHERE id = ${req.params.id}`
    });
  }
});

module.exports = router;
