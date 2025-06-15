require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render deployment
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.etherscan.io", "https://api.basescan.org", "https://api.dexscreener.com"]
    }
  }
}));

// CORS configuration with helper function
const getAllowedOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    return [
      process.env.PRODUCTION_DOMAIN || 'https://wallet-analyzer.onrender.com',
      'https://wallet-analyzer.onrender.com' // fallback
    ];
  }
  return ['http://localhost:3000', 'http://127.0.0.1:3000'];
};

app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true
}));

// Rate limiting - zmniejszone limity dla bezpieczeństwa
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 30, // 🔧 ZMIENIONE z 100 na 30
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, // ✨ DODANE: Return rate limit info in headers
  legacyHeaders: false   // ✨ DODANE: Disable X-RateLimit-* headers
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
const analyzeRoutes = require('./routes/analyze');
app.use('/api', analyzeRoutes);

// Health check endpoint - ulepszone z dodatkowymi info
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    service: 'Wallet Analyzer API',
    version: '1.0.0',
    apiKeys: {
      etherscan: process.env.ETHERSCAN_API_KEY ? 'Configured' : 'Missing',
      basescan: process.env.BASESCAN_API_KEY ? 'Configured' : 'Missing'
    },
    // ✨ DODANE: Dodatkowe info diagnostyczne
    config: {
      port: PORT,
      allowedOrigins: getAllowedOrigins(),
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 50
    }
  });
});

// Serve main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Wallet Analyzer running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 Etherscan API: ${process.env.ETHERSCAN_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🔑 Basescan API: ${process.env.BASESCAN_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🛡️ CORS Origins: ${getAllowedOrigins().join(', ')}`);
  console.log(`🚦 Rate Limit: ${parseInt(process.env.RATE_LIMIT_MAX) || 30} requests per ${parseInt(process.env.RATE_LIMIT_WINDOW) || 15} minutes`);
});

module.exports = app;
