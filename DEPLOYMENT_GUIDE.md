# VeaHome Complete Deployment Guide

This guide walks you through deploying the complete VeaHome smart home system, from mobile app to AWS backend infrastructure.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Mobile App Deployment](#mobile-app-deployment)
4. [AWS Backend Deployment](#aws-backend-deployment)
5. [Hub Device Setup](#hub-device-setup)
6. [Testing & Validation](#testing--validation)
7. [Production Checklist](#production-checklist)

---

## Overview

The VeaHome system consists of three main components:

1. **Mobile App** (React Native/Expo) - User interface
2. **AWS Backend** - Cloud infrastructure (Cognito, AppSync, Lambda, DynamoDB, IoT Core)
3. **Hub Device** - Physical device that communicates with smart home devices

**Architecture Flow**:
```
Mobile App ←→ AWS Backend ←→ Hub Device ←→ Smart Home Devices
```

---

## Prerequisites

### Required Accounts & Tools

- [ ] AWS Account with admin access
- [ ] Apple Developer Account (for iOS deployment)
- [ ] Google Play Console Account (for Android deployment)
- [ ] Expo Account (free)
- [ ] Node.js 18+ installed
- [ ] AWS CLI configured
- [ ] Git installed

### Required Skills

- Basic AWS knowledge
- Command line proficiency
- Understanding of mobile app deployment
- Basic Python/JavaScript knowledge

---

## Mobile App Deployment

### Phase 1: Local Development Setup

1. **Clone and Install Dependencies**

```bash
cd veahome-mobile
npm install
```

2. **Configure Environment Variables**

Create `.env` file:
```env
AWS_REGION=us-east-1
AWS_COGNITO_USER_POOL_ID=(will be filled after AWS setup)
AWS_COGNITO_CLIENT_ID=(will be filled after AWS setup)
AWS_APPSYNC_ENDPOINT=(will be filled after AWS setup)
```

3. **Test Locally**

```bash
npm start
```

Test on:
- iOS Simulator (Mac only)
- Android Emulator
- Physical device via Expo Go

### Phase 2: Build for App Stores

#### iOS Deployment

1. **Configure app.json**

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.veahome",
      "buildNumber": "1.0.0"
    }
  }
}
```

2. **Build**

```bash
eas build --platform ios
```

3. **Submit to App Store**

```bash
eas submit --platform ios
```

#### Android Deployment

1. **Configure app.json**

```json
{
  "expo": {
    "android": {
      "package": "com.yourcompany.veahome",
      "versionCode": 1
    }
  }
}
```

2. **Build**

```bash
eas build --platform android
```

3. **Submit to Play Store**

```bash
eas submit --platform android
```

---

## AWS Backend Deployment

### Phase 1: Core Infrastructure

#### Step 1: Create DynamoDB Tables

```bash
# Users Table
aws dynamodb create-table \
    --table-name veahome-users \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=email,AttributeType=S \
    --key-schema AttributeName=userId,KeyType=HASH \
    --global-secondary-indexes \
        '[{"IndexName":"EmailIndex","KeySchema":[{"AttributeName":"email","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}]' \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

# Homes Table
aws dynamodb create-table \
    --table-name veahome-homes \
    --attribute-definitions \
        AttributeName=homeId,AttributeType=S \
        AttributeName=hubId,AttributeType=S \
    --key-schema AttributeName=homeId,KeyType=HASH \
    --global-secondary-indexes \
        '[{"IndexName":"HubIndex","KeySchema":[{"AttributeName":"hubId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}]' \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

# Rooms Table
aws dynamodb create-table \
    --table-name veahome-rooms \
    --attribute-definitions \
        AttributeName=roomId,AttributeType=S \
        AttributeName=homeId,AttributeType=S \
    --key-schema AttributeName=roomId,KeyType=HASH \
    --global-secondary-indexes \
        '[{"IndexName":"HomeIndex","KeySchema":[{"AttributeName":"homeId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}]' \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

# Devices Table
aws dynamodb create-table \
    --table-name veahome-devices \
    --attribute-definitions \
        AttributeName=deviceId,AttributeType=S \
        AttributeName=roomId,AttributeType=S \
        AttributeName=homeId,AttributeType=S \
    --key-schema AttributeName=deviceId,KeyType=HASH \
    --global-secondary-indexes \
        '[{"IndexName":"RoomIndex","KeySchema":[{"AttributeName":"roomId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}},{"IndexName":"HomeIndex","KeySchema":[{"AttributeName":"homeId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}]' \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

# Energy Table
aws dynamodb create-table \
    --table-name veahome-energy \
    --attribute-definitions \
        AttributeName=energyId,AttributeType=S \
        AttributeName=timestamp,AttributeType=S \
        AttributeName=homeId,AttributeType=S \
    --key-schema AttributeName=energyId,KeyType=HASH AttributeName=timestamp,KeyType=RANGE \
    --global-secondary-indexes \
        '[{"IndexName":"HomeTimeIndex","KeySchema":[{"AttributeName":"homeId","KeyType":"HASH"},{"AttributeName":"timestamp","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}]' \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

# Sensors Table
aws dynamodb create-table \
    --table-name veahome-sensors \
    --attribute-definitions \
        AttributeName=sensorId,AttributeType=S \
        AttributeName=roomId,AttributeType=S \
    --key-schema AttributeName=sensorId,KeyType=HASH \
    --global-secondary-indexes \
        '[{"IndexName":"RoomIndex","KeySchema":[{"AttributeName":"roomId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}]' \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

# Scenes Table
aws dynamodb create-table \
    --table-name veahome-scenes \
    --attribute-definitions \
        AttributeName=sceneId,AttributeType=S \
        AttributeName=homeId,AttributeType=S \
    --key-schema AttributeName=sceneId,KeyType=HASH \
    --global-secondary-indexes \
        '[{"IndexName":"HomeIndex","KeySchema":[{"AttributeName":"homeId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}]' \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

# Hubs Table
aws dynamodb create-table \
    --table-name veahome-hubs \
    --attribute-definitions \
        AttributeName=hubId,AttributeType=S \
    --key-schema AttributeName=hubId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

#### Step 2: Create Cognito User Pool

```bash
# Create User Pool
aws cognito-idp create-user-pool \
    --pool-name veahome-users \
    --auto-verified-attributes email \
    --username-attributes email \
    --policies PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true} \
    --region us-east-1

# Note the UserPoolId from output

# Create User Pool Client
aws cognito-idp create-user-pool-client \
    --user-pool-id YOUR_USER_POOL_ID \
    --client-name veahome-mobile \
    --no-generate-secret \
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --region us-east-1

# Note the ClientId from output
```

#### Step 3: Create IAM Role for Lambda

```bash
# Create trust policy file
cat > lambda-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
    --role-name veahome-lambda-execution \
    --assume-role-policy-document file://lambda-trust-policy.json

# Attach policies
aws iam attach-role-policy \
    --role-name veahome-lambda-execution \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam attach-role-policy \
    --role-name veahome-lambda-execution \
    --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

aws iam attach-role-policy \
    --role-name veahome-lambda-execution \
    --policy-arn arn:aws:iam::aws:policy/AWSIoTFullAccess
```

#### Step 4: Deploy Lambda Functions

See `AWS_BACKEND_ARCHITECTURE.md` for complete Lambda function code.

```bash
# Package device control function
cd lambda-functions/device-control
zip -r function.zip .

# Upload to Lambda
aws lambda create-function \
    --function-name veahome-device-control \
    --runtime python3.11 \
    --role arn:aws:iam::ACCOUNT_ID:role/veahome-lambda-execution \
    --handler lambda_function.lambda_handler \
    --zip-file fileb://function.zip \
    --timeout 30 \
    --environment Variables="{DEVICES_TABLE=veahome-devices,HOMES_TABLE=veahome-homes}" \
    --region us-east-1

# Repeat for other Lambda functions:
# - veahome-energy-monitor
# - veahome-sensor-processor
# - veahome-scene-activator
```

#### Step 5: Create AppSync API

```bash
# Create AppSync API
aws appsync create-graphql-api \
    --name VeaHomeAPI \
    --authentication-type AMAZON_COGNITO_USER_POOLS \
    --user-pool-config awsRegion=us-east-1,userPoolId=YOUR_USER_POOL_ID,defaultAction=ALLOW \
    --region us-east-1

# Note the API ID from output

# Upload GraphQL schema
aws appsync start-schema-creation \
    --api-id YOUR_API_ID \
    --definition file://graphql-schema.graphql \
    --region us-east-1

# Create Lambda data source
aws appsync create-data-source \
    --api-id YOUR_API_ID \
    --name DeviceControlLambda \
    --type AWS_LAMBDA \
    --service-role-arn arn:aws:iam::ACCOUNT_ID:role/appsync-lambda-role \
    --lambda-config lambdaFunctionArn=arn:aws:lambda:us-east-1:ACCOUNT_ID:function:veahome-device-control \
    --region us-east-1

# Create resolvers (repeat for each query/mutation)
aws appsync create-resolver \
    --api-id YOUR_API_ID \
    --type-name Mutation \
    --field-name controlDevice \
    --data-source-name DeviceControlLambda \
    --request-mapping-template file://resolvers/controlDevice-request.vtl \
    --response-mapping-template file://resolvers/controlDevice-response.vtl \
    --region us-east-1
```

#### Step 6: Setup AWS IoT Core

```bash
# Create thing type
aws iot create-thing-type \
    --thing-type-name VeaHomeHub \
    --thing-type-properties thingTypeDescription="VeaHome Smart Home Hub"

# Create IoT policy
cat > iot-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["iot:Connect"],
      "Resource": "arn:aws:iot:us-east-1:ACCOUNT_ID:client/\${iot:Connection.Thing.ThingName}"
    },
    {
      "Effect": "Allow",
      "Action": ["iot:Publish", "iot:Receive"],
      "Resource": "arn:aws:iot:us-east-1:ACCOUNT_ID:topic/veahome/\${iot:Connection.Thing.ThingName}/*"
    },
    {
      "Effect": "Allow",
      "Action": ["iot:Subscribe"],
      "Resource": "arn:aws:iot:us-east-1:ACCOUNT_ID:topicfilter/veahome/\${iot:Connection.Thing.ThingName}/*"
    }
  ]
}
EOF

aws iot create-policy \
    --policy-name VeaHomeHubPolicy \
    --policy-document file://iot-policy.json

# Create IoT rule for energy data
aws iot create-topic-rule \
    --rule-name VeaHomeEnergyRule \
    --topic-rule-payload '{
      "sql": "SELECT * FROM \"veahome/+/energy\"",
      "actions": [{
        "lambda": {
          "functionArn": "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:veahome-energy-monitor"
        }
      }]
    }'

# Create IoT rule for sensor data
aws iot create-topic-rule \
    --rule-name VeaHomeSensorRule \
    --topic-rule-payload '{
      "sql": "SELECT * FROM \"veahome/+/sensors\"",
      "actions": [{
        "lambda": {
          "functionArn": "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:veahome-sensor-processor"
        }
      }]
    }'
```

---

## Hub Device Setup

### Hardware Requirements

- Raspberry Pi 4 (4GB+ recommended) OR ESP32 board
- IR transmitter/receiver module
- RF 433MHz transmitter/receiver
- Relay modules (for controlling lights/locks)
- Power supply
- Internet connection (Ethernet or WiFi)

### Software Setup (Raspberry Pi Example)

1. **Install OS**

```bash
# Flash Raspberry Pi OS Lite to SD card
# Boot and configure
sudo raspi-config
```

2. **Install Dependencies**

```bash
sudo apt-get update
sudo apt-get install -y python3-pip git
pip3 install AWSIoTPythonSDK pigpio
```

3. **Configure AWS IoT**

```bash
# Download certificates from AWS IoT Console
mkdir ~/veahome-hub/certs
cd ~/veahome-hub/certs

# Download root CA
wget https://www.amazontrust.com/repository/AmazonRootCA1.pem

# Place your device certificate and private key here
# (downloaded from AWS IoT Core when creating thing)
```

4. **Hub Application**

```python
# hub_main.py
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
import json
import time

# Configuration
HUB_ID = "your-hub-id"
IOT_ENDPOINT = "your-iot-endpoint.iot.us-east-1.amazonaws.com"
ROOT_CA = "./certs/AmazonRootCA1.pem"
CERTIFICATE = "./certs/device.crt"
PRIVATE_KEY = "./certs/device.key"

# Initialize MQTT client
mqtt_client = AWSIoTMQTTClient(HUB_ID)
mqtt_client.configureEndpoint(IOT_ENDPOINT, 8883)
mqtt_client.configureCredentials(ROOT_CA, PRIVATE_KEY, CERTIFICATE)

# Connect
mqtt_client.connect()
print(f"Hub {HUB_ID} connected to AWS IoT")

# Subscribe to commands
def command_callback(client, userdata, message):
    payload = json.loads(message.payload)
    print(f"Received command: {payload}")
    # Process device commands here
    # - Send IR codes
    # - Control RF devices
    # - Switch relays

mqtt_client.subscribe(f"veahome/{HUB_ID}/commands", 1, command_callback)

# Publish status
while True:
    status = {
        "hubId": HUB_ID,
        "online": True,
        "timestamp": time.time()
    }
    mqtt_client.publish(f"veahome/{HUB_ID}/status", json.dumps(status), 1)
    time.sleep(60)
```

5. **Auto-start on Boot**

```bash
# Create systemd service
sudo nano /etc/systemd/system/veahome-hub.service

[Unit]
Description=VeaHome Hub Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/veahome-hub
ExecStart=/usr/bin/python3 hub_main.py
Restart=always

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable veahome-hub
sudo systemctl start veahome-hub
```

---

## Testing & Validation

### Backend Testing

1. **Test DynamoDB Tables**

```bash
# List tables
aws dynamodb list-tables --region us-east-1

# Test write
aws dynamodb put-item \
    --table-name veahome-users \
    --item '{"userId":{"S":"TEST-USER-1"},"email":{"S":"test@example.com"},"name":{"S":"Test User"}}' \
    --region us-east-1

# Test read
aws dynamodb get-item \
    --table-name veahome-users \
    --key '{"userId":{"S":"TEST-USER-1"}}' \
    --region us-east-1
```

2. **Test Lambda Functions**

```bash
# Invoke device control
aws lambda invoke \
    --function-name veahome-device-control \
    --payload '{"arguments":{"deviceId":"DEVICE-1","action":"toggle"}}' \
    response.json
cat response.json
```

3. **Test AppSync API**

Use AWS AppSync Console or GraphQL client to test queries/mutations.

4. **Test IoT Connection**

```bash
# Subscribe to topic
aws iot-data subscribe \
    --topic "veahome/+/status" \
    --region us-east-1
```

### Mobile App Testing

1. **Update mobile app with AWS credentials**
2. **Test authentication flow**
3. **Test device control**
4. **Verify real-time updates**
5. **Check energy monitoring**

---

## Production Checklist

### Security

- [ ] Enable MFA on Cognito
- [ ] Implement API rate limiting
- [ ] Enable CloudWatch logging
- [ ] Set up DynamoDB backups
- [ ] Configure VPC for Lambda functions
- [ ] Enable encryption at rest
- [ ] Set up WAF rules for AppSync

### Monitoring

- [ ] CloudWatch dashboards created
- [ ] Alarms set for errors
- [ ] Cost monitoring enabled
- [ ] Performance metrics tracked

### Documentation

- [ ] API documentation published
- [ ] User manual created
- [ ] Admin guide written
- [ ] Troubleshooting guide available

### Testing

- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Mobile app tested on multiple devices
- [ ] Hub tested with all device types
- [ ] Failover scenarios tested

---

## Cost Optimization Tips

1. Use DynamoDB on-demand billing for variable workloads
2. Set CloudWatch log retention to 7 days
3. Use Lambda reserved concurrency for predictable loads
4. Enable S3 lifecycle policies for old data
5. Use CloudFront for static assets
6. Implement caching in AppSync

---

## Support & Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Expo Documentation**: https://docs.expo.dev/
- **React Navigation**: https://reactnavigation.org/
- **Victory Native**: https://formidable.com/open-source/victory/

---

## Troubleshooting

### Common Issues

**Issue**: Mobile app can't connect to backend
- Check AWS credentials in .env
- Verify Cognito user pool ID
- Check AppSync endpoint URL

**Issue**: Hub not connecting to IoT
- Verify certificates are correct
- Check IoT endpoint URL
- Verify IoT policy permissions

**Issue**: Devices not responding
- Check hub connectivity
- Verify device protocols match
- Check Lambda function logs

---

*For detailed technical specifications, see `AWS_BACKEND_ARCHITECTURE.md`*
