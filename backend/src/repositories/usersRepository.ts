import { query } from '../config/database';
import { User } from '../types';

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  plan?: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, plan)
     VALUES ($1, $2, $3, COALESCE($4, 'free'))
     RETURNING *`,
    [input.name, input.email, input.passwordHash, input.plan]
  );
  return rows[0];
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return rows[0] || null;
}

export async function findUserById(id: string): Promise<User | null> {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function createSession(
  userId: string,
  refreshTokenHash: string,
  userAgent?: string,
  ipAddress?: string,
  expiresAt?: Date
) {
  await query(
    `INSERT INTO user_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)` ,
    [userId, refreshTokenHash, userAgent || null, ipAddress || null, expiresAt || new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)]
  );
}

export async function revokeSession(refreshTokenHash: string) {
  await query(
    `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP
     WHERE refresh_token_hash = $1`,
    [refreshTokenHash]
  );
}

export async function storePushToken(userId: string, token: string, platform: string, deviceName?: string) {
  await query(
    `INSERT INTO push_tokens (user_id, token, platform, device_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (token) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       platform = EXCLUDED.platform,
       device_name = EXCLUDED.device_name,
       last_used_at = CURRENT_TIMESTAMP`,
    [userId, token, platform, deviceName || null]
  );
}

export async function updateNotificationPreferences(userId: string, preferences: Record<string, unknown>) {
  await query(
    `INSERT INTO notification_preferences (user_id, preferences)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET
       preferences = EXCLUDED.preferences,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, JSON.stringify(preferences)]
  );
}

export async function getNotificationPreferences(userId: string) {
  const { rows } = await query('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

export const usersRepository = {
  createUser,
  findById: findUserById,
  findByEmail: findUserByEmail,
  create: createUser,
  updateNotificationPreferences,
  getNotificationPreferences
};
