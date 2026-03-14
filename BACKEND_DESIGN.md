# Backend Design

Technical reference for the LiftHub Express backend. Covers architecture, database, API surface, and conventions.

## Project Structure

```
backend/
  src/
    db/
      connection.ts    # SQLite connection, Drizzle instance, performance pragmas
      migrate.ts       # Drizzle migration runner
      schema.ts        # All table definitions (single source of truth)
      seed.ts          # Built-in exercises (136) and USDA foods
    middleware/
      auth.ts          # JWT generation, verification, Express middleware
      errorHandler.ts  # Global Express error handler
    routes/
      auth.ts          # Register, login, refresh, me
      exercises.ts     # CRUD for exercises (built-in + custom)
      templates.ts     # CRUD for templates + start workout
      workouts.ts      # CRUD for workouts + set management
      progress.ts      # Exercise progress history + summary stats
      foods.ts         # CRUD for foods + custom meals + barcode lookup
      nutrition.ts     # Nutrition profile, food log, weight log, charts
    utils/
      logger.ts        # Centralized logger with environment-aware debug mode
    types/
      index.ts         # Shared TypeScript interfaces, Express augmentation
    index.ts           # App entry: middleware, DB init, route mounting, server start
  drizzle/             # Generated SQL migration files
  drizzle.config.ts    # Drizzle Kit configuration
  data/                # SQLite database file (gym.db), gitignored
  Dockerfile           # Multi-stage build (builder + production)
  package.json
  tsconfig.json
```

## Dependencies

| Library | Purpose |
|---|---|
| express 4 | HTTP framework |
| better-sqlite3 | Synchronous SQLite3 driver (WAL mode) |
| drizzle-orm | Type-safe ORM and query builder |
| drizzle-kit | Schema diffing and migration generation |
| jsonwebtoken | JWT sign/verify for access and refresh tokens |
| bcryptjs | Password hashing (12 rounds) |
| zod | Schema validation (available, not yet used broadly) |
| cors | CORS middleware |
| tsx | Dev-mode TypeScript execution with watch |

## Runtime

- **Node.js 20** (Alpine-based Docker image)
- **ESM modules** (`"type": "module"` in package.json)
- **TypeScript target:** ES2022, module ESNext, bundler resolution
- **Port:** `PORT` env var or 3001 default
- **Listens on** `0.0.0.0` for container networking

## Database

### SQLite with WAL Mode

Single-file database at `$DB_PATH` (default: `./data/gym.db`). Connection established in `connection.ts` with three performance pragmas:

```sql
PRAGMA journal_mode = WAL;      -- Write-Ahead Logging for concurrent reads
PRAGMA foreign_keys = ON;       -- Enforce foreign key constraints
PRAGMA busy_timeout = 5000;     -- Wait 5s on lock contention before erroring
```

### Dual Export Pattern

`connection.ts` exports two database handles:

- **`db`** (Drizzle ORM instance) — Used for standard CRUD: `db.select()`, `db.insert()`, `db.update()`, `db.delete()`. Provides type safety and query composition.
- **`sqlite`** (raw better-sqlite3 instance) — Used for complex operations that are awkward in the query builder: multi-table JOINs with aggregations, SQLite date functions, prepared statement loops, and transactions with mixed logic.

Routes choose whichever is appropriate per operation. Both hit the same underlying connection.

### Schema (`db/schema.ts`)

12 tables defined via `sqliteTable()`. This file is the single source of truth for the database structure.

| Table | Description | Key Columns |
|---|---|---|
| `users` | User accounts | email (unique), username (unique), password_hash |
| `exercises` | Exercise library | user_id (null=built-in, non-null=custom), muscle_group, equipment |
| `templates` | Workout templates | user_id, name, json_data (JSON blob), created_at, updated_at |
| `template_exercises` | Template-exercise junction | template_id (CASCADE), exercise_id, order_index, sets, reps, rest_seconds, set_type |
| `workouts` | Workout sessions | user_id, template_id (nullable), started_at, finished_at (null=active) |
| `workout_sets` | Individual sets within a workout | workout_id (CASCADE), exercise_id, set_index, reps, weight, rpe, completed |
| `nutrition_profiles` | User nutrition targets | user_id (unique), height, weight, age, sex, activity, goal, BMR, TDEE, macros |
| `foods` | Food database | user_id (null=global/USDA), barcode, macros, source (custom/openfoodfacts/usda) |
| `custom_meals` | User-defined meals | user_id, macros |
| `custom_meal_items` | Meal-food junction | meal_id (CASCADE), food_id, servings |
| `food_log` | Daily food intake | user_id, date, meal_type, food_id/custom_meal_id, servings, macros |
| `weight_log` | Body weight tracking | user_id+date (unique), weight_lbs |

