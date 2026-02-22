# Airborne Fitness

Member-facing web app for an aerial fitness studio (login, enroll, book classes, manage sessions). Full-stack TypeScript: React + Express + PostgreSQL (Drizzle). See `replit.md` for full architecture.

---

## Environment and database

- **Development**: Copy `.env.example` to `.env` and set `DATABASE_URL` (e.g. Neon or local Postgres).
- **Staging**: Use a Neon **branch** named `staging` (see below). Copy `.env.staging.example` to `.env.staging` and set `DATABASE_URL` to the staging branch connection string.
- **Production**: Set `DATABASE_URL` in your host; do not commit production env. See `.env.production.example`.

The server reads **only** `process.env.DATABASE_URL`; no `DATABASE_URL_STAGING` / `DATABASE_URL_PROD` in code—switch DB by loading the right env file.

---

## How to run staging locally

1. **Create the Neon staging branch** (once):
   - **Option A**: In [Neon Console](https://console.neon.tech): open your project → **Branches** → **Create branch** → name: `staging` (from current main/production). Copy the staging branch connection string.
   - **Option B**: If using the Neon MCP plugin in Cursor, you can ask it to create a branch named `staging` from the current branch and provide the connection string.

2. **Configure**:
   - `cp .env.staging.example .env.staging`
   - Set `DATABASE_URL` in `.env.staging` to the staging connection string.
   - Optionally set `ADMIN_ALLOWLIST_PHONES` (e.g. `9999977777`) for admin/verify scripts.

3. **Push schema to staging** (when schema changes):
   ```bash
   npm run db:push:staging
   ```

4. **Run the server against staging**:
   ```bash
   npm run staging
   ```
   This loads `.env.staging` and uses the staging DB. The app runs as in dev (e.g. port 5000).

---

## How to seed staging

- Seed **does not** run on server start unless `SEED_ON_START=true`.
- To seed the DB used by your current env (e.g. staging):

  **Seed once (only if `class_types` is empty):**
  ```bash
  npm run seed:staging
  ```

  **Force reset seed-owned data and re-seed** (clears only `class_types`, `membership_plans`, `schedule_slots`; does not drop tables):
  ```bash
  RESET_SEED=true npm run seed:staging
  ```

- For **development** (using `.env`):
  ```bash
  npm run seed
  # or with reset:
  RESET_SEED=true npm run seed
  ```

---

## How to verify dynamic behavior

Proves that class types, membership plans, and schedule slots are fully DB-driven and updatable via admin APIs (no hardcoded lists).

1. **Start the server** (dev or staging):
   ```bash
   npm run dev
   # or: npm run staging
   ```

2. **Set admin phone** in the same env you use for the server (e.g. in `.env` or `.env.staging`):
   - `ADMIN_ALLOWLIST_PHONES=9999977777`
   - Optional: `ADMIN_PHONE=9999977777` (script uses first from list if `ADMIN_PHONE` unset).

3. **Run the verification script**:
   - Against dev (server on default port, using `.env`):
     ```bash
     npm run verify:dynamic
     ```
   - Against staging (loads `.env.staging`; server should be run with `npm run staging`):
     ```bash
     npm run verify:dynamic:staging
     ```

4. **What it does**: Calls public GET APIs, then admin PATCH endpoints (with `X-Admin-Phone`), then GET again to confirm changes. It restores original values so the DB is not left modified. All checks must **PASS**.

5. **Optional**: Override API base URL:
   ```bash
   BASE_URL=http://localhost:5000 npm run verify:dynamic
   ```

---

## Admin endpoints (allowlist)

For staging/dev verification and future admin UI. Protected by **phone allowlist**: request must include header `X-Admin-Phone` with a value in `ADMIN_ALLOWLIST_PHONES` (comma-separated).

- `PATCH /api/admin/class-types/:id` — body: `{ name?, ageGroup?, strengthLevel?, infoBullets?, isActive? }`
- `PATCH /api/admin/membership-plans/:id` — body: `{ name?, sessionsTotal?, validityDays?, price?, isActive? }`
- `PATCH /api/admin/schedule-slots/:id` — body: `{ branch?, dayOfWeek?, startHour?, startMinute?, endHour?, endMinute?, capacity?, isActive?, notes? }`

All return the updated row or 404.
