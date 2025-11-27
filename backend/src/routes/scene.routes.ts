import { Router } from 'express';
import { 
  listScenes, 
  createScene, 
  updateScene, 
  deleteScene, 
  activateScene 
} from '../controllers/scene.controller';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sceneSchemas } from '../utils/validators';

const router = Router();

router.get('/:homeId/scenes', authenticateToken, listScenes);
router.post('/:homeId/scenes', authenticateToken, validate(sceneSchemas.createScene), createScene);
router.put('/:homeId/scenes/:sceneId', authenticateToken, validate(sceneSchemas.createScene), updateScene);
router.delete('/:homeId/scenes/:sceneId', authenticateToken, deleteScene);
router.put('/:homeId/scenes/:sceneId/activate', authenticateToken, activateScene);

export default router;
