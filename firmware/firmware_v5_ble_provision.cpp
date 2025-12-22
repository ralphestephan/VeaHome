// -------------------------------------------------------------
// Vealive360 SmartMonitor (ESP32) - Device ID: 1
// BLE Provisioning Version - WiFi credentials via Bluetooth
// TFT: 240x320 (ILI9341) using TFT_eSPI
//
// SETUP MODE (BLE):
//   - Device advertises as "SmartMonitor_1"
//   - App connects via BLE
//   - App writes WiFi credentials to BLE characteristic
//   - Device saves credentials and connects to WiFi
//   - BLE turns off once WiFi connected
//
// MQTT Broker: 63.34.243.171:1883
// 
// === BLE PROVISIONING ===
// Service UUID: 4fafc201-1fb5-459e-8fcc-c5c9c331914b
// Characteristic UUID: beb5483e-36e1-4688-b7f5-ea07361b26a8
//
// Write JSON to characteristic:
// {"ssid":"YourNetwork","password":"YourPassword"}
//
// Response notification:
// {"success":true,"deviceId":1} or {"success":false,"error":"..."}
// -------------------------------------------------------------

#include <WiFi.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <DHT.h>
#include <SPI.h>
#include <TFT_eSPI.h>
#include "esp_wifi.h"
#include <PubSubClient.h>
#include <ArduinoJson.h>

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
// Device / MQTT
// -------------------------------------------------------------
static const int   DEVICE_ID = 1;
static const char* MQTT_HOST = "63.34.243.171";
static const int   MQTT_PORT = 1883;

// BLE UUIDs
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// MQTT Topics
String topicTelemetry;
String topicStatus;
String topicThresholds;
String topicCmdBuzzer;
String topicCmdThresholds;
String mqttClientId;

// -------------------------------------------------------------
// BLE Objects
// -------------------------------------------------------------
BLEServer* pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool bleConnected = false;
bool bleCredentialsReceived = false;
String pendingSSID = "";
String pendingPassword = "";

// -------------------------------------------------------------
// Networking objects
// -------------------------------------------------------------
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
// Settings (stored in Preferences)
// -------------------------------------------------------------
String ssid, password;

int tempMin       = 18;
int tempMax       = 30;
int humMin        = 30;
int humMax        = 70;
int dustThreshold = 400;
int mq2Threshold  = 60;

int timezoneOffset = 10800;  // GMT+3

bool buzzerEnabled = true;

// -------------------------------------------------------------
// Runtime State
// -------------------------------------------------------------
bool setupMode = false;
bool alertActive    = false;
bool alertTemp      = false;
bool alertHum       = false;
bool alertDust      = false;
bool alertMq2       = false;

unsigned long wifiLostAt       = 0;
unsigned long lastMqttAttempt  = 0;
unsigned long lastTelemetry    = 0;
unsigned long lastThresholdPub = 0;
unsigned long lastBeepTime     = 0;
bool beepState = false;

bool forceThresholdPublish = false;
bool forceTelemetryPublish = false;

static const uint32_t TELEMETRY_INTERVAL_MS  = 2000;
static const uint32_t THRESHOLD_INTERVAL_MS  = 60000;

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
static const uint16_t COL_EDGE   = 0x07FF;  // Cyan
static const uint16_t COL_TEXT   = 0xFFFF;
static const uint16_t COL_MUTED  = 0xC618;
static const uint16_t COL_WARN   = 0xFE60;  // Orange
static const uint16_t COL_ALERT  = 0xF800;
static const uint16_t COL_OK     = 0x07E0;
static const uint16_t COL_TOPBAR = 0x0410;
static const uint16_t COL_BLUE   = 0x001F;

