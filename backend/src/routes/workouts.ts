import { Router, Request, Response } from 'express';
import db, { sqlite } from '../db/connection.js';
import { workouts, workoutSets } from '../db/schema.js';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();
router.use(authMiddleware);

// List workouts with optional date range
router.get('/', (req: Request, res: Response) => {
  // Auto-finish stale workouts older than 24 hours (complex datetime – raw sqlite)
  sqlite.prepare(
    `UPDATE workouts
     SET finished_at = datetime(started_at, '+1 hour')
     WHERE user_id = ? AND finished_at IS NULL
       AND started_at < datetime('now', '-24 hours')`
  ).run(req.userId!);

  const { from, to } = req.query;

  const conditions = [eq(workouts.user_id, req.userId!)];
  if (from) conditions.push(gte(workouts.started_at, String(from)));
  if (to) conditions.push(lte(workouts.started_at, String(to)));

  const result = db.select().from(workouts)
    .where(and(...conditions))
    .orderBy(desc(workouts.started_at))
    .all();

  res.json(result);
});

// Get workout detail with all sets
router.get('/:id', (req: Request, res: Response) => {
  const workout = db.select().from(workouts)
    .where(and(eq(workouts.id, Number(req.params.id)), eq(workouts.user_id, req.userId!)))
    .get();

  if (!workout) {
    res.status(404).json({ error: 'Workout not found' });
    return;
  }

  // Multi-table JOIN with template lookup – raw sqlite
  const sets = sqlite.prepare(
    `SELECT ws.*, e.name as exercise_name, e.muscle_group, e.equipment,
            te.rest_seconds
     FROM workout_sets ws
     JOIN exercises e ON ws.exercise_id = e.id
     LEFT JOIN workouts w2 ON ws.workout_id = w2.id
     LEFT JOIN template_exercises te ON w2.template_id = te.template_id AND ws.exercise_id = te.exercise_id
     WHERE ws.workout_id = ?
     ORDER BY COALESCE(te.order_index, 999999), ws.exercise_id, ws.set_index`
  ).all(workout.id);

  res.json({ ...workout, sets });
});

// Create ad-hoc workout
router.post('/', (req: Request, res: Response) => {
  const { name, notes } = req.body;
  logger.debug('POST /workouts', { name });

  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const workout = db.insert(workouts).values({
    user_id: req.userId!,
    name,
    notes: notes || null,
  }).returning().get();

  res.status(201).json(workout);
});

// Update workout (finish, edit notes)
router.put('/:id', (req: Request, res: Response) => {
  logger.debug('PUT /workouts/:id', { id: req.params.id, finished: req.body.finished });
  const existing = db.select().from(workouts)
    .where(and(eq(workouts.id, Number(req.params.id)), eq(workouts.user_id, req.userId!)))
    .get();

  if (!existing) {
    res.status(404).json({ error: 'Workout not found' });
    return;
  }

  const { name, notes, finished } = req.body;

  const updateData: Record<string, unknown> = {};
  if (name != null) updateData.name = name;
  if (notes != null) updateData.notes = notes;
  if (finished) updateData.finished_at = sql`CURRENT_TIMESTAMP`;

  if (Object.keys(updateData).length > 0) {
    db.update(workouts).set(updateData).where(and(eq(workouts.id, Number(req.params.id)), eq(workouts.user_id, req.userId!))).run();
  }

  const updated = db.select().from(workouts)
    .where(and(eq(workouts.id, Number(req.params.id)), eq(workouts.user_id, req.userId!)))
    .get();

  res.json(updated);
});

// Delete workout
router.delete('/:id', (req: Request, res: Response) => {
  const result = db.delete(workouts)
    .where(and(eq(workouts.id, Number(req.params.id)), eq(workouts.user_id, req.userId!)))
    .run();

  if (result.changes === 0) {
    res.status(404).json({ error: 'Workout not found' });
    return;
  }

  res.status(204).send();
});

// Log a set (or batch)
router.post('/:id/sets', (req: Request, res: Response) => {
  logger.debug('POST /workouts/:id/sets', { workoutId: req.params.id, count: Array.isArray(req.body) ? req.body.length : 1 });
  const workout = db.select().from(workouts)
    .where(and(eq(workouts.id, Number(req.params.id)), eq(workouts.user_id, req.userId!)))
    .get();

  if (!workout) {
    res.status(404).json({ error: 'Workout not found' });
    return;
  }

  const sets = Array.isArray(req.body) ? req.body : [req.body];

  const results = sets.map((s: Record<string, unknown>) =>
    db.insert(workoutSets).values({
      workout_id: workout.id,
      exercise_id: s.exercise_id as number,
      set_index: (s.set_index as number) || 0,
      set_type: (s.set_type as string) || 'normal',
      reps: (s.reps as number) || null,
      weight: (s.weight as number) || null,
      rpe: (s.rpe as number) || null,
      to_failure: s.to_failure ? 1 : 0,
      completed: s.completed ? 1 : 0,
      notes: (s.notes as string) || null,
    }).returning().get()
  );

  res.status(201).json(results.length === 1 ? results[0] : results);
});

// Update a set
router.put('/:id/sets/:setId', (req: Request, res: Response) => {
  logger.debug('PUT /workouts/:id/sets/:setId', { workoutId: req.params.id, setId: req.params.setId });
  const workout = db.select().from(workouts)
    .where(and(eq(workouts.id, Number(req.params.id)), eq(workouts.user_id, req.userId!)))
    .get();

  if (!workout) {
    res.status(404).json({ error: 'Workout not found' });
    return;
  }

  const existing = db.select().from(workoutSets)
    .where(and(eq(workoutSets.id, Number(req.params.setId)), eq(workoutSets.workout_id, workout.id)))
    .get();

  if (!existing) {
    res.status(404).json({ error: 'Set not found' });
    return;
  }

  const { reps, weight, rpe, to_failure, completed, set_type, notes } = req.body;

  const updateData: Record<string, unknown> = {};
  if (reps != null) updateData.reps = reps;
  if (weight != null) updateData.weight = weight;
  if (rpe != null) updateData.rpe = rpe;
  if (to_failure !== undefined) updateData.to_failure = to_failure ? 1 : 0;
  if (completed !== undefined) updateData.completed = completed ? 1 : 0;
  if (set_type != null) updateData.set_type = set_type;
  if (notes != null) updateData.notes = notes;

  if (Object.keys(updateData).length > 0) {
    db.update(workoutSets).set(updateData).where(eq(workoutSets.id, Number(req.params.setId))).run();
  }

  const updated = db.select().from(workoutSets)
    .where(eq(workoutSets.id, Number(req.params.setId)))
    .get();

  res.json(updated);
});

export default router;
