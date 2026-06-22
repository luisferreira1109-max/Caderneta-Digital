require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const cardsRoutes = require('./routes/cards');
const packsRoutes = require('./routes/packs');
const marketRoutes = require('./routes/market');
const profileRoutes = require('./routes/profile');
const tradesRoutes = require('./routes/trades');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Segurança ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting: 100 pedidos por 15 minutos por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiados pedidos. Tenta novamente em 15 minutos.' }
});
app.use('/api/', limiter);

// ── Parsing ──────────────────────────────────────────────────────
app.use(express.json());

// ── Rotas ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/packs', packsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/trades', tradesRoutes);

// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Erro global ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Caderneta Digital backend a correr em http://localhost:${PORT}`);
});
