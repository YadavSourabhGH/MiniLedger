import assert from 'node:assert/strict';
import { test } from 'node:test';
import { phoneSchema, otpVerifySchema, createLoanSchema, amountToPaise, paiseToAmount } from '../src/lib/validation.js';

test('requires an E.164 phone number', () => {
  assert.equal(phoneSchema.safeParse({ phone: '+919876543210' }).success, true);
  assert.equal(phoneSchema.safeParse({ phone: '9876543210' }).success, false);
});
test('OTP must be exactly six digits', () => {
  assert.equal(otpVerifySchema.safeParse({ phone: '+919876543210', otp: '012345' }).success, true);
  assert.equal(otpVerifySchema.safeParse({ phone: '+919876543210', otp: '1234' }).success, false);
});
test('validates name, currency precision and real dates', () => {
  const valid = { friendName: 'Asha', amount: 299.95, dueDate: '2026-12-31' };
  assert.equal(createLoanSchema.safeParse(valid).success, true);
  assert.equal(createLoanSchema.safeParse({ ...valid, friendName: ' ' }).success, false);
  assert.equal(createLoanSchema.safeParse({ ...valid, amount: -1 }).success, false);
  assert.equal(createLoanSchema.safeParse({ ...valid, amount: 100.123 }).success, false);
  assert.equal(createLoanSchema.safeParse({ ...valid, dueDate: '2026-02-30' }).success, false);
});
test('paise conversion preserves two decimal places', () => {
  assert.equal(amountToPaise(299.95), 29995);
  assert.equal(paiseToAmount('29995'), 299.95);
});
