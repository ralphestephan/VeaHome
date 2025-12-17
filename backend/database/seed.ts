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

async function runSeed() {
  try {
    const seedPath = path.resolve(process.cwd(), 'database', 'seed.sql');
    const sql = fs.readFileSync(seedPath, 'utf-8');
    await pool.query(sql);
    console.log('✅ Seed applied');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runSeed();
