import express, { Application, Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { initializeWebSocket } from './services/websocket.service';
import { initializeIoT } from './services/iot.service';
import { initializeScheduler } from './services/scheduler.service';
import { initMqttClient } from './services/mqttService';

// Routes
import authRoutes from './routes/auth.routes';
import hubRoutes from './routes/hub.routes';
import deviceRoutes from './routes/device.routes';
import homeRoutes from './routes/home.routes';
import sceneRoutes from './routes/scene.routes';
import scheduleRoutes from './routes/schedule.routes';
import deviceGroupRoutes from './routes/deviceGroup.routes';
import automationRoutes from './routes/automation.routes';
import publicAirguardRoutes from './routes/publicAirguard.routes';
import homeMembersRoutes from './routes/homeMembers.routes';
import { listHubs, createHubDirect, updateHub, deleteHub } from './controllers/hub.controller';
import { authenticateToken } from './middleware/auth';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'VeaHome Backend API',
    version: '1.0.0'
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/public/airguard', publicAirguardRoutes);
app.use('/hub', hubRoutes);
app.use('/hubs', hubRoutes);
// IMPORTANT: homeRoutes must come before hubRoutes when both use /homes
// to avoid route conflicts (e.g., /homes/:homeId/rooms vs /homes/:hubId/rooms)
app.use('/homes', homeRoutes);
app.use('/homes', deviceRoutes);
app.use('/homes', homeMembersRoutes);
app.use('/homes', sceneRoutes);
app.use('/homes', scheduleRoutes);
app.use('/homes', deviceGroupRoutes);
app.use('/homes', automationRoutes);
// Create a separate router for home-specific hub routes only
// This prevents :hubId routes from conflicting with :homeId routes
const homeHubRoutes = Router();
homeHubRoutes.get('/:homeId/hubs', authenticateToken, listHubs);
homeHubRoutes.post('/:homeId/hubs', authenticateToken, createHubDirect);
homeHubRoutes.patch('/:homeId/hubs/:hubId', authenticateToken, updateHub);
homeHubRoutes.delete('/:homeId/hubs/:hubId', authenticateToken, deleteHub);
app.use('/homes', homeHubRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'VeaHome Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/auth/*',
      homes: '/homes/*',
      hubs: '/hub/*',
      devices: '/homes/:homeId/devices/*',
      scenes: '/homes/:homeId/scenes/*',
      schedules: '/homes/:homeId/schedules/*',
      automations: '/homes/:homeId/automations/*',
      deviceGroups: '/homes/:homeId/device-groups/*',
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Initialize services
initializeWebSocket(server);
initMqttClient();
initializeIoT();
initializeScheduler();

// Start server
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 VeaHome Backend Server running`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
