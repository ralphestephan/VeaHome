# VeaHome AWS Backend Architecture

## Complete Backend Skeleton & Deployment Guide

This document provides the complete AWS backend architecture for the VeaHome smart home mobile application, including all database schemas, Lambda functions, API structures, and deployment instructions.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [AWS Services Required](#aws-services-required)
3. [Database Schema (DynamoDB)](#database-schema-dynamodb)
4. [API Structure (AppSync GraphQL)](#api-structure-appsync-graphql)
5. [Lambda Functions](#lambda-functions)
6. [AWS IoT Core Setup](#aws-iot-core-setup)
7. [Authentication (Cognito)](#authentication-cognito)
8. [Deployment Instructions](#deployment-instructions)
9. [Environment Variables](#environment-variables)
10. [Cost Estimation](#cost-estimation)

---

## Architecture Overview

```
Mobile App (React Native)
        ↓
    AWS Cognito (Authentication)
        ↓
    AWS AppSync (GraphQL API)
        ↓
    ┌─────────────────────────────────┐
    │                                 │
AWS Lambda Functions      AWS IoT Core (Hub Communication)
    │                                 │
    └─────────┬───────────────────────┘
              ↓
        DynamoDB Tables
```

### Data Flow

1. **User authenticates** via AWS Cognito
2. **Mobile app** communicates with **AppSync GraphQL API**
3. **AppSync** triggers **Lambda functions** for business logic
4. **Lambda functions** interact with **DynamoDB** and **AWS IoT Core**
5. **AWS IoT Core** manages **real-time device communication** with the hub
6. **DynamoDB Streams** trigger Lambda for **real-time updates**

---

## AWS Services Required

| Service | Purpose | Estimated Monthly Cost |
|---------|---------|------------------------|
| AWS Cognito | User authentication & management | $0-5 |
| DynamoDB | NoSQL database for all app data | $5-20 |
| AWS AppSync | GraphQL API layer | $5-10 |
| AWS Lambda | Serverless business logic | $1-5 |
| AWS IoT Core | Device/Hub communication | $5-15 |
| CloudWatch | Logging & monitoring | $2-5 |
| **Total** | | **$18-60/month** |

---

## Database Schema (DynamoDB)

### 1. Users Table

**Table Name**: `veahome-users`

```json
{
  "userId": "USER#uuid",           // Partition Key
  "email": "client@vealive.com",
  "name": "VeaLive Client",
  "phone": "+1234567890",
  "plan": "premium",               // free, premium, pro
  "homeId": "HOME#uuid",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

**Indexes**:
- GSI1: `email` (Partition Key)
- GSI2: `homeId` (Partition Key)

---

### 2. Homes Table

**Table Name**: `veahome-homes`

```json
{
  "homeId": "HOME#uuid",          // Partition Key
  "userId": "USER#uuid",          // Owner
  "name": "VeaHome Smart",
  "address": {
    "street": "123 Smart Street",
    "city": "City",
    "state": "State",
    "zipCode": "12345",
    "country": "USA"
  },
  "hubId": "HUB#uuid",            // Physical hub device
  "totalRooms": 15,
  "totalDevices": 38,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

**Indexes**:
- GSI1: `hubId` (Partition Key)

---

### 3. Rooms Table

**Table Name**: `veahome-rooms`

```json
{
  "roomId": "ROOM#uuid",          // Partition Key
  "homeId": "HOME#uuid",          // Sort Key
  "name": "Living Room (Salon)",
  "type": "living_room",          // master, office, kitchen, bathroom, etc.
  "temperature": 24.0,
  "humidity": 62,
  "airQuality": 95,
  "scene": "Evening Relax",
  "totalDevices": 12,
  "totalLights": 6,
  "powerConsumption": 2.3,        // kW
  "position": {
    "floor": 1,
    "x": 10,
    "y": 20
  },
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

**Indexes**:
- GSI1: `homeId` (Partition Key), `roomId` (Sort Key)

---

### 4. Devices Table

**Table Name**: `veahome-devices`

```json
{
  "deviceId": "DEVICE#uuid",      // Partition Key
  "roomId": "ROOM#uuid",          // Sort Key
  "homeId": "HOME#uuid",
  "name": "Main Lights",
  "type": "light",                // light, thermostat, tv, ac, blind, shutter, lock, camera, speaker, sensor
  "category": "Relay",            // IR, RF, Relay, Sensor
  "brand": "Philips",
  "model": "Hue White",
  "isActive": true,
  "isOnline": true,
  "state": {
    "power": "on",
    "brightness": 70,             // 0-100 (for lights)
    "temperature": 24,            // °C (for climate devices)
    "mode": "cool",               // heat, cool, auto (for AC/thermostat)
    "position": 75,               // 0-100 (for blinds/shutters)
    "locked": true                // boolean (for locks)
  },
  "capabilities": [
    "on_off",
    "brightness",
    "color_temp"
  ],
  "protocol": "zigbee",           // zigbee, zwave, wifi, ir, rf
  "lastSeen": "2024-01-15T12:30:00Z",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

**Indexes**:
- GSI1: `roomId` (Partition Key), `deviceId` (Sort Key)
- GSI2: `homeId` (Partition Key), `type` (Sort Key)

---

### 5. Energy Data Table

**Table Name**: `veahome-energy`

```json
{
  "energyId": "ENERGY#uuid",      // Partition Key
  "timestamp": "2024-01-15T12:00:00Z", // Sort Key
  "homeId": "HOME#uuid",
  "roomId": "ROOM#uuid",          // Optional, null for whole home
  "deviceId": "DEVICE#uuid",      // Optional, null for room/home total
  "energyKwh": 2.3,
  "voltage": 240,
  "current": 9.6,
  "powerFactor": 0.95,
  "categories": {
    "lighting": 0.8,
    "climate": 1.0,
    "media": 0.3,
    "security": 0.2
  },
  "cost": 1.84,                   // Currency based on user location
  "period": "hourly"              // hourly, daily, weekly, monthly
}
```

**Indexes**:
- GSI1: `homeId` (Partition Key), `timestamp` (Sort Key)
- GSI2: `roomId` (Partition Key), `timestamp` (Sort Key)

---

### 6. Sensors Table

**Table Name**: `veahome-sensors`

```json
{
  "sensorId": "SENSOR#uuid",      // Partition Key
  "roomId": "ROOM#uuid",
  "homeId": "HOME#uuid",
  "type": "air_quality",          // air_quality, rain, motion, door_window, smoke
  "reading": {
    "co2": 450,                   // ppm
    "voc": 120,                   // ppb
    "pm25": 12,                   // µg/m³
    "pm10": 18,                   // µg/m³
    "airQualityIndex": 95         // 0-100
  },
  "isOnline": true,
  "batteryLevel": 85,             // percentage
  "lastReading": "2024-01-15T12:30:00Z",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**Indexes**:
- GSI1: `roomId` (Partition Key), `type` (Sort Key)
- GSI2: `homeId` (Partition Key), `type` (Sort Key)

---

### 7. Scenes Table

**Table Name**: `veahome-scenes`

```json
{
  "sceneId": "SCENE#uuid",        // Partition Key
  "homeId": "HOME#uuid",
  "name": "Evening Relax",
  "icon": "weather-sunset",
  "isActive": true,
  "schedule": {
    "enabled": true,
    "time": "18:00",
    "days": ["mon", "tue", "wed", "thu", "fri"]
  },
  "actions": [
    {
      "deviceId": "DEVICE#uuid",
      "action": "set_brightness",
      "value": 40
    },
    {
      "deviceId": "DEVICE#uuid",
      "action": "set_temperature",
      "value": 22
    }
  ],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

**Indexes**:
- GSI1: `homeId` (Partition Key), `sceneId` (Sort Key)

---

### 8. Automation Rules Table

**Table Name**: `veahome-automations`

```json
{
  "automationId": "AUTO#uuid",    // Partition Key
  "homeId": "HOME#uuid",
  "name": "Night Mode",
  "isEnabled": true,
  "triggers": [
    {
      "type": "time",
      "value": "22:00"
    },
    {
      "type": "sensor",
      "sensorId": "SENSOR#uuid",
      "condition": "brightness < 100"
    }
  ],
  "conditions": [
    {
      "type": "time_range",
      "start": "20:00",
      "end": "08:00"
    }
  ],
  "actions": [
    {
      "deviceId": "DEVICE#uuid",
      "action": "turn_off"
    },
    {
      "sceneId": "SCENE#uuid",
      "action": "activate"
    }
  ],
  "lastTriggered": "2024-01-15T22:00:00Z",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**Indexes**:
- GSI1: `homeId` (Partition Key), `isEnabled` (Sort Key)

---

### 9. Hub Devices Table

**Table Name**: `veahome-hubs`

```json
{
  "hubId": "HUB#uuid",            // Partition Key
  "homeId": "HOME#uuid",
  "serialNumber": "VH-HUB-12345",
  "firmwareVersion": "2.3.1",
  "isOnline": true,
  "ipAddress": "192.168.1.100",
  "macAddress": "00:1B:44:11:3A:B7",
  "protocols": ["zigbee", "zwave", "ir", "rf", "wifi"],
  "lastSeen": "2024-01-15T12:35:00Z",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

---

## API Structure (AppSync GraphQL)

### GraphQL Schema

```graphql
# User Types
type User {
  userId: ID!
  email: String!
  name: String!
  phone: String
  plan: String!
  homeId: ID
  home: Home
  createdAt: AWSDateTime!
}

# Home Types
type Home {
  homeId: ID!
  userId: ID!
  name: String!
  address: Address
  hubId: ID
  totalRooms: Int!
  totalDevices: Int!
  rooms: [Room!]!
  createdAt: AWSDateTime!
}

type Address {
  street: String
  city: String
  state: String
  zipCode: String
  country: String
}

# Room Types
type Room {
  roomId: ID!
  homeId: ID!
  name: String!
  type: String!
  temperature: Float
  humidity: Float
  airQuality: Int
  scene: String
  totalDevices: Int!
  totalLights: Int!
  powerConsumption: Float
  devices: [Device!]!
  sensors: [Sensor!]!
}

# Device Types
type Device {
  deviceId: ID!
  roomId: ID!
  homeId: ID!
  name: String!
  type: DeviceType!
  category: DeviceCategory!
  brand: String
  model: String
  isActive: Boolean!
  isOnline: Boolean!
  state: DeviceState!
  capabilities: [String!]!
  protocol: String
  lastSeen: AWSDateTime
}

enum DeviceType {
  LIGHT
  THERMOSTAT
  TV
  AC
  BLIND
  SHUTTER
  LOCK
  CAMERA
  SPEAKER
  SENSOR
}

enum DeviceCategory {
  IR
  RF
  RELAY
  SENSOR
}

type DeviceState {
  power: String
  brightness: Int
  temperature: Float
  mode: String
  position: Int
  locked: Boolean
}

# Energy Types
type EnergyData {
  energyId: ID!
  timestamp: AWSDateTime!
  homeId: ID!
  roomId: ID
  deviceId: ID
  energyKwh: Float!
  voltage: Float
  current: Float
  powerFactor: Float
  categories: EnergyCategories
  cost: Float
  period: String!
}

type EnergyCategories {
  lighting: Float
  climate: Float
  media: Float
  security: Float
}

# Sensor Types
type Sensor {
  sensorId: ID!
  roomId: ID!
  homeId: ID!
  type: SensorType!
  reading: SensorReading!
  isOnline: Boolean!
  batteryLevel: Int
  lastReading: AWSDateTime
}

enum SensorType {
  AIR_QUALITY
  RAIN
  MOTION
  DOOR_WINDOW
  SMOKE
}

type SensorReading {
  co2: Int
  voc: Int
  pm25: Float
  pm10: Float
  airQualityIndex: Int
  raining: Boolean
  motion: Boolean
  open: Boolean
  smoke: Boolean
}

# Scene Types
type Scene {
  sceneId: ID!
  homeId: ID!
  name: String!
  icon: String
  isActive: Boolean!
  schedule: SceneSchedule
  actions: [SceneAction!]!
}

type SceneSchedule {
  enabled: Boolean!
  time: String
  days: [String!]
}

type SceneAction {
  deviceId: ID!
  action: String!
  value: String
}

# Queries
type Query {
  # User
  getUser(userId: ID!): User
  getCurrentUser: User
  
  # Home
  getHome(homeId: ID!): Home
  getUserHome(userId: ID!): Home
  
  # Rooms
  getRoom(roomId: ID!): Room
  listRoomsByHome(homeId: ID!): [Room!]!
  
  # Devices
  getDevice(deviceId: ID!): Device
  listDevicesByRoom(roomId: ID!): [Device!]!
  listDevicesByHome(homeId: ID!): [Device!]!
  
  # Energy
  getEnergyData(homeId: ID!, startTime: AWSDateTime!, endTime: AWSDateTime!): [EnergyData!]!
  getRoomEnergy(roomId: ID!, startTime: AWSDateTime!, endTime: AWSDateTime!): [EnergyData!]!
  
  # Sensors
  getSensor(sensorId: ID!): Sensor
  listSensorsByRoom(roomId: ID!): [Sensor!]!
  
  # Scenes
  getScene(sceneId: ID!): Scene
  listScenesByHome(homeId: ID!): [Scene!]!
}

# Mutations
type Mutation {
  # User
  createUser(input: CreateUserInput!): User!
  updateUser(userId: ID!, input: UpdateUserInput!): User!
  
  # Home
  createHome(input: CreateHomeInput!): Home!
  updateHome(homeId: ID!, input: UpdateHomeInput!): Home!
  
  # Room
  createRoom(input: CreateRoomInput!): Room!
  updateRoom(roomId: ID!, input: UpdateRoomInput!): Room!
  
  # Device Control
  controlDevice(deviceId: ID!, action: String!, value: String): Device!
  toggleDevice(deviceId: ID!): Device!
  setDeviceBrightness(deviceId: ID!, brightness: Int!): Device!
  setDeviceTemperature(deviceId: ID!, temperature: Float!): Device!
  
  # Scene
  createScene(input: CreateSceneInput!): Scene!
  activateScene(sceneId: ID!): Scene!
  deactivateScene(sceneId: ID!): Scene!
  
  # Automation
  createAutomation(input: CreateAutomationInput!): Automation!
  updateAutomation(automationId: ID!, input: UpdateAutomationInput!): Automation!
}

# Subscriptions (Real-time updates)
type Subscription {
  onDeviceStateChanged(homeId: ID!): Device
    @aws_subscribe(mutations: ["controlDevice", "toggleDevice"])
  
  onSensorReading(roomId: ID!): Sensor
    @aws_subscribe(mutations: ["updateSensor"])
  
  onEnergyUpdate(homeId: ID!): EnergyData
    @aws_subscribe(mutations: ["addEnergyData"])
}

# Input Types
input CreateUserInput {
  email: String!
  name: String!
  phone: String
  plan: String!
}

input UpdateUserInput {
  name: String
  phone: String
  plan: String
}

input CreateHomeInput {
  userId: ID!
  name: String!
  address: AddressInput
}

input AddressInput {
  street: String
  city: String
  state: String
  zipCode: String
  country: String
}

input UpdateHomeInput {
  name: String
  address: AddressInput
}

input CreateRoomInput {
  homeId: ID!
  name: String!
  type: String!
}

input UpdateRoomInput {
  name: String
  scene: String
}

input CreateSceneInput {
  homeId: ID!
  name: String!
  icon: String
  schedule: SceneScheduleInput
  actions: [SceneActionInput!]!
}

input SceneScheduleInput {
  enabled: Boolean!
  time: String
  days: [String!]
}

input SceneActionInput {
  deviceId: ID!
  action: String!
  value: String
}

input CreateAutomationInput {
  homeId: ID!
  name: String!
  triggers: [TriggerInput!]!
  actions: [ActionInput!]!
}

input TriggerInput {
  type: String!
  value: String
  sensorId: ID
  condition: String
}

input ActionInput {
  deviceId: ID
  sceneId: ID
  action: String!
}

input UpdateAutomationInput {
  name: String
  isEnabled: Boolean
  triggers: [TriggerInput!]
  actions: [ActionInput!]
}
```

---

## Lambda Functions

### 1. Device Control Function

**Function Name**: `veahome-device-control`

**Purpose**: Control devices via AWS IoT Core

```python
import json
import boto3
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
iot_client = boto3.client('iot-data')

devices_table = dynamodb.Table(os.environ['DEVICES_TABLE'])

def lambda_handler(event, context):
    """
    Control a device (turn on/off, adjust brightness, temperature, etc.)
    """
    device_id = event['arguments']['deviceId']
    action = event['arguments']['action']
    value = event['arguments'].get('value')
    
    # Get device from DynamoDB
    response = devices_table.get_item(Key={'deviceId': device_id})
    device = response.get('Item')
    
    if not device:
        raise Exception('Device not found')
    
    # Update device state based on action
    state = device.get('state', {})
    
    if action == 'toggle':
        state['power'] = 'off' if state.get('power') == 'on' else 'on'
    elif action == 'set_brightness':
        state['brightness'] = int(value)
    elif action == 'set_temperature':
        state['temperature'] = float(value)
    elif action == 'set_position':
        state['position'] = int(value)
    elif action == 'lock':
        state['locked'] = True
    elif action == 'unlock':
        state['locked'] = False
    
    # Send command to IoT device via hub
    iot_message = {
        'deviceId': device_id,
        'action': action,
        'value': value,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # Publish to IoT topic
    hub_id = device['homeId']  # You'll need to fetch hub_id from home
    topic = f'veahome/{hub_id}/commands'
    
    iot_client.publish(
        topic=topic,
        qos=1,
        payload=json.dumps(iot_message)
    )
    
    # Update device in DynamoDB
    devices_table.update_item(
        Key={'deviceId': device_id},
        UpdateExpression='SET #state = :state, updatedAt = :updated',
        ExpressionAttributeNames={'#state': 'state'},
        ExpressionAttributeValues={
            ':state': state,
            ':updated': datetime.utcnow().isoformat()
        }
    )
    
    device['state'] = state
    device['updatedAt'] = datetime.utcnow().isoformat()
    
    return device
```

---

### 2. Energy Monitoring Function

**Function Name**: `veahome-energy-monitor`

**Purpose**: Collect and store energy data from devices

```python
import json
import boto3
import os
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
energy_table = dynamodb.Table(os.environ['ENERGY_TABLE'])

def lambda_handler(event, context):
    """
    Process energy readings from hub and store in DynamoDB
    """
    # Event from IoT Core
    home_id = event['homeId']
    room_id = event.get('roomId')
    device_id = event.get('deviceId')
    
    energy_data = {
        'energyId': f"ENERGY#{datetime.utcnow().timestamp()}",
        'timestamp': datetime.utcnow().isoformat(),
        'homeId': home_id,
        'energyKwh': Decimal(str(event['energyKwh'])),
        'voltage': Decimal(str(event.get('voltage', 0))),
        'current': Decimal(str(event.get('current', 0))),
        'powerFactor': Decimal(str(event.get('powerFactor', 1.0))),
        'period': 'hourly'
    }
    
    if room_id:
        energy_data['roomId'] = room_id
    if device_id:
        energy_data['deviceId'] = device_id
    
    if 'categories' in event:
        energy_data['categories'] = {
            k: Decimal(str(v)) for k, v in event['categories'].items()
        }
    
    # Calculate cost (example: $0.12 per kWh)
    cost_per_kwh = 0.12
    energy_data['cost'] = Decimal(str(float(energy_data['energyKwh']) * cost_per_kwh))
    
    # Store in DynamoDB
    energy_table.put_item(Item=energy_data)
    
    return {
        'statusCode': 200,
        'body': json.dumps('Energy data stored successfully')
    }
```

---

### 3. Sensor Data Processing

**Function Name**: `veahome-sensor-processor`

```python
import json
import boto3
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
sensors_table = dynamodb.Table(os.environ['SENSORS_TABLE'])
rooms_table = dynamodb.Table(os.environ['ROOMS_TABLE'])

def lambda_handler(event, context):
    """
    Process sensor readings and update room conditions
    """
    sensor_id = event['sensorId']
    reading = event['reading']
    
    # Update sensor
    sensors_table.update_item(
        Key={'sensorId': sensor_id},
        UpdateExpression='SET reading = :reading, lastReading = :time',
        ExpressionAttributeValues={
            ':reading': reading,
            ':time': datetime.utcnow().isoformat()
        }
    )
    
    # Get sensor to find room
    sensor = sensors_table.get_item(Key={'sensorId': sensor_id})['Item']
    room_id = sensor['roomId']
    
    # Update room conditions if it's an environmental sensor
    if sensor['type'] == 'air_quality':
        rooms_table.update_item(
            Key={'roomId': room_id},
            UpdateExpression='SET airQuality = :aq, updatedAt = :updated',
            ExpressionAttributeValues={
                ':aq': reading.get('airQualityIndex', 0),
                ':updated': datetime.utcnow().isoformat()
            }
        )
    
    return {
        'statusCode': 200,
        'sensorId': sensor_id,
        'reading': reading
    }
```

---

### 4. Scene Activation

**Function Name**: `veahome-scene-activator`

```python
import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
scenes_table = dynamodb.Table(os.environ['SCENES_TABLE'])
lambda_client = boto3.client('lambda')

def lambda_handler(event, context):
    """
    Activate a scene by triggering all its actions
    """
    scene_id = event['arguments']['sceneId']
    
    # Get scene
    scene = scenes_table.get_item(Key={'sceneId': scene_id})['Item']
    
    # Execute each action
    for action in scene['actions']:
        # Invoke device control lambda
        lambda_client.invoke(
            FunctionName='veahome-device-control',
            InvocationType='Event',
            Payload=json.dumps({
                'arguments': {
                    'deviceId': action['deviceId'],
                    'action': action['action'],
                    'value': action.get('value')
                }
            })
        )
    
    # Update scene status
    scenes_table.update_item(
        Key={'sceneId': scene_id},
        UpdateExpression='SET isActive = :active',
        ExpressionAttributeValues={':active': True}
    )
    
    scene['isActive'] = True
    return scene
```

---

## AWS IoT Core Setup

### IoT Thing Type: Hub Device

```json
{
  "thingTypeName": "VeaHomeHub",
  "thingTypeProperties": {
    "thingTypeDescription": "VeaHome Smart Home Hub",
    "searchableAttributes": [
      "serialNumber",
      "firmwareVersion",
      "homeId"
    ]
  }
}
```

### IoT Topic Structure

```
veahome/{hubId}/commands       → Commands from cloud to hub
veahome/{hubId}/status         → Hub status updates
veahome/{hubId}/devices        → Device state updates
veahome/{hubId}/sensors        → Sensor readings
veahome/{hubId}/energy         → Energy consumption data
```

### IoT Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iot:Connect"
      ],
      "Resource": "arn:aws:iot:REGION:ACCOUNT_ID:client/${iot:Connection.Thing.ThingName}"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iot:Publish",
        "iot:Receive"
      ],
      "Resource": [
        "arn:aws:iot:REGION:ACCOUNT_ID:topic/veahome/${iot:Connection.Thing.ThingName}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "iot:Subscribe"
      ],
      "Resource": [
        "arn:aws:iot:REGION:ACCOUNT_ID:topicfilter/veahome/${iot:Connection.Thing.ThingName}/*"
      ]
    }
  ]
}
```

### IoT Rules

**Rule 1: Process Energy Data**
```sql
SELECT * FROM 'veahome/+/energy'
```
→ Triggers `veahome-energy-monitor` Lambda

**Rule 2: Process Sensor Data**
```sql
SELECT * FROM 'veahome/+/sensors'
```
→ Triggers `veahome-sensor-processor` Lambda

---

## Authentication (Cognito)

### User Pool Configuration

```json
{
  "UserPoolName": "veahome-users",
  "Policies": {
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false
    }
  },
  "AutoVerifiedAttributes": ["email"],
  "UsernameAttributes": ["email"],
  "MfaConfiguration": "OPTIONAL",
  "Schema": [
    {
      "Name": "email",
      "AttributeDataType": "String",
      "Required": true,
      "Mutable": true
    },
    {
      "Name": "name",
      "AttributeDataType": "String",
      "Required": true,
      "Mutable": true
    },
    {
      "Name": "phone_number",
      "AttributeDataType": "String",
      "Required": false,
      "Mutable": true
    }
  ]
}
```

---

## Deployment Instructions

### Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI configured
3. Node.js 18+ installed
4. AWS CDK or SAM CLI installed

### Step 1: Create DynamoDB Tables

```bash
aws dynamodb create-table \
    --table-name veahome-users \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=email,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=EmailIndex,KeySchema=[{AttributeName=email,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
    --billing-mode PAY_PER_REQUEST

# Repeat for other tables...
```

### Step 2: Create Cognito User Pool

```bash
aws cognito-idp create-user-pool \
    --pool-name veahome-users \
    --auto-verified-attributes email \
    --username-attributes email \
    --policies PasswordPolicy={MinimumLength=8,RequireUppercase=true}
```

### Step 3: Deploy Lambda Functions

Package and upload each Lambda function:

```bash
cd lambda/device-control
zip -r function.zip .
aws lambda create-function \
    --function-name veahome-device-control \
    --runtime python3.11 \
    --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
    --handler lambda_function.lambda_handler \
    --zip-file fileb://function.zip \
    --environment Variables={DEVICES_TABLE=veahome-devices}
```

### Step 4: Create AppSync API

```bash
aws appsync create-graphql-api \
    --name VeaHomeAPI \
    --authentication-type AMAZON_COGNITO_USER_POOLS \
    --user-pool-config awsRegion=us-east-1,userPoolId=USER_POOL_ID
```

### Step 5: Set up IoT Core

```bash
# Create thing type
aws iot create-thing-type \
    --thing-type-name VeaHomeHub

# Create IoT policy
aws iot create-policy \
    --policy-name VeaHomeHubPolicy \
    --policy-document file://iot-policy.json
```

---

## Environment Variables

### For Mobile App

```env
AWS_REGION=us-east-1
AWS_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
AWS_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXX
AWS_APPSYNC_ENDPOINT=https://XXXXXXXXXX.appsync-api.us-east-1.amazonaws.com/graphql
AWS_APPSYNC_REGION=us-east-1
AWS_APPSYNC_AUTHENTICATION_TYPE=AMAZON_COGNITO_USER_POOLS
```

### For Lambda Functions

```env
USERS_TABLE=veahome-users
HOMES_TABLE=veahome-homes
ROOMS_TABLE=veahome-rooms
DEVICES_TABLE=veahome-devices
ENERGY_TABLE=veahome-energy
SENSORS_TABLE=veahome-sensors
SCENES_TABLE=veahome-scenes
AUTOMATIONS_TABLE=veahome-automations
HUBS_TABLE=veahome-hubs
AWS_REGION=us-east-1
IOT_ENDPOINT=XXXXXXXXXX-ats.iot.us-east-1.amazonaws.com
```

---

## Cost Estimation

### Monthly Cost Breakdown (Estimated)

| Service | Usage | Cost |
|---------|-------|------|
| Cognito | 1,000 MAU | $0 (Free tier) |
| DynamoDB | 1GB storage, 1M reads, 500K writes | $5-10 |
| AppSync | 1M queries/month | $5 |
| Lambda | 1M invocations | $1 |
| IoT Core | 100 devices, 1M messages | $5-10 |
| CloudWatch | Standard logging | $2 |
| **Total** | | **$18-28/month** |

For 100 homes with 38 devices each, cost scales to approximately **$150-300/month**.

---

## Next Steps

1. **Deploy Infrastructure**: Use AWS CDK or Terraform for infrastructure as code
2. **Connect Mobile App**: Integrate AWS Amplify in React Native app
3. **Test Hub Communication**: Set up test hub with MQTT client
4. **Implement Real Devices**: Connect actual IR/RF/Relay controllers
5. **Add Monitoring**: Set up CloudWatch dashboards
6. **Security Audit**: Review IAM policies and encryption
7. **Load Testing**: Test with multiple concurrent users

---

## Support

For AWS deployment support:
- AWS Documentation: https://docs.aws.amazon.com/
- AWS Support: Contact your AWS account manager
- Community: AWS re:Post forums

---

*This architecture is designed to be production-ready and scalable. Adjust based on your specific requirements and budget.*
