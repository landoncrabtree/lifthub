import db from './connection.js';

const EXERCISES = [
  // Chest
  { name: 'Barbell Bench Press', muscle_group: 'chest', equipment: 'barbell', description: 'Flat barbell bench press' },
  { name: 'Incline Barbell Bench Press', muscle_group: 'chest', equipment: 'barbell', description: 'Incline barbell bench press at 30-45 degrees' },
  { name: 'Decline Barbell Bench Press', muscle_group: 'chest', equipment: 'barbell', description: 'Decline barbell bench press' },
  { name: 'Dumbbell Bench Press', muscle_group: 'chest', equipment: 'dumbbell', description: 'Flat dumbbell bench press' },
  { name: 'Incline Dumbbell Bench Press', muscle_group: 'chest', equipment: 'dumbbell', description: 'Incline dumbbell bench press' },
  { name: 'Dumbbell Fly', muscle_group: 'chest', equipment: 'dumbbell', description: 'Flat dumbbell fly' },
  { name: 'Cable Crossover', muscle_group: 'chest', equipment: 'cable', description: 'Standing cable crossover' },
  { name: 'Machine Chest Press', muscle_group: 'chest', equipment: 'machine', description: 'Seated machine chest press' },
  { name: 'Push-Up', muscle_group: 'chest', equipment: 'bodyweight', description: 'Standard push-up' },
  { name: 'Dip (Chest)', muscle_group: 'chest', equipment: 'bodyweight', description: 'Chest-focused dip with forward lean' },

  // Back
  { name: 'Barbell Row', muscle_group: 'back', equipment: 'barbell', description: 'Bent-over barbell row' },
  { name: 'Deadlift', muscle_group: 'back', equipment: 'barbell', description: 'Conventional deadlift' },
  { name: 'Sumo Deadlift', muscle_group: 'back', equipment: 'barbell', description: 'Sumo stance deadlift' },
  { name: 'Pull-Up', muscle_group: 'back', equipment: 'bodyweight', description: 'Overhand pull-up' },
  { name: 'Chin-Up', muscle_group: 'back', equipment: 'bodyweight', description: 'Underhand chin-up' },
  { name: 'Lat Pulldown', muscle_group: 'back', equipment: 'cable', description: 'Wide-grip lat pulldown' },
  { name: 'Seated Cable Row', muscle_group: 'back', equipment: 'cable', description: 'Seated cable row with V-bar' },
  { name: 'Dumbbell Row', muscle_group: 'back', equipment: 'dumbbell', description: 'Single-arm dumbbell row' },
  { name: 'T-Bar Row', muscle_group: 'back', equipment: 'barbell', description: 'T-bar row with chest support or free-standing' },
  { name: 'Face Pull', muscle_group: 'back', equipment: 'cable', description: 'Cable face pull for rear delts and upper back' },

  // Shoulders
  { name: 'Overhead Press', muscle_group: 'shoulders', equipment: 'barbell', description: 'Standing barbell overhead press' },
  { name: 'Dumbbell Shoulder Press', muscle_group: 'shoulders', equipment: 'dumbbell', description: 'Seated dumbbell shoulder press' },
  { name: 'Arnold Press', muscle_group: 'shoulders', equipment: 'dumbbell', description: 'Seated Arnold press with rotation' },
  { name: 'Lateral Raise', muscle_group: 'shoulders', equipment: 'dumbbell', description: 'Standing dumbbell lateral raise' },
  { name: 'Cable Lateral Raise', muscle_group: 'shoulders', equipment: 'cable', description: 'Single-arm cable lateral raise' },
  { name: 'Front Raise', muscle_group: 'shoulders', equipment: 'dumbbell', description: 'Dumbbell front raise' },
  { name: 'Reverse Fly', muscle_group: 'shoulders', equipment: 'dumbbell', description: 'Bent-over reverse dumbbell fly' },
  { name: 'Machine Shoulder Press', muscle_group: 'shoulders', equipment: 'machine', description: 'Seated machine shoulder press' },
  { name: 'Upright Row', muscle_group: 'shoulders', equipment: 'barbell', description: 'Barbell upright row' },
  { name: 'Shrug', muscle_group: 'shoulders', equipment: 'barbell', description: 'Barbell or dumbbell shrug' },

  // Biceps
  { name: 'Barbell Curl', muscle_group: 'biceps', equipment: 'barbell', description: 'Standing barbell curl' },
  { name: 'Dumbbell Curl', muscle_group: 'biceps', equipment: 'dumbbell', description: 'Standing dumbbell curl' },
  { name: 'Hammer Curl', muscle_group: 'biceps', equipment: 'dumbbell', description: 'Standing hammer curl (neutral grip)' },
  { name: 'Incline Dumbbell Curl', muscle_group: 'biceps', equipment: 'dumbbell', description: 'Incline bench dumbbell curl' },
  { name: 'Preacher Curl', muscle_group: 'biceps', equipment: 'barbell', description: 'EZ-bar preacher curl' },
  { name: 'Cable Curl', muscle_group: 'biceps', equipment: 'cable', description: 'Standing cable curl' },
  { name: 'Concentration Curl', muscle_group: 'biceps', equipment: 'dumbbell', description: 'Seated concentration curl' },
  { name: 'Spider Curl', muscle_group: 'biceps', equipment: 'dumbbell', description: 'Spider curl on incline bench' },

  // Triceps
  { name: 'Close-Grip Bench Press', muscle_group: 'triceps', equipment: 'barbell', description: 'Close-grip barbell bench press' },
  { name: 'Tricep Pushdown', muscle_group: 'triceps', equipment: 'cable', description: 'Cable tricep pushdown with rope or bar' },
  { name: 'Overhead Tricep Extension', muscle_group: 'triceps', equipment: 'dumbbell', description: 'Seated overhead dumbbell tricep extension' },
  { name: 'Cable Overhead Extension', muscle_group: 'triceps', equipment: 'cable', description: 'Cable overhead tricep extension with rope' },
  { name: 'Skull Crusher', muscle_group: 'triceps', equipment: 'barbell', description: 'Lying EZ-bar skull crusher' },
  { name: 'Dip (Tricep)', muscle_group: 'triceps', equipment: 'bodyweight', description: 'Tricep-focused dip (upright torso)' },
  { name: 'Kickback', muscle_group: 'triceps', equipment: 'dumbbell', description: 'Dumbbell tricep kickback' },

  // Forearms
  { name: 'Wrist Curl', muscle_group: 'forearms', equipment: 'barbell', description: 'Barbell wrist curl' },
  { name: 'Reverse Wrist Curl', muscle_group: 'forearms', equipment: 'barbell', description: 'Barbell reverse wrist curl' },
  { name: 'Farmer Walk', muscle_group: 'forearms', equipment: 'dumbbell', description: 'Farmer walk/carry for grip strength' },

  // Core
  { name: 'Plank', muscle_group: 'core', equipment: 'bodyweight', description: 'Front plank hold' },
  { name: 'Crunch', muscle_group: 'core', equipment: 'bodyweight', description: 'Standard crunch' },
  { name: 'Cable Crunch', muscle_group: 'core', equipment: 'cable', description: 'Kneeling cable crunch' },
  { name: 'Hanging Leg Raise', muscle_group: 'core', equipment: 'bodyweight', description: 'Hanging leg raise from pull-up bar' },
  { name: 'Ab Rollout', muscle_group: 'core', equipment: 'other', description: 'Ab wheel rollout' },
  { name: 'Russian Twist', muscle_group: 'core', equipment: 'bodyweight', description: 'Seated Russian twist' },
  { name: 'Side Plank', muscle_group: 'core', equipment: 'bodyweight', description: 'Side plank hold' },
  { name: 'Decline Sit-Up', muscle_group: 'core', equipment: 'bodyweight', description: 'Decline bench sit-up' },

  // Quads
  { name: 'Barbell Squat', muscle_group: 'quads', equipment: 'barbell', description: 'Barbell back squat' },
  { name: 'Front Squat', muscle_group: 'quads', equipment: 'barbell', description: 'Barbell front squat' },
  { name: 'Leg Press', muscle_group: 'quads', equipment: 'machine', description: '45-degree leg press' },
  { name: 'Leg Extension', muscle_group: 'quads', equipment: 'machine', description: 'Seated leg extension' },
  { name: 'Goblet Squat', muscle_group: 'quads', equipment: 'dumbbell', description: 'Dumbbell goblet squat' },
  { name: 'Hack Squat', muscle_group: 'quads', equipment: 'machine', description: 'Machine hack squat' },
  { name: 'Bulgarian Split Squat', muscle_group: 'quads', equipment: 'dumbbell', description: 'Dumbbell Bulgarian split squat' },
  { name: 'Walking Lunge', muscle_group: 'quads', equipment: 'dumbbell', description: 'Dumbbell walking lunge' },
  { name: 'Sissy Squat', muscle_group: 'quads', equipment: 'bodyweight', description: 'Bodyweight sissy squat' },

  // Hamstrings
  { name: 'Romanian Deadlift', muscle_group: 'hamstrings', equipment: 'barbell', description: 'Barbell Romanian deadlift' },
  { name: 'Lying Leg Curl', muscle_group: 'hamstrings', equipment: 'machine', description: 'Lying machine leg curl' },
  { name: 'Seated Leg Curl', muscle_group: 'hamstrings', equipment: 'machine', description: 'Seated machine leg curl' },
  { name: 'Stiff-Leg Deadlift', muscle_group: 'hamstrings', equipment: 'barbell', description: 'Stiff-legged barbell deadlift' },
  { name: 'Dumbbell Romanian Deadlift', muscle_group: 'hamstrings', equipment: 'dumbbell', description: 'Dumbbell Romanian deadlift' },
  { name: 'Good Morning', muscle_group: 'hamstrings', equipment: 'barbell', description: 'Barbell good morning' },
  { name: 'Nordic Curl', muscle_group: 'hamstrings', equipment: 'bodyweight', description: 'Nordic hamstring curl' },

  // Glutes
  { name: 'Hip Thrust', muscle_group: 'glutes', equipment: 'barbell', description: 'Barbell hip thrust' },
  { name: 'Glute Bridge', muscle_group: 'glutes', equipment: 'bodyweight', description: 'Bodyweight glute bridge' },
  { name: 'Cable Pull-Through', muscle_group: 'glutes', equipment: 'cable', description: 'Cable pull-through' },
  { name: 'Glute Kickback', muscle_group: 'glutes', equipment: 'cable', description: 'Cable glute kickback' },
  { name: 'Step-Up', muscle_group: 'glutes', equipment: 'dumbbell', description: 'Dumbbell step-up' },

  // Calves
  { name: 'Standing Calf Raise', muscle_group: 'calves', equipment: 'machine', description: 'Machine standing calf raise' },
  { name: 'Seated Calf Raise', muscle_group: 'calves', equipment: 'machine', description: 'Machine seated calf raise' },
  { name: 'Donkey Calf Raise', muscle_group: 'calves', equipment: 'machine', description: 'Donkey calf raise' },
  { name: 'Single-Leg Calf Raise', muscle_group: 'calves', equipment: 'bodyweight', description: 'Single-leg bodyweight calf raise' },

  // Full Body / Compound
  { name: 'Clean and Press', muscle_group: 'full_body', equipment: 'barbell', description: 'Barbell clean and press' },
  { name: 'Thruster', muscle_group: 'full_body', equipment: 'barbell', description: 'Barbell thruster (front squat to press)' },
  { name: 'Kettlebell Swing', muscle_group: 'full_body', equipment: 'kettlebell', description: 'Two-hand kettlebell swing' },
  { name: 'Turkish Get-Up', muscle_group: 'full_body', equipment: 'kettlebell', description: 'Kettlebell Turkish get-up' },
  { name: 'Burpee', muscle_group: 'full_body', equipment: 'bodyweight', description: 'Bodyweight burpee' },
  { name: 'Man Maker', muscle_group: 'full_body', equipment: 'dumbbell', description: 'Dumbbell man maker' },

  // Cardio
  { name: 'Treadmill Run', muscle_group: 'cardio', equipment: 'machine', description: 'Treadmill running' },
  { name: 'Cycling', muscle_group: 'cardio', equipment: 'machine', description: 'Stationary bike cycling' },
  { name: 'Rowing Machine', muscle_group: 'cardio', equipment: 'machine', description: 'Indoor rowing machine' },
  { name: 'Stair Climber', muscle_group: 'cardio', equipment: 'machine', description: 'Stair climber machine' },
  { name: 'Jump Rope', muscle_group: 'cardio', equipment: 'other', description: 'Jump rope / skipping' },
  { name: 'Battle Ropes', muscle_group: 'cardio', equipment: 'other', description: 'Battle rope exercises' },
];

