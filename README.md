# Campus Lost & Found — MERN

Full-stack campus lost-and-found platform for the Faculty of Technology, University of Ruhuna.
It combines Google/email sign-in, email OTP registration, optional TOTP two-factor authentication,
photo reports (Lost/Found), an auto-match engine, secret-mark claims, in-app + email notifications,
QR handover, an AI search assistant, feedback/contact flows, and admin/guard dashboards.

## Features

- **Authentication** — email/password login, Google sign-in (`google-auth-library`), email OTP
  registration with resend cooldown and attempt limits, forgot/reset password, profile editing.
- **Two-factor auth (2FA)** — authenticator-app TOTP (RFC 6238), 10 one-time recovery codes,
  replay protection, 30-day trusted devices, and password-confirmed enable/disable.
- **Items & matching** — Lost/Found reports with photos, filters, pagination, automatic match
  engine alerts, and a 90-day expiry for found items.
- **Claims** — secret-mark proof, duplicate/self-claim guards, admin/guard review, and QR-code
  handover at the security desk.
- **Notifications** — in-app notifications plus branded HTML emails (match alerts, claim updates,
  contact messages, feedback, drop-off reminders).
- **Admin/guard panel** — claim review, vault inventory, QR scanner, user/item management,
  feedback review, and analytics charts.
- **Community** — public landing/about pages, security-team roster, contact form, and user feedback.
- **AI assistant** — Groq-powered chat that searches the item database via tool calling.
- **Reminders** — background scheduler that nudges finders who have not dropped items at the guard room.

## Stack

- **Frontend:** React 18 + Vite, React Router, Tailwind CSS, Axios, React Hot Toast, SweetAlert2,
  Framer Motion, Lucide icons, date-fns, use-debounce, qrcode.react, html5-qrcode, DotLottie.
- **Backend:** Node/Express, Mongoose, JWT + bcryptjs, Google Auth Library, Multer + Sharp,
  optional Cloudinary, Nodemailer (Brevo/SMTP), Groq chat completions.
- **Security services:** built-in TOTP/HOTP (`totp.service`), AES-256-GCM secret encryption
  (`crypto.service`), SHA-256 token hashing, SHA-256-hashed recovery codes.
- **Testing:** Node's built-in test runner (`node --test`, `node:test`, `node:assert/strict`).

## Structure

```
campus-lost-found/
├── backend/
│   ├── api/index.js          serverless (Vercel) entry
│   ├── src/
│   │   ├── config/           db, cloudinary, email transporter
│   │   ├── models/           User, Item, Claim, Notification, Feedback,
│   │   │                     RegistrationOtp, TrustedDevice
│   │   ├── controllers/      auth, item, claim, admin, notification,
│   │   │                     contact, feedback, chat, staff
│   │   ├── routes/           REST routes (index mounts all)
│   │   ├── middleware/       auth/role, upload, errors
│   │   ├── services/         matchEngine, upload, notification, reminder,
│   │   │                     chat, totp, crypto
│   │   ├── templates/        HTML email templates + partials
│   │   └── utils/            pagination, frontend URL
│   ├── seed/seed.js          demo data
│   ├── scripts/              preview-emails.js
│   └── tests/                16 suites, 212 tests
└── frontend/
    └── src/
        ├── services/         axios API layer
        ├── contexts/         Auth + Notification + Report + Theme providers
        ├── components/       layout, ui, feed, admin, feedback, charts, landing
        └── pages/            login, register, feed, detail, claims, alerts,
                              profile, feedback, contact, about, admin
```

## Quick start

Prerequisites: Node 18+ (the backend tests use `node:test` and global `fetch`) and a running
MongoDB instance.

1. **Configure the backend**

```bash
cd backend
cp .env.example .env   # then fill in the values you need
npm install
npm run seed
npm run dev            # http://localhost:5000
```

2. **Start the frontend**

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

3. **Docker (optional)**

```bash
docker compose up --build
```

The `seed` service loads demo data once. With the default `docker-compose.override.yml`, the Vite
dev server is exposed at `http://localhost:5173` and the API at `http://localhost:5000`. For the
production Nginx build, run `docker compose -f docker-compose.yml up --build` and open
`http://localhost`.

## Environment variables

Copy `backend/.env.example` and set what you need. Only `MONGO_URI` is strictly required for a local
setup (and a strong `JWT_SECRET` is strongly recommended); everything else is optional and degrades
gracefully.

| Variable | Purpose |
|----------|---------|
| `PORT`, `NODE_ENV` | API port (default `5000`) and mode |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Signs auth, registration, and MFA tokens |
| `CLIENT_URL`, `FRONTEND_URL` | CORS origin and links inside emails |
| `GOOGLE_CLIENT_ID` | Enables Google sign-in |
| `TOTP_ENC_KEY` | 64-char hex key for encrypting 2FA secrets (falls back to a key derived from `JWT_SECRET`) |
| `CLOUDINARY_*` | Optional image hosting (otherwise compressed base64 is stored) |
| `EMAIL_HOST/PORT/USERNAME/PASSWORD`, `SENDER_EMAIL`, `SENDER_NAME` | SMTP/Brevo email delivery |
| `GROQ_API_KEY`, `GROQ_MODEL` | AI assistant |

If SMTP is not configured, emails are logged and skipped instead of failing requests.

## Authentication & 2FA

