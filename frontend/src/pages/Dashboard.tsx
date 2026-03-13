import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlayCircle,
  Apple,
  TrendingUp,
  Flame,
  Dumbbell,
  UtensilsCrossed,
  Zap,
  Target,
  Scale,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import { get } from '@/api/client';
import { parseUTC } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ProgressSummary, Workout, DailySummary } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RecentFoodEntry {
  id: number;
  date: string;
  meal_type: string;
  calories: number;
  protein_g: number;
  food_name: string | null;
  logged_at: string;
}

interface ActivityItem {
  id: string;
  type: 'workout' | 'food';
  title: string;
  detail: string;
  time: Date;
  timeLabel: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, loading: summaryLoading } = useFetch<ProgressSummary>('/progress/summary');
  const { data: workouts, loading: workoutsLoading } = useFetch<Workout[]>('/workouts');

  const [todayNutrition, setTodayNutrition] = useState<DailySummary | null>(null);
  const [recentFood, setRecentFood] = useState<RecentFoodEntry[]>([]);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [showWeighInReminder, setShowWeighInReminder] = useState(false);
  const navigate = useNavigate();

  // Detect active (unfinished) workout
  const activeWorkout = useMemo(() => {
    if (!workouts) return null;
    return workouts.find((w) => !w.finished_at) ?? null;
  }, [workouts]);

  useEffect(() => {
    let cancelled = false;
    setNutritionLoading(true);
    Promise.all([
      get<DailySummary>(`/nutrition/daily?date=${todayStr()}`).catch(() => null),
      get<RecentFoodEntry[]>('/nutrition/recent?limit=15').catch(() => []),
      get<{ date: string; weight_lbs: number }[]>('/nutrition/weight-log?days=7').catch(() => null),
    ]).then(([daily, recent, weightEntries]) => {
      if (cancelled) return;
      setTodayNutrition(daily);
      setRecentFood(recent);
      if (weightEntries !== null && weightEntries.length === 0) {
        setShowWeighInReminder(true);
      }
    }).finally(() => {
      if (!cancelled) setNutritionLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Build unified activity feed
  const activity = useMemo(() => {
    const items: ActivityItem[] = [];

    // Add workouts
    if (workouts) {
      for (const w of workouts.slice(0, 15)) {
        const start = parseUTC(w.started_at);
        const end = w.finished_at ? parseUTC(w.finished_at) : null;
        const durationMin = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;

        items.push({
          id: `w-${w.id}`,
          type: 'workout',
          title: w.name || 'Quick Workout',
          detail: end
          ? (durationMin! < 1 ? '< 1 min' : `${durationMin} min`)
          : 'In progress',
          time: start,
          timeLabel: relativeTime(start),
        });
      }
    }

    // Add food entries
    for (const f of recentFood) {
      const time = parseUTC(f.logged_at);
      items.push({
        id: `f-${f.id}`,
        type: 'food',
        title: f.food_name ?? 'Food logged',
        detail: `${Math.round(f.calories)} cal · ${MEAL_LABELS[f.meal_type] ?? f.meal_type}`,
        time,
        timeLabel: relativeTime(time),
      });
    }

    // Sort by time descending, take top 15
    items.sort((a, b) => b.time.getTime() - a.time.getTime());
    return items.slice(0, 15);
  }, [workouts, recentFood]);

  const hasData = summary || workouts || todayNutrition;
  const loading = !hasData && (summaryLoading || workoutsLoading || nutritionLoading);

  const todayCalories = todayNutrition?.totals?.calories ?? 0;
  const todayProtein = todayNutrition?.totals?.protein_g ?? 0;
  const calorieTarget = todayNutrition?.targets?.calories ?? null;
  const proteinTarget = todayNutrition?.targets?.protein_g ?? null;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          Hey, {user?.username ?? 'there'} 👋
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Here's your snapshot for today.
        </p>
      </div>

      {/* Weigh-in reminder */}
      {showWeighInReminder && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            <Scale className="h-4 w-4 shrink-0" />
            <span>
              Time for your weigh-in!{' '}
              <Link to="/nutrition/progress" className="font-semibold underline underline-offset-2 hover:no-underline">
                Let's check your progress →
              </Link>
            </span>
          </div>
          <button
            onClick={() => setShowWeighInReminder(false)}
            className="ml-2 rounded p-0.5 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Active workout banner */}
      {activeWorkout && (
        <button
          onClick={() => navigate(`/workout/${activeWorkout.id}`)}
          className="w-full flex items-center justify-between rounded-lg border border-brand-500/50 bg-brand-500/10 px-4 py-3 transition-colors hover:bg-brand-500/20"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-brand-600 dark:text-brand-400">
            <Dumbbell className="h-4 w-4 shrink-0 animate-pulse" />
            <span>You have an active workout: <strong>{activeWorkout.name}</strong></span>
          </div>
          <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
            Resume →
          </span>
        </button>
      )}

      {/* Stats — 2x2 grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-12" />
              </div>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              label="Total Workouts"
              value={summary?.total_workouts ?? 0}
              icon={TrendingUp}
              color="indigo"
            />
            <StatCard
              label="Current Streak"
              value={summary?.current_streak ?? 0}
              suffix=" days"
              icon={Flame}
              color="orange"
            />
            <StatCard
              label="Calories Today"
              value={Math.round(todayCalories)}
              suffix={calorieTarget ? ` / ${calorieTarget}` : ''}
              icon={Zap}
              color="emerald"
            />
            <StatCard
              label="Protein Today"
              value={Math.round(todayProtein)}
              suffix={proteinTarget ? `g / ${Math.round(proteinTarget)}g` : 'g'}
              icon={Target}
              color="purple"
            />
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link to={activeWorkout ? `/workout/${activeWorkout.id}` : '/templates'}>
          <Card className="flex items-center gap-4 hover:border-brand-500/50 transition-colors cursor-pointer">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600">
              {activeWorkout ? <Dumbbell className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text)]">
                {activeWorkout ? 'Resume Workout' : 'Start Workout'}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {activeWorkout ? activeWorkout.name : 'Pick a template and go'}
              </p>
            </div>
          </Card>
        </Link>
        <Link to="/nutrition">
          <Card className="flex items-center gap-4 hover:border-brand-500/50 transition-colors cursor-pointer">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Apple className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text)]">Log Calories</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Track your meals today</p>
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent Activity — GitHub commit style */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Recent Activity
        </h2>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activity.length === 0 ? (
          <Card className="py-8 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              No activity yet. Start a workout or log some food!
            </p>
          </Card>
        ) : (
          <div className="relative ml-4 border-l-2 border-[var(--color-border)]">
            {activity.map((item, i) => (
              <div key={item.id} className={`relative pb-6 pl-6 ${i === activity.length - 1 ? 'pb-0' : ''}`}>
                {/* Dot on timeline */}
                <div
                  className={`absolute -left-[9px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-[var(--color-bg)] ${
                    item.type === 'workout'
                      ? 'bg-indigo-500'
                      : 'bg-emerald-500'
                  }`}
                >
                  {item.type === 'workout' ? (
                    <Dumbbell className="h-2 w-2 text-white" />
                  ) : (
                    <UtensilsCrossed className="h-2 w-2 text-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {item.title}
                    </p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      {item.detail}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium text-[var(--color-text-tertiary)]">
                    {item.timeLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

const colorMap = {
  indigo: {
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    icon: 'bg-indigo-500/20 text-indigo-500',
    value: 'text-indigo-600 dark:text-indigo-400',
  },
  orange: {
    bg: 'bg-orange-500/10 border-orange-500/20',
    icon: 'bg-orange-500/20 text-orange-500',
    value: 'text-orange-600 dark:text-orange-400',
  },
  emerald: {
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: 'bg-emerald-500/20 text-emerald-500',
    value: 'text-emerald-600 dark:text-emerald-400',
  },
  purple: {
    bg: 'bg-purple-500/10 border-purple-500/20',
    icon: 'bg-purple-500/20 text-purple-500',
    value: 'text-purple-600 dark:text-purple-400',
  },
} as const;

function StatCard({
  label,
  value,
  suffix = '',
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: typeof TrendingUp;
  color: keyof typeof colorMap;
}) {
  const c = colorMap[color];
  return (
    <div className={`rounded-xl border p-4 ${c.bg}`}>
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${c.icon}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </p>
      <p className={`text-xl font-bold ${c.value}`}>
        {value}{suffix}
      </p>
    </div>
  );
}
