import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, History as HistoryIcon, TrendingUp, Flame, CalendarDays } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import { parseUTC } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ProgressSummary, Workout } from '@/types';

const statConfig = [
  {
    key: 'total_workouts',
    label: 'Total Workouts',
    icon: TrendingUp,
    cardBg: 'bg-indigo-500/10 border-indigo-500/20',
    iconBg: 'bg-indigo-500/20',
    iconColor: 'text-indigo-500',
    valueColor: 'text-indigo-600 dark:text-indigo-400',
    valueSuffix: '',
  },
  {
    key: 'current_streak',
    label: 'Current Streak',
    icon: Flame,
    cardBg: 'bg-orange-500/10 border-orange-500/20',
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-500',
    valueColor: 'text-orange-600 dark:text-orange-400',
    valueSuffix: ' days',
  },
  {
    key: 'this_week',
    label: 'This Week',
    icon: CalendarDays,
    cardBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-500',
    valueColor: 'text-emerald-600 dark:text-emerald-400',
    valueSuffix: '',
  },
] as const;

export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, loading: summaryLoading } = useFetch<ProgressSummary>('/progress/summary');
  const { data: workouts, loading: workoutsLoading } = useFetch<Workout[]>('/workouts');

  const recentWorkouts = useMemo(() => {
    if (!workouts) return [];
    return workouts.slice(0, 5).map((w) => {
      const start = parseUTC(w.started_at);
      const end = w.finished_at ? parseUTC(w.finished_at) : null;
      const durationMin = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;

      const now = new Date();
      const diffDays = Math.floor((now.getTime() - start.getTime()) / 86400000);
      let dateLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (diffDays === 0) dateLabel = 'Today';
      else if (diffDays === 1) dateLabel = 'Yesterday';
      else if (diffDays < 7) dateLabel = `${diffDays} days ago`;

      return {
        id: w.id,
        name: w.name || 'Quick Workout',
        date: dateLabel,
        duration: durationMin ? `${durationMin} min` : 'In progress',
      };
    });
  }, [workouts]);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          Hey, {user?.username ?? 'there'} 👋
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Ready to train?
        </p>
      </div>

      {/* Stats — prominent colored cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-10" />
                  </div>
                </div>
              </Card>
            ))
          : statConfig.map((s) => {
              const value = summary ? (summary as unknown as Record<string, number>)[s.key] : null;
              return (
                <div
                  key={s.key}
                  className={`rounded-xl border p-5 ${s.cardBg}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.iconBg}`}>
                      <s.icon className={`h-6 w-6 ${s.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--color-text-secondary)]">{s.label}</p>
                      <p className={`text-3xl font-bold ${s.valueColor}`}>
                        {value != null ? `${value}${s.valueSuffix}` : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link to="/templates">
          <Card className="flex items-center gap-4 hover:border-brand-500/50 transition-colors cursor-pointer">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600">
              <PlayCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text)]">Start Workout</p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Pick a template and go
              </p>
            </div>
          </Card>
        </Link>

        <Link to="/history">
          <Card className="flex items-center gap-4 hover:border-brand-500/50 transition-colors cursor-pointer">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600">
              <HistoryIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text)]">View History</p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                See past workouts
              </p>
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent workouts */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Recent Workouts
        </h2>
        <div className="space-y-2">
          {workoutsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-1 h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-12" />
              </Card>
            ))
          ) : recentWorkouts.length === 0 ? (
            <Card className="text-center py-6">
              <p className="text-sm text-[var(--color-text-secondary)]">No workouts yet. Start your first one!</p>
            </Card>
          ) : (
            recentWorkouts.map((w) => (
              <Link key={w.id} to={`/history`}>
                <Card className="flex items-center justify-between hover:border-brand-500/50 transition-colors cursor-pointer">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">{w.name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{w.date}</p>
                  </div>
                  <span className="text-sm text-[var(--color-text-secondary)]">{w.duration}</span>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
