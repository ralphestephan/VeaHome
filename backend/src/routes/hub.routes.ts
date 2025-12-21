import { Router } from 'express';
import { 
  pairHub, 
  listHubs, 
  connectWifi, 
  assignRooms, 
  getHubStatus 
} from '../controllers/hub.controller';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { hubSchemas } from '../utils/validators';

const router = Router();

router.post('/pair', authenticateToken, validate(hubSchemas.pairHub), pairHub);
router.get('/homes/:homeId/hubs', authenticateToken, listHubs);
router.post('/:hubId/wifi', authenticateToken, validate(hubSchemas.connectWifi), connectWifi);
router.post('/:hubId/rooms', authenticateToken, validate(hubSchemas.assignRooms), assignRooms);
router.get('/:hubId/status', authenticateToken, getHubStatus);

export default router;
