const express = require('express');
const router = express.Router();
const activityService = require('../services/activityService');
const { authenticateUser } = require('../middleware/auth');

// Apply authentication middleware to all activity routes
router.use(authenticateUser);

// GET /activities - List all activity logs (triggers N+1 query loop)
router.get('/', async (req, res) => {
  try {
    const logs = await activityService.getActivityLogs();
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve logs' });
  }
});

// GET /activities/search - Search activity logs (triggers SQL Injection)
router.get('/search', async (req, res) => {
  try {
    const { action, q } = req.query;
    // Missing query validation allowing unvalidated input to pass into SQL concatenation
    const results = await activityService.searchLogs(action || 'USER_LOGIN', q || '');
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /activities/:id - Get specific activity log record
// Vulnerability #1: Broken Authorization / IDOR
// Authenticates caller (req.user), but fails to verify if req.user.id matches log.user_id or if log is flagged
router.get('/:id', async (req, res) => {
  try {
    const log = await activityService.getLogById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Activity log not found' });
    }
    // IDOR vulnerability: Returns sensitive flagged log regardless of req.user.id ownership
    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /activities - Create activity log
// Vulnerability #3: Missing input validation
router.post('/', async (req, res) => {
  try {
    const newLog = await activityService.createLog(req.user.id, req.body);
    res.status(201).json({ success: true, data: newLog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /activities/:id - Update activity log
// Triggers Vulnerability #6: Correctness bug during update processing
router.put('/:id', async (req, res) => {
  try {
    const updated = await activityService.updateLog(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Activity log not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /activities/:id/export - Export activity log payload
// Triggers Vulnerability #4 (Sensitive Info Exposure) & Vulnerability #5 (Error handling problem returning HTTP 200 on error)
router.get('/:id/export', async (req, res) => {
  try {
    const exportPayload = await activityService.exportLogs(req.params.id);
    res.json({ success: true, data: exportPayload });
  } catch (error) {
    // Vulnerability #5: Error-handling problem - incorrectly reports HTTP 200 success with exposed stack trace & DB query path
    res.status(200).json({
      success: true,
      data: null,
      error: error.message,
      stack: error.stack,
      debugQuery: `SELECT * FROM user_activity_logs WHERE id = ${req.params.id}`
    });
  }
});

module.exports = router;
