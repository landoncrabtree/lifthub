import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Save, Plus, X, GripVertical, AlertCircle, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';
import { get, post, put } from '@/api/client';
import { useToast } from '@/contexts/ToastContext';
import type { Template, TemplateExercise, Exercise, SetType, MuscleGroup, Equipment } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';

type EditorExercise = TemplateExercise & { _key: string };

const SET_TYPE_OPTIONS: SelectOption[] = (
  ['normal', 'warmup', 'drop', 'failure'] satisfies SetType[]
).map((st) => ({
  value: st,
  label: st.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
}));

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Sortable Exercise Row ────────────────────────────────────────────────────

interface SortableRowProps {
  item: EditorExercise;
  exercises: Exercise[];
  exerciseSearch: string;
  onSearchChange: (value: string) => void;
  activeSearchKey: string | null;
  onActivateSearch: (key: string | null) => void;
  onChange: (key: string, field: keyof TemplateExercise, value: unknown) => void;
  onRemove: (key: string) => void;
  onCreateExercise: (key: string) => void;
  collapsed: boolean;
  onToggleCollapse: (key: string) => void;
}

function SortableExerciseRow({
  item,
  exercises,
  exerciseSearch,
  onSearchChange,
  activeSearchKey,
  onActivateSearch,
  onChange,
  onRemove,
  onCreateExercise,
  collapsed,
  onToggleCollapse,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item._key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const selectedExercise = exercises.find((e) => e.id === item.exercise_id);
  const isSearchActive = activeSearchKey === item._key;

  const filteredExercises = useMemo(() => {
    if (!exerciseSearch) return exercises;
    const q = exerciseSearch.toLowerCase();
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, exerciseSearch]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4',
        isDragging && 'opacity-50',
      )}
    >
      <button
        className="mt-2 cursor-grab text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {collapsed ? (
        /* ── Collapsed: single row with name ── */
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <button
            onClick={() => onToggleCollapse(item._key)}
            className="shrink-0 rounded-lg p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <p className="truncate font-medium text-[var(--color-text-primary)]">
            {selectedExercise?.name || 'No exercise selected'}
          </p>
          {item.sets > 0 && (
            <span className="shrink-0 text-xs text-[var(--color-text-tertiary)]">
              {item.sets} × {item.reps}
            </span>
          )}
        </div>
      ) : (
        /* ── Expanded: full form ── */
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleCollapse(item._key)}
              className="shrink-0 rounded-lg p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              {selectedExercise?.name || 'New Exercise'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Exercise selector */}
            <div className="relative sm:col-span-2 lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Exercise</label>
              <button
                type="button"
                className="input-field text-left"
                onClick={() => onActivateSearch(isSearchActive ? null : item._key)}
              >
                {selectedExercise?.name || 'Select exercise...'}
              </button>
              {isSearchActive && (
                <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] shadow-lg">
                  <div className="sticky top-0 bg-[var(--color-bg)] p-2">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={exerciseSearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
                      className="input-field text-xs"
                      autoFocus
                    />
                  </div>
                  {filteredExercises.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-secondary)]"
                      onClick={() => {
                        onChange(item._key, 'exercise_id', ex.id);
                        onActivateSearch(null);
                        onSearchChange('');
                      }}
                    >
                      <span>{ex.name}</span>
                      <span className="text-xs text-[var(--color-text-tertiary)]">{formatLabel(ex.muscle_group)}</span>
                    </button>
                  ))}
                  {filteredExercises.length === 0 && (
                    <p className="px-3 py-2 text-xs text-[var(--color-text-tertiary)]">No exercises found</p>
                  )}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 border-t border-[var(--color-border)] px-3 py-2 text-left text-sm font-medium text-brand-500 hover:bg-[var(--color-bg-secondary)]"
                    onClick={() => {
                      onActivateSearch(null);
                      onCreateExercise(item._key);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create New Exercise
                  </button>
                </div>
              )}
            </div>

            <Input
              label="Sets"
              type="number"
              min={1}
              value={item.sets}
              onChange={(e) => onChange(item._key, 'sets', parseInt(e.target.value) || 1)}
            />

            <Input
              label="Reps"
              type="text"
              value={String(item.reps)}
              onChange={(e) => onChange(item._key, 'reps', e.target.value)}
              placeholder="8, 8-12, AMRAP"
            />

            <Input
              label="Rest (s)"
              type="number"
              min={0}
              value={item.rest_seconds ?? ''}
              onChange={(e) => onChange(item._key, 'rest_seconds', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="90"
            />
          </div>

          <Select
            label="Type"
            options={SET_TYPE_OPTIONS}
            value={item.set_type}
            onChange={(e) => onChange(item._key, 'set_type', e.target.value)}
            wrapperClassName="max-w-[200px]"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">Notes</label>
            <input
              type="text"
              value={item.notes ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange(item._key, 'notes', e.target.value || null)
              }
              placeholder="Optional notes..."
              className="input-field text-sm"
            />
          </div>
        </div>
      )}

      <button
        onClick={() => onRemove(item._key)}
        className="mt-2 rounded-lg p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-red-500 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Export Exercises Button ───────────────────────────────────────────────────

