import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Progress data for a specific exercise
router.get('/exercise/:id', (req: Request, res: Response) => {
  const exerciseId = req.params.id;
  const limit = Number(req.query.limit) || 50;

  // Get historical set data grouped by workout date
  const data = db
    .prepare(
      `SELECT
         w.started_at as date,
         MAX(ws.weight) as max_weight,
         SUM(ws.reps * ws.weight) as volume,
         MAX(ws.reps) as max_reps,
         AVG(ws.rpe) as avg_rpe
       FROM workout_sets ws
       JOIN workouts w ON ws.workout_id = w.id
       WHERE w.user_id = ?
         AND ws.exercise_id = ?
         AND ws.completed = 1
         AND ws.weight IS NOT NULL
       GROUP BY w.id
       ORDER BY w.started_at DESC
       LIMIT ?`
    )
    .all(req.userId!, exerciseId, limit) as Array<{
    date: string;
    max_weight: number;
    volume: number;
    max_reps: number;
    avg_rpe: number | null;
  }>;

  // Calculate estimated 1RM using Epley formula: weight × (1 + reps/30)
  const dataWithE1RM = data.reverse().map((d) => ({
    ...d,
    estimated_1rm:
      d.max_weight && d.max_reps
        ? Math.round(d.max_weight * (1 + d.max_reps / 30) * 10) / 10
        : null,
  }));

  res.json(dataWithE1RM);
});

// Summary stats
router.get('/summary', (req: Request, res: Response) => {
  const userId = req.userId!;

  // Total completed workouts
  const totalWorkouts = db
    .prepare(
      'SELECT COUNT(*) as count FROM workouts WHERE user_id = ? AND finished_at IS NOT NULL'
    )
    .get(userId) as { count: number };

  // This week's workouts
  const thisWeek = db
    .prepare(
      `SELECT COUNT(*) as count FROM workouts
       WHERE user_id = ? AND finished_at IS NOT NULL
       AND started_at >= date('now', 'weekday 0', '-7 days')`
    )
    .get(userId) as { count: number };

  // Current streak (consecutive days with workouts)
  const recentDates = db
    .prepare(
      `SELECT DISTINCT date(started_at) as workout_date
       FROM workouts
       WHERE user_id = ? AND finished_at IS NOT NULL
       ORDER BY workout_date DESC
       LIMIT 60`
    )
    .all(userId) as Array<{ workout_date: string }>;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < recentDates.length; i++) {
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    const expected = expectedDate.toISOString().split('T')[0];

    if (recentDates[i].workout_date === expected) {
      streak++;
    } else if (i === 0) {
      // If today doesn't have a workout, check starting from yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (recentDates[i].workout_date === yesterdayStr) {
        streak++;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  // Personal records (heaviest set per exercise)
  const prs = db
    .prepare(
      `SELECT e.name as exercise_name, MAX(ws.weight) as weight, w.started_at as date
       FROM workout_sets ws
       JOIN workouts w ON ws.workout_id = w.id
       JOIN exercises e ON ws.exercise_id = e.id
       WHERE w.user_id = ? AND ws.completed = 1 AND ws.weight IS NOT NULL
       GROUP BY ws.exercise_id
       ORDER BY ws.weight DESC
       LIMIT 10`
    )
    .all(userId) as Array<{ exercise_name: string; weight: number; date: string }>;

  // Workout dates for heatmap (last 365 days)
  const heatmap = db
    .prepare(
      `SELECT date(started_at) as date, COUNT(*) as count
       FROM workouts
       WHERE user_id = ? AND finished_at IS NOT NULL
       AND started_at >= date('now', '-365 days')
       GROUP BY date(started_at)`
    )
    .all(userId) as Array<{ date: string; count: number }>;

  res.json({
    total_workouts: totalWorkouts.count,
    this_week: thisWeek.count,
    current_streak: streak,
    personal_records: prs,
    heatmap,
  });
});

export default router;
