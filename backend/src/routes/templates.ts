import { Router, Request, Response } from 'express';
import db, { sqlite } from '../db/connection.js';
import { templates, templateExercises, exercises } from '../db/schema.js';
import { eq, and, desc, asc, getTableColumns, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Uses raw sqlite for the multi-row DELETE + INSERT loop
function syncTemplateExercises(templateId: number, jsonData: string) {
  sqlite.prepare('DELETE FROM template_exercises WHERE template_id = ?').run(templateId);

  let exerciseList: Array<{
    exercise_id: number;
    order_index: number;
    sets: number;
    reps: string;
    rest_seconds: number | null;
    set_type: string;
    notes: string | null;
  }>;

  try {
    exerciseList = JSON.parse(jsonData);
  } catch {
    return;
  }

  if (!Array.isArray(exerciseList)) return;

  const insert = sqlite.prepare(
    `INSERT INTO template_exercises (template_id, exercise_id, order_index, sets, reps, rest_seconds, set_type, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const ex of exerciseList) {
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
  const rows = db
    .select()
    .from(templates)
    .where(eq(templates.user_id, req.userId!))
    .orderBy(desc(templates.updated_at))
    .all();

  res.json(rows.map((t) => ({ ...t, json_data: JSON.parse(t.json_data) })));
});

// Get template detail
router.get('/:id', (req: Request, res: Response) => {
  const template = db
    .select()
    .from(templates)
    .where(and(eq(templates.id, Number(req.params.id)), eq(templates.user_id, req.userId!)))
    .get();

  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  const exerciseRows = db
    .select({
      ...getTableColumns(templateExercises),
      exercise_name: exercises.name,
      muscle_group: exercises.muscle_group,
      equipment: exercises.equipment,
    })
    .from(templateExercises)
    .innerJoin(exercises, eq(templateExercises.exercise_id, exercises.id))
    .where(eq(templateExercises.template_id, template.id))
    .orderBy(asc(templateExercises.order_index))
    .all();

  res.json({
    ...template,
    json_data: JSON.parse(template.json_data),
    exercises: exerciseRows,
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

  const template = db
    .insert(templates)
    .values({ user_id: req.userId!, name, description: description || null, json_data: jsonStr })
    .returning()
    .get();

  syncTemplateExercises(template.id, jsonStr);

  res.status(201).json({ ...template, json_data: JSON.parse(template.json_data) });
});

// Update template
router.put('/:id', (req: Request, res: Response) => {
  const existing = db
    .select()
    .from(templates)
    .where(and(eq(templates.id, Number(req.params.id)), eq(templates.user_id, req.userId!)))
    .get();

  if (!existing) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  const { name, description, json_data } = req.body;
  const jsonStr = json_data ? JSON.stringify(json_data) : existing.json_data;

  const updated = db
    .update(templates)
    .set({
      name: name ?? existing.name,
      description: description ?? existing.description,
      json_data: jsonStr,
      updated_at: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(templates.id, Number(req.params.id)))
    .returning()
    .get();

  syncTemplateExercises(Number(req.params.id), jsonStr);

  res.json({ ...updated, json_data: JSON.parse(updated.json_data) });
});

// Delete template
router.delete('/:id', (req: Request, res: Response) => {
  const result = db
    .delete(templates)
    .where(and(eq(templates.id, Number(req.params.id)), eq(templates.user_id, req.userId!)))
    .run();

  if (result.changes === 0) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  res.status(204).send();
});

// Start workout from template — uses raw sqlite for complex JOINs and progressive overload logic
router.post('/:id/start', (req: Request, res: Response) => {
  const template = sqlite
    .prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?')
    .get(Number(req.params.id), req.userId!) as
    | { id: number; name: string; json_data: string }
    | undefined;

  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  const workoutResult = sqlite
    .prepare(
      'INSERT INTO workouts (user_id, template_id, name, started_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
    )
    .run(req.userId!, template.id, template.name);

  const workoutId = workoutResult.lastInsertRowid as number;

  const templateExerciseRows = sqlite
    .prepare(
      `SELECT te.*, e.name as exercise_name FROM template_exercises te
       JOIN exercises e ON te.exercise_id = e.id
       WHERE te.template_id = ? ORDER BY te.order_index`
    )
    .all(template.id) as Array<{
    exercise_id: number;
    sets: number;
    reps: string;
    rest_seconds: number | null;
    set_type: string;
    exercise_name: string;
  }>;

  const lastWorkout = sqlite
    .prepare(
      `SELECT id FROM workouts
       WHERE user_id = ? AND template_id = ? AND finished_at IS NOT NULL
       ORDER BY started_at DESC LIMIT 1`
    )
    .get(req.userId!, template.id) as { id: number } | undefined;

  const insertSet = sqlite.prepare(
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

  for (const ex of templateExerciseRows) {
    let lastSets: Array<{ set_index: number; weight: number; reps: number }> = [];
    if (lastWorkout) {
      lastSets = sqlite
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

  const workout = sqlite.prepare('SELECT * FROM workouts WHERE id = ?').get(workoutId) as {
    id: number;
    user_id: number;
    template_id: number;
    name: string;
    started_at: string;
    finished_at: string | null;
    notes: string | null;
  };

  res.status(201).json({
    ...workout,
    sets: setsToReturn,
  });
});

export default router;
