const express = require('express');
const usersRoute = require('./routes/users');
const { getDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Users routes
app.use('/users', usersRoute);

// Initialize DB and start server
async function startServer() {
  await getDb(); // Initialize database & seed users
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
