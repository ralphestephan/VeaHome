import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import {
  createTuyaIntegration,
  findTuyaIntegrationByUserId,
  updateTuyaIntegration,
  deleteTuyaIntegration,
  createTuyaDevice,
  findTuyaDevicesByIntegrationId,
  findTuyaDevicesByHomeId,
  findTuyaDeviceById,
  updateTuyaDevice,
  deleteTuyaDevice,
  getTuyaDeviceReadings,
  getLatestTuyaDeviceReading,
} from '../repositories/tuyaRepository';
import { getTuyaService } from '../services/tuyaService';

/**
 * Get OAuth authorization URL
 * Frontend redirects user to this URL
 */
export async function getAuthUrl(req: Request, res: Response) {
  try {
    const { redirectUri } = req.query;

    if (!redirectUri || typeof redirectUri !== 'string') {
      return errorResponse(res, 'redirectUri is required', 400);
    }

    const clientId = process.env.TUYA_CLIENT_ID;
    if (!clientId) {
      return errorResponse(res, 'Tuya integration not configured', 500);
    }

    const region = process.env.TUYA_REGION || 'us';
    const authUrl = `https://auth.tuya${region === 'us' ? 'us' : region === 'eu' ? 'eu' : 'cn'}.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=smart:device`;

    return successResponse(res, { authUrl });
  } catch (error: any) {
    console.error('Get Tuya auth URL error:', error);
    return errorResponse(res, error.message || 'Failed to get auth URL', 500);
  }
}

/**
 * Handle OAuth callback - exchange code for tokens
 */
export async function handleCallback(req: Request, res: Response) {
  try {
    const { code, redirectUri } = req.body;
    const userId = (req as AuthRequest).user.userId;

    if (!code || !redirectUri) {
      return errorResponse(res, 'code and redirectUri are required', 400);
    }

    const tuyaService = getTuyaService();
    const tokenData = await tuyaService.getAccessToken(code, redirectUri);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokenData.expire_time * 1000);

    // Check if integration already exists
    const existing = await findTuyaIntegrationByUserId(userId);

    let integration;
    if (existing) {
      // Update existing integration
      await updateTuyaIntegration(existing.id, {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
      });
      integration = await findTuyaIntegrationByUserId(userId);
    } else {
      // Create new integration
      integration = await createTuyaIntegration({
        user_id: userId,
        tuya_user_id: tokenData.uid,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        region: process.env.TUYA_REGION || 'us',
      });
    }

    // Fetch and sync devices
    await syncDevices(userId);

    return successResponse(res, {
      integration: {
        id: integration!.id,
        tuya_user_id: integration!.tuya_user_id,
        region: integration!.region,
      },
    });
  } catch (error: any) {
    console.error('Tuya callback error:', error);
    return errorResponse(res, error.message || 'Failed to complete OAuth flow', 500);
  }
}

/**
 * Sync devices from Tuya cloud
 */
export async function syncDevices(userId: string): Promise<void> {
  const integration = await findTuyaIntegrationByUserId(userId);
  if (!integration) {
    throw new Error('Tuya integration not found');
  }

  // Check if token needs refresh
  if (new Date(integration.expires_at) <= new Date()) {
    const tuyaService = getTuyaService();
    const tokenData = await tuyaService.refreshAccessToken(integration.refresh_token);
    const expiresAt = new Date(Date.now() + tokenData.expire_time * 1000);

    await updateTuyaIntegration(integration.id, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
    });

    integration.access_token = tokenData.access_token;
  }

  const tuyaService = getTuyaService();
  const devices = await tuyaService.getDevices(integration.access_token, integration.tuya_user_id);

  // Sync each device
  for (const device of devices) {
    // Try to fetch device specifications/schema
    let capabilities = {};
    try {
      capabilities = await tuyaService.getDeviceSpecifications(integration.access_token, device.id);
    } catch (error) {
      console.warn(`Failed to fetch specifications for device ${device.id}:`, error);
      // Continue without specifications
    }

    await createTuyaDevice({
      integration_id: integration.id,
      tuya_device_id: device.id,
      name: device.name,
      category: device.category,
      product_id: device.product_id,
      online: device.online,
      capabilities: capabilities,
      state: device.status.reduce((acc: any, status: any) => {
        acc[status.code] = status.value;
        return acc;
      }, {}),
    });
  }
}

