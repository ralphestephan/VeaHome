import pool from '../config/database';

export interface TuyaIntegration {
  id: string;
  user_id: string;
  tuya_user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  region: string;
  created_at: Date;
  updated_at: Date;
}

export interface TuyaDevice {
  id: string;
  integration_id: string;
  home_id: string | null;
  tuya_device_id: string;
  name: string;
  category: string | null;
  product_id: string | null;
  online: boolean;
  capabilities: any;
  state: any;
  created_at: Date;
  updated_at: Date;
}

export async function createTuyaIntegration(data: {
  user_id: string;
  tuya_user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  region?: string;
}): Promise<TuyaIntegration> {
  const result = await pool.query(
    `INSERT INTO tuya_integrations (user_id, tuya_user_id, access_token, refresh_token, expires_at, region)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.user_id,
      data.tuya_user_id,
      data.access_token,
      data.refresh_token,
      data.expires_at,
      data.region || 'us',
    ]
  );
  return result.rows[0];
}

export async function findTuyaIntegrationByUserId(userId: string): Promise<TuyaIntegration | null> {
  const result = await pool.query(
    'SELECT * FROM tuya_integrations WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  return result.rows[0] || null;
}

export async function findTuyaIntegrationById(id: string): Promise<TuyaIntegration | null> {
  const result = await pool.query('SELECT * FROM tuya_integrations WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function updateTuyaIntegration(
  id: string,
  data: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: Date;
  }
): Promise<TuyaIntegration> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.access_token !== undefined) {
    updates.push(`access_token = $${paramCount++}`);
    values.push(data.access_token);
  }
  if (data.refresh_token !== undefined) {
    updates.push(`refresh_token = $${paramCount++}`);
    values.push(data.refresh_token);
  }
  if (data.expires_at !== undefined) {
    updates.push(`expires_at = $${paramCount++}`);
    values.push(data.expires_at);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const result = await pool.query(
    `UPDATE tuya_integrations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteTuyaIntegration(id: string): Promise<void> {
  await pool.query('DELETE FROM tuya_integrations WHERE id = $1', [id]);
}

export async function createTuyaDevice(data: {
  integration_id: string;
  home_id?: string;
  tuya_device_id: string;
  name: string;
  category?: string;
  product_id?: string;
  online?: boolean;
  capabilities?: any;
  state?: any;
}): Promise<TuyaDevice> {
  const result = await pool.query(
    `INSERT INTO tuya_devices (integration_id, home_id, tuya_device_id, name, category, product_id, online, capabilities, state)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (integration_id, tuya_device_id) 
     DO UPDATE SET 
       name = EXCLUDED.name,
       category = EXCLUDED.category,
       product_id = EXCLUDED.product_id,
       online = EXCLUDED.online,
       capabilities = EXCLUDED.capabilities,
       state = EXCLUDED.state,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      data.integration_id,
      data.home_id || null,
      data.tuya_device_id,
      data.name,
      data.category || null,
      data.product_id || null,
      data.online || false,
      JSON.stringify(data.capabilities || {}),
      JSON.stringify(data.state || {}),
    ]
  );
  return result.rows[0];
}

export async function findTuyaDevicesByIntegrationId(integrationId: string): Promise<TuyaDevice[]> {
  const result = await pool.query(
    'SELECT * FROM tuya_devices WHERE integration_id = $1 ORDER BY name',
    [integrationId]
  );
  return result.rows;
}

export async function findTuyaDevicesByHomeId(homeId: string): Promise<TuyaDevice[]> {
  const result = await pool.query(
    'SELECT * FROM tuya_devices WHERE home_id = $1 ORDER BY name',
    [homeId]
  );
  return result.rows;
}

export async function findTuyaDeviceById(id: string): Promise<TuyaDevice | null> {
  const result = await pool.query('SELECT * FROM tuya_devices WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function updateTuyaDevice(
  id: string,
  data: {
    home_id?: string | null;
    name?: string;
    online?: boolean;
    state?: any;
  }
): Promise<TuyaDevice> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.home_id !== undefined) {
    updates.push(`home_id = $${paramCount++}`);
    values.push(data.home_id);
  }
  if (data.name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(data.name);
  }
  if (data.online !== undefined) {
    updates.push(`online = $${paramCount++}`);
    values.push(data.online);
  }
  if (data.state !== undefined) {
    updates.push(`state = $${paramCount++}`);
    values.push(JSON.stringify(data.state));
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const result = await pool.query(
    `UPDATE tuya_devices SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteTuyaDevice(id: string): Promise<void> {
  await pool.query('DELETE FROM tuya_devices WHERE id = $1', [id]);
}

export interface TuyaDeviceReading {
  id: string;
  device_id: string;
  state: any;
  online: boolean;
  recorded_at: Date;
}

/**
 * Create a device reading (historical data point)
 */
export async function createTuyaDeviceReading(data: {
  device_id: string;
  state: any;
  online: boolean;
}): Promise<TuyaDeviceReading> {
  const result = await pool.query(
    `INSERT INTO tuya_device_readings (device_id, state, online)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [
      data.device_id,
      JSON.stringify(data.state),
      data.online,
    ]
  );
  return result.rows[0];
}

/**
 * Get device readings (historical data)
 */
export async function getTuyaDeviceReadings(
  deviceId: string,
  options: {
    limit?: number;
    startTime?: Date;
    endTime?: Date;
  } = {}
): Promise<TuyaDeviceReading[]> {
  const { limit = 100, startTime, endTime } = options;
  
  let query = 'SELECT * FROM tuya_device_readings WHERE device_id = $1';
  const params: any[] = [deviceId];
  let paramCount = 1;

  if (startTime) {
    paramCount++;
    query += ` AND recorded_at >= $${paramCount}`;
    params.push(startTime);
  }

  if (endTime) {
    paramCount++;
    query += ` AND recorded_at <= $${paramCount}`;
    params.push(endTime);
  }

  query += ` ORDER BY recorded_at DESC LIMIT $${paramCount + 1}`;
  params.push(limit);

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get latest reading for a device
 */
export async function getLatestTuyaDeviceReading(deviceId: string): Promise<TuyaDeviceReading | null> {
  const result = await pool.query(
    `SELECT * FROM tuya_device_readings 
     WHERE device_id = $1 
     ORDER BY recorded_at DESC 
     LIMIT 1`,
    [deviceId]
  );
  return result.rows[0] || null;
}

/**
 * Clean up old readings (older than specified days)
 */
export async function cleanupOldTuyaReadings(daysToKeep: number = 30): Promise<number> {
  const result = await pool.query(
    `DELETE FROM tuya_device_readings 
     WHERE recorded_at < NOW() - INTERVAL '${daysToKeep} days'`
  );
  return result.rowCount || 0;
}