### Indexes

Composite and single-column indexes on common query paths:

- `idx_exercises_muscle`, `idx_exercises_user`
- `idx_templates_user`
- `idx_workouts_user`, `idx_workouts_template`, `idx_workouts_started`
- `idx_workout_sets_workout`, `idx_workout_sets_exercise`
- `idx_foods_user`, `idx_foods_barcode`
- `idx_food_log_user_date` (composite)
- `idx_weight_log_user_date` (unique composite)
- `idx_nutrition_profiles_user`, `idx_custom_meals_user`

### Foreign Key Cascades

- `template_exercises.template_id` → CASCADE on delete (deleting a template removes its exercise rows)
- `workout_sets.workout_id` → CASCADE on delete (deleting a workout removes its sets)
- `custom_meal_items.meal_id` → CASCADE on delete
- `template_exercises.exercise_id` → **no cascade** (exercises cannot be deleted without explicit cleanup)
- `workout_sets.exercise_id` → **no cascade** (same)

The exercise DELETE handler manually cascades: removes from `template_exercises`, `workout_sets`, strips from `templates.json_data` JSON blobs, then deletes the exercise — all in a transaction.

### Template Dual Storage

Templates store exercises in two places:

1. **`json_data`** column — A JSON array of `TemplateExercise` objects. Used for the template editor's JSON mode and preserves user-authored structure.
2. **`template_exercises`** table — Relational rows with `order_index`. Used for JOINs (workout creation, detail queries).

`syncTemplateExercises()` in `templates.ts` keeps them in sync: on every create/update, it deletes all `template_exercises` rows for that template and re-inserts from the parsed JSON. Uses raw `sqlite` prepared statements for the batch DELETE+INSERT loop.

### Migrations

Drizzle Kit manages incremental schema migrations:

1. Edit `src/db/schema.ts`
2. `npm run db:generate` — Diffs schema against the last snapshot, generates a timestamped `.sql` file in `drizzle/`
3. `npm run db:migrate` — Applies pending migrations
4. Migrations also run automatically on app startup via `migrate()` in `db/migrate.ts`

### Seed Data

`seed.ts` contains:
- **136 built-in exercises** across 13 muscle groups with anatomical descriptions. Naming convention: `Exercise Name (Equipment)`. Inserted with `user_id: null`.
- **USDA reference foods** with standard serving sizes and macros. Inserted with `source: 'usda'`.

Seeding is idempotent: checks for existing names before inserting. Only new exercises/foods that don't already exist by name are added. Runs on every app startup.

## Authentication

### Token Architecture

- **Access token:** JWT, 15-minute expiry. Contains `{ userId }`. Sent as `Authorization: Bearer <token>`.
- **Refresh token:** JWT, 7-day expiry. Contains `{ userId, type: 'refresh' }`. Stored client-side, sent to `POST /auth/refresh`.

Both signed with `JWT_SECRET` env var (falls back to `'dev-secret-change-me'`).

### Auth Middleware

`authMiddleware` extracts and verifies the Bearer token from the `Authorization` header. On success, sets `req.userId`. On failure, returns 401. Applied at the router level (`router.use(authMiddleware)`) on all protected route files.

### Password Handling

bcryptjs with 12 salt rounds. Passwords validated as minimum 6 characters on registration. Login returns a generic "Invalid email or password" for both wrong email and wrong password (no user enumeration).

### Express Type Augmentation

`types/index.ts` extends the Express `Request` interface:

```ts
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}
```

## API Reference

All routes are prefixed with `/api`. Protected routes require a valid access token.

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Create account. Body: `{ email, username, password }`. Returns tokens + user. |
| POST | `/login` | No | Authenticate. Body: `{ email, password }`. Returns tokens + user. |
| POST | `/refresh` | No | Rotate tokens. Body: `{ refreshToken }`. Returns new token pair. |
| GET | `/me` | Yes | Get current user profile. |

