import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, Dumbbell } from 'lucide-react';
import { cn, parseUTC } from '@/lib/utils';
import { useFetch } from '@/hooks/useFetch';
import type { Workout } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

function formatDate(dateStr: string): string {
  return parseUTC(dateStr).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'In progress';
  const ms = parseUTC(end).getTime() - parseUTC(start).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const tabItems = [
  { label: 'List', value: 'list' },
  { label: 'Calendar', value: 'calendar' },
];

export default function History() {
  const { data: workouts, loading, error } = useFetch<Workout[]>('/workouts');
  const [view, setView] = useState('list');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const workoutDates = useMemo(() => {
    if (!workouts) return new Set<string>();
    return new Set(
      workouts.map((w) => {
        const d = parseUTC(w.started_at);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }),
    );
  }, [workouts]);

  const calendarGrid = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [calendarDate]);

  const selectedDayWorkouts = useMemo(() => {
    if (!selectedDay || !workouts) return [];
    return workouts.filter((w) => isSameDay(parseUTC(w.started_at), selectedDay));
  }, [selectedDay, workouts]);

  const sortedWorkouts = useMemo(() => {
    if (!workouts) return [];
    return [...workouts].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    );
  }, [workouts]);

  function prevMonth() {
    setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    setSelectedDay(null);
  }

  function nextMonth() {
    setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    setSelectedDay(null);
  }

  if (loading && !workouts) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">History</h1>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">History</h1>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">History</h1>

      <Tabs tabs={tabItems} value={view} onChange={setView} />

      {/* List View */}
      <TabPanel value="list" activeValue={view}>
        <div className="space-y-3">
          {sortedWorkouts.length === 0 && (
            <EmptyState
              icon={<Dumbbell className="h-6 w-6" />}
              title="No workouts yet"
              description="Complete a workout to see it here"
            />
          )}

          {sortedWorkouts.map((w) => (
            <Card
              key={w.id}
              className="cursor-pointer transition-colors hover:border-brand-500/30"
              onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[var(--color-text)]">{w.name}</h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
                      <span>{formatDate(w.started_at)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(w.started_at, w.finished_at)}
                      </span>
                    </div>
                  </div>
                  {!w.finished_at && <Badge variant="info">Active</Badge>}
                </div>

                {expandedId === w.id && (
                  <div className="border-t border-[var(--color-border)] pt-3 text-sm text-[var(--color-text-secondary)]">
                    {w.notes ? (
                      <p>{w.notes}</p>
                    ) : (
                      <p className="text-[var(--color-text-tertiary)]">No additional details available.</p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </TabPanel>

      {/* Calendar View */}
      <TabPanel value="calendar" activeValue={view}>
        <div className="space-y-4">
          <Card>
            <div className="space-y-4">
              {/* Month navigation */}
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={prevMonth} leftIcon={<ChevronLeft className="h-4 w-4" />} />
                <h2 className="text-sm font-semibold text-[var(--color-text)]">
                  {calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </h2>
                <Button variant="outline" size="sm" onClick={nextMonth} leftIcon={<ChevronRight className="h-4 w-4" />} />
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-1 text-center text-xs font-medium text-[var(--color-text-tertiary)]">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-1">
                {calendarGrid.map((date, i) => {
                  if (!date) return <div key={`empty-${i}`} />;
                  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                  const hasWorkout = workoutDates.has(key);
                  const isSelected = selectedDay != null && isSameDay(date, selectedDay);
                  const isToday = isSameDay(date, new Date());

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDay(date)}
                      className={cn(
                        'relative flex h-10 items-center justify-center rounded-lg text-sm transition-colors',
                        isSelected
                          ? 'bg-brand-600 text-white'
                          : isToday
                            ? 'bg-[var(--color-bg-tertiary)] font-semibold text-[var(--color-text)]'
                            : 'text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]',
                      )}
                    >
                      {date.getDate()}
                      {hasWorkout && !isSelected && (
                        <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-brand-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Selected day workouts */}
          {selectedDay && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
                {formatDate(selectedDay.toISOString())}
              </h3>
              {selectedDayWorkouts.length === 0 ? (
                <p className="text-sm text-[var(--color-text-tertiary)]">No workouts on this day</p>
              ) : (
                selectedDayWorkouts.map((w) => (
                  <Card key={w.id}>
                    <div>
                      <h4 className="font-semibold text-[var(--color-text)]">{w.name}</h4>
                      <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(w.started_at, w.finished_at)}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </TabPanel>
    </div>
  );
}
