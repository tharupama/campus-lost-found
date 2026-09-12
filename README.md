# Campus Lost & Found — MERN

Full-stack campus lost-and-found system with SSO login, photo reports (Lost/Found), auto-match engine, secret-mark claims, notifications, QR handover and an admin guard panel.

## Stack

- **Frontend:** React 18 + Vite, Tailwind CSS, Axios, React Router, React Hot Toast, SweetAlert2, Framer Motion, Lucide icons, qrcode.react
- **Backend:** Node/Express, Mongoose, JWT + bcrypt, Multer + Sharp (image compression), optional Cloudinary, Nodemailer worker stub

## Structure

```
campus-lost-found/
├── backend/
│   ├── src/
│   │   ├── config/        db, cloudinary
│   │   ├── models/        User, Item, Claim, Notification
│   │   ├── controllers/   auth, item, claim, admin, notification
│   │   ├── routes/        REST routes (index mounts all)
│   │   ├── middleware/    auth, role, upload, errors
│   │   └── services/      matchEngine, upload, notification worker
│   └── seed/seed.js       demo data
└── frontend/
    └── src/
        ├── services/      axios API layer
        ├── contexts/      Auth + Notification providers
        ├── components/    layout, ui, feed, ReportModal
        └── pages/         login, feed, detail, claims, alerts, admin
```

## Quick start

1. **MongoDB** must be running locally (default URI `mongodb://127.0.0.1:27017/campus_lost_found`).

2. Backend
```bash
cd backend
npm install
npm run seed
npm run dev          # http://localhost:5000
```

3. Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

## Demo accounts

| Role  | Email               | Password      |
|-------|---------------------|---------------|
| Admin | admin@campus.edu    | Admin@123     |
| Guard | guard@campus.edu    | Guard@123     |
| Student | alex@student.edu  | Student@123   |
| Student | maya@student.edu | Student@123   |

## API highlights

- `POST /api/auth/login` — SSO-style campus login (JWT)
- `GET /api/items` — public feed with filters (`type, category, location, status, search`)
- `POST /api/items` — create Lost/Found report (multipart photo); triggers match engine when `found`
- `POST /api/claims` — submit claim with secret-mark proof
- `GET /api/claims/mine` — claimant's claim status (Pending / Approved / Resolved)
- `GET /api/notifications` — match alerts + claim updates
- `GET /api/admin/claims` · `PATCH /api/admin/claims/:id` — side-by-side review, approve/reject
- `GET /api/admin/vault` · `POST /api/admin/handover` — vault inventory + QR-code handover

## Security notes

- `secretFeature` uses `select: false` — hidden from public GET endpoints; only admin/guard queries expose it.
- Photos are compressed with Sharp (max 900px, JPEG 80%) before upload to Cloudinary (or stored as base64 locally if Cloudinary isn't configured).
- Uploads capped at 8 MB; only `image/*` accepted.