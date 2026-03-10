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
