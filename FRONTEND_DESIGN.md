# Frontend Design

Technical reference for the LiftHub React frontend. Covers architecture, conventions, and patterns.

## Project Structure

```
frontend/src/
  api/
    client.ts          # HTTP client, response cache, token management
  components/
    layout/
      AppLayout.tsx    # Shell: sidebar (desktop), bottom nav (mobile), timer pill
    ui/                # 11 reusable primitives (see Component System)
    FoodSearchModal.tsx
    PWAInstallPrompt.tsx
  contexts/
    AuthContext.tsx     # JWT auth state, login/register/logout
    ThemeContext.tsx    # Light/dark/system theme
    TimerContext.tsx    # Rest timer (absolute end-time, epoch-based)
    ToastContext.tsx    # Toast notification queue
  hooks/
    useFetch.ts        # Data-fetching hook wrapping get()
  lib/
    haptics.ts         # Haptic feedback (Vibration API + iOS fallback)
    navigation.ts      # Section nav item definitions
    utils.ts           # cn(), parseUTC()
  pages/               # 16 route-level page components
  types/
    index.ts           # All shared TypeScript interfaces and type aliases
  App.tsx              # Route definitions, ProtectedRoute/PublicRoute guards
  main.tsx             # Provider tree, React root
  index.css            # CSS variables, base classes, animations
```

## Dependencies

| Library | Purpose |
|---|---|
| react 18 / react-dom 18 | UI framework |
| react-router-dom 6 | Client-side routing |
| tailwindcss 3 | Utility-first CSS |
| lucide-react | Icon set (tree-shakeable SVGs) |
| recharts | Charts (nutrition progress, workout stats) |
| @dnd-kit/core + sortable | Drag-and-drop in template editor |
| browser-haptic | Haptic feedback with iOS Safari fallback |
| web-wasm-barcode-reader | WASM barcode scanner for food lookup |
| vite 6 | Build tool and dev server |
| vite-plugin-pwa | Service worker generation (Workbox) |

## State Management

No global store (Redux, Zustand, etc.). State is split across four layers:

1. **React Context** for cross-cutting concerns: auth, theme, timer, toasts. Each context has a provider in `main.tsx` and a `useX()` hook that throws if called outside the provider.

2. **API response cache** in `client.ts`. A `Map<string, { data, ts }>` with 30s TTL. Provides stale-while-revalidate semantics. Pages get cached data synchronously on navigation; background refresh fires if stale.

3. **`useFetch` hook** for page-level data. Returns `{ data, loading, error, refetch }`. Wraps `get()` from the API client. Supports `null` path to disable fetching.

4. **Local `useState`** for UI state: form inputs, modal open/close, selected tabs, etc.

### Provider Tree (ordering matters)

```
StrictMode > BrowserRouter > ThemeProvider > AuthProvider > TimerProvider > ToastProvider > App
```

ThemeProvider is outermost (no auth dependency). AuthProvider depends on router for redirects. TimerProvider is above ToastProvider so timer callbacks can trigger toasts.

## Routing

All routes defined in `App.tsx`. Two route guards:

- **ProtectedRoute**: Renders children only if `useAuth().user` exists. Redirects to `/login` otherwise. Shows a spinner during the initial auth check.
- **PublicRoute**: Redirects authenticated users to `/`. Used on `/login` and `/register`.

Protected routes are nested under a single `<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>` so the layout shell renders once.

Routes:
```
/              Dashboard
/exercises     Exercises (section nav: Templates | Exercises | Stats)
/templates     Templates
/templates/:id TemplateEditor
/workout/:id   ActiveWorkout
/stats         Stats
/nutrition     NutritionDashboard (section nav: Summary | Food Log | Custom Meals | Progress)
/nutrition/*   NutritionOnboarding, FoodLog, CustomMeals, NutritionCharts
/settings      Settings
```

Catch-all `*` redirects to `/`.

## Component System

### UI Primitives (`components/ui/`)

All primitives accept a `className` prop for composition via Tailwind. No internal margin — the consumer controls spacing.

