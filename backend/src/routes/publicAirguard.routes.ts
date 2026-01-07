import { Router } from 'express';
import {
  getSmartMonitorLatestTelemetry,
  getSmartMonitorOnlineStatus,
  setSmartMonitorBuzzer,
  getSmartMonitorThresholds,
  setSmartMonitorThresholds,
  publishAirguardCommand,
} from '../controllers/publicAirguard.controller';

const router = Router();

// Demo endpoints (Influx v1 + MQTT direct topics)
// GET  /public/airguard/:id/latest
// GET  /public/airguard/:id/status
// POST /public/airguard/:id/buzzer   {"state":"ON"|"OFF"}
// GET  /public/airguard/:id/thresholds
// POST /public/airguard/:id/thresholds  {"tempHigh":35, "humidityHigh":80, "dustHigh":400, "mq2High":60}

router.get('/:id/latest', getSmartMonitorLatestTelemetry);
router.get('/:id/status', getSmartMonitorOnlineStatus);
router.post('/:id/buzzer', setSmartMonitorBuzzer);
router.get('/:id/thresholds', getSmartMonitorThresholds);
router.post('/:id/thresholds', setSmartMonitorThresholds);
router.post('/:id/command', publishAirguardCommand);

export default router;
