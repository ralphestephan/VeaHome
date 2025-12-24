// -------------------------------------------------------------
// Vealive360 SmartMonitor v4 - MESH EDITION
// ESP32 Device with Offline-First Architecture
//
// FEATURES:
// - Works offline from boot (no internet required)
// - Auto-connects to "veahub" AP for mesh networking
// - Falls back to home WiFi if available
// - BLE provisioning without blocking UI
// - Local automation support
// - Bluetooth mesh communication
// - Always shows live sensor data
//
// NETWORK PRIORITY:
// 1. Try saved home WiFi (if configured)
// 2. Fall back to "veahub" mesh AP (password: vealive360)
// 3. Show BLE pairing in background (non-blocking)
// 4. Device fully functional offline
//
// MQTT: Only when internet available
// BLE Mesh: Always available for local control
// -------------------------------------------------------------

#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <DHT.h>
#include <SPI.h>
#include <TFT_eSPI.h>
#include "esp_wifi.h"
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// -------------------------------------------------------------
// Pins
// -------------------------------------------------------------
#define DHTPIN               33
#define DHTTYPE              DHT22
#define MQ2PIN               32
#define DUSTPIN              34
#define DUSTLEDPIN           2

#define RED_LED_PIN          12
#define GREEN_LED_PIN        13
#define BLUE_LED_PIN         14

#define BUZZER_PIN           27
#define RESET_BUTTON_PIN     17
#define BUZZER_BUTTON_PIN    16

// -------------------------------------------------------------
// Device / Network Configuration
// -------------------------------------------------------------
static const int   DEVICE_ID = 1;
static const char* MQTT_HOST = "63.34.243.171";
static const int   MQTT_PORT = 1883;

// Mesh Network Configuration
static const char* MESH_SSID = "veahub";
static const char* MESH_PASSWORD = "vealive360";
static const char* MESH_LOCAL_BROKER = "192.168.10.1";  // VeaHub local MQTT

// BLE UUIDs
#define BLE_SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define BLE_WIFI_LIST_CHAR_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define BLE_WIFI_CRED_CHAR_UUID "cf7e8a3d-c4c0-4ff1-8b42-bc5e0e3f4d8f"
#define BLE_DEVICE_INFO_CHAR_UUID "1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e"
#define BLE_CONTROL_CHAR_UUID   "2c45e8f6-9a3d-4e1b-b7c4-8f9d3e2a1b5c"  // Local control

// MQTT Topics
String topicTelemetry;
String topicStatus;
String topicThresholds;
String topicCmdBuzzer;
String topicCmdThresholds;
String mqttClientId;

// BLE Objects
BLEServer* pServer = nullptr;
BLECharacteristic* pWifiListChar = nullptr;
BLECharacteristic* pWifiCredChar = nullptr;
BLECharacteristic* pDeviceInfoChar = nullptr;
BLECharacteristic* pControlChar = nullptr;
bool bleClientConnected = false;
bool bleAlwaysOn = true;  // BLE always available for mesh

// -------------------------------------------------------------
// Networking Objects
// -------------------------------------------------------------
WebServer   server(80);
DNSServer   dnsServer;
Preferences prefs;

WiFiUDP   ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000);

WiFiClient   mqttNet;
PubSubClient mqtt(mqttNet);

// -------------------------------------------------------------
// Sensors / Display
// -------------------------------------------------------------
TFT_eSPI tft;
DHT      dht(DHTPIN, DHTTYPE);

// -------------------------------------------------------------
// Settings
// -------------------------------------------------------------
String homeSSID, homePassword;  // User's home WiFi
bool meshMode = false;          // Connected to veahub mesh
bool internetAvailable = false; // Internet connectivity status
bool cloudConnected = false;    // MQTT cloud connection

int tempMin       = 18;
int tempMax       = 30;
int humMin        = 30;
int humMax        = 70;
int dustThreshold = 400;
int mq2Threshold  = 60;
int timezoneOffset = 7200;
bool buzzerEnabled = true;

// Local automation rules (stored in preferences)
struct AutomationRule {
  bool enabled;
  int triggerType;  // 0=temp, 1=hum, 2=dust, 3=mq2, 4=time
  int condition;    // 0=above, 1=below, 2=equals
  int value;
  int action;       // 0=buzzer on, 1=buzzer off, 2=alert
};

AutomationRule localRules[5];  // Up to 5 local rules

// -------------------------------------------------------------
// Runtime State
// -------------------------------------------------------------
bool alertActive    = false;
bool alertTemp      = false;
bool alertHum       = false;
bool alertDust      = false;
bool alertMq2       = false;

unsigned long lastWifiAttempt = 0;
unsigned long lastMqttAttempt = 0;
unsigned long lastTelemetry   = 0;
unsigned long lastThresholdPub = 0;
unsigned long lastBeepTime    = 0;
bool beepState = false;

bool forceThresholdPublish = false;
bool forceTelemetryPublish = false;

