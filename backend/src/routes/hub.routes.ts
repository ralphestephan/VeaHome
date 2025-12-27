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
// Home-specific hub routes (for /homes/:homeId/hubs)
router.get('/:homeId/hubs', authenticateToken, listHubs);
router.post('/:homeId/hubs', authenticateToken, createHubDirect);
router.patch('/:homeId/hubs/:hubId', authenticateToken, updateHub);
router.delete('/:homeId/hubs/:hubId', authenticateToken, deleteHub);
// Hub-specific routes (only for /hubs and /hub mount points, NOT /homes)
// These routes use :hubId which would conflict with /homes/:homeId/rooms
router.post('/:hubId/wifi', authenticateToken, validate(hubSchemas.connectWifi), connectWifi);
router.post('/:hubId/rooms', authenticateToken, validate(hubSchemas.assignRooms), assignRooms);
router.get('/:hubId/status', authenticateToken, getHubStatus);

export default router;
