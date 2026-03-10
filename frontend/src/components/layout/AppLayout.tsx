import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Dumbbell,
  ClipboardList,
  Apple,
  BarChart3,
  UtensilsCrossed,
  BookOpen,
  CalendarDays,
  Settings,
  LogOut,
  ChevronDown,
  X,
  Timer,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTimer } from '@/contexts/TimerContext';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

// ─── Navigation structure ─────────────────────────────────────────────────────

interface NavSection {
  label: string;
  icon: typeof LayoutDashboard;
  to: string; // default route for mobile tap
  matchPrefix?: string; // highlight mobile icon when path starts with this
  items: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }[];
}

const dashboardItem = { to: '/', label: 'Dashboard', icon: LayoutDashboard };

const sections: NavSection[] = [
  {
    label: 'Workouts',
    icon: Dumbbell,
    to: '/exercises',
    matchPrefix: '/workouts-section', // custom matching below
    items: [
      { to: '/exercises', label: 'Exercises', icon: Dumbbell },
      { to: '/templates', label: 'Templates', icon: ClipboardList },
      { to: '/stats', label: 'Stats', icon: CalendarDays },
    ],
  },
  {
    label: 'Nutrition',
    icon: Apple,
    to: '/nutrition',
    matchPrefix: '/nutrition',
    items: [
      { to: '/nutrition', label: 'Summary', icon: Apple, end: true },
      { to: '/nutrition/log', label: 'Food Log', icon: UtensilsCrossed },
      { to: '/nutrition/meals', label: 'Custom Meals', icon: BookOpen },
      { to: '/nutrition/progress', label: 'Progress', icon: BarChart3 },
    ],
  },
];

const workoutPaths = ['/exercises', '/templates', '/stats', '/workout'];
function isWorkoutPath(pathname: string) {
  return workoutPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}
function isNutritionPath(pathname: string) {
  return pathname.startsWith('/nutrition');
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="hidden sm:inline">{user?.username}</span>
        <ChevronDown className="h-4 w-4 text-[var(--color-text-secondary)]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-[var(--color-bg)] py-1 shadow-lg z-50">
          <button
            onClick={() => { navigate('/settings'); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            onClick={() => { logout(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

function RestTimerPill() {
  const { seconds, isRunning, exerciseName, stopTimer } = useTimer();

  if (!isRunning) return null;

  const urgent = seconds < 10;

  return (
    <div
      className={`fixed bottom-20 right-4 z-40 md:bottom-6 flex items-center gap-3 rounded-full border bg-[var(--color-bg)] px-4 py-2 shadow-lg ${
        urgent ? 'animate-pulse border-red-500' : 'border-brand-500'
      }`}
    >
      <Timer className={`h-4 w-4 ${urgent ? 'text-red-500' : 'text-brand-500'}`} />
      <div className="text-sm">
        <span className={`font-mono font-semibold ${urgent ? 'text-red-500' : 'text-[var(--color-text)]'}`}>
          {formatTime(seconds)}
        </span>
        {exerciseName && (
          <span className="ml-2 text-[var(--color-text-secondary)]">{exerciseName}</span>
        )}
      </div>
      <button
        onClick={stopTimer}
        className="rounded-full p-0.5 hover:bg-[var(--color-bg-secondary)] transition-colors"
      >
        <X className="h-4 w-4 text-[var(--color-text-secondary)]" />
      </button>
    </div>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={`hidden md:flex flex-col border-r bg-[var(--color-bg)] h-full transition-[width] duration-200 ${
        collapsed ? 'md:w-16' : 'md:w-56 lg:w-64'
      }`}
    >
      <div className="flex items-center px-3 py-3">
        <button
          onClick={onToggle}
          className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {/* Dashboard */}
        <NavLink
          to={dashboardItem.to}
          end
          title={dashboardItem.label}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive
                ? 'bg-brand-600/10 text-brand-600 dark:text-brand-400'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]'
            }`
          }
        >
          <dashboardItem.icon className="h-5 w-5 shrink-0" />
          {!collapsed && <span>{dashboardItem.label}</span>}
        </NavLink>

        {/* Grouped sections */}
        {sections.map((section) => (
          <div key={section.label} className="pt-3">
            {!collapsed && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                {section.label}
              </p>
            )}
            {collapsed && (
              <div className="mb-1 h-px bg-[var(--color-border)]" />
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-brand-600/10 text-brand-600 dark:text-brand-400'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]'
                  }`
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function MobileNav() {
  const { pathname } = useLocation();

  const mobileItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      isActive: pathname === '/',
    },
    {
      to: '/exercises',
      label: 'Workouts',
      icon: Dumbbell,
      isActive: isWorkoutPath(pathname),
    },
    {
      to: '/nutrition',
      label: 'Nutrition',
      icon: Apple,
      isActive: isNutritionPath(pathname),
    },
  ];

  return (
    <nav className="shrink-0 border-t bg-[var(--color-bg)] md:hidden">
      <div className="flex"
        style={{
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        {mobileItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={
              `flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors ${
                item.isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-[var(--color-text-tertiary)]'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--color-bg)]">
      {/* Top navbar */}
      <header
        className="flex h-14 shrink-0 items-center justify-between border-b bg-[var(--color-bg)] px-4"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', height: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
      >
        <img src="/logo_text.png" alt="LiftHub" className="h-8" />
        <UserMenu />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav />
      <RestTimerPill />
      <PWAInstallPrompt />
    </div>
  );
}
