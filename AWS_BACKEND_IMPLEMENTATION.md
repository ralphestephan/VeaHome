# AWS Backend Implementation Guide for VeaHome

This document provides a complete step-by-step guide to building the AWS backend for the VeaHome mobile application. Follow this guide to implement all required API endpoints, real-time communication, and database infrastructure.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [AWS Services Required](#aws-services-required)
4. [Project Setup](#project-setup)
5. [Database Schema](#database-schema)
6. [Authentication Setup](#authentication-setup)
7. [API Gateway Configuration](#api-gateway-configuration)
8. [Lambda Functions Implementation](#lambda-functions-implementation)
9. [WebSocket API Setup](#websocket-api-setup)
10. [MQTT/IoT Core Integration](#mqttiot-core-integration)
11. [Real-time Updates System](#real-time-updates-system)
12. [Scheduler Service](#scheduler-service)
13. [Automation Engine](#automation-engine)
14. [Environment Variables](#environment-variables)
15. [Deployment Instructions](#deployment-instructions)
16. [Testing](#testing)

---

## 🏗 Architecture Overview

```
Mobile App (React Native)
    ↓
API Gateway (REST + WebSocket)
    ↓
Lambda Functions (Business Logic)
    ↓
RDS PostgreSQL / DynamoDB (Data Storage)
    ↓
InfluxDB (Time-Series Data - Energy/History)
    ↓
IoT Core (MQTT for Hub Communication)
    ↓
WebSocket API (Real-time Updates)
```

### Data Flow:
1. **User Authentication**: Mobile app → API Gateway → Lambda → Cognito → PostgreSQL (user data)
2. **Device Control**: Mobile app → API Gateway → Lambda → IoT Core → Hub (via MQTT) → Device
3. **Real-time Updates**: Hub → IoT Core → Lambda → WebSocket API → Mobile app
4. **Energy Data**: Hub → IoT Core → Lambda → InfluxDB → Lambda → Mobile app

---

## ✅ Prerequisites

Before starting, ensure you have:
- AWS Account with admin access
- Node.js 18+ installed
- AWS CLI configured (`aws configure`)
- Serverless Framework installed (`npm install -g serverless`)
- PostgreSQL client (for local testing)
- MQTT client tool (MQTTX or similar) for testing

---

## 🔧 AWS Services Required

### Core Services:
1. **AWS Lambda** - Serverless functions for API logic
2. **API Gateway** - REST API endpoints + WebSocket API
3. **Amazon RDS (PostgreSQL)** - Main database for users, homes, devices, scenes
4. **Amazon DynamoDB** - Optional: Fast lookups, caching
5. **Amazon InfluxDB** (via EC2 or Timestream) - Time-series data (energy, device history)
6. **AWS IoT Core** - MQTT broker for hub communication
7. **Amazon Cognito** - User authentication (optional, can use JWT)
8. **AWS EventBridge** - Scheduled tasks (for scheduler service)
9. **AWS S3** - File storage (3D models, images)
10. **CloudWatch** - Logging and monitoring

### Optional Services:
- **AWS AppSync** - GraphQL API (alternative to REST)
- **AWS ElastiCache** - Redis caching
- **AWS Secrets Manager** - Secure credential storage

---

## 📁 Project Setup

### 1. Initialize Serverless Framework Project

```bash
# Create new directory
mkdir veahome-backend
cd veahome-backend

# Initialize serverless project
serverless create --template aws-nodejs-typescript

# Install dependencies
npm install
npm install --save-dev @types/node @types/aws-lambda
npm install --save axios jsonwebtoken bcryptjs pg socket.io aws-iot-device-sdk
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

### 2. Project Structure

```
veahome-backend/
├── serverless.yml           # Serverless configuration
├── package.json
├── tsconfig.json
├── .env.example             # Environment variables template
├── src/
│   ├── handlers/           # Lambda functions
│   │   ├── auth/
│   │   │   ├── login.ts
│   │   │   ├── register.ts
│   │   │   └── me.ts
│   │   ├── hubs/
│   │   │   ├── pairHub.ts
│   │   │   ├── connectWifi.ts
│   │   │   ├── assignRooms.ts
│   │   │   └── getHubStatus.ts
│   │   ├── devices/
│   │   │   ├── listDevices.ts
│   │   │   ├── addDevice.ts
│   │   │   ├── controlDevice.ts
│   │   │   ├── learnSignal.ts
│   │   │   └── getDeviceHistory.ts
│   │   ├── homes/
│   │   │   ├── listHomes.ts
│   │   │   ├── createHome.ts
│   │   │   ├── getHome.ts
│   │   │   ├── getRooms.ts
│   │   │   ├── getRoom.ts
│   │   │   └── updateRoomLayout.ts
│   │   ├── energy/
│   │   │   ├── getEnergy.ts
│   │   │   └── getRoomEnergy.ts
│   │   ├── scenes/
│   │   │   ├── listScenes.ts
│   │   │   ├── createScene.ts
│   │   │   ├── updateScene.ts
│   │   │   ├── deleteScene.ts
│   │   │   └── activateScene.ts
│   │   ├── schedules/
│   │   │   ├── listSchedules.ts
│   │   │   ├── createSchedule.ts
│   │   │   ├── updateSchedule.ts
│   │   │   └── deleteSchedule.ts
│   │   ├── device-groups/
│   │   │   ├── listGroups.ts
│   │   │   ├── createGroup.ts
│   │   │   ├── updateGroup.ts
│   │   │   └── deleteGroup.ts
│   │   ├── automations/
│   │   │   ├── listAutomations.ts
│   │   │   ├── createAutomation.ts
│   │   │   ├── updateAutomation.ts
│   │   │   └── deleteAutomation.ts
│   │   └── websocket/
│   │       └── connect.ts
│   ├── services/           # Shared services
│   │   ├── database.ts     # PostgreSQL connection
│   │   ├── influxdb.ts     # InfluxDB connection
│   │   ├── iot.ts          # IoT Core client
│   │   ├── websocket.ts    # WebSocket manager
│   │   ├── jwt.ts          # JWT utilities
│   │   └── mqtt.ts         # MQTT client
│   ├── models/             # Data models/types
│   │   ├── User.ts
│   │   ├── Home.ts
│   │   ├── Device.ts
│   │   ├── Scene.ts
│   │   └── Schedule.ts
│   └── utils/              # Utility functions
│       ├── response.ts      # API response helpers
│       └── validators.ts    # Input validation
└── scripts/
    ├── deploy.sh
    └── migrate.sql         # Database migrations
```

### 3. Create `serverless.yml`

```yaml
service: veahome-backend

frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  environment:
    STAGE: ${self:provider.stage}
    DB_HOST: ${env:DB_HOST}
    DB_PORT: ${env:DB_PORT}
    DB_NAME: ${env:DB_NAME}
    DB_USER: ${env:DB_USER}
    DB_PASSWORD: ${env:DB_PASSWORD}
    JWT_SECRET: ${env:JWT_SECRET}
    INFLUXDB_URL: ${env:INFLUXDB_URL}
    INFLUXDB_TOKEN: ${env:INFLUXDB_TOKEN}
    INFLUXDB_ORG: ${env:INFLUXDB_ORG}
    INFLUXDB_BUCKET: ${env:INFLUXDB_BUCKET}
    IOT_ENDPOINT: ${env:IOT_ENDPOINT}
    WEBSOCKET_API_URL: ${env:WEBSOCKET_API_URL}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - iot:*
            - iot:Connect
            - iot:Publish
            - iot:Subscribe
            - iot:Receive
          Resource: '*'
        - Effect: Allow
          Action:
            - secretsmanager:GetSecretValue
          Resource: '*'

plugins:
  - serverless-plugin-typescript
  - serverless-offline
  - serverless-webpack

functions:
  # Auth endpoints
  login:
    handler: src/handlers/auth/login.handler
    events:
      - http:
          path: auth/login
          method: post
          cors: true

  register:
    handler: src/handlers/auth/register.handler
    events:
      - http:
          path: auth/register
          method: post
          cors: true

  me:
    handler: src/handlers/auth/me.handler
    events:
      - http:
          path: auth/me
          method: get
          cors: true
          authorizer: aws_iam  # Or custom authorizer

  # Hub endpoints
  pairHub:
    handler: src/handlers/hubs/pairHub.handler
    events:
      - http:
          path: hub/pair
          method: post
          cors: true

  connectWifi:
    handler: src/handlers/hubs/connectWifi.handler
    events:
      - http:
          path: hubs/{hubId}/wifi
          method: post
          cors: true

  assignRooms:
    handler: src/handlers/hubs/assignRooms.handler
    events:
      - http:
          path: hubs/{hubId}/rooms
          method: post
          cors: true

  getHubStatus:
    handler: src/handlers/hubs/getHubStatus.handler
    events:
      - http:
          path: hubs/{hubId}/status
          method: get
          cors: true

  listHubs:
    handler: src/handlers/hubs/listHubs.handler
    events:
      - http:
          path: homes/{homeId}/hubs
          method: get
          cors: true

  # Device endpoints
  listDevices:
    handler: src/handlers/devices/listDevices.handler
    events:
      - http:
          path: homes/{homeId}/devices
          method: get
          cors: true

  addDevice:
    handler: src/handlers/devices/addDevice.handler
    events:
      - http:
          path: homes/{homeId}/devices
          method: post
          cors: true

  getDevice:
    handler: src/handlers/devices/getDevice.handler
    events:
      - http:
          path: homes/{homeId}/devices/{deviceId}
          method: get
          cors: true

  controlDevice:
    handler: src/handlers/devices/controlDevice.handler
    events:
      - http:
          path: homes/{homeId}/devices/{deviceId}/control
          method: put
          cors: true

  learnSignal:
    handler: src/handlers/devices/learnSignal.handler
    events:
      - http:
          path: hubs/{hubId}/devices/{deviceId}/learn
          method: post
          cors: true

  getDeviceHistory:
    handler: src/handlers/devices/getDeviceHistory.handler
    events:
      - http:
          path: homes/{homeId}/devices/{deviceId}/history
          method: get
          cors: true

  # Home endpoints
  listHomes:
    handler: src/handlers/homes/listHomes.handler
    events:
      - http:
          path: homes
          method: get
          cors: true

  createHome:
    handler: src/handlers/homes/createHome.handler
    events:
      - http:
          path: homes
          method: post
          cors: true

  getHome:
    handler: src/handlers/homes/getHome.handler
    events:
      - http:
          path: homes/{homeId}
          method: get
          cors: true

  getRooms:
    handler: src/handlers/homes/getRooms.handler
    events:
      - http:
          path: homes/{homeId}/rooms
          method: get
          cors: true

  getRoom:
    handler: src/handlers/homes/getRoom.handler
    events:
      - http:
          path: homes/{homeId}/rooms/{roomId}
          method: get
          cors: true

  updateRoomLayout:
    handler: src/handlers/homes/updateRoomLayout.handler
    events:
      - http:
          path: homes/{homeId}/layout
          method: put
          cors: true

  # Energy endpoints
  getEnergy:
    handler: src/handlers/energy/getEnergy.handler
    events:
      - http:
          path: homes/{homeId}/energy
          method: get
          cors: true

  getRoomEnergy:
    handler: src/handlers/energy/getRoomEnergy.handler
    events:
      - http:
          path: homes/{homeId}/rooms/{roomId}/energy
          method: get
          cors: true

  # Scene endpoints
  listScenes:
    handler: src/handlers/scenes/listScenes.handler
    events:
      - http:
          path: homes/{homeId}/scenes
          method: get
          cors: true

  createScene:
    handler: src/handlers/scenes/createScene.handler
    events:
      - http:
          path: homes/{homeId}/scenes
          method: post
          cors: true

  updateScene:
    handler: src/handlers/scenes/updateScene.handler
    events:
      - http:
          path: homes/{homeId}/scenes/{sceneId}
          method: put
          cors: true

  deleteScene:
    handler: src/handlers/scenes/deleteScene.handler
    events:
      - http:
          path: homes/{homeId}/scenes/{sceneId}
          method: delete
          cors: true

  activateScene:
    handler: src/handlers/scenes/activateScene.handler
    events:
      - http:
          path: homes/{homeId}/scenes/{sceneId}/activate
          method: put
          cors: true

  # Schedule endpoints
  listSchedules:
    handler: src/handlers/schedules/listSchedules.handler
    events:
      - http:
          path: homes/{homeId}/schedules
          method: get
          cors: true

  createSchedule:
    handler: src/handlers/schedules/createSchedule.handler
    events:
      - http:
          path: homes/{homeId}/schedules
          method: post
          cors: true

  updateSchedule:
    handler: src/handlers/schedules/updateSchedule.handler
    events:
      - http:
          path: homes/{homeId}/schedules/{scheduleId}
          method: put
          cors: true

  deleteSchedule:
    handler: src/handlers/schedules/deleteSchedule.handler
    events:
      - http:
          path: homes/{homeId}/schedules/{scheduleId}
          method: delete
          cors: true

  # Device Group endpoints
  listDeviceGroups:
    handler: src/handlers/device-groups/listGroups.handler
    events:
      - http:
          path: homes/{homeId}/device-groups
          method: get
          cors: true

  createDeviceGroup:
    handler: src/handlers/device-groups/createGroup.handler
    events:
      - http:
          path: homes/{homeId}/device-groups
          method: post
          cors: true

  updateDeviceGroup:
    handler: src/handlers/device-groups/updateGroup.handler
    events:
      - http:
          path: homes/{homeId}/device-groups/{groupId}
          method: put
          cors: true

  deleteDeviceGroup:
    handler: src/handlers/device-groups/deleteGroup.handler
    events:
      - http:
          path: homes/{homeId}/device-groups/{groupId}
          method: delete
          cors: true

  # Automation endpoints
  listAutomations:
    handler: src/handlers/automations/listAutomations.handler
    events:
      - http:
          path: homes/{homeId}/automations
          method: get
          cors: true

  createAutomation:
    handler: src/handlers/automations/createAutomation.handler
    events:
      - http:
          path: homes/{homeId}/automations
          method: post
          cors: true

  updateAutomation:
    handler: src/handlers/automations/updateAutomation.handler
    events:
      - http:
          path: homes/{homeId}/automations/{automationId}
          method: put
          cors: true

  deleteAutomation:
    handler: src/handlers/automations/deleteAutomation.handler
    events:
      - http:
          path: homes/{homeId}/automations/{automationId}
          method: delete
          cors: true

resources:
  Resources:
    # RDS PostgreSQL Database
    VeaHomeDB:
      Type: AWS::RDS::DBInstance
      Properties:
        DBInstanceIdentifier: veahome-db-${self:provider.stage}
        Engine: postgres
        EngineVersion: '15.2'
        DBInstanceClass: db.t3.micro
        AllocatedStorage: 20
        MasterUsername: ${env:DB_USER}
        MasterUserPassword: ${env:DB_PASSWORD}
        DBName: ${env:DB_NAME}
        VPCSecurityGroups:
          - !Ref DatabaseSecurityGroup
        PubliclyAccessible: false
        BackupRetentionPeriod: 7

    DatabaseSecurityGroup:
      Type: AWS::EC2::SecurityGroup
      Properties:
        GroupDescription: Security group for VeaHome database
        VpcId: ${env:VPC_ID}
        SecurityGroupIngress:
          - IpProtocol: tcp
            FromPort: 5432
            ToPort: 5432
            SourceSecurityGroupId: !Ref LambdaSecurityGroup

    LambdaSecurityGroup:
      Type: AWS::EC2::SecurityGroup
      Properties:
        GroupDescription: Security group for Lambda functions
        VpcId: ${env:VPC_ID}

  Outputs:
    ApiGatewayRestApiId:
      Value:
        Ref: ApiGatewayRestApi
      Export:
        Name: ${self:provider.stage}-ApiGatewayRestApiId

    ApiGatewayRestApiRootResourceId:
      Value:
        Fn::GetAtt:
          - ApiGatewayRestApi
          - RootResourceId
      Export:
        Name: ${self:provider.stage}-ApiGatewayRestApiRootResourceId
```

---

## 🗄️ Database Schema

### PostgreSQL Tables

Create file: `scripts/migrate.sql`

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    plan VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Homes table
CREATE TABLE homes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    model3d_url TEXT,
    layout JSONB, -- Stores 2D layout positions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    temperature DECIMAL(5,2) DEFAULT 22.0,
    humidity DECIMAL(5,2) DEFAULT 50.0,
    lights INTEGER DEFAULT 0,
    power VARCHAR(50) DEFAULT '0W',
    scene VARCHAR(255),
    air_quality INTEGER,
    image TEXT,
    model3d_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hubs table
CREATE TABLE hubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'offline', -- online, offline, pairing
    wifi_ssid VARCHAR(255),
    wifi_connected BOOLEAN DEFAULT false,
    mqtt_topic VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hub-Room associations (max 2 rooms per hub)
CREATE TABLE hub_rooms (
    hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    PRIMARY KEY (hub_id, room_id),
    CONSTRAINT max_rooms_per_hub CHECK (
        (SELECT COUNT(*) FROM hub_rooms WHERE hub_id = hub_rooms.hub_id) <= 2
    )
);

-- Devices table
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- light, thermostat, tv, ac, blind, shutter, lock, camera, speaker, sensor
    category VARCHAR(50) NOT NULL, -- IR, RF, Relay, Sensor, Zigbee, Matter, WiFi
    is_active BOOLEAN DEFAULT false,
    value DECIMAL(10,2),
    unit VARCHAR(50),
    signal_mappings JSONB, -- Stores IR/RF signal mappings: {"ON": "signal_code", "OFF": "signal_code", ...}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scenes table
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    device_states JSONB NOT NULL, -- {"deviceId": {"isActive": true, "value": 50}, ...}
    devices JSONB, -- Array of device IDs: ["device1", "device2"]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schedules table
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    time TIME NOT NULL, -- e.g., "08:00:00"
    days JSONB NOT NULL, -- ["monday", "tuesday", ...]
    actions JSONB NOT NULL, -- {"type": "scene", "sceneId": "uuid"} or {"type": "device", "deviceId": "uuid", "state": {...}}
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Device Groups table
CREATE TABLE device_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    device_ids JSONB NOT NULL, -- Array of device IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Automations table
CREATE TABLE automations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    trigger JSONB NOT NULL, -- {"type": "time"|"sensor"|"device", "at": "08:00", "condition": {...}}
    actions JSONB NOT NULL, -- Array of actions
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_homes_user_id ON homes(user_id);
CREATE INDEX idx_rooms_home_id ON rooms(home_id);
CREATE INDEX idx_hubs_home_id ON hubs(home_id);
CREATE INDEX idx_devices_home_id ON devices(home_id);
CREATE INDEX idx_devices_room_id ON devices(room_id);
CREATE INDEX idx_devices_hub_id ON devices(hub_id);
CREATE INDEX idx_scenes_home_id ON scenes(home_id);
CREATE INDEX idx_scenes_is_active ON scenes(is_active);
CREATE INDEX idx_schedules_home_id ON schedules(home_id);
CREATE INDEX idx_automations_home_id ON automations(home_id);
CREATE INDEX idx_automations_enabled ON automations(enabled);
```

---

## 🔐 Authentication Setup

### Option 1: JWT Authentication (Recommended for simplicity)

**File: `src/services/jwt.ts`**

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface JWTPayload {
  userId: string;
  email: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
```

### Option 2: AWS Cognito (More secure, AWS-managed)

1. Create Cognito User Pool in AWS Console
2. Create User Pool Client
3. Configure in `serverless.yml`
4. Use AWS SDK to interact with Cognito

---

## 📝 Lambda Functions Implementation

### Authentication Handlers

**File: `src/handlers/auth/login.ts`**

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDatabase } from '../../services/database';
import { generateToken } from '../../services/jwt';
import bcrypt from 'bcryptjs';
import { createResponse } from '../../utils/response';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { email, password } = JSON.parse(event.body || '{}');

    if (!email || !password) {
      return createResponse(400, { error: 'Email and password are required' });
    }

    const db = getDatabase();
    
    // Find user
    const userResult = await db.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return createResponse(401, { error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return createResponse(401, { error: 'Invalid credentials' });
    }

    // Get user's homes
    const homesResult = await db.query(
      'SELECT id, name FROM homes WHERE user_id = $1',
      [user.id]
    );

    const homes = homesResult.rows;

    // Generate JWT token
    const token = generateToken({ userId: user.id, email: user.email });

    return createResponse(200, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        homeId: homes[0]?.id || null,
      },
      homes: homes.map((h: any) => ({ id: h.id, name: h.name })),
    });
  } catch (error) {
    console.error('Login error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};
```

**File: `src/handlers/auth/register.ts`**

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDatabase } from '../../services/database';
import { generateToken } from '../../services/jwt';
import bcrypt from 'bcryptjs';
import { createResponse } from '../../utils/response';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { name, email, password } = JSON.parse(event.body || '{}');

    if (!name || !email || !password) {
      return createResponse(400, { error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return createResponse(400, { error: 'Password must be at least 6 characters' });
    }

    const db = getDatabase();

    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return createResponse(409, { error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash]
    );

    const user = userResult.rows[0];

    // Create default home
    const homeResult = await db.query(
      'INSERT INTO homes (user_id, name) VALUES ($1, $2) RETURNING id, name',
      [user.id, 'My Home']
    );

    const home = homeResult.rows[0];

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    return createResponse(201, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        homeId: home.id,
      },
      homes: [{ id: home.id, name: home.name }],
    });
  } catch (error) {
    console.error('Register error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};
```

**File: `src/handlers/auth/me.ts`**

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDatabase } from '../../services/database';
import { extractTokenFromHeader, verifyToken } from '../../services/jwt';
import { createResponse } from '../../utils/response';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const token = extractTokenFromHeader(event.headers.Authorization);
    
    if (!token) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    const payload = verifyToken(token);
    const db = getDatabase();

    // Get user
    const userResult = await db.query(
      'SELECT id, name, email, plan FROM users WHERE id = $1',
      [payload.userId]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, { error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get user's homes
    const homesResult = await db.query(
      'SELECT id, name FROM homes WHERE user_id = $1',
      [user.id]
    );

    return createResponse(200, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        homeId: homesResult.rows[0]?.id || null,
      },
      homes: homesResult.rows.map((h: any) => ({ id: h.id, name: h.name })),
    });
  } catch (error) {
    console.error('Me error:', error);
    return createResponse(401, { error: 'Invalid token' });
  }
};
```

### Hub Handlers

**File: `src/handlers/hubs/pairHub.ts`**

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDatabase } from '../../services/database';
import { extractTokenFromHeader, verifyToken } from '../../services/jwt';
import { createResponse } from '../../utils/response';
import { v4 as uuidv4 } from 'uuid';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const token = extractTokenFromHeader(event.headers.Authorization);
    if (!token) return createResponse(401, { error: 'Unauthorized' });

    const payload = verifyToken(token);
    const { qrCode, homeId } = JSON.parse(event.body || '{}');

    if (!qrCode || !homeId) {
      return createResponse(400, { error: 'QR code and home ID are required' });
    }

    const db = getDatabase();

    // Verify user owns the home
    const homeCheck = await db.query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, payload.userId]
    );

    if (homeCheck.rows.length === 0) {
      return createResponse(403, { error: 'Access denied' });
    }

    // Parse QR code (format: "VEAHUB-{serial_number}")
    const serialNumber = qrCode.replace('VEAHUB-', '');

    // Check if hub already exists
    const existingHub = await db.query(
      'SELECT id FROM hubs WHERE serial_number = $1',
      [serialNumber]
    );

    let hubId: string;
    let mqttTopic: string;

    if (existingHub.rows.length > 0) {
      // Hub already exists, update home_id
      hubId = existingHub.rows[0].id;
      await db.query(
        'UPDATE hubs SET home_id = $1, status = $2 WHERE id = $3',
        [homeId, 'pairing', hubId]
      );
      const hubData = await db.query('SELECT mqtt_topic FROM hubs WHERE id = $1', [hubId]);
      mqttTopic = hubData.rows[0]?.mqtt_topic || `hubs/${hubId}`;
    } else {
      // Create new hub
      hubId = uuidv4();
      mqttTopic = `hubs/${hubId}`;
      await db.query(
        `INSERT INTO hubs (id, home_id, serial_number, status, mqtt_topic)
         VALUES ($1, $2, $3, $4, $5)`,
        [hubId, homeId, serialNumber, 'pairing', mqttTopic]
      );
    }

    return createResponse(200, {
      hubId,
      status: 'pairing',
      mqttTopic,
    });
  } catch (error) {
    console.error('Pair hub error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};
```

**File: `src/handlers/hubs/connectWifi.ts`**

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDatabase } from '../../services/database';
import { extractTokenFromHeader, verifyToken } from '../../services/jwt';
import { createResponse } from '../../utils/response';
import { IoTClient, PublishCommand } from '@aws-sdk/client-iot';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const token = extractTokenFromHeader(event.headers.Authorization);
    if (!token) return createResponse(401, { error: 'Unauthorized' });

    verifyToken(token);
    const hubId = event.pathParameters?.hubId;
    const { ssid, password } = JSON.parse(event.body || '{}');

    if (!hubId || !ssid || !password) {
      return createResponse(400, { error: 'Hub ID, SSID, and password are required' });
    }

    const db = getDatabase();

    // Get hub MQTT topic
    const hubResult = await db.query(
      'SELECT mqtt_topic FROM hubs WHERE id = $1',
      [hubId]
    );

    if (hubResult.rows.length === 0) {
      return createResponse(404, { error: 'Hub not found' });
    }

    const mqttTopic = hubResult.rows[0].mqtt_topic;

    // Publish WiFi credentials to hub via MQTT
    const iotClient = new IoTClient({ region: process.env.AWS_REGION });
    
    await iotClient.send(new PublishCommand({
      topic: `${mqttTopic}/wifi/config`,
      payload: Buffer.from(JSON.stringify({ ssid, password })),
    }));

    // Update hub in database
    await db.query(
      'UPDATE hubs SET wifi_ssid = $1, wifi_connected = false WHERE id = $2',
      [ssid, hubId]
    );

    return createResponse(200, {
      message: 'WiFi credentials sent to hub',
      status: 'connecting',
    });
  } catch (error) {
    console.error('Connect WiFi error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};
```

### Device Handlers

**File: `src/handlers/devices/controlDevice.ts`**

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDatabase } from '../../services/database';
import { extractTokenFromHeader, verifyToken } from '../../services/jwt';
import { createResponse } from '../../utils/response';
import { IoTClient, PublishCommand } from '@aws-sdk/client-iot';
import { writeToInfluxDB } from '../../services/influxdb';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const token = extractTokenFromHeader(event.headers.Authorization);
    if (!token) return createResponse(401, { error: 'Unauthorized' });

    const payload = verifyToken(token);
    const homeId = event.pathParameters?.homeId;
    const deviceId = event.pathParameters?.deviceId;
    const controlPayload = JSON.parse(event.body || '{}');

    if (!homeId || !deviceId) {
      return createResponse(400, { error: 'Home ID and Device ID are required' });
    }

    const db = getDatabase();

    // Verify user owns the home
    const homeCheck = await db.query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, payload.userId]
    );

    if (homeCheck.rows.length === 0) {
      return createResponse(403, { error: 'Access denied' });
    }

    // Get device and hub info
    const deviceResult = await db.query(
      `SELECT d.*, h.mqtt_topic, h.id as hub_id 
       FROM devices d 
       JOIN hubs h ON d.hub_id = h.id 
       WHERE d.id = $1 AND d.home_id = $2`,
      [deviceId, homeId]
    );

    if (deviceResult.rows.length === 0) {
      return createResponse(404, { error: 'Device not found' });
    }

    const device = deviceResult.rows[0];
    const { isActive, value, signal_mappings } = device;

    // Build MQTT command
    const command: any = {};
    
    if (controlPayload.isActive !== undefined) {
      command.action = controlPayload.isActive ? 'ON' : 'OFF';
      command.signal = signal_mappings?.[command.action];
    }
    
    if (controlPayload.value !== undefined) {
      command.value = controlPayload.value;
      // Map value to signal if needed (e.g., temperature up/down)
      if (device.type === 'thermostat' || device.type === 'ac') {
        command.action = controlPayload.value > value ? 'TEMP_UP' : 'TEMP_DOWN';
        command.signal = signal_mappings?.[command.action];
      }
    }

    // Publish command to hub via MQTT
    const iotClient = new IoTClient({ region: process.env.AWS_REGION });
    
    await iotClient.send(new PublishCommand({
      topic: `${device.mqtt_topic}/devices/${deviceId}/control`,
      payload: Buffer.from(JSON.stringify(command)),
    }));

    // Update device state in database
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (controlPayload.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(controlPayload.isActive);
    }

    if (controlPayload.value !== undefined) {
      updateFields.push(`value = $${paramIndex++}`);
      updateValues.push(controlPayload.value);
    }

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(deviceId, homeId);

      await db.query(
        `UPDATE devices 
         SET ${updateFields.join(', ')} 
         WHERE id = $${paramIndex++} AND home_id = $${paramIndex++}`,
        updateValues
      );
    }

    // Record device state change in InfluxDB
    await writeToInfluxDB({
      measurement: 'device_states',
      tags: {
        device_id: deviceId,
        home_id: homeId,
        device_type: device.type,
      },
      fields: {
        is_active: controlPayload.isActive ?? isActive,
        value: controlPayload.value ?? value ?? 0,
      },
      timestamp: new Date(),
    });

    // Emit WebSocket event (handled by WebSocket handler)
    // This would be done via API Gateway WebSocket API

    return createResponse(200, {
      message: 'Device control command sent',
      deviceId,
    });
  } catch (error) {
    console.error('Control device error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};
```

**Continue with remaining handlers...** (Due to length, I'll provide the essential pattern above)

---

## 🔌 WebSocket API Setup

### 1. Create WebSocket API in API Gateway

**File: `serverless.yml` (add WebSocket section)**

```yaml
websocketApi:
  websocketApi:
    name: veahome-websocket-${self:provider.stage}
    description: WebSocket API for real-time updates
    routeSelectionExpression: "$request.body.action"

functions:
  websocketConnect:
    handler: src/handlers/websocket/connect.handler
    events:
      - websocket:
          route: $connect

  websocketDisconnect:
    handler: src/handlers/websocket/disconnect.handler
    events:
      - websocket:
          route: $disconnect

  websocketDefault:
    handler: src/handlers/websocket/default.handler
    events:
      - websocket:
          route: $default
```

**File: `src/handlers/websocket/connect.ts`**

```typescript
import { APIGatewayProxyWebsocketEvent } from 'aws-lambda';
import { extractTokenFromHeader, verifyToken } from '../../services/jwt';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const dynamoDB = new DynamoDB({ region: process.env.AWS_REGION });
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'websocket-connections';

export const handler = async (event: APIGatewayProxyWebsocketEvent) => {
  try {
    const token = extractTokenFromHeader(event.headers.Authorization || event.queryStringParameters?.token);
    
    if (!token) {
      return { statusCode: 401, body: 'Unauthorized' };
    }

    const payload = verifyToken(token);
    const homeId = event.queryStringParameters?.homeId;

    if (!homeId) {
      return { statusCode: 400, body: 'Home ID required' };
    }

    const connectionId = event.requestContext.connectionId;

    // Store connection in DynamoDB
    await dynamoDB.putItem({
      TableName: CONNECTIONS_TABLE,
      Item: {
        connectionId: { S: connectionId },
        userId: { S: payload.userId },
        homeId: { S: homeId },
        connectedAt: { S: new Date().toISOString() },
      },
    });

    return { statusCode: 200, body: 'Connected' };
  } catch (error) {
    console.error('WebSocket connect error:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};
```

### 2. Emit Events to WebSocket

**File: `src/services/websocket.ts`**

```typescript
import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const apiGateway = new ApiGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_API_URL,
});
const dynamoDB = new DynamoDB({ region: process.env.AWS_REGION });
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'websocket-connections';

export async function emitToHome(homeId: string, event: string, data: any) {
  try {
    // Get all connections for this home
    const connections = await dynamoDB.query({
      TableName: CONNECTIONS_TABLE,
      IndexName: 'homeId-index',
      KeyConditionExpression: 'homeId = :homeId',
      ExpressionAttributeValues: {
        ':homeId': { S: homeId },
      },
    });

    // Send event to all connections
    const promises = connections.Items?.map(async (item) => {
      const connectionId = item.connectionId.S!;
      try {
        await apiGateway.postToConnection({
          ConnectionId: connectionId,
          Data: Buffer.from(JSON.stringify({ event, data })),
        });
      } catch (error: any) {
        if (error.statusCode === 410) {
          // Connection closed, remove from table
          await dynamoDB.deleteItem({
            TableName: CONNECTIONS_TABLE,
            Key: { connectionId: { S: connectionId } },
          });
        }
      }
    });

    await Promise.all(promises || []);
  } catch (error) {
    console.error('Emit to home error:', error);
  }
}

export async function emitDeviceUpdate(homeId: string, deviceId: string, state: any) {
  await emitToHome(homeId, 'device:update', { deviceId, state });
}

export async function emitEnergyUpdate(homeId: string, energyData: any) {
  await emitToHome(homeId, 'energy:update', energyData);
}

export async function emitHubStatus(homeId: string, hubId: string, status: string) {
  await emitToHome(homeId, 'hub:status', { hubId, status });
}
```

---

## 📡 MQTT/IoT Core Integration

### 1. Setup IoT Core

1. **Create IoT Thing** in AWS IoT Core
2. **Create Policy** allowing connect, publish, subscribe
3. **Create Certificate** and attach to Thing
4. **Configure Endpoint** (save endpoint URL to env)

### 2. IoT Rules for Hub Communication

Create IoT Rules to:
- Route hub messages to Lambda functions
- Forward device updates to WebSocket API
- Store energy data in InfluxDB

**Example Rule:**
```sql
SELECT * FROM 'hubs/+/devices/+/state' WHERE state.action = 'report'
```

This rule triggers a Lambda function when hub reports device state.

---

## ⚡ Real-time Updates System

When a device state changes:

1. **Hub → IoT Core** (via MQTT): Hub publishes device state update
2. **IoT Rule → Lambda**: Triggers `handleDeviceStateUpdate` Lambda
3. **Lambda → WebSocket API**: Emits `device:update` event to connected clients
4. **Lambda → InfluxDB**: Records device state change for history

**File: `src/handlers/iot/deviceStateUpdate.ts`**

```typescript
import { IoTEvent } from 'aws-lambda';
import { emitDeviceUpdate } from '../../services/websocket';
import { writeToInfluxDB } from '../../services/influxdb';
import { getDatabase } from '../../services/database';

export const handler = async (event: IoTEvent) => {
  try {
    const { deviceId, state, hubId } = JSON.parse(event.payload);
    const db = getDatabase();

    // Get device home_id
    const device = await db.query(
      'SELECT home_id FROM devices WHERE id = $1',
      [deviceId]
    );

    if (device.rows.length === 0) return;

    const homeId = device.rows[0].home_id;

    // Update device in database
    await db.query(
      'UPDATE devices SET is_active = $1, value = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [state.isActive, state.value, deviceId]
    );

    // Emit WebSocket event
    await emitDeviceUpdate(homeId, deviceId, state);

    // Write to InfluxDB
    await writeToInfluxDB({
      measurement: 'device_states',
      tags: { device_id: deviceId, home_id: homeId },
      fields: { is_active: state.isActive, value: state.value ?? 0 },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Device state update error:', error);
  }
};
```

---

## ⏰ Scheduler Service

Use **AWS EventBridge** to trigger scheduled Lambda functions.

**File: `serverless.yml` (add scheduler function)**

```yaml
executeSchedule:
  handler: src/handlers/schedules/executeSchedule.handler
  events:
    - schedule:
        rate: rate(1 minute) # Check every minute
        enabled: true
```

**File: `src/handlers/schedules/executeSchedule.ts`**

```typescript
import { getDatabase } from '../../services/database';
import { activateScene } from '../scenes/activateScene';

export const handler = async () => {
  const db = getDatabase();
  const now = new Date();
  const currentTime = now.toTimeString().substring(0, 5); // "HH:MM"
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' }); // "monday"

  // Get all enabled schedules that match current time and day
  const schedules = await db.query(
    `SELECT * FROM schedules 
     WHERE enabled = true 
     AND time::text LIKE $1 
     AND $2 = ANY(days)`,
    [`${currentTime}%`, currentDay]
  );

  // Execute each schedule
  for (const schedule of schedules.rows) {
    const actions = schedule.actions;
    
    for (const action of actions) {
      if (action.type === 'scene') {
        // Activate scene
        await activateScene(schedule.home_id, action.sceneId);
      } else if (action.type === 'device') {
        // Control device
        // ... implement device control
      }
    }
  }
};
```

---

## 🤖 Automation Engine

Similar to scheduler, but evaluates triggers continuously.

**File: `src/handlers/automations/evaluateAutomations.ts`**

```typescript
import { getDatabase } from '../../services/database';

export const handler = async (event: any) => {
  // Triggered by:
  // - IoT device state change
  // - Time-based triggers (EventBridge)
  // - Sensor value changes

  const db = getDatabase();
  const automations = await db.query(
    'SELECT * FROM automations WHERE enabled = true'
  );

  for (const automation of automations.rows) {
    const trigger = automation.trigger;
    
    // Evaluate trigger conditions
    let shouldExecute = false;
    
    if (trigger.type === 'time') {
      const currentTime = new Date().toTimeString().substring(0, 5);
      shouldExecute = currentTime === trigger.at;
    } else if (trigger.type === 'device') {
      // Check device state matches condition
      const deviceState = event.deviceState;
      shouldExecute = evaluateDeviceCondition(deviceState, trigger.condition);
    } else if (trigger.type === 'sensor') {
      // Check sensor value matches condition
      const sensorValue = event.sensorValue;
      shouldExecute = evaluateSensorCondition(sensorValue, trigger.condition);
    }

    if (shouldExecute) {
      // Execute automation actions
      for (const action of automation.actions) {
        // Execute action (control device, activate scene, etc.)
      }
    }
  }
};
```

---

## 🔧 Environment Variables

**File: `.env.example`**

```env
# Database
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=veahome
DB_USER=admin
DB_PASSWORD=your-secure-password

# JWT
JWT_SECRET=your-very-secure-secret-key-min-32-chars

# InfluxDB
INFLUXDB_URL=http://your-influxdb-instance:8086
INFLUXDB_TOKEN=your-influxdb-token
INFLUXDB_ORG=veahome
INFLUXDB_BUCKET=energy_data

# IoT Core
IOT_ENDPOINT=your-iot-endpoint.iot.region.amazonaws.com
IOT_REGION=us-east-1

# WebSocket
WEBSOCKET_API_URL=wss://your-websocket-api-id.execute-api.region.amazonaws.com/dev
CONNECTIONS_TABLE=websocket-connections

# AWS
AWS_REGION=us-east-1
VPC_ID=vpc-xxxxx
SUBNET_IDS=subnet-xxxxx,subnet-yyyyy
```

---

## 🚀 Deployment Instructions

### 1. Setup RDS Database

```bash
# Create RDS PostgreSQL instance via AWS Console or CLI
aws rds create-db-instance \
  --db-instance-identifier veahome-db-dev \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password YourSecurePassword \
  --allocated-storage 20
```

### 2. Run Database Migrations

```bash
# Connect to database
psql -h your-rds-endpoint.region.rds.amazonaws.com -U admin -d veahome

# Run migrations
\i scripts/migrate.sql
```

### 3. Setup InfluxDB

Option A: AWS Timestream (Serverless)
Option B: EC2 instance with InfluxDB
Option C: InfluxDB Cloud

### 4. Deploy Lambda Functions

```bash
# Install serverless plugins
npm install

# Deploy to AWS
serverless deploy --stage dev

# Or deploy specific function
serverless deploy function -f login --stage dev
```

### 5. Configure API Gateway

- API Gateway REST API is automatically created by Serverless Framework
- WebSocket API needs manual configuration (see WebSocket section above)

### 6. Setup IoT Core

1. Create Thing in AWS IoT Core
2. Create Policy
3. Create Certificate
4. Attach to Thing
5. Note endpoint URL

### 7. Update Mobile App Configuration

Update `app.json` in mobile app:
```json
{
  "extra": {
    "apiBaseUrl": "https://your-api-id.execute-api.region.amazonaws.com/dev"
  }
}
```

---

## ✅ Testing

### 1. Test Authentication

```bash
# Register user
curl -X POST https://your-api.com/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST https://your-api.com/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 2. Test Device Control

```bash
curl -X PUT https://your-api.com/dev/homes/{homeId}/devices/{deviceId}/control \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true, "value": 50}'
```

### 3. Test MQTT Connection

Use MQTTX or similar client:
- Connect to IoT Core endpoint
- Subscribe to `hubs/{hubId}/devices/{deviceId}/control`
- Publish test command

---

## 📚 Additional Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [API Gateway WebSocket API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html)
- [AWS IoT Core Documentation](https://docs.aws.amazon.com/iot/)
- [Serverless Framework Documentation](https://www.serverless.com/framework/docs)

---

## 🎯 Next Steps

1. **Complete all Lambda handlers** following the patterns above
2. **Set up monitoring** with CloudWatch
3. **Implement error handling** and retry logic
4. **Add rate limiting** to prevent abuse
5. **Set up CI/CD pipeline** for deployments
6. **Configure backups** for RDS
7. **Set up alarms** for errors and high usage

---

This guide provides the foundation for building the VeaHome backend. Each handler should follow the same pattern: authenticate request, validate input, interact with database/IoT/WebSocket, return response. Good luck with your implementation!



