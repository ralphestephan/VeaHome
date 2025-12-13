import { query } from '../config/database';

export interface EnergyMetricInput {
  homeId: string;
  granularity: 'hour' | 'day';
  bucketStart: Date;
  totals: Record<string, unknown>;
}

export async function upsertEnergyMetric(input: EnergyMetricInput) {
  await query(
    `INSERT INTO energy_metrics (home_id, granularity, bucket_start, totals)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (home_id, granularity, bucket_start)
     DO UPDATE SET totals = EXCLUDED.totals, updated_at = CURRENT_TIMESTAMP`,
    [input.homeId, input.granularity, input.bucketStart, JSON.stringify(input.totals)]
  );
}

export async function getEnergyMetrics(homeId: string, granularity: 'hour' | 'day', from?: Date, to?: Date) {
  const conditions = ['home_id = $1', 'granularity = $2'];
  const values: any[] = [homeId, granularity];

  if (from) {
    conditions.push(`bucket_start >= $${conditions.length + 1}`);
    values.push(from);
  }
  if (to) {
    conditions.push(`bucket_start <= $${conditions.length + 1}`);
    values.push(to);
  }

  const { rows } = await query(
    `SELECT * FROM energy_metrics
     WHERE ${conditions.join(' AND ')}
     ORDER BY bucket_start`,
    values
  );
  return rows;
}
