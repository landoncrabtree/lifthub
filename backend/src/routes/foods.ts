import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { foods, customMeals } from '../db/schema.js';
import { eq, and, or, like, isNull, asc, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// List all foods available to the user (their own + USDA/global)
router.get('/', (req: Request, res: Response) => {
  const result = db
    .select()
    .from(foods)
    .where(or(eq(foods.user_id, req.userId!), isNull(foods.user_id)))
    .orderBy(asc(foods.name))
    .all();

  res.json(result);
});

// Search foods (user's custom + cached OpenFoodFacts)
router.get('/search', (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: 'Search query "q" is required' });
    return;
  }

  const result = db
    .select()
    .from(foods)
    .where(
      and(
        or(eq(foods.user_id, req.userId!), isNull(foods.user_id)),
        like(foods.name, `%${q}%`)
      )
    )
    .orderBy(asc(foods.name))
    .limit(50)
    .all();

  res.json(result);
});

// List user's custom meals
router.get('/custom-meals', (req: Request, res: Response) => {
  const meals = db
    .select()
    .from(customMeals)
    .where(eq(customMeals.user_id, req.userId!))
    .orderBy(asc(customMeals.name))
    .all();
  res.json(meals);
});

// Create custom meal
router.post('/custom-meals', (req: Request, res: Response) => {
  const { name, description, calories, protein_g, carbs_g, fat_g } = req.body;

  if (!name || calories == null) {
    res.status(400).json({ error: 'Name and calories are required' });
    return;
  }

  const meal = db
    .insert(customMeals)
    .values({
      user_id: req.userId!,
      name,
      description: description || null,
      calories,
      protein_g: protein_g ?? 0,
      carbs_g: carbs_g ?? 0,
      fat_g: fat_g ?? 0,
    })
    .returning()
    .get();

  res.status(201).json(meal);
});

// Update custom meal
router.put('/custom-meals/:id', (req: Request, res: Response) => {
  const existing = db
    .select()
    .from(customMeals)
    .where(and(eq(customMeals.id, Number(req.params.id)), eq(customMeals.user_id, req.userId!)))
    .get();

  if (!existing) {
    res.status(404).json({ error: 'Custom meal not found' });
    return;
  }

  const { name, description, calories, protein_g, carbs_g, fat_g } = req.body;

  const updates: Partial<typeof customMeals.$inferInsert> = {};
  if (name != null) updates.name = name;
  if (description != null) updates.description = description;
  if (calories != null) updates.calories = calories;
  if (protein_g != null) updates.protein_g = protein_g;
  if (carbs_g != null) updates.carbs_g = carbs_g;
  if (fat_g != null) updates.fat_g = fat_g;

  const meal = db
    .update(customMeals)
    .set({ ...updates, updated_at: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(customMeals.id, Number(req.params.id)), eq(customMeals.user_id, req.userId!)))
    .returning()
    .get();

  res.json(meal);
});

// Delete custom meal
router.delete('/custom-meals/:id', (req: Request, res: Response) => {
  const result = db
    .delete(customMeals)
    .where(and(eq(customMeals.id, Number(req.params.id)), eq(customMeals.user_id, req.userId!)))
    .run();

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
  const cached = db.select().from(foods).where(eq(foods.barcode, code)).get();
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

    const food = db
      .insert(foods)
      .values({
        user_id: null,
        barcode: code,
        name: product.product_name || 'Unknown Product',
        brand: product.brands || null,
        serving_size: servingSize,
        serving_unit: servingUnit,
        calories,
        protein_g,
        carbs_g,
        fat_g,
        source: 'openfoodfacts',
      })
      .returning()
      .get();

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

  const food = db
    .insert(foods)
    .values({
      user_id: req.userId!,
      name,
      brand: brand || null,
      serving_size: serving_size ?? 1,
      serving_unit: serving_unit || 'serving',
      calories: calories ?? 0,
      protein_g: protein_g ?? 0,
      carbs_g: carbs_g ?? 0,
      fat_g: fat_g ?? 0,
      source: 'custom',
    })
    .returning()
    .get();

  res.status(201).json(food);
});

// Update custom food
router.put('/:id', (req: Request, res: Response) => {
  const existing = db
    .select()
    .from(foods)
    .where(and(eq(foods.id, Number(req.params.id)), eq(foods.user_id, req.userId!)))
    .get();

  if (!existing) {
    res.status(404).json({ error: 'Food not found or not editable' });
    return;
  }

  const { name, brand, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g } = req.body;

  const updates: Partial<typeof foods.$inferInsert> = {};
  if (name != null) updates.name = name;
  if (brand != null) updates.brand = brand;
  if (serving_size != null) updates.serving_size = serving_size;
  if (serving_unit != null) updates.serving_unit = serving_unit;
  if (calories != null) updates.calories = calories;
  if (protein_g != null) updates.protein_g = protein_g;
  if (carbs_g != null) updates.carbs_g = carbs_g;
  if (fat_g != null) updates.fat_g = fat_g;

  const updated = db
    .update(foods)
    .set(updates)
    .where(and(eq(foods.id, Number(req.params.id)), eq(foods.user_id, req.userId!)))
    .returning()
    .get();

  res.json(updated);
});

// Delete custom food
router.delete('/:id', (req: Request, res: Response) => {
  const result = db
    .delete(foods)
    .where(and(eq(foods.id, Number(req.params.id)), eq(foods.user_id, req.userId!)))
    .run();

  if (result.changes === 0) {
    res.status(404).json({ error: 'Food not found or not deletable' });
    return;
  }

  res.status(204).send();
});

export default router;
