# VeaHome Backend API

Express.js backend server for VeaHome smart home application with PostgreSQL database, WebSocket real-time updates, and AWS IoT Core integration.

## Features

- ✅ RESTful API with 50+ endpoints
- ✅ JWT authentication
- ✅ PostgreSQL database
- ✅ WebSocket real-time updates (Socket.IO)
- ✅ AWS IoT Core MQTT integration (ready for ESP32 hubs)
- ✅ Scheduler service (node-cron)
- ✅ Device signal learning
- ✅ Scene management
- ✅ Multi-home support
- ✅ Device groups and automations

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Real-time:** Socket.IO
- **IoT:** AWS IoT Core (MQTT)
- **Authentication:** JWT
- **Validation:** Joi
- **Scheduler:** node-cron

## Installation

```bash
# Install dependencies
cd backend
yarn install

# Or use npm
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` with your configuration:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=veahome
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-super-secure-secret
```

## Database Setup

### Option 1: Local PostgreSQL

1. Install PostgreSQL:
```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

2. Create database:
```bash
psql -U postgres
CREATE DATABASE veahome;
\q
```

3. Run migrations:
```bash
yarn migrate
```

### Option 2: Docker PostgreSQL

```bash
docker run --name veahome-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=veahome \
  -p 5432:5432 \
  -d postgres:15
```

Then run migrations:
```bash
yarn migrate
```

## Development

```bash
# Start development server with hot reload
yarn dev

# Server will start on http://localhost:8000
```

## Production

```bash
# Build TypeScript
yarn build

# Start production server
yarn start
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user

### Homes
- `GET /homes` - List user's homes
- `POST /homes` - Create new home
- `GET /homes/:homeId` - Get home details
- `GET /homes/:homeId/rooms` - Get rooms in home
- `GET /homes/:homeId/rooms/:roomId` - Get room details
- `PUT /homes/:homeId/layout` - Update floor plan layout
- `GET /homes/:homeId/energy` - Get energy data

### Hubs
- `POST /hub/pair` - Pair hub via QR code
- `GET /homes/:homeId/hubs` - List hubs in home
- `POST /hubs/:hubId/wifi` - Configure hub WiFi
- `POST /hubs/:hubId/rooms` - Assign rooms to hub
- `GET /hubs/:hubId/status` - Get hub status

### Devices
- `GET /homes/:homeId/devices` - List devices
- `POST /homes/:homeId/devices` - Add new device
- `GET /homes/:homeId/devices/:deviceId` - Get device details
- `PUT /homes/:homeId/devices/:deviceId/control` - Control device
- `POST /hubs/:hubId/devices/:deviceId/learn` - Learn IR/RF signal
- `GET /homes/:homeId/devices/:deviceId/history` - Get device history

### Scenes
- `GET /homes/:homeId/scenes` - List scenes
- `POST /homes/:homeId/scenes` - Create scene
- `PUT /homes/:homeId/scenes/:sceneId` - Update scene
- `DELETE /homes/:homeId/scenes/:sceneId` - Delete scene
- `PUT /homes/:homeId/scenes/:sceneId/activate` - Activate scene

### Schedules
- `GET /homes/:homeId/schedules` - List schedules
- `POST /homes/:homeId/schedules` - Create schedule
- `PUT /homes/:homeId/schedules/:scheduleId` - Update schedule
- `DELETE /homes/:homeId/schedules/:scheduleId` - Delete schedule

### Device Groups
- `GET /homes/:homeId/device-groups` - List device groups
- `POST /homes/:homeId/device-groups` - Create device group
- `PUT /homes/:homeId/device-groups/:groupId` - Update device group
- `DELETE /homes/:homeId/device-groups/:groupId` - Delete device group

### Automations
- `GET /homes/:homeId/automations` - List automations
- `POST /homes/:homeId/automations` - Create automation
- `PUT /homes/:homeId/automations/:automationId` - Update automation
- `DELETE /homes/:homeId/automations/:automationId` - Delete automation

## WebSocket Events

Connect to WebSocket server:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:8000', {
  auth: { token: 'your-jwt-token' },
  query: { homeId: 'your-home-id' }
});

// Listen for device updates
socket.on('device:update', (data) => {
  console.log('Device updated:', data);
});

// Listen for energy updates
socket.on('energy:update', (data) => {
  console.log('Energy data:', data);
});

// Listen for hub status
socket.on('hub:status', (data) => {
  console.log('Hub status:', data);
});
```

## AWS IoT Core Setup

1. Create IoT Thing in AWS Console
2. Generate certificates
3. Create IoT Policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iot:Connect",
        "iot:Publish",
        "iot:Subscribe",
        "iot:Receive"
      ],
      "Resource": "*"
    }
  ]
}
```
4. Update `.env` with IoT endpoint:
```env
AWS_IOT_ENDPOINT=your-iot-endpoint.iot.us-east-1.amazonaws.com
```

## ESP32 MQTT Topics

### Backend → Hub (Commands)
- `hubs/{hubId}/wifi/config` - WiFi configuration
- `hubs/{hubId}/devices/{deviceId}/control` - Device control commands
- `hubs/{hubId}/devices/{deviceId}/learn` - Signal learning mode

### Hub → Backend (Reports)
- `hubs/{hubId}/status` - Hub status updates
- `hubs/{hubId}/devices/{deviceId}/state` - Device state reports
- `hubs/{hubId}/devices/{deviceId}/learned` - Learned signal data

## Testing

```bash
# Test authentication
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'

# Test device control
curl -X PUT http://localhost:8000/homes/{homeId}/devices/{deviceId}/control \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}'
```

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration (database, JWT)
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business services (WebSocket, IoT, Scheduler)
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   └── server.ts        # Main server file
├── database/
│   ├── migrations/      # Database migrations
│   └── seed.sql         # Seed data
├── .env                 # Environment variables
├── .env.example         # Example environment file
├── package.json
├── tsconfig.json
└── README.md
```

## Deployment

### AWS EC2

1. Launch EC2 instance (Ubuntu)
2. Install Node.js and PostgreSQL
3. Clone repository
4. Configure environment variables
5. Run migrations
6. Start server with PM2:
```bash
npm install -g pm2
pm2 start dist/server.js --name veahome-backend
pm2 startup
pm2 save
```

### Docker

```bash
# Build image
docker build -t veahome-backend .

# Run container
docker run -p 8000:8000 --env-file .env veahome-backend
```

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|--------|
| PORT | Server port | No | 8000 |
| NODE_ENV | Environment | No | development |
| DB_HOST | PostgreSQL host | Yes | localhost |
| DB_PORT | PostgreSQL port | No | 5432 |
| DB_NAME | Database name | Yes | veahome |
| DB_USER | Database user | Yes | postgres |
| DB_PASSWORD | Database password | Yes | - |
| JWT_SECRET | JWT secret key | Yes | - |
| JWT_EXPIRES_IN | Token expiration | No | 7d |
| AWS_REGION | AWS region | No | us-east-1 |
| AWS_IOT_ENDPOINT | IoT Core endpoint | No | - |

## License

MIT