static const uint32_t TELEMETRY_INTERVAL_MS  = 2000;
static const uint32_t THRESHOLD_INTERVAL_MS  = 60000;
static const uint32_t WIFI_RETRY_INTERVAL_MS = 30000;

// -------------------------------------------------------------
// UI Constants (LANDSCAPE 320x240)
// -------------------------------------------------------------
static const int W = 320;
static const int H = 240;

static const int TOP_H   = 28;
static const int HEAD_H  = 50;
static const int FOOT_H  = 20;

static const int CARDS_Y = TOP_H + HEAD_H + 6;
static const int CARDS_H = H - FOOT_H - CARDS_Y - 6;

static const int MARGIN_X = 8;
static const int GAP_X    = 6;
static const int CARD_W   = (W - 2*MARGIN_X - 3*GAP_X) / 4;
static const int CARD_H   = CARDS_H;

// Colors
static const uint16_t COL_BG     = 0x0841;
static const uint16_t COL_CARD   = 0x1082;
static const uint16_t COL_EDGE   = 0x07FF;
static const uint16_t COL_TEXT   = 0xFFFF;
static const uint16_t COL_MUTED  = 0xC618;
static const uint16_t COL_WARN   = 0xFE60;
static const uint16_t COL_ALERT  = 0xF800;
static const uint16_t COL_OK     = 0x07E0;
static const uint16_t COL_TOPBAR = 0x0410;
static const uint16_t COL_MESH   = 0x051F;  // Blue for mesh mode

// UI State
bool uiInitialized = false;
String lastTimeStr = "";
int lastTemp = INT32_MIN;
int lastHum  = INT32_MIN;
int lastDust = INT32_MIN;
int lastMq2  = INT32_MIN;
bool lastAlertState = false;
bool lastMuteState  = true;

// -------------------------------------------------------------
// Forward Declarations
// -------------------------------------------------------------
bool loadPrefs();
void savePrefs();
void connectWiFi();
void connectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int len);
void publishTelemetry(int temp, int hum, int dust, int mq2);
void publishThresholds();
void handleButtons();
void updateSensorsAndUI();
void processLocalAutomation(int temp, int hum, int dust, int mq2);
void initBLE();
void handleBLEControl(String cmd);
void drawFullUI();
void drawTopBar();
void drawHeader(const String& timeStr, bool alert);
void drawCards(int temp, int hum, int dust, int mq2);
void drawFooter();
void drawMuteIcon(bool muted);
void setLED(const String& status);
String base64Decode(const String& input);

// -------------------------------------------------------------
// BLE Callbacks
// -------------------------------------------------------------
class MyBLEServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    bleClientConnected = true;
    Serial.println("[BLE] Client connected");
  }

  void onDisconnect(BLEServer* pServer) {
    bleClientConnected = false;
    Serial.println("[BLE] Client disconnected");
    // Restart advertising (always available)
    pServer->startAdvertising();
  }
};

class WiFiCredCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String value = String(pCharacteristic->getValue().c_str());
    if (value.length() > 0) {
      Serial.println("[BLE] Received WiFi credentials");
      
      // Decode base64 if needed
      if (value.length() > 0 && value.charAt(0) != '{') {
        value = base64Decode(value);
      }
      
      StaticJsonDocument<256> doc;
      DeserializationError err = deserializeJson(doc, value);
      
      if (!err) {
        homeSSID = doc["ssid"].as<String>();
        homePassword = doc["password"].as<String>();
        
        Serial.printf("[BLE] Home SSID: %s\n", homeSSID.c_str());
        savePrefs();
        
        StaticJsonDocument<128> response;
        response["success"] = true;
        response["message"] = "Credentials saved. Reconnecting...";
        String jsonResponse;
        serializeJson(response, jsonResponse);
        pCharacteristic->setValue(jsonResponse.c_str());
        pCharacteristic->notify();
        
        // Try to reconnect with new credentials
        connectWiFi();
      }
    }
  }
};

class BLEControlCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String value = String(pCharacteristic->getValue().c_str());
    if (value.length() > 0) {
      Serial.printf("[BLE] Control command: %s\n", value.c_str());
      handleBLEControl(value);
    }
  }
};

