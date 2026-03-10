import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import type { DayLogSummary } from '@/types';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionNav } from '@/components/ui/SectionNav';
import { nutritionNavItems } from '@/lib/navigation';

function formatDayHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function FoodLog() {
  const { data, loading, error } = useFetch<DayLogSummary[]>('/nutrition/log?days=30');
  const navigate = useNavigate();

  const days = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => b.date.localeCompare(a.date));
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <div className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      {days.length === 0 ? (
        <EmptyState
          icon={<Utensils className="h-6 w-6" />}
          title="No food logged yet"
          description="Start logging meals to see your history here"
        />
      ) : (
        <div className="space-y-3">
          {days.map((day) => (
            <Card
              key={day.date}
              className="cursor-pointer transition-colors hover:border-brand-500/30"
              onClick={() => navigate(`/nutrition?date=${day.date}`)}
            >
              <div className="space-y-2">
                {/* Date header */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--color-text)]">
                    {formatDayHeader(day.date)}
                  </h3>
                  <span className="text-xs text-[var(--color-text-tertiary)]">
                    {day.entry_count} {day.entry_count === 1 ? 'entry' : 'entries'}
                  </span>
                </div>

                {/* Calorie summary */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-[var(--color-text)]">
                    {day.total_calories} cal
                  </span>
                  <span className="text-[var(--color-text-tertiary)]">logged</span>
                </div>

                {/* Macro breakdown */}
                <div className="flex gap-4 text-xs text-[var(--color-text-secondary)]">
                  <span>P: {day.total_protein}g</span>
                  <span>C: {day.total_carbs}g</span>
                  <span>F: {day.total_fat}g</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <>
      <SectionNav items={nutritionNavItems} />
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Food Log</h1>
    </>
  );
}
