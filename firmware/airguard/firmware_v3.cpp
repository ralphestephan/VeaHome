// -------------------------------------------------------------
// Vealive360 SmartMonitor (ESP32) - Device ID: 1
// TFT: 240x320 (ILI9341) using TFT_eSPI
//
// MQTT Broker: 63.34.243.171:1883
// 
// === MQTT TOPICS ===
//
// PUBLISH (ESP -> App/Node-RED):
//   vealive/smartmonitor/1/telemetry       - Full sensor data (retained)
//   vealive/smartmonitor/1/status          - LWT: "online" / "offline" (retained)
//   vealive/smartmonitor/1/thresholds      - Current threshold config (retained)
//
// SUBSCRIBE (App -> ESP):
//   vealive/smartmonitor/1/command/buzzer      - {"state":"ON"} or {"state":"OFF"}
//   vealive/smartmonitor/1/command/thresholds  - Set new thresholds from app
//   vealive/smartmonitor/1/command/ac          - {"power":"ON/OFF", "temp":24, "mode":"COOL/HEAT/AUTO/FAN"}
//   vealive/smartmonitor/1/command/dehumidifier - {"power":"ON/OFF", "level":1-5}
//   vealive/smartmonitor/1/command/shutters    - {"action":"OPEN/CLOSE/STOP"}
//   vealive/smartmonitor/1/command/learn/ir    - {"device":"ac", "action":"power_on"}
//   vealive/smartmonitor/1/command/learn/rf    - {"device":"dehumidifier", "action":"power_on"}
//   vealive/smartmonitor/1/command/getcodes    - Get all learned codes
//
// PUBLISH (ESP -> App):
//   vealive/smartmonitor/1/learned/ir          - IR code learned confirmation
//   vealive/smartmonitor/1/learned/rf          - RF code learned confirmation
//   vealive/smartmonitor/1/codes               - All learned codes
//
// === TELEMETRY JSON FORMAT ===
// {
//   "id": 1,
//   "temp": 25,
//   "hum": 55,
//   "dust": 120,
//   "mq2": 40,
//   "alert": true,
//   "alertFlags": 5,  // bitfield: 1=temp, 2=hum, 4=dust, 8=mq2
//   "buzzer": true,
//   "rssi": -45,
//   "uptime": 12345
// }
//
// === SET THRESHOLDS JSON FORMAT ===
// {
//   "tempMin": 18,
//   "tempMax": 30,
//   "humMin": 25,
//   "humMax": 70,
//   "dustHigh": 300,
//   "mq2High": 80
// }
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
#include <time.h>
#include <IRremoteESP8266.h>
#include <IRsend.h>
#include <IRrecv.h>
#include <IRutils.h>

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

// IR/RF Pins
#define IR_PIN               4   // IR LED transmitter
#define IR_RECV_PIN          35  // IR receiver (must be ADC capable)
#define RF_PIN               5   // 433MHz RF transmitter
#define RF_RECV_PIN          36  // RF receiver (must be ADC capable)

// -------------------------------------------------------------
// Device / MQTT
// -------------------------------------------------------------
int DEVICE_ID = 1;  // Will be loaded from preferences or set via BLE
static const char* MQTT_HOST = "63.34.243.171";
static const int   MQTT_PORT = 1883;

// MQTT Topics
String topicTelemetry;
String topicStatus;
String topicThresholds;
String topicCmdBuzzer;
String topicCmdThresholds;
String topicCmdAC;
String topicCmdDehumidifier;
String topicCmdShutters;
String topicCmdLearnIR;
String topicCmdLearnRF;
String topicCmdGetCodes;
String mqttClientId;

// BLE UUIDs (must match mobile app)
#define BLE_SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define BLE_WIFI_LIST_CHAR_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define BLE_WIFI_CRED_CHAR_UUID "cf7e8a3d-c4c0-4ff1-8b42-bc5e0e3f4d8f"
#define BLE_DEVICE_INFO_CHAR_UUID "1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e"

// BLE Objects
BLEServer* pServer = nullptr;
BLECharacteristic* pWifiListChar = nullptr;
BLECharacteristic* pWifiCredChar = nullptr;
BLECharacteristic* pDeviceInfoChar = nullptr;
bool bleClientConnected = false;
bool bleProvisioningMode = false;

// -------------------------------------------------------------
// Networking objects
// -------------------------------------------------------------
WebServer   server(80);
DNSServer   dnsServer;
Preferences prefs;

IPAddress apIP(192, 168, 4, 1);
const byte DNS_PORT = 53;

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

int timezoneOffset = 7200;  // GMT+2 (Lebanon winter time)

bool buzzerEnabled = true;

// -------------------------------------------------------------
// Runtime State
// -------------------------------------------------------------
bool apModeActive   = false;
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
// UI Constants (PORTRAIT 240x320 after rotation 2)
// -------------------------------------------------------------
static const int W = 240;  // Width after rotation 2
static const int H = 320;  // Height after rotation 2

static const int TOP_H   = 0;  // Top bar removed
static const int HEAD_H  = 50;  // Reduced since date removed
static const int FOOT_H  = 20;

static const int CARDS_Y = TOP_H + HEAD_H + 8;  // More spacing
static const int CARDS_H = H - FOOT_H - CARDS_Y - 6;

static const int MARGIN_X = 8;
static const int MARGIN_Y = 6;
static const int GAP_X    = 6;
static const int GAP_Y    = 6;
// 2x2 grid: 2 columns, 2 rows
static const int CARD_W   = (W - 2*MARGIN_X - GAP_X) / 2;
static const int CARD_H   = (CARDS_H - GAP_Y) / 2;

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

// UI State for partial updates
bool uiInitialized = false;
String lastTimeStr = "";
int lastTemp = INT32_MIN;
int lastHum  = INT32_MIN;
int lastDust = INT32_MIN;
int lastMq2  = INT32_MIN;
bool lastAlertState = false;
bool lastMuteState  = true;

// Device States (AC, Dehumidifier, Shutters)
struct DeviceState {
  bool power;
  int temp;        // AC only
  String mode;     // AC only: "COOL", "HEAT", "AUTO", "FAN"
  int level;       // Dehumidifier only: 1-5
  String action;   // Shutters only: "OPEN", "CLOSE", "STOP"
  String status;   // Display status string
};

DeviceState acState = {false, 24, "COOL", 0, "", "OFF"};
DeviceState dehumidifierState = {false, 0, "", 3, "", "OFF"};
DeviceState shuttersState = {false, 0, "", 0, "STOP", "STOP"};

// IR Receiver for learning
IRrecv irReceiver(IR_RECV_PIN);
decode_results irResults;
bool learningIR = false;
String learningIRDevice = "";
String learningIRAction = "";

