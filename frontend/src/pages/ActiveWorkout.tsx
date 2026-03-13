import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Flag } from 'lucide-react';
import { cn, parseUTC } from '@/lib/utils';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { get, put, invalidateCache } from '@/api/client';
import { useTimer } from '@/contexts/TimerContext';
import type { WorkoutDetail, WorkoutSet } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface SetRow extends WorkoutSet {
  exercise_name?: string;
  inputWeight: string;
  inputReps: string;
  restSeconds: number | null;
}

export default function ActiveWorkout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { startTimer } = useTimer();

  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);

  // Fetch workout
  useEffect(() => {
    if (!id) return;
    if (!workout) setLoading(true);
    get<WorkoutDetail>(`/workouts/${id}`)
      .then((data) => {
        setWorkout(data);
        setSets(
          data.sets.map((s: WorkoutSet & { exercise_name?: string; rest_seconds?: number | null }) => ({
            ...s,
            exercise_name: s.exercise_name,
            inputWeight: s.weight != null ? String(s.weight) : '',
            inputReps: s.reps != null ? String(s.reps) : '',
            restSeconds: s.rest_seconds ?? null,
          })),
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load workout'))
      .finally(() => setLoading(false));
  }, [id]);

  // Elapsed timer
  useEffect(() => {
    if (!workout?.started_at) return;
    const startTime = parseUTC(workout.started_at).getTime();

    function tick() {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [workout?.started_at]);

  // Group sets by exercise
  const exerciseGroups = useMemo(() => {
    const groups: { exerciseId: number; exerciseName: string; sets: SetRow[] }[] = [];
    const map = new Map<number, SetRow[]>();
    const nameMap = new Map<number, string>();

    for (const s of sets) {
      if (!map.has(s.exercise_id)) {
        map.set(s.exercise_id, []);
        nameMap.set(s.exercise_id, s.exercise_name || s.exercise?.name || `Exercise ${s.exercise_id}`);
      }
      map.get(s.exercise_id)!.push(s);
    }

    for (const [exerciseId, groupSets] of map) {
      groups.push({
        exerciseId,
        exerciseName: nameMap.get(exerciseId)!,
        sets: groupSets,
      });
    }

    return groups;
  }, [sets]);

  function updateSetInput(setId: number, field: 'inputWeight' | 'inputReps', value: string) {
    setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, [field]: value } : s)));
  }

  async function completeSet(setRow: SetRow) {
    const weight = parseFloat(setRow.inputWeight) || null;
    const reps = parseInt(setRow.inputReps) || null;

    try {
      await put<WorkoutSet>(`/workouts/${id}/sets/${setRow.id}`, {
        completed: true,
        weight,
        reps,
      });
      // Invalidate the parent workout cache so navigating away/back shows fresh data
      invalidateCache(`/workouts/${id}`);
      invalidateCache('/workouts');

      setSets((prev) =>
        prev.map((s) =>
          s.id === setRow.id ? { ...s, completed: true, weight, reps } : s,
        ),
      );
      hapticLight();

      // Start rest timer if there are more incomplete sets for this exercise
      const exerciseSets = sets.filter((s) => s.exercise_id === setRow.exercise_id);
      const hasMoreSets = exerciseSets.some((s) => s.id !== setRow.id && !s.completed);
      const exerciseName = setRow.exercise_name || setRow.exercise?.name;
      if (hasMoreSets && setRow.restSeconds) {
        startTimer(setRow.restSeconds, exerciseName, Number(id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update set');
    }
  }

  async function finishWorkout() {
    setFinishing(true);
    try {
      await put(`/workouts/${id}`, { finished: true });
      hapticSuccess();
      invalidateCache('/progress');
      navigate('/history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finish workout');
      setFinishing(false);
    }
  }

  if (loading && !workout) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !workout) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Workout</h1>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</div>
      </div>
    );
  }

  if (!workout) return null;

  const completedCount = sets.filter((s) => s.completed).length;
  const totalCount = sets.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{workout.name}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatElapsed(elapsed)}
            </span>
            <span>{completedCount}/{totalCount} sets</span>
          </div>
        </div>
        <Button onClick={finishWorkout} loading={finishing} leftIcon={<Flag className="h-4 w-4" />}>
          Finish
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-300"
          style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</div>
      )}

      {/* Exercise groups */}
      {exerciseGroups.map((group) => (
        <Card key={group.exerciseId}>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">{group.exerciseName}</h2>

            {/* Set header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-[var(--color-text-tertiary)]">
              <div className="col-span-1">Set</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-3">Weight (lbs)</div>
              <div className="col-span-2">Reps</div>
              <div className="col-span-2">Previous</div>
              <div className="col-span-2" />
            </div>

            {/* Set rows */}
            {group.sets.map((setRow, idx) => (
              <div
                key={setRow.id}
                className={cn(
                  'grid grid-cols-12 items-center gap-2 rounded-lg p-2 transition-colors',
                  setRow.completed
                    ? 'bg-brand-500/10'
                    : 'hover:bg-[var(--color-bg-secondary)]',
                )}
              >
                <div className="col-span-1 text-sm font-medium text-[var(--color-text-secondary)]">
                  {idx + 1}
                </div>
                <div className="col-span-2">
                  <Badge
                    variant={
                      setRow.set_type === 'warmup'
                        ? 'warning'
                        : setRow.set_type === 'drop'
                          ? 'info'
                          : setRow.set_type === 'failure'
                            ? 'danger'
                            : 'default'
                    }
                  >
                    {setRow.set_type}
                  </Badge>
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    value={setRow.inputWeight}
                    onChange={(e) => updateSetInput(setRow.id, 'inputWeight', e.target.value)}
                    className="input-field py-1 text-sm"
                    placeholder="0"
                    disabled={setRow.completed}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={setRow.inputReps}
                    onChange={(e) => updateSetInput(setRow.id, 'inputReps', e.target.value)}
                    className="input-field py-1 text-sm"
                    placeholder="0"
                    disabled={setRow.completed}
                  />
                </div>
                <div className="col-span-2 text-xs text-[var(--color-text-tertiary)]">
                  {setRow.weight != null && setRow.reps != null && setRow.completed
                    ? `${setRow.weight} × ${setRow.reps}`
                    : '—'}
                </div>
                <div className="col-span-2 flex justify-end">
                  {setRow.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-brand-500" />
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => completeSet(setRow)}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {exerciseGroups.length === 0 && (
        <div className="py-16 text-center text-[var(--color-text-secondary)]">
          <p className="text-lg font-medium">No exercises in this workout</p>
        </div>
      )}
    </div>
  );
}
