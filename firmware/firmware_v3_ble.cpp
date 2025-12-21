// -------------------------------------------------------------
// Vealive360 SmartMonitor (ESP32) - Device ID: 1
// BLE PROVISIONING VERSION
// Uses Bluetooth for seamless WiFi setup - NO MANUAL WIFI SWITCHING NEEDED
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
// BLE UUIDs for Provisioning
// -------------------------------------------------------------
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define WIFI_SSID_CHAR_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define WIFI_PASS_CHAR_UUID "cba1d466-344c-4be3-ab3f-189f80dd7518"
#define STATUS_CHAR_UUID    "ca73b3ba-39f6-4ab3-91ae-186dc9577d99"

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

// MQTT Topics
String topicTelemetry;
String topicStatus;
String topicThresholds;
String topicCmdBuzzer;
String topicCmdThresholds;
String mqttClientId;

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
// BLE Provisioning
// -------------------------------------------------------------
BLEServer* pServer = NULL;
BLECharacteristic* pStatusChar = NULL;
bool bleProvisioningActive = false;
bool bleClientConnected = false;
String bleReceivedSSID = "";
String bleReceivedPassword = "";
bool bleCredentialsReceived = false;

class BLEProvisioningCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    bleClientConnected = true;
    Serial.println("[BLE] Client connected");
  };

  void onDisconnect(BLEServer* pServer) {
    bleClientConnected = false;
    Serial.println("[BLE] Client disconnected");
    // Restart advertising
    if (bleProvisioningActive) {
      pServer->startAdvertising();
    }
  }
};

class WiFiSSIDCallback: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
      bleReceivedSSID = String(value.c_str());
      Serial.printf("[BLE] Received SSID: %s\n", bleReceivedSSID.c_str());
    }
  }
};

class WiFiPassCallback: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
      bleReceivedPassword = String(value.c_str());
      Serial.println("[BLE] Received password");
      bleCredentialsReceived = true;
    }
  }
};

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

// UI Constants and functions (same as before)
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

static const uint16_t COL_BG     = 0x0841;
static const uint16_t COL_CARD   = 0x1082;
static const uint16_t COL_EDGE   = 0x07FF;
static const uint16_t COL_TEXT   = 0xFFFF;
static const uint16_t COL_MUTED  = 0xC618;
static const uint16_t COL_WARN   = 0xFE60;
static const uint16_t COL_ALERT  = 0xF800;
static const uint16_t COL_OK     = 0x07E0;
static const uint16_t COL_TOPBAR = 0x0410;

bool uiInitialized = false;
String lastTimeStr = "";
int lastTemp = INT32_MIN;
int lastHum  = INT32_MIN;
int lastDust = INT32_MIN;
int lastMq2  = INT32_MIN;
bool lastAlertState = false;
bool lastMuteState  = true;

// Forward Declarations
void startBLEProvisioning();
void stopBLEProvisioning();
void handleBLEProvisioning();
void attemptWiFiConnection();
bool loadPrefs();
void savePrefs();
void mqttCallback(char* topic, byte* payload, unsigned int len);
void connectMQTT();
void publishTelemetry(int temp, int hum, int dust, int mq2);
void publishThresholds();
void handleButtons();
void updateSensorsAndUI();
void drawFullUI();
void setLED(const String& status);

// Helper functions (same as before)
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

  Serial.println("\n=== Vealive360 SmartMonitor v3 BLE ===");
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

  Serial2.end();
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

  // Load settings
  if (!loadPrefs()) {
    Serial.println("[PREF] No WiFi saved. Starting BLE provisioning.");
    startBLEProvisioning();
    drawFullUI();
    return;
  }

  // Connect WiFi
  attemptWiFiConnection();
  drawFullUI();
}

