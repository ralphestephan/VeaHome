import { query } from '../config/database';
import { Scene, Schedule, Automation } from '../types';

export async function getScenes(homeId: string): Promise<Scene[]> {
  const { rows } = await query('SELECT * FROM scenes WHERE home_id = $1 ORDER BY created_at', [homeId]);
  return rows;
}

export async function getSceneById(id: string): Promise<Scene | null> {
  const { rows } = await query('SELECT * FROM scenes WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function saveScene(scene: Partial<Scene> & { home_id: string; name: string }) {
  const { rows } = await query(
    `INSERT INTO scenes (home_id, name, icon, description, is_active, device_states, devices)
     VALUES ($1, $2, $3, $4, COALESCE($5, false), $6, $7)
     RETURNING *`,
    [
      scene.home_id,
      scene.name,
      scene.icon || null,
      scene.description || null,
      scene.is_active ?? false,
      JSON.stringify(scene.device_states || {}),
      JSON.stringify(scene.devices || []),
    ]
  );
  return rows[0];
}

export async function updateScene(id: string, updates: Partial<Scene>) {
  await query(
    `UPDATE scenes SET
       name = COALESCE($2, name),
       icon = COALESCE($3, icon),
       description = COALESCE($4, description),
       is_active = COALESCE($5, is_active),
       device_states = COALESCE($6, device_states),
       devices = COALESCE($7, devices),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [
      id,
      updates.name || null,
      updates.icon || null,
      updates.description || null,
      updates.is_active ?? null,
      updates.device_states ? JSON.stringify(updates.device_states) : null,
      updates.devices ? JSON.stringify(updates.devices) : null,
    ]
  );
}

export async function deleteScene(id: string) {
  await query('DELETE FROM scenes WHERE id = $1', [id]);
}

export async function deactivateScenes(homeId: string) {
  await query('UPDATE scenes SET is_active = false WHERE home_id = $1', [homeId]);
}

export async function setSceneActive(sceneId: string, homeId: string) {
  await query('UPDATE scenes SET is_active = true WHERE id = $1 AND home_id = $2', [sceneId, homeId]);
}

export async function getSchedules(homeId: string): Promise<Schedule[]> {
  const { rows } = await query('SELECT * FROM schedules WHERE home_id = $1 ORDER BY created_at', [homeId]);
  return rows;
}

export async function getScheduleById(id: string): Promise<Schedule | null> {
  const { rows } = await query('SELECT * FROM schedules WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function saveSchedule(schedule: Partial<Schedule> & { home_id: string; name: string }) {
  const { rows } = await query(
    `INSERT INTO schedules (home_id, name, time, days, actions, enabled)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, true))
     RETURNING *`,
    [
      schedule.home_id,
      schedule.name,
      schedule.time,
      JSON.stringify(schedule.days || []),
      JSON.stringify(schedule.actions || []),
      schedule.enabled ?? true,
    ]
  );
  return rows[0];
}

export async function updateSchedule(id: string, updates: Partial<Schedule>) {
  await query(
    `UPDATE schedules SET
       name = COALESCE($2, name),
       time = COALESCE($3, time),
       days = COALESCE($4, days),
       actions = COALESCE($5, actions),
       enabled = COALESCE($6, enabled),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [
      id,
      updates.name || null,
      updates.time || null,
      updates.days ? JSON.stringify(updates.days) : null,
      updates.actions ? JSON.stringify(updates.actions) : null,
      updates.enabled ?? null,
    ]
  );
}

export async function deleteSchedule(id: string) {
  await query('DELETE FROM schedules WHERE id = $1', [id]);
}

export async function getAutomations(homeId: string): Promise<Automation[]> {
  const { rows } = await query('SELECT * FROM automations WHERE home_id = $1 ORDER BY created_at', [homeId]);
  return rows;
}

export async function getAutomationById(id: string): Promise<Automation | null> {
  const { rows } = await query('SELECT * FROM automations WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function saveAutomation(automation: Partial<Automation> & { home_id: string; name: string }) {
  const { rows } = await query(
    `INSERT INTO automations (home_id, name, trigger, actions, enabled)
     VALUES ($1, $2, $3, $4, COALESCE($5, true))
     RETURNING *`,
    [
      automation.home_id,
      automation.name,
      JSON.stringify(automation.trigger || {}),
      JSON.stringify(automation.actions || []),
      automation.enabled ?? true,
    ]
  );
  return rows[0];
}

export async function updateAutomation(id: string, updates: Partial<Automation>) {
  await query(
    `UPDATE automations SET
       name = COALESCE($2, name),
       trigger = COALESCE($3, trigger),
       actions = COALESCE($4, actions),
       enabled = COALESCE($5, enabled),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [
      id,
      updates.name || null,
      updates.trigger ? JSON.stringify(updates.trigger) : null,
      updates.actions ? JSON.stringify(updates.actions) : null,
      updates.enabled ?? null,
    ]
  );
}

export async function deleteAutomation(id: string) {
  await query('DELETE FROM automations WHERE id = $1', [id]);
}
