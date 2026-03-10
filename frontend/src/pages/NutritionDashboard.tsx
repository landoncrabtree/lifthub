import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react';
import { get, del } from '@/api/client';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { SectionNav } from '@/components/ui/SectionNav';
import { nutritionNavItems } from '@/lib/navigation';
import FoodSearchModal from '@/components/FoodSearchModal';
import type { DailySummary, FoodLogEntry, MealType, NutritionProfile } from '@/types';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const MACRO_CONFIG = [
  { key: 'protein_g' as const, label: 'Protein', color: 'bg-indigo-500', track: 'bg-indigo-500/20' },
  { key: 'carbs_g' as const, label: 'Carbs', color: 'bg-amber-500', track: 'bg-amber-500/20' },
  { key: 'fat_g' as const, label: 'Fat', color: 'bg-rose-500', track: 'bg-rose-500/20' },
] as const;

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (formatDate(date) === formatDate(today)) return 'Today';
  if (formatDate(date) === formatDate(yesterday)) return 'Yesterday';
  if (formatDate(date) === formatDate(tomorrow)) return 'Tomorrow';

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function calorieRingColor(consumed: number, target: number): string {
  if (target === 0) return '#22c55e';
  const pct = consumed / target;
  if (pct > 1) return '#ef4444';       // Over target — red
  if (pct >= 0.9) return '#22c55e';    // 90-100% — green (on target)
  if (pct >= 0.5) return '#f97316';    // 50-89% — orange (getting there)
  return '#ef4444';                     // Under 50% — red (way under)
}

// ─── Calorie Ring ────────────────────────────────────────────────────────────

