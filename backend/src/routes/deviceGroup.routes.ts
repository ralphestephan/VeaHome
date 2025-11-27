import { Router } from 'express';
import { 
  listDeviceGroups, 
  createDeviceGroup, 
  updateDeviceGroup, 
  deleteDeviceGroup 
} from '../controllers/deviceGroup.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/:homeId/device-groups', authenticateToken, listDeviceGroups);
router.post('/:homeId/device-groups', authenticateToken, createDeviceGroup);
router.put('/:homeId/device-groups/:groupId', authenticateToken, updateDeviceGroup);
router.delete('/:homeId/device-groups/:groupId', authenticateToken, deleteDeviceGroup);

export default router;
