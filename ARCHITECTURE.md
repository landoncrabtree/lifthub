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

**Stack**: Express.js, TypeScript, better-sqlite3, Zod, JWT (jsonwebtoken + bcryptjs)

**Entry point**: `backend/src/index.ts`

```
backend/src/
├── db/
│   ├── connection.ts       SQLite connection (WAL mode, foreign keys on)
│   ├── migrate.ts          Schema creation and migrations
│   └── seed.ts             93 default exercises across 13 muscle groups
├── middleware/
│   ├── auth.ts             JWT access/refresh token auth
│   └── errorHandler.ts     Global error handler
├── routes/
│   ├── auth.ts             POST /register, /login, /refresh
│   ├── exercises.ts        CRUD /exercises
│   ├── templates.ts        CRUD /templates, POST /templates/:id/start
│   ├── workouts.ts         CRUD /workouts, PUT /workouts/:id/sets/:setId
│   └── progress.ts         GET /progress/summary, /progress/exercise/:id
├── types/
│   └── index.ts            Shared TypeScript interfaces
└── index.ts                Express app setup, route mounting
```

### Database

SQLite with WAL mode and 5s busy timeout. Schema:

- `users` — email, username, password_hash
- `exercises` — name, muscle_group, equipment, description (per-user + seeded)
- `templates` — name, description, json_data (exercise configuration)
- `template_exercises` — normalized exercise rows for a template
- `workouts` — started_at, finished_at, linked to template
- `workout_sets` — weight, reps, rpe, set_type, completed flag

Stale workouts (unfinished for 24+ hours) are auto-closed on list queries.

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
