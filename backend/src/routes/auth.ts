import { randomInt, randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { config } from '../config.js';
import { phoneSchema, otpVerifySchema } from '../lib/validation.js';

const router = Router();
const hashOtp = (phone: string, otp: string): Buffer => createHmac('sha256', config.otpPepper).update(`${phone}:${otp}`).digest();

router.post('/request-otp', async (req, res, next) => {
  try {
    const parsed = phoneSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid phone number', details: parsed.error.flatten() }); return; }
    const { phone } = parsed.data;
    const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
    // Atomically enforces a 60-second cooldown across requests for the same phone.
    const result = await db.query(
      `INSERT INTO otp_challenges (phone, otp_hash, expires_at, requested_at, attempts)
       VALUES ($1, $2, NOW() + INTERVAL '5 minutes', NOW(), 0)
       ON CONFLICT (phone) DO UPDATE SET
         otp_hash = EXCLUDED.otp_hash, expires_at = EXCLUDED.expires_at,
         requested_at = NOW(), attempts = 0
       WHERE otp_challenges.requested_at < NOW() - INTERVAL '60 seconds'
       RETURNING phone`,
      [phone, hashOtp(phone, otp).toString('hex')],
    );
    if (!result.rowCount) { res.status(429).json({ error: 'Try again after 60 seconds' }); return; }
    console.log(`[DEV MOCK OTP] ${phone}: ${otp} (expires in 5 minutes)`);
    res.json({ message: 'OTP generated. Check backend terminal (development only).', expiresInSeconds: 300 });
  } catch (e) { next(e); }
});

router.post('/verify-otp', async (req, res, next) => {
  const client = await db.connect().catch((e: unknown) => { next(e); return null; });
  if (!client) return;
  try {
    const parsed = otpVerifySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid phone/OTP', details: parsed.error.flatten() }); return; }
    const { phone, otp } = parsed.data;
    await client.query('BEGIN');
    const challenge = await client.query<{ otp_hash: string; attempts: number; expires_at: Date }>(
      'SELECT otp_hash, attempts, expires_at FROM otp_challenges WHERE phone = $1 FOR UPDATE', [phone],
    );
    const row = challenge.rows[0];
    if (!row || row.expires_at.getTime() <= Date.now() || row.attempts >= 5) {
      await client.query('ROLLBACK');
      res.status(401).json({ error: 'OTP expired or unavailable. Request another.' }); return;
    }
    const valid = timingSafeEqual(Buffer.from(row.otp_hash, 'hex'), hashOtp(phone, otp));
    if (!valid) {
      await client.query('UPDATE otp_challenges SET attempts = attempts + 1 WHERE phone = $1', [phone]);
      await client.query('COMMIT');
      res.status(401).json({ error: 'Incorrect OTP' }); return;
    }
    await client.query('DELETE FROM otp_challenges WHERE phone = $1', [phone]);
    const user = await client.query<{ id: string; phone: string }>(
      `INSERT INTO users (id, phone) VALUES ($1, $2)
       ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone RETURNING id, phone`,
      [randomUUID(), phone],
    );
    await client.query('COMMIT');
    const account = user.rows[0]!;
    const token = jwt.sign({ phone: account.phone }, config.jwtSecret, { subject: account.id, expiresIn: '7d' });
    res.json({ token, user: account });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    next(e);
  } finally { client.release(); }
});

export default router;
