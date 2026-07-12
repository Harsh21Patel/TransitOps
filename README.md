# TransitOps — Smart Transport Operations Platform

Full-stack MERN fleet management platform, built module by module.

## Module 1 — Foundation + Authentication & RBAC ✅ (this delivery)

- Project scaffolding: `client/`, `server/`, `shared/` with the full folder structure
- MongoDB connection, centralized `ApiError` + error-handling middleware
- `User` model: bcrypt password hashing, hashed multi-device refresh tokens
- JWT auth: short-lived access token + httpOnly rotating refresh token cookie, "Remember me" (30-day refresh)
- RBAC: 5 roles (Admin, Fleet Manager, Dispatcher, Safety Officer, Financial Analyst), central `PERMISSIONS` matrix, `protect` / `restrictTo` / `authorize` middleware
- Endpoints: `POST /api/auth/login`, `/refresh`, `/logout`, `POST /api/auth/register` (Admin-only), `GET /api/auth/me`, `PATCH /api/auth/change-password`
- Rate limiting on auth endpoints, Helmet, Mongo sanitize, CORS with credentials
- Socket.IO bootstrapped with JWT-authenticated connections (used by later real-time modules)
- Client: Redux Toolkit auth slice, Axios instance with silent access-token refresh on 401, `ProtectedRoute` with role guards, `useAuth` hook, fully wired Login page, Dashboard placeholder, 403 page
- Seed script for bootstrap Admin account

## Getting started

### 1. Server
```bash
cd server
cp .env.example .env   # fill in MONGO_URI, JWT secrets, etc.
npm install
npm run dev             # starts on http://localhost:5000
node seed/createAdmin.js   # creates the first Admin login
```

Default bootstrap admin (change immediately after first login):
- Email: `admin@transitops.com`
- Password: `Admin@12345`

### 2. Client
```bash
cd client
npm install
npm run dev             # starts on http://localhost:5173
```

### 3. Docker (optional, spins up Mongo + server + client)
```bash
docker compose up --build
```

## Roadmap (upcoming modules — say "Continue" to proceed)

- [ ] Module 2: Fleet Dashboard (KPI cards, charts, live widgets, Socket.IO updates)
- [ ] Module 3: Vehicle Registry (CRUD, document uploads, status lifecycle)
- [ ] Module 4: Driver Management (CRUD, license alerts, safety score)
- [ ] Module 5: Trip Dispatch (lifecycle, dispatch board, business-rule validation)
- [ ] Module 6: Maintenance (service records, vehicle status automation)
- [ ] Module 7: Fuel Logs (consumption + efficiency calculations)
- [ ] Module 8: Expense Management (operational cost rollups)
- [ ] Module 9: Reports & Analytics (charts, CSV/PDF export)
- [ ] Module 10: Settings (depot config, role matrix UI)
- [ ] Module 11: Seed data (50 vehicles / 30 drivers / 100 trips / logs)
- [ ] Module 12: Notifications, dark mode, polish, PWA