// -------------------------------------------------------------
// BLE Control Handler
// -------------------------------------------------------------
void handleBLEControl(String cmd) {
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, cmd);
  
  if (err) {
    Serial.println("[BLE] Invalid JSON command");
    return;
  }
  
  // Handle buzzer control
  if (doc.containsKey("buzzer")) {
    String state = doc["buzzer"].as<String>();
    state.toUpperCase();
    buzzerEnabled = (state == "ON" || state == "1" || state == "TRUE");
    
    if (!buzzerEnabled) {
      digitalWrite(BUZZER_PIN, LOW);
    }
    
    prefs.putBool("buzzer", buzzerEnabled);
    Serial.printf("[BLE] Buzzer => %s\n", buzzerEnabled ? "ON" : "MUTED");
    
    // Send confirmation
    StaticJsonDocument<128> response;
    response["success"] = true;
    response["buzzer"] = buzzerEnabled;
    String jsonResponse;
    serializeJson(response, jsonResponse);
    pControlChar->setValue(jsonResponse.c_str());
    pControlChar->notify();
  }
  
  // Handle threshold updates
  if (doc.containsKey("thresholds")) {
    JsonObject thresh = doc["thresholds"];
    if (thresh.containsKey("tempMin")) tempMin = thresh["tempMin"];
    if (thresh.containsKey("tempMax")) tempMax = thresh["tempMax"];
    if (thresh.containsKey("humMin")) humMin = thresh["humMin"];
    if (thresh.containsKey("humMax")) humMax = thresh["humMax"];
    if (thresh.containsKey("dustHigh")) dustThreshold = thresh["dustHigh"];
    if (thresh.containsKey("mq2High")) mq2Threshold = thresh["mq2High"];
    
    savePrefs();
    Serial.println("[BLE] Thresholds updated via BLE");
    
    StaticJsonDocument<128> response;
    response["success"] = true;
    response["message"] = "Thresholds updated";
    String jsonResponse;
    serializeJson(response, jsonResponse);
    pControlChar->setValue(jsonResponse.c_str());
    pControlChar->notify();
  }
}

// -------------------------------------------------------------
// Helper Functions
// -------------------------------------------------------------
String base64Decode(const String& input) {
  const char* base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  
  String output = "";
  int val = 0, valb = -8;
  
  for (unsigned char c : input) {
    if (c == '=') break;
    
    const char* pos = strchr(base64Chars, c);
    if (pos == nullptr) continue;
    
    val = (val << 6) + (pos - base64Chars);
    valb += 6;
    
    if (valb >= 0) {
      output += char((val >> valb) & 0xFF);
      valb -= 8;
    }
  }
  
  return output;
}

static void drawCentered(int x, int y, const String& s, int font, uint16_t fg, uint16_t bg) {
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(fg, bg);
  tft.drawString(s, x, y, font);
}

static void drawLeft(int x, int y, const String& s, int font, uint16_t fg, uint16_t bg) {
  tft.setTextDatum(TL_DATUM);
  tft.setTextColor(fg, bg);
  tft.drawString(s, x, y, font);
}

static void drawRight(int x, int y, const String& s, int font, uint16_t fg, uint16_t bg) {
  tft.setTextDatum(TR_DATUM);
  tft.setTextColor(fg, bg);
  tft.drawString(s, x, y, font);
}

static int getSignalBars(int rssi) {
  if (rssi >= -50) return 4;
  if (rssi >= -60) return 3;
  if (rssi >= -70) return 2;
  if (rssi >= -80) return 1;
  return 0;
}

// -------------------------------------------------------------
// Setup
// -------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(100);

  esp_wifi_set_ps(WIFI_PS_NONE);
  WiFi.setTxPower(WIFI_POWER_19_5dBm);
  WiFi.setSleep(false);

  Serial.println("\n=== Vealive360 SmartMonitor v4 MESH ===");
  Serial.printf("Device ID: %d\n", DEVICE_ID);
  Serial.println("Mode: Offline-First with Mesh Support");

  // Build MQTT topics
  String devId = String(DEVICE_ID);
  topicTelemetry    = "vealive/smartmonitor/" + devId + "/telemetry";
  topicStatus       = "vealive/smartmonitor/" + devId + "/status";
  topicThresholds   = "vealive/smartmonitor/" + devId + "/thresholds";
  topicCmdBuzzer    = "vealive/smartmonitor/" + devId + "/command/buzzer";
  topicCmdThresholds= "vealive/smartmonitor/" + devId + "/command/thresholds";

  uint64_t mac = ESP.getEfuseMac();
  char macTail[9];
  snprintf(macTail, sizeof(macTail), "%08X", (uint32_t)(mac & 0xFFFFFFFF));
  mqttClientId = "SM" + devId + "_" + String(macTail);

  // Initialize TFT
  tft.init();
  tft.setRotation(1);
  tft.fillScreen(COL_BG);

  // Initialize sensors
  dht.begin();

  // Initialize IO
  pinMode(DUSTLEDPIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(BLUE_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  Serial2.end();
  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_BUTTON_PIN, INPUT_PULLUP);

  // Load preferences
  prefs.begin("monitor", false);
  loadPrefs();

  // Initialize BLE (always available)
  initBLE();

  // MQTT setup
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setKeepAlive(15);
  mqtt.setSocketTimeout(5);
  mqtt.setBufferSize(512);

  // Initialize UI immediately (offline-first)
  drawFullUI();
  Serial.println("[UI] Display initialized - device fully operational offline");

  // Attempt WiFi connection in background
  connectWiFi();
}

