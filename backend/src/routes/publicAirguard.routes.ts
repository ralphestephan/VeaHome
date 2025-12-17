import { Router } from 'express';
import {
  getSmartMonitorLatestTelemetry,
  getSmartMonitorOnlineStatus,
  setSmartMonitorBuzzer,
} from '../controllers/publicAirguard.controller';

const router = Router();

// Demo endpoints (Influx v1 + MQTT direct topics)
// GET  /public/airguard/:id/latest
// GET  /public/airguard/:id/status
// POST /public/airguard/:id/buzzer   {"state":"ON"|"OFF"}

router.get('/:id/latest', getSmartMonitorLatestTelemetry);
router.get('/:id/status', getSmartMonitorOnlineStatus);
router.post('/:id/buzzer', setSmartMonitorBuzzer);

export default router;
