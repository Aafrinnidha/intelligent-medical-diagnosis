require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const { ensureSeededKnowledgeBase } = require('./services/knowledgeBaseService');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const patientRoutes = require('./routes/patientRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const testResultRoutes = require('./routes/testResultRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const knowledgeBaseRoutes = require('./routes/knowledgeBaseRoutes');
const diagnosisRoutes = require('./routes/diagnosisRoutes');

const app = express();

// Security & middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'Intelligent Medical Diagnosis & Clinical Decision Support System API',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/tests', testResultRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/diagnoses', diagnosisRoutes);

// Serve frontend static build if it exists (for full-stack deployment on Render/Railway/cloud)
const clientDistPath = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 handler for API routes
app.use('/api', notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required in server/.env');
    }

    await connectDB();
    const seedStatus = await ensureSeededKnowledgeBase();
    console.log(
      `Medical Knowledge Base ready: ${seedStatus.diseasesCount} diseases, ${seedStatus.rulesCount} active rules.`
    );

    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`CDSS Backend Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
