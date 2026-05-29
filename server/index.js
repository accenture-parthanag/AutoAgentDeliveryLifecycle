require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDb } = require('./db');

const projectsRouter = require('./routes/projects');
const jobsRouter = require('./routes/jobs');
const analyticsRouter = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Routes
app.use('/api/projects', projectsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/analytics', analyticsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await connectDb();
    const server = app.listen(PORT, () => {
      console.log(`✓ A-ADLC Backend running on port ${PORT}`);
      console.log(`  Health check: http://localhost:${PORT}/api/health`);
    });

    // Increase header size limits
    server.headersTimeout = 30000;
    server.maxHeadersCount = 2000;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
