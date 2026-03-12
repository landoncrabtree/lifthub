import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '@/api/client';
import { hapticSuccess } from '@/lib/haptics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import type { NutritionProfile, ActivityLevel, NutritionGoal } from '@/types';

const TOTAL_STEPS = 6;

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise, desk job' },
  { value: 'light', label: 'Lightly Active', desc: 'Light exercise 1–3 days/week' },
  { value: 'moderate', label: 'Moderately Active', desc: 'Moderate exercise 3–5 days/week' },
  { value: 'active', label: 'Active', desc: 'Hard exercise 6–7 days/week' },
  { value: 'very_active', label: 'Very Active', desc: 'Intense exercise daily or physical job' },
];

const GOAL_OPTIONS: { value: NutritionGoal; label: string; desc: string }[] = [
  { value: 'lose', label: 'Lose Weight', desc: 'Lose ~1 lb/week' },
  { value: 'maintain', label: 'Maintain', desc: 'Maintain current weight' },
  { value: 'bulk', label: 'Bulk Up', desc: 'Gain ~0.5 lb/week' },
];

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function calcPreview(
  weightLbs: number,
  heightFt: number,
  heightIn: number,
  age: number,
  sex: 'male' | 'female',
  activityLevel: ActivityLevel,
  goal: NutritionGoal,
) {
  const weightKg = weightLbs * 0.453592;
  const heightCm = (heightFt * 12 + heightIn) * 2.54;
  const bmr =
    sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIER[activityLevel]);

  let calories = tdee;
  if (goal === 'lose') calories = tdee - 500;
  if (goal === 'bulk') calories = tdee + 250;
  calories = Math.round(calories);

  const proteinG = Math.round(weightLbs);
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4);

  return { tdee, calories, proteinG, carbsG, fatG };
}

export default function NutritionOnboarding() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [weight, setWeight] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | ''>('');
  const [goal, setGoal] = useState<NutritionGoal | ''>('');

  // Redirect if already onboarded
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await get<NutritionProfile>('/nutrition/profile');
        if (!cancelled) navigate('/nutrition', { replace: true });
      } catch {
        // 404 = not onboarded, show wizard
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const canNext = (): boolean => {
    switch (step) {
      case 1: return Number(weight) > 0;
      case 2: return Number(heightFt) > 0 && Number(heightIn) >= 0 && Number(heightIn) < 12;
      case 3: return Number(age) > 0;
      case 4: return activityLevel !== '';
      case 5: return goal !== '';
      default: return true;
    }
  };

  const handleSave = async () => {
    if (activityLevel === '' || goal === '') return;
    setSaving(true);
    setError(null);
    try {
      await post<NutritionProfile>('/nutrition/onboard', {
        height_ft: Number(heightFt),
        height_in: Number(heightIn),
        weight_lbs: Number(weight),
        age: Number(age),
        sex,
        activity_level: activityLevel,
        goal,
      });
      navigate('/nutrition', { replace: true });
      hapticSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="h-8 w-8 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const preview =
    step === 6 && activityLevel !== '' && goal !== ''
      ? calcPreview(Number(weight), Number(heightFt), Number(heightIn), Number(age), sex, activityLevel, goal)
      : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Progress indicator */}
      <div className="mb-6 text-center">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          Step {step} of {TOTAL_STEPS}
        </p>
        <div className="mt-2 flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < step ? 'bg-brand-600' : 'bg-[var(--color-border)]'
              }`}
            />
          ))}
        </div>
      </div>

      <Card>
        {/* Step 1: Weight */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">What's your weight?</h2>
            <Input
              label="Weight (lbs)"
              type="number"
              min={1}
              placeholder="e.g. 170"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
        )}

        {/* Step 2: Height */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">What's your height?</h2>
            <div className="flex gap-3">
              <Input
                label="Feet"
                type="number"
                min={1}
                max={8}
                placeholder="5"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
                wrapperClassName="flex-1"
              />
              <Input
                label="Inches"
                type="number"
                min={0}
                max={11}
                placeholder="10"
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                wrapperClassName="flex-1"
              />
            </div>
          </div>
        )}

        {/* Step 3: Age & Sex */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Age &amp; Sex</h2>
            <Input
              label="Age"
              type="number"
              min={1}
              placeholder="e.g. 25"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-[var(--color-text)]">Sex</span>
              <div className="flex gap-2">
                {(['male', 'female'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSex(s)}
                    className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      sex === s
                        ? 'border-brand-600 bg-brand-600/10 text-brand-600'
                        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-tertiary)]'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Activity Level */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Activity Level</h2>
            <div className="space-y-2">
              {ACTIVITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setActivityLevel(opt.value)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                    activityLevel === opt.value
                      ? 'border-brand-600 bg-brand-600/10'
                      : 'border-[var(--color-border)] hover:border-[var(--color-text-tertiary)]'
                  }`}
                >
                  <p className={`text-sm font-medium ${
                    activityLevel === opt.value ? 'text-brand-600' : 'text-[var(--color-text)]'
                  }`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Goal */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">What's your goal?</h2>
            <div className="space-y-2">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGoal(opt.value)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                    goal === opt.value
                      ? 'border-brand-600 bg-brand-600/10'
                      : 'border-[var(--color-border)] hover:border-[var(--color-text-tertiary)]'
                  }`}
                >
                  <p className={`text-sm font-medium ${
                    goal === opt.value ? 'text-brand-600' : 'text-[var(--color-text)]'
                  }`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Results */}
        {step === 6 && preview && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Your Nutrition Plan</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[var(--color-bg-secondary)] p-4 text-center">
                <p className="text-xs font-medium uppercase text-[var(--color-text-tertiary)]">TDEE</p>
                <p className="mt-1 text-2xl font-bold text-[var(--color-text)]">{preview.tdee}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">cal/day</p>
              </div>
              <div className="rounded-lg bg-[var(--color-bg-secondary)] p-4 text-center">
                <p className="text-xs font-medium uppercase text-[var(--color-text-tertiary)]">Target</p>
                <p className="mt-1 text-2xl font-bold text-brand-600">{preview.calories}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">cal/day</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-text)]">Macro Breakdown</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-[var(--color-bg-secondary)] p-3 text-center">
                  <p className="text-xs text-[var(--color-text-tertiary)]">Protein</p>
                  <p className="text-lg font-bold text-[var(--color-text)]">{preview.proteinG}g</p>
                </div>
                <div className="rounded-lg bg-[var(--color-bg-secondary)] p-3 text-center">
                  <p className="text-xs text-[var(--color-text-tertiary)]">Carbs</p>
                  <p className="text-lg font-bold text-[var(--color-text)]">{preview.carbsG}g</p>
                </div>
                <div className="rounded-lg bg-[var(--color-bg-secondary)] p-3 text-center">
                  <p className="text-xs text-[var(--color-text-tertiary)]">Fat</p>
                  <p className="text-lg font-bold text-[var(--color-text)]">{preview.fatG}g</p>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="mt-6 flex gap-3">
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1">
            Back
          </Button>
        )}
        {step < TOTAL_STEPS && (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()} className="flex-1">
            Next
          </Button>
        )}
        {step === TOTAL_STEPS && (
          <Button onClick={handleSave} loading={saving} disabled={saving} className="flex-1">
            Save &amp; Continue
          </Button>
        )}
      </div>
    </div>
  );
}
