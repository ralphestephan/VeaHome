import { Router } from 'express';
import { 
  pairHub, 
  listHubs,
  createHubDirect,
  connectWifi, 
  assignRooms, 
  getHubStatus,
  deleteHub,
  updateHub
} from '../controllers/hub.controller';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { hubSchemas } from '../utils/validators';

const router = Router();

router.post('/pair', authenticateToken, validate(hubSchemas.pairHub), pairHub);
router.get('/:homeId/hubs', authenticateToken, listHubs);
router.post('/:homeId/hubs', authenticateToken, createHubDirect);
router.patch('/:homeId/hubs/:hubId', authenticateToken, updateHub);
router.delete('/:homeId/hubs/:hubId', authenticateToken, deleteHub);
router.post('/:hubId/wifi', authenticateToken, validate(hubSchemas.connectWifi), connectWifi);
router.post('/:hubId/rooms', authenticateToken, validate(hubSchemas.assignRooms), assignRooms);
router.get('/:hubId/status', authenticateToken, getHubStatus);

export default router;
