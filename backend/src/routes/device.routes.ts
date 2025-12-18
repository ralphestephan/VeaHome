import { Router } from 'express';
import { 
  listDevices, 
  addDevice, 
  getDevice, 
  controlDevice, 
  learnSignal,
  getDeviceHistory,
  removeDevice,
  getDeviceThresholds,
  setDeviceThresholds
} from '../controllers/device.controller';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { deviceSchemas } from '../utils/validators';

const router = Router();

router.get('/:homeId/devices', authenticateToken, listDevices);
router.post('/:homeId/devices', authenticateToken, validate(deviceSchemas.addDevice), addDevice);
router.get('/:homeId/devices/:deviceId', authenticateToken, getDevice);
router.delete('/:homeId/devices/:deviceId', authenticateToken, removeDevice);
router.put('/:homeId/devices/:deviceId/control', authenticateToken, validate(deviceSchemas.controlDevice), controlDevice);
router.post('/:hubId/devices/:deviceId/learn', authenticateToken, validate(deviceSchemas.learnSignal), learnSignal);
router.get('/:homeId/devices/:deviceId/history', authenticateToken, getDeviceHistory);
router.get('/:homeId/devices/:deviceId/thresholds', authenticateToken, getDeviceThresholds);
router.put('/:homeId/devices/:deviceId/thresholds', authenticateToken, setDeviceThresholds);

export default router;
