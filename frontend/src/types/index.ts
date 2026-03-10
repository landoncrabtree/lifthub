// Shared frontend types

export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface Exercise {
  id: number;
  user_id: number | null;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment | null;
  description: string | null;
}

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'full_body'
  | 'cardio';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other';

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export type RepScheme = number | string; // number or "AMRAP", "to_failure", "8-12"

export interface TemplateExercise {
  exercise_id: number;
  exercise?: Exercise;
  order_index: number;
  sets: number;
  reps: RepScheme;
  rest_seconds: number | null;
  set_type: SetType;
  notes: string | null;
}

export interface Template {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  json_data: TemplateExercise[];
  created_at: string;
  updated_at: string;
}

export interface Workout {
  id: number;
  user_id: number;
  template_id: number | null;
  name: string;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
}

export interface WorkoutSet {
  id: number;
  workout_id: number;
  exercise_id: number;
  exercise?: Exercise;
  set_index: number;
  set_type: SetType;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  to_failure: boolean;
  completed: boolean;
  notes: string | null;
}

export interface WorkoutDetail extends Workout {
  sets: WorkoutSet[];
}

export interface ProgressDataPoint {
  date: string;
  max_weight: number | null;
  max_reps: number | null;
  volume: number;
  avg_rpe: number | null;
  estimated_1rm: number | null;
}

export interface ProgressSummary {
  total_workouts: number;
  current_streak: number;
  this_week: number;
  personal_records: { exercise_name: string; weight: number; date: string }[];
  heatmap: { date: string; count: number }[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  error: string;
  details?: string;
}

// ─── Nutrition ────────────────────────────────────────────────────────────────

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type NutritionGoal = 'lose' | 'maintain' | 'bulk';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface NutritionProfile {
  id: number;
  user_id: number;
  height_in: number;
  weight_lbs: number;
  age: number;
  sex: 'male' | 'female';
  activity_level: ActivityLevel;
  goal: NutritionGoal;
  bmr: number;
  tdee: number;
  calorie_target: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Food {
  id: number;
  user_id: number | null;
  barcode: string | null;
  name: string;
  brand: string | null;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: 'custom' | 'openfoodfacts';
}

export interface FoodLogEntry {
  id: number;
  date: string;
  meal_type: MealType;
  food_id: number | null;
  custom_meal_id: number | null;
  food_name?: string;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at: string;
}

export interface DailySummary {
  date: string;
  entries: FoodLogEntry[];
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  targets: { calories: number; protein_g: number; carbs_g: number; fat_g: number } | null;
}

export interface CustomMeal {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface WeightEntry {
  id: number;
  date: string;
  weight_lbs: number;
  notes: string | null;
}

export interface DayLogSummary {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  entry_count: number;
}

export interface NutritionChartData {
  calorie_history: { date: string; calories: number; target: number }[];
  weight_trend: { date: string; weight_lbs: number }[];
  energy_balance: { date: string; consumed: number; tdee: number; balance: number }[];
}