// -------------------------------------------------------------
// Initialize BLE (Always Available)
// -------------------------------------------------------------
void initBLE() {
  String bleName = "SmartMonitor_" + String(DEVICE_ID);
  BLEDevice::init(bleName.c_str());
  
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyBLEServerCallbacks());
  
  BLEService *pService = pServer->createService(BLE_SERVICE_UUID);
  
  // Device Info
  pDeviceInfoChar = pService->createCharacteristic(
    BLE_DEVICE_INFO_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ
  );
  StaticJsonDocument<128> deviceInfo;
  deviceInfo["deviceId"] = DEVICE_ID;
  deviceInfo["name"] = bleName;
  deviceInfo["type"] = "SmartMonitor";
  deviceInfo["version"] = "v4_mesh";
  String infoJson;
  serializeJson(deviceInfo, infoJson);
  pDeviceInfoChar->setValue(infoJson.c_str());
  
  // WiFi Networks
  pWifiListChar = pService->createCharacteristic(
    BLE_WIFI_LIST_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pWifiListChar->addDescriptor(new BLE2902());
  
  // WiFi Credentials
  pWifiCredChar = pService->createCharacteristic(
    BLE_WIFI_CRED_CHAR_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY
  );
  pWifiCredChar->addDescriptor(new BLE2902());
  pWifiCredChar->setCallbacks(new WiFiCredCallbacks());
  
  // Local Control
  pControlChar = pService->createCharacteristic(
    BLE_CONTROL_CHAR_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY
  );
  pControlChar->addDescriptor(new BLE2902());
  pControlChar->setCallbacks(new BLEControlCallbacks());
  
  pService->start();
  
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BLE_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  
  Serial.println("[BLE] Initialized - always available for local control");
}

// -------------------------------------------------------------
// WiFi Connection (Multi-tier fallback)
// -------------------------------------------------------------
void connectWiFi() {
  if (millis() - lastWifiAttempt < WIFI_RETRY_INTERVAL_MS) {
    return;
  }
  
  lastWifiAttempt = millis();
  
  WiFi.disconnect(true);
  WiFi.mode(WIFI_STA);
  
  // Priority 1: Try home WiFi
  if (homeSSID.length() > 0) {
    Serial.printf("[WiFi] Connecting to home: %s\n", homeSSID.c_str());
    WiFi.begin(homeSSID.c_str(), homePassword.c_str());
    
    unsigned long t0 = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - t0 < 10000) {
      delay(300);
      digitalWrite(BLUE_LED_PIN, !digitalRead(BLUE_LED_PIN));
    }
    digitalWrite(BLUE_LED_PIN, LOW);
    
    if (WiFi.status() == WL_CONNECTED) {
      meshMode = false;
      Serial.printf("[WiFi] Home connected! IP: %s RSSI: %d\n", 
                    WiFi.localIP().toString().c_str(), WiFi.RSSI());
      
      // Try to get time
      timeClient.setTimeOffset(timezoneOffset);
      timeClient.begin();
      for (int i = 0; i < 10 && !timeClient.update(); i++) {
        delay(200);
      }
      
      // Check internet connectivity
      internetAvailable = (WiFi.status() == WL_CONNECTED);
      
      // Connect to cloud MQTT
      connectMQTT();
      return;
    }
  }
  
  // Priority 2: Try mesh network (veahub)
  Serial.printf("[WiFi] Trying mesh network: %s\n", MESH_SSID);
  WiFi.begin(MESH_SSID, MESH_PASSWORD);
  
  unsigned long t1 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t1 < 10000) {
    delay(300);
    digitalWrite(BLUE_LED_PIN, !digitalRead(BLUE_LED_PIN));
  }
  digitalWrite(BLUE_LED_PIN, LOW);
  
  if (WiFi.status() == WL_CONNECTED) {
    meshMode = true;
    internetAvailable = false;
    Serial.printf("[WiFi] Mesh connected! IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.println("[MESH] Running in offline mesh mode");
    
    // Could connect to local mesh MQTT broker here
    // mqtt.setServer(MESH_LOCAL_BROKER, MQTT_PORT);
    // connectMQTT();
    return;
  }
  
  // No WiFi available - fully offline mode
  meshMode = false;
  internetAvailable = false;
  Serial.println("[WiFi] No network - running fully offline");
  Serial.println("[INFO] BLE available for local control");
}

// -------------------------------------------------------------
// MQTT Connection
// -------------------------------------------------------------
void connectMQTT() {
  if (mqtt.connected()) return;
  if (!internetAvailable && !meshMode) return;
  if (millis() - lastMqttAttempt < 3000) return;

  lastMqttAttempt = millis();
  
  const char* broker = meshMode ? MESH_LOCAL_BROKER : MQTT_HOST;
  Serial.printf("[MQTT] Connecting to %s:%d...\n", broker, MQTT_PORT);

  bool ok = mqtt.connect(
    mqttClientId.c_str(),
    NULL, NULL,
    topicStatus.c_str(), 1, true, "offline"
  );

  if (ok) {
    cloudConnected = true;
    Serial.println("[MQTT] Connected!");
    
    mqtt.publish(topicStatus.c_str(), "online", true);
    mqtt.subscribe(topicCmdBuzzer.c_str(), 1);
    mqtt.subscribe(topicCmdThresholds.c_str(), 1);

    forceThresholdPublish = true;
    forceTelemetryPublish = true;
  } else {
    cloudConnected = false;
    Serial.printf("[MQTT] Failed, rc=%d\n", mqtt.state());
  }
}

