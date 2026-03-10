import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Workout, WorkoutSet } from '../types/index.js';

const router = Router();
router.use(authMiddleware);

// List workouts with optional date range
router.get('/', (req: Request, res: Response) => {
  // Auto-finish stale workouts older than 24 hours
  db.prepare(
    `UPDATE workouts
     SET finished_at = datetime(started_at, '+1 hour')
     WHERE user_id = ? AND finished_at IS NULL
       AND started_at < datetime('now', '-24 hours')`
  ).run(req.userId!);

  const { from, to } = req.query;

  let sql = 'SELECT * FROM workouts WHERE user_id = ?';
  const params: unknown[] = [req.userId!];

  if (from) {
    sql += ' AND started_at >= ?';
    params.push(from);
  }

  if (to) {
    sql += ' AND started_at <= ?';
    params.push(to);
  }

  sql += ' ORDER BY started_at DESC';

  const workouts = db.prepare(sql).all(...params) as Workout[];
  res.json(workouts);
});

// Get workout detail with all sets
router.get('/:id', (req: Request, res: Response) => {
  const workout = db
    .prepare('SELECT * FROM workouts WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId!) as Workout | undefined;

  if (!workout) {
    res.status(404).json({ error: 'Workout not found' });
    return;
  }

  const sets = db
    .prepare(
      `SELECT ws.*, e.name as exercise_name, e.muscle_group, e.equipment,
              te.rest_seconds
       FROM workout_sets ws
       JOIN exercises e ON ws.exercise_id = e.id
       LEFT JOIN workouts w2 ON ws.workout_id = w2.id
       LEFT JOIN template_exercises te ON w2.template_id = te.template_id AND ws.exercise_id = te.exercise_id
       WHERE ws.workout_id = ?
       ORDER BY ws.exercise_id, ws.set_index`
    )
    .all(workout.id) as (WorkoutSet & { exercise_name: string; muscle_group: string; rest_seconds: number | null })[];

  res.json({ ...workout, sets });
});

// Create ad-hoc workout
router.post('/', (req: Request, res: Response) => {
  const { name, notes } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const result = db
    .prepare(
      'INSERT INTO workouts (user_id, name, started_at, notes) VALUES (?, ?, CURRENT_TIMESTAMP, ?)'
    )
    .run(req.userId!, name, notes || null);

  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(result.lastInsertRowid) as Workout;
  res.status(201).json(workout);
});

// Update workout (finish, edit notes)
router.put('/:id', (req: Request, res: Response) => {
  const existing = db
    .prepare('SELECT * FROM workouts WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId!) as Workout | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Workout not found' });
    return;
  }

  const { name, notes, finished } = req.body;

  if (finished) {
    db.prepare('UPDATE workouts SET finished_at = CURRENT_TIMESTAMP, name = COALESCE(?, name), notes = COALESCE(?, notes) WHERE id = ?')
      .run(name, notes, req.params.id);
  } else {
    db.prepare('UPDATE workouts SET name = COALESCE(?, name), notes = COALESCE(?, notes) WHERE id = ?')
      .run(name, notes, req.params.id);
  }

  const updated = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id) as Workout;
  res.json(updated);
});

// Delete workout
router.delete('/:id', (req: Request, res: Response) => {
  const result = db
    .prepare('DELETE FROM workouts WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.userId!);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Workout not found' });
    return;
  }

  res.status(204).send();
});

// Log a set (or batch)
router.post('/:id/sets', (req: Request, res: Response) => {
  const workout = db
    .prepare('SELECT * FROM workouts WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId!) as Workout | undefined;

  if (!workout) {
    res.status(404).json({ error: 'Workout not found' });
    return;
  }

  const sets = Array.isArray(req.body) ? req.body : [req.body];

  const insert = db.prepare(
    `INSERT INTO workout_sets (workout_id, exercise_id, set_index, set_type, reps, weight, rpe, to_failure, completed, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const results: WorkoutSet[] = [];

  for (const s of sets) {
    const result = insert.run(
      workout.id,
      s.exercise_id,
      s.set_index || 0,
      s.set_type || 'normal',
      s.reps || null,
      s.weight || null,
      s.rpe || null,
      s.to_failure ? 1 : 0,
      s.completed ? 1 : 0,
      s.notes || null
    );
    const created = db.prepare('SELECT * FROM workout_sets WHERE id = ?').get(result.lastInsertRowid) as WorkoutSet;
    results.push(created);
  }

  res.status(201).json(results.length === 1 ? results[0] : results);
});

// Update a set
router.put('/:id/sets/:setId', (req: Request, res: Response) => {
  const workout = db
    .prepare('SELECT * FROM workouts WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId!) as Workout | undefined;

  if (!workout) {
    res.status(404).json({ error: 'Workout not found' });
    return;
  }

  const existing = db
    .prepare('SELECT * FROM workout_sets WHERE id = ? AND workout_id = ?')
    .get(req.params.setId, workout.id) as WorkoutSet | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Set not found' });
    return;
  }

  const { reps, weight, rpe, to_failure, completed, set_type, notes } = req.body;

  db.prepare(
    `UPDATE workout_sets SET
       reps = COALESCE(?, reps),
       weight = COALESCE(?, weight),
       rpe = COALESCE(?, rpe),
       to_failure = COALESCE(?, to_failure),
       completed = COALESCE(?, completed),
       set_type = COALESCE(?, set_type),
       notes = COALESCE(?, notes)
     WHERE id = ?`
  ).run(
    reps ?? null,
    weight ?? null,
    rpe ?? null,
    to_failure !== undefined ? (to_failure ? 1 : 0) : null,
    completed !== undefined ? (completed ? 1 : 0) : null,
    set_type ?? null,
    notes ?? null,
    req.params.setId
  );

  const updated = db.prepare('SELECT * FROM workout_sets WHERE id = ?').get(req.params.setId) as WorkoutSet;
  res.json(updated);
});

export default router;
