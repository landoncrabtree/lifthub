import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Dumbbell } from 'lucide-react';
import { get, post } from '@/api/client';
import { cn } from '@/lib/utils';
import type { Exercise, MuscleGroup, Equipment } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'core',
  'quads', 'hamstrings', 'glutes', 'calves', 'full_body', 'cardio',
];

const EQUIPMENT_TYPES: Equipment[] = [
  'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'band', 'other',
];

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const muscleOptions: SelectOption[] = MUSCLE_GROUPS.map((mg) => ({
  value: mg,
  label: formatLabel(mg),
}));

const equipmentOptions: SelectOption[] = EQUIPMENT_TYPES.map((eq) => ({
  value: eq,
  label: formatLabel(eq),
}));

export default function Exercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formMuscle, setFormMuscle] = useState<MuscleGroup>('chest');
  const [formEquipment, setFormEquipment] = useState<Equipment>('barbell');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (muscleFilter) params.set('muscle_group', muscleFilter);
      if (equipmentFilter) params.set('equipment', equipmentFilter);
      const query = params.toString();
      const data = await get<Exercise[]>(`/exercises${query ? `?${query}` : ''}`);
      setExercises(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  }, [search, muscleFilter, equipmentFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchExercises, 300);
    return () => clearTimeout(timer);
  }, [fetchExercises]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await post<Exercise>('/exercises', {
        name: formName,
        muscle_group: formMuscle,
        equipment: formEquipment,
        description: formDescription || null,
      });
      setShowModal(false);
      setFormName('');
      setFormDescription('');
      fetchExercises();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create exercise');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Exercises</h1>
        <Button onClick={() => setShowModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Add Exercise
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search exercises..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search className="h-4 w-4" />}
      />

      {/* Muscle group chips */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--color-text-secondary)]">Muscle Group</p>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg}
              onClick={() => setMuscleFilter(muscleFilter === mg ? null : mg)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                muscleFilter === mg
                  ? 'bg-brand-600 text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]',
              )}
            >
              {formatLabel(mg)}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment chips */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--color-text-secondary)]">Equipment</p>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_TYPES.map((eq) => (
            <button
              key={eq}
              onClick={() => setEquipmentFilter(equipmentFilter === eq ? null : eq)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                equipmentFilter === eq
                  ? 'bg-brand-600 text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]',
              )}
            >
              {formatLabel(eq)}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && exercises.length === 0 && (
        <EmptyState
          icon={<Dumbbell className="h-6 w-6" />}
          title="No exercises found"
          description="Try adjusting your search or filters"
        />
      )}

      {/* Exercise grid */}
      {!loading && exercises.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((ex) => (
            <Card key={ex.id}>
              <div className="space-y-2">
                <h3 className="font-semibold text-[var(--color-text)]">{ex.name}</h3>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="info">{formatLabel(ex.muscle_group)}</Badge>
                  {ex.equipment && <Badge>{formatLabel(ex.equipment)}</Badge>}
                </div>
                {ex.description && (
                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">
                    {ex.description}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Exercise Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Exercise"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleCreate}>Create</Button>
          </>
        }
      >
        <form id="add-exercise-form" onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            placeholder="e.g. Bench Press"
          />
          <Select
            label="Muscle Group"
            options={muscleOptions}
            value={formMuscle}
            onChange={(e) => setFormMuscle(e.target.value as MuscleGroup)}
          />
          <Select
            label="Equipment"
            options={equipmentOptions}
            value={formEquipment}
            onChange={(e) => setFormEquipment(e.target.value as Equipment)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="input-field min-h-[80px] resize-y"
              placeholder="Optional description or notes..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
