export interface User {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  created_at: string;
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

export interface Exercise {
  id: number;
  user_id: number | null;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment | null;
  description: string | null;
}

export interface Template {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  json_data: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateExerciseRow {
  id: number;
  template_id: number;
  exercise_id: number;
  order_index: number;
  sets: number;
  reps: string;
  rest_seconds: number | null;
  set_type: SetType;
  notes: string | null;
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
  set_index: number;
  set_type: SetType;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  to_failure: number;
  completed: number;
  notes: string | null;
}

// Express request augmentation
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}
