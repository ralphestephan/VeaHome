import { writeEnergyMeasurement } from './influxService';

interface DeviceActivityPayload {
  homeId: string;
  deviceId: string;
  roomId?: string;
  category?: string;
  value?: number;
  isActive?: boolean;
  source?: string;
}

export async function recordDeviceActivity(payload: DeviceActivityPayload) {
  const fields: Record<string, number> = {};

  if (typeof payload.value === 'number') {
    fields.value = payload.value;
  }

  if (typeof payload.isActive === 'boolean') {
    fields.state = payload.isActive ? 1 : 0;
  }

  if (!Object.keys(fields).length) {
    return;
  }

  await writeEnergyMeasurement(
    {
      home: payload.homeId,
      room: payload.roomId || 'unknown',
      device: payload.deviceId,
      category: payload.category || 'generic',
      source: payload.source || 'unknown',
    },
    fields,
    new Date()
  );
}
