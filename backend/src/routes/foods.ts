import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// List all foods available to the user (their own + USDA/global)
router.get('/', (req: Request, res: Response) => {
  const foods = db
    .prepare(
      `SELECT * FROM foods
       WHERE user_id = ? OR user_id IS NULL
       ORDER BY name`
    )
    .all(req.userId!);

  res.json(foods);
});

// Search foods (user's custom + cached OpenFoodFacts)
router.get('/search', (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: 'Search query "q" is required' });
    return;
  }

  const foods = db
    .prepare(
      `SELECT * FROM foods
       WHERE (user_id = ? OR user_id IS NULL) AND name LIKE ?
       ORDER BY name
       LIMIT 50`
    )
    .all(req.userId!, `%${q}%`);

  res.json(foods);
});

// List user's custom meals
router.get('/custom-meals', (req: Request, res: Response) => {
  const meals = db
    .prepare('SELECT * FROM custom_meals WHERE user_id = ? ORDER BY name')
    .all(req.userId!);
  res.json(meals);
});

// Create custom meal
router.post('/custom-meals', (req: Request, res: Response) => {
  const { name, description, calories, protein_g, carbs_g, fat_g } = req.body;

  if (!name || calories == null) {
    res.status(400).json({ error: 'Name and calories are required' });
    return;
  }

  const result = db.prepare(
    'INSERT INTO custom_meals (user_id, name, description, calories, protein_g, carbs_g, fat_g) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(req.userId!, name, description || null, calories, protein_g ?? 0, carbs_g ?? 0, fat_g ?? 0);

  const meal = db.prepare('SELECT * FROM custom_meals WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(meal);
});

// Update custom meal
router.put('/custom-meals/:id', (req: Request, res: Response) => {
  const existing = db
    .prepare('SELECT * FROM custom_meals WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId!);

  if (!existing) {
    res.status(404).json({ error: 'Custom meal not found' });
    return;
  }

  const { name, description, calories, protein_g, carbs_g, fat_g } = req.body;

  db.prepare(
    `UPDATE custom_meals
     SET name = COALESCE(?, name),
         description = COALESCE(?, description),
         calories = COALESCE(?, calories),
         protein_g = COALESCE(?, protein_g),
         carbs_g = COALESCE(?, carbs_g),
         fat_g = COALESCE(?, fat_g),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(name, description, calories, protein_g, carbs_g, fat_g, req.params.id);

  const meal = db.prepare('SELECT * FROM custom_meals WHERE id = ?').get(req.params.id);
  res.json(meal);
});

// Delete custom meal
router.delete('/custom-meals/:id', (req: Request, res: Response) => {
  const result = db
    .prepare('DELETE FROM custom_meals WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.userId!);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Custom meal not found' });
    return;
  }

  res.status(204).send();
});

// Barcode lookup
router.get('/barcode/:code', async (req: Request, res: Response) => {
  const { code } = req.params;

  // Check local cache first
  const cached = db.prepare('SELECT * FROM foods WHERE barcode = ?').get(code);
  if (cached) {
    res.json(cached);
    return;
  }

  // Fetch from OpenFoodFacts
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
    const data = (await response.json()) as {
      status: number;
      product?: {
        product_name?: string;
        brands?: string;
        nutriments?: {
          'energy-kcal_100g'?: number;
          proteins_100g?: number;
          carbohydrates_100g?: number;
          fat_100g?: number;
        };
        serving_size?: string;
      };
    };

    if (data.status !== 1 || !data.product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const product = data.product;
    const nutriments = product.nutriments || {};

    // Parse serving_size string (e.g. "30g" → 30, "g")
    let servingSize = 100;
    let servingUnit = 'g';
    if (product.serving_size) {
      const match = product.serving_size.match(/^([\d.]+)\s*(.*)$/);
      if (match) {
        servingSize = parseFloat(match[1]) || 100;
        servingUnit = match[2].trim() || 'g';
      }
    }

    const caloriesPer100 = nutriments['energy-kcal_100g'] || 0;
    const proteinPer100 = nutriments.proteins_100g || 0;
    const carbsPer100 = nutriments.carbohydrates_100g || 0;
    const fatPer100 = nutriments.fat_100g || 0;

    // Scale nutrients to serving size
    const factor = servingSize / 100;
    const calories = Math.round(caloriesPer100 * factor * 10) / 10;
    const protein_g = Math.round(proteinPer100 * factor * 10) / 10;
    const carbs_g = Math.round(carbsPer100 * factor * 10) / 10;
    const fat_g = Math.round(fatPer100 * factor * 10) / 10;

    const result = db
      .prepare(
        `INSERT INTO foods (user_id, barcode, name, brand, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, source)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'openfoodfacts')`
      )
      .run(
        code,
        product.product_name || 'Unknown Product',
        product.brands || null,
        servingSize,
        servingUnit,
        calories,
        protein_g,
        carbs_g,
        fat_g
      );

    const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(result.lastInsertRowid);
    res.json(food);
  } catch {
    res.status(502).json({ error: 'Failed to fetch from OpenFoodFacts' });
  }
});

// Create custom food
router.post('/', (req: Request, res: Response) => {
  const { name, brand, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const result = db
    .prepare(
      `INSERT INTO foods (user_id, name, brand, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'custom')`
    )
    .run(
      req.userId!,
      name,
      brand || null,
      serving_size ?? 1,
      serving_unit || 'serving',
      calories ?? 0,
      protein_g ?? 0,
      carbs_g ?? 0,
      fat_g ?? 0
    );

  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(food);
});

// Update custom food
router.put('/:id', (req: Request, res: Response) => {
  const existing = db
    .prepare('SELECT * FROM foods WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId!);

  if (!existing) {
    res.status(404).json({ error: 'Food not found or not editable' });
    return;
  }

  const { name, brand, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g } = req.body;

  db.prepare(
    `UPDATE foods SET
       name = COALESCE(?, name),
       brand = COALESCE(?, brand),
       serving_size = COALESCE(?, serving_size),
       serving_unit = COALESCE(?, serving_unit),
       calories = COALESCE(?, calories),
       protein_g = COALESCE(?, protein_g),
       carbs_g = COALESCE(?, carbs_g),
       fat_g = COALESCE(?, fat_g)
     WHERE id = ?`
  ).run(name, brand, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, req.params.id);

  const updated = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete custom food
router.delete('/:id', (req: Request, res: Response) => {
  const result = db
    .prepare('DELETE FROM foods WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.userId!);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Food not found or not deletable' });
    return;
  }

  res.status(204).send();
});

export default router;
