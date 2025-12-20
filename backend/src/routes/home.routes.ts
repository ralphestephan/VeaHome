import { Router } from 'express';
import { 
  listHomes, 
  createHome, 
  getHome,
  deleteHome,
  getRooms, 
  getRoom, 
  createRoomHandler,
  updateRoomHandler,
  deleteRoomHandler,
  updateRoomLayout,
  getEnergy,
  getRoomEnergy
} from '../controllers/home.controller';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { homeSchemas } from '../utils/validators';

const router = Router();

router.get('/', authenticateToken, listHomes);
router.post('/', authenticateToken, createHome);
router.get('/:homeId', authenticateToken, getHome);
router.delete('/:homeId', authenticateToken, deleteHome);
router.get('/:homeId/rooms', authenticateToken, getRooms);
router.post('/:homeId/rooms', authenticateToken, validate(homeSchemas.createRoom), createRoomHandler);
router.get('/:homeId/rooms/:roomId', authenticateToken, getRoom);
router.put('/:homeId/rooms/:roomId', authenticateToken, validate(homeSchemas.updateRoom), updateRoomHandler);
router.delete('/:homeId/rooms/:roomId', authenticateToken, deleteRoomHandler);
router.put('/:homeId/layout', authenticateToken, validate(homeSchemas.updateLayout), updateRoomLayout);
router.get('/:homeId/energy', authenticateToken, getEnergy);
router.get('/:homeId/rooms/:roomId/energy', authenticateToken, getRoomEnergy);

export default router;