// [name, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g]
const FOODS: [string, number, string, number, number, number, number][] = [
  // Proteins
  ['Chicken Breast (cooked)',      0.25, 'lb',   186, 35.0,  0.0,  4.1],
  ['Chicken Thigh (cooked)',       0.25, 'lb',   236, 29.4,  0.0, 12.3],
  ['Ground Beef 80/20 (cooked)',   0.25, 'lb',   287, 28.8,  0.0, 18.1],
  ['Ground Beef 90/10 (cooked)',   0.25, 'lb',   221, 30.8,  0.0,  9.8],
  ['Ground Turkey (cooked)',       0.25, 'lb',   229, 31.0,  0.0, 11.1],
  ['Turkey Breast (cooked)',       0.25, 'lb',   153, 34.0,  0.0,  0.8],
  ['Salmon (cooked)',              0.25, 'lb',   235, 23.1,  0.0, 15.1],
  ['Tuna (canned in water)',       0.25, 'lb',   131, 28.8,  0.0,  0.9],
  ['Shrimp (cooked)',              0.25, 'lb',   112, 27.1,  0.2,  0.3],
  ['Pork Chop (cooked)',           0.25, 'lb',   261, 29.0,  0.0, 15.3],
  ['Pork Tenderloin (cooked)',     0.25, 'lb',   162, 29.6,  0.0,  4.0],
  ['Bacon (cooked)',                  1, 'slice', 43,  3.0,  0.1,  3.3],
  ['Egg',                             1, 'large', 72,  6.3,  0.4,  4.8],
  ['Egg Whites',                      1, 'large', 17,  3.6,  0.2,  0.1],
  ['Tilapia (cooked)',             0.25, 'lb',   145, 29.6,  0.0,  3.1],
  ['Cod (cooked)',                 0.25, 'lb',    93, 20.1,  0.0,  0.8],
  ['Steak, Sirloin (cooked)',      0.25, 'lb',   207, 30.7,  0.0,  8.4],
  ['Steak, Ribeye (cooked)',       0.25, 'lb',   306, 28.0,  0.0, 20.6],
  ['Lamb (cooked)',                0.25, 'lb',   291, 28.8,  0.0, 18.6],
  ['Tofu (firm)',                  0.25, 'lb',    86,  9.2,  2.1,  5.4],
  ['Tempeh',                       0.25, 'lb',   217, 22.9,  8.6, 12.2],

  // Dairy
  ['Whole Milk',                      1, 'cup',   149,  8.0, 12.0,  8.0],
  ['2% Milk',                         1, 'cup',   122,  8.1, 11.7,  4.8],
  ['Skim Milk',                       1, 'cup',    83,  8.3, 12.2,  0.2],
  ['Greek Yogurt (plain, nonfat)', 0.75, 'cup',   100, 17.3,  6.1,  0.7],
  ['Greek Yogurt (plain, whole)',  0.75, 'cup',   165, 15.0,  7.0,  9.0],
  ['Cheddar Cheese',               0.25, 'cup',   113,  7.1,  0.4,  9.3],
  ['Mozzarella Cheese',            0.25, 'cup',    85,  6.3,  0.7,  6.3],
  ['Cottage Cheese (low-fat)',       0.5, 'cup',    92, 12.4,  4.9,  2.6],
  ['Cream Cheese',                    2, 'tbsp',   99,  1.7,  1.6,  9.8],
  ['Butter',                          1, 'tbsp', 102,  0.1,  0.0, 11.5],
  ['Heavy Cream',                     1, 'tbsp',  51,  0.4,  0.4,  5.4],
  ['Whey Protein (generic)',          1, 'scoop',120, 24.0,  3.0,  1.5],

  // Grains / Carbs
  ['White Rice (cooked)',           0.25, 'cup',   65,  1.4, 14.1,  0.2],
  ['Brown Rice (cooked)',           0.25, 'cup',   62,  1.4, 12.8,  0.5],
  ['Quinoa (cooked)',               0.25, 'cup',   55,  2.0,  9.8,  0.9],
  ['Oats (dry)',                    0.25, 'cup',   76,  2.7, 13.7,  1.3],
  ['Whole Wheat Bread',               1, 'slice',  81,  4.0, 13.8,  1.1],
  ['White Bread',                     1, 'slice',  75,  2.7, 14.3,  0.9],
  ['Pasta (cooked)',                  1, 'oz',     37,  1.4,  7.2,  0.3],
  ['Sweet Potato (raw)',            0.25, 'lb',    97,  1.8, 22.7,  0.1],
  ['Russet Potato (raw)',           0.25, 'lb',    89,  2.4, 19.8,  0.1],
  ['Tortilla (flour, 8")',            1, 'tortilla', 146, 3.8, 24.6, 3.6],
  ['Tortilla (corn, 6")',             1, 'tortilla',  52, 1.4, 10.7, 0.7],
  ['Bagel (plain)',                   1, 'bagel', 270,  9.0, 53.0,  1.6],
  ['English Muffin',                  1, 'muffin', 132,  4.4, 26.2,  1.0],

  // Fruits
  ['Banana',                          1, 'medium',105, 1.3, 27.0,  0.4],
  ['Apple',                           1, 'medium', 95, 0.5, 25.1,  0.3],
  ['Strawberries',                 0.25, 'cup',    13, 0.3,  3.2,  0.1],
  ['Blueberries',                  0.25, 'cup',    21, 0.3,  5.4,  0.1],
  ['Orange',                          1, 'medium', 62, 1.2, 15.4,  0.2],
  ['Grapes',                       0.25, 'cup',    26, 0.3,  6.9,  0.1],
  ['Watermelon',                   0.25, 'cup',    11, 0.2,  2.9,  0.1],
  ['Avocado',                      0.25, 'avocado',54, 0.7,  2.9,  5.0],
  ['Mango',                        0.25, 'cup',    25, 0.3,  6.2,  0.2],
  ['Pineapple',                    0.25, 'cup',    21, 0.2,  5.4,  0.0],

  // Vegetables
  ['Broccoli',                     0.25, 'cup',    8, 0.7,  1.5,  0.1],
  ['Spinach (raw)',                    1, 'cup',    7, 0.9,  1.1,  0.1],
  ['Kale (raw)',                       1, 'cup',   33, 2.9,  5.9,  0.6],
  ['Green Beans',                  0.25, 'cup',    9, 0.5,  2.0,  0.0],
  ['Carrots (raw)',                    1, 'medium',25, 0.6,  5.8,  0.1],
  ['Bell Pepper (raw)',            0.25, 'medium', 8, 0.3,  1.5,  0.1],
  ['Tomato (raw)',                 0.25, 'medium', 6, 0.3,  1.2,  0.1],
  ['Cucumber (raw)',               0.25, 'medium', 6, 0.3,  1.4,  0.0],
  ['Cauliflower',                  0.25, 'cup',    7, 0.5,  1.3,  0.1],
  ['Zucchini (raw)',               0.25, 'medium', 8, 0.6,  1.5,  0.1],
  ['Asparagus',                       4, 'spear', 13, 1.4,  2.5,  0.1],
  ['Mushrooms (white, raw)',       0.25, 'cup',    4, 0.5,  0.5,  0.0],
  ['Onion (raw)',                  0.25, 'medium', 11, 0.3,  2.5,  0.0],
  ['Garlic (raw)',                    1, 'clove',  4, 0.2,  1.0,  0.0],
  ['Corn (sweet, cooked)',         0.25, 'cup',   33, 1.2,  7.2,  0.5],
  ['Peas (green, cooked)',         0.25, 'cup',   30, 1.9,  5.6,  0.1],
  ['Lettuce, Romaine',                1, 'cup',    8, 0.6,  1.5,  0.1],
  ['Celery (raw)',                    1, 'stalk',  6, 0.3,  1.2,  0.1],
  ['Cabbage (raw)',                0.25, 'cup',    4, 0.2,  1.0,  0.0],

  // Legumes / Nuts
  ['Black Beans (cooked)',         0.25, 'cup',    57, 3.8, 10.2,  0.2],
  ['Pinto Beans (cooked)',        0.25, 'cup',    61, 3.9, 11.3,  0.3],
  ['Chickpeas (cooked)',          0.25, 'cup',    71, 3.8, 11.8,  1.1],
  ['Lentils (cooked)',            0.25, 'cup',    58, 4.5, 10.1,  0.2],
  ['Peanut Butter',                   1, 'tbsp',  94, 3.6,  3.5,  8.0],
  ['Almond Butter',                   1, 'tbsp',  98, 3.4,  3.0,  8.9],
  ['Almonds',                     0.25, 'cup',   164, 6.0,  6.1, 14.2],
  ['Walnuts',                     0.25, 'cup',   185, 4.3,  3.9, 18.5],
  ['Cashews',                     0.25, 'cup',   157, 5.2,  8.6, 12.4],

  // Oils / Condiments
  ['Olive Oil',                       1, 'tbsp', 119, 0.0,  0.0, 13.5],
  ['Coconut Oil',                     1, 'tbsp', 121, 0.0,  0.0, 13.5],
  ['Honey',                           1, 'tbsp',  64, 0.1, 17.3,  0.0],
  ['Maple Syrup',                     1, 'tbsp',  52, 0.0, 13.4,  0.0],
  ['Soy Sauce',                       1, 'tbsp',   9, 0.9,  1.0,  0.0],
  ['Ketchup',                         1, 'tbsp',  20, 0.2,  5.3,  0.0],
  ['Mustard (yellow)',                 1, 'tsp',    3, 0.2,  0.3,  0.2],
  ['Mayonnaise',                      1, 'tbsp',  94, 0.1,  0.1, 10.3],
  ['Salsa',                           2, 'tbsp',  10, 0.5,  2.2,  0.1],
  ['Ranch Dressing',                  2, 'tbsp', 129, 0.4,  1.8, 13.4],

  // Other
  ['White Sugar',                     1, 'tsp',   16, 0.0,  4.2,  0.0],
  ['Brown Sugar',                     1, 'tsp',   17, 0.0,  4.5,  0.0],
  ['Dark Chocolate (70-85%)',        28, 'g',    170, 2.2, 13.0, 12.0],
];

