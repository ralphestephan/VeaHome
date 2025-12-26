import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { newDb, DataType } from 'pg-mem';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const useInMemoryDb = process.env.USE_IN_MEMORY_DB === 'true';

let pool: Pool;

if (useInMemoryDb) {
  const db = newDb({ autoCreateForeignKeyIndices: true });

  db.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: DataType.uuid,
    implementation: uuidv4,
  });

  const migrationPath = path.resolve(__dirname, '../../database/migrations/001_initial_schema.sql');
  if (fs.existsSync(migrationPath)) {
    const migrationSql = fs
      .readFileSync(migrationPath, 'utf-8')
      .replace(/CREATE\s+EXTENSION[\s\S]*?;/i, '')
      .replace(/DECIMAL\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, 'DECIMAL');
    db.public.none(migrationSql);
  }

  const seedPath = path.resolve(__dirname, '../../database/seed.sql');
  if (fs.existsSync(seedPath)) {
    const seedSql = fs.readFileSync(seedPath, 'utf-8');
    db.public.none(seedSql);
  }

  const pgMem = db.adapters.createPg();
  const InMemoryPool = pgMem.Pool;
  pool = new InMemoryPool() as unknown as Pool;
  console.log('Using in-memory PostgreSQL database (pg-mem)');
} else {
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'veahome',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || undefined,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
  });
}

export default pool;

export const query = (text: string, params?: any[]) => pool.query(text, params);
