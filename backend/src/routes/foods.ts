import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { foods, customMeals } from '../db/schema.js';
import { eq, and, or, like, isNull, asc, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';

import { logger } from '../utils/logger.js';

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
  logger.debug('POST /foods/custom-meals', { name, calories });

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

  // Check if this user already has this barcode saved
  const cached = db.select().from(foods).where(
    and(eq(foods.barcode, code), eq(foods.user_id, req.userId!))
  ).get();
  if (cached) {
    res.json(cached);
    return;
  }

  // Check global cache (from USDA seed or legacy null-user entries)
  const globalCached = db.select().from(foods).where(
    and(eq(foods.barcode, code), isNull(foods.user_id))
  ).get();
  if (globalCached) {
    res.json(globalCached);
    return;
  }

  type OFFProduct = {
    product_name?: string;
    brands?: string;
    nutriments?: {
      'energy-kcal_100g'?: number;
      'energy-kcal_serving'?: number;
      proteins_100g?: number;
      proteins_serving?: number;
      carbohydrates_100g?: number;
      carbohydrates_serving?: number;
      fat_100g?: number;
      fat_serving?: number;
    };
    serving_size?: string;
    serving_quantity?: number;
  };

  type OFFResponse = { status: number; product?: OFFProduct };

  // Scanners expand UPC-E (8 digits) → UPC-A (12) → EAN-13 (13 with leading 0).
  // OpenFoodFacts often has better data under the shorter UPC-E code.
  // Try to reverse the expansion to find entries with serving data.
  const codesToTry = [code];
  const addVariant = (v: string) => {
    if (v && !codesToTry.includes(v)) codesToTry.push(v);
  };

  // Strip leading zeros
  addVariant(code.replace(/^0+/, ''));

  // UPC-A to UPC-E compression (reverse the expansion scanners do)
  // UPC-A: N XXXXX YYYYY C (12 digits), where N=number system, C=check digit
  // We try to compress to UPC-E if the UPC-A has the right zero patterns
  const upcA = code.length === 13 && code[0] === '0' ? code.slice(1) : // EAN-13 → UPC-A
                code.length === 12 ? code : null;
  if (upcA && (upcA[0] === '0' || upcA[0] === '1')) {
    const mfr = upcA.slice(1, 6);  // manufacturer code (5 digits)
    const prod = upcA.slice(6, 11); // product code (5 digits)
    const check = upcA[11];
    let upce: string | null = null;

    if (mfr[2] === '0' && mfr[3] === '0' && mfr[4] === '0' && prod[0] === '0' && prod[1] === '0') {
      // Rule: last code digit 0,1,2 → mfr=XX[d]00, prod=00YYY
      upce = upcA[0] + mfr[0] + mfr[1] + prod[2] + prod[3] + prod[4] + mfr[2] + check;
    } else if (mfr[3] === '0' && mfr[4] === '0' && prod[0] === '0' && prod[1] === '0' && prod[2] === '0') {
      upce = upcA[0] + mfr[0] + mfr[1] + mfr[2] + prod[3] + prod[4] + '3' + check;
    } else if (mfr[4] === '0' && prod[0] === '0' && prod[1] === '0' && prod[2] === '0' && prod[3] === '0') {
      upce = upcA[0] + mfr[0] + mfr[1] + mfr[2] + mfr[3] + prod[4] + '4' + check;
    } else if (prod[0] === '0' && prod[1] === '0' && prod[2] === '0' && prod[3] === '0' && parseInt(prod[4]) >= 5) {
      upce = upcA[0] + mfr[0] + mfr[1] + mfr[2] + mfr[3] + mfr[4] + prod[4] + check;
    }

    if (upce) {
      addVariant(upce);
      addVariant(upce.replace(/^0+/, ''));
    }
  }

  const hasServingInfo = (p: OFFProduct) =>
    p.nutriments?.['energy-kcal_serving'] != null && p.serving_size != null;

  // Fetch from OpenFoodFacts, trying barcode variants for better data
  try {
    let product: OFFProduct | null = null;

    logger.debug('[BARCODE] input code:', code);
    logger.debug('[BARCODE] variants to try:', codesToTry);

    for (const tryCode of codesToTry) {
      logger.debug('[BARCODE] trying:', tryCode);
      const resp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${tryCode}.json`);
      const d = (await resp.json()) as OFFResponse;
      if (d.status !== 1 || !d.product) {
        logger.debug('[BARCODE]   not found');
        continue;
      }

      const n = d.product.nutriments || {};
      logger.debug('[BARCODE]   found:', d.product.product_name);
      logger.debug('[BARCODE]   kcal_serving:', n['energy-kcal_serving'], 'kcal_100g:', n['energy-kcal_100g']);
      logger.debug('[BARCODE]   serving_size:', d.product.serving_size, 'serving_quantity:', d.product.serving_quantity);
      logger.debug('[BARCODE]   hasServingInfo:', hasServingInfo(d.product));

      if (!product) product = d.product;

      // If this variant has serving data, prefer it
      if (hasServingInfo(d.product)) {
        logger.debug('[BARCODE]   → using this variant (has serving data)');
        product = d.product;
        break;
      }
    }

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const nutriments = product.nutriments || {};
    logger.debug('[BARCODE] selected product:', product.product_name);

    // Determine serving size for display
    let servingSize = 1;
    let servingUnit = 'serving';
    if (product.serving_size) {
      const match = product.serving_size.match(/([\d.]+)\s*(g|ml|oz|fl\s*oz)\b/i);
      if (match) {
        servingSize = parseFloat(match[1]) || 1;
        servingUnit = match[2].trim().toLowerCase();
      } else if (product.serving_quantity) {
        servingSize = product.serving_quantity;
        servingUnit = 'g';
      }
    }

    // Prefer _serving values (pre-calculated by OpenFoodFacts) over
    // _100g + manual scaling, since serving_size strings are inconsistent
    const hasServingData = nutriments['energy-kcal_serving'] != null;
    logger.debug('[BARCODE] hasServingData:', hasServingData);

    let calories: number;
    let protein_g: number;
    let carbs_g: number;
    let fat_g: number;

    if (hasServingData) {
      calories = nutriments['energy-kcal_serving'] || 0;
      protein_g = nutriments.proteins_serving || 0;
      carbs_g = nutriments.carbohydrates_serving || 0;
      fat_g = nutriments.fat_serving || 0;
      logger.debug('[BARCODE] using _serving path → calories:', calories);
    } else {
      // Fallback: scale _100g values by serving quantity
      const qty = product.serving_quantity || 100;
      const factor = qty / 100;
      calories = (nutriments['energy-kcal_100g'] || 0) * factor;
      logger.debug('[BARCODE] using _100g path → qty:', qty, 'factor:', factor, 'calories:', calories);
      protein_g = (nutriments.proteins_100g || 0) * factor;
      carbs_g = (nutriments.carbohydrates_100g || 0) * factor;
      fat_g = (nutriments.fat_100g || 0) * factor;
    }

    calories = Math.round(calories * 10) / 10;
    protein_g = Math.round(protein_g * 10) / 10;
    carbs_g = Math.round(carbs_g * 10) / 10;
    fat_g = Math.round(fat_g * 10) / 10;

    const food = db
      .insert(foods)
      .values({
        user_id: req.userId!,
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
