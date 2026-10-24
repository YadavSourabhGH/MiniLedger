import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { db } from '../db.js';
import { amountToPaise, paiseToAmount, createLoanSchema } from '../lib/validation.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

type LoanRecord = {
  id: string; friend_name: string; amount_paise: string; due_date: string;
  created_at: Date; repaid_at: Date | null; overdue: boolean;
};
const projection = `id, friend_name, amount_paise::text, TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date,
  created_at, repaid_at, (repaid_at IS NULL AND due_date < CURRENT_DATE) AS overdue`;
function formatLoan(row: LoanRecord) {
  return {
    id: row.id,
    friendName: row.friend_name,
    amount: paiseToAmount(row.amount_paise),
    dueDate: row.due_date,
    createdAt: row.created_at,
    repaidAt: row.repaid_at,
    isOverdue: row.overdue,
    status: row.repaid_at ? 'repaid' : row.overdue ? 'overdue' : 'pending',
  };
}

router.get('/', async (req, res, next) => {
  try {
    const rows = await db.query<LoanRecord>(
      `SELECT ${projection} FROM loans WHERE user_id = $1
       ORDER BY (repaid_at IS NULL) DESC, due_date ASC, created_at DESC LIMIT 1000`,
      [req.auth!.userId],
    );
    res.json({ loans: rows.rows.map(formatLoan) });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = createLoanSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid loan entry', details: parsed.error.flatten() }); return; }
    const { friendName, amount, dueDate } = parsed.data;
    const result = await db.query<LoanRecord>(
      `INSERT INTO loans (id, user_id, friend_name, amount_paise, due_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${projection}`,
      [randomUUID(), req.auth!.userId, friendName, amountToPaise(amount), dueDate],
    );
    res.status(201).json({ loan: formatLoan(result.rows[0]!) });
  } catch (e) { next(e); }
});

router.patch('/:id/repay', async (req, res, next) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) { res.status(400).json({ error: 'Invalid loan ID' }); return; }
    const result = await db.query<LoanRecord>(
      `UPDATE loans SET repaid_at = NOW()
       WHERE id = $1 AND user_id = $2 AND repaid_at IS NULL RETURNING ${projection}`,
      [req.params.id, req.auth!.userId],
    );
    if (result.rowCount) { res.json({ loan: formatLoan(result.rows[0]!) }); return; }
    const existing = await db.query('SELECT repaid_at FROM loans WHERE id = $1 AND user_id = $2', [req.params.id, req.auth!.userId]);
    if (!existing.rowCount) { res.status(404).json({ error: 'Loan not found' }); return; }
    res.status(409).json({ error: 'Loan already marked as repaid' });
  } catch (e) { next(e); }
});

router.get('/summary', async (req, res, next) => {
  try {
    const { rows } = await db.query<{
      total_lent: string; total_repaid: string; overdue_amount: string; outstanding_amount: string;
    }>(
      `SELECT
         COALESCE(SUM(amount_paise), 0)::text AS total_lent,
         COALESCE(SUM(amount_paise) FILTER (WHERE repaid_at IS NOT NULL), 0)::text AS total_repaid,
         COALESCE(SUM(amount_paise) FILTER (WHERE repaid_at IS NULL AND due_date < CURRENT_DATE), 0)::text AS overdue_amount,
         COALESCE(SUM(amount_paise) FILTER (WHERE repaid_at IS NULL), 0)::text AS outstanding_amount
       FROM loans WHERE user_id = $1`,
      [req.auth!.userId],
    );
    const r = rows[0]!;
    res.json({
      totalLent: paiseToAmount(r.total_lent),
      totalRepaid: paiseToAmount(r.total_repaid),
      overdueAmount: paiseToAmount(r.overdue_amount),
      outstandingAmount: paiseToAmount(r.outstanding_amount),
      currency: 'INR',
    });
  } catch (e) { next(e); }
});
export default router;
