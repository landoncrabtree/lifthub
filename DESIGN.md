# Design

## UI/UX

### Visual Language

Clean, minimal interface inspired by Stripe/Vercel. Built with Tailwind CSS using CSS custom properties for theming:

- `--color-bg`, `--color-bg-secondary`, `--color-bg-tertiary` — surface hierarchy
- `--color-text`, `--color-text-secondary`, `--color-text-tertiary` — text hierarchy
- `--color-border` — borders
- `brand-*` — accent color scale (indigo-based)

Dark mode is fully supported via `prefers-color-scheme` detection or manual toggle. CSS variables swap between light and dark palettes.

### Component System

Nine reusable UI primitives in `components/ui/`. All accept `className` for composition. Components use the `cn()` utility (clsx + tailwind-merge) for conditional class merging.

Cards are the primary container element. Inputs share a common `.input-field` base class defined in `index.css`.

### Layout

- Desktop: collapsible sidebar (hamburger toggle) + top bar with user menu
- Mobile: fixed bottom tab bar, no sidebar
- Breakpoint: `md` (768px)

### Feedback Patterns

- **Toast notifications** for async operations (save, create, delete). Auto-dismiss after 5 seconds.
- **Skeleton loaders** for data fetching states. Match the shape of the content they replace.
- **Empty states** with descriptive text and suggested actions.
- **Inline validation** errors for forms.

### Dashboard

Stat cards use colored backgrounds (indigo, orange, emerald) to visually separate them from action cards. Icons and colors match the Progress page for consistency.

## Implementation

### Timezone Handling

SQLite `CURRENT_TIMESTAMP` returns UTC without a `Z` suffix (e.g. `2026-03-09 22:31:00`). JavaScript's `new Date()` interprets this as local time, causing offset bugs. The `parseUTC()` utility in `lib/utils.ts` appends `Z` before parsing to force UTC interpretation. All date parsing of backend timestamps must use this function.

### Template Editor Dual Mode

Templates support graphical (drag-and-drop) and JSON editing. The two modes share state:

- Switching to JSON serializes the current rows using exercise names (not IDs) for readability.
- Switching back to graphical parses the JSON and resolves exercise names to IDs.
- Invalid JSON or unrecognized exercise names are surfaced as errors.

The JSON schema is intentionally user-friendly — exercise names instead of IDs — so templates can be authored externally (e.g. with an LLM). A "Copy Exercise Names" button exports the full exercise list to clipboard for this purpose.

### Workout Lifecycle

1. `POST /templates/:id/start` creates a workout with pre-populated sets from the template, including last-used weight/reps for progressive overload.
2. During the workout, `PUT /workouts/:id/sets/:setId` updates individual sets.
3. `PUT /workouts/:id/finish` marks the workout complete.
4. Stale workouts (unfinished for 24+ hours) are auto-closed with a 1-hour assumed duration when the workout list is queried.

### Progress Calculations

- **Volume**: `SUM(reps * weight)` across completed sets per workout.
- **Estimated 1RM**: Epley formula — `weight * (1 + reps / 30)`.
- **Streak**: Consecutive calendar days with at least one finished workout, checked backward from today (or yesterday if no workout today).
- **Heatmap**: `COUNT(*)` of finished workouts grouped by `date(started_at)` over the last 365 days.

### Authentication Flow

Access tokens (15 min) are stored in memory via AuthContext. Refresh tokens (7 days) are used to rotate access tokens. The API client automatically attaches the `Authorization: Bearer` header. On 401 responses, the user is logged out.

### Backend Data Shape

API responses from SQL JOINs return flat fields (e.g. `exercise_name`, `muscle_group`) rather than nested objects. Frontend code must read these flat fields directly — do not assume nested `exercise.name` patterns.

### Stale Workout Pruning

The `GET /workouts` endpoint runs a lightweight UPDATE before querying, closing any workout older than 24 hours with `finished_at` set to 1 hour after `started_at`. This prevents orphaned in-progress workouts from accumulating.

### API Response Cache

A client-side cache in `api/client.ts` makes page navigation near-instant by eliminating redundant network requests.

**How it works:**

- All `get()` calls go through a `Map`-based cache with a 30-second TTL.
- **Cache hit (fresh)**: Returns cached data synchronously as a resolved Promise — no network request.
- **Cache hit (stale)**: Returns stale data immediately, then refreshes in the background. Pages render instantly with current data; if the background fetch returns new data, the next navigation will reflect it.
- **Cache miss**: Fires a network request normally; subsequent calls within 30s are served from cache.
- **Deduplication**: Multiple components requesting the same endpoint simultaneously share a single in-flight request.
- **Error fallback**: On network errors, stale cached data is returned rather than throwing.

**Prefetching:**

On login and app load, `prefetchAll()` fires parallel `get()` calls for all commonly-visited endpoints (`/exercises`, `/templates`, `/workouts`, `/progress/summary`, `/nutrition/profile`, `/nutrition/log?days=30`, `/nutrition/charts`, `/foods/custom-meals`). By the time the user navigates to any page, the data is already cached.

**Cache invalidation:**

- `post()`, `put()`, and `del()` automatically invalidate all cached entries matching the parent path prefix *after* the mutation succeeds (e.g. `PUT /workouts/5` invalidates all `/workouts*` entries).
- `invalidateCache()` is exported for manual invalidation when a mutation affects unrelated endpoints (e.g. finishing a workout also invalidates `/progress`).
- Full cache is cleared on logout.

**Frontend loading guard pattern:**

Pages use `if (loading && !data)` instead of `if (loading)` for skeleton guards. This prevents a loading flash when cached data resolves instantly — skeletons only appear on truly cold loads (first visit after login).

### Database Layer (Drizzle ORM)

The backend uses **Drizzle ORM** for type-safe database access with incremental schema migrations.

**Dual export pattern** — `connection.ts` exports both:
- `db` (Drizzle instance) — used for standard CRUD: `db.select()`, `db.insert()`, `db.update()`, `db.delete()`
- `sqlite` (raw better-sqlite3) — used for complex aggregations, multi-table JOINs, and SQLite date functions that are hard to express in the query builder

**Schema as code** — All tables are defined in `db/schema.ts` using `sqliteTable()`. This file is the single source of truth; Drizzle Kit diffs it against the database to generate incremental `.sql` migration files.

**Migration workflow:**
1. Edit `backend/src/db/schema.ts`
2. `npm run db:generate` — generates a timestamped `.sql` file in `backend/drizzle/`
3. `npm run db:migrate` — applies pending migrations
4. Migrations run automatically on app startup

This replaces the previous raw `CREATE TABLE IF NOT EXISTS` approach, which couldn't handle column additions, renames, or other schema changes without recreating the database.
