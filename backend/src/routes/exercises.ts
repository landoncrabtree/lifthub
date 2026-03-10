import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Exercise } from '../types/index.js';

const router = Router();
router.use(authMiddleware);

// List exercises (built-in + user's custom)
router.get('/', (req: Request, res: Response) => {
  const { q, muscle_group, equipment } = req.query;

  let sql = 'SELECT * FROM exercises WHERE (user_id IS NULL OR user_id = ?)';
  const params: unknown[] = [req.userId!];

  if (q) {
    sql += ' AND name LIKE ?';
    params.push(`%${q}%`);
  }

  if (muscle_group) {
    sql += ' AND muscle_group = ?';
    params.push(muscle_group);
  }

  if (equipment) {
    sql += ' AND equipment = ?';
    params.push(equipment);
  }

  sql += ' ORDER BY name ASC';

  const exercises = db.prepare(sql).all(...params) as Exercise[];
  res.json(exercises);
});

// Get single exercise
router.get('/:id', (req: Request, res: Response) => {
  const exercise = db
    .prepare('SELECT * FROM exercises WHERE id = ? AND (user_id IS NULL OR user_id = ?)')
    .get(req.params.id, req.userId!) as Exercise | undefined;

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

  const result = db
    .prepare(
      'INSERT INTO exercises (user_id, name, muscle_group, equipment, description) VALUES (?, ?, ?, ?, ?)'
    )
    .run(req.userId!, name, muscle_group, equipment || null, description || null);

  const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(result.lastInsertRowid) as Exercise;
  res.status(201).json(exercise);
});

// Update custom exercise
router.put('/:id', (req: Request, res: Response) => {
  const existing = db
    .prepare('SELECT * FROM exercises WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId!) as Exercise | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Exercise not found or not editable' });
    return;
  }

  const { name, muscle_group, equipment, description } = req.body;

  db.prepare(
    'UPDATE exercises SET name = COALESCE(?, name), muscle_group = COALESCE(?, muscle_group), equipment = COALESCE(?, equipment), description = COALESCE(?, description) WHERE id = ?'
  ).run(name, muscle_group, equipment, description, req.params.id);

  const updated = db.prepare('SELECT * FROM exercises WHERE id = ?').get(req.params.id) as Exercise;
  res.json(updated);
});

// Delete custom exercise
router.delete('/:id', (req: Request, res: Response) => {
  const result = db
    .prepare('DELETE FROM exercises WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.userId!);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Exercise not found or not deletable' });
    return;
  }

  res.status(204).send();
});

export default router;