// UI State for partial updates
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
void startBLEProvisioning();
void stopBLE();
void showSetupModeUI();
bool loadPrefs();
void savePrefs();
void mqttCallback(char* topic, byte* payload, unsigned int len);
void connectMQTT();
void publishTelemetry(int temp, int hum, int dust, int mq2);
void publishThresholds();
void handleButtons();
void updateSensorsAndUI();
void drawFullUI();
void drawTopBar();
void drawHeader(const String& timeStr, bool alert);
void drawCards(int temp, int hum, int dust, int mq2);
void drawFooter();
void drawMuteIcon(bool muted);
void setLED(const String& status);
void connectToWiFi();

// -------------------------------------------------------------
// BLE Callbacks
// -------------------------------------------------------------
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    bleConnected = true;
    Serial.println("[BLE] Client connected");
    
    // Update display
    tft.fillRect(0, 200, W, 40, COL_BG);
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(COL_OK);
    tft.drawString("App connected!", W/2, 220, 2);
  }

  void onDisconnect(BLEServer* pServer) {
    bleConnected = false;
    Serial.println("[BLE] Client disconnected");
    
    if (setupMode && !bleCredentialsReceived) {
      // Restart advertising if still in setup mode
      pServer->startAdvertising();
      
      tft.fillRect(0, 200, W, 40, COL_BG);
      tft.setTextDatum(MC_DATUM);
      tft.setTextColor(COL_TEXT);
      tft.drawString("Waiting for app...", W/2, 220, 2);
    }
  }
};

class CharacteristicCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) {
    String value = pCharacteristic->getValue().c_str();
    Serial.printf("[BLE] Received: %s\n", value.c_str());

    // Parse JSON
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, value);

    String response;
    
    if (err) {
      Serial.printf("[BLE] JSON error: %s\n", err.c_str());
      response = "{\"success\":false,\"error\":\"Invalid JSON\"}";
    }
    else if (!doc.containsKey("ssid")) {
      response = "{\"success\":false,\"error\":\"Missing ssid\"}";
    }
    else {
      pendingSSID = doc["ssid"].as<String>();
      pendingPassword = doc["password"] | "";
      
      if (pendingSSID.length() == 0) {
        response = "{\"success\":false,\"error\":\"Empty SSID\"}";
      } else {
        // Save credentials
        prefs.putString("ssid", pendingSSID);
        prefs.putString("pass", pendingPassword);
        
        bleCredentialsReceived = true;
        
        Serial.printf("[BLE] Credentials saved: %s\n", pendingSSID.c_str());
        
        response = "{\"success\":true,\"deviceId\":" + String(DEVICE_ID) + ",\"message\":\"Connecting to WiFi...\"}";
        
        // Update display
        tft.fillScreen(COL_BG);
        tft.setTextDatum(MC_DATUM);
        tft.setTextColor(COL_OK);
        tft.drawString("Credentials received!", W/2, 100, 2);
        tft.setTextColor(COL_TEXT);
        tft.drawString("Connecting to WiFi...", W/2, 130, 2);
      }
    }

    // Send response via notification
    pCharacteristic->setValue(response.c_str());
    pCharacteristic->notify();
    
    Serial.printf("[BLE] Response: %s\n", response.c_str());
  }
};

// -------------------------------------------------------------
// BLE Setup
// -------------------------------------------------------------
void startBLEProvisioning() {
  Serial.println("[BLE] Starting BLE provisioning...");
  setupMode = true;
  bleCredentialsReceived = false;

  // Create BLE device name with device ID
  String deviceName = "SmartMonitor_" + String(DEVICE_ID);
  
  BLEDevice::init(deviceName.c_str());
  
  // Create BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  // Create BLE Service
  BLEService* pService = pServer->createService(SERVICE_UUID);

  // Create BLE Characteristic with read, write, and notify
  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY
  );

  pCharacteristic->setCallbacks(new CharacteristicCallbacks());
  pCharacteristic->addDescriptor(new BLE2902());
  
  // Set initial value
  String initValue = "{\"device\":\"SmartMonitor\",\"id\":" + String(DEVICE_ID) + ",\"status\":\"ready\"}";
  pCharacteristic->setValue(initValue.c_str());

  // Start the service
  pService->start();

  // Start advertising
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.printf("[BLE] Advertising as: %s\n", deviceName.c_str());
  Serial.printf("[BLE] Service UUID: %s\n", SERVICE_UUID);

  // Show setup mode UI
  showSetupModeUI();

  // Blue LED on for BLE mode
  digitalWrite(BLUE_LED_PIN, HIGH);
}

