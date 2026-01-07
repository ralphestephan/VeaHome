import cron from 'node-cron';
import {
  findTuyaIntegrationByUserId,
  findTuyaDevicesByIntegrationId,
  updateTuyaDevice,
  updateTuyaIntegration,
  createTuyaDeviceReading,
} from '../repositories/tuyaRepository';
import { getTuyaService } from './tuyaService';
import { query } from '../config/database';

let pollingTask: cron.ScheduledTask | null = null;
let isPolling = false;

/**
 * Poll all Tuya devices for status updates
 */
async function pollAllDevices() {
  if (isPolling) {
    console.log('[Tuya Polling] Already polling, skipping...');
    return;
  }

  isPolling = true;
  try {
    // Get all integrations
    const integrationsResult = await query(
      'SELECT DISTINCT user_id FROM tuya_integrations'
    );

    for (const row of integrationsResult.rows) {
      const userId = row.user_id;
      
      try {
        const integration = await findTuyaIntegrationByUserId(userId);
        if (!integration) continue;

        // Check if token needs refresh
        if (new Date(integration.expires_at) <= new Date()) {
          const tuyaService = getTuyaService();
          try {
            const tokenData = await tuyaService.refreshAccessToken(integration.refresh_token);
            const expiresAt = new Date(Date.now() + tokenData.expire_time * 1000);

            await updateTuyaIntegration(integration.id, {
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_at: expiresAt,
            });

            integration.access_token = tokenData.access_token;
          } catch (error) {
            console.error(`[Tuya Polling] Failed to refresh token for user ${userId}:`, error);
            continue;
          }
        }

        // Get all devices for this integration
        const devices = await findTuyaDevicesByIntegrationId(integration.id);
        const tuyaService = getTuyaService();

        // Poll each device
        for (const device of devices) {
          try {
            const status = await tuyaService.getDeviceStatus(
              integration.access_token,
              device.tuya_device_id
            );

            // Update device state
            const newState: any = {};
            let isOnline = false;

            if (Array.isArray(status)) {
              status.forEach((s: any) => {
                newState[s.code] = s.value;
              });
              isOnline = true;
            } else if (status && typeof status === 'object') {
              // Handle different response formats
              Object.assign(newState, status);
              isOnline = true;
            }

            // Update device in database
            await updateTuyaDevice(device.id, {
              state: newState,
              online: isOnline,
            });

            // Store reading for historical data
            await createTuyaDeviceReading({
              device_id: device.id,
              state: newState,
              online: isOnline,
            });

            console.log(`[Tuya Polling] Updated device ${device.name} (${device.id})`);
          } catch (error: any) {
            // Device might be offline or error occurred
            console.warn(`[Tuya Polling] Failed to poll device ${device.name} (${device.id}):`, error.message);
            
            // Mark device as offline if it was online
            if (device.online) {
              await updateTuyaDevice(device.id, {
                online: false,
              });
            }
          }
        }
      } catch (error) {
        console.error(`[Tuya Polling] Error processing integration for user ${userId}:`, error);
      }
    }
  } catch (error) {
    console.error('[Tuya Polling] Error in polling cycle:', error);
  } finally {
    isPolling = false;
  }
}

/**
 * Initialize Tuya device polling service
 * Polls every 30 seconds by default (configurable via env)
 */
export function initializeTuyaPolling() {
  const pollInterval = process.env.TUYA_POLL_INTERVAL || '30'; // seconds
  const cronExpression = `*/${pollInterval} * * * * *`; // Every N seconds

  console.log(`[Tuya Polling] Initializing with interval: ${pollInterval} seconds`);

  pollingTask = cron.schedule(cronExpression, async () => {
    await pollAllDevices();
  }, {
    scheduled: true,
    timezone: 'UTC',
  });

  // Do an initial poll
  pollAllDevices();

  console.log('[Tuya Polling] Service initialized');
}

/**
 * Stop Tuya polling service
 */
export function stopTuyaPolling() {
  if (pollingTask) {
    pollingTask.stop();
    pollingTask = null;
    console.log('[Tuya Polling] Service stopped');
  }
}

/**
 * Manually trigger a poll (useful for testing or immediate updates)
 */
export async function triggerPoll() {
  await pollAllDevices();
}

