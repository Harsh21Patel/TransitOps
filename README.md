# TransitOps — Smart Transport Operations Platform

A full-stack MERN fleet management platform with real-time updates, role-based access control, and comprehensive operational management across vehicles, drivers, trips, maintenance, fuel, expenses, and analytics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Redux Toolkit, React Query, React Router v6 |
| **UI** | Tailwind CSS, Framer Motion, Recharts, Lucide React |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB + Mongoose |
| **Auth** | JWT (access + httpOnly refresh tokens), bcryptjs |
| **Real-time** | Socket.IO |
| **File Storage** | Cloudinary (vehicle documents) |
| **Reports** | PDFKit, json2csv |
| **Security** | Helmet, express-mongo-sanitize, express-rate-limit |

---

## Features

### 🔐 Authentication & RBAC
- JWT-based auth: short-lived access token + rotating httpOnly refresh cookie
- "Remember Me" support (30-day refresh)
- 5 roles with a centralized permissions matrix: **Admin**, **Fleet Manager**, **Dispatcher**, **Safety Officer**, **Financial Analyst**
- `protect` / `restrictTo` / `authorize` middleware guards on all routes
- Silent token refresh on 401 via Axios interceptors

### 📊 Fleet Dashboard
- Live KPI cards (total vehicles, active drivers, trips in progress, revenue)
- Real-time Socket.IO updates
- Charts: trip trends, vehicle status breakdown, fuel consumption, expense breakdown

### 🚛 Vehicle Registry
- Full CRUD with status lifecycle: `Available → On Trip → In Shop → Retired`
- Vehicle document uploads (registration, insurance, permits) via Cloudinary
- Capacity tracking, registration number uniqueness enforcement
- **Business rule**: Retired / In Shop vehicles are excluded from dispatch

### 👤 Driver Management
- Full CRUD with license expiry tracking and automated alerts
- Driver status lifecycle: `Available → On Trip → Suspended`
- Safety score tracking
- **Business rule**: Expired-license or Suspended drivers cannot be assigned to trips

### 🗺️ Trip Dispatch
- Full trip lifecycle: `Scheduled → Dispatched → In Progress → Completed / Cancelled`
- Cargo weight validation against vehicle max load capacity
- **Business rules enforced**:
  - Vehicle and driver must be `Available` to dispatch
  - Dispatching sets both to `On Trip`
  - Completing a trip restores both to `Available`
  - Cancelling a dispatched trip restores both to `Available`

### 🔧 Maintenance
- Service records linked to vehicles with open/closed status
- **Business rule**: Creating an active record sets vehicle to `In Shop`; closing restores it to `Available` (unless retired)

### ⛽ Fuel Logs
- Fuel entries per vehicle with consumption and efficiency calculations
- Cost-per-km and L/100km metrics

### 💰 Expense Management
- Operational cost entries categorised by type
- Rollup summaries by vehicle, driver, and category

### 📈 Reports & Analytics
- Aggregated reports across trips, fuel, expenses, and maintenance
- Export to **CSV** and **PDF**

### ⚙️ Settings
- Depot configuration
- Role matrix UI
- System preferences

---

## Project Structure

```
TransitOps_RUN/
├── client/                     # React + Vite frontend
│   └── src/
│       ├── pages/              # Dashboard, Fleet, Drivers, Trips, Maintenance,
│       │                       # FuelLogs, Expenses, Reports, Settings, Login
│       ├── components/         # Shared UI components
│       ├── features/           # Feature-specific components
│       ├── redux/              # Redux Toolkit slices & store
│       ├── services/           # Axios API service layer
│       ├── hooks/              # Custom hooks (useAuth, etc.)
│       ├── routes/             # ProtectedRoute + role guards
│       └── layouts/            # App shell layout
│
└── server/                     # Node.js + Express backend
    ├── models/                 # Mongoose models (User, Vehicle, Driver, Trip,
    │                           # MaintenanceLog, FuelLog, Expense, VehicleDocument)
    ├── controllers/            # Business logic per resource
    ├── routes/                 # Express routers
    ├── middlewares/            # protect, restrictTo, authorize, error handler
    ├── services/               # Mail, Cloudinary, etc.
    ├── validators/             # express-validator schemas
    ├── socket/                 # Socket.IO setup + JWT auth
    ├── jobs/                   # Scheduled jobs (license expiry alerts)
    ├── config/                 # DB connection, constants
    ├── utils/                  # ApiError, helpers
    └── seed/                   # createAdmin.js + full demo seed (index.js)
```

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB instance (local or Atlas)
- Cloudinary account (for document uploads)

### 1. Clone & Install

```bash
git clone <repo-url>
cd TransitOps_RUN
```

### 2. Server

```bash
cd server
cp .env.example .env    # fill in MONGO_URI, JWT_SECRET, CLOUDINARY_*, etc.
npm install
npm run dev             # http://localhost:5000
```

### 3. Seed the Database

```bash
# Create the first Admin account
node seed/createAdmin.js

# (Optional) Load full demo data — 50 vehicles, 30 drivers, 100 trips, logs
npm run seed
```

**Default Admin credentials** *(change immediately after first login)*:

| Field | Value |
|---|---|
| Email | `admin@transitops.com` |
| Password | `Admin@12345` |

### 4. Client

```bash
cd client
npm install
npm run dev             # http://localhost:5173
```

### 5. Docker (optional)

Spins up MongoDB + server + client together:

```bash
docker compose up --build
```

---

## API Overview

| Module | Base Route |
|---|---|
| Auth | `POST /api/auth/login`, `/refresh`, `/logout`, `/register` · `GET /api/auth/me` · `PATCH /api/auth/change-password` |
| Dashboard | `GET /api/dashboard` |
| Vehicles | `GET/POST/PATCH/DELETE /api/vehicles` |
| Drivers | `GET/POST/PATCH/DELETE /api/drivers` |
| Trips | `GET/POST/PATCH/DELETE /api/trips` |
| Maintenance | `GET/POST/PATCH/DELETE /api/maintenance` |
| Fuel Logs | `GET/POST/PATCH/DELETE /api/fuel-logs` |
| Expenses | `GET/POST/PATCH/DELETE /api/expenses` |
| Reports | `GET /api/reports` |

---

## Business Rules

> These rules are enforced at the API level and reflected in the UI.

| Rule |
|---|
| Vehicle registration numbers must be **unique** |
| **Retired** or **In Shop** vehicles never appear in the dispatch selection |
| Drivers with **expired licenses** or **Suspended** status cannot be assigned to trips |
| A driver or vehicle already **On Trip** cannot be assigned to another trip |
| Cargo weight must not exceed the vehicle's **max load capacity** |
| Dispatching a trip sets both the vehicle **and** driver status to `On Trip` |
| Completing a trip restores both to `Available` |
| Cancelling a dispatched trip restores both to `Available` |
| Creating an active maintenance record sets the vehicle to `In Shop` |
| Closing maintenance restores the vehicle to `Available` (unless retired) |

---

## Environment Variables

Create `server/.env` from `server/.env.example`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/transitops
JWT_ACCESS_SECRET=<your-access-secret>
JWT_REFRESH_SECRET=<your-refresh-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-password>
```

---

## License

MIT
