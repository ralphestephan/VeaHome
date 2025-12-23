import { query } from '../config/database';
import { Hub } from '../types';

interface HubInput {
  homeId: string;
  serialNumber?: string;
  name?: string;
  status?: string;
  mqttTopic?: string;
  ownerId?: string;
  hubType?: string;
  metadata?: any;
  roomId?: string;
}

export async function getHubById(id: string): Promise<Hub | null> {
  const { rows } = await query('SELECT * FROM hubs WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function getHubBySerial(serialNumber: string): Promise<Hub | null> {
  const { rows } = await query('SELECT * FROM hubs WHERE serial_number = $1', [serialNumber]);
  return rows[0] || null;
}

export async function getHubByQrCode(qrCode: string): Promise<Hub | null> {
  const { rows } = await query('SELECT * FROM hubs WHERE qr_code = $1', [qrCode]);
  return rows[0] || null;
}

export async function createHub(input: HubInput): Promise<Hub> {
  const { rows } = await query(
    `INSERT INTO hubs (home_id, serial_number, name, status, mqtt_topic, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.homeId,
      input.serialNumber,
      input.name || null,
      input.status || 'pairing',
      input.mqttTopic || null,
      input.ownerId || null,
    ]
  );
  return rows[0];
}

export async function claimHub(hubId: string, userId: string, homeId: string) {
  await query(
    `UPDATE hubs
     SET owner_id = $2,
         home_id = $3,
         provisioning_status = 'claimed',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [hubId, userId, homeId]
  );
}

export async function assignHubToHome(hubId: string, homeId: string, status: string = 'pairing') {
  await query(
    `UPDATE hubs
     SET home_id = $2,
         status = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [hubId, homeId, status]
  );
}

export async function updateHubWifi(hubId: string, wifiSsid: string, wifiPasswordEnc?: string | null) {
  await query(
    `UPDATE hubs
     SET wifi_ssid = $2,
         wifi_password_enc = $3,
         wifi_connected = false,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [hubId, wifiSsid, wifiPasswordEnc || null]
  );
}

export async function updateHubStatus(hubId: string, status: string, lastSeenAt?: Date, firmwareVersion?: string) {
  await query(
    `UPDATE hubs
     SET status = $2,
         last_seen_at = COALESCE($3, last_seen_at),
         firmware_version = COALESCE($4, firmware_version),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [hubId, status, lastSeenAt || null, firmwareVersion || null]
  );
}

export async function assignRooms(hubId: string, roomIds: string[]) {
  await query('DELETE FROM hub_rooms WHERE hub_id = $1', [hubId]);
  const values = roomIds.flatMap((roomId) => [hubId, roomId]);
  if (!values.length) return;
  const placeholders = roomIds.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(', ');
  await query(`INSERT INTO hub_rooms (hub_id, room_id) VALUES ${placeholders}`, values);
}

export async function getRoomsForHub(hubId: string) {
  const { rows } = await query(
    `SELECT r.* FROM rooms r
     INNER JOIN hub_rooms hr ON hr.room_id = r.id
     WHERE hr.hub_id = $1`,
    [hubId]
  );
  return rows;
}

export async function getHubsByHomeId(homeId: string): Promise<Hub[]> {
  const { rows } = await query('SELECT * FROM hubs WHERE home_id = $1 ORDER BY created_at', [homeId]);
  return rows;
}

export async function updateHubTopic(hubId: string, topic: string) {
  await query('UPDATE hubs SET mqtt_topic = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [hubId, topic]);
}
