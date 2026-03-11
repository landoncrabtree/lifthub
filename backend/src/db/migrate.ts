import { migrate as drizzleMigrate } from 'drizzle-orm/better-sqlite3/migrator';
import db from './connection.js';
import path from 'path';
import fs from 'fs';

export function migrate() {
  const migrationsDir = path.join(process.cwd(), 'drizzle');

  // If migrations folder exists with files, run Drizzle migrations
  if (fs.existsSync(migrationsDir) && fs.readdirSync(migrationsDir).some((f) => f.endsWith('.sql'))) {
    drizzleMigrate(db, { migrationsFolder: migrationsDir });
    console.log('Drizzle migrations applied');
  } else {
    console.log('No migration files found — run `npx drizzle-kit generate` then `npx drizzle-kit migrate`');
  }
}