/**
 * Get user's Tuya integration status
 */
export async function getIntegration(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).user.userId;
    const integration = await findTuyaIntegrationByUserId(userId);

    if (!integration) {
      return successResponse(res, { connected: false });
    }

    return successResponse(res, {
      connected: true,
      integration: {
        id: integration.id,
        tuya_user_id: integration.tuya_user_id,
        region: integration.region,
        expires_at: integration.expires_at,
      },
    });
  } catch (error: any) {
    console.error('Get Tuya integration error:', error);
    return errorResponse(res, error.message || 'Failed to get integration', 500);
  }
}

/**
 * Disconnect Tuya integration
 */
export async function disconnect(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).user.userId;
    const integration = await findTuyaIntegrationByUserId(userId);

    if (!integration) {
      return errorResponse(res, 'Tuya integration not found', 404);
    }

    await deleteTuyaIntegration(integration.id);

    return successResponse(res, { message: 'Tuya integration disconnected' });
  } catch (error: any) {
    console.error('Disconnect Tuya error:', error);
    return errorResponse(res, error.message || 'Failed to disconnect', 500);
  }
}

/**
 * List Tuya devices
 */
export async function listDevices(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).user.userId;
    const { homeId } = req.params;

    const integration = await findTuyaIntegrationByUserId(userId);
    if (!integration) {
      return errorResponse(res, 'Tuya integration not found. Please connect your Tuya account first.', 404);
    }

    let devices;
    if (homeId) {
      devices = await findTuyaDevicesByHomeId(homeId);
    } else {
      devices = await findTuyaDevicesByIntegrationId(integration.id);
    }

    return successResponse(res, {
      devices: devices.map((d) => ({
        id: d.id,
        tuya_device_id: d.tuya_device_id,
        name: d.name,
        category: d.category,
        online: d.online,
        state: d.state,
        home_id: d.home_id,
      })),
    });
  } catch (error: any) {
    console.error('List Tuya devices error:', error);
    return errorResponse(res, error.message || 'Failed to list devices', 500);
  }
}

/**
 * Sync devices from Tuya cloud
 */
export async function syncDevicesEndpoint(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).user.userId;
    await syncDevices(userId);

    const integration = await findTuyaIntegrationByUserId(userId);
    if (!integration) {
      return errorResponse(res, 'Tuya integration not found', 404);
    }

    const devices = await findTuyaDevicesByIntegrationId(integration.id);

    return successResponse(res, {
      message: 'Devices synced successfully',
      devices: devices.map((d) => ({
        id: d.id,
        tuya_device_id: d.tuya_device_id,
        name: d.name,
        category: d.category,
        online: d.online,
      })),
    });
  } catch (error: any) {
    console.error('Sync Tuya devices error:', error);
    return errorResponse(res, error.message || 'Failed to sync devices', 500);
  }
}

/**
 * Control Tuya device
 */
export async function controlDevice(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).user.userId;
    const { deviceId } = req.params;
    const { commands } = req.body;

    if (!commands || !Array.isArray(commands)) {
      return errorResponse(res, 'commands array is required', 400);
    }

    const integration = await findTuyaIntegrationByUserId(userId);
    if (!integration) {
      return errorResponse(res, 'Tuya integration not found', 404);
    }

    const device = await findTuyaDeviceById(deviceId);
    if (!device || device.integration_id !== integration.id) {
      return errorResponse(res, 'Device not found', 404);
    }

    // Check if token needs refresh
    if (new Date(integration.expires_at) <= new Date()) {
      const tuyaService = getTuyaService();
      const tokenData = await tuyaService.refreshAccessToken(integration.refresh_token);
      const expiresAt = new Date(Date.now() + tokenData.expire_time * 1000);

      await updateTuyaIntegration(integration.id, {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
      });

      integration.access_token = tokenData.access_token;
    }

    const tuyaService = getTuyaService();
    const success = await tuyaService.controlDevice(
      integration.access_token,
      device.tuya_device_id,
      commands
    );

    if (success) {
      // Update device state
      const newState = { ...device.state };
      commands.forEach((cmd: any) => {
        newState[cmd.code] = cmd.value;
      });
      await updateTuyaDevice(deviceId, { state: newState });
    }

    return successResponse(res, { success });
  } catch (error: any) {
    console.error('Control Tuya device error:', error);
    return errorResponse(res, error.message || 'Failed to control device', 500);
  }
}

