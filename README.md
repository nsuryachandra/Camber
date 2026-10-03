# FleetPro — Vehicle Rental & Fleet Management Database System

A production-quality fleet-management web application built for an **Advanced DBMS (ADBMS)** course project. React frontend → Node.js/Express REST API → **MySQL**, with real stored procedures, functions, triggers, views, transactions and constraint-driven business rules.

> Demo login: **admin@fleetpro.in / Admin@123** (admin) · **staff@fleetpro.in / Admin@123** (staff)

---

## 1. Project Overview

FleetPro manages the full lifecycle of a vehicle rental business:

```text
Customer → selects an available vehicle → picks dates → booking created (MySQL validates overlap)
        → payment recorded → pickup (vehicle RENTED) → return (vehicle AVAILABLE / MAINTENANCE)
        → dashboard & reports reflect everything, live from the database
```

9 pages: **Login · Dashboard · Vehicles · Customers · Rentals · Payments · Maintenance · Branches · Reports**.

---

## 2. Technology Stack

| Layer     | Technology                                       |
|-----------|--------------------------------------------------|
| Frontend  | React 19 (Vite), React Router, Axios, Recharts, lucide-react, plain CSS design system |
| Backend   | Node.js, Express.js, REST API, JWT, bcryptjs     |
| Database  | MySQL 8.0 — raw SQL, stored procedures/functions, triggers, views, transactions |
| Driver    | mysql2 (connection pool, parameterized queries)  |

No TypeScript, no MongoDB, no ORM — the SQL is the application.

---

## 3. Architecture

```text
vehicle-rental-system/
├── backend/
│   ├── config/          # env config (dotenv, loaded from backend/.env)
│   ├── controllers/     # request handlers — one module per resource
│   ├── routes/          # Express router (single routes/index.js)
│   ├── middleware/      # JWT auth, role guard, central error handler
│   ├── db/              # pool, error mapping, DB setup runner (db/setup.js)
│   ├── utils/           # validation, constants, param guards
│   ├── tests/e2e.js     # 37-check end-to-end API test suite
│   ├── app.js           # Express app wiring
│   └── server.js        # HTTP listener
├── database/
│   ├── schema.sql       # tables, PKs, FKs, CHECKs, ENUMs, inline indexes
│   ├── views.sql        # 5 views (available_vehicles, monthly_revenue, …)
│   ├── functions.sql    # calculate_rental_amount()
│   ├── procedures.sql   # create_rental(), return_vehicle(), cancel_rental()
│   ├── triggers.sql     # rental lifecycle ↔ vehicle status consistency
│   ├── indexes.sql      # explicit secondary indexes
│   └── seed.sql         # realistic Indian demo data
├── frontend/
│   └── src/
│       ├── components/  # AppLayout, Sidebar, Modal, DataState
│       ├── pages/       # 9 route pages
│       ├── context/     # AuthContext (JWT session)
│       ├── hooks/       # useFetch
│       └── services/    # axios instance + interceptors
└── .env.example         # copy to backend/.env
```

Request flow: **React → axios (JWT header) → Express route → controller → MySQL (procedures/views/transactions) → JSON → React**. Availability and pricing are *always* decided in MySQL — the frontend only previews.

---

## 4. Database Schema (8 tables, 3NF)

```text
users             user_id PK, full_name, email UQ, password_hash (bcrypt), role ENUM(ADMIN/STAFF), status
branches          branch_id PK, branch_name, address, city, phone UQ, manager_name, status
vehicle_types     vehicle_type_id PK, type_name UQ, description          — removes repeating type strings
customers         customer_id PK, name, phone UQ, email UQ, driving_license_number UQ, address, registration_date, status
vehicles          vehicle_id PK, registration_number UQ, brand, model,
                  vehicle_type_id FK→vehicle_types, manufacturing_year, fuel_type, transmission,
                  seating_capacity, rental_rate, branch_id FK→branches, status ENUM
rentals           rental_id PK, customer_id FK→customers, vehicle_id FK→vehicles, branch_id FK→branches,
                  pickup_date, expected_return_date, actual_return_date, rental_days, daily_rate,
                  rental_amount, extra_charges, final_amount, vehicle_condition, status ENUM(BOOKED/ACTIVE/COMPLETED/CANCELLED),
                  notes, created_by FK→users, created_at
payments          payment_id PK, rental_id FK→rentals, amount, payment_date, payment_method ENUM(CASH/CARD/UPI),
                  payment_status ENUM(PENDING/PAID), reference_note
maintenance       maintenance_id PK, vehicle_id FK→vehicles, maintenance_type ENUM, description,
                  maintenance_date, cost, service_provider, next_service_date, status ENUM
```

