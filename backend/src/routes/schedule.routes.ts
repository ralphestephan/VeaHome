import { Router } from 'express';
import { 
  listSchedules, 
  createSchedule, 
  updateSchedule, 
  deleteSchedule 
} from '../controllers/schedule.controller';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { scheduleSchemas } from '../utils/validators';

const router = Router();

router.get('/:homeId/schedules', authenticateToken, listSchedules);
router.post('/:homeId/schedules', authenticateToken, validate(scheduleSchemas.createSchedule), createSchedule);
router.put('/:homeId/schedules/:scheduleId', authenticateToken, validate(scheduleSchemas.createSchedule), updateSchedule);
router.delete('/:homeId/schedules/:scheduleId', authenticateToken, deleteSchedule);

export default router;