function ExportExercisesButton({ exercises }: { exercises: Exercise[] }) {
  const [showModal, setShowModal] = useState(false);

  async function handleCopy() {
    const names = exercises.map((e) => e.name).sort().join('\n');
    await navigator.clipboard.writeText(names);
    setShowModal(true);
  }

  return (
    <>
      <Button variant="outline" onClick={handleCopy} leftIcon={<Copy className="h-4 w-4" />}>
        Copy Exercise Names
      </Button>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Exercises Copied!">
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            All {exercises.length} exercise names have been copied to your clipboard.
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            This is a great way to ask LLMs such as ChatGPT or Claude to help you come up with, or improve, a workout routine! Just paste the list and ask for a plan — then paste the JSON result back here.
          </p>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setShowModal(false)}>Got it</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

let keyCounter = 0;
function nextKey(): string {
  return `ex-${++keyCounter}-${Date.now()}`;
}

export default function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exerciseRows, setExerciseRows] = useState<EditorExercise[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  const [activeTab, setActiveTab] = useState('graphical');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [activeSearchKey, setActiveSearchKey] = useState<string | null>(null);
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());

  // Inline exercise creation
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [createForKey, setCreateForKey] = useState<string | null>(null);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState<MuscleGroup>('chest');
  const [newExEquip, setNewExEquip] = useState<Equipment | ''>('');
  const [newExDesc, setNewExDesc] = useState('');
  const [creatingExercise, setCreatingExercise] = useState(false);

  useEffect(() => {
    get<Exercise[]>('/exercises').then(setExercises).catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    if (!name) setLoading(true);
    get<Template>(`/templates/${id}`)
      .then((t) => {
        setName(t.name);
        setDescription(t.description || '');
        setExerciseRows(t.json_data.map((ex) => ({ ...ex, _key: nextKey() })));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load template'))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  // User-friendly JSON shape (uses exercise_name instead of exercise_id)
  interface JsonExercise {
    exercise_name: string;
    sets: number;
    reps: string;
    rest_seconds: number | null;
    set_type: string;
    notes: string | null;
  }

  // Build a lookup from exercise list
  const exerciseNameToId = useMemo(() => {
    const map = new Map<string, number>();
    for (const ex of exercises) map.set(ex.name.toLowerCase(), ex.id);
    return map;
  }, [exercises]);

  const exerciseIdToName = useMemo(() => {
    const map = new Map<number, string>();
    for (const ex of exercises) map.set(ex.id, ex.name);
    return map;
  }, [exercises]);

  const toggleCollapse = useCallback((key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  function rowsToJson(rows: EditorExercise[]): JsonExercise[] {
    return rows.map((r) => ({
      exercise_name: exerciseIdToName.get(r.exercise_id) ?? `Unknown (ID: ${r.exercise_id})`,
      sets: r.sets,
      reps: String(r.reps),
      rest_seconds: r.rest_seconds,
      set_type: r.set_type,
      notes: r.notes,
    }));
  }

  function jsonToRows(data: JsonExercise[]): EditorExercise[] {
    return data.map((item, idx) => {
      const exId = exerciseNameToId.get(item.exercise_name.toLowerCase()) ?? 0;
      return {
        _key: nextKey(),
        exercise_id: exId,
        order_index: idx,
        sets: item.sets ?? 3,
        reps: item.reps ?? '8',
        rest_seconds: item.rest_seconds ?? null,
        set_type: (item.set_type as SetType) ?? 'normal',
        notes: item.notes ?? null,
      };
    });
  }

  // Sync graphical → JSON when switching to JSON tab
  useEffect(() => {
    if (activeTab === 'json') {
      setJsonText(JSON.stringify(rowsToJson(exerciseRows), null, 2));
      setJsonError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setExerciseRows((items) => {
        const oldIndex = items.findIndex((i) => i._key === active.id);
        const newIndex = items.findIndex((i) => i._key === over.id);
        return arrayMove(items, oldIndex, newIndex).map((item, idx) => ({ ...item, order_index: idx }));
      });
    }
  }

  function handleFieldChange(key: string, field: keyof TemplateExercise, value: unknown) {
    setExerciseRows((rows) => rows.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
  }

  function addExercise() {
    setExerciseRows((rows) => [
      ...rows,
      {
        _key: nextKey(),
        exercise_id: 0,
        order_index: rows.length,
        sets: 3,
        reps: '8',
        rest_seconds: 90,
        set_type: 'normal',
        notes: null,
      },
    ]);
  }

  function removeExercise(key: string) {
    setExerciseRows((rows) =>
      rows.filter((r) => r._key !== key).map((r, idx) => ({ ...r, order_index: idx })),
    );
  }

  function handleTabChange(tab: string) {
    // When leaving JSON tab, auto-apply edits to visual
    if (activeTab === 'json' && tab !== 'json') {
      try {
        const parsed = JSON.parse(jsonText) as JsonExercise[];
        if (Array.isArray(parsed)) {
          const unknowns = parsed.filter((item) => !exerciseNameToId.has(item.exercise_name?.toLowerCase()));
          if (unknowns.length === 0) {
            setExerciseRows(jsonToRows(parsed));
            setJsonError(null);
          }
        }
      } catch {
        // If JSON is invalid, keep current visual state
      }
    }
    setActiveTab(tab);
  }

  const handleSearchChange = useCallback((value: string) => {
    setExerciseSearch(value);
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const jsonData: TemplateExercise[] = exerciseRows.map(({ _key: _k, ...rest }) => rest);
      const body = { name, description: description || null, json_data: jsonData };

      if (isNew) {
        const created = await post<Template>('/templates', body);
        toast('Template created!');
        hapticLight();
        navigate(`/templates/${created.id}`, { replace: true });
      } else {
        await put<Template>(`/templates/${id}`, body);
        toast('Changes saved!');
        hapticLight();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  function openCreateExercise(forKey: string) {
    setCreateForKey(forKey);
    setNewExName('');
    setNewExMuscle('chest');
    setNewExEquip('');
    setNewExDesc('');
    setShowCreateExercise(true);
  }

  async function handleCreateExercise() {
    if (!newExName.trim()) return;
    setCreatingExercise(true);
    try {
      const created = await post<Exercise>('/exercises', {
        name: newExName.trim(),
        muscle_group: newExMuscle,
        equipment: newExEquip || null,
        description: newExDesc || null,
      });
      setExercises((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      // Auto-select the new exercise in the row that triggered creation
      if (createForKey) {
        handleFieldChange(createForKey, 'exercise_id', created.id);
      }
      setShowCreateExercise(false);
      toast('Exercise created!');
      hapticLight();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create exercise');
    } finally {
      setCreatingExercise(false);
    }
  }

  const MUSCLE_OPTIONS: SelectOption[] = [
    'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'core',
    'quads', 'hamstrings', 'glutes', 'calves', 'full_body', 'cardio',
  ].map((m) => ({ value: m, label: formatLabel(m) }));

  const EQUIPMENT_OPTIONS: SelectOption[] = [
    { value: '', label: 'None' },
    ...['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'band', 'other']
      .map((e) => ({ value: e, label: formatLabel(e) })),
  ];

  const tabItems = [
    { label: 'Graphical', value: 'graphical' },
    { label: 'JSON', value: 'json' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          {isNew ? 'New Template' : 'Edit Template'}
        </h1>
        <Button onClick={handleSave} loading={saving} leftIcon={<Save className="h-4 w-4" />}>
          Save
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</div>
      )}

      {/* Name & Description */}
      <div className="space-y-4">
        <Input
          label="Template Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Push Day"
          required
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text)]">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field min-h-[60px] resize-y"
            placeholder="Optional description..."
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabItems} value={activeTab} onChange={handleTabChange} />

      {/* Graphical Mode */}
      <TabPanel value="graphical" activeValue={activeTab}>
        <div className="space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={exerciseRows.map((r) => r._key)} strategy={verticalListSortingStrategy}>
              {exerciseRows.map((row) => (
                <SortableExerciseRow
                  key={row._key}
                  item={row}
                  exercises={exercises}
                  exerciseSearch={exerciseSearch}
                  onSearchChange={handleSearchChange}
                  activeSearchKey={activeSearchKey}
                  onActivateSearch={setActiveSearchKey}
                  onChange={handleFieldChange}
                  onRemove={removeExercise}
                  onCreateExercise={openCreateExercise}
                  collapsed={collapsedKeys.has(row._key)}
                  onToggleCollapse={toggleCollapse}
                />
              ))}
            </SortableContext>
          </DndContext>

          {exerciseRows.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-text-secondary)]">
              <p className="text-sm">No exercises added yet. Click below to start.</p>
            </div>
          )}

          <Button variant="outline" onClick={addExercise} className="w-full" leftIcon={<Plus className="h-4 w-4" />}>
            Add Exercise
          </Button>
        </div>
      </TabPanel>

      {/* JSON Mode */}
      <TabPanel value="json" activeValue={activeTab}>
        <div className="space-y-3">
          {jsonError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {jsonError}
            </div>
          )}
          <textarea
            value={jsonText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setJsonText(e.target.value);
              try {
                JSON.parse(e.target.value);
                setJsonError(null);
              } catch (parseErr) {
                setJsonError(parseErr instanceof Error ? parseErr.message : 'Invalid JSON');
              }
            }}
            className="input-field min-h-[400px] resize-y font-mono text-sm"
            spellCheck={false}
          />
          <div className="flex items-center gap-3">
            <ExportExercisesButton exercises={exercises} />
          </div>
        </div>
      </TabPanel>

      {/* Create Exercise Modal */}
      <Modal
        open={showCreateExercise}
        onClose={() => setShowCreateExercise(false)}
        title="Create New Exercise"
      >
        <div className="space-y-4">
          <Input
            label="Exercise Name"
            value={newExName}
            onChange={(e) => setNewExName(e.target.value)}
            placeholder="e.g. Incline DB Curl"
            required
          />
          <Select
            label="Muscle Group"
            options={MUSCLE_OPTIONS}
            value={newExMuscle}
            onChange={(e) => setNewExMuscle(e.target.value as MuscleGroup)}
          />
          <Select
            label="Equipment"
            options={EQUIPMENT_OPTIONS}
            value={newExEquip}
            onChange={(e) => setNewExEquip(e.target.value as Equipment | '')}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">Description</label>
            <textarea
              value={newExDesc}
              onChange={(e) => setNewExDesc(e.target.value)}
              className="input-field min-h-[60px] resize-y"
              placeholder="Optional description..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateExercise(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateExercise} loading={creatingExercise} disabled={!newExName.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
