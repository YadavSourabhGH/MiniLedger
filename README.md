# MiniLedger

**MiniLedger** is a small React Native + Node.js app for tracking money you've lent to friends. It has a development-only phone login (mock OTP in the API terminal), personal loan entries, repayments, overdue highlighting and totals in Indian rupees.

## What's included

- **React Native (Expo, TypeScript)**: sign in with phone + OTP, outstanding/repaid filters, responsive dashboard, summary card, add-loan modal, one-tap repayment, pull-to-refresh and sign out.
- **Node.js (Express + TypeScript)**: mock OTP auth, JWT session, protected loan APIs, ownership checks, Zod validation, and summary aggregation.
- **PostgreSQL**: `users`, `otp_challenges`, `loans` tables and indexes.
- **Tests**: validation tests using Node's built-in test runner (via `tsx`).
- **Safety within demo scope**: hashed, expiring OTPs with retry limits; authenticated per-user data; parameterized SQL; integer paise in storage to avoid floating-point accounting errors.

> This repository is an MVP / assignment demo, **not a production-ready financial or phone-auth product**. OTPs print to the backend terminal and never send SMS. It assumes INR as the display currency. “Repaid” means the loan is fully repaid; partial repayments are not implemented.

## Requirements

- Node.js **22.13+** and npm
- Docker Desktop (or a local PostgreSQL 16 server)
- Android emulator / iOS simulator / Android or iOS device with a **compatible Expo Go** build
- An emulator or phone that can reach the backend

The app is based on **Expo SDK 57 / React Native 0.86**, matching the SDK compatibility reference. If Expo Go on your device uses a different SDK, use a matching version of Expo Go or create a development build.

## 1. Start PostgreSQL

From the repo root:

```bash
docker compose up -d
```

The compose file creates `miniledger`, user `miniledger`, password `miniledger_dev`, port `5432`, and runs `db/schema.sql` on a **fresh** database volume.

If you've already initialized this volume and need to re-apply the schema, run `npm run db:migrate` from `backend` after configuring environment variables. `docker compose down -v` will **delete all existing database data**.

## 2. Start the API

```bash
cd backend
cp .env.example .env
# Replace JWT_SECRET and OTP_PEPPER with two different long random strings.
npm install
npm run db:migrate
npm run dev
```

The API listens at **http://localhost:4000**. Confirm with:

```bash
curl http://localhost:4000/health
# {"status":"ok"}
```

Generate example secrets on a terminal: `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` (run it twice). Never commit `.env`.

## 3. Start React Native

In a **separate terminal**:

```bash
cd app
cp .env.example .env
npm install
npx expo install --fix
npm start
```

Update `app/.env` to point at the API:

| Run target | `EXPO_PUBLIC_API_URL` |
|---|---|
| Android emulator | `http://10.0.2.2:4000` |
| iOS simulator | `http://localhost:4000` |
| Physical phone | `http://YOUR_LAPTOP_LAN_IP:4000` |

For a physical phone, phone and computer must be on the same Wi-Fi and local firewall rules must allow TCP `4000`. Restart Expo after modifying `.env`. `localhost` on a phone means the phone itself, not the laptop.

Scan the QR code using Expo Go or use `a` for Android emulator / `i` for iOS simulator. Android may require a compatible Expo Go release available from Expo's [Go downloads](https://expo.dev/go).

## 4. Log in and try a loan

1. Enter `+919876543210` (or any valid test E.164 phone number).
2. Tap **Send OTP**.
3. In the **API server terminal**, locate a line like `[DEV MOCK OTP] +919876543210: 123456` (six-digit code varies).
4. Enter that code in the app and tap **Verify & continue**.
5. Add a friend, amount (such as `850.50`) and due date (such as `2026-10-15`).
6. Observe the new entry and updated summary. Entries with a due date **before today** and not repaid are highlighted red.
7. Tap **Mark as repaid**; confirm. Totals update and the entry moves to **Repaid**.

OTP lifetime: **5 minutes**. Retry limit: **5 incorrect attempts**. Request cooldown: **60 seconds**. Successful verification consumes the OTP. Session lifetime: **7 days**.

## HTTP API

All amounts use decimal rupees in JSON and integer **paise** inside PostgreSQL. All loan endpoints require `Authorization: Bearer <JWT>`.

