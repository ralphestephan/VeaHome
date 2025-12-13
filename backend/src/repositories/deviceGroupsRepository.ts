import { query } from '../config/database';
import { DeviceGroup } from '../types';

interface DeviceGroupInput {
  homeId: string;
  name: string;
  deviceIds: string[];
}

interface DeviceGroupUpdate {
  name?: string;
  deviceIds?: string[];
}

export async function getDeviceGroups(homeId: string): Promise<DeviceGroup[]> {
  const { rows } = await query('SELECT * FROM device_groups WHERE home_id = $1 ORDER BY created_at DESC', [homeId]);
  return rows;
}

export async function getDeviceGroupById(id: string): Promise<DeviceGroup | null> {
  const { rows } = await query('SELECT * FROM device_groups WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function createDeviceGroupRecord(input: DeviceGroupInput): Promise<DeviceGroup> {
  const { rows } = await query(
    `INSERT INTO device_groups (home_id, name, device_ids)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.homeId, input.name, JSON.stringify(input.deviceIds)]
  );
  return rows[0];
}

export async function updateDeviceGroupRecord(id: string, updates: DeviceGroupUpdate): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push(`name = $${fields.length + 1}`);
    values.push(updates.name);
  }

  if (updates.deviceIds !== undefined) {
    fields.push(`device_ids = $${fields.length + 1}`);
    values.push(JSON.stringify(updates.deviceIds));
  }

  if (!fields.length) return;

  values.push(id);
  await query(`UPDATE device_groups SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`, values);
}

export async function deleteDeviceGroupRecord(id: string): Promise<void> {
  await query('DELETE FROM device_groups WHERE id = $1', [id]);
}
