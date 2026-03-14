import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── Users ──────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ─── Exercises ──────────────────────────────────────────────
export const exercises = sqliteTable('exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').references(() => users.id),
  name: text('name').notNull(),
  muscle_group: text('muscle_group').notNull(),
  equipment: text('equipment'),
  description: text('description'),
}, (table) => [
  index('idx_exercises_muscle').on(table.muscle_group),
  index('idx_exercises_user').on(table.user_id),
]);

// ─── Templates ──────────────────────────────────────────────
export const templates = sqliteTable('templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  json_data: text('json_data').notNull().default('[]'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_templates_user').on(table.user_id),
]);

// ─── Template Exercises ─────────────────────────────────────
export const templateExercises = sqliteTable('template_exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  template_id: integer('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  exercise_id: integer('exercise_id').notNull().references(() => exercises.id),
  order_index: integer('order_index').notNull(),
  sets: integer('sets').notNull().default(3),
  reps: text('reps').notNull().default('10'),
  rest_seconds: integer('rest_seconds'),
  set_type: text('set_type').default('normal'),
  notes: text('notes'),
});

// ─── Workouts ───────────────────────────────────────────────
export const workouts = sqliteTable('workouts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  template_id: integer('template_id').references(() => templates.id),
  name: text('name').notNull(),
  started_at: text('started_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  finished_at: text('finished_at'),
  notes: text('notes'),
}, (table) => [
  index('idx_workouts_user').on(table.user_id),
  index('idx_workouts_template').on(table.template_id),
  index('idx_workouts_started').on(table.started_at),
]);

// ─── Workout Sets ───────────────────────────────────────────
export const workoutSets = sqliteTable('workout_sets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workout_id: integer('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
  exercise_id: integer('exercise_id').notNull().references(() => exercises.id),
  set_index: integer('set_index').notNull().default(0),
  set_type: text('set_type').default('normal'),
  reps: integer('reps'),
  weight: real('weight'),
  rpe: real('rpe'),
  to_failure: integer('to_failure').default(0),
  completed: integer('completed').default(0),
  notes: text('notes'),
}, (table) => [
  index('idx_workout_sets_workout').on(table.workout_id),
  index('idx_workout_sets_exercise').on(table.exercise_id),
]);

// ─── Nutrition Profiles ─────────────────────────────────────
export const nutritionProfiles = sqliteTable('nutrition_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().unique().references(() => users.id),
  height_in: real('height_in').notNull(),
  weight_lbs: real('weight_lbs').notNull(),
  age: integer('age').notNull(),
  sex: text('sex').notNull(),
  activity_level: text('activity_level').notNull(),
  goal: text('goal').notNull(),
  bmr: real('bmr').notNull(),
  tdee: real('tdee').notNull(),
  calorie_target: integer('calorie_target').notNull(),
  protein_g: integer('protein_g').notNull(),
  carbs_g: integer('carbs_g').notNull(),
  fat_g: integer('fat_g').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_nutrition_profiles_user').on(table.user_id),
]);

// ─── Foods ──────────────────────────────────────────────────
export const foods = sqliteTable('foods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').references(() => users.id),
  barcode: text('barcode'),
  name: text('name').notNull(),
  brand: text('brand'),
  serving_size: real('serving_size').notNull().default(1),
  serving_unit: text('serving_unit').notNull().default('serving'),
  calories: real('calories').notNull().default(0),
  protein_g: real('protein_g').notNull().default(0),
  carbs_g: real('carbs_g').notNull().default(0),
  fat_g: real('fat_g').notNull().default(0),
  source: text('source').notNull().default('custom'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_foods_user').on(table.user_id),
  index('idx_foods_barcode').on(table.barcode),
]);

// ─── Custom Meals ───────────────────────────────────────────
export const customMeals = sqliteTable('custom_meals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  calories: real('calories').notNull().default(0),
  protein_g: real('protein_g').notNull().default(0),
  carbs_g: real('carbs_g').notNull().default(0),
  fat_g: real('fat_g').notNull().default(0),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_custom_meals_user').on(table.user_id),
]);

// ─── Food Log ───────────────────────────────────────────────
export const foodLog = sqliteTable('food_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  date: text('date').notNull(),
  meal_type: text('meal_type').notNull(),
  food_id: integer('food_id').references(() => foods.id),
  custom_meal_id: integer('custom_meal_id').references(() => customMeals.id),
  servings: real('servings').notNull().default(1),
  calories: real('calories').notNull().default(0),
  protein_g: real('protein_g').notNull().default(0),
  carbs_g: real('carbs_g').notNull().default(0),
  fat_g: real('fat_g').notNull().default(0),
  logged_at: text('logged_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_food_log_user_date').on(table.user_id, table.date),
]);

// ─── Weight Log ─────────────────────────────────────────────
export const weightLog = sqliteTable('weight_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  date: text('date').notNull(),
  weight_lbs: real('weight_lbs').notNull(),
  notes: text('notes'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('idx_weight_log_user_date').on(table.user_id, table.date),
]);