// RF Receiver state for learning
bool learningRF = false;
String learningRFDevice = "";
String learningRFAction = "";
unsigned long rfCodeStart = 0;
uint32_t learnedRFCode = 0;

// -------------------------------------------------------------
// Forward Declarations
// -------------------------------------------------------------
void startAPMode();
void startBLEProvisioning();
void launchCaptivePortal();
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
void drawSensorIcon(int x, int y, int sensorIndex);
void setLED(const String& status);

// BLE Callbacks
class MyBLEServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    bleClientConnected = true;
    Serial.println("[BLE] Client connected");
  }

  void onDisconnect(BLEServer* pServer) {
    bleClientConnected = false;
    Serial.println("[BLE] Client disconnected");
    // Restart advertising
    if (bleProvisioningMode) {
      pServer->startAdvertising();
    }
  }
};

// Simple Base64 decoding function
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

class WiFiCredCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String value = String(pCharacteristic->getValue().c_str());
    if (value.length() > 0) {
      Serial.println("[BLE] Received WiFi credentials");
      Serial.printf("[BLE] Raw value (%d bytes): %s\n", value.length(), value.c_str());
      
      // Check if value is base64 (doesn't start with '{')
      if (value.length() > 0 && value.charAt(0) != '{') {
        Serial.println("[BLE] Decoding base64...");
        value = base64Decode(value);
        Serial.printf("[BLE] Decoded (%d bytes): %s\n", value.length(), value.c_str());
      }
      
      // Parse JSON: {"ssid":"HomeWiFi","password":"password123"}
      StaticJsonDocument<256> doc;
      DeserializationError err = deserializeJson(doc, value);
      
      if (!err) {
        ssid = doc["ssid"].as<String>();
        password = doc["password"].as<String>();
        
        Serial.printf("[BLE] SSID: %s\n", ssid.c_str());
        Serial.printf("[BLE] Password length: %d\n", password.length());
        savePrefs();
        
        // Send confirmation
        StaticJsonDocument<128> response;
        response["success"] = true;
        response["message"] = "Credentials saved. Restarting...";
        String jsonResponse;
        serializeJson(response, jsonResponse);
        pCharacteristic->setValue(jsonResponse.c_str());
        pCharacteristic->notify();
        
        Serial.println("[BLE] Restarting in 1 second...");
        delay(1000);
        ESP.restart();
      } else {
        Serial.printf("[BLE] JSON parse error: %s\n", err.c_str());
        Serial.printf("[BLE] Failed to parse: %s\n", value.c_str());
      }
    }
  }
};

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

// Get signal strength bars (0-4) based on RSSI
static int getSignalBars(int rssi) {
  if (rssi >= -50) return 4;  // Excellent
  if (rssi >= -60) return 3;  // Good
  if (rssi >= -70) return 2;  // Fair
  if (rssi >= -80) return 1;  // Weak
  return 0;  // Very weak
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
  topicCmdAC        = "vealive/smartmonitor/" + devId + "/command/ac";
  topicCmdDehumidifier = "vealive/smartmonitor/" + devId + "/command/dehumidifier";
  topicCmdShutters  = "vealive/smartmonitor/" + devId + "/command/shutters";
  topicCmdLearnIR   = "vealive/smartmonitor/" + devId + "/command/learn/ir";
  topicCmdLearnRF   = "vealive/smartmonitor/" + devId + "/command/learn/rf";
  topicCmdGetCodes  = "vealive/smartmonitor/" + devId + "/command/getcodes";

  // Unique client ID
  uint64_t mac = ESP.getEfuseMac();
  char macTail[9];
  snprintf(macTail, sizeof(macTail), "%08X", (uint32_t)(mac & 0xFFFFFFFF));
  mqttClientId = "SM" + devId + "_" + String(macTail);

  Serial.println("\n=== Vealive360 SmartMonitor v3 ===");
  Serial.printf("Device ID: %d\n", DEVICE_ID);
  Serial.printf("Client ID: %s\n", mqttClientId.c_str());

  // TFT init
  tft.init();
  tft.setRotation(2); // Rotated 90 degrees clockwise from rotation 1
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

  Serial2.end();
  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_BUTTON_PIN, INPUT_PULLUP);

  // IR/RF setup
  static IRsend irSender(IR_PIN);
  irSender.begin();
  irReceiver.enableIRIn();  // Start IR receiver for learning
  pinMode(RF_PIN, OUTPUT);
  pinMode(RF_RECV_PIN, INPUT);
  digitalWrite(RF_PIN, LOW);
  
  // Load learned codes
  loadLearnedCodes();

  // Preferences
  prefs.begin("monitor", false);

  // MQTT setup
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setKeepAlive(15);
  mqtt.setSocketTimeout(5);
  mqtt.setBufferSize(512);

  // Load settings
  if (!loadPrefs()) {
    Serial.println("[PREF] No WiFi saved. Starting BLE provisioning.");
    startBLEProvisioning();
    return;
  }

  // Connect WiFi
  Serial.printf("[WiFi] Connecting to: %s\n", ssid.c_str());
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());

  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) {
    delay(300);
    digitalWrite(BLUE_LED_PIN, !digitalRead(BLUE_LED_PIN));
  }
  digitalWrite(BLUE_LED_PIN, LOW);

  if (WiFi.status() == WL_CONNECTED) {
    apModeActive = false;
    Serial.printf("[WiFi] Connected! IP: %s RSSI: %d\n", 
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());

    timeClient.setTimeOffset(timezoneOffset);
    timeClient.begin();
    
    // Try to get time
    for (int i = 0; i < 10 && !timeClient.update(); i++) {
      delay(200);
    }

    connectMQTT();
  } else {
    Serial.println("[WiFi] Failed. Starting AP.");
    startAPMode();
    return;
  }

  drawFullUI();
}

