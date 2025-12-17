import { fetch } from 'undici';

const INFLUX_V1_URL = process.env.INFLUX_V1_URL || process.env.INFLUX_URL; // allow reuse
const INFLUX_V1_DB = process.env.INFLUX_V1_DB || process.env.INFLUX_DB;
const INFLUX_V1_USERNAME = process.env.INFLUX_V1_USERNAME;
const INFLUX_V1_PASSWORD = process.env.INFLUX_V1_PASSWORD;

function ensureConfigured() {
  if (!INFLUX_V1_URL || !INFLUX_V1_DB) {
    throw new Error('InfluxDB v1 not configured. Set INFLUX_V1_URL and INFLUX_V1_DB');
  }
}

function buildQueryUrl(query: string) {
  ensureConfigured();

  const base = INFLUX_V1_URL!.replace(/\/$/, '');
  const url = new URL(`${base}/query`);
  url.searchParams.set('db', INFLUX_V1_DB!);
  url.searchParams.set('q', query);

  if (INFLUX_V1_USERNAME) url.searchParams.set('u', INFLUX_V1_USERNAME);
  if (INFLUX_V1_PASSWORD) url.searchParams.set('p', INFLUX_V1_PASSWORD);

  return url.toString();
}

export async function queryInfluxV1(query: string) {
  const url = buildQueryUrl(query);
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Influx v1 query failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<any>;
}

function extractSingleRow(result: any): Record<string, any> | null {
  const series = result?.results?.[0]?.series?.[0];
  const columns: string[] | undefined = series?.columns;
  const values: any[] | undefined = series?.values?.[0];
  if (!columns || !values) return null;

  const row: Record<string, any> = {};
  for (let i = 0; i < columns.length; i++) {
    row[columns[i]] = values[i];
  }
  return row;
}

export async function getSmartMonitorLatest(deviceNumericId: string) {
  // NOTE: measurement name must match your Node-RED write.
  const baseSelect =
    'SELECT LAST(temp) AS temp, LAST(hum) AS hum, LAST(dust) AS dust, LAST(mq2) AS mq2, LAST(alert) AS alert, LAST(buzzer) AS buzzer, LAST(rssi) AS rssi, LAST(uptime) AS uptime FROM smartmonitor_telemetry';

  const tryQueries = async (queries: string[]) => {
    for (const q of queries) {
      const result = await queryInfluxV1(q);
      const row = extractSingleRow(result);
      if (row) return row;
    }
    return null;
  };

  const row = await tryQueries([
    `${baseSelect} WHERE deviceId='${deviceNumericId}'`,
    `${baseSelect} WHERE "deviceId"='${deviceNumericId}'`,
    // Fallback when tags aren't matching (common in single-device demos)
    baseSelect,
  ]);

  if (!row) return null;

  return {
    time: row.time,
    temp: row.temp,
    hum: row.hum,
    dust: row.dust,
    mq2: row.mq2,
    alert: row.alert,
    buzzer: row.buzzer,
    rssi: row.rssi,
    uptime: row.uptime,
  };
}

export async function getSmartMonitorStatus(deviceNumericId: string) {
  const baseSelect = 'SELECT LAST(online) AS online FROM smartmonitor_status';
  const tryQueries = async (queries: string[]) => {
    for (const q of queries) {
      const result = await queryInfluxV1(q);
      const row = extractSingleRow(result);
      if (row) return row;
    }
    return null;
  };

  const row = await tryQueries([
    `${baseSelect} WHERE deviceId='${deviceNumericId}'`,
    `${baseSelect} WHERE "deviceId"='${deviceNumericId}'`,
    baseSelect,
  ]);

  if (!row) return null;

  return {
    time: row.time,
    online: row.online,
  };
}
