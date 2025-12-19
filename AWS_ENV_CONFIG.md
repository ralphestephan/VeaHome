# AWS Environment Variables Configuration

To fix the remaining issues, you need to configure these environment variables in your AWS Elastic Beanstalk environment:

## Required Environment Variables

### 1. InfluxDB Configuration (for thresholds)
```
INFLUX_V1_URL=http://your-influxdb-server:8086
INFLUX_V1_DB=veahome
```

### 2. MQTT Configuration (for scene buzzer control)
```
MQTT_URL=mqtt://your-mqtt-broker:1883
MQTT_USERNAME=your-username (optional)
MQTT_PASSWORD=your-password (optional)
```

## How to Set Environment Variables in AWS Elastic Beanstalk

1. Go to AWS Elastic Beanstalk Console
2. Select your application
3. Click on "Configuration" in the left sidebar
4. Under "Software" category, click "Edit"
5. Scroll down to "Environment properties"
6. Add each variable with its value
7. Click "Apply"

## What These Fix

- **INFLUX_V1_URL & INFLUX_V1_DB**: Allows backend to query actual thresholds from InfluxDB instead of always returning defaults
- **MQTT_URL**: Allows backend to publish buzzer commands when scenes are activated

## Verification

After setting these variables and redeploying:

### Check Thresholds Work:
1. Open AWS CloudWatch Logs
2. Look for: `[InfluxDB] Found thresholds for device X:`
3. Should show actual values from InfluxDB, not defaults

### Check Scene Buzzer Works:
1. Activate a scene with buzzer control
2. Check CloudWatch logs for: `[mqtt] Successfully published to vealive/smartmonitor/1/command/buzzer`
3. If you see `[mqtt] Client not ready`, MQTT_URL is not configured

## Your InfluxDB Details

Based on your screenshot, you have:
- Measurement: `smartmonitor_thresholds`
- Columns: `dustHigh`, `humMax`, `humMin`, `mq2High`, `tempHigh`, `tempMax`, `tempMin`

The backend query is already configured to use these column names.
