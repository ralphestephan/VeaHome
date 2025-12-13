import { Router } from 'express';
import { 
  listDeviceGroups, 
  createDeviceGroup, 
  updateDeviceGroup, 
  deleteDeviceGroup 
} from '../controllers/deviceGroup.controller';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { deviceGroupSchemas } from '../utils/validators';

const router = Router();

router.get('/:homeId/device-groups', authenticateToken, listDeviceGroups);
router.post('/:homeId/device-groups', authenticateToken, validate(deviceGroupSchemas.createGroup), createDeviceGroup);
router.put('/:homeId/device-groups/:groupId', authenticateToken, validate(deviceGroupSchemas.updateGroup), updateDeviceGroup);
router.delete('/:homeId/device-groups/:groupId', authenticateToken, deleteDeviceGroup);

export default router;