| Method | Path | Request body | Response |
|---|---|---|---|
| `GET` | `/health` | — | DB-backed health check |
| `POST` | `/auth/request-otp` | `{ "phone": "+919876543210" }` | Demo message, expiration |
| `POST` | `/auth/verify-otp` | `{ "phone": "+919876543210", "otp": "123456" }` | `{ "token": "...", "user": { ... } }` |
| `GET` | `/loans` | — | `{ "loans": [...] }` (up to 1,000) |
| `POST` | `/loans` | `{ "friendName": "Priya", "amount": 850.5, "dueDate": "2026-10-15" }` | `201` + `{ "loan": ... }` |
| `PATCH` | `/loans/:id/repay` | — | `{ "loan": ... }`, or `409` if already repaid |
| `GET` | `/loans/summary` | — | `{ "totalLent": ..., "totalRepaid": ..., "overdueAmount": ..., "outstandingAmount": ..., "currency": "INR" }` |

### Example (after login)

```bash
TOKEN="paste-your-token"
curl -X POST http://localhost:4000/loans \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"friendName":"Asha","amount":1200.50,"dueDate":"2026-10-15"}'

curl http://localhost:4000/loans/summary -H "Authorization: Bearer $TOKEN"
```

### Summary definition

- **Total lent:** sum of *all* loans (including repaid).
- **Total repaid:** sum of loans marked fully repaid.
- **Overdue amount:** sum of *unrepaid* loans with `due_date < CURRENT_DATE` in the database timezone.
- **Outstanding amount:** sum of all unrepaid loans, overdue or not.

Due **today** is not overdue. `CURRENT_DATE` uses the PostgreSQL database timezone (default UTC in many deployments). Configure database timezone appropriately if day boundaries must match your users' locale.

## Input validation & tests

```bash
cd backend
npm test
npm run typecheck
npm run build
```

Tests cover E.164 phone validation, OTP length, invalid friend names, negative/overprecision amounts, impossible dates, and rupee/paise conversion. The app validates before submission, and the API validates again. CI also checks mobile TypeScript.

## Project structure

```text
MiniLedger/
├── .github/workflows/ci.yml
├── app/
│   ├── App.tsx                 # Login, overview, loan list and add modal
│   ├── src.ts                  # Typed API client, formatting helpers
│   ├── app.json
│   └── .env.example
├── backend/
│   ├── src/
│   │   ├── routes/auth.ts      # Request and verify mock OTP
│   │   ├── routes/loans.ts     # User-owned loans and summary
│   │   ├── middleware/auth.ts  # JWT auth
│   │   ├── lib/validation.ts   # Zod schemas and paise conversion
│   │   ├── migrate.ts
│   │   └── server.ts
│   ├── test/validation.test.ts
│   └── .env.example
├── db/schema.sql
└── docker-compose.yml
```

## Record a 2–3 minute walkthrough for submission

The walkthrough must be a **real capture of the running app**, not a mockup. Suggested recording flow (about 2:30):

- `0:00–0:20` show README and backend health check.
- `0:20–0:55` open app, enter phone number, show mock OTP in API terminal, verify.
- `0:55–1:20` show empty-state dashboard and initial summary.
- `1:20–1:55` create one past-due and one future-due loan.
- `1:55–2:15` show red overdue highlighting and summary totals.
- `2:15–2:40` mark one loan repaid and show updated summary and Repaid tab.

On Android, run `bash scripts/record-android-demo.sh` from the repository root with a connected `adb` device; it captures up to 180 seconds of the **real running app** and saves `MiniLedger-real-demo.mp4` in the project root. Alternatively capture using an emulator's recording option, QuickTime (iOS), Android's screen recorder, OBS, or Loom. Upload the finished MP4 to **Loom or Google Drive**. Share a viewable link in your submission.

## Publish to your own GitHub repository

From the project root, after installing/authenticating [GitHub CLI](https://cli.github.com/):

```bash
git init
git add .
git commit -m "Build MiniLedger MVP"
gh repo create MiniLedger --public --source=. --remote=origin --push
```

Before publishing, check `git status` and confirm there is no `.env`, OTP code, JWT secret, personal phone data or database dump. `.gitignore` excludes environment files.

## Further work before real-world release

Replace terminal OTPs with a verified SMS provider and distributed throttling, use TLS/HTTPS, use OS-protected token storage (e.g. Expo SecureStore) instead of AsyncStorage, deploy proper schema migrations and logging, add database-backed integration tests, support pagination for large loan lists, consider due-date timezone handling, and add account removal/backup. A photo receipt feature is deliberately out of scope for this MVP (optional bonus).

## License

MIT; see `LICENSE`.
