const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const chatRoutes = require('./routes/chats');
const permissionRoutes = require('./routes/permissions');
const providerRoutes = require('./routes/providers');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import jobs
const rateLimitResetJob = require('./jobs/rateLimitReset');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/providers', providerRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Schedule background job - runs every minute
cron.schedule('* * * * *', () => {
  console.log('Running rate limit reset job...');
  rateLimitResetJob.run().catch(console.error);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});