// -------------------------------------------------------------
// MQTT Callback
// -------------------------------------------------------------
void mqttCallback(char* topic, byte* payload, unsigned int len) {
  char msg[256];
  size_t copyLen = min((size_t)len, sizeof(msg) - 1);
  memcpy(msg, payload, copyLen);
  msg[copyLen] = '\0';

  String t = String(topic);
  Serial.printf("[MQTT] RX: %s => %s\n", topic, msg);

  if (t == topicCmdBuzzer) {
    StaticJsonDocument<128> doc;
    DeserializationError err = deserializeJson(doc, msg);
    
    if (!err && doc.containsKey("state")) {
      String state = doc["state"].as<String>();
      state.toUpperCase();
      buzzerEnabled = (state == "ON" || state == "1" || state == "TRUE");
      
      if (!buzzerEnabled) {
        digitalWrite(BUZZER_PIN, LOW);
      }
      
      prefs.putBool("buzzer", buzzerEnabled);
      forceTelemetryPublish = true;
    }
    return;
  }

  if (t == topicCmdThresholds) {
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, msg);
    
    if (err) return;

    bool changed = false;
    if (doc.containsKey("tempMin"))   { tempMin = doc["tempMin"].as<int>(); changed = true; }
    if (doc.containsKey("tempMax"))   { tempMax = doc["tempMax"].as<int>(); changed = true; }
    if (doc.containsKey("humMin"))    { humMin = doc["humMin"].as<int>(); changed = true; }
    if (doc.containsKey("humMax"))    { humMax = doc["humMax"].as<int>(); changed = true; }
    if (doc.containsKey("dustHigh"))  { dustThreshold = doc["dustHigh"].as<int>(); changed = true; }
    if (doc.containsKey("mq2High"))   { mq2Threshold = doc["mq2High"].as<int>(); changed = true; }

    if (changed) {
      savePrefs();
      forceThresholdPublish = true;
      forceTelemetryPublish = true;
    }
    return;
  }
}

// -------------------------------------------------------------
// Publish Functions
// -------------------------------------------------------------
void publishThresholds() {
  if (!mqtt.connected()) return;

  StaticJsonDocument<256> doc;
  doc["tempMin"]   = tempMin;
  doc["tempMax"]   = tempMax;
  doc["humMin"]    = humMin;
  doc["humMax"]    = humMax;
  doc["dustHigh"]  = dustThreshold;
  doc["mq2High"]   = mq2Threshold;
  doc["buzzer"]    = buzzerEnabled;

  char buf[256];
  serializeJson(doc, buf);
  mqtt.publish(topicThresholds.c_str(), buf, true);
}

void publishTelemetry(int temp, int hum, int dust, int mq2) {
  if (!mqtt.connected()) return;

  int alertFlags = 0;
  if (alertTemp) alertFlags |= 1;
  if (alertHum)  alertFlags |= 2;
  if (alertDust) alertFlags |= 4;
  if (alertMq2)  alertFlags |= 8;

  StaticJsonDocument<384> doc;
  doc["id"]         = DEVICE_ID;
  doc["temp"]       = temp;
  doc["hum"]        = hum;
  doc["dust"]       = dust;
  doc["mq2"]        = mq2;
  doc["alert"]      = alertActive ? 1 : 0;
  doc["alertFlags"] = alertFlags;
  doc["buzzer"]     = buzzerEnabled ? 1 : 0;
  doc["rssi"]       = WiFi.RSSI();
  doc["uptime"]     = (uint32_t)(millis() / 1000);
  doc["meshMode"]   = meshMode;
  doc["cloudConnected"] = cloudConnected;

  char buf[384];
  serializeJson(doc, buf);
  mqtt.publish(topicTelemetry.c_str(), buf, true);
}

// -------------------------------------------------------------
// Local Automation Processing
// -------------------------------------------------------------
void processLocalAutomation(int temp, int hum, int dust, int mq2) {
  // Example: Process local automation rules
  // This runs even when offline
  
  for (int i = 0; i < 5; i++) {
    if (!localRules[i].enabled) continue;
    
    bool triggered = false;
    
    switch (localRules[i].triggerType) {
      case 0:  // Temperature
        triggered = (localRules[i].condition == 0) ? (temp > localRules[i].value) : (temp < localRules[i].value);
        break;
      case 1:  // Humidity
        triggered = (localRules[i].condition == 0) ? (hum > localRules[i].value) : (hum < localRules[i].value);
        break;
      case 2:  // Dust
        triggered = (localRules[i].condition == 0) ? (dust > localRules[i].value) : (dust < localRules[i].value);
        break;
      case 3:  // MQ2
        triggered = (localRules[i].condition == 0) ? (mq2 > localRules[i].value) : (mq2 < localRules[i].value);
        break;
    }
    
    if (triggered) {
      switch (localRules[i].action) {
        case 0:  // Buzzer ON
          buzzerEnabled = true;
          break;
        case 1:  // Buzzer OFF
          buzzerEnabled = false;
          break;
        case 2:  // Alert
          // Could trigger other actions
          break;
      }
    }
  }
}

