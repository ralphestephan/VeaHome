import { query } from '../config/database';
import { Room } from '../types';

export interface RoomInput {
  homeId: string;
  name: string;
  image?: string;
  scene?: string;
  layoutPath?: string;
  accentColor?: string;
  metadata?: Record<string, unknown>;
}

export async function getRoomsByHomeId(homeId: string): Promise<Room[]> {
  const { rows } = await query('SELECT * FROM rooms WHERE home_id = $1 ORDER BY created_at', [homeId]);
  return rows;
}

export async function getRoomById(id: string): Promise<Room | null> {
  const { rows } = await query('SELECT * FROM rooms WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function createRoom(input: RoomInput): Promise<Room> {
  const { rows } = await query(
    `INSERT INTO rooms (home_id, name, image, scene, layout_path, accent_color, power, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, '0W', COALESCE($7, '{}'::jsonb))
     RETURNING *`,
    [
      input.homeId,
      input.name,
      input.image || null,
      input.scene || null,
      input.layoutPath || null,
      input.accentColor || null,
      JSON.stringify(input.metadata || {}),
    ]
  );
  return rows[0];
}

export async function updateRoom(id: string, updates: Partial<RoomInput>) {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name) {
    fields.push(`name = $${fields.length + 1}`);
    values.push(updates.name);
  }
  if (updates.image) {
    fields.push(`image = $${fields.length + 1}`);
    values.push(updates.image);
  }
  if ('scene' in updates) {
    fields.push(`scene = $${fields.length + 1}`);
    values.push(updates.scene || null);
  }
  if (updates.layoutPath) {
    fields.push(`layout_path = $${fields.length + 1}`);
    values.push(updates.layoutPath);
  }
  if (updates.accentColor) {
    fields.push(`accent_color = $${fields.length + 1}`);
    values.push(updates.accentColor);
  }
  if (updates.metadata) {
    fields.push(`metadata = $${fields.length + 1}`);
    values.push(JSON.stringify(updates.metadata));
  }

  if (!fields.length) return;

  values.push(id);
  await query(`UPDATE rooms SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`, values);
}

export async function deleteRoom(id: string) {
  await query('DELETE FROM rooms WHERE id = $1', [id]);
}
