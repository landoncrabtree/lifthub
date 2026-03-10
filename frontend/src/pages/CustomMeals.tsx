import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, UtensilsCrossed } from 'lucide-react';
import { get, post, put, del } from '@/api/client';
import { useToast } from '@/contexts/ToastContext';
import type { CustomMeal } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { SectionNav } from '@/components/ui/SectionNav';
import { nutritionNavItems } from '@/lib/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MealFormState {
  name: string;
  description: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
}

const emptyForm: MealFormState = {
  name: '',
  description: '',
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CustomMeals() {
  const { toast } = useToast();

  const [meals, setMeals] = useState<CustomMeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MealFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // ── Fetch meals ──────────────────────────────────────────────────────────────

  const fetchMeals = useCallback(async () => {
    if (meals.length === 0) setLoading(true);
    setError(null);
    try {
      const data = await get<CustomMeal[]>('/foods/custom-meals');
      setMeals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meals');
    } finally {
      setLoading(false);
    }
  }, [meals.length]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  // ── Open modal ───────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(meal: CustomMeal) {
    setEditingId(meal.id);
    setForm({
      name: meal.name,
      description: meal.description ?? '',
      calories: String(meal.calories),
      protein_g: String(meal.protein_g),
      carbs_g: String(meal.carbs_g),
      fat_g: String(meal.fat_g),
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.name.trim() || !form.calories) return;

    setSaving(true);
    const body = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      calories: parseFloat(form.calories) || 0,
      protein_g: parseFloat(form.protein_g) || 0,
      carbs_g: parseFloat(form.carbs_g) || 0,
      fat_g: parseFloat(form.fat_g) || 0,
    };

    try {
      if (editingId) {
        await put(`/foods/custom-meals/${editingId}`, body);
        toast('Meal updated', 'success');
      } else {
        await post('/foods/custom-meals', body);
        toast('Meal created', 'success');
      }
      closeModal();
      fetchMeals();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save meal', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function handleDelete(id: number) {
    try {
      await del(`/foods/custom-meals/${id}`);
      toast('Meal deleted', 'success');
      fetchMeals();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete meal', 'error');
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionNav items={nutritionNavItems} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Custom Meals</h1>
        <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
          New Meal
        </Button>
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
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && meals.length === 0 && (
        <EmptyState
          icon={<UtensilsCrossed className="h-6 w-6" />}
          title="No custom meals yet"
          description="Create reusable meal presets to log food faster."
        />
      )}

      {/* Meals grid */}
      {!loading && meals.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {meals.map((meal) => (
            <Card key={meal.id}>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[var(--color-text)] truncate">{meal.name}</h3>
                    {meal.description && (
                      <p className="text-xs text-[var(--color-text-tertiary)] truncate">{meal.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openEdit(meal)}
                      className="rounded-lg p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]"
                      aria-label="Edit meal"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(meal.id)}
                      className="rounded-lg p-1.5 text-[var(--color-text-tertiary)] hover:bg-red-500/10 hover:text-red-500"
                      aria-label="Delete meal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{Math.round(meal.calories)}</p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">cal</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{Math.round(meal.protein_g)}g</p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">protein</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{Math.round(meal.carbs_g)}g</p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">carbs</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{Math.round(meal.fat_g)}g</p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">fat</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Meal' : 'New Meal'}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button
              loading={saving}
              disabled={!form.name.trim() || !form.calories}
              onClick={handleSave}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Chicken Rice Bowl"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="input-field min-h-[60px] resize-y"
              placeholder="Optional description…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Calories"
              required
              type="number"
              min="0"
              step="1"
              value={form.calories}
              onChange={(e) => setForm((p) => ({ ...p, calories: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="Protein (g)"
              type="number"
              min="0"
              step="0.1"
              value={form.protein_g}
              onChange={(e) => setForm((p) => ({ ...p, protein_g: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="Carbs (g)"
              type="number"
              min="0"
              step="0.1"
              value={form.carbs_g}
              onChange={(e) => setForm((p) => ({ ...p, carbs_g: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="Fat (g)"
              type="number"
              min="0"
              step="0.1"
              value={form.fat_g}
              onChange={(e) => setForm((p) => ({ ...p, fat_g: e.target.value }))}
              placeholder="0"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
