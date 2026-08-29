const userService = require('../services/userService');

async function authenticateUser(req, res, next) {
  try {
    const userId = req.headers['x-user-id'] || req.query.user_id || 1;
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated user context' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Authentication error' });
  }
}

module.exports = { authenticateUser };