// -------------------------------------------------------------
// BLE Provisioning Mode
// -------------------------------------------------------------
void startBLEProvisioning() {
  bleProvisioningMode = true;
  
  Serial.println("[BLE] Starting BLE provisioning mode");
  
  // Show BLE mode on display
  tft.fillScreen(COL_BG);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(COL_TEXT);
  tft.drawString("BLE Pairing Mode", W/2, H/2 - 20, 4);
  tft.setTextColor(COL_MUTED);
  tft.drawString("Open VeaHome app to connect", W/2, H/2 + 20, 2);
  
  // Initialize BLE
  String bleName = "SmartMonitor_" + String(DEVICE_ID);
  BLEDevice::init(bleName.c_str());
  
  // Create BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyBLEServerCallbacks());
  
  // Create BLE Service
  BLEService *pService = pServer->createService(BLE_SERVICE_UUID);
  
  // Device Info Characteristic (Read)
  pDeviceInfoChar = pService->createCharacteristic(
    BLE_DEVICE_INFO_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ
  );
  StaticJsonDocument<128> deviceInfo;
  deviceInfo["deviceId"] = DEVICE_ID;
  deviceInfo["name"] = bleName;
  deviceInfo["type"] = "SmartMonitor";
  String infoJson;
  serializeJson(deviceInfo, infoJson);
  pDeviceInfoChar->setValue(infoJson.c_str());
  
  // WiFi Networks Characteristic (Read)
  pWifiListChar = pService->createCharacteristic(
    BLE_WIFI_LIST_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pWifiListChar->addDescriptor(new BLE2902());
  
  // Scan and send WiFi networks
  int n = WiFi.scanNetworks();
  StaticJsonDocument<1024> networks;
  JsonArray array = networks.to<JsonArray>();
  for (int i = 0; i < min(n, 10); i++) {
    JsonObject net = array.createNestedObject();
    net["ssid"] = WiFi.SSID(i);
    net["signal"] = WiFi.RSSI(i);
    net["secured"] = (WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
  }
  String networksJson;
  serializeJson(networks, networksJson);
  pWifiListChar->setValue(networksJson.c_str());
  
  // WiFi Credentials Characteristic (Write)
  pWifiCredChar = pService->createCharacteristic(
    BLE_WIFI_CRED_CHAR_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY
  );
  pWifiCredChar->addDescriptor(new BLE2902());
  pWifiCredChar->setCallbacks(new WiFiCredCallbacks());
  
  // Start service
  pService->start();
  
  // Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BLE_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  
  Serial.println("[BLE] Advertising started");
  Serial.printf("[BLE] Device name: %s\n", bleName.c_str());
  Serial.printf("[BLE] Found %d WiFi networks\n", n);
}

// -------------------------------------------------------------
// Loop
// -------------------------------------------------------------
void loop() {
  // Handle buttons
  handleButtons();

  // BLE provisioning mode
  if (bleProvisioningMode) {
    // Just wait for BLE connection and credentials
    // Device will restart when credentials received
    delay(100);
    return;
  }

  // Captive portal
  if (apModeActive) {
    dnsServer.processNextRequest();
    server.handleClient();
  }

  // MQTT
  if (!apModeActive && WiFi.status() == WL_CONNECTED) {
    if (!mqtt.connected()) {
      connectMQTT();
    }
    mqtt.loop();
  }

  // Check for IR signals (learning mode)
  if (learningIR && irReceiver.decode(&irResults)) {
    uint32_t code = irResults.value;
    int protocol = irResults.decode_type;
    
    Serial.printf("[IR LEARN] Received code: 0x%08X, protocol: %d\n", code, protocol);
    
    // Save learned code
    saveLearnedCode(learningIRDevice, learningIRAction, code, protocol, true);
    
    // Publish confirmation
    if (mqtt.connected()) {
      StaticJsonDocument<256> doc;
      doc["device"] = learningIRDevice;
      doc["action"] = learningIRAction;
      doc["code"] = String(code, HEX);
      doc["protocol"] = protocol;
      doc["success"] = true;
      
      char buf[256];
      serializeJson(doc, buf);
      String topic = "vealive/smartmonitor/" + String(DEVICE_ID) + "/learned/ir";
      mqtt.publish(topic.c_str(), buf);
    }
    
    learningIR = false;
    learningIRDevice = "";
    learningIRAction = "";
    irReceiver.resume();
  } else if (learningIR) {
    irReceiver.resume(); // Continue listening
  }

  // Check for RF signals (learning mode)
  if (learningRF) {
    int rfValue = analogRead(RF_RECV_PIN);
    static int lastRFValue = 0;
    static unsigned long lastRFChange = 0;
    
    if (rfValue != lastRFValue) {
      lastRFChange = millis();
      lastRFValue = rfValue;
    }
    
    // If signal stable for 100ms, consider it learned
    if (millis() - lastRFChange > 100 && rfValue > 100) {
      // Simple RF code extraction
      learnedRFCode = (uint32_t)rfValue;
      learnedRFCode = (learnedRFCode << 16) | (millis() & 0xFFFF);
      
      Serial.printf("[RF LEARN] Received code: 0x%08X\n", learnedRFCode);
      
      // Save learned code
      saveLearnedCode(learningRFDevice, learningRFAction, learnedRFCode, 32, false);
      
      // Publish confirmation
      if (mqtt.connected()) {
        StaticJsonDocument<256> doc;
        doc["device"] = learningRFDevice;
        doc["action"] = learningRFAction;
        doc["code"] = String(learnedRFCode, HEX);
        doc["success"] = true;
        
        char buf[256];
        serializeJson(doc, buf);
        String topic = "vealive/smartmonitor/" + String(DEVICE_ID) + "/learned/rf";
        mqtt.publish(topic.c_str(), buf);
      }
      
      learningRF = false;
      learningRFDevice = "";
      learningRFAction = "";
    }
  }

  // Update sensors + UI
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate >= 500) {
    updateSensorsAndUI();
    lastUpdate = millis();
  }

  // WiFi recovery
  if (!apModeActive && WiFi.status() != WL_CONNECTED) {
    if (wifiLostAt == 0) {
      wifiLostAt = millis();
      Serial.println("[WiFi] Connection lost...");
    } else if (millis() - wifiLostAt > 20000) {
      Serial.println("[WiFi] Fallback to AP mode.");
      startAPMode();
      wifiLostAt = 0;
    }
  } else {
    wifiLostAt = 0;
  }
}

// -------------------------------------------------------------
// AP Mode
// -------------------------------------------------------------
void startAPMode() {
  apModeActive = true;

  if (mqtt.connected()) mqtt.disconnect();

  WiFi.disconnect(true);
  WiFi.mode(WIFI_AP);
  WiFi.softAP("SmartMonitor_Setup");
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));

  Serial.printf("[AP] Started: SmartMonitor_Setup @ %s\n", apIP.toString().c_str());

  dnsServer.start(DNS_PORT, "*", apIP);
  launchCaptivePortal();

  uiInitialized = false;
  drawFullUI();
}

