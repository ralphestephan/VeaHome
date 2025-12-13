import { query } from '../config/database';
import { Device } from '../types';

export interface DeviceInput {
  hubId: string;
  homeId: string;
  roomId: string;
  name: string;
  type: string;
  category: string;
  isActive?: boolean;
  value?: number;
  unit?: string;
  signalMappings?: Record<string, unknown>;
}

export async function getDevicesByHomeId(homeId: string): Promise<Device[]> {
  const { rows } = await query('SELECT * FROM devices WHERE home_id = $1 ORDER BY created_at', [homeId]);
  return rows;
}

export async function getDevicesByRoom(roomId: string): Promise<Device[]> {
  const { rows } = await query('SELECT * FROM devices WHERE room_id = $1 ORDER BY created_at', [roomId]);
  return rows;
}

export async function getDeviceById(deviceId: string): Promise<Device | null> {
  const { rows } = await query('SELECT * FROM devices WHERE id = $1', [deviceId]);
  return rows[0] || null;
}

export async function getDeviceWithHub(deviceId: string) {
  const { rows } = await query(
    `SELECT d.*, h.mqtt_topic, h.name AS hub_name
     FROM devices d
     JOIN hubs h ON d.hub_id = h.id
     WHERE d.id = $1`,
    [deviceId]
  );
  return rows[0] || null;
}

export async function createDevice(input: DeviceInput): Promise<Device> {
  const { rows } = await query(
    `INSERT INTO devices (hub_id, home_id, room_id, name, type, category, is_active, value, unit, signal_mappings)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, false), $8, $9, COALESCE($10, '{}'::jsonb))
     RETURNING *`,
    [
      input.hubId,
      input.homeId,
      input.roomId,
      input.name,
      input.type,
      input.category,
      input.isActive ?? false,
      input.value ?? null,
      input.unit ?? null,
      JSON.stringify(input.signalMappings || {}),
    ]
  );
  return rows[0];
}

export async function updateDevice(id: string, updates: Partial<DeviceInput>) {
  const fields: string[] = [];
  const values: any[] = [];

  const push = (column: string, value: any) => {
    fields.push(`${column} = $${fields.length + 1}`);
    values.push(value);
  };

  if (updates.name) push('name', updates.name);
  if (updates.type) push('type', updates.type);
  if (updates.category) push('category', updates.category);
  if (typeof updates.isActive === 'boolean') push('is_active', updates.isActive);
  if (typeof updates.value === 'number') push('value', updates.value);
  if (updates.unit) push('unit', updates.unit);
  if (updates.signalMappings) push('signal_mappings', JSON.stringify(updates.signalMappings));
  if (updates.roomId) push('room_id', updates.roomId);

  if (!fields.length) return;

  values.push(id);
  await query(`UPDATE devices SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`, values);
}

export async function deleteDevice(id: string) {
  await query('DELETE FROM devices WHERE id = $1', [id]);
}