| Component | Notes |
|---|---|
| **Button** | Polymorphic (`as` prop). Variants: `primary`, `secondary`, `danger`, `outline`. Sizes: `sm`, `md`, `lg`. Supports `loading` (shows spinner), `leftIcon`, `rightIcon`. Uses `forwardRef`. |
| **Card** | Container with optional `header` (string or ReactNode) and `footer` slots. Rounded border, shadow. |
| **Modal** | Portal-rendered. Focus trap, Escape-to-close, overlay click-to-close. Props: `open`, `onClose`, `title`, `footer`, `maxWidth`. Locks body scroll. |
| **Badge** | Inline label. Variants: `default`, `success`, `warning`, `danger`, `info`. |
| **Skeleton** | Loading placeholders. Exports: `Skeleton` (base), `SkeletonText`, `SkeletonRect`, `SkeletonCircle`. |
| **EmptyState** | Icon + title + description + action CTA. Used when lists are empty. |
| **SectionNav** | Horizontal pill-style nav using `NavLink` (active = brand-600 bg). Drives sub-page routing for Workouts and Nutrition sections. |
| **Tabs** | Accessible tab strip with `role="tablist"`, arrow key navigation, `aria-selected`. Companion `TabPanel` renders content conditionally. |
| **Input** | Extends native `<input>` with label, error message, optional icon. |
| **Select** | Extends native `<select>` with label and error message. |
| **PasswordInput** | Input with show/hide toggle. |

### Layout Component

`AppLayout.tsx` is the shell for all protected routes. Renders `<Outlet />` from react-router.

- **Desktop (md+):** Collapsible sidebar (hamburger toggle) with icon+label nav items. User menu in sidebar footer.
- **Mobile (<md):** Fixed bottom tab bar (5 items: Dashboard, Workouts, Nutrition, Settings, plus a context-dependent 5th). No sidebar.
- **Rest timer pill:** When a timer is active, a sticky pill appears at the bottom of the viewport. Clicking it navigates to the active workout. The X button stops the timer (uses `stopPropagation` to prevent navigation).

### CSS Base Classes

Defined in `index.css` via `@layer components`:

- `.card` — `rounded-xl border bg-[var(--color-bg)] p-4 shadow-sm`
- `.card-secondary` — same but with `bg-secondary`
- `.input-field` — standard form input styling with focus ring

These are used directly or extended by the UI primitives.

## Styling and Theming

### Approach

Tailwind CSS utility classes applied directly in JSX. No CSS modules, no styled-components. CSS custom properties handle theming so dark mode changes propagate without JS re-renders.

### Color System

**Semantic CSS variables** (7 tokens, defined in `:root` and `.dark`):

| Variable | Light | Dark | Usage |
|---|---|---|---|
| `--color-bg` | #ffffff | #0a0a0a | Primary background |
| `--color-bg-secondary` | #f9fafb | #141414 | Card/section backgrounds |
| `--color-bg-tertiary` | #f3f4f6 | #1f1f1f | Hover states, muted fills |
| `--color-border` | #e5e7eb | #262626 | All borders (global default via `* { border-color }`) |
| `--color-text` | #111827 | #f5f5f5 | Primary text |
| `--color-text-secondary` | #6b7280 | #a3a3a3 | Labels, descriptions |
| `--color-text-tertiary` | #9ca3af | #737373 | Placeholders, disabled |

**Brand color scale** (Tailwind `brand-*`, indigo-based):

