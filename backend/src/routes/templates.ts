import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Template, TemplateExerciseRow, Workout } from '../types/index.js';

const router = Router();
router.use(authMiddleware);

function syncTemplateExercises(templateId: number, jsonData: string) {
  db.prepare('DELETE FROM template_exercises WHERE template_id = ?').run(templateId);

  let exercises: Array<{
    exercise_id: number;
    order_index: number;
    sets: number;
    reps: string;
    rest_seconds: number | null;
    set_type: string;
    notes: string | null;
  }>;

  try {
    exercises = JSON.parse(jsonData);
  } catch {
    return;
  }

  if (!Array.isArray(exercises)) return;

  const insert = db.prepare(
    `INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps, rest_seconds, set_type, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const ex of exercises) {
    insert.run(
      templateId,
      ex.exercise_id,
      ex.order_index,
      ex.sets || 3,
      String(ex.reps || '10'),
      ex.rest_seconds || null,
      ex.set_type || 'normal',
      ex.notes || null
    );
  }
}

// List templates
router.get('/', (req: Request, res: Response) => {
  const templates = db
    .prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY updated_at DESC')
    .all(req.userId!) as Template[];

  res.json(templates.map((t) => ({ ...t, json_data: JSON.parse(t.json_data) })));
});

// Get template detail
router.get('/:id', (req: Request, res: Response) => {
  const template = db
    .prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId!) as Template | undefined;

  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  // Include exercise details
  const exercises = db
    .prepare(
      `SELECT te.*, e.name as exercise_name, e.muscle_group, e.equipment
       FROM template_exercises te
       JOIN exercises e ON te.exercise_id = e.id
       WHERE te.template_id = ?
       ORDER BY te.order_index`
    )
    .all(template.id) as (TemplateExerciseRow & { exercise_name: string; muscle_group: string; equipment: string })[];

  res.json({
    ...template,
    json_data: JSON.parse(template.json_data),
    exercises,
  });
});

// Create template
router.post('/', (req: Request, res: Response) => {
  const { name, description, json_data } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const jsonStr = JSON.stringify(json_data || []);

  const result = db
    .prepare('INSERT INTO templates (user_id, name, description, json_data) VALUES (?, ?, ?, ?)')
    .run(req.userId!, name, description || null, jsonStr);

  const templateId = result.lastInsertRowid as number;
  syncTemplateExercises(templateId, jsonStr);

  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId) as Template;
  res.status(201).json({ ...template, json_data: JSON.parse(template.json_data) });
});

// Update template
router.put('/:id', (req: Request, res: Response) => {
  const existing = db
    .prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId!) as Template | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  const { name, description, json_data } = req.body;
  const jsonStr = json_data ? JSON.stringify(json_data) : existing.json_data;

  db.prepare(
    `UPDATE templates SET name = COALESCE(?, name), description = COALESCE(?, description),
     json_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(name, description, jsonStr, req.params.id);

  syncTemplateExercises(Number(req.params.id), jsonStr);

  const updated = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id) as Template;
  res.json({ ...updated, json_data: JSON.parse(updated.json_data) });
});

// Delete template
router.delete('/:id', (req: Request, res: Response) => {
  const result = db
    .prepare('DELETE FROM templates WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.userId!);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  res.status(204).send();
});

// Start workout from template
router.post('/:id/start', (req: Request, res: Response) => {
  const template = db
    .prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId!) as Template | undefined;

  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  // Create workout
  const workoutResult = db
    .prepare(
      'INSERT INTO workouts (user_id, template_id, name, started_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
    )
    .run(req.userId!, template.id, template.name);

  const workoutId = workoutResult.lastInsertRowid as number;

  // Get template exercises with names
  const exercises = db
    .prepare(
      `SELECT te.*, e.name as exercise_name FROM template_exercises te
       JOIN exercises e ON te.exercise_id = e.id
       WHERE te.template_id = ? ORDER BY te.order_index`
    )
    .all(template.id) as (TemplateExerciseRow & { exercise_name: string })[];

  // Get last workout data for progressive overload
  const lastWorkout = db
    .prepare(
      `SELECT id FROM workouts
       WHERE user_id = ? AND template_id = ? AND finished_at IS NOT NULL
       ORDER BY started_at DESC LIMIT 1`
    )
    .get(req.userId!, template.id) as { id: number } | undefined;

  const insertSet = db.prepare(
    `INSERT INTO workout_sets (workout_id, exercise_id, set_index, set_type, reps, weight, to_failure)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const setsToReturn: Array<{
    exercise_id: number;
    exercise_name: string;
    set_index: number;
    set_type: string;
    target_reps: string;
    rest_seconds: number | null;
    last_weight: number | null;
    last_reps: number | null;
  }> = [];

  for (const ex of exercises) {
    // Get last performance for this exercise
    let lastSets: Array<{ set_index: number; weight: number; reps: number }> = [];
    if (lastWorkout) {
      lastSets = db
        .prepare(
          `SELECT set_index, weight, reps FROM workout_sets
           WHERE workout_id = ? AND exercise_id = ? AND completed = 1
           ORDER BY set_index`
        )
        .all(lastWorkout.id, ex.exercise_id) as typeof lastSets;
    }

    for (let i = 0; i < ex.sets; i++) {
      const lastSet = lastSets[i] || null;
      const toFailure = ex.reps === 'to_failure' || ex.reps === 'AMRAP' ? 1 : 0;

      insertSet.run(
        workoutId,
        ex.exercise_id,
        i,
        ex.set_type,
        lastSet?.reps || null,
        lastSet?.weight || null,
        toFailure
      );

      setsToReturn.push({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        set_index: i,
        set_type: ex.set_type,
        target_reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        last_weight: lastSet?.weight || null,
        last_reps: lastSet?.reps || null,
      });
    }
  }

  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(workoutId) as Workout;

  res.status(201).json({
    ...workout,
    sets: setsToReturn,
  });
});

export default router;
