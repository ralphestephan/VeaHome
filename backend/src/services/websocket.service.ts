import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from '../config/jwt';

let io: SocketIOServer | null = null;

export function initializeWebSocket(server: HttpServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const payload = verifyToken(token as string);
      (socket as any).userId = payload.userId;
      (socket as any).homeId = socket.handshake.query.homeId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;
    const homeId = (socket as any).homeId;
    
    console.log(`WebSocket: User ${userId} connected to home ${homeId}`);

    // Join room for home-specific events
    if (homeId) {
      socket.join(`home:${homeId}`);
    }

    socket.on('disconnect', () => {
      console.log(`WebSocket: User ${userId} disconnected`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitToHome(homeId: string, event: string, data: any) {
  if (io) {
    io.to(`home:${homeId}`).emit(event, data);
  }
}

export function emitDeviceUpdate(homeId: string, deviceId: string, state: any) {
  emitToHome(homeId, 'device:update', { deviceId, state });
}

export function emitEnergyUpdate(homeId: string, energyData: any) {
  emitToHome(homeId, 'energy:update', energyData);
}

export function emitHubStatus(homeId: string, hubId: string, status: string) {
  emitToHome(homeId, 'hub:status', { hubId, status });
}