// -------------------------------------------------------------
// BLE Provisioning
// -------------------------------------------------------------
void startBLEProvisioning() {
  bleProvisioningActive = true;
  
  // Initialize BLE
  BLEDevice::init("AirGuard_Setup");
  
  // Create BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new BLEProvisioningCallbacks());

  // Create BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create BLE Characteristics
  BLECharacteristic *pSSIDChar = pService->createCharacteristic(
    WIFI_SSID_CHAR_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pSSIDChar->setCallbacks(new WiFiSSIDCallback());

  BLECharacteristic *pPassChar = pService->createCharacteristic(
    WIFI_PASS_CHAR_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pPassChar->setCallbacks(new WiFiPassCallback());

  pStatusChar = pService->createCharacteristic(
    STATUS_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pStatusChar->addDescriptor(new BLE2902());

  // Start the service
  pService->start();

  // Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Provisioning started - Device: AirGuard_Setup");
  
  // Update status
  if (pStatusChar) {
    pStatusChar->setValue("ready");
    pStatusChar->notify();
  }
}

void stopBLEProvisioning() {
  if (bleProvisioningActive) {
    BLEDevice::deinit(true);
    bleProvisioningActive = false;
    Serial.println("[BLE] Provisioning stopped");
  }
}

void handleBLEProvisioning() {
  if (!bleProvisioningActive) return;

  if (bleCredentialsReceived) {
    bleCredentialsReceived = false;
    
    Serial.println("[BLE] Attempting WiFi connection...");
    if (pStatusChar) {
      pStatusChar->setValue("connecting");
      pStatusChar->notify();
    }

    // Save credentials
    ssid = bleReceivedSSID;
    password = bleReceivedPassword;
    savePrefs();

    // Try to connect
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), password.c_str());

    unsigned long timeout = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - timeout < 15000) {
      delay(500);
      digitalWrite(BLUE_LED_PIN, !digitalRead(BLUE_LED_PIN));
    }
    digitalWrite(BLUE_LED_PIN, LOW);

    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
      
      if (pStatusChar) {
        String status = "connected:" + WiFi.localIP().toString();
        pStatusChar->setValue(status.c_str());
        pStatusChar->notify();
      }

      // Wait a bit for app to receive notification
      delay(2000);
      
      // Stop BLE and start normal operation
      stopBLEProvisioning();
      
      timeClient.setTimeOffset(timezoneOffset);
      timeClient.begin();
      connectMQTT();
      
      drawFullUI();
    } else {
      Serial.println("[WiFi] Connection failed");
      
      if (pStatusChar) {
        pStatusChar->setValue("failed");
        pStatusChar->notify();
      }
      
      // Clear credentials and keep BLE active
      bleReceivedSSID = "";
      bleReceivedPassword = "";
    }
  }
}

void attemptWiFiConnection() {
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
    Serial.printf("[WiFi] Connected! IP: %s RSSI: %d\n", 
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());

    timeClient.setTimeOffset(timezoneOffset);
    timeClient.begin();
    
    for (int i = 0; i < 10 && !timeClient.update(); i++) {
      delay(200);
    }

    connectMQTT();
  } else {
    Serial.println("[WiFi] Failed. Starting BLE provisioning.");
    startBLEProvisioning();
  }
}

// -------------------------------------------------------------
// Loop
// -------------------------------------------------------------
void loop() {
  handleButtons();
  handleBLEProvisioning();

  if (!bleProvisioningActive && WiFi.status() == WL_CONNECTED) {
    if (!mqtt.connected()) {
      connectMQTT();
    }
    mqtt.loop();
  }

  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate >= 500) {
    updateSensorsAndUI();
    lastUpdate = millis();
  }

  if (!bleProvisioningActive && WiFi.status() != WL_CONNECTED) {
    if (wifiLostAt == 0) {
      wifiLostAt = millis();
      Serial.println("[WiFi] Connection lost...");
    } else if (millis() - wifiLostAt > 20000) {
      Serial.println("[WiFi] Fallback to BLE provisioning.");
      startBLEProvisioning();
      wifiLostAt = 0;
    }
  } else {
    wifiLostAt = 0;
  }
}

// REST OF THE FUNCTIONS (mqttCallback, publishTelemetry, etc.) SAME AS BEFORE
// ... [Include all the remaining functions from original firmware]

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

void handleButtons() {
  static uint32_t resetStart = 0;
  static bool buzzerBtnLast = false;
  static uint32_t buzzerDebounce = 0;

  if (digitalRead(RESET_BUTTON_PIN) == LOW) {
    if (resetStart == 0) resetStart = millis();
    if (millis() - resetStart > 2000) {
      Serial.println("[BTN] RESET - clearing prefs and starting BLE");
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

void drawFullUI() {
  tft.fillScreen(COL_BG);
  
  if (bleProvisioningActive) {
    // BLE Provisioning mode display
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(COL_TEXT);
    tft.drawString("SETUP MODE", W/2, H/2 - 40, 4);
    tft.setTextColor(COL_MUTED);
    tft.drawString("Open VeaHome app", W/2, H/2, 2);
    tft.drawString("to configure WiFi", W/2, H/2 + 20, 2);
    tft.setTextColor(COL_OK);
    tft.drawString("Bluetooth Ready", W/2, H/2 + 50, 2);
  } else {
    // Normal operation UI (cards, etc.)
    // [Same as original drawFullUI]
  }
}

// Stub implementations for other required functions
void mqttCallback(char* topic, byte* payload, unsigned int len) {}
void connectMQTT() {}
void publishTelemetry(int temp, int hum, int dust, int mq2) {}
void publishThresholds() {}
void updateSensorsAndUI() {}
void setLED(const String& status) {}