Registration is a three-step flow: `POST /api/auth/register/start` emails a 6-digit code,
`POST /api/auth/register/verify-otp` returns a short-lived registration JWT, and
`POST /api/auth/register/complete` creates the verified account.

Two-factor authentication is optional per user:

1. `POST /api/auth/2fa/setup` generates a TOTP secret and `otpauth://` URL for authenticator apps.
2. `POST /api/auth/2fa/enable` verifies the first code and returns 10 recovery codes.
3. On the next login, the API responds with `{ mfaRequired: true, mfaToken }`; post the code to
   `POST /api/auth/2fa/verify` to receive the normal JWT.
4. `rememberDevice` issues a 30-day trusted-device token so that browser can skip the challenge.

Security details:

- TOTP uses SHA-1, 6 digits, a 30-second step, and a ±1 step window.
- Secrets are encrypted with AES-256-GCM before storage; recovery codes are stored as SHA-256 hashes.
- Replayed TOTP codes are rejected, and recovery codes are single-use.
- Disabling 2FA or regenerating recovery codes requires the account password.
- MFA challenge tokens expire after 5 minutes; trusted devices after 30 days.

## Testing

The backend uses Node's built-in test runner — no Jest/Mocha/Vitest dependency, no live database.
Tests mock Mongoose models and call controller/service functions directly with lightweight
request/response helpers (`tests/helpers.js`).

```bash
cd backend
npm test
```

- **212 tests across 16 suites**, covering auth + 2FA, admin/guard flows, claims, items,
  contact/feedback, chat, crypto, TOTP, middleware, models, match engine, notifications,
  pagination, reminders, email templates, and uploads.
- `node --test "tests/**/*.test.js"` is run by `npm test`.
- TOTP tests validate against the published RFC 6238 SHA-1 vectors.
- The frontend currently has no automated test suite (`npm run build` is the verification step).

Other useful scripts:

| Command | Where | What it does |
|---------|-------|--------------|
| `npm run dev` | backend | Start API with nodemon |
| `npm start` | backend | Start API |
| `npm run seed` | backend | Reset and load demo users/items/claims |
| `npm test` | backend | Run all 212 tests |
| `npm run preview:emails` | backend | Render email templates locally |
| `npm run dev` | frontend | Start Vite dev server |
| `npm run build` | frontend | Production build |

## API highlights

**Auth & 2FA**

- `POST /api/auth/register/start` · `POST /api/auth/register/verify-otp` · `POST /api/auth/register/complete`
- `POST /api/auth/login` — email/password; may return an MFA challenge
- `POST /api/auth/google` — Google ID-token sign-in
- `POST /api/auth/forgot-password` · `POST /api/auth/reset-password`
- `GET /api/auth/me` · `PUT /api/auth/profile` (multipart avatar)
- `GET /api/auth/2fa/status` · `POST /api/auth/2fa/setup` · `POST /api/auth/2fa/enable`
- `POST /api/auth/2fa/verify` · `POST /api/auth/2fa/disable` · `POST /api/auth/2fa/recovery-codes`

**Items, claims & notifications**

- `GET /api/items` — public feed with filters (`type, category, location, status, search`) + pagination
- `GET /api/items/mine` · `GET /api/items/:id` · `POST /api/items` (multipart photo)
- `POST /api/claims` — submit a claim with secret-mark proof
- `GET /api/claims/mine` — claim statuses (pending / approved / rejected / resolved)
- `GET /api/notifications` · `PATCH /api/notifications/read`

**Admin & guard** (`admin`/`guard` only unless noted)

- `GET /api/admin/claims` · `PATCH /api/admin/claims/:id` — review claims
- `GET /api/admin/vault` · `PATCH /api/admin/items/:id/available` · `POST /api/admin/handover`
- `GET /api/admin/stats` — dashboard analytics
- `GET/POST/PUT/DELETE /api/admin/users` — admin only
- `GET/PUT/DELETE /api/admin/items` — admin only
- `GET/PATCH/DELETE /api/admin/feedback` — admin only

**Community & assistant**

- `GET /api/contact/staff` · `POST /api/contact` — notify admins or guards
- `POST /api/feedback` · `GET /api/feedback/mine` · `GET /api/feedback/summary`
- `GET /api/staff/team` — public security-team roster
- `POST /api/chat` — Groq AI assistant with item-search tool calls

## Demo accounts

| Role    | Email              | Password      |
|---------|--------------------|---------------|
| Admin   | admin@campus.edu   | Admin@123     |
| Guard   | guard@campus.edu   | Guard@123     |
| Student | alex@student.edu   | Student@123   |
| Student | maya@student.edu   | Student@123   |

## Security notes

- Passwords are hashed with bcrypt (10 rounds); JWTs expire after 7 days.
- `secretFeature` uses `select: false` and is only exposed to admin/guard queries; a boolean
  `hasSecretMark` tells the frontend whether a proof question exists.
- Registration OTPs expire after 10 minutes, allow 5 attempts, and enforce a 30-second resend
  cooldown. Password-reset tokens are hashed and expire after 1 hour.
- Photos are compressed with Sharp (max 900px, JPEG 80%) before upload to Cloudinary (or stored as
  base64 locally if Cloudinary is not configured). Uploads are capped at 8 MB and limited to `image/*`.
- 2FA secrets are encrypted at rest and never returned after setup; recovery codes are hashed and
  shown only once.
- Admin user management guards against removing your own admin access or demoting/deleting the last admin.
