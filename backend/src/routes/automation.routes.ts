import { Router } from 'express';
import { 
  listAutomations, 
  createAutomation, 
  updateAutomation, 
  deleteAutomation 
} from '../controllers/automation.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/:homeId/automations', authenticateToken, listAutomations);
router.post('/:homeId/automations', authenticateToken, createAutomation);
router.put('/:homeId/automations/:automationId', authenticateToken, updateAutomation);
router.delete('/:homeId/automations/:automationId', authenticateToken, deleteAutomation);

export default router;
