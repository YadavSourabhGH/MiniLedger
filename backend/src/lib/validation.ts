import { z } from 'zod';

export const phoneSchema = z.object({
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, 'Use international format, e.g. +919876543210'),
}).strict();

export const otpVerifySchema = phoneSchema.extend({
  otp: z.string().regex(/^\d{6}$/, 'OTP must contain 6 digits'),
});

const isRealISODate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const createLoanSchema = z.object({
  friendName: z.string().trim().min(1).max(80),
  amount: z.number().positive().max(10_000_000).refine(
    (n) => Number.isInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6,
    'Amount supports at most 2 decimal places',
  ),
  dueDate: z.string().refine(isRealISODate, 'Date must be YYYY-MM-DD and valid'),
}).strict();

export function amountToPaise(amount: number): number {
  return Math.round(amount * 100);
}
export function paiseToAmount(paise: string | number): number {
  return Number(paise) / 100;
}
