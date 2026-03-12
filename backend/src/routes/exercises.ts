import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { exercises } from '../db/schema.js';
import { eq, and, or, like, isNull, asc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// List exercises (built-in + user's custom)
router.get('/', (req: Request, res: Response) => {
  const { q, muscle_group, equipment } = req.query;
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

  if (!name || !muscle_group) {
    res.status(400).json({ error: 'Name and muscle_group are required' });
    return;
  }

  const exercise = db
    .insert(exercises)
    .values({ user_id: req.userId!, name, muscle_group, equipment: equipment || null, description: description || null })
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
  if (name !== undefined) updates.name = name;
  if (muscle_group !== undefined) updates.muscle_group = muscle_group;
  if (equipment !== undefined) updates.equipment = equipment;
  if (description !== undefined) updates.description = description;

  const updated = db
    .update(exercises)
    .set(updates)
    .where(and(eq(exercises.id, Number(req.params.id)), eq(exercises.user_id, req.userId!)))
    .returning()
    .get();

  res.json(updated);
});

// Delete custom exercise
router.delete('/:id', (req: Request, res: Response) => {
  const result = db
    .delete(exercises)
    .where(and(eq(exercises.id, Number(req.params.id)), eq(exercises.user_id, req.userId!)))
    .run();

  if (result.changes === 0) {
    res.status(404).json({ error: 'Exercise not found or not deletable' });
    return;
  }

  res.status(204).send();
});

export default router;