void stopBLE() {
  if (pServer != nullptr) {
    BLEDevice::deinit(true);
    pServer = nullptr;
    pCharacteristic = nullptr;
  }
  Serial.println("[BLE] Stopped");
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
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

// Display Setup Mode UI (BLE)
void showSetupModeUI() {
  tft.fillScreen(COL_BG);
  tft.setTextDatum(MC_DATUM);
  
  // Bluetooth icon (simple representation)
  tft.setTextColor(0x001F);  // Blue
  tft.drawString("((B))", W/2, 30, 4);
  
  tft.setTextColor(COL_OK);
  tft.drawString("SETUP MODE", W/2, 70, 4);
  
  tft.setTextColor(COL_TEXT);
  tft.drawString("Bluetooth Device:", W/2, 110, 2);
  
  String deviceName = "SmartMonitor_" + String(DEVICE_ID);
  tft.setTextColor(COL_WARN);
  tft.drawString(deviceName, W/2, 135, 4);
  
  tft.setTextColor(COL_MUTED);
  tft.drawString("1. Open VeaHome app", W/2, 170, 2);
  tft.drawString("2. Add Device > AirGuard", W/2, 190, 2);
  tft.drawString("3. App will find this device", W/2, 210, 2);
  
  tft.setTextColor(COL_TEXT);
  tft.drawString("Waiting for app...", W/2, 235, 2);
}

// Connect to WiFi with saved credentials
void connectToWiFi() {
  if (!loadPrefs()) {
    Serial.println("[WiFi] No credentials to connect");
    return;
  }

  Serial.printf("[WiFi] Connecting to: %s\n", ssid.c_str());
  
  tft.fillScreen(COL_BG);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(COL_TEXT);
  tft.drawString("Connecting to WiFi...", W/2, 100, 2);
  tft.setTextColor(COL_WARN);
  tft.drawString(ssid, W/2, 130, 2);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());

  unsigned long t0 = millis();
  int dots = 0;
  
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) {
    delay(500);
    digitalWrite(BLUE_LED_PIN, !digitalRead(BLUE_LED_PIN));
    
    // Animate dots
    tft.fillRect(W/2 - 30, 160, 60, 20, COL_BG);
    String dotsStr = "";
    for (int i = 0; i < (dots % 4); i++) dotsStr += ".";
    tft.setTextColor(COL_TEXT);
    tft.drawString(dotsStr, W/2, 170, 2);
    dots++;
  }
  
  digitalWrite(BLUE_LED_PIN, LOW);

  if (WiFi.status() == WL_CONNECTED) {
    setupMode = false;
    
    // Stop BLE - no longer needed
    stopBLE();
    
    Serial.printf("[WiFi] Connected! IP: %s RSSI: %d\n", 
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());

    // Show success
    tft.fillScreen(COL_BG);
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(COL_OK);
    tft.drawString("CONNECTED!", W/2, 100, 4);
    tft.setTextColor(COL_TEXT);
    tft.drawString(WiFi.localIP().toString(), W/2, 140, 2);
    delay(2000);

    // Initialize time
    timeClient.setTimeOffset(timezoneOffset);
    timeClient.begin();
    for (int i = 0; i < 10 && !timeClient.update(); i++) {
      delay(200);
    }

    connectMQTT();
    drawFullUI();
  } else {
    Serial.println("[WiFi] Connection failed");
    
    tft.fillScreen(COL_BG);
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(COL_ALERT);
    tft.drawString("WiFi Failed!", W/2, 100, 4);
    tft.setTextColor(COL_MUTED);
    tft.drawString("Check password and try again", W/2, 140, 2);
    delay(3000);
    
    // Clear credentials and restart BLE
    prefs.remove("ssid");
    prefs.remove("pass");
    startBLEProvisioning();
  }
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

  // Build MQTT topics
  String devId = String(DEVICE_ID);
  topicTelemetry    = "vealive/smartmonitor/" + devId + "/telemetry";
  topicStatus       = "vealive/smartmonitor/" + devId + "/status";
  topicThresholds   = "vealive/smartmonitor/" + devId + "/thresholds";
  topicCmdBuzzer    = "vealive/smartmonitor/" + devId + "/command/buzzer";
  topicCmdThresholds= "vealive/smartmonitor/" + devId + "/command/thresholds";

  // Unique client ID
  uint64_t mac = ESP.getEfuseMac();
  char macTail[9];
  snprintf(macTail, sizeof(macTail), "%08X", (uint32_t)(mac & 0xFFFFFFFF));
  mqttClientId = "SM" + devId + "_" + String(macTail);

  Serial.println("\n=== Vealive360 SmartMonitor v5 (BLE Provisioning) ===");
  Serial.printf("Device ID: %d\n", DEVICE_ID);
  Serial.printf("Client ID: %s\n", mqttClientId.c_str());

  // TFT init
  tft.init();
  tft.setRotation(1);
  tft.fillScreen(COL_BG);

  // Sensors
  dht.begin();

  // IO
  pinMode(DUSTLEDPIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(BLUE_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_BUTTON_PIN, INPUT_PULLUP);

  // Preferences
  prefs.begin("monitor", false);

  // MQTT setup
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setKeepAlive(15);
  mqtt.setSocketTimeout(5);
  mqtt.setBufferSize(512);

  // Check if WiFi credentials saved
  if (!prefs.isKey("ssid")) {
    Serial.println("[Setup] No WiFi credentials - starting BLE provisioning");
    startBLEProvisioning();
    return;
  }

  // Load and try to connect
  if (loadPrefs()) {
    connectToWiFi();
  } else {
    startBLEProvisioning();
  }
}