// -------------------------------------------------------------
// Preferences
// -------------------------------------------------------------
bool loadPrefs() {
  homeSSID       = prefs.getString("ssid", "");
  homePassword   = prefs.getString("pass", "");
  tempMin        = prefs.getInt("tempMin", 18);
  tempMax        = prefs.getInt("tempMax", 30);
  humMin         = prefs.getInt("humMin", 30);
  humMax         = prefs.getInt("humMax", 70);
  dustThreshold  = prefs.getInt("dustHigh", 400);
  mq2Threshold   = prefs.getInt("mq2High", 60);
  buzzerEnabled  = prefs.getBool("buzzer", true);
  timezoneOffset = prefs.getInt("tz", 7200);

  return true;  // Always return true - device works without saved WiFi
}

void savePrefs() {
  prefs.putString("ssid", homeSSID);
  prefs.putString("pass", homePassword);
  prefs.putInt("tempMin", tempMin);
  prefs.putInt("tempMax", tempMax);
  prefs.putInt("humMin", humMin);
  prefs.putInt("humMax", humMax);
  prefs.putInt("dustHigh", dustThreshold);
  prefs.putInt("mq2High", mq2Threshold);
  prefs.putBool("buzzer", buzzerEnabled);
  prefs.putInt("tz", timezoneOffset);
}

// -------------------------------------------------------------
// Handle Buttons
// -------------------------------------------------------------
void handleButtons() {
  static uint32_t resetStart = 0;
  static bool buzzerBtnLast = false;
  static uint32_t buzzerDebounce = 0;

  // RESET button (hold 2s)
  if (digitalRead(RESET_BUTTON_PIN) == LOW) {
    if (resetStart == 0) resetStart = millis();
    if (millis() - resetStart > 2000) {
      Serial.println("[BTN] RESET - clearing prefs");
      tft.fillScreen(COL_BG);
      tft.setTextDatum(MC_DATUM);
      tft.setTextColor(COL_TEXT);
      tft.drawString("Resetting...", W/2, H/2, 4);
      prefs.clear();
      delay(500);
      ESP.restart();
    }
  } else {
    resetStart = 0;
  }

  // BUZZER toggle button
  bool pressed = (digitalRead(BUZZER_BUTTON_PIN) == LOW);
  if (pressed != buzzerBtnLast && millis() - buzzerDebounce > 50) {
    buzzerBtnLast = pressed;
    buzzerDebounce = millis();

    if (pressed) {
      buzzerEnabled = !buzzerEnabled;
      prefs.putBool("buzzer", buzzerEnabled);
      
      if (!buzzerEnabled) {
        digitalWrite(BUZZER_PIN, LOW);
      }

      Serial.printf("[BTN] Buzzer => %s\n", buzzerEnabled ? "ON" : "MUTED");
      forceTelemetryPublish = true;
    }
  }
}

// -------------------------------------------------------------
// Update Sensors and UI
// -------------------------------------------------------------
void updateSensorsAndUI() {
  float tf = dht.readTemperature();
  float hf = dht.readHumidity();
  
  if (isnan(tf) || isnan(hf)) {
    return;
  }

  // Dust sensor
  digitalWrite(DUSTLEDPIN, LOW);
  delayMicroseconds(280);
  int dustRaw = analogRead(DUSTPIN);
  delayMicroseconds(40);
  digitalWrite(DUSTLEDPIN, HIGH);
  delayMicroseconds(9680);
  
  float dustV = dustRaw * (3.3f / 4095.0f);
  float dustF = fabs((dustV - 0.6f) * 200.0f);

  float mq2V = analogRead(MQ2PIN) * (3.3f / 4095.0f);
  float mq2F = mq2V * 1000.0f;

  int temp = (int)roundf(tf);
  int hum  = (int)roundf(hf);
  int dust = (int)roundf(dustF);
  int mq2  = (int)roundf(mq2F);

  // Check alerts
  alertTemp = (temp < tempMin || temp > tempMax);
  alertHum  = (hum < humMin || hum > humMax);
  alertDust = (dust > dustThreshold);
  alertMq2  = (mq2 > mq2Threshold);
  alertActive = alertTemp || alertHum || alertDust || alertMq2;

  // Process local automation
  processLocalAutomation(temp, hum, dust, mq2);

  // Buzzer control
  if (alertActive && buzzerEnabled) {
    if (millis() - lastBeepTime > 400) {
      beepState = !beepState;
      digitalWrite(BUZZER_PIN, beepState ? HIGH : LOW);
      lastBeepTime = millis();
    }
  } else {
    digitalWrite(BUZZER_PIN, LOW);
    beepState = false;
  }

  // LED status
  if (alertActive) {
    setLED("ALERT");
  } else if (cloudConnected) {
    setLED("OK");
  } else if (meshMode) {
    setLED("MESH");
  } else {
    setLED("OFFLINE");
  }

  if (!uiInitialized) {
    drawFullUI();
    uiInitialized = true;
  }

  // Get time string
  String timeStr = "--:--";
  if (WiFi.status() == WL_CONNECTED && internetAvailable) {
    timeClient.update();
    String formatted = timeClient.getFormattedTime();
    if (formatted.length() >= 5) {
      timeStr = formatted.substring(0, 5);
    }
  }

  drawHeader(timeStr, alertActive);
  drawCards(temp, hum, dust, mq2);
  drawFooter();

  bool muted = !buzzerEnabled;
  if (muted != lastMuteState) {
    drawMuteIcon(muted);
    lastMuteState = muted;
  }

  // MQTT publishing (only if connected)
  if (mqtt.connected()) {
    if (forceTelemetryPublish || millis() - lastTelemetry >= TELEMETRY_INTERVAL_MS) {
      publishTelemetry(temp, hum, dust, mq2);
      lastTelemetry = millis();
      forceTelemetryPublish = false;
    }

    if (forceThresholdPublish || millis() - lastThresholdPub >= THRESHOLD_INTERVAL_MS) {
      publishThresholds();
      lastThresholdPub = millis();
      forceThresholdPublish = false;
    }
  }
}