**Normalization notes.** Every non-key attribute depends on its table's key only — vehicle type names live in `vehicle_types` (referenced by FK), branch names in `branches`, customer details in `customers`; `rentals` stores the immutable `daily_rate` snapshot used for pricing (historical fact, not derived duplication). Amounts are `DECIMAL(10,2)`, never floats.

**Constraints.** PKs + FKs with explicit referential actions, `UNIQUE` on registration_number / phone / email / licence / branch phone, `NOT NULL` on all business-critical columns, `CHECK` constraints (e.g. `rental_rate > 0`, `manufacturing_year` sanity, `amount > 0`), `DEFAULT` values, and ENUM domain enforcement.

---

## 5. ADBMS Concepts Demonstrated

| # | Concept | Where |
|---|---------|-------|
| 1 | Primary / foreign keys | `schema.sql` (all tables) |
| 2 | Constraints (UNIQUE, CHECK, NOT NULL, DEFAULT, ENUM) | `schema.sql` |
| 3 | Normalization to 3NF | schema design (type/branch/customer separation) |
| 4 | INNER JOINs | every list endpoint (rentals join customers+vehicles+branches) |
| 5 | LEFT JOINs | `branchController.list`, `paymentController.outstanding`, reports |
| 6 | Aggregates COUNT/SUM/AVG/MIN/MAX | `reportController`, `maintenance.summary`, branch fleet stats |
| 7 | Subqueries | dashboard KPI subselects, anti-join "customers who never rented", `paid_so_far` |
| 8 | Views (5) | `available_vehicles`, `active_rentals`, `monthly_revenue`, `vehicle_utilization`, `pending_payments` |
| 9 | Stored procedures (3) | `create_rental`, `return_vehicle`, `cancel_rental` |
| 10 | Stored function | `calculate_rental_amount(days, rate)` — called by `create_rental` |
| 11 | Triggers (2) | rental lifecycle ↔ vehicle status (BOOKED→ACTIVE marks RENTED; COMPLETED/CANCELLED releases) |
| 12 | Transactions | `withTransaction()` wraps procedure calls; `SELECT … FOR UPDATE` row locks serialize availability checks |
| 13 | Indexing | `indexes.sql` — registration_number, phone, email, vehicle status, rental dates, FK columns |
| 14 | Signal/handled business errors | procedures `SIGNAL SQLSTATE '45000'` → backend maps to HTTP 409 with a readable message |

**Key business rule — availability.** `create_rental` locks the vehicle row (`FOR UPDATE`), rejects non-AVAILABLE vehicles, and rejects any `BOOKED/ACTIVE` rental whose window overlaps the requested dates. Overlap predicate: `existing.pickup <= new.return AND existing.return >= new.pickup` — so a booking of 10→13 Sep blocks 11→14 Sep but allows a pickup on 14 Sep. The same-day rental counts as 1 day (`DATEDIFF + 1`, inclusive convention).

**Lifecycle.** BOOKED (reservation — vehicle stays AVAILABLE, window protected by overlap checks) → ACTIVE at pickup (trigger sets vehicle RENTED) → COMPLETED on return (procedure settles final amount, vehicle AVAILABLE or MAINTENANCE if flagged) / CANCELLED (vehicle released).

---

## 6. API Overview

All routes require `Authorization: Bearer <jwt>` except `/auth/login`. `ADMIN`-only mutations are marked 🔒.