// -------------------------------------------------------------
// Loop
// -------------------------------------------------------------
void loop() {
  // Handle Setup Mode (BLE)
  if (setupMode) {
    // Check if credentials were received via BLE
    if (bleCredentialsReceived) {
      delay(500);  // Give time for BLE notification to send
      connectToWiFi();
      return;
    }
    
    // Blink blue LED
    static unsigned long lastBlink = 0;
    if (millis() - lastBlink > 500) {
      digitalWrite(BLUE_LED_PIN, !digitalRead(BLUE_LED_PIN));
      lastBlink = millis();
    }
    
    // Check reset button
    handleButtons();
    return;
  }

  // Normal operation mode
  handleButtons();

  // MQTT
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqtt.connected()) {
      connectMQTT();
    }
    mqtt.loop();
  }

  // Update sensors + UI
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate >= 500) {
    updateSensorsAndUI();
    lastUpdate = millis();
  }

  // WiFi recovery
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiLostAt == 0) {
      wifiLostAt = millis();
      Serial.println("[WiFi] Connection lost...");
    } else if (millis() - wifiLostAt > 30000) {
      Serial.println("[WiFi] Fallback to BLE provisioning");
      startBLEProvisioning();
      wifiLostAt = 0;
    }
  } else {
    wifiLostAt = 0;
  }
}

// -------------------------------------------------------------
// Preferences
// -------------------------------------------------------------
bool loadPrefs() {
  if (!prefs.isKey("ssid")) return false;

  ssid          = prefs.getString("ssid", "");
  password      = prefs.getString("pass", "");
  tempMin       = prefs.getInt("tempMin", 18);
  tempMax       = prefs.getInt("tempMax", 30);
  humMin        = prefs.getInt("humMin", 30);
  humMax        = prefs.getInt("humMax", 70);
  dustThreshold = prefs.getInt("dustHigh", 400);
  mq2Threshold  = prefs.getInt("mq2High", 60);
  buzzerEnabled = prefs.getBool("buzzer", true);
  timezoneOffset= prefs.getInt("tz", 10800);

  return ssid.length() > 0;
}

