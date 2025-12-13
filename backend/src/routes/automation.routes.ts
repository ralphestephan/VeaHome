import { Router } from 'express';
import { 
  listAutomations, 
  createAutomation, 
  updateAutomation, 
  deleteAutomation 
} from '../controllers/automation.controller';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { automationSchemas } from '../utils/validators';

const router = Router();

router.get('/:homeId/automations', authenticateToken, listAutomations);
router.post('/:homeId/automations', authenticateToken, validate(automationSchemas.createAutomation), createAutomation);
router.put('/:homeId/automations/:automationId', authenticateToken, validate(automationSchemas.updateAutomation), updateAutomation);
router.delete('/:homeId/automations/:automationId', authenticateToken, deleteAutomation);

export default router;