`brand-50` through `brand-950`. Primary accent is `brand-500` (#6366f1) / `brand-600` (#4f46e5). Used for buttons, active states, focus rings, links.

**Semantic status colors** (raw Tailwind, not abstracted):

- Success: `emerald-500/600`
- Warning: `amber-500/600`
- Error: `red-500/600`
- Info: `blue-500` or `brand-500`

### Dark Mode

Controlled by `ThemeContext`. Three modes: `light`, `dark`, `system`. Persisted to `localStorage`. The `resolvedTheme` value applies `.dark` class to `<html>`. When `system` is selected, a `matchMedia` listener keeps the theme in sync with OS preference.

### Typography

Font stack: Inter (Google Fonts import), system fallbacks. Monospace: JetBrains Mono. All text sizing via Tailwind (`text-xs` through `text-base`; `text-lg`+ is rare). Font weights: 300-700.

### Animations

Defined in `index.css`:
- `animate-slide-in` — toast entrance (translateX 100% to 0, 250ms ease-out)
- `animate-pulse` — skeleton shimmer (Tailwind built-in)
- `animate-spin` — loading spinners (Tailwind built-in)

Theme transitions: `html { transition: color-scheme 0.3s }` for smooth dark/light swap.

### Scrollbar Hiding

`.scrollbar-hide` utility hides scrollbars on horizontal-scroll navs (SectionNav). Cross-browser: `-ms-overflow-style`, `scrollbar-width`, `::-webkit-scrollbar`.

## API Client and Caching

### Architecture (`api/client.ts`)

Single-file HTTP client. No Axios or other libraries — raw `fetch`.

**Token management:** Access token and refresh token stored in `localStorage` and mirrored in module-scoped variables for synchronous access. `setTokens()`, `clearTokens()`, `getAccessToken()` exported.

**Auto-refresh:** On 401 response, attempts `POST /auth/refresh` with the refresh token. If successful, retries the original request. If not, calls `onAuthError` (which triggers logout in AuthContext).

**Base function:** `api<T>(path, options)` handles headers, auth, refresh, error parsing. All responses are typed via generics.

### Response Cache

```
Map<string, { data: unknown; ts: number }>
```

- **TTL:** 30 seconds
- **Stale-while-revalidate:** Returns stale data immediately, fires background refresh
- **Deduplication:** `inflight` Map prevents parallel requests to the same endpoint
- **Error fallback:** Returns stale cache on network error

### Mutation Invalidation

`post()`, `put()`, `del()` strip the last path segment and invalidate all cache entries matching that prefix. Example: `PUT /workouts/5/sets/3` invalidates all keys starting with `/workouts/5/sets`.

For cases where prefix invalidation is insufficient (e.g., finishing a workout should also invalidate `/progress`), pages call `invalidateCache()` explicitly.

### Prefetching

`prefetchAll()` fires on login and app load. Targets 9 endpoints: `/exercises`, `/templates`, `/workouts`, `/progress/summary`, `/nutrition/profile`, `/nutrition/log?days=30`, `/nutrition/charts`, `/foods`, `/foods/custom-meals`. All fire-and-forget.

## Data Fetching Hook

`useFetch<T>(path: string | null)` returns `{ data, loading, error, refetch }`.

- Calls `get()` from the API client (so it participates in caching).
- Passing `null` disables the fetch (resets state to null/false/null).
- `refetch()` re-invokes the fetch with the current path.
- Dependencies: `[path, fetchData]`. `fetchData` is stable via `useCallback([], [])`.

### Loading Guard Pattern

Pages use `if (loading && !data)` instead of `if (loading)` for skeleton gates. Because the cache resolves synchronously, `data` is often non-null even when `loading` is briefly true. This prevents skeleton flashes on cached navigations.

## Contexts

### AuthContext

Provides: `user`, `loading`, `login()`, `register()`, `logout()`.

- `login`/`register` call API, store tokens, set user, trigger `prefetchAll()`.
- `logout` clears tokens, clears cache, nulls user.
- On mount, checks for existing access token and calls `GET /auth/me`. If valid, sets user and prefetches.
- Registers `onAuthError` callback with the API client for automatic logout on refresh failure.

### ThemeContext

Provides: `theme` (light/dark/system), `resolvedTheme` (light/dark), `setTheme()`.

- Persists to `localStorage` key `theme`.
- Applies/removes `.dark` class on `document.documentElement`.
- When `system`, adds a `matchMedia('prefers-color-scheme: dark')` change listener.

### TimerContext

Provides: `seconds`, `isRunning`, `exerciseName`, `workoutId`, `startTimer()`, `stopTimer()`.

Uses absolute-time architecture to avoid setInterval drift and PWA backgrounding issues:

- `startTimer(duration, name?, workoutId?)` stores `endTime = Date.now() + duration * 1000` in a ref. Increments an epoch counter to force the timer effect to restart.
- Main effect (keyed on `[epoch, isRunning]`) ticks every 250ms, computing `remaining = ceil((endTime - now) / 1000)`. When remaining hits 0, plays a triple-beep via Web Audio API and sends a browser notification.
- A `visibilitychange` listener recalculates remaining time when the PWA resumes from background.
- `workoutId` enables the timer pill in AppLayout to navigate directly to the active workout on click.

### ToastContext

Provides: `toast(message, variant?)`.

- Variants: `success` (default), `error`, `info`. Each has an icon (lucide-react) and border color.
- Auto-dismiss after 3500ms. Manual dismiss via X button.
- Rendered as a fixed overlay at `bottom-20 right-4` (above mobile nav) via a portal-less approach (rendered inside the provider).
- Uses a module-scoped incrementing counter for stable toast IDs.

## Type System

All shared types in `types/index.ts`. Key patterns:

- **Domain entities** match the backend schema: `User`, `Exercise`, `Template`, `Workout`, `WorkoutSet`, `Food`, `FoodLogEntry`, `NutritionProfile`, `CustomMeal`, `WeightEntry`.
- **Union string types** for enums: `MuscleGroup` (13 values), `Equipment` (8 values), `SetType` (4 values), `MealType` (4 values), `ActivityLevel` (5 values), `NutritionGoal` (3 values).
- **Nullable ownership:** `Exercise.user_id` and `Food.user_id` are `number | null`. Null = built-in/seed data. Non-null = user-created (custom). The UI shows a "Custom" badge when `user_id !== null`.
- **Composed types:** `WorkoutDetail extends Workout` adds `sets: WorkoutSet[]`. `TemplateExercise` nests optional `exercise?: Exercise`.
- **API error shape:** `ApiError { error: string; details?: string }`.
- **`RepScheme`:** `number | string` to support both fixed reps and ranges ("8-12", "AMRAP", "to_failure").

## Navigation

### Section Navigation

Two section nav definitions in `lib/navigation.ts`:
- `workoutNavItems`: Templates, Exercises, Stats (with lucide icons)
- `nutritionNavItems`: Summary, Food Log, Custom Meals, Progress

These are passed to `<SectionNav items={...} />` on their respective pages. SectionNav uses `react-router-dom`'s `NavLink` with active styling.

### Layout Navigation

`AppLayout.tsx` defines its own navigation items (not shared with section navs):

- **Desktop sidebar:** Dashboard, Workouts (links to /templates), Nutrition, Settings. Workout and Nutrition have expandable sub-items.
- **Mobile bottom nav:** Dashboard, Workouts (/templates), Nutrition, Settings (4 items).

### Active State

NavLink `isActive` drives styling. Desktop sidebar items get `bg-brand-600/10 text-brand-600`. Mobile nav items get `text-brand-500`. SectionNav pills get `bg-brand-600 text-white`.

## Haptic Feedback

`lib/haptics.ts` wraps the `browser-haptic` library:

- `hapticLight()` — light tap (UI selections)
- `hapticMedium()` — medium tap (confirmations)
- `hapticSuccess()` — success pattern (completed actions)

Platform behavior:
- Android: Vibration API (`navigator.vibrate`)
- iOS Safari 17.4+: Hidden `<input type="checkbox" switch>` toggle (WebKit haptic hack)
- Desktop: no-op

Wired into 17 user actions across 10 files: save, delete, complete set, finish workout, log food, create exercise, create template, log weight, complete onboarding.

## PWA Configuration

### Vite Plugin

`vite-plugin-pwa` with `registerType: 'autoUpdate'`. Uses external `public/manifest.json` (not inline manifest). Workbox glob pattern: `**/*.{js,css,html,ico,png,svg,woff2}`.

### Service Worker

Auto-generated by Workbox. Precaches all build output. Auto-updates on new deployments (no user prompt).

### Static Assets

WASM barcode scanner files (`a.out.js`, `a.out.wasm`) are copied to the build output root via `vite-plugin-static-copy`.

## Utility Functions

### `cn(...classes)` (`lib/utils.ts`)

Concatenates class names, filtering out falsy values. Lightweight alternative to clsx (no tailwind-merge — relies on Tailwind's last-wins specificity).

```ts
cn('px-4', isActive && 'bg-brand-500', className)
```

### `parseUTC(dateStr)` (`lib/utils.ts`)

Converts SQLite timestamps (e.g., `"2026-03-09 22:31:00"`) to proper UTC Date objects by appending `Z`. Without this, `new Date()` interprets the string as local time. All backend timestamp parsing must use this function.

## Conventions

### File Organization

- One page component per file in `pages/`. Pages are the only components that call `useFetch`.
- Reusable UI primitives in `components/ui/`. Domain-specific shared components in `components/` root.
- All types in a single `types/index.ts` file.
- Contexts export both a Provider and a `useX()` hook. The hook throws if used outside the provider.

### Component Patterns

- **Controlled modals:** All modals use `open`/`onClose` props. Parent owns the boolean state.
- **Confirmation pattern:** Destructive actions (delete) show a Modal with explicit confirm button. The confirm handler calls the API, shows a toast, triggers haptic feedback, and refetches.
- **Loading states:** `if (loading && !data) return <Skeleton />`. Never show skeleton when cached data is available.
- **Empty states:** `if (!loading && data?.length === 0) return <EmptyState />`.
- **Error handling:** Mutations wrapped in try/catch. Catch block calls `toast(message, 'error')`.

### Import Aliases

`@/` maps to `frontend/src/` via both Vite's `resolve.alias` and TypeScript's `paths`. All internal imports use `@/` — never relative paths beyond `./`.

### No Prop Drilling

Cross-cutting state (auth, theme, timer, toasts) is consumed via context hooks. Page-level data stays local. No prop drilling beyond one level (parent to immediate child).

### Mutation Flow

Standard pattern for user actions:

```
1. Call API (post/put/del)
2. On success: toast('Success message'), hapticSuccess(), refetch()
3. On error: toast(error.message, 'error')
4. Close modal / reset form state
```

Some mutations require explicit `invalidateCache()` calls when the automatic prefix invalidation doesn't cover affected endpoints (e.g., completing a set invalidates the workout detail cache).