// -------------------------------------------------------------
// Captive Portal
// -------------------------------------------------------------
void launchCaptivePortal() {
  auto servePage = []() {
    String html = R"(
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SmartMonitor Setup</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;font-family:system-ui;background:linear-gradient(135deg,#00c6ff,#7f00ff);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{background:rgba(255,255,255,.15);backdrop-filter:blur(10px);border-radius:20px;padding:24px;width:100%;max-width:400px;border:1px solid rgba(255,255,255,.2)}
    h2{margin:0 0 8px;color:#fff}
    p{margin:0 0 20px;color:rgba(255,255,255,.8);font-size:14px}
    label{display:block;color:rgba(255,255,255,.9);font-size:13px;margin-bottom:6px}
    input{width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.2);color:#fff;font-size:15px;margin-bottom:16px}
    input:focus{outline:none;border-color:rgba(255,255,255,.5)}
    button{width:100%;padding:14px;border:none;border-radius:12px;background:rgba(255,255,255,.9);color:#333;font-weight:bold;font-size:16px;cursor:pointer}
    button:hover{background:#fff}
  </style>
</head>
<body>
  <div class="card">
    <h2>SmartMonitor Setup</h2>
    <p>Device ID: 1 • Connect to WiFi to enable app control</p>
    <form action="/save" method="POST">
      <label>WiFi Network Name</label>
      <input name="ssid" required placeholder="Your WiFi SSID">
      <label>WiFi Password</label>
      <input name="password" type="password" required placeholder="Your WiFi Password">
      <button type="submit">Save & Connect</button>
    </form>
  </div>
</body>
</html>
)";
    server.send(200, "text/html", html);
  };

  server.on("/", HTTP_GET, servePage);
  server.on("/generate_204", HTTP_GET, servePage);
  server.on("/hotspot-detect.html", HTTP_GET, servePage);
  server.on("/fwlink", HTTP_GET, servePage);
  server.onNotFound(servePage);

  server.on("/save", HTTP_POST, []() {
    ssid     = server.arg("ssid");
    password = server.arg("password");
    savePrefs();

    server.send(200, "text/html",
      "<html><body style='font-family:system-ui;text-align:center;padding:50px;background:linear-gradient(135deg,#00c6ff,#7f00ff);color:#fff'>"
      "<h2>Saved!</h2><p>Restarting...</p></body></html>");
    delay(1500);
    ESP.restart();
  });

  server.begin();
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
  DEVICE_ID     = prefs.getInt("deviceId", 1);  // Load device ID

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
  prefs.putInt("deviceId", DEVICE_ID);
}

// -------------------------------------------------------------
// MQTT Callback
// -------------------------------------------------------------
void mqttCallback(char* topic, byte* payload, unsigned int len) {
  // Create null-terminated string
  char msg[256];
  size_t copyLen = min((size_t)len, sizeof(msg) - 1);
  memcpy(msg, payload, copyLen);
  msg[copyLen] = '\0';

  String t = String(topic);
  Serial.printf("[MQTT] RX: %s => %s\n", topic, msg);

  // ===== BUZZER COMMAND =====
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
        drawMuteIcon(!buzzerEnabled);  // Update icon immediately
        forceTelemetryPublish = true;
      }
    }
    return;
  }

  // ===== AC COMMAND =====
  if (t == topicCmdAC) {
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, msg);
    
    if (!err) {
      if (doc.containsKey("power")) {
        String powerStr = doc["power"].as<String>();
        powerStr.toUpperCase();
        acState.power = (powerStr == "ON" || powerStr == "1" || powerStr == "TRUE");
      }
      
      if (doc.containsKey("temp")) {
        acState.temp = doc["temp"].as<int>();
        if (acState.temp < 16) acState.temp = 16;
        if (acState.temp > 30) acState.temp = 30;
      }
      
      if (doc.containsKey("mode")) {
        acState.mode = doc["mode"].as<String>();
        acState.mode.toUpperCase();
      }
      
      // Update status string
      if (acState.power) {
        acState.status = acState.mode + " " + String(acState.temp) + "C";
      } else {
        acState.status = "OFF";
      }
      
      // Send IR command
      if (acState.power) {
        uint32_t irCode = 0x00000000;
        if (acState.mode == "COOL") irCode |= 0x01000000;
        else if (acState.mode == "HEAT") irCode |= 0x02000000;
        else if (acState.mode == "AUTO") irCode |= 0x03000000;
        else if (acState.mode == "FAN") irCode |= 0x04000000;
        
        irCode |= (acState.temp - 16) << 16;
        irCode |= 0x80000000;
        
        sendIRCommand(irCode, 0);
        Serial.printf("[AC] Power: ON, Mode: %s, Temp: %dC\n", acState.mode.c_str(), acState.temp);
      } else {
        sendIRCommand(0x80000000, 0);
        Serial.println("[AC] Power: OFF");
      }
      
      drawDeviceControls();
      forceTelemetryPublish = true;
    }
    return;
  }

  // ===== DEHUMIDIFIER COMMAND =====
  if (t == topicCmdDehumidifier) {
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, msg);
    
    if (!err) {
      if (doc.containsKey("power")) {
        String powerStr = doc["power"].as<String>();
        powerStr.toUpperCase();
        dehumidifierState.power = (powerStr == "ON" || powerStr == "1" || powerStr == "TRUE");
      }
      
      if (doc.containsKey("level")) {
        dehumidifierState.level = doc["level"].as<int>();
        if (dehumidifierState.level < 1) dehumidifierState.level = 1;
        if (dehumidifierState.level > 5) dehumidifierState.level = 5;
      }
      
      if (dehumidifierState.power) {
        dehumidifierState.status = "L" + String(dehumidifierState.level);
      } else {
        dehumidifierState.status = "OFF";
      }
      
      if (dehumidifierState.power) {
        uint32_t rfCode = 0x10000000;
        rfCode |= 0x01000000;
        rfCode |= (dehumidifierState.level & 0x0F) << 20;
        sendRFCommand(rfCode, 32);
        Serial.printf("[DEHUMIDIFIER] Power: ON, Level: %d\n", dehumidifierState.level);
      } else {
        uint32_t rfCode = 0x10000000;
        sendRFCommand(rfCode, 32);
        Serial.println("[DEHUMIDIFIER] Power: OFF");
      }
      
      drawDeviceControls();
      forceTelemetryPublish = true;
    }
    return;
  }

  // ===== SHUTTERS COMMAND =====
  if (t == topicCmdShutters) {
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, msg);
    
    if (!err) {
      if (doc.containsKey("action")) {
        shuttersState.action = doc["action"].as<String>();
        shuttersState.action.toUpperCase();
        shuttersState.status = shuttersState.action;
        
        uint32_t rfCode = 0x20000000;
        
        if (shuttersState.action == "OPEN") {
          rfCode |= 0x01000000;
        } else if (shuttersState.action == "CLOSE") {
          rfCode |= 0x02000000;
        } else if (shuttersState.action == "STOP") {
          rfCode |= 0x03000000;
        }
        
        sendRFCommand(rfCode, 32);
        Serial.printf("[SHUTTERS] Action: %s\n", shuttersState.action.c_str());
      }
      
      drawDeviceControls();
      forceTelemetryPublish = true;
    }
    return;
  }

  // ===== LEARN IR COMMAND =====
  if (t == topicCmdLearnIR) {
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, msg);
    
    if (!err && doc.containsKey("device") && doc.containsKey("action")) {
      String device = doc["device"].as<String>();
      String action = doc["action"].as<String>();
      learnIRCode(device, action);
    }
    return;
  }

  // ===== LEARN RF COMMAND =====
  if (t == topicCmdLearnRF) {
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, msg);
    
    if (!err && doc.containsKey("device") && doc.containsKey("action")) {
      String device = doc["device"].as<String>();
      String action = doc["action"].as<String>();
      learnRFCode(device, action);
    }
    return;
  }

  // ===== GET CODES COMMAND =====
  if (t == topicCmdGetCodes) {
    publishLearnedCodes();
    return;
  }

  // ===== THRESHOLDS COMMAND =====
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
    
    // Also support old field names
    if (doc.containsKey("dust"))      { dustThreshold = doc["dust"].as<int>(); changed = true; }
    if (doc.containsKey("mq2"))       { mq2Threshold = doc["mq2"].as<int>(); changed = true; }

    if (changed) {
      savePrefs();
      Serial.printf("[MQTT] Thresholds updated: temp=%d-%d hum=%d-%d dust=%d mq2=%d\n",
                    tempMin, tempMax, humMin, humMax, dustThreshold, mq2Threshold);
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
    
    // Publish online status
    mqtt.publish(topicStatus.c_str(), "online", true);

    // Subscribe to command topics
    mqtt.subscribe(topicCmdBuzzer.c_str(), 1);
    mqtt.subscribe(topicCmdThresholds.c_str(), 1);
    mqtt.subscribe(topicCmdAC.c_str(), 1);
    mqtt.subscribe(topicCmdDehumidifier.c_str(), 1);
    mqtt.subscribe(topicCmdShutters.c_str(), 1);
    mqtt.subscribe(topicCmdLearnIR.c_str(), 1);
    mqtt.subscribe(topicCmdLearnRF.c_str(), 1);
    mqtt.subscribe(topicCmdGetCodes.c_str(), 1);

    Serial.printf("[MQTT] Subscribed to command topics\n");

    // Publish current state
    forceThresholdPublish = true;
    forceTelemetryPublish = true;
  } else {
    Serial.printf("[MQTT] Failed, rc=%d\n", mqtt.state());
  }
}