```text
POST   /api/auth/login                      { email, password } → { token, user }
GET    /api/auth/me

GET    /api/vehicles?search&status&type&branch&page&limit
GET    /api/vehicles/:id                    (profile + rental + maintenance history)
GET    /api/vehicles/:id/availability?pickup&return
POST   /api/vehicles                        🔒
PUT    /api/vehicles/:id                    🔒
PATCH  /api/vehicles/:id/status             🔒  (deactivate / reactivate)

GET    /api/customers?search&status&page&limit
GET    /api/customers/:id                   (profile + rental history)
POST   /api/customers
PUT    /api/customers/:id
PATCH  /api/customers/:id/status            🔒

GET    /api/rentals?search&status&page&limit
GET    /api/rentals/:id                     (detail + payment ledger)
POST   /api/rentals                         → CALL create_rental(...)  { customer_id, vehicle_id, pickup_date, expected_return_date, notes }
POST   /api/rentals/:id/pickup              BOOKED → ACTIVE
POST   /api/rentals/:id/return              → CALL return_vehicle(...) { vehicle_condition, extra_charges, needs_maintenance }
POST   /api/rentals/:id/cancel              → CALL cancel_rental(...)

GET    /api/payments?search&status&method&page&limit
GET    /api/payments/outstanding            rentals with balance_due > 0 (SQL HAVING)
GET    /api/payments/:id                    receipt + ledger
POST   /api/payments                        { rental_id, amount, payment_method, payment_status, reference_note }
PATCH  /api/payments/:id/status             PENDING → PAID (over-limit guarded)

GET    /api/maintenance?search&status&type&vehicle_id&page&limit
GET    /api/maintenance/summary             cost aggregates per type
POST   /api/maintenance                     (vehicle → MAINTENANCE, transactional)
PUT    /api/maintenance/:id
PATCH  /api/maintenance/:id/status          (COMPLETED → vehicle AVAILABLE unless other open records)

GET    /api/branches                        (per-branch fleet summary)
GET    /api/branches/:id                    (detail + vehicles)
POST   /api/branches                        🔒
PUT    /api/branches/:id                    🔒
PATCH  /api/branches/:id/status             🔒  (blocked while fleet present)

GET    /api/reports/dashboard               KPIs + recent rentals + 3 chart series
GET    /api/reports/fleet                   by status / type / branch + most rented (view)
GET    /api/reports/rentals                 status counts, top customers, duration stats, anti-join
GET    /api/reports/revenue?days=30         daily / monthly / by type / by branch / pending

GET    /api/meta/form-data                  dropdown reference data in one call
```

Errors are always `{ error: "human-readable message" }` with correct status codes (400 validation, 401 auth, 403 role, 404 missing, 409 business rules). Every query is parameterized; SQL errors are mapped centrally in `db/errors.js`.

---

## 7. Setup & Running

### Prerequisites
- Node.js 18+
- MySQL 8.0 running locally

### 1. Install
```bash
npm run install:all        # installs backend/ and frontend/ dependencies
```

### 2. Configure environment
Copy `backend/.env.example` → `backend/.env` and set your MySQL credentials:
```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=vehicle_rental_db
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=1d
PORT=5000
```

### 3. Create the database (schema + views + procedures + triggers + indexes + seed)
```bash
npm run setup:db           # runs node backend/db/setup.js against the .env credentials
```
The script executes the SQL files in order and is safe to re-run (it drops and recreates `vehicle_rental_db`).

### 4. Run
```bash
npm run dev                # backend on :5000 + frontend (Vite) on :3000, with /api proxy
```
or separately: `npm run dev:backend` / `npm run dev:frontend`. Open **http://localhost:3000** and log in with `admin@fleetpro.in / Admin@123`.

### 5. Run the end-to-end tests
```bash
cd backend && node tests/e2e.js
```
37 checks covering auth/roles, duplicate registration & licence, invalid email/date-range rejection, date-overlap booking rules, pickup/return/cancel lifecycle, payment over-limit protection, outstanding balances, maintenance status transitions with vehicle-state assertions, all report endpoints, and branch guard rules.

---

## 8. Seed Data

Realistic Indian demo data: 2 users (admin + staff), 4 branches (Bengaluru/Hyderabad/Chennai/Mumbai), 6 vehicle types, 25+ vehicles with Indian registration formats (`KA05MJ1234`), 20 customers with 10-digit mobile numbers, 20 rentals across all statuses (dated relative to today so the dashboard is always alive), payments in ₹ via CASH/CARD/UPI, and maintenance history. Both accounts share the password **Admin@123** (bcrypt, 10 rounds).

---

## 9. Notes for the Viva

- **Why a procedure for booking?** Availability must be checked and inserted atomically; `SELECT … FOR UPDATE` inside `create_rental` prevents two concurrent bookings for the same window.
- **Why a function for pricing?** The pricing rule has exactly one definition (`days × rate`) reused by the procedure — change it in one place.
- **Why those two triggers?** They enforce the invariant *an ACTIVE rental ⇒ its vehicle is RENTED* and *no open rental ⇒ vehicle released*, so vehicle status can never drift from the rental table.
- **Why is BOOKED not RENTED?** A future reservation does not hold the vehicle — only pickup does. This lets customers book future windows while the vehicle keeps serving earlier rentals.
- **Frontend never decides availability** — it only previews; the server recomputes and the procedure has the final word.
