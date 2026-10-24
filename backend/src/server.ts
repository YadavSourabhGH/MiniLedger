import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import { db } from './db.js';
import { config, validateConfig } from './config.js';
import authRoutes from './routes/auth.js';
import loanRoutes from './routes/loans.js';

validateConfig();
const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: config.corsOrigin === '*' ? '*' : config.corsOrigin.split(',') }));
app.use(express.json({ limit: '20kb' }));
app.get('/health', async (_req, res, next) => {
  try { await db.query('SELECT 1'); res.json({ status: 'ok' }); } catch (e) { next(e); }
});
app.use('/auth', authRoutes);
app.use('/loans', loanRoutes);
app.use((_req, res) => { res.status(404).json({ error: 'Endpoint not found' }); });
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('Request failed:', err);
  res.status(500).json({ error: 'Unexpected server error' });
};
app.use(errorHandler);
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`MiniLedger API running on http://localhost:${config.port}`);
  console.log('Mock OTP mode active: codes are printed in this terminal.');
});
function shutdown() { server.close(() => db.end().then(() => process.exit(0))); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
