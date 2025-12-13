import { fetch } from 'undici';

const INFLUX_URL = process.env.INFLUX_URL;
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
const INFLUX_ORG = process.env.INFLUX_ORG;
const INFLUX_BUCKET = process.env.INFLUX_BUCKET;

function buildLineProtocol(measurement: string, tags: Record<string, string>, fields: Record<string, number | string>, timestamp?: Date) {
  const tagString = Object.entries(tags)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
  const fieldString = Object.entries(fields)
    .map(([key, value]) => `${key}=${typeof value === 'number' ? value : `"${value}"`}`)
    .join(',');
  const unixNs = timestamp ? timestamp.getTime() * 1_000_000 : undefined;
  return `${measurement}${tagString ? ',' + tagString : ''} ${fieldString}${unixNs ? ' ' + unixNs : ''}`;
}

export async function writeEnergyMeasurement(tags: Record<string, string>, fields: Record<string, number>, timestamp?: Date) {
  if (!INFLUX_URL || !INFLUX_BUCKET || !INFLUX_ORG || !INFLUX_TOKEN) {
    console.warn('[influx] Missing configuration, skipping write');
    return;
  }

  const line = buildLineProtocol('energy', tags, fields, timestamp);
  await fetch(`${INFLUX_URL}/api/v2/write?org=${INFLUX_ORG}&bucket=${INFLUX_BUCKET}&precision=ns`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${INFLUX_TOKEN}`,
      'Content-Type': 'text/plain; charset=utf-8',
    },
    body: line,
  });
}

export async function queryFlux(fluxQuery: string) {
  if (!INFLUX_URL || !INFLUX_ORG || !INFLUX_TOKEN) {
    console.warn('[influx] Missing configuration, skipping query');
    return [];
  }

  const response = await fetch(`${INFLUX_URL}/api/v2/query?org=${INFLUX_ORG}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${INFLUX_TOKEN}`,
      'Content-Type': 'application/vnd.flux',
      Accept: 'application/csv',
    },
    body: fluxQuery,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Influx query failed: ${response.status} ${text}`);
  }

  return response.text();
}