// -------------------------------------------------------------
// Loop
// -------------------------------------------------------------
void loop() {
  handleButtons();

  // WiFi management (non-blocking)
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // MQTT management (only if WiFi connected)
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqtt.connected()) {
      connectMQTT();
    }
    mqtt.loop();
  }

  // Update sensors and UI (always runs, even offline)
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate >= 500) {
    updateSensorsAndUI();
    lastUpdate = millis();
  }
}

// -------------------------------------------------------------
// UI Drawing Functions
// -------------------------------------------------------------
void drawFullUI() {
  tft.fillScreen(COL_BG);
  drawTopBar();
  
  for (int i = 0; i < 4; i++) {
    int x = MARGIN_X + i * (CARD_W + GAP_X);
    tft.fillRoundRect(x, CARDS_Y, CARD_W, CARD_H, 8, COL_CARD);
    tft.drawRoundRect(x, CARDS_Y, CARD_W, CARD_H, 8, COL_EDGE);
  }

  const char* labels[] = {"TEMP", "HUM", "DUST", "GAS"};
  const char* units[]  = {"C", "%", "ug", "ppm"};
  
  for (int i = 0; i < 4; i++) {
    int x = MARGIN_X + i * (CARD_W + GAP_X);
    drawCentered(x + CARD_W/2, CARDS_Y + CARD_H - 10, labels[i], 1, COL_MUTED, COL_CARD);
    drawRight(x + CARD_W - 4, CARDS_Y + 4, units[i], 1, COL_MUTED, COL_CARD);
  }

  tft.fillRect(0, H - FOOT_H, W, FOOT_H, COL_BG);
  tft.drawFastHLine(0, H - FOOT_H, W, COL_EDGE);

  lastTimeStr = "";
  lastTemp = lastHum = lastDust = lastMq2 = INT32_MIN;
  lastAlertState = !alertActive;
  lastMuteState = !buzzerEnabled;

  drawMuteIcon(!buzzerEnabled);
}

void drawTopBar() {
  uint16_t topBarColor = meshMode ? COL_MESH : COL_TOPBAR;
  tft.fillRect(0, 0, W, TOP_H, topBarColor);
  tft.drawFastHLine(0, TOP_H - 1, W, COL_EDGE);
  
  String modeStr = meshMode ? "MESH" : "Vealive360";
  drawLeft(8, 6, modeStr, 2, COL_TEXT, topBarColor);
  drawRight(W - 8, 6, "ID:" + String(DEVICE_ID), 2, COL_TEXT, topBarColor);
}

void drawHeader(const String& timeStr, bool alert) {
  bool timeChanged = (timeStr != lastTimeStr);
  bool alertChanged = (alert != lastAlertState);

  if (!timeChanged && !alertChanged) return;

  tft.fillRect(0, TOP_H, W, HEAD_H, COL_BG);

  // Time display
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString(timeStr, W/2, TOP_H + HEAD_H/2, 6);

  // Status pill
  int pillW = 90;
  int pillH = 20;
  int pillX = W - pillW - 10;
  int pillY = TOP_H + HEAD_H - pillH - 8;

  uint16_t pillBg;
  String statusText;
  
  if (alert) {
    pillBg = COL_ALERT;
    statusText = "ALERT";
  } else if (cloudConnected) {
    pillBg = COL_OK;
    statusText = "ONLINE";
  } else if (meshMode) {
    pillBg = COL_MESH;
    statusText = "MESH";
  } else {
    pillBg = COL_MUTED;
    statusText = "OFFLINE";
  }
  
  tft.fillRoundRect(pillX, pillY, pillW, pillH, 10, pillBg);
  drawCentered(pillX + pillW/2, pillY + pillH/2, statusText, 2, COL_TEXT, pillBg);

  // Status dot
  uint16_t dotColor = alert ? COL_ALERT : (cloudConnected ? COL_OK : (meshMode ? COL_MESH : COL_MUTED));
  tft.fillCircle(15, TOP_H + HEAD_H/2, 6, dotColor);

  lastTimeStr = timeStr;
  lastAlertState = alert;
}