// -------------------------------------------------------------
// Publish Thresholds
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
  
  Serial.println("[MQTT] Published thresholds");
}

// -------------------------------------------------------------
// Publish Telemetry
// -------------------------------------------------------------
void publishTelemetry(int temp, int hum, int dust, int mq2) {
  if (!mqtt.connected()) return;

  // Build alertFlags bitfield
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
  // Read sensors
  float tf = dht.readTemperature();
  float hf = dht.readHumidity();
  
  if (isnan(tf) || isnan(hf)) {
    return; // Skip if sensor read failed
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

  // Check alerts (per-stat)
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

  // Initialize UI if needed
  if (!uiInitialized) {
    drawFullUI();
    uiInitialized = true;
  }

  // Get time string
  String timeStr = "--:--";
  if (!apModeActive && WiFi.status() == WL_CONNECTED) {
    timeClient.update();
    String formatted = timeClient.getFormattedTime();
    if (formatted.length() >= 5) {
      timeStr = formatted.substring(0, 5);
    }
  }

  // Update UI components
  drawHeader(timeStr, alertActive);
  drawCards(temp, hum, dust, mq2);
  drawFooter();

  // Update mute icon if changed
  bool muted = !buzzerEnabled;
  if (muted != lastMuteState) {
    drawMuteIcon(muted);
    lastMuteState = muted;
  }

  // MQTT publishing
  if (!apModeActive && mqtt.connected()) {
    // Telemetry
    if (forceTelemetryPublish || millis() - lastTelemetry >= TELEMETRY_INTERVAL_MS) {
      publishTelemetry(temp, hum, dust, mq2);
      lastTelemetry = millis();
      forceTelemetryPublish = false;
    }

    // Thresholds
    if (forceThresholdPublish || millis() - lastThresholdPub >= THRESHOLD_INTERVAL_MS) {
      publishThresholds();
      lastThresholdPub = millis();
      forceThresholdPublish = false;
    }
  }
}

// -------------------------------------------------------------
// UI Drawing
// -------------------------------------------------------------
void drawFullUI() {
  tft.fillScreen(COL_BG);
  // Top bar removed
  
  // Draw card frames in 2x2 grid
  const char* labels[] = {"TEMP", "HUM", "DUST", "GAS"};
  const char* units[]  = {"C", "%", "ug/m3", "ppm"};
  
  for (int row = 0; row < 2; row++) {
    for (int col = 0; col < 2; col++) {
      int i = row * 2 + col;  // Index: 0=TEMP, 1=HUM, 2=DUST, 3=GAS
      int x = MARGIN_X + col * (CARD_W + GAP_X);
      int y = CARDS_Y + row * (CARD_H + GAP_Y);
      
      tft.fillRoundRect(x, y, CARD_W, CARD_H, 8, COL_CARD);
      tft.drawRoundRect(x, y, CARD_W, CARD_H, 8, COL_EDGE);
      
      // Draw icon at top of card - prominent and visible
      int iconX = x + CARD_W/2;
      int iconY = y + 16;  // Positioned at top of card
      drawSensorIcon(iconX, iconY, i);
      
      // Card labels
      drawCentered(x + CARD_W/2, y + CARD_H - 10, labels[i], 1, COL_MUTED, COL_CARD);
      // Draw unit - no degree symbol for temperature
      drawRight(x + CARD_W - 4, y + 4, units[i], 1, COL_MUTED, COL_CARD);
    }
  }

  // Footer bar
  tft.fillRect(0, H - FOOT_H, W, FOOT_H, COL_BG);
  tft.drawFastHLine(0, H - FOOT_H, W, COL_EDGE);

  // Reset cached values
  lastTimeStr = "";
  lastTemp = lastHum = lastDust = lastMq2 = INT32_MIN;
  lastAlertState = !alertActive;
  lastMuteState = !buzzerEnabled;

  drawMuteIcon(!buzzerEnabled);
}

void drawTopBar() {
  // Top bar removed - function kept for compatibility but does nothing
}

void drawHeader(const String& timeStr, bool alert) {
  bool timeChanged = (timeStr != lastTimeStr);
  bool alertChanged = (alert != lastAlertState);

  // Date removed - no longer needed
  if (!timeChanged && !alertChanged) return;

  // Clear header area (start from top to avoid cutoff)
  tft.fillRect(0, 0, W, HEAD_H, COL_BG);

  if (apModeActive) {
    // Setup mode display
    tft.fillRoundRect(10, TOP_H + 4, W - 20, HEAD_H - 8, 8, COL_CARD);
    tft.drawRoundRect(10, TOP_H + 4, W - 20, HEAD_H - 8, 8, COL_EDGE);
    
    drawLeft(20, TOP_H + 10, "SETUP MODE", 2, COL_WARN, COL_CARD);
    drawLeft(20, TOP_H + 28, "WiFi: SmartMonitor_Setup", 2, COL_MUTED, COL_CARD);
  } else {
    // Status dot - at top left
    uint16_t dotColor = alert ? COL_ALERT : COL_OK;
    tft.fillCircle(12, 20, 5, dotColor);
    
    // Time display - centered, lowered a bit
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(COL_TEXT, COL_BG);
    tft.drawString(timeStr, W/2, 28, 6);
    
    // Date removed - cleaner display

    // Alert card - only show when alerting, one line expanded (lowered)
    if (alert) {
      int alertW = W - 20;
      int alertH = 28;
      int alertX = 10;
      int alertY = TOP_H + HEAD_H - alertH + 2;  // Lowered by 6 pixels
      
      tft.fillRoundRect(alertX, alertY, alertW, alertH, 8, COL_ALERT);
      tft.drawRoundRect(alertX, alertY, alertW, alertH, 8, COL_EDGE);
      
      drawCentered(alertX + alertW/2, alertY + alertH/2, "ALERT", 2, COL_TEXT, COL_ALERT);
    }
  }

  lastTimeStr = timeStr;
  lastAlertState = alert;
}

void drawCards(int temp, int hum, int dust, int mq2) {
  int values[] = {temp, hum, dust, mq2};
  int* lastVals[] = {&lastTemp, &lastHum, &lastDust, &lastMq2};
  bool alerts[] = {alertTemp, alertHum, alertDust, alertMq2};

  for (int row = 0; row < 2; row++) {
    for (int col = 0; col < 2; col++) {
      int i = row * 2 + col;  // Index: 0=TEMP, 1=HUM, 2=DUST, 3=GAS
      if (values[i] == *lastVals[i]) continue;

      int x = MARGIN_X + col * (CARD_W + GAP_X);
      int y = CARDS_Y + row * (CARD_H + GAP_Y);
      
      // Clear only the number area (below icons) - icons are at y+16, so clear starts at y+32
      // But don't clear the label area at bottom
      tft.fillRect(x + 2, y + 32, CARD_W - 4, CARD_H - 50, COL_CARD);

      // Redraw icon to ensure it's visible (icons might get partially cleared)
      int iconX = x + CARD_W/2;
      int iconY = y + 16;
      drawSensorIcon(iconX, iconY, i);

      // Draw value with color based on alert - make numbers bigger
      uint16_t fg = alerts[i] ? COL_WARN : COL_TEXT;
      
      String valStr = String(values[i]);
      // Use larger font - font 7 for 1-2 digits, font 4 for 3 digits, font 2 for 4+
      int font = 7;  // Default to largest
      if (valStr.length() >= 3) font = 4;
      if (valStr.length() >= 4) font = 2;

      drawCentered(x + CARD_W/2, y + CARD_H/2 + 5, valStr, font, fg, COL_CARD);
      
      // Redraw label to ensure it's visible (overlay on card background)
      const char* labels[] = {"TEMP", "HUM", "DUST", "GAS"};
      drawCentered(x + CARD_W/2, y + CARD_H - 10, labels[i], 1, COL_MUTED, COL_CARD);
      
      // Redraw unit - no degree symbol for temperature
      const char* units[]  = {"C", "%", "ug/m3", "ppm"};
      drawRight(x + CARD_W - 4, y + 4, units[i], 1, COL_MUTED, COL_CARD);

      *lastVals[i] = values[i];
    }
  }
}

void drawFooter() {
  static String lastFooterStr = "";
  static int lastSignalBars = -1;
  
  String footerStr;
  int signalBars = 0;
  
  if (apModeActive) {
    footerStr = "AP: 192.168.4.1";
    signalBars = -1;
  } else {
    String shortSsid = ssid;
    if (shortSsid.length() > 15) {
      shortSsid = shortSsid.substring(0, 14) + "..";
    }
    footerStr = shortSsid;
    signalBars = getSignalBars(WiFi.RSSI());
  }

  if (footerStr == lastFooterStr && signalBars == lastSignalBars) return;

  // Clear footer area (except mute icon and ID)
  tft.fillRect(0, H - FOOT_H + 1, W - 80, FOOT_H - 1, COL_BG);
  
  // Draw SSID
  drawLeft(8, H - FOOT_H + 4, footerStr, 2, COL_MUTED, COL_BG);
  
  // Draw signal strength bars if connected - positioned at ~1/3 from left
  if (signalBars >= 0) {
    int barWidth = 3;
    int barGap = 2;
    int barX = 105;  // Fixed position, roughly 1/3 from left edge
    int barY = H - FOOT_H + 5;
    
    for (int i = 0; i < 4; i++) {
      int barHeight = 4 + i * 2;  // Heights: 4, 6, 8, 10
      uint16_t barColor = (i < signalBars) ? COL_OK : COL_MUTED;
      tft.fillRect(barX + i * (barWidth + barGap), barY + (10 - barHeight), barWidth, barHeight, barColor);
    }
  }
  
  // Draw Device ID before mute icon
  drawRight(W - 32, H - FOOT_H + 4, "ID:" + String(DEVICE_ID), 2, COL_MUTED, COL_BG);
  
  lastFooterStr = footerStr;
  lastSignalBars = signalBars;
}

void drawMuteIcon(bool muted) {
  // Clear mute icon area (bottom-right corner, avoiding footer line)
  int footerY = H - FOOT_H;  // Footer starts at y=300
  int iconX = W - 12;  // Position in right corner, away from edge
  tft.fillRect(iconX - 12, footerY + 1, 15, FOOT_H - 2, COL_BG);  // +1 and -2 to avoid footer line

  // Only show icon when muted - smaller version, positioned in corner
  if (muted) {
    // Smaller mute icon: speaker with X through it
    // Footer is 20px tall, center icon vertically (avoiding top line)
    int iconY = footerY + 10;  // Center of footer (y=310)
    
    // Speaker triangle (pointing right) - smaller
    tft.fillTriangle(iconX - 4, iconY, iconX + 1, iconY - 6, iconX + 1, iconY + 6, COL_ALERT);
    // Speaker body (rectangle) - smaller, more proportional
    tft.fillRect(iconX - 4, iconY - 3, 3, 6, COL_ALERT);
    // X mark through speaker - centered on speaker, moved more to the right
    tft.drawLine(iconX - 5, iconY + 4, iconX + 4, iconY - 7, COL_ALERT);
  }
  // When unmuted, show nothing (clean footer)
}

// -------------------------------------------------------------
// Sensor Icons
// -------------------------------------------------------------
void drawSensorIcon(int x, int y, int sensorIndex) {
  // 0=TEMP, 1=HUM, 2=DUST, 3=GAS
  // Use blue color like in the app (0x07FF is cyan-blue, 0x001F is dark blue, 0x07E0 is green-blue)
  uint16_t iconColor = 0x07FF;  // Bright cyan-blue to match app icons
  
  switch (sensorIndex) {
    case 0: // TEMP - Thermometer matching app screenshot
      // Simple vertical stem
      tft.drawFastVLine(x, y - 5, 9, iconColor);
      // Bulb at bottom - clean circular bulb
      tft.fillCircle(x, y + 6, 4, iconColor);
      tft.drawCircle(x, y + 6, 4, iconColor);
      break;
      
    case 1: // HUM - Two realistic water drops (inverted - pointy top, rounded bottom)
      // First drop (left) - smaller realistic teardrop, inverted
      // Pointy top - draw horizontal lines that expand
      for (int i = 0; i <= 5; i++) {
        int width = i + 1;
        tft.fillRect(x - 4 - width/2, y - 5 + i, width, 1, iconColor);
      }
      // Bottom rounded part
      tft.fillCircle(x - 4, y + 2, 3, iconColor);
      
      // Second drop (right) - larger realistic teardrop, inverted
      // Pointy top - draw horizontal lines that expand
      for (int i = 0; i <= 7; i++) {
        int width = i + 1;
        tft.fillRect(x + 4 - width/2, y - 6 + i, width, 1, iconColor);
      }
      // Bottom rounded part
      tft.fillCircle(x + 4, y + 2, 4, iconColor);
      break;
      
    case 2: // DUST - Three horizontal wavy lines (reverted to original)
      // Three prominent horizontal wavy lines
      for (int i = 0; i < 3; i++) {
        int waveY = y - 2 + i * 5;
        // Draw thicker wave pattern
        for (int j = -8; j <= 8; j++) {
          // Create sine wave pattern
          int waveOffset = (int)(3.5 * sin((j + 8) * 3.14159 / 8.0));
          // Draw thicker lines
          tft.drawPixel(x + j, waveY + waveOffset, iconColor);
          tft.drawPixel(x + j, waveY + waveOffset - 1, iconColor);
          tft.drawPixel(x + j, waveY + waveOffset + 1, iconColor);
        }
      }
      break;
      
    case 3: // GAS - Creative gas molecules/particles icon
      // Draw three connected circles representing gas molecules
      // Center molecule
      tft.fillCircle(x, y, 3, iconColor);
      tft.drawCircle(x, y, 3, iconColor);
      // Top-left molecule
      tft.fillCircle(x - 6, y - 5, 2, iconColor);
      tft.drawCircle(x - 6, y - 5, 2, iconColor);
      // Top-right molecule
      tft.fillCircle(x + 6, y - 5, 2, iconColor);
      tft.drawCircle(x + 6, y - 5, 2, iconColor);
      // Bottom molecule
      tft.fillCircle(x, y + 7, 2, iconColor);
      tft.drawCircle(x, y + 7, 2, iconColor);
      // Connect them with lines (molecular bonds)
      tft.drawLine(x - 6, y - 5, x, y, iconColor);
      tft.drawLine(x + 6, y - 5, x, y, iconColor);
      tft.drawLine(x, y, x, y + 7, iconColor);
      break;
  }
}

// -------------------------------------------------------------
// LED Control
// -------------------------------------------------------------
void setLED(const String& status) {
  digitalWrite(RED_LED_PIN,   status == "ALERT");
  digitalWrite(GREEN_LED_PIN, status == "OK");
  digitalWrite(BLUE_LED_PIN,  status == "DISCONNECTED");
}

// -------------------------------------------------------------
// IR/RF Transmission
// -------------------------------------------------------------
void sendIRCommand(uint32_t code, int protocol) {
  Serial.printf("[IR] Sending code: 0x%08X\n", code);
  
  // Send IR command using IRremoteESP8266 (NEC protocol)
  static IRsend irSender(IR_PIN);
  irSender.sendNEC(code, 32);
  delay(100);
  
  // Repeat command for reliability
  irSender.sendNEC(code, 32);
}

void sendRFCommand(uint32_t code, int bits) {
  Serial.printf("[RF] Sending code: 0x%08X (%d bits)\n", code, bits);
  
  // Simple 433MHz RF transmission using OOK (On-Off Keying)
  const int bitTime = 500; // microseconds per bit
  
  // Send sync pulse
  digitalWrite(RF_PIN, HIGH);
  delayMicroseconds(bitTime * 10);
  digitalWrite(RF_PIN, LOW);
  delayMicroseconds(bitTime * 5);
  
  // Send data bits (MSB first) - Manchester encoding
  for (int i = bits - 1; i >= 0; i--) {
    bool bit = (code >> i) & 1;
    
    // Manchester: 0 = LOW-HIGH, 1 = HIGH-LOW
    if (bit) {
      digitalWrite(RF_PIN, HIGH);
      delayMicroseconds(bitTime);
      digitalWrite(RF_PIN, LOW);
      delayMicroseconds(bitTime);
    } else {
      digitalWrite(RF_PIN, LOW);
      delayMicroseconds(bitTime);
      digitalWrite(RF_PIN, HIGH);
      delayMicroseconds(bitTime);
    }
  }
  
  digitalWrite(RF_PIN, LOW);
  delayMicroseconds(bitTime * 2);
  
  // Repeat for reliability
  digitalWrite(RF_PIN, HIGH);
  delayMicroseconds(bitTime * 10);
  digitalWrite(RF_PIN, LOW);
  delayMicroseconds(bitTime * 5);
  
  for (int i = bits - 1; i >= 0; i--) {
    bool bit = (code >> i) & 1;
    if (bit) {
      digitalWrite(RF_PIN, HIGH);
      delayMicroseconds(bitTime);
      digitalWrite(RF_PIN, LOW);
      delayMicroseconds(bitTime);
    } else {
      digitalWrite(RF_PIN, LOW);
      delayMicroseconds(bitTime);
      digitalWrite(RF_PIN, HIGH);
      delayMicroseconds(bitTime);
    }
  }
  
  digitalWrite(RF_PIN, LOW);
}

// -------------------------------------------------------------
// IR/RF Learning Functions
// -------------------------------------------------------------
void learnIRCode(String device, String action) {
  learningIR = true;
  learningIRDevice = device;
  learningIRAction = action;
  irReceiver.enableIRIn();
  Serial.printf("[IR LEARN] Learning %s/%s - Point remote and press button\n", device.c_str(), action.c_str());
  
  // Show on display
  tft.fillRect(0, H - 60, W, 40, COL_BG);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(COL_WARN, COL_BG);
  tft.drawString("LEARN IR: " + device + "/" + action, W/2, H - 40, 2);
}

void learnRFCode(String device, String action) {
  learningRF = true;
  learningRFDevice = device;
  learningRFAction = action;
  learnedRFCode = 0;
  Serial.printf("[RF LEARN] Learning %s/%s - Press remote button\n", device.c_str(), action.c_str());
  
  // Show on display
  tft.fillRect(0, H - 60, W, 40, COL_BG);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(COL_WARN, COL_BG);
  tft.drawString("LEARN RF: " + device + "/" + action, W/2, H - 40, 2);
}

uint32_t getLearnedCode(String device, String action, bool* isIR) {
  String key = device + "_" + action;
  String codeStr = prefs.getString(("code_" + key).c_str(), "");
  
  if (codeStr.length() == 0) {
    *isIR = true;
    return 0; // Not found
  }
  
  // Parse code string: "IR:0x12345678" or "RF:0x12345678"
  if (codeStr.startsWith("IR:")) {
    *isIR = true;
    return strtoul(codeStr.substring(3).c_str(), NULL, 16);
  } else if (codeStr.startsWith("RF:")) {
    *isIR = false;
    return strtoul(codeStr.substring(3).c_str(), NULL, 16);
  }
  
  *isIR = true;
  return 0;
}

void saveLearnedCode(String device, String action, uint32_t code, int protocol, bool isIR) {
  String key = device + "_" + action;
  String codeStr = (isIR ? "IR:" : "RF:") + String(code, HEX);
  prefs.putString(("code_" + key).c_str(), codeStr);
  Serial.printf("[SAVE] Saved code %s/%s: %s\n", device.c_str(), action.c_str(), codeStr.c_str());
  
  // Clear learning display
  tft.fillRect(0, H - 60, W, 40, COL_BG);
}

void loadLearnedCodes() {
  // Codes are loaded on-demand via getLearnedCode()
  Serial.println("[LOAD] Learned codes will be loaded on-demand");
}

void publishLearnedCodes() {
  if (!mqtt.connected()) return;
  
  StaticJsonDocument<1024> doc;
  doc["deviceId"] = DEVICE_ID;
  
  // Try to load all possible codes
  JsonArray codes = doc.createNestedArray("codes");
  
  String devices[] = {"ac", "dehumidifier", "shutters"};
  String acActions[] = {"power_on", "power_off", "power_on_COOL_16", "power_on_COOL_24", "power_on_HEAT_20"};
  String dehumActions[] = {"power_on", "power_off", "power_on_level_1", "power_on_level_3", "power_on_level_5"};
  String shutterActions[] = {"action_open", "action_close", "action_stop"};
  
  for (int i = 0; i < 3; i++) {
    String device = devices[i];
    String* actions = (i == 0) ? acActions : (i == 1) ? dehumActions : shutterActions;
    int actionCount = (i == 0) ? 5 : (i == 1) ? 5 : 3;
    
    for (int j = 0; j < actionCount; j++) {
      bool isIR = true;
      uint32_t code = getLearnedCode(device, actions[j], &isIR);
      if (code != 0) {
        JsonObject codeObj = codes.createNestedObject();
        codeObj["device"] = device;
        codeObj["action"] = actions[j];
        codeObj["code"] = String(code, HEX);
        codeObj["type"] = isIR ? "IR" : "RF";
      }
    }
  }
  
  char buf[1024];
  serializeJson(doc, buf);
  String topic = "vealive/smartmonitor/" + String(DEVICE_ID) + "/codes";
  mqtt.publish(topic.c_str(), buf);
  Serial.println("[PUBLISH] Published learned codes");
}

// -------------------------------------------------------------
// Device Controls UI
// -------------------------------------------------------------
void drawDeviceControls() {
  static bool firstDraw = true;
  static DeviceState lastAC = acState;
  static DeviceState lastDehum = dehumidifierState;
  static DeviceState lastShutters = shuttersState;
  
  bool needsUpdate = firstDraw || 
                     (acState.power != lastAC.power || acState.status != lastAC.status) ||
                     (dehumidifierState.power != lastDehum.power || dehumidifierState.status != lastDehum.status) ||
                     (shuttersState.status != lastShutters.status);
  
  if (!needsUpdate) return;
  
  // Device controls area: below sensor cards, above footer
  int controlsY = CARDS_Y + 2 * (CARD_H + GAP_Y) + 8;
  int controlsH = 52;
  int cardH = 16;
  int cardGap = 2;
  
  // Clear device controls area
  tft.fillRect(0, controlsY, W, controlsH, COL_BG);
  
  // Draw 3 device cards in a row
  int cardW = (W - 2 * MARGIN_X - 2 * cardGap) / 3;
  
  // AC card (left)
  int acX = MARGIN_X;
  drawDeviceCard(acX, controlsY, cardW, cardH, "AC", acState.power, acState.status.c_str());
  
  // Dehumidifier card (middle)
  int dehumX = MARGIN_X + cardW + cardGap;
  drawDeviceCard(dehumX, controlsY, cardW, cardH, "DEHUM", dehumidifierState.power, dehumidifierState.status.c_str());
  
  // Shutters card (right)
  int shuttersX = MARGIN_X + 2 * (cardW + cardGap);
  drawDeviceCard(shuttersX, controlsY, cardW, cardH, "SHUT", true, shuttersState.status.c_str());
  
  lastAC = acState;
  lastDehum = dehumidifierState;
  lastShutters = shuttersState;
  firstDraw = false;
}

void drawDeviceCard(int x, int y, int w, int h, const char* name, bool power, const char* status) {
  // Card background
  uint16_t bgColor = power ? COL_CARD : COL_MUTED;
  tft.fillRoundRect(x, y, w, h, 4, bgColor);
  tft.drawRoundRect(x, y, w, h, 4, COL_EDGE);
  
  // Device name (left side)
  drawLeft(x + 4, y + h/2 - 4, name, 1, COL_TEXT, bgColor);
  
  // Status (right side)
  drawRight(x + w - 4, y + h/2 - 4, status, 1, power ? COL_OK : COL_MUTED, bgColor);
  
  // Power indicator dot
  uint16_t dotColor = power ? COL_OK : COL_MUTED;
  tft.fillCircle(x + w - 12, y + h/2, 3, dotColor);
}
