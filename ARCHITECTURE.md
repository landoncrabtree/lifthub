# Architecture

## Infrastructure

Three Docker containers orchestrated via `docker-compose.yml`:

| Container | Role | Image |
|-----------|------|-------|
| `backend` | REST API on port 3001 (internal) | Custom Node.js |
| `frontend` | Build-only; outputs static assets to shared volume | Custom Node.js + Vite |
| `caddy` | Reverse proxy, static file server, auto-SSL | `caddy:2-alpine` |

Caddy serves the frontend SPA from a shared volume and proxies `/api/*` requests to the backend. It handles TLS automatically when `DOMAIN` is set to a public hostname.

Volumes:
- `sqlite-data` — persists the SQLite database
- `frontend-assets` — shared between the frontend build container and Caddy
- `caddy-data`, `caddy-config` — SSL certificates and Caddy state

## Backend

**Stack**: Express.js, TypeScript, Drizzle ORM, better-sqlite3, Zod, JWT (jsonwebtoken + bcryptjs)

**Entry point**: `backend/src/index.ts`

```
backend/src/
├── db/
│   ├── connection.ts       SQLite connection + Drizzle instance
│   ├── schema.ts           Drizzle table definitions (source of truth)
│   ├── migrate.ts          Runs Drizzle migration files
│   └── seed.ts             93 exercises + 97 USDA foods
├── middleware/
│   ├── auth.ts             JWT access/refresh token auth
│   └── errorHandler.ts     Global error handler
├── routes/
│   ├── auth.ts             POST /register, /login, /refresh
│   ├── exercises.ts        CRUD /exercises
│   ├── foods.ts            CRUD /foods, barcode lookup, custom meals
│   ├── templates.ts        CRUD /templates, POST /templates/:id/start
│   ├── workouts.ts         CRUD /workouts, PUT /workouts/:id/sets/:setId
│   ├── progress.ts         GET /progress/summary, /progress/exercise/:id
│   └── nutrition.ts        Nutrition profiles, food log, weight log, charts
├── types/
│   └── index.ts            Express request augmentation
└── index.ts                Express app setup, route mounting
```

### Database (Drizzle ORM)

SQLite with WAL mode, foreign keys enabled, and 5s busy timeout. **Drizzle ORM** manages the schema and migrations.

**Two database exports** from `connection.ts`:
- `db` (default) — Drizzle query builder for type-safe CRUD operations
- `sqlite` — Raw better-sqlite3 instance for complex aggregations, JOINs, and date functions

**Schema** is defined in `db/schema.ts` using Drizzle's `sqliteTable()` builder. This file is the single source of truth for the database structure.

**Tables**:
- `users` — email, username, password_hash
- `exercises` — name, muscle_group, equipment, description (per-user + seeded)
- `templates` — name, description, json_data (exercise configuration)
- `template_exercises` — normalized exercise rows for a template
- `workouts` — started_at, finished_at, linked to template
- `workout_sets` — weight, reps, rpe, set_type, completed flag
- `nutrition_profiles` — height, weight, age, sex, activity level, macros
- `foods` — name, brand, serving size, macros, source (custom/usda/openfoodfacts)
- `custom_meals` / `custom_meal_items` — user-defined meal presets
- `food_log` — daily food intake entries
- `weight_log` — body weight tracking

Stale workouts (unfinished for 24+ hours) are auto-closed on list queries.

### Schema Migrations (Drizzle Kit)

Drizzle Kit provides incremental, SQL-based migrations:

```bash
# After changing db/schema.ts, generate a migration:
npm run db:generate

# Apply pending migrations:
npm run db:migrate

# Push schema directly (dev only, no migration file):
npm run db:push

# Open Drizzle Studio (visual DB browser):
npm run db:studio
```

**Migration workflow** for future schema changes:
1. Edit `backend/src/db/schema.ts` (add/remove/modify columns/tables)
2. Run `npm run db:generate` — Drizzle diffs the schema and generates a `.sql` file in `backend/drizzle/`
3. Run `npm run db:migrate` — applies the SQL migration to the database
4. Commit the migration file alongside the schema change

Migrations are stored in `backend/drizzle/` as numbered `.sql` files. They run automatically on app startup via `migrate()` in `index.ts`.

### Authentication

JWT-based with two token types:
- Access token: 15-minute expiry, sent as `Authorization: Bearer <token>`
- Refresh token: 7-day expiry, used to rotate access tokens

Passwords hashed with bcrypt. Secret configured via `JWT_SECRET` env var.

### API Convention

All routes prefixed with `/api`. JSON request/response bodies. Auth middleware applied to all routes except `/api/auth/*`. Zod validates request payloads.

## Frontend

**Stack**: React 18, TypeScript, Vite, Tailwind CSS, Recharts, dnd-kit, Lucide icons, vite-plugin-pwa

**Entry point**: `frontend/src/main.tsx`

```
frontend/src/
├── api/
│   └── client.ts           HTTP client (get/post/put/del with auth headers)
├── components/
│   ├── ui/                  9 primitives: Button, Card, Input, Modal, Select,
│   │                        Badge, Tabs, Skeleton, EmptyState
│   └── layout/
│       └── AppLayout.tsx    Sidebar, top nav, mobile bottom nav, rest timer pill
├── contexts/
│   ├── AuthContext.tsx       User state, login/register/logout
│   ├── ThemeContext.tsx      Light/dark/system theme with localStorage
│   ├── TimerContext.tsx      Rest timer with Web Audio API beep
│   └── ToastContext.tsx      Toast notifications (success/error/info)
├── hooks/
│   └── useFetch.ts          Generic data fetching hook
├── pages/
│   ├── Dashboard.tsx         Stats, quick actions, recent workouts
│   ├── Exercises.tsx         Exercise library with muscle group filters
│   ├── TemplateEditor.tsx    Graphical + JSON template editing
│   ├── ActiveWorkout.tsx     Live workout with set logging
│   ├── History.tsx           List + calendar views of past workouts
│   ├── Progress.tsx          Charts, heatmap, personal records
│   ├── Login.tsx / Register.tsx
│   └── Settings.tsx
├── lib/
│   └── utils.ts             cn() for classnames, parseUTC() for SQLite dates
├── types/
│   └── index.ts             TypeScript interfaces mirroring backend types
└── index.css                Tailwind directives, CSS variables, animations
```

### Routing

React Router v6. `AppLayout` wraps authenticated routes with sidebar navigation (collapsible on desktop) and bottom tab bar on mobile.

### State Management

Context-based, no external state library. Four contexts cover auth, theme, timer, and toasts. Page-level state uses `useState` + `useFetch` hook.

### PWA

Configured via `vite-plugin-pwa` with `generateSW` strategy. Service worker precaches built assets. Manifest at `public/manifest.json`.