void savePrefs() {
  prefs.putString("ssid", ssid);
  prefs.putString("pass", password);
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
// MQTT Callback
// -------------------------------------------------------------
void mqttCallback(char* topic, byte* payload, unsigned int len) {
  char msg[256];
  size_t copyLen = min((size_t)len, sizeof(msg) - 1);
  memcpy(msg, payload, copyLen);
  msg[copyLen] = '\0';

  String t = String(topic);
  Serial.printf("[MQTT] RX: %s => %s\n", topic, msg);

  // BUZZER COMMAND
  if (t == topicCmdBuzzer) {
    StaticJsonDocument<128> doc;
    DeserializationError err = deserializeJson(doc, msg);
    
    if (!err && doc.containsKey("state")) {
      String state = doc["state"].as<String>();
      state.toUpperCase();
      
      bool newState = (state == "ON" || state == "1" || state == "TRUE");
      
      if (newState != buzzerEnabled) {
        buzzerEnabled = newState;
        
        if (!buzzerEnabled) {
          digitalWrite(BUZZER_PIN, LOW);
          Serial.println("[MQTT] Buzzer => OFF (muted)");
        } else {
          Serial.println("[MQTT] Buzzer => ON");
        }
        
        prefs.putBool("buzzer", buzzerEnabled);
        drawMuteIcon(!buzzerEnabled);
        forceTelemetryPublish = true;
      }
    }
    return;
  }

  // THRESHOLDS COMMAND
  if (t == topicCmdThresholds) {
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, msg);
    
    if (err) {
      Serial.printf("[MQTT] JSON parse error: %s\n", err.c_str());
      return;
    }

    bool changed = false;

    if (doc.containsKey("tempMin"))   { tempMin = doc["tempMin"].as<int>(); changed = true; }
    if (doc.containsKey("tempMax"))   { tempMax = doc["tempMax"].as<int>(); changed = true; }
    if (doc.containsKey("humMin"))    { humMin = doc["humMin"].as<int>(); changed = true; }
    if (doc.containsKey("humMax"))    { humMax = doc["humMax"].as<int>(); changed = true; }
    if (doc.containsKey("dustHigh"))  { dustThreshold = doc["dustHigh"].as<int>(); changed = true; }
    if (doc.containsKey("mq2High"))   { mq2Threshold = doc["mq2High"].as<int>(); changed = true; }
    if (doc.containsKey("dust"))      { dustThreshold = doc["dust"].as<int>(); changed = true; }
    if (doc.containsKey("mq2"))       { mq2Threshold = doc["mq2"].as<int>(); changed = true; }

    if (changed) {
      savePrefs();
      Serial.printf("[MQTT] Thresholds updated\n");
      forceThresholdPublish = true;
      forceTelemetryPublish = true;
    }
    return;
  }
}

