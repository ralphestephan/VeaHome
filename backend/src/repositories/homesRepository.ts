import { query } from '../config/database';
import { Home } from '../types';

export async function getHomesByUserId(userId: string): Promise<Home[]> {
  // Get all homes where user is owner OR member
  const { rows } = await query(
    `SELECT DISTINCT h.* 
     FROM homes h
     LEFT JOIN home_members hm ON h.id = hm.home_id
     WHERE h.user_id = $1 OR hm.user_id = $1
     ORDER BY h.created_at`,
    [userId]
  );
  return rows;
}

export async function getHomeById(id: string): Promise<Home | null> {
  const { rows } = await query('SELECT * FROM homes WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function createHome(userId: string, name: string, model3dUrl?: string): Promise<Home> {
  const { rows } = await query(
    `INSERT INTO homes (user_id, name, model3d_url)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, name, model3dUrl || null]
  );
  return rows[0];
}

export async function updateHomeLayout(homeId: string, layout: Record<string, unknown>) {
  await query('UPDATE homes SET layout = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [homeId, JSON.stringify(layout)]);
}

export async function saveModel3dUrl(homeId: string, model3dUrl: string | null) {
  await query('UPDATE homes SET model3d_url = $2 WHERE id = $1', [homeId, model3dUrl]);
}

export async function deleteHome(homeId: string) {
  // Cascade delete will handle rooms, devices, scenes, etc.
  await query('DELETE FROM homes WHERE id = $1', [homeId]);
}
