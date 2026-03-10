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

export function seed() {
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
