import db from './connection.js';
import { exercises, foods } from './schema.js';
import { isNull, eq } from 'drizzle-orm';

const EXERCISES = [
  // Chest
  { name: 'Bench Press (Barbell)', muscle_group: 'chest', equipment: 'barbell', description: 'Compound press targeting the sternal (middle) pectoralis major, anterior deltoids, and triceps. Primary flat pressing movement for overall chest mass.' },
  { name: 'Bench Press (Dumbbell)', muscle_group: 'chest', equipment: 'dumbbell', description: 'Compound press targeting the pectoralis major with greater range of motion than barbell. Independent arms improve muscle balance and allow a deeper chest stretch.' },
  { name: 'Bench Press (Machine)', muscle_group: 'chest', equipment: 'machine', description: 'Machine press targeting the pectoralis major, anterior deltoids, and triceps. Fixed path provides stability for consistent chest activation.' },
  { name: 'Incline Bench Press (Barbell)', muscle_group: 'chest', equipment: 'barbell', description: 'Compound press targeting the clavicular (upper) head of the pectoralis major with secondary anterior deltoid and triceps activation. 30-45 degree incline shifts emphasis to upper chest.' },
  { name: 'Incline Bench Press (Dumbbell)', muscle_group: 'chest', equipment: 'dumbbell', description: 'Compound press targeting the clavicular (upper) pectoralis major with greater range of motion than barbell. Independent arms allow a deeper stretch and natural pressing path.' },
  { name: 'Decline Bench Press (Barbell)', muscle_group: 'chest', equipment: 'barbell', description: 'Compound press emphasizing the costal (lower) fibers of the pectoralis major. Decline angle reduces anterior deltoid involvement and shifts load to the lower chest.' },
  { name: 'Decline Bench Press (Dumbbell)', muscle_group: 'chest', equipment: 'dumbbell', description: 'Compound press targeting the costal (lower) pectoralis major with independent arm movement. Decline angle emphasizes the lower chest with greater range of motion.' },
  { name: 'Chest Fly (Dumbbell)', muscle_group: 'chest', equipment: 'dumbbell', description: 'Isolation for the pectoralis major through horizontal adduction. Emphasizes the sternal fibers with a deep stretch at the bottom of the movement.' },
  { name: 'Chest Fly (Cable)', muscle_group: 'chest', equipment: 'cable', description: 'Isolation for the pectoralis major with constant cable tension throughout the range of motion. Mid-pulley position targets the sternal (middle) chest fibers.' },
  { name: 'Chest Fly (Machine)', muscle_group: 'chest', equipment: 'machine', description: 'Pec deck isolation for the pectoralis major through horizontal adduction. Machine stabilization allows full focus on chest contraction without stabilizer fatigue.' },
  { name: 'High-to-Low Chest Fly (Cable)', muscle_group: 'chest', equipment: 'cable', description: 'Isolation targeting the costal (lower) fibers of the pectoralis major. High-to-low cable angle emphasizes the lower chest through a downward adduction path.' },
  { name: 'Low-to-High Chest Fly (Cable)', muscle_group: 'chest', equipment: 'cable', description: 'Isolation targeting the clavicular (upper) head of the pectoralis major. Low-to-high cable angle emphasizes the upper chest through an upward adduction path.' },
  { name: 'Push-Up', muscle_group: 'chest', equipment: 'bodyweight', description: 'Compound bodyweight exercise targeting the pectoralis major, anterior deltoids, and triceps. Standard hand position emphasizes the sternal chest fibers.' },
  { name: 'Dip', muscle_group: 'chest', equipment: 'bodyweight', description: 'Compound movement targeting the lower pectoralis major, anterior deltoids, and triceps. Forward lean increases chest activation; upright torso shifts emphasis to triceps.' },

  // Back
  { name: 'Row (Barbell)', muscle_group: 'back', equipment: 'barbell', description: 'Compound pull targeting the latissimus dorsi, rhomboids, middle and lower trapezius, and posterior deltoids. Overhand bent-over row builds overall back thickness.' },
  { name: 'Row (Dumbbell)', muscle_group: 'back', equipment: 'dumbbell', description: 'Unilateral compound pull targeting the latissimus dorsi, rhomboids, and posterior deltoids. Single-arm movement allows full range of motion and corrects imbalances.' },
  { name: 'Seated Row (Cable)', muscle_group: 'back', equipment: 'cable', description: 'Horizontal pull targeting the middle trapezius, rhomboids, and latissimus dorsi. Close grip emphasizes lat thickness; wide grip shifts emphasis to rhomboids and rear delts.' },
  { name: 'T-Bar Row', muscle_group: 'back', equipment: 'barbell', description: 'Compound pull targeting the middle back—rhomboids, middle trapezius, and latissimus dorsi. Allows heavy loading for back thickness, chest-supported or free-standing.' },
  { name: 'Deadlift (Barbell)', muscle_group: 'back', equipment: 'barbell', description: 'Full posterior chain compound targeting the erector spinae, gluteus maximus, hamstrings, and latissimus dorsi. Conventional stance for overall back and hip development.' },
  { name: 'Sumo Deadlift (Barbell)', muscle_group: 'back', equipment: 'barbell', description: 'Wide-stance deadlift shifting emphasis to the adductors and quadriceps while still heavily engaging the erector spinae, glutes, and hamstrings.' },
  { name: 'Pull-Up', muscle_group: 'back', equipment: 'bodyweight', description: 'Compound vertical pull targeting the latissimus dorsi, teres major, rhomboids, and biceps. Pronated (overhand) grip emphasizes lat width and upper back.' },
  { name: 'Chin-Up', muscle_group: 'back', equipment: 'bodyweight', description: 'Compound vertical pull with supinated (underhand) grip. Greater biceps involvement and emphasis on the lower lats compared to pull-ups.' },
  { name: 'Lat Pulldown (Cable)', muscle_group: 'back', equipment: 'cable', description: 'Vertical pull targeting the latissimus dorsi and teres major. Wide grip emphasizes lat width; close or underhand grip emphasizes the lower lats and biceps.' },
  { name: 'Lat Pulldown (Machine)', muscle_group: 'back', equipment: 'machine', description: 'Machine-based vertical pull targeting the latissimus dorsi. Fixed path allows consistent lat isolation without stabilizer fatigue.' },
  { name: 'Face Pull (Cable)', muscle_group: 'back', equipment: 'cable', description: 'Targets the posterior deltoids, middle and lower trapezius, and external rotators (infraspinatus, teres minor). Essential for shoulder health and upper back development.' },
  { name: 'Kelso Shrug (Barbell)', muscle_group: 'back', equipment: 'barbell', description: 'Prone or incline shrug isolating the middle trapezius and rhomboids. Targets the scapular retractors without upper trap dominance.' },
  { name: 'Straight-Arm Pulldown (Cable)', muscle_group: 'back', equipment: 'cable', description: 'Isolation for the latissimus dorsi through shoulder extension with straight arms. Removes biceps involvement, focusing entirely on lat contraction.' },
  { name: 'Pullover (Dumbbell)', muscle_group: 'back', equipment: 'dumbbell', description: 'Targets the latissimus dorsi and teres major through shoulder extension. Also stretches the pectoralis major and engages the serratus anterior and long head of the triceps.' },

  // Shoulders
  { name: 'Overhead Press (Barbell)', muscle_group: 'shoulders', equipment: 'barbell', description: 'Compound press targeting the anterior and lateral deltoids with secondary clavicular pectoralis and triceps activation. Standing version engages core stabilizers.' },
  { name: 'Shoulder Press (Dumbbell)', muscle_group: 'shoulders', equipment: 'dumbbell', description: 'Compound press targeting all three deltoid heads with emphasis on the anterior and lateral heads. Independent arms allow natural arc and address strength imbalances.' },
  { name: 'Shoulder Press (Machine)', muscle_group: 'shoulders', equipment: 'machine', description: 'Machine compound press targeting the anterior and lateral deltoids with triceps assistance. Fixed path provides stability for heavier pressing.' },
  { name: 'Arnold Press (Dumbbell)', muscle_group: 'shoulders', equipment: 'dumbbell', description: 'Rotational press targeting all three deltoid heads. Rotation from supinated to pronated grip increases time under tension for the anterior and lateral deltoids.' },
  { name: 'Lateral Raise (Dumbbell)', muscle_group: 'shoulders', equipment: 'dumbbell', description: 'Isolation for the lateral (middle) deltoid through shoulder abduction. Primary exercise for building shoulder width with minimal anterior and posterior deltoid involvement.' },
  { name: 'Lateral Raise (Cable)', muscle_group: 'shoulders', equipment: 'cable', description: 'Isolation for the lateral deltoid with constant tension throughout the range. Cable provides resistance at the bottom where dumbbells lose tension.' },
  { name: 'Lateral Raise (Machine)', muscle_group: 'shoulders', equipment: 'machine', description: 'Machine isolation for the lateral deltoid through shoulder abduction. Consistent resistance curve eliminates momentum for focused middle delt activation.' },
  { name: 'Front Raise (Dumbbell)', muscle_group: 'shoulders', equipment: 'dumbbell', description: 'Isolation for the anterior (front) deltoid through shoulder flexion. Secondary activation of the clavicular pectoralis major and upper trapezius.' },
  { name: 'Front Raise (Cable)', muscle_group: 'shoulders', equipment: 'cable', description: 'Isolation for the anterior deltoid with constant cable tension through shoulder flexion. Eliminates momentum for focused front delt activation.' },
  { name: 'Reverse Fly (Dumbbell)', muscle_group: 'shoulders', equipment: 'dumbbell', description: 'Isolation for the posterior (rear) deltoid, rhomboids, and middle trapezius. Bent-over position with horizontal arm abduction targets the rear delts.' },
  { name: 'Reverse Fly (Cable)', muscle_group: 'shoulders', equipment: 'cable', description: 'Isolation for the posterior deltoid with constant cable tension. Targets the rear delts, rhomboids, and middle trapezius through horizontal abduction.' },
  { name: 'Reverse Fly (Machine)', muscle_group: 'shoulders', equipment: 'machine', description: 'Machine isolation for the posterior deltoid. Chest-supported position eliminates momentum for focused rear delt and upper back activation.' },
  { name: 'Upright Row (Barbell)', muscle_group: 'shoulders', equipment: 'barbell', description: 'Compound pull targeting the lateral deltoid and upper trapezius. Raises the barbell along the torso to chin height with secondary biceps and forearm activation.' },
  { name: 'Shrug (Barbell)', muscle_group: 'shoulders', equipment: 'barbell', description: 'Isolation for the upper trapezius through shoulder elevation. Heavy loading builds the upper trap area connecting the neck and shoulders.' },
  { name: 'Shrug (Dumbbell)', muscle_group: 'shoulders', equipment: 'dumbbell', description: 'Isolation for the upper trapezius with independent arm movement. Dumbbells allow a slightly greater range of motion and more natural shoulder path than barbell.' },

  // Biceps
  { name: 'Curl (Barbell)', muscle_group: 'biceps', equipment: 'barbell', description: 'Targets both heads of the biceps brachii (long and short head) with secondary forearm flexor activation. Standing position allows heavier loading for overall bicep mass.' },
  { name: 'Curl (Dumbbell)', muscle_group: 'biceps', equipment: 'dumbbell', description: 'Targets both heads of the biceps brachii with independent arm movement. Supinated grip throughout allows wrist rotation for peak contraction.' },
  { name: 'Curl (Cable)', muscle_group: 'biceps', equipment: 'cable', description: 'Isolation for the biceps brachii with constant cable tension. Eliminates the dead zone at the top and bottom where dumbbells lose resistance.' },
  { name: 'Curl (Machine)', muscle_group: 'biceps', equipment: 'machine', description: 'Machine-based isolation for the biceps brachii. Fixed path ensures consistent activation of both the long and short heads throughout each rep.' },
  { name: 'Hammer Curl (Dumbbell)', muscle_group: 'biceps', equipment: 'dumbbell', description: 'Targets the brachialis and brachioradialis with a neutral (palms-facing) grip. Also activates the long head of the biceps. Builds forearm and arm thickness.' },
  { name: 'Incline Curl (Dumbbell)', muscle_group: 'biceps', equipment: 'dumbbell', description: 'Emphasizes the long head of the biceps brachii through an increased stretch. Incline bench places the shoulder in extension, lengthening the long head for greater activation.' },
  { name: 'Preacher Curl (Barbell)', muscle_group: 'biceps', equipment: 'barbell', description: 'Isolation for the short head of the biceps brachii. Preacher bench eliminates momentum and locks the upper arm in shoulder flexion, emphasizing the inner bicep.' },
  { name: 'Preacher Curl (Machine)', muscle_group: 'biceps', equipment: 'machine', description: 'Machine-based isolation for the short head of the biceps. Consistent resistance curve through the full range with no momentum or cheating possible.' },
  { name: 'Bayesian Curl (Cable)', muscle_group: 'biceps', equipment: 'cable', description: 'Isolation for the long head of the biceps brachii. Cable behind the body places the shoulder in extension, maximally stretching and activating the long (outer) head.' },
  { name: 'Concentration Curl (Dumbbell)', muscle_group: 'biceps', equipment: 'dumbbell', description: 'Isolation for the biceps brachii, particularly the short head. Elbow braced against inner thigh eliminates all momentum for peak contraction.' },
  { name: 'Spider Curl (Dumbbell)', muscle_group: 'biceps', equipment: 'dumbbell', description: 'Isolation emphasizing the short head of the biceps. Prone on incline bench with arms hanging straight down eliminates momentum and maximizes peak contraction at the top.' },
  { name: 'Reverse Curl (Barbell)', muscle_group: 'biceps', equipment: 'barbell', description: 'Targets the brachioradialis and brachialis with a pronated (overhand) grip. Reduces biceps brachii involvement, building the forearms and outer arm.' },
  { name: 'Reverse Curl (Dumbbell)', muscle_group: 'biceps', equipment: 'dumbbell', description: 'Pronated-grip curl targeting the brachioradialis and brachialis. Dumbbells allow independent arm training and slight wrist rotation for comfort while de-emphasizing the biceps brachii.' },
  { name: 'Reverse Curl (Cable)', muscle_group: 'biceps', equipment: 'cable', description: 'Pronated-grip curl with constant cable tension throughout the full range of motion. Targets the brachioradialis and brachialis while maintaining continuous load at both the top and bottom of the curl.' },

  // Triceps
  { name: 'Close-Grip Bench Press (Barbell)', muscle_group: 'triceps', equipment: 'barbell', description: 'Compound press emphasizing all three tricep heads (long, lateral, medial) with secondary chest activation. Narrow grip shifts load from the pectoralis to the triceps.' },
  { name: 'Tricep Pushdown (Cable)', muscle_group: 'triceps', equipment: 'cable', description: 'Isolation for the lateral and medial heads of the triceps. Rope attachment allows wrist pronation for peak contraction; straight bar allows heavier loading.' },
  { name: 'Tricep Pushdown (Machine)', muscle_group: 'triceps', equipment: 'machine', description: 'Machine isolation for the triceps, primarily targeting the lateral and medial heads. Fixed resistance path provides consistent loading.' },
  { name: 'Overhead Tricep Extension (Dumbbell)', muscle_group: 'triceps', equipment: 'dumbbell', description: 'Isolation emphasizing the long head of the triceps. Overhead position stretches the long head (which crosses the shoulder joint) for maximal activation.' },
  { name: 'Overhead Tricep Extension (Cable)', muscle_group: 'triceps', equipment: 'cable', description: 'Isolation for the long head of the triceps with constant cable tension. Overhead position maximally stretches the long head for full range activation.' },
  { name: 'Skull Crusher (Barbell)', muscle_group: 'triceps', equipment: 'barbell', description: 'Isolation targeting all three tricep heads with emphasis on the long and medial heads. Lying position with the EZ-bar lowered toward the forehead or behind the head.' },
  { name: 'Tricep Dip', muscle_group: 'triceps', equipment: 'bodyweight', description: 'Compound bodyweight movement targeting all three tricep heads (lateral, medial, long). Upright torso maximizes tricep activation over chest involvement.' },
  { name: 'Kickback (Dumbbell)', muscle_group: 'triceps', equipment: 'dumbbell', description: 'Isolation primarily targeting the lateral head of the triceps. Bent-over position with full arm extension behind the body emphasizes peak tricep contraction.' },
  { name: 'JM Press (Barbell)', muscle_group: 'triceps', equipment: 'barbell', description: 'Hybrid of skull crusher and close-grip bench press targeting the lateral and medial heads. Unique elbow path increases tricep loading while reducing shoulder stress.' },
  { name: 'Tricep Extension (Cable)', muscle_group: 'triceps', equipment: 'cable', description: 'Isolation for the triceps with constant cable tension. Single-arm or bilateral variations target all three heads with emphasis on the lateral and medial heads.' },
  { name: 'Tricep Extension (Machine)', muscle_group: 'triceps', equipment: 'machine', description: 'Machine-based isolation for the triceps. Consistent resistance curve targets the lateral and medial heads through a fixed extension path.' },
  { name: 'Diamond Push-Up', muscle_group: 'triceps', equipment: 'bodyweight', description: 'Bodyweight compound emphasizing all three tricep heads with secondary chest activation. Hands close together in a diamond shape maximizes tricep recruitment.' },

  // Forearms
  { name: 'Wrist Curl (Barbell)', muscle_group: 'forearms', equipment: 'barbell', description: 'Isolation for the wrist flexors (flexor carpi radialis, flexor carpi ulnaris, palmaris longus). Palms-up grip curling the bar with forearms resting on a bench or knees.' },
  { name: 'Wrist Curl (Dumbbell)', muscle_group: 'forearms', equipment: 'dumbbell', description: 'Isolation for the wrist flexors with independent arm movement. Allows natural wrist articulation and addresses forearm strength imbalances.' },
  { name: 'Wrist Curl (Cable)', muscle_group: 'forearms', equipment: 'cable', description: 'Isolation for the wrist flexors with constant cable tension throughout the full wrist flexion range of motion.' },
  { name: 'Reverse Wrist Curl (Barbell)', muscle_group: 'forearms', equipment: 'barbell', description: 'Isolation for the wrist extensors (extensor carpi radialis, extensor carpi ulnaris, extensor digitorum). Pronated grip strengthens the top of the forearm.' },
  { name: 'Reverse Wrist Curl (Dumbbell)', muscle_group: 'forearms', equipment: 'dumbbell', description: 'Isolation for the wrist extensors with independent arm movement. Targets the extensor muscles on the top of the forearm.' },
  { name: 'Reverse Wrist Curl (Cable)', muscle_group: 'forearms', equipment: 'cable', description: 'Isolation for the wrist extensors with constant cable tension. Targets the extensor carpi radialis and extensor digitorum.' },
  { name: "Farmer's Walk (Dumbbell)", muscle_group: 'forearms', equipment: 'dumbbell', description: 'Loaded carry targeting grip strength, forearm endurance, and core stability. Engages the finger flexors, wrist stabilizers, and upper trapezius.' },

  // Core
  { name: 'Plank', muscle_group: 'core', equipment: 'bodyweight', description: 'Isometric hold targeting the rectus abdominis, transverse abdominis, and obliques. Anti-extension exercise building core stability and endurance.' },
  { name: 'Crunch', muscle_group: 'core', equipment: 'bodyweight', description: 'Isolation for the upper rectus abdominis through short-range spinal flexion. Minimal hip flexor involvement when performed with controlled range of motion.' },
  { name: 'Crunch (Cable)', muscle_group: 'core', equipment: 'cable', description: 'Isolation for the rectus abdominis with adjustable cable resistance. Kneeling position allows progressive overload targeting the entire abdominal wall.' },
  { name: 'Hanging Leg Raise', muscle_group: 'core', equipment: 'bodyweight', description: 'Targets the lower rectus abdominis and hip flexors (iliopsoas). Hanging position allows full hip flexion range for lower abdominal emphasis.' },
  { name: 'Ab Rollout', muscle_group: 'core', equipment: 'other', description: 'Anti-extension exercise targeting the rectus abdominis, transverse abdominis, and obliques. Eccentric loading of the entire anterior core with an ab wheel.' },
  { name: 'Russian Twist', muscle_group: 'core', equipment: 'bodyweight', description: 'Rotational exercise targeting the internal and external obliques. Seated torso rotation challenges the transverse abdominis and spinal rotators.' },
  { name: 'Side Plank', muscle_group: 'core', equipment: 'bodyweight', description: 'Isometric hold targeting the obliques (primarily bottom-side), quadratus lumborum, and gluteus medius. Anti-lateral flexion exercise for lateral core stability.' },
  { name: 'Decline Sit-Up', muscle_group: 'core', equipment: 'bodyweight', description: 'Targets the rectus abdominis and hip flexors with increased resistance from the decline angle. Full-range spinal flexion with gravity-enhanced loading.' },
  { name: 'Bicycle Crunch', muscle_group: 'core', equipment: 'bodyweight', description: 'Dynamic rotational exercise targeting the rectus abdominis and obliques. Alternating elbow-to-knee movement combines spinal flexion with rotation.' },
  { name: 'Dead Bug', muscle_group: 'core', equipment: 'bodyweight', description: 'Anti-extension exercise targeting the transverse abdominis and rectus abdominis. Supine position with alternating arm and leg extensions builds deep core stability.' },
  { name: 'Pallof Press (Cable)', muscle_group: 'core', equipment: 'cable', description: 'Anti-rotation exercise targeting the obliques, transverse abdominis, and core stabilizers. Resisting rotational force from the cable builds rotational stability.' },
  { name: 'Woodchop (Cable)', muscle_group: 'core', equipment: 'cable', description: 'Dynamic rotational exercise targeting the obliques, transverse abdominis, and serratus anterior. Diagonal chopping motion builds rotational power and core strength.' },

  // Quads
  { name: 'Squat (Barbell)', muscle_group: 'quads', equipment: 'barbell', description: 'Compound targeting the quadriceps (vastus lateralis, medialis, intermedius, rectus femoris) with significant gluteus maximus and adductor involvement. Primary lower body mass builder.' },
  { name: 'Front Squat (Barbell)', muscle_group: 'quads', equipment: 'barbell', description: 'Quad-dominant squat with bar on the front delts. Upright torso increases quadriceps loading, particularly the vastus medialis, while reducing posterior chain demand.' },
  { name: 'Leg Press (Machine)', muscle_group: 'quads', equipment: 'machine', description: 'Compound machine exercise targeting the quadriceps with secondary glute and hamstring activation. Low foot placement emphasizes quads; high placement shifts to glutes.' },
  { name: 'Leg Extension (Machine)', muscle_group: 'quads', equipment: 'machine', description: 'Isolation for all four quadriceps heads (rectus femoris, vastus lateralis, vastus medialis, vastus intermedius). The only exercise that fully isolates the quads from the posterior chain.' },
  { name: 'Goblet Squat (Dumbbell)', muscle_group: 'quads', equipment: 'dumbbell', description: 'Front-loaded squat targeting the quadriceps with secondary glute activation. Upright torso and goblet hold emphasize the quads and engage the core and upper back.' },
  { name: 'Hack Squat (Machine)', muscle_group: 'quads', equipment: 'machine', description: 'Quad-dominant compound in a fixed machine path. Back-supported position heavily targets the vastus medialis and vastus lateralis with reduced spinal loading.' },
  { name: 'Bulgarian Split Squat (Dumbbell)', muscle_group: 'quads', equipment: 'dumbbell', description: 'Unilateral compound targeting the quadriceps and gluteus maximus. Rear foot elevated increases range of motion and quad stretch. Addresses bilateral imbalances.' },
  { name: 'Walking Lunge (Dumbbell)', muscle_group: 'quads', equipment: 'dumbbell', description: 'Dynamic unilateral exercise targeting the quadriceps, gluteus maximus, and hip stabilizers. Shorter stride emphasizes quads; longer stride emphasizes glutes.' },
  { name: 'Sissy Squat', muscle_group: 'quads', equipment: 'bodyweight', description: 'Isolation-style quad exercise targeting the rectus femoris and vastus muscles. Leaning back with heels raised maximizes knee flexion for an intense quad stretch.' },
  { name: 'Lunge (Barbell)', muscle_group: 'quads', equipment: 'barbell', description: 'Unilateral compound targeting the quadriceps and gluteus maximus with barbell loading. Engages core stabilizers and hip adductors for balance and stability.' },
  { name: 'Pendulum Squat (Machine)', muscle_group: 'quads', equipment: 'machine', description: 'Quad-dominant machine squat with an arc-path movement. Reduces spinal loading while maximizing knee flexion for deep quadriceps engagement, particularly the vastus medialis.' },

  // Hamstrings
  { name: 'Romanian Deadlift (Barbell)', muscle_group: 'hamstrings', equipment: 'barbell', description: 'Compound hip hinge targeting the hamstrings (biceps femoris, semitendinosus, semimembranosus) and gluteus maximus. Eccentric stretch of the hamstrings with minimal knee bend.' },
  { name: 'Romanian Deadlift (Dumbbell)', muscle_group: 'hamstrings', equipment: 'dumbbell', description: 'Hip hinge targeting the hamstrings and glutes with independent arm loading. Dumbbells allow a natural grip path and slightly greater range of motion than barbell.' },
  { name: 'Lying Leg Curl (Machine)', muscle_group: 'hamstrings', equipment: 'machine', description: 'Isolation for the hamstrings through knee flexion, primarily targeting the biceps femoris (short and long heads). Prone position provides a consistent resistance curve.' },
  { name: 'Seated Leg Curl (Machine)', muscle_group: 'hamstrings', equipment: 'machine', description: 'Isolation for the hamstrings with emphasis on the semitendinosus and semimembranosus. Seated hip-flexed position provides a greater hamstring stretch than lying curls.' },
  { name: 'Stiff-Leg Deadlift (Barbell)', muscle_group: 'hamstrings', equipment: 'barbell', description: 'Hip hinge targeting the hamstrings and erector spinae. Straighter legs than RDL increase the hamstring stretch and lower back involvement for the full posterior chain.' },
  { name: 'Good Morning (Barbell)', muscle_group: 'hamstrings', equipment: 'barbell', description: 'Hip hinge targeting the hamstrings, gluteus maximus, and erector spinae. Bar on the upper back with forward lean loads the entire posterior chain.' },
  { name: 'Nordic Curl', muscle_group: 'hamstrings', equipment: 'bodyweight', description: 'Eccentric-focused isolation for the hamstrings targeting the biceps femoris, semitendinosus, and semimembranosus through resisted knee flexion. Highly effective for hypertrophy and injury prevention.' },
  { name: 'Glute-Ham Raise (Machine)', muscle_group: 'hamstrings', equipment: 'machine', description: 'Compound posterior chain exercise combining knee flexion (hamstrings) and hip extension (glutes). One of the most complete hamstring exercises, targeting all three hamstring muscles.' },
  { name: 'Single-Leg Romanian Deadlift (Dumbbell)', muscle_group: 'hamstrings', equipment: 'dumbbell', description: 'Unilateral hip hinge targeting the hamstrings and gluteus maximus of one leg. Challenges balance and proprioception while addressing bilateral strength imbalances.' },

  // Glutes
  { name: 'Hip Thrust (Barbell)', muscle_group: 'glutes', equipment: 'barbell', description: 'Targets the gluteus maximus with peak contraction at full hip extension. Primary glute builder with minimal hamstring involvement at lockout. Back-supported for heavy loading.' },
  { name: 'Hip Thrust (Dumbbell)', muscle_group: 'glutes', equipment: 'dumbbell', description: 'Hip extension targeting the gluteus maximus with dumbbell resistance. Suitable for lighter loads, home training, and unilateral variations.' },
  { name: 'Glute Bridge', muscle_group: 'glutes', equipment: 'bodyweight', description: 'Bodyweight hip extension targeting the gluteus maximus. Floor-based with shorter range of motion than hip thrusts. Good for activation and warm-up.' },
  { name: 'Pull-Through (Cable)', muscle_group: 'glutes', equipment: 'cable', description: 'Hip hinge targeting the gluteus maximus and hamstrings. Cable between the legs provides horizontal resistance through hip extension for glute peak contraction.' },
  { name: 'Glute Kickback (Cable)', muscle_group: 'glutes', equipment: 'cable', description: 'Isolation for the gluteus maximus through single-leg hip extension. Cable provides constant tension for focused glute activation and peak contraction.' },
  { name: 'Glute Kickback (Machine)', muscle_group: 'glutes', equipment: 'machine', description: 'Machine-based isolation for the gluteus maximus. Fixed path focuses entirely on hip extension for targeted glute activation without stabilizer fatigue.' },
  { name: 'Step-Up (Dumbbell)', muscle_group: 'glutes', equipment: 'dumbbell', description: 'Unilateral compound targeting the gluteus maximus and quadriceps. Higher box height increases glute involvement; lower height emphasizes the quadriceps.' },
  { name: 'Hip Abduction (Machine)', muscle_group: 'glutes', equipment: 'machine', description: 'Isolation for the gluteus medius and gluteus minimus through hip abduction. Seated machine movement targets the upper and outer glutes for hip stability and shape.' },
  { name: 'Hip Adduction (Machine)', muscle_group: 'glutes', equipment: 'machine', description: 'Isolation for the adductor magnus, longus, and brevis (inner thigh). Seated machine movement strengthens hip adductors for stability, injury prevention, and inner thigh development.' },

  // Calves
  { name: 'Standing Calf Raise (Machine)', muscle_group: 'calves', equipment: 'machine', description: 'Isolation for the gastrocnemius (the larger, outer calf muscle). Standing with straight knees maximally activates both the medial and lateral heads of the gastrocnemius.' },
  { name: 'Seated Calf Raise (Machine)', muscle_group: 'calves', equipment: 'machine', description: 'Isolation for the soleus (the deeper, flat muscle beneath the gastrocnemius). Bent-knee position disengages the gastrocnemius, shifting load entirely to the soleus.' },
  { name: 'Donkey Calf Raise (Machine)', muscle_group: 'calves', equipment: 'machine', description: 'Isolation for the gastrocnemius with hips flexed. Bent-over position increases the stretch on the gastrocnemius for greater range of motion and hypertrophy potential.' },
  { name: 'Calf Raise (Bodyweight)', muscle_group: 'calves', equipment: 'bodyweight', description: 'Single or double-leg bodyweight calf raise targeting the gastrocnemius and soleus. Useful for high-rep endurance work and addressing bilateral calf imbalances.' },
  { name: 'Calf Raise (Leg Press)', muscle_group: 'calves', equipment: 'machine', description: 'Calf raise performed on the leg press machine targeting the gastrocnemius. Allows heavy loading in a controlled, back-supported environment.' },

  // Full Body / Compound
  { name: 'Clean and Press (Barbell)', muscle_group: 'full_body', equipment: 'barbell', description: 'Explosive full-body compound targeting the posterior chain, quadriceps, trapezius, and deltoids. Combines a power clean with an overhead press for total-body power.' },
  { name: 'Thruster (Barbell)', muscle_group: 'full_body', equipment: 'barbell', description: 'Compound combining a front squat with an overhead press. Targets the quadriceps, gluteus maximus, deltoids, and triceps in one continuous movement.' },
  { name: 'Swing (Kettlebell)', muscle_group: 'full_body', equipment: 'kettlebell', description: 'Ballistic hip hinge targeting the gluteus maximus, hamstrings, and core. Explosive hip extension drives the kettlebell for posterior chain power and cardiovascular endurance.' },
  { name: 'Turkish Get-Up (Kettlebell)', muscle_group: 'full_body', equipment: 'kettlebell', description: 'Multi-joint stabilization exercise targeting the shoulders, core, hips, and legs. Full-body movement from lying to standing builds coordination, stability, and mobility.' },
  { name: 'Burpee', muscle_group: 'full_body', equipment: 'bodyweight', description: 'Full-body conditioning targeting the chest, shoulders, triceps, quadriceps, and core. Combines a push-up with a squat jump for cardiovascular and muscular endurance.' },
  { name: 'Man Maker (Dumbbell)', muscle_group: 'full_body', equipment: 'dumbbell', description: 'Full-body complex combining a push-up, renegade row, and dumbbell thruster. Targets the chest, back, shoulders, arms, core, quadriceps, and glutes.' },
  { name: 'Power Clean (Barbell)', muscle_group: 'full_body', equipment: 'barbell', description: 'Explosive triple-extension movement targeting the posterior chain, quadriceps, trapezius, and deltoids. Olympic lift variation building full-body power and athleticism.' },

  // Cardio
  { name: 'Run (Treadmill)', muscle_group: 'cardio', equipment: 'machine', description: 'Cardiovascular exercise engaging the quadriceps, hamstrings, calves, and glutes. Adjustable speed and incline for varied intensity and targeted endurance training.' },
  { name: 'Cycling (Machine)', muscle_group: 'cardio', equipment: 'machine', description: 'Low-impact cardiovascular exercise primarily engaging the quadriceps, glutes, and calves with secondary hamstring involvement. Adjustable resistance for interval or steady-state training.' },
  { name: 'Rowing (Machine)', muscle_group: 'cardio', equipment: 'machine', description: 'Full-body cardiovascular exercise engaging the legs (quads, hamstrings), back (lats, rhomboids), biceps, and core. Alternates between leg drive and upper-body pull.' },
  { name: 'Stair Climber (Machine)', muscle_group: 'cardio', equipment: 'machine', description: 'Cardiovascular exercise targeting the quadriceps, glutes, and calves through repetitive stepping motion. High caloric expenditure with lower joint impact than running.' },
  { name: 'Jump Rope', muscle_group: 'cardio', equipment: 'other', description: 'High-intensity cardiovascular exercise targeting the calves, shoulders, and forearms. Develops coordination, footwork, and cardiovascular endurance.' },
  { name: 'Battle Ropes', muscle_group: 'cardio', equipment: 'other', description: 'Upper-body dominant cardiovascular exercise targeting the shoulders, arms, and core. Alternating or simultaneous rope waves build muscular and cardiovascular endurance.' },
  { name: 'Elliptical (Machine)', muscle_group: 'cardio', equipment: 'machine', description: 'Low-impact full-body cardiovascular exercise engaging the quadriceps, hamstrings, glutes, and arms. Adjustable resistance and incline for varied training intensity.' },
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
  const existing = new Set(
    db.select({ name: exercises.name }).from(exercises).where(isNull(exercises.user_id)).all().map((r) => r.name)
  );

  const newExercises = EXERCISES.filter((ex) => !existing.has(ex.name));

  if (newExercises.length === 0) {
    console.log(`Exercises up to date (${existing.size} built-in exercises exist)`);
    return;
  }

  db.insert(exercises).values(
    newExercises.map((ex) => ({
      user_id: null,
      name: ex.name,
      muscle_group: ex.muscle_group,
      equipment: ex.equipment,
      description: ex.description,
    }))
  ).run();

  console.log(`Seeded ${newExercises.length} new exercises (${existing.size} already existed)`);
}

export function seedFoods() {
  const existing = new Set(
    db.select({ name: foods.name }).from(foods).where(eq(foods.source, 'usda')).all().map((r) => r.name)
  );

  const newFoods = FOODS.filter(([name]) => !existing.has(name));

  if (newFoods.length === 0) {
    console.log(`Foods up to date (${existing.size} USDA foods exist)`);
    return;
  }

  db.insert(foods).values(
    newFoods.map(([name, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g]) => ({
      user_id: null,
      barcode: null,
      name,
      brand: 'USDA',
      serving_size,
      serving_unit,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      source: 'usda',
    }))
  ).run();

  console.log(`Seeded ${newFoods.length} new foods (${existing.size} already existed)`);
}

export function seed() {
  seedExercises();
  seedFoods();
}