/**
 * Get device status
 */
export async function getDeviceStatus(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).user.userId;
    const { deviceId } = req.params;

    const integration = await findTuyaIntegrationByUserId(userId);
    if (!integration) {
      return errorResponse(res, 'Tuya integration not found', 404);
    }

    const device = await findTuyaDeviceById(deviceId);
    if (!device || device.integration_id !== integration.id) {
      return errorResponse(res, 'Device not found', 404);
    }

    // Check if token needs refresh
    if (new Date(integration.expires_at) <= new Date()) {
      const tuyaService = getTuyaService();
      const tokenData = await tuyaService.refreshAccessToken(integration.refresh_token);
      const expiresAt = new Date(Date.now() + tokenData.expire_time * 1000);

      await updateTuyaIntegration(integration.id, {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
      });

      integration.access_token = tokenData.access_token;
    }

    const tuyaService = getTuyaService();
    const status = await tuyaService.getDeviceStatus(integration.access_token, device.tuya_device_id);

    // Update device state
    const newState: any = {};
    status.forEach((s: any) => {
      newState[s.code] = s.value;
    });
    await updateTuyaDevice(deviceId, { state: newState, online: true });

    return successResponse(res, { status });
  } catch (error: any) {
    console.error('Get Tuya device status error:', error);
    return errorResponse(res, error.message || 'Failed to get device status', 500);
  }
}

/**
 * Update device (assign to home, rename, etc.)
 */
export async function updateDevice(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).user.userId;
    const { deviceId } = req.params;
    const { home_id, name } = req.body;

    const integration = await findTuyaIntegrationByUserId(userId);
    if (!integration) {
      return errorResponse(res, 'Tuya integration not found', 404);
    }

    const device = await findTuyaDeviceById(deviceId);
    if (!device || device.integration_id !== integration.id) {
      return errorResponse(res, 'Device not found', 404);
    }

    const updated = await updateTuyaDevice(deviceId, { home_id, name });

    return successResponse(res, {
      device: {
        id: updated.id,
        name: updated.name,
        home_id: updated.home_id,
      },
    });
  } catch (error: any) {
    console.error('Update Tuya device error:', error);
    return errorResponse(res, error.message || 'Failed to update device', 500);
  }
}

/**
 * Get device readings/history
 */
export async function getDeviceReadings(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).user.userId;
    const { deviceId } = req.params;
    const { limit, startTime, endTime } = req.query;

    const integration = await findTuyaIntegrationByUserId(userId);
    if (!integration) {
      return errorResponse(res, 'Tuya integration not found', 404);
    }

    const device = await findTuyaDeviceById(deviceId);
    if (!device || device.integration_id !== integration.id) {
      return errorResponse(res, 'Device not found', 404);
    }

    const readings = await getTuyaDeviceReadings(deviceId, {
      limit: limit ? parseInt(limit as string, 10) : 100,
      startTime: startTime ? new Date(startTime as string) : undefined,
      endTime: endTime ? new Date(endTime as string) : undefined,
    });

    return successResponse(res, {
      readings: readings.map((r) => ({
        id: r.id,
        state: r.state,
        online: r.online,
        recorded_at: r.recorded_at,
      })),
    });
  } catch (error: any) {
    console.error('Get Tuya device readings error:', error);
    return errorResponse(res, error.message || 'Failed to get device readings', 500);
  }
}

