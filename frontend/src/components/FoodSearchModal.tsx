import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BarcodeScanner } from 'web-wasm-barcode-reader';
import { get, post } from '@/api/client';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import type { Food, MealType, CustomMeal } from '@/types';
import {
  Search,
  Camera,
  Plus,
  Minus,
  ScanBarcode,
  Zap,
} from 'lucide-react';

// ─── Props ──────────────────────────────────────────────────

interface FoodSearchModalProps {
  open: boolean;
  onClose: () => void;
  defaultMealType?: MealType;
  date: string;
  onLogged: () => void;
}

// ─── Constants ──────────────────────────────────────────────

const MEAL_TYPES: { label: string; value: MealType }[] = [
  { label: 'Breakfast', value: 'breakfast' },
  { label: 'Lunch', value: 'lunch' },
  { label: 'Dinner', value: 'dinner' },
  { label: 'Snack', value: 'snack' },
];

const TAB_ITEMS = [
  { label: 'Search', value: 'search' },
  { label: 'Scan', value: 'scan' },
  { label: 'My Meals', value: 'meals' },
];

type ModalView = 'tabs' | 'portion' | 'create-food';

interface CreateFoodForm {
  name: string;
  brand: string;
  serving_size: string;
  serving_unit: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
}

const EMPTY_FORM: CreateFoodForm = {
  name: '',
  brand: '',
  serving_size: '',
  serving_unit: 'g',
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
};

// ─── Component ──────────────────────────────────────────────

