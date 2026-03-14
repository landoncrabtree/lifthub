import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { exercises, templates, templateExercises, workoutSets } from '../db/schema.js';
import { eq, and, or, like, isNull, asc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { truncateOpt, BOUNDS } from '../utils/validate.js';

const router = Router();
router.use(authMiddleware);

// List exercises (built-in + user's custom)
router.get('/', (req: Request, res: Response) => {
  const { q, muscle_group, equipment } = req.query;
  logger.debug('GET /exercises', { q, muscle_group, equipment, userId: req.userId });
  const conditions = [or(isNull(exercises.user_id), eq(exercises.user_id, req.userId!))];
  if (q) conditions.push(like(exercises.name, `%${q}%`));
  if (muscle_group) conditions.push(eq(exercises.muscle_group, muscle_group as string));
  if (equipment) conditions.push(eq(exercises.equipment, equipment as string));
  const rows = db.select().from(exercises).where(and(...conditions)).orderBy(asc(exercises.name)).all();
  res.json(rows);
});

// Get single exercise
router.get('/:id', (req: Request, res: Response) => {
  const exercise = db
    .select()
    .from(exercises)
    .where(
      and(
        eq(exercises.id, Number(req.params.id)),
        or(isNull(exercises.user_id), eq(exercises.user_id, req.userId!))
      )
    )
    .get();

  if (!exercise) {
    res.status(404).json({ error: 'Exercise not found' });
    return;
  }

  res.json(exercise);
});

// Create custom exercise
router.post('/', (req: Request, res: Response) => {
  const { name, muscle_group, equipment, description } = req.body;
  logger.debug('POST /exercises', { name, muscle_group, equipment });

  if (!name || !muscle_group) {
    res.status(400).json({ error: 'Name and muscle_group are required' });
    return;
  }

  const exercise = db
    .insert(exercises)
    .values({
      user_id: req.userId!,
      name: String(name).slice(0, BOUNDS.stringShort),
      muscle_group: String(muscle_group).slice(0, BOUNDS.stringShort),
      equipment: truncateOpt(equipment, BOUNDS.stringShort),
      description: truncateOpt(description, BOUNDS.stringLong),
    })
    .returning()
    .get();

  res.status(201).json(exercise);
});

// Update custom exercise
router.put('/:id', (req: Request, res: Response) => {
  const existing = db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, Number(req.params.id)), eq(exercises.user_id, req.userId!)))
    .get();

  if (!existing) {
    res.status(404).json({ error: 'Exercise not found or not editable' });
    return;
  }

  const { name, muscle_group, equipment, description } = req.body;
  const updates: Partial<typeof exercises.$inferInsert> = {};
  if (name !== undefined) updates.name = String(name).slice(0, BOUNDS.stringShort);
  if (muscle_group !== undefined) updates.muscle_group = String(muscle_group).slice(0, BOUNDS.stringShort);
  if (equipment !== undefined) updates.equipment = truncateOpt(equipment, BOUNDS.stringShort);
  if (description !== undefined) updates.description = truncateOpt(description, BOUNDS.stringLong);

  const updated = db
    .update(exercises)
    .set(updates)
    .where(and(eq(exercises.id, Number(req.params.id)), eq(exercises.user_id, req.userId!)))
    .returning()
    .get();

  res.json(updated);
});

// Delete custom exercise (cascades to template_exercises and workout_sets)
router.delete('/:id', (req: Request, res: Response) => {
  const exerciseId = Number(req.params.id);
  logger.debug('DELETE /exercises/:id', { exerciseId });

  const existing = db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.user_id, req.userId!)))
    .get();

  if (!existing) {
    res.status(404).json({ error: 'Exercise not found or not deletable' });
    return;
  }

  db.transaction((tx) => {
    tx.delete(templateExercises).where(eq(templateExercises.exercise_id, exerciseId)).run();
    tx.delete(workoutSets).where(eq(workoutSets.exercise_id, exerciseId)).run();

    // Strip the exercise from any template json_data blobs
    const userTemplates = tx
      .select({ id: templates.id, json_data: templates.json_data })
      .from(templates)
      .where(eq(templates.user_id, req.userId!))
      .all();

    for (const t of userTemplates) {
      const entries = JSON.parse(t.json_data) as { exercise_id: number }[];
      const filtered = entries.filter((e) => e.exercise_id !== exerciseId);
      if (filtered.length !== entries.length) {
        tx.update(templates)
          .set({ json_data: JSON.stringify(filtered) })
          .where(eq(templates.id, t.id))
          .run();
      }
    }

    tx.delete(exercises).where(eq(exercises.id, exerciseId)).run();
  });

  res.status(204).send();
});

export default router;