### Exercises (`/api/exercises`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | List built-in + user's custom exercises. Filters: `?q=`, `?muscle_group=`, `?equipment=`. |
| GET | `/:id` | Yes | Get single exercise (must be built-in or user's own). |
| POST | `/` | Yes | Create custom exercise. Body: `{ name, muscle_group, equipment?, description? }`. |
| PUT | `/:id` | Yes | Update custom exercise (user's own only). |
| DELETE | `/:id` | Yes | Delete custom exercise with cascade cleanup (transaction). |

### Templates (`/api/templates`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | List user's templates (parsed json_data). Ordered by updated_at DESC. |
| GET | `/:id` | Yes | Get template detail with joined exercise rows. |
| POST | `/` | Yes | Create template. Body: `{ name, description?, json_data? }`. |
| PUT | `/:id` | Yes | Update template. Syncs template_exercises. |
| DELETE | `/:id` | Yes | Delete template (CASCADE removes template_exercises). |
| POST | `/:id/start` | Yes | Start workout from template. Returns 409 if an active workout exists. |

### Workouts (`/api/workouts`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | List workouts. Auto-finishes stale (>24h) workouts. Filters: `?from=`, `?to=`. |
| GET | `/:id` | Yes | Get workout detail with all sets (ordered by template order). |
| POST | `/` | Yes | Create ad-hoc workout. Body: `{ name, notes? }`. |
| PUT | `/:id` | Yes | Update workout (name, notes, finish). Body: `{ finished: true }` to finish. |
| DELETE | `/:id` | Yes | Delete workout (CASCADE removes workout_sets). |
| POST | `/:id/sets` | Yes | Add set(s). Accepts single object or array. |
| PUT | `/:id/sets/:setId` | Yes | Update a set (reps, weight, rpe, completed, etc.). |

### Progress (`/api/progress`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/exercise/:id` | Yes | Historical progress for an exercise: max weight, volume, e1RM. |
| GET | `/summary` | Yes | Dashboard stats: total workouts, weekly count, streak, PRs, heatmap. |

### Foods (`/api/foods`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | List all foods (user's + global). |
| GET | `/search?q=` | Yes | Search foods by name (limit 50). |
| GET | `/barcode/:code` | Yes | Barcode lookup: local cache then OpenFoodFacts API. |
| POST | `/` | Yes | Create custom food. |
| PUT | `/:id` | Yes | Update custom food (user's own only). |
| DELETE | `/:id` | Yes | Delete custom food. |
| GET | `/custom-meals` | Yes | List user's custom meals. |
| POST | `/custom-meals` | Yes | Create custom meal. |
| PUT | `/custom-meals/:id` | Yes | Update custom meal. |
| DELETE | `/custom-meals/:id` | Yes | Delete custom meal. |

### Nutrition (`/api/nutrition`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/onboard` | Yes | Create nutrition profile. Computes BMR, TDEE, macros. |
| GET | `/profile` | Yes | Get nutrition profile. |
| PUT | `/profile` | Yes | Update nutrition profile. Recomputes derived values. |
| GET | `/daily?date=` | Yes | Daily food log entries + totals + targets for a date. |
| GET | `/log?days=30` | Yes | Food log history grouped by day. |
| GET | `/recent?limit=10` | Yes | Recent individual food log entries. |
| POST | `/log` | Yes | Log a food entry. Computes macros from food/meal * servings. |
| DELETE | `/log/:id` | Yes | Delete food log entry. |
| GET | `/weight-log?days=90` | Yes | Weight log entries. |
| POST | `/weight-log` | Yes | Log weight. Upserts on (user_id, date). |
| GET | `/charts` | Yes | Chart data: calorie history, weight trend, energy balance. |

### Health Check

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | Returns `{ status: 'ok', timestamp }`. |

## Authorization Model

### Ownership Pattern

Every protected endpoint enforces that users can only access their own data. The pattern is:

```ts
// SELECT and UPDATE both filter by user_id
const existing = db.select().from(table)
  .where(and(eq(table.id, id), eq(table.user_id, req.userId!)))
  .get();

// UPDATE also includes user_id in WHERE (prevents TOCTOU bypass)
db.update(table).set(updates)
  .where(and(eq(table.id, id), eq(table.user_id, req.userId!)))
  .run();
```

All UPDATE operations include `user_id` in the WHERE clause, not just the SELECT check. This prevents time-of-check-to-time-of-use (TOCTOU) vulnerabilities.

### Shared vs. Owned Resources

- **Exercises and Foods** use nullable `user_id`. Null = built-in/global (visible to all). Non-null = user-created (visible only to owner). Edit/delete restricted to owner's custom items.
- **All other tables** have required `user_id` — strictly user-scoped.

## Business Logic

### Workout Lifecycle

1. **Start:** `POST /templates/:id/start` creates a workout from a template. Pre-populates sets with last-used weights/reps for progressive overload. Returns 409 if an active workout already exists.
2. **During:** `PUT /workouts/:id/sets/:setId` updates individual set data (weight, reps, RPE, completed).
3. **Finish:** `PUT /workouts/:id` with `{ finished: true }` sets `finished_at = CURRENT_TIMESTAMP`.
4. **Auto-close:** `GET /workouts` runs a cleanup UPDATE before querying — any workout with `finished_at IS NULL` and `started_at < now - 24h` is auto-finished with `finished_at = started_at + 1 hour`.

### Progressive Overload

When starting a workout from a template, the system looks up the last completed workout from the same template. For each exercise/set, it copies the weight and reps from the previous workout's completed sets. This gives users their last numbers as a starting point.

### Active Workout Guard

`POST /templates/:id/start` checks for any existing workout where `finished_at IS NULL`. If found, returns 409 with error format `ACTIVE_WORKOUT:<id>:<name>` so the frontend can offer a "Resume" option. Only one active workout per user at a time.

### Nutrition Computation

`computeNutrition()` in `nutrition.ts` calculates:

- **BMR:** Mifflin-St Jeor equation (different formula for male/female)
- **TDEE:** BMR * activity multiplier (1.2 sedentary to 1.9 very active)
- **Calorie target:** TDEE + goal offset (-500 lose, 0 maintain, +300 bulk)
- **Macros:** Goal-based splits (e.g., lose = 40/30/30 P/C/F)

Recomputed on every profile update. Stored denormalized for fast reads.

### Food Log Macro Calculation

`POST /nutrition/log` looks up the referenced food or custom meal, multiplies all macros by the servings count, rounds to 1 decimal place, and stores the computed values. Denormalized storage means the log entry is self-contained (no JOINs needed for totals).

### Weight Log Upsert

`POST /nutrition/weight-log` uses `onConflictDoUpdate` on the `(user_id, date)` unique index. Logging weight for the same date overwrites the previous entry.

### Barcode Lookup

`GET /foods/barcode/:code` is a multi-tier lookup:
1. Check local `foods` table for a matching barcode (instant cache hit).
2. If not found, fetch from the OpenFoodFacts API v2 with **barcode variant fallback**:
   - Barcode scanners expand UPC-E (8 digits) → UPC-A (12) → EAN-13 (13 with leading zero). OpenFoodFacts often has better data (serving info) under the shorter UPC-E code.
   - The handler generates variants: original code, stripped leading zeros, and UPC-A→UPC-E compressed form.
   - Tries each variant in order, preferring whichever entry has `energy-kcal_serving` and `serving_size` data.
3. Nutrition extraction prefers `_serving` fields (pre-calculated by OpenFoodFacts). Falls back to `_100g * serving_quantity / 100` only when serving data is unavailable.
4. Result is inserted into the local DB with `source: 'openfoodfacts'` for future cache hits.

### Progress Calculations

- **Exercise progress:** Completed sets grouped by workout, ordered by date. Max weight, total volume (`SUM(reps * weight)`), max reps, average RPE.
- **Estimated 1RM:** Epley formula — `weight * (1 + reps / 30)`.
- **Streak:** Query distinct workout dates descending. Walk backward from today (or yesterday if no workout today), counting consecutive days.
- **Heatmap:** `COUNT(*)` of finished workouts grouped by `date(started_at)` over 365 days.
- **Personal records:** Heaviest completed set per exercise, top 10 by weight.

### Exercise Delete Cascade

Since `template_exercises.exercise_id` and `workout_sets.exercise_id` lack `ON DELETE CASCADE`, the DELETE handler runs a transaction:

1. Delete from `template_exercises` where `exercise_id` matches
2. Delete from `workout_sets` where `exercise_id` matches
3. Parse each user template's `json_data`, filter out the exercise, update if changed
4. Delete the exercise row

## Error Handling

### Route-Level

All route handlers use try/catch. Errors return JSON: `{ error: "message" }`. Standard HTTP status codes:

| Code | Usage |
|---|---|
| 200 | Success (GET, PUT) |
| 201 | Created (POST) |
| 204 | Deleted (DELETE, no body) |
| 400 | Validation failure |
| 401 | Missing/invalid token |
| 404 | Resource not found or not owned by user |
| 409 | Conflict (duplicate account, active workout exists) |
| 500 | Unhandled error |
| 502 | External API failure (OpenFoodFacts) |

### Global Error Handler

`errorHandler` middleware catches unhandled errors, logs them via `logger.error()`, and returns a generic 500 response. Registered last in the middleware chain.

## Conventions

### Route Organization

Each route file creates its own `Router()`, applies `authMiddleware` at the router level (except `auth.ts` which handles its own), and exports the router as default. Mounted in `index.ts` with `/api/<resource>` prefix.

### Query Builder vs. Raw SQL

- **Drizzle ORM (`db`):** Used for simple CRUD — single-table selects, inserts, updates, deletes. Provides type inference from the schema.
- **Raw SQLite (`sqlite`):** Used for complex queries involving multi-table JOINs with aggregations, SQLite-specific date functions (`datetime()`, `date()`), and performance-critical batch operations. Queries are string-based with `prepare().all()` or `prepare().get()`.

The choice is pragmatic per-operation, not dogmatic. Both are used freely within the same route file.

### Timestamps

All timestamps stored as TEXT in SQLite's `CURRENT_TIMESTAMP` format: `YYYY-MM-DD HH:MM:SS` (UTC, no timezone suffix). Frontend must use `parseUTC()` to interpret them correctly.

### Response Shapes

- **Lists:** Return flat JSON arrays.
- **Details:** Return the resource object, sometimes with nested arrays (e.g., workout with `sets`).
- **JOINed data:** Returns flat fields (`exercise_name`, `muscle_group`) rather than nested objects. Frontend reads these directly.
- **Parsed JSON:** `json_data` is stored as TEXT but always parsed to an object/array before returning to the client.

### Validation

Minimal validation in route handlers (required fields, string length). Zod is a dependency but not yet used broadly. Most validation relies on database constraints (NOT NULL, UNIQUE, FOREIGN KEY).

### No Service Layer

Business logic lives directly in route handlers. For the current scale, this avoids unnecessary abstraction. Complex operations (like workout start with progressive overload) use raw SQL in the route handler.

### Logging

Centralized in `utils/logger.ts`. All backend code uses the `logger` object instead of raw `console.log`/`console.error`.

```typescript
import { logger } from '../utils/logger.js';

logger.info('Server started');          // Always logs (lifecycle, important events)
logger.warn('Deprecated endpoint');     // Always logs
logger.error('Unhandled error:', err);  // Always logs
logger.debug('GET /exercises', params); // Only logs when NODE_ENV=development
```

**Levels:**
- `info` / `warn` / `error` — Always active. Used for server lifecycle, errors, and important events.
- `debug` — Only active when `NODE_ENV=development`. Used for request tracing, parameter logging, and diagnostic output (e.g., barcode lookup flow). Silent in production.

**Format:** `[ISO timestamp] [LEVEL] message ...args`

**Convention:** Every mutating route handler (`POST`, `PUT`, `DELETE`) should have a `logger.debug()` call at entry with the route pattern and key parameters. Read-only `GET` routes only need debug logging when they have complex logic (e.g., barcode lookup with variant fallback).

## Docker

### Multi-Stage Build

```dockerfile
# Stage 1: Build TypeScript
FROM node:20-alpine AS builder
COPY . .
RUN npm install && npm run build

# Stage 2: Production
FROM node:20-alpine
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
RUN npm install --omit=dev
```

- Production image has only runtime dependencies (no TypeScript, no dev tools)
- `drizzle/` migration files are copied for runtime migration
- `data/` directory created for SQLite storage (should be a Docker volume mount)
- Exposes port 3001

### Data Persistence

The SQLite database file lives at `/app/data/gym.db` inside the container. This path must be backed by a Docker named volume to persist across container recreation:

```yaml
volumes:
  - gym-data:/app/data
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | 3001 | HTTP listen port |
| `DB_PATH` | `./data/gym.db` | SQLite database file path |
| `JWT_SECRET` | `dev-secret-change-me` | JWT signing secret (must be set in production) |
