import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Trophy, Flame, TrendingUp, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFetch } from '@/hooks/useFetch';
import type { ProgressSummary, ProgressDataPoint, Exercise } from '@/types';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function WorkoutHeatmap({ workouts }: { workouts: { date: string }[] }) {
  const today = useMemo(() => new Date(), []);
  const weeksToShow = 20;
  const totalDays = weeksToShow * 7;

  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of workouts) {
      const d = w.date.slice(0, 10);
      map.set(d, (map.get(d) || 0) + 1);
    }
    return map;
  }, [workouts]);

  const cells = useMemo(() => {
    const result: { key: string; count: number }[] = [];
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ key, count: countMap.get(key) || 0 });
    }
    return result;
  }, [countMap, totalDays, today]);

  function getColor(count: number): string {
    if (count === 0) return 'bg-[var(--color-bg-tertiary)]';
    if (count === 1) return 'bg-brand-300';
    if (count === 2) return 'bg-brand-500';
    return 'bg-brand-700';
  }

  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px] w-full">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px] flex-1">
            {week.map((cell) => (
              <div
                key={cell.key}
                className={cn('aspect-square w-full rounded-sm', getColor(cell.count))}
                title={`${cell.key}: ${cell.count} workout${cell.count !== 1 ? 's' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tooltip style ────────────────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  fontSize: '12px',
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Progress() {
  const { data: summary, loading: summaryLoading } = useFetch<ProgressSummary>('/progress/summary');
  const { data: exercises } = useFetch<Exercise[]>('/exercises');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');

  const exercisePath = selectedExerciseId ? `/progress/exercise/${selectedExerciseId}` : null;
  const { data: exerciseProgress, loading: progressLoading } = useFetch<ProgressDataPoint[]>(exercisePath);

  const exerciseOptions = useMemo(
    () => (exercises ?? []).map((ex) => ({ value: String(ex.id), label: ex.name })),
    [exercises],
  );

  const chartData = useMemo(() => {
    if (!exerciseProgress) return [];
    return exerciseProgress.map((p) => ({
      date: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      '1RM': p.estimated_1rm,
      'Max Weight': p.max_weight,
      Volume: p.volume,
    }));
  }, [exerciseProgress]);

  const heatmapData = useMemo(() => {
    return summary?.heatmap ?? [];
  }, [summary]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Progress</h1>

      {/* Summary Cards */}
      {summaryLoading && !summary ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-10" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/15">
                <TrendingUp className="h-5 w-5 text-brand-400" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Total Workouts</p>
                <p className="text-2xl font-bold text-[var(--color-text)]">{summary.total_workouts}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/15">
                <Flame className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Current Streak</p>
                <p className="text-2xl font-bold text-[var(--color-text)]">{summary.current_streak} days</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/15">
                <CalendarDays className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">This Week</p>
                <p className="text-2xl font-bold text-[var(--color-text)]">{summary.this_week}</p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Heatmap */}
      <Card>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Workout Frequency</h2>
          <WorkoutHeatmap workouts={heatmapData} />
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
            <span>Less</span>
            <div className="h-3 w-3 rounded-sm bg-[var(--color-bg-tertiary)]" />
            <div className="h-3 w-3 rounded-sm bg-brand-300" />
            <div className="h-3 w-3 rounded-sm bg-brand-500" />
            <div className="h-3 w-3 rounded-sm bg-brand-700" />
            <span>More</span>
          </div>
        </div>
      </Card>

      {/* Exercise Progress */}
      <Card>
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Exercise Progress</h2>

          <Select
            label="Select Exercise"
            options={exerciseOptions}
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            placeholder="Choose an exercise..."
          />

          {selectedExerciseId && progressLoading && (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-[var(--color-text-secondary)]">Loading chart data...</p>
            </div>
          )}

          {selectedExerciseId && !progressLoading && chartData.length === 0 && (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-[var(--color-text-tertiary)]">No data for this exercise yet</p>
            </div>
          )}

          {chartData.length > 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">Estimated 1RM</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="1RM" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">Max Weight</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="Max Weight" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">Total Volume</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Line type="monotone" dataKey="Volume" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Personal Records */}
      {summary && summary.personal_records.length > 0 && (
        <Card>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Personal Records</h2>
            </div>
            <div className="space-y-2">
              {summary.personal_records.map((pr, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{pr.exercise_name}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      {new Date(pr.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-brand-400">{pr.weight} lbs</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
