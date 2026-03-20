import { Router, Request, Response } from 'express';
import db, { sqlite } from '../db/connection.js';
import { nutritionProfiles, foodLog, weightLog } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { clampOpt, truncateOpt, enumOpt, BOUNDS } from '../utils/validate.js';

const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const GOALS = ['lose', 'maintain', 'bulk'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

const router = Router();
router.use(authMiddleware);

// --- Helpers ---

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_OFFSETS: Record<string, number> = {
  lose: -500,
  maintain: 0,
  bulk: 300,
};

const MACRO_SPLITS: Record<string, { protein: number; carbs: number; fat: number }> = {
  lose: { protein: 0.4, carbs: 0.3, fat: 0.3 },
  maintain: { protein: 0.3, carbs: 0.4, fat: 0.3 },
  bulk: { protein: 0.3, carbs: 0.45, fat: 0.25 },
};

function computeNutrition(params: {
  height_in: number;
  weight_lbs: number;
  age: number;
  sex: string;
  activity_level: string;
  goal: string;
}) {
  const weight_kg = params.weight_lbs / 2.205;
  const height_cm = params.height_in * 2.54;

  const bmr =
    params.sex === 'male'
      ? 10 * weight_kg + 6.25 * height_cm - 5 * params.age + 5
      : 10 * weight_kg + 6.25 * height_cm - 5 * params.age - 161;

  const tdee = bmr * (ACTIVITY_MULTIPLIERS[params.activity_level] ?? 1.2);
  const calorie_target = Math.round(tdee + (GOAL_OFFSETS[params.goal] ?? 0));

  const split = MACRO_SPLITS[params.goal] ?? MACRO_SPLITS.maintain;
  const protein_g = Math.round((calorie_target * split.protein) / 4);
  const carbs_g = Math.round((calorie_target * split.carbs) / 4);
  const fat_g = Math.round((calorie_target * split.fat) / 9);

  return { bmr: Math.round(bmr * 10) / 10, tdee: Math.round(tdee * 10) / 10, calorie_target, protein_g, carbs_g, fat_g };
}

// --- Profile Routes ---

// POST /onboard — Create nutrition profile
router.post('/onboard', (req: Request, res: Response) => {
  const { height_ft, height_in: inchPart, weight_lbs, age, sex, activity_level, goal } = req.body;
  logger.debug('POST /nutrition/onboard', { sex, activity_level, goal });

  if (height_ft == null || inchPart == null || !weight_lbs || !age || !sex || !activity_level || !goal) {
    res.status(400).json({ error: 'All fields are required: height_ft, height_in, weight_lbs, age, sex, activity_level, goal' });
    return;
  }

  const validSex = enumOpt(sex, ['male', 'female'], 'male');
  const validActivity = enumOpt(activity_level, ACTIVITY_LEVELS, 'moderate');
  const validGoal = enumOpt(goal, GOALS, 'maintain');
  const height_in = Math.max(1, Math.min(Number(height_ft) * 12 + Number(inchPart), BOUNDS.heightIn.max));
  const validWeight = Math.max(BOUNDS.bodyWeight.min, Math.min(Number(weight_lbs), BOUNDS.bodyWeight.max));
  const validAge = Math.max(BOUNDS.age.min, Math.min(Number(age), BOUNDS.age.max));

  const computed = computeNutrition({ height_in, weight_lbs: validWeight, age: validAge, sex: validSex, activity_level: validActivity, goal: validGoal });

  const profile = db.insert(nutritionProfiles).values({
    user_id: req.userId!,
    height_in,
    weight_lbs: validWeight,
    age: validAge,
    sex: validSex,
    activity_level: validActivity,
    goal: validGoal,
    bmr: computed.bmr,
    tdee: computed.tdee,
    calorie_target: computed.calorie_target,
    protein_g: computed.protein_g,
    carbs_g: computed.carbs_g,
    fat_g: computed.fat_g,
  }).returning().get();

  res.status(201).json(profile);
});

// GET /profile — Get current nutrition profile
router.get('/profile', (req: Request, res: Response) => {
  const profile = db.select().from(nutritionProfiles).where(eq(nutritionProfiles.user_id, req.userId!)).get();

  if (!profile) {
    res.status(404).json({ error: 'Nutrition profile not found' });
    return;
  }

  res.json(profile);
});

// PUT /profile — Update nutrition profile
router.put('/profile', (req: Request, res: Response) => {
  const existing = db.select().from(nutritionProfiles).where(eq(nutritionProfiles.user_id, req.userId!)).get();

  if (!existing) {
    res.status(404).json({ error: 'Nutrition profile not found. Use POST /onboard first.' });
    return;
  }

  const { height_ft, height_in: inchPart, weight_lbs, age, sex, activity_level, goal } = req.body;

  const height_in =
    height_ft != null && inchPart != null
      ? Number(height_ft) * 12 + Number(inchPart)
      : existing.height_in;

  const merged = {
    height_in,
    weight_lbs: weight_lbs ?? existing.weight_lbs,
    age: age ?? existing.age,
    sex: sex ?? existing.sex,
    activity_level: activity_level ?? existing.activity_level,
    goal: goal ?? existing.goal,
  };

  const computed = computeNutrition(merged);

  db.update(nutritionProfiles).set({
    height_in: merged.height_in,
    weight_lbs: merged.weight_lbs,
    age: merged.age,
    sex: merged.sex,
    activity_level: merged.activity_level,
    goal: merged.goal,
    bmr: computed.bmr,
    tdee: computed.tdee,
    calorie_target: computed.calorie_target,
    protein_g: computed.protein_g,
    carbs_g: computed.carbs_g,
    fat_g: computed.fat_g,
    updated_at: sql`CURRENT_TIMESTAMP`,
  }).where(eq(nutritionProfiles.user_id, req.userId!)).run();

  const profile = db.select().from(nutritionProfiles).where(eq(nutritionProfiles.user_id, req.userId!)).get();
  res.json(profile);
});

// --- Daily Summary ---

// GET /daily?date=YYYY-MM-DD — Food log entries + totals for a date
router.get('/daily', (req: Request, res: Response) => {
  const now = new Date();
  const date = (req.query.date as string) || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const entries = sqlite.prepare(
    `SELECT fl.*, COALESCE(f.name, cm.name) as food_name
     FROM food_log fl
     LEFT JOIN foods f ON f.id = fl.food_id
     LEFT JOIN custom_meals cm ON cm.id = fl.custom_meal_id
     WHERE fl.user_id = ? AND fl.date = ?
     ORDER BY fl.logged_at`
  ).all(req.userId!, date) as Array<{
    calories: number; protein_g: number; carbs_g: number; fat_g: number;
  }>;

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein_g: acc.protein_g + e.protein_g,
      carbs_g: acc.carbs_g + e.carbs_g,
      fat_g: acc.fat_g + e.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const profile = db.select({
    calorie_target: nutritionProfiles.calorie_target,
    protein_g: nutritionProfiles.protein_g,
    carbs_g: nutritionProfiles.carbs_g,
    fat_g: nutritionProfiles.fat_g,
  }).from(nutritionProfiles).where(eq(nutritionProfiles.user_id, req.userId!)).get();

  const targets = profile
    ? { calories: profile.calorie_target, protein_g: profile.protein_g, carbs_g: profile.carbs_g, fat_g: profile.fat_g }
    : null;

  res.json({ date, entries, totals, targets });
});

// --- Food Log ---

// GET /log?days=30 — Food log history grouped by day
router.get('/log', (req: Request, res: Response) => {
  const days = Number(req.query.days) || 30;

  const rows = sqlite.prepare(
    `SELECT date,
            SUM(calories) as total_calories,
            SUM(protein_g) as total_protein,
            SUM(carbs_g) as total_carbs,
            SUM(fat_g) as total_fat,
            COUNT(*) as entry_count
     FROM food_log
     WHERE user_id = ? AND date >= date('now', '-' || ? || ' days')
     GROUP BY date
     ORDER BY date DESC`
  ).all(req.userId!, days);

  res.json(rows);
});

// GET /recent?limit=10 — Recent individual food log entries
router.get('/recent', (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  const entries = sqlite.prepare(
    `SELECT fl.id, fl.date, fl.meal_type, fl.calories, fl.protein_g, fl.carbs_g, fl.fat_g, fl.logged_at,
            COALESCE(f.name, cm.name) as food_name
     FROM food_log fl
     LEFT JOIN foods f ON f.id = fl.food_id
     LEFT JOIN custom_meals cm ON cm.id = fl.custom_meal_id
     WHERE fl.user_id = ?
     ORDER BY fl.logged_at DESC
     LIMIT ?`
  ).all(req.userId!, limit);

  res.json(entries);
});

// POST /log — Log a food entry
router.post('/log', (req: Request, res: Response) => {
  const { date, meal_type, food_id, custom_meal_id, servings } = req.body;
  logger.debug('POST /nutrition/log', { date, meal_type, food_id, custom_meal_id, servings });

  if (!date || !meal_type || (!food_id && !custom_meal_id)) {
    res.status(400).json({ error: 'date, meal_type, and either food_id or custom_meal_id are required' });
    return;
  }

  const validMealType = enumOpt(meal_type, MEAL_TYPES, 'snack');
  const s = Math.max(BOUNDS.servings.min, Math.min(Number(servings) || 1, BOUNDS.servings.max));
  let calories = 0;
  let protein_g = 0;
  let carbs_g = 0;
  let fat_g = 0;

  if (food_id) {
    const food = sqlite.prepare('SELECT * FROM foods WHERE id = ?').get(food_id) as {
      calories: number; protein_g: number; carbs_g: number; fat_g: number;
    } | undefined;

    if (!food) {
      res.status(404).json({ error: 'Food not found' });
      return;
    }

    calories = food.calories * s;
    protein_g = food.protein_g * s;
    carbs_g = food.carbs_g * s;
    fat_g = food.fat_g * s;
  } else if (custom_meal_id) {
    const meal = sqlite.prepare(
      'SELECT calories, protein_g, carbs_g, fat_g FROM custom_meals WHERE id = ?'
    ).get(custom_meal_id) as {
      calories: number; protein_g: number; carbs_g: number; fat_g: number;
    } | undefined;

    if (!meal) {
      res.status(404).json({ error: 'Custom meal not found' });
      return;
    }

    calories = meal.calories * s;
    protein_g = meal.protein_g * s;
    carbs_g = meal.carbs_g * s;
    fat_g = meal.fat_g * s;
  }

  const entry = db.insert(foodLog).values({
    user_id: req.userId!,
    date,
    meal_type: validMealType,
    food_id: food_id || null,
    custom_meal_id: custom_meal_id || null,
    servings: s,
    calories: Math.round(calories * 10) / 10,
    protein_g: Math.round(protein_g * 10) / 10,
    carbs_g: Math.round(carbs_g * 10) / 10,
    fat_g: Math.round(fat_g * 10) / 10,
  }).returning().get();

  res.status(201).json(entry);
});

// DELETE /log/:id — Delete a food log entry
router.delete('/log/:id', (req: Request, res: Response) => {
  const result = db.delete(foodLog).where(and(eq(foodLog.id, Number(req.params.id)), eq(foodLog.user_id, req.userId!))).run();

  if (result.changes === 0) {
    res.status(404).json({ error: 'Food log entry not found' });
    return;
  }

  res.status(204).send();
});

// --- Weight Log ---

// GET /weight-log?days=90 — Get weight entries
router.get('/weight-log', (req: Request, res: Response) => {
  const days = Number(req.query.days) || 90;

  const entries = sqlite.prepare(
    `SELECT * FROM weight_log
     WHERE user_id = ? AND date >= date('now', '-' || ? || ' days')
     ORDER BY date DESC`
  ).all(req.userId!, days);

  res.json(entries);
});

// POST /weight-log — Log weight
router.post('/weight-log', (req: Request, res: Response) => {
  const { date, weight_lbs, notes } = req.body;
  logger.debug('POST /nutrition/weight-log', { date, weight_lbs });

  if (!date || weight_lbs == null) {
    res.status(400).json({ error: 'date and weight_lbs are required' });
    return;
  }

  const validWeight = Math.max(BOUNDS.bodyWeight.min, Math.min(Number(weight_lbs), BOUNDS.bodyWeight.max));

  db.insert(weightLog).values({
    user_id: req.userId!,
    date,
    weight_lbs: validWeight,
    notes: truncateOpt(notes, BOUNDS.stringShort),
  }).onConflictDoUpdate({
    target: [weightLog.user_id, weightLog.date],
    set: { weight_lbs: validWeight, notes: truncateOpt(notes, BOUNDS.stringShort) },
  }).run();

  const entry = db.select().from(weightLog)
    .where(and(eq(weightLog.user_id, req.userId!), eq(weightLog.date, date)))
    .get();
  res.json(entry);
});

// --- Charts ---

// GET /charts — Chart data for calorie history, weight trend, energy balance
router.get('/charts', (req: Request, res: Response) => {
  const userId = req.userId!;

  // Last 30 days of daily calorie totals
  const calorieRows = sqlite.prepare(
    `SELECT date, SUM(calories) as calories
     FROM food_log
     WHERE user_id = ? AND date >= date('now', '-30 days')
     GROUP BY date
     ORDER BY date`
  ).all(userId) as Array<{ date: string; calories: number }>;

  // Get profile for target/TDEE
  const profile = db.select({
    calorie_target: nutritionProfiles.calorie_target,
    tdee: nutritionProfiles.tdee,
  }).from(nutritionProfiles).where(eq(nutritionProfiles.user_id, userId)).get();

  const target = profile?.calorie_target ?? null;
  const tdee = profile?.tdee ?? null;

  const calorie_history = calorieRows.map((r) => ({
    date: r.date,
    calories: r.calories,
    target,
  }));

  // Weight trend
  const weight_trend = sqlite.prepare(
    `SELECT date, weight_lbs
     FROM weight_log
     WHERE user_id = ? AND date >= date('now', '-90 days')
     ORDER BY date`
  ).all(userId) as Array<{ date: string; weight_lbs: number }>;

  // Energy balance (consumed vs TDEE)
  const energy_balance = calorieRows.map((r) => ({
    date: r.date,
    consumed: r.calories,
    tdee,
    balance: tdee != null ? Math.round(r.calories - tdee) : null,
  }));

  res.json({ calorie_history, weight_trend, energy_balance });
});

export default router;
