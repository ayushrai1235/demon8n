const express = require('express');
const router = express.Router();
const userService = require('../services/userService');

// GET /users - List all users
router.get('/', async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /users/search - Search users by name
router.get('/search', async (req, res) => {
  try {
    const { name } = req.query;
    // Missing input validation: accepts unvalidated parameters (empty string, objects, unexpected types)
    const users = await userService.searchUsersByName(name);
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    // Weak error handling: exposing internal error message and full stack trace to client
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// GET /users/:id - Get user details by ID
router.get('/:id', async (req, res) => {
  try {
    // Missing authorization check: returns user record without verifying caller identity or access rights
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    // Weak error handling: internal exception details returned directly
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

module.exports = router;