void drawCards(int temp, int hum, int dust, int mq2) {
  int values[] = {temp, hum, dust, mq2};
  int* lastVals[] = {&lastTemp, &lastHum, &lastDust, &lastMq2};
  bool alerts[] = {alertTemp, alertHum, alertDust, alertMq2};

  for (int i = 0; i < 4; i++) {
    if (values[i] == *lastVals[i]) continue;

    int x = MARGIN_X + i * (CARD_W + GAP_X);
    tft.fillRect(x + 2, CARDS_Y + 16, CARD_W - 4, CARD_H - 34, COL_CARD);

    uint16_t fg = alerts[i] ? COL_WARN : COL_TEXT;
    String valStr = String(values[i]);
    int font = 4;
    if (valStr.length() >= 4) font = 2;

    drawCentered(x + CARD_W/2, CARDS_Y + CARD_H/2, valStr, font, fg, COL_CARD);
    *lastVals[i] = values[i];
  }
}

void drawFooter() {
  static String lastFooterStr = "";
  static int lastSignalBars = -1;
  
  String footerStr;
  int signalBars = 0;
  
  if (meshMode) {
    footerStr = "veahub (mesh)";
    signalBars = getSignalBars(WiFi.RSSI());
  } else if (WiFi.status() == WL_CONNECTED) {
    String shortSsid = homeSSID;
    if (shortSsid.length() > 12) {
      shortSsid = shortSsid.substring(0, 11) + "..";
    }
    footerStr = shortSsid;
    signalBars = getSignalBars(WiFi.RSSI());
  } else {
    footerStr = "Offline (BLE)";
    signalBars = -1;
  }

  if (footerStr == lastFooterStr && signalBars == lastSignalBars) return;

  tft.fillRect(0, H - FOOT_H + 1, W - 40, FOOT_H - 1, COL_BG);
  drawLeft(8, H - FOOT_H + 4, footerStr, 2, COL_MUTED, COL_BG);
  
  if (signalBars >= 0) {
    int barWidth = 3;
    int barGap = 2;
    int barX = 105;
    int barY = H - FOOT_H + 5;
    
    for (int i = 0; i < 4; i++) {
      int barHeight = 4 + i * 2;
      uint16_t barColor = (i < signalBars) ? COL_OK : COL_MUTED;
      tft.fillRect(barX + i * (barWidth + barGap), barY + (10 - barHeight), barWidth, barHeight, barColor);
    }
  }
  
  lastFooterStr = footerStr;
  lastSignalBars = signalBars;
}

void drawMuteIcon(bool muted) {
  int ix = W - 28;
  int iy = H - FOOT_H + 2;
  int iw = 24;
  int ih = FOOT_H - 4;

  tft.fillRect(ix - 2, iy - 1, iw + 4, ih + 2, COL_BG);

  if (muted) {
    uint16_t speakerCol = COL_WARN;
    uint16_t xCol = COL_ALERT;
    int centerY = iy + (ih / 2);
    
    int boxW = 4;
    int boxH = 6;
    int boxX = ix + 4;
    int boxY = centerY - (boxH / 2);
    tft.fillRect(boxX, boxY, boxW, boxH, speakerCol);
    
    int coneLeft = boxX + boxW;
    int coneRight = coneLeft + 6;
    int coneTop = centerY - 4;
    int coneBottom = centerY + 4;
    tft.fillTriangle(coneLeft, centerY, coneRight, coneTop, coneRight, coneBottom, speakerCol);
    
    int xCenterX = ix + 18;
    int xSize = 6;
    for (int offset = 0; offset < 2; offset++) {
      tft.drawLine(xCenterX - xSize/2 + offset, centerY - xSize/2, 
                   xCenterX + xSize/2 + offset, centerY + xSize/2, xCol);
      tft.drawLine(xCenterX - xSize/2 + offset, centerY + xSize/2, 
                   xCenterX + xSize/2 + offset, centerY - xSize/2, xCol);
    }
  }
}

void setLED(const String& status) {
  digitalWrite(RED_LED_PIN,   status == "ALERT");
  digitalWrite(GREEN_LED_PIN, status == "OK" || status == "MESH");
  digitalWrite(BLUE_LED_PIN,  status == "OFFLINE");
}