export default function FoodSearchModal({
  open,
  onClose,
  defaultMealType,
  date,
  onLogged,
}: FoodSearchModalProps) {
  // ── Navigation state ──
  const [view, setView] = useState<ModalView>('tabs');
  const [activeTab, setActiveTab] = useState('search');

  // ── Search state ──
  const [searchTerm, setSearchTerm] = useState('');
  const [allFoods, setAllFoods] = useState<Food[]>([]);
  const [foodsLoading, setFoodsLoading] = useState(false);

  // ── Barcode state ──
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeResult, setBarcodeResult] = useState<Food | null>(null);
  const [barcodeError, setBarcodeError] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef<BarcodeScanner | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  // ── Custom meals state ──
  const [customMeals, setCustomMeals] = useState<CustomMeal[]>([]);
  const [mealsLoading, setMealsLoading] = useState(false);
  const [mealSearch, setMealSearch] = useState('');

  // ── Portion selector state ──
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<CustomMeal | null>(null);
  const [servings, setServings] = useState(1);
  const [mealType, setMealType] = useState<MealType>(defaultMealType ?? 'breakfast');
  const [logging, setLogging] = useState(false);

  // ── Create food state ──
  const [createForm, setCreateForm] = useState<CreateFoodForm>(EMPTY_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // ── Reset on open/close ──
  useEffect(() => {
    if (open) {
      setView('tabs');
      setActiveTab('search');
      setSearchTerm('');
      setAllFoods([]);
      setSelectedFood(null);
      setSelectedMeal(null);
      setServings(1);
      setMealType(defaultMealType ?? 'breakfast');
      setBarcodeInput('');
      setBarcodeResult(null);
      setBarcodeError('');
      setCreateForm(EMPTY_FORM);
      setCreateError('');
    } else {
      stopCamera();
    }
  }, [open, defaultMealType]);

  // ── Load all foods when modal opens ──
  useEffect(() => {
    if (!open) return;
    setFoodsLoading(true);
    get<Food[]>('/foods')
      .then(setAllFoods)
      .catch(() => setAllFoods([]))
      .finally(() => setFoodsLoading(false));
  }, [open]);

  // ── Client-side filtered foods ──
  const filteredFoods = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allFoods;
    return allFoods.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.brand && f.brand.toLowerCase().includes(q)),
    );
  }, [allFoods, searchTerm]);

  // ── Fetch custom meals when modal opens ──
  useEffect(() => {
    if (!open) return;
    setMealsLoading(true);
    get<CustomMeal[]>('/foods/custom-meals')
      .then(setCustomMeals)
      .catch(() => setCustomMeals([]))
      .finally(() => setMealsLoading(false));
  }, [open]);

  // ── Client-side filtered meals ──
  const filteredMeals = useMemo(() => {
    const q = mealSearch.trim().toLowerCase();
    if (!q) return customMeals;
    return customMeals.filter((m) => m.name.toLowerCase().includes(q));
  }, [customMeals, mealSearch]);

  // ── Camera helpers (WASM ZBar barcode scanner) ──
  const stopCamera = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Stop camera when leaving scan tab or closing modal
  useEffect(() => {
    if (activeTab !== 'scan') stopCamera();
  }, [activeTab, stopCamera]);

  useEffect(() => {
    if (!open) stopCamera();
  }, [open, stopCamera]);

  const lookupBarcode = useCallback(async (code: string) => {
    setBarcodeLoading(true);
    setBarcodeError('');
    setBarcodeResult(null);
    try {
      const food = await get<Food>(`/foods/barcode/${encodeURIComponent(code)}`);
      setBarcodeResult(food);
    } catch {
      setBarcodeError('Food not found for this barcode.');
    } finally {
      setBarcodeLoading(false);
    }
  }, []);

  const startCamera = useCallback(async () => {
    setBarcodeError('');
    setBarcodeResult(null);
    if (!scannerContainerRef.current) return;

    // Make container visible first so it has dimensions
    setCameraActive(true);
  }, []);

  // Start the scanner after the container becomes visible
  useEffect(() => {
    if (!cameraActive || scannerRef.current) return;
    if (!scannerContainerRef.current) return;

    const container = scannerContainerRef.current;

    const initScanner = async () => {
      try {
        const scanner = new BarcodeScanner({
          container,
          beepOnDetect: true,
          onDetect: (result) => {
            scanner.stop();
            scannerRef.current = null;
            setCameraActive(false);
            lookupBarcode(result.data);
          },
          onError: (err) => {
            setCameraActive(false);
            setBarcodeError(err.message || 'Scanner error');
          },
        });

        scannerRef.current = scanner;
        await scanner.start();
      } catch {
        setCameraActive(false);
        setBarcodeError('Could not access camera. Check permissions.');
      }
    };

    initScanner();
  }, [cameraActive, lookupBarcode]);

  // ── Selection handlers ──
  const selectFood = useCallback((food: Food) => {
    setSelectedFood(food);
    setSelectedMeal(null);
    setServings(1);
    setView('portion');
    stopCamera();
  }, [stopCamera]);

  const selectMeal = useCallback((meal: CustomMeal) => {
    setSelectedMeal(meal);
    setSelectedFood(null);
    setServings(1);
    setView('portion');
  }, []);

  // ── Computed macros for portion preview ──
  const portionMacros = useMemo(() => {
    if (selectedFood) {
      return {
        calories: Math.round(selectedFood.calories * servings),
        protein: Math.round(selectedFood.protein_g * servings * 10) / 10,
        carbs: Math.round(selectedFood.carbs_g * servings * 10) / 10,
        fat: Math.round(selectedFood.fat_g * servings * 10) / 10,
      };
    }
    if (selectedMeal) {
      return {
        calories: Math.round(selectedMeal.calories * servings),
        protein: Math.round(selectedMeal.protein_g * servings * 10) / 10,
        carbs: Math.round(selectedMeal.carbs_g * servings * 10) / 10,
        fat: Math.round(selectedMeal.fat_g * servings * 10) / 10,
      };
    }
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }, [selectedFood, selectedMeal, servings]);

  // ── Log food ──
  const handleLog = useCallback(async () => {
    setLogging(true);
    try {
      const body: Record<string, unknown> = {
        date,
        meal_type: mealType,
        servings,
      };
      if (selectedFood) body.food_id = selectedFood.id;
      if (selectedMeal) body.custom_meal_id = selectedMeal.id;

      await post('/nutrition/log', body);
      onLogged();
      onClose();
    } catch {
      // stay on screen so user can retry
    } finally {
      setLogging(false);
    }
  }, [date, mealType, servings, selectedFood, selectedMeal, onLogged, onClose]);

  // ── Create custom food ──
  const handleCreateFood = useCallback(async () => {
    setCreateLoading(true);
    setCreateError('');
    try {
      const food = await post<Food>('/foods', {
        name: createForm.name,
        brand: createForm.brand || null,
        serving_size: parseFloat(createForm.serving_size),
        serving_unit: createForm.serving_unit,
        calories: parseFloat(createForm.calories),
        protein_g: parseFloat(createForm.protein_g),
        carbs_g: parseFloat(createForm.carbs_g),
        fat_g: parseFloat(createForm.fat_g),
      });
      selectFood(food);
    } catch {
      setCreateError('Failed to create food. Check your inputs.');
    } finally {
      setCreateLoading(false);
    }
  }, [createForm, selectFood]);

  const updateCreateField = useCallback(
    (field: keyof CreateFoodForm, value: string) =>
      setCreateForm((prev) => ({ ...prev, [field]: value })),
    [],
  );

  // ── Servings helpers ──
  const incrementServings = useCallback(
    () => setServings((s) => Math.round((s + 0.5) * 10) / 10),
    [],
  );
  const decrementServings = useCallback(
    () => setServings((s) => Math.max(0.5, Math.round((s - 0.5) * 10) / 10)),
    [],
  );

  // ── Title based on view ──
  const modalTitle = view === 'portion'
    ? 'Log Food'
    : view === 'create-food'
      ? 'Create Custom Food'
      : 'Add Food';

  // ── Render ────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modalTitle}
      maxWidth="max-w-md"
    >
      {/* ── Portion Selector ──────────────────────── */}
      {view === 'portion' && (
        <div className="space-y-5">
          <button
            onClick={() => { setView('tabs'); setSelectedFood(null); setSelectedMeal(null); }}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            ← Back to search
          </button>

          {/* Food / meal info */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {selectedFood?.name ?? selectedMeal?.name}
            </h3>
            {selectedFood?.brand && (
              <p className="text-sm text-[var(--color-text-secondary)]">{selectedFood.brand}</p>
            )}
            {selectedFood && (
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                1 serving ({selectedFood.serving_size}{selectedFood.serving_unit}) = {selectedFood.calories} cal
              </p>
            )}
          </div>

          {/* Servings input */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
              Servings
            </label>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={decrementServings}>
                <Minus className="h-4 w-4" />
              </Button>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={servings}
                onChange={(e) => setServings(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                className="w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-center text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Button variant="outline" size="sm" onClick={incrementServings}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Live macro preview */}
          <div className="grid grid-cols-4 gap-2 rounded-lg bg-[var(--color-bg-secondary)] p-3 text-center text-sm">
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">{portionMacros.calories}</p>
              <p className="text-[var(--color-text-secondary)]">Cal</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">{portionMacros.protein}g</p>
              <p className="text-[var(--color-text-secondary)]">Protein</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">{portionMacros.carbs}g</p>
              <p className="text-[var(--color-text-secondary)]">Carbs</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">{portionMacros.fat}g</p>
              <p className="text-[var(--color-text-secondary)]">Fat</p>
            </div>
          </div>

          {/* Meal type selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
              Meal
            </label>
            <div className="grid grid-cols-4 gap-2">
              {MEAL_TYPES.map((mt) => (
                <button
                  key={mt.value}
                  onClick={() => setMealType(mt.value)}
                  className={cn(
                    'rounded-lg px-2 py-1.5 text-sm font-medium transition-colors',
                    mealType === mt.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                  )}
                >
                  {mt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Log button */}
          <Button
            variant="primary"
            className="w-full"
            loading={logging}
            onClick={handleLog}
          >
            Log {portionMacros.calories} cal
          </Button>
        </div>
      )}

      {/* ── Create Custom Food Form ──────────────── */}
      {view === 'create-food' && (
        <div className="space-y-4">
          <button
            onClick={() => setView('tabs')}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            ← Back to search
          </button>

          <Input
            label="Name"
            required
            value={createForm.name}
            onChange={(e) => updateCreateField('name', e.target.value)}
            placeholder="e.g. Protein Bar"
          />
          <Input
            label="Brand (optional)"
            value={createForm.brand}
            onChange={(e) => updateCreateField('brand', e.target.value)}
            placeholder="e.g. Kirkland"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Serving Size"
              required
              type="number"
              value={createForm.serving_size}
              onChange={(e) => updateCreateField('serving_size', e.target.value)}
              placeholder="100"
            />
            <Input
              label="Serving Unit"
              required
              value={createForm.serving_unit}
              onChange={(e) => updateCreateField('serving_unit', e.target.value)}
              placeholder="g"
            />
          </div>

          <Input
            label="Calories"
            required
            type="number"
            value={createForm.calories}
            onChange={(e) => updateCreateField('calories', e.target.value)}
            placeholder="150"
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Protein (g)"
              required
              type="number"
              value={createForm.protein_g}
              onChange={(e) => updateCreateField('protein_g', e.target.value)}
              placeholder="10"
            />
            <Input
              label="Carbs (g)"
              required
              type="number"
              value={createForm.carbs_g}
              onChange={(e) => updateCreateField('carbs_g', e.target.value)}
              placeholder="20"
            />
            <Input
              label="Fat (g)"
              required
              type="number"
              value={createForm.fat_g}
              onChange={(e) => updateCreateField('fat_g', e.target.value)}
              placeholder="5"
            />
          </div>

          {createError && (
            <p className="text-sm text-red-500">{createError}</p>
          )}

          <Button
            variant="primary"
            className="w-full"
            loading={createLoading}
            onClick={handleCreateFood}
            disabled={
              !createForm.name ||
              !createForm.serving_size ||
              !createForm.calories ||
              !createForm.protein_g ||
              !createForm.carbs_g ||
              !createForm.fat_g
            }
          >
            Create & Select
          </Button>
        </div>
      )}

      {/* ── Tabs View ────────────────────────────── */}
      {view === 'tabs' && (
        <div className="space-y-4">
          <Tabs tabs={TAB_ITEMS} value={activeTab} onChange={setActiveTab} />

          {/* Search Tab */}
          <TabPanel value="search" activeValue={activeTab}>
            <div className="space-y-3">
              <Input
                placeholder="Filter foods..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />

              {foodsLoading && !allFoods.length && (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg p-3">
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-4 w-14" />
                    </div>
                  ))}
                </div>
              )}

              {!foodsLoading && filteredFoods.length > 0 && (
                <ul className="max-h-64 space-y-1 overflow-y-auto">
                  {filteredFoods.map((food) => (
                    <li key={food.id}>
                      <button
                        onClick={() => selectFood(food)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-bg-secondary)]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--color-text-primary)]">
                            {food.name}
                          </p>
                          {food.brand && (
                            <p className="truncate text-xs text-[var(--color-text-secondary)]">
                              {food.brand}
                            </p>
                          )}
                        </div>
                        <span className="ml-3 shrink-0 text-sm text-[var(--color-text-secondary)]">
                          {food.calories} cal
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!foodsLoading && allFoods.length > 0 && filteredFoods.length === 0 && (
                <p className="py-4 text-center text-sm text-[var(--color-text-secondary)]">
                  No foods matching "{searchTerm}"
                </p>
              )}

              <Button
                variant="outline"
                className="w-full"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setView('create-food')}
              >
                Create Custom Food
              </Button>
            </div>
          </TabPanel>

          {/* Scan Tab */}
          <TabPanel value="scan" activeValue={activeTab}>
            <div className="space-y-3">
              {/* Manual barcode entry (always shown when camera is off) */}
              {!cameraActive && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter barcode manually..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    leftIcon={<ScanBarcode className="h-4 w-4" />}
                    wrapperClassName="flex-1"
                  />
                  <Button
                    variant="primary"
                    onClick={() => lookupBarcode(barcodeInput)}
                    disabled={!barcodeInput.trim()}
                    loading={barcodeLoading}
                  >
                    Look up
                  </Button>
                </div>
              )}

              {!cameraActive && !barcodeResult && !barcodeError && !barcodeLoading && (
                <Button
                  variant="secondary"
                  className="w-full"
                  leftIcon={<Camera className="h-4 w-4" />}
                  onClick={startCamera}
                >
                  Open Camera
                </Button>
              )}

              {/* WASM scanner renders into this container */}
              <div
                ref={scannerContainerRef}
                className={cn('overflow-hidden rounded-lg aspect-square w-full min-h-[300px]', !cameraActive && 'hidden')}
              />

              {cameraActive && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    leftIcon={<Zap className="h-4 w-4" />}
                    onClick={() => scannerRef.current?.toggleTorch()}
                  >
                    Toggle Flashlight
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={stopCamera}
                  >
                    Close Camera
                  </Button>
                </div>
              )}

              {barcodeLoading && (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              )}

              {barcodeResult && (
                <button
                  onClick={() => selectFood(barcodeResult)}
                  className="flex w-full items-center justify-between rounded-lg bg-[var(--color-bg-secondary)] px-3 py-3 text-left transition-colors hover:opacity-80"
                >
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">{barcodeResult.name}</p>
                    {barcodeResult.brand && (
                      <p className="text-xs text-[var(--color-text-secondary)]">{barcodeResult.brand}</p>
                    )}
                  </div>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {barcodeResult.calories} cal
                  </span>
                </button>
              )}

              {barcodeError && (
                <p className="py-2 text-center text-sm text-red-500">{barcodeError}</p>
              )}
            </div>
          </TabPanel>

          {/* My Meals Tab */}
          <TabPanel value="meals" activeValue={activeTab}>
            <div className="space-y-3">
              <Input
                placeholder="Filter meals..."
                value={mealSearch}
                onChange={(e) => setMealSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />

              {mealsLoading && !customMeals.length && (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg p-3">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-4 w-14" />
                    </div>
                  ))}
                </div>
              )}

              {!mealsLoading && filteredMeals.length > 0 && (
                <ul className="max-h-64 space-y-1 overflow-y-auto">
                  {filteredMeals.map((meal) => (
                    <li key={meal.id}>
                      <button
                        onClick={() => selectMeal(meal)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-bg-secondary)]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--color-text-primary)]">
                            {meal.name}
                          </p>
                          {meal.description && (
                            <p className="truncate text-xs text-[var(--color-text-secondary)]">
                              {meal.description}
                            </p>
                          )}
                        </div>
                        <span className="ml-3 shrink-0 text-sm text-[var(--color-text-secondary)]">
                          {meal.calories} cal
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!mealsLoading && mealSearch.trim() && filteredMeals.length === 0 && (
                <p className="py-4 text-center text-sm text-[var(--color-text-secondary)]">
                  No meals matching "{mealSearch}"
                </p>
              )}

              {!mealsLoading && !mealSearch.trim() && customMeals.length === 0 && (
                <p className="py-4 text-center text-sm text-[var(--color-text-secondary)]">
                  No custom meals yet.
                </p>
              )}

              <Button
                variant="secondary"
                className="w-full"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => window.open('/nutrition/meals', '_self')}
              >
                Create New Meal
              </Button>
            </div>
          </TabPanel>
        </div>
      )}
    </Modal>
  );
}