function CalorieRing({
  consumed,
  target,
}: {
  consumed: number;
  target: number;
}) {
  const radius = 80;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const offset = circumference - pct * circumference;
  const color = calorieRingColor(consumed, target);

  return (
    <div className="flex justify-center py-4">
      <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
        {/* Track */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="var(--color-bg-tertiary)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
        {/* Center text — rotated back to upright */}
        <g transform="rotate(90 100 100)">
          <text
            x="100"
            y="92"
            textAnchor="middle"
            className="fill-[var(--color-text)] text-3xl font-bold"
            style={{ fontSize: 32, fontWeight: 700 }}
          >
            {consumed}
          </text>
          <text
            x="100"
            y="116"
            textAnchor="middle"
            className="fill-[var(--color-text-secondary)]"
            style={{ fontSize: 14 }}
          >
            / {target} cal
          </text>
        </g>
      </svg>
    </div>
  );
}

// ─── Macro Bar ───────────────────────────────────────────────────────────────

function MacroBar({
  label,
  consumed,
  target,
  color,
  track,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
  track: string;
}) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[var(--color-text)]">{label}</span>
        <span className="text-[var(--color-text-secondary)]">
          {Math.round(consumed)}g / {target}g
        </span>
      </div>
      <div className={`h-2.5 w-full overflow-hidden rounded-full ${track}`}>
        <div
          className={`h-full rounded-full ${color} transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Meal Section ────────────────────────────────────────────────────────────

function MealSection({
  mealType,
  entries,
  onDelete,
  onAdd,
}: {
  mealType: MealType;
  entries: FoodLogEntry[];
  onDelete: (id: number) => void;
  onAdd: (mealType: MealType) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const totalCals = entries.reduce((sum, e) => sum + e.calories, 0);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h3 className="font-semibold text-[var(--color-text)]">
            {MEAL_LABELS[mealType]}
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {totalCals} cal
          </p>
        </div>
        <ChevronRight
          className={`h-5 w-5 text-[var(--color-text-tertiary)] transition-transform ${
            collapsed ? '' : 'rotate-90'
          }`}
        />
      </button>

      {!collapsed && (
        <div className="mt-3 space-y-2">
          {entries.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">No items logged</p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-text)]">
                    {entry.food_name ?? 'Unknown food'}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {entry.servings} serving{entry.servings !== 1 ? 's' : ''} · {entry.calories} cal
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(entry.id)}
                  aria-label={`Remove ${entry.food_name}`}
                  className="ml-2 rounded-lg p-1.5 text-[var(--color-text-tertiary)] hover:bg-red-500/10 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}

          <button
            type="button"
            onClick={() => onAdd(mealType)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--color-border)] py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:border-brand-500/50 hover:text-brand-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Food
          </button>
        </div>
      )}
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function NutritionDashboard() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [daily, setDaily] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');

  const shiftDate = useCallback((delta: number) => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  }, []);

  const handleDateInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const d = new Date(e.target.value + 'T12:00:00');
    if (!isNaN(d.getTime())) setSelectedDate(d);
  }, []);

  // Check profile on mount — redirect to onboard if missing
  useEffect(() => {
    get<NutritionProfile>('/nutrition/profile').catch((err) => {
      if (err.message.includes('404') || err.message.includes('not found')) {
        navigate('/nutrition/onboard', { replace: true });
      }
    });
  }, [navigate]);

  // Fetch daily summary whenever date changes
  useEffect(() => {
    let cancelled = false;
    if (!daily) setLoading(true);

    get<DailySummary>(`/nutrition/daily?date=${formatDate(selectedDate)}`)
      .then((data) => {
        if (!cancelled) setDaily(data);
      })
      .catch(() => {
        if (!cancelled) setDaily(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const entriesByMeal = useMemo(() => {
    const map: Record<MealType, FoodLogEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    if (!daily) return map;
    for (const entry of daily.entries) {
      map[entry.meal_type]?.push(entry);
    }
    return map;
  }, [daily]);

  const handleDelete = useCallback(
    async (id: number) => {
      await del(`/nutrition/log/${id}`);
      // Refetch
      const data = await get<DailySummary>(
        `/nutrition/daily?date=${formatDate(selectedDate)}`,
      );
      setDaily(data);
    },
    [selectedDate],
  );

  const handleAddFood = useCallback((mealType: MealType) => {
    setSelectedMealType(mealType);
    setShowFoodSearch(true);
  }, []);

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (loading && !daily) {
    return (
      <div className="space-y-6">
        <SectionNav items={nutritionNavItems} />
        {/* Date selector skeleton */}
        <div className="flex items-center justify-center gap-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        {/* Ring skeleton */}
        <div className="flex justify-center">
          <Skeleton className="h-[200px] w-[200px] rounded-full" />
        </div>
        {/* Macro bars skeleton */}
        <Card>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </Card>
        {/* Meal sections skeleton */}
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-1 h-3 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  const totals = daily?.totals ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  const targets = daily?.targets ?? { calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65 };

  return (
    <div className="space-y-6">
      <SectionNav items={nutritionNavItems} />
      {/* ── Date Selector ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => shiftDate(-1)}
          aria-label="Previous day"
          className="rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <label className="relative cursor-pointer">
          <span className="text-lg font-semibold text-[var(--color-text)]">
            {dateLabel(selectedDate)}
          </span>
          <input
            type="date"
            value={formatDate(selectedDate)}
            onChange={handleDateInput}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>

        <button
          type="button"
          onClick={() => shiftDate(1)}
          aria-label="Next day"
          className="rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* ── Calorie Ring ───────────────────────────────────────────────────── */}
      <CalorieRing consumed={totals.calories} target={targets.calories} />

      {/* ── Macro Bars ─────────────────────────────────────────────────────── */}
      <Card>
        <div className="space-y-4">
          {MACRO_CONFIG.map((m) => (
            <MacroBar
              key={m.key}
              label={m.label}
              consumed={totals[m.key]}
              target={targets[m.key]}
              color={m.color}
              track={m.track}
            />
          ))}
        </div>
      </Card>

      {/* ── Meal Sections ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {MEAL_ORDER.map((meal) => (
          <MealSection
            key={meal}
            mealType={meal}
            entries={entriesByMeal[meal]}
            onDelete={handleDelete}
            onAdd={handleAddFood}
          />
        ))}
      </div>

      {/* ── Food Search Modal ────────────────────────────────────────────── */}
      <FoodSearchModal
        open={showFoodSearch}
        onClose={() => setShowFoodSearch(false)}
        defaultMealType={selectedMealType}
        date={formatDate(selectedDate)}
        onLogged={() => {
          setShowFoodSearch(false);
          get<DailySummary>(`/nutrition/daily?date=${formatDate(selectedDate)}`).then(setDaily);
        }}
      />
    </div>
  );
}