function seedExercises() {
  const count = db.prepare('SELECT COUNT(*) as n FROM exercises WHERE user_id IS NULL').get() as { n: number };
  if (count.n > 0) {
    console.log(`Seed skipped: ${count.n} built-in exercises already exist`);
    return;
  }

  const insert = db.prepare(
    'INSERT INTO exercises (user_id, name, muscle_group, equipment, description) VALUES (NULL, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction(() => {
    for (const ex of EXERCISES) {
      insert.run(ex.name, ex.muscle_group, ex.equipment, ex.description);
    }
  });

  insertMany();
  console.log(`Seeded ${EXERCISES.length} exercises`);
}

export function seedFoods() {
  const count = db.prepare("SELECT COUNT(*) as n FROM foods WHERE source = 'usda'").get() as { n: number };
  if (count.n > 0) {
    console.log(`Seed skipped: ${count.n} USDA foods already exist`);
    return;
  }

  const insert = db.prepare(
    'INSERT INTO foods (user_id, barcode, name, brand, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, source) VALUES (NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction(() => {
    for (const [name, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g] of FOODS) {
      insert.run(name, 'USDA', serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, 'usda');
    }
  });

  insertMany();
  console.log(`Seeded ${FOODS.length} USDA foods`);
}

export function seed() {
  seedExercises();
  seedFoods();
}