// -------------------------------------------------------------
// MQTT Connect
// -------------------------------------------------------------
void connectMQTT() {
  if (mqtt.connected()) return;
  if (WiFi.status() != WL_CONNECTED) return;
  if (millis() - lastMqttAttempt < 3000) return;

  lastMqttAttempt = millis();
  Serial.printf("[MQTT] Connecting to %s:%d...\n", MQTT_HOST, MQTT_PORT);

  bool ok = mqtt.connect(
    mqttClientId.c_str(),
    NULL, NULL,
    topicStatus.c_str(), 1, true, "offline"
  );

  if (ok) {
    Serial.println("[MQTT] Connected!");
    mqtt.publish(topicStatus.c_str(), "online", true);
    mqtt.subscribe(topicCmdBuzzer.c_str(), 1);
    mqtt.subscribe(topicCmdThresholds.c_str(), 1);
    forceThresholdPublish = true;
    forceTelemetryPublish = true;
  } else {
    Serial.printf("[MQTT] Failed, rc=%d\n", mqtt.state());
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

  char buf[384];
  serializeJson(doc, buf);
  mqtt.publish(topicTelemetry.c_str(), buf, true);
}

// -------------------------------------------------------------
// Handle Buttons
// -------------------------------------------------------------
void handleButtons() {
  static uint32_t resetStart = 0;
  static bool buzzerBtnLast = false;
  static uint32_t buzzerDebounce = 0;

  // RESET button (hold 3s to clear WiFi)
  if (digitalRead(RESET_BUTTON_PIN) == LOW) {
    if (resetStart == 0) {
      resetStart = millis();
      Serial.println("[BTN] Reset button pressed...");
    }
    if (millis() - resetStart > 3000) {
      Serial.println("[BTN] RESET - clearing WiFi credentials");
      tft.fillScreen(COL_BG);
      tft.setTextDatum(MC_DATUM);
      tft.setTextColor(COL_TEXT);
      tft.drawString("Resetting WiFi...", W/2, H/2, 4);
      
      // Clear WiFi credentials
      prefs.remove("ssid");
      prefs.remove("pass");
      
      delay(500);
      ESP.restart();
    }
  } else {
    resetStart = 0;
  }

  // BUZZER toggle button
  if (!setupMode) {
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
}

// -------------------------------------------------------------
// Update Sensors and UI
// -------------------------------------------------------------
void updateSensorsAndUI() {
  if (setupMode) return;

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

  // MQ2 sensor
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
  } else if (WiFi.status() == WL_CONNECTED) {
    setLED("OK");
  } else {
    setLED("DISCONNECTED");
  }

  if (!uiInitialized) {
    drawFullUI();
    uiInitialized = true;
  }

  // Get time
  String timeStr = "--:--";
  if (WiFi.status() == WL_CONNECTED) {
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

  // MQTT publishing
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
  tft.fillRect(0, 0, W, TOP_H, COL_TOPBAR);
  tft.drawFastHLine(0, TOP_H - 1, W, COL_EDGE);
  drawLeft(8, 6, "Vealive360", 2, COL_TEXT, COL_TOPBAR);
  drawRight(W - 8, 6, "ID:" + String(DEVICE_ID), 2, COL_TEXT, COL_TOPBAR);
}

void drawHeader(const String& timeStr, bool alert) {
  bool timeChanged = (timeStr != lastTimeStr);
  bool alertChanged = (alert != lastAlertState);

  if (!timeChanged && !alertChanged) return;

  tft.fillRect(0, TOP_H, W, HEAD_H, COL_BG);

  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString(timeStr, W/2, TOP_H + HEAD_H/2, 6);

  int pillW = 90;
  int pillH = 20;
  int pillX = W - pillW - 10;
  int pillY = TOP_H + HEAD_H - pillH - 8;

  uint16_t pillBg = alert ? COL_ALERT : COL_OK;
  tft.fillRoundRect(pillX, pillY, pillW, pillH, 10, pillBg);
  
  String statusText = alert ? "ALERT" : "OK";
  drawCentered(pillX + pillW/2, pillY + pillH/2, statusText, 2, COL_TEXT, pillBg);

  uint16_t dotColor = alert ? COL_ALERT : COL_OK;
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
    int font = (valStr.length() >= 4) ? 2 : 4;

    drawCentered(x + CARD_W/2, CARDS_Y + CARD_H/2, valStr, font, fg, COL_CARD);
    *lastVals[i] = values[i];
  }
}

void drawFooter() {
  static String lastFooterStr = "";
  static int lastSignalBars = -1;
  
  String footerStr = ssid;
  if (footerStr.length() > 15) {
    footerStr = footerStr.substring(0, 14) + "..";
  }
  
  int signalBars = getSignalBars(WiFi.RSSI());

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
  digitalWrite(GREEN_LED_PIN, status == "OK");
  digitalWrite(BLUE_LED_PIN,  status == "DISCONNECTED" || setupMode);
}
