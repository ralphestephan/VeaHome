import { Router } from 'express';
import { 
  listHomes, 
  createHome, 
  getHome, 
  getRooms, 
  getRoom, 
  updateRoomLayout,
  getEnergy,
  getRoomEnergy
} from '../controllers/home.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, listHomes);
router.post('/', authenticateToken, createHome);
router.get('/:homeId', authenticateToken, getHome);
router.get('/:homeId/rooms', authenticateToken, getRooms);
router.get('/:homeId/rooms/:roomId', authenticateToken, getRoom);
router.put('/:homeId/layout', authenticateToken, updateRoomLayout);
router.get('/:homeId/energy', authenticateToken, getEnergy);
router.get('/:homeId/rooms/:roomId/energy', authenticateToken, getRoomEnergy);

export default router;
