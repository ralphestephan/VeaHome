import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'veahome',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// When compiled to dist/, __dirname becomes dist/database.
// We want to run migrations from the repo folder: backend/database/migrations.
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'database', 'migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const { rows } = await pool.query('SELECT name FROM schema_migrations');
  return new Set(rows.map((row) => row.name as string));
}

async function applyMigration(name: string, sql: string) {
  console.log(`Applying migration: ${name}`);
  await pool.query('BEGIN');
  try {
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
    await pool.query('COMMIT');
    console.log(`✅ Migration applied: ${name}`);
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(`❌ Migration failed: ${name}`);
    throw error;
  }
}

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    await ensureMigrationsTable();
    const applied = await getAppliedMigrations();

    const migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      if (applied.has(file)) {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      await applyMigration(file, sql);
    }

    console.log('✅ All migrations are up to date');
  } catch (error) {
    console.error('❌ Migration run failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigrations();
