import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getAuthUrl,
  handleCallback,
  getIntegration,
  disconnect,
  listDevices,
  syncDevicesEndpoint,
  controlDevice,
  getDeviceStatus,
  updateDevice,
  getDeviceReadings,
} from '../controllers/tuya.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// OAuth flow
router.get('/auth/url', getAuthUrl);
router.post('/auth/callback', handleCallback);

// Integration management
router.get('/integration', getIntegration);
router.delete('/integration', disconnect);

// Devices
router.get('/devices', listDevices);
router.get('/devices/sync', syncDevicesEndpoint);
router.get('/devices/:deviceId/status', getDeviceStatus);
router.get('/devices/:deviceId/readings', getDeviceReadings);
router.post('/devices/:deviceId/control', controlDevice);
router.patch('/devices/:deviceId', updateDevice);

export default router;


