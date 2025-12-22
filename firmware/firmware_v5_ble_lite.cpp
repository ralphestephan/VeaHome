// -------------------------------------------------------------
// Vealive360 SmartMonitor (ESP32) - LITE VERSION
// BLE Provisioning - Optimized for size
// 
// USE PARTITION SCHEME: "Huge APP (3MB No OTA/1MB SPIFFS)"
// In Arduino IDE: Tools > Partition Scheme > Huge APP
// -------------------------------------------------------------

#include <WiFi.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Preferences.h>
#include <DHT.h>
#include <SPI.h>
#include <TFT_eSPI.h>
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
String mqttClientId;

// -------------------------------------------------------------
// Objects
// -------------------------------------------------------------
Preferences prefs;
TFT_eSPI tft;
DHT dht(DHTPIN, DHTTYPE);
WiFiClient mqttNet;
PubSubClient mqtt(mqttNet);

BLEServer* pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;

// -------------------------------------------------------------
// State
// -------------------------------------------------------------
String ssid, password;
bool setupMode = false;
bool bleCredentialsReceived = false;
bool buzzerEnabled = true;

int tempMin = 18, tempMax = 30;
int humMin = 30, humMax = 70;
int dustThreshold = 400;
int mq2Threshold = 60;

unsigned long lastTelemetry = 0;

// Display constants
static const int W = 320;
static const int H = 240;

// Colors
static const uint16_t COL_BG = 0x0841;
static const uint16_t COL_TEXT = 0xFFFF;
static const uint16_t COL_OK = 0x07E0;
static const uint16_t COL_WARN = 0xFE60;
static const uint16_t COL_ALERT = 0xF800;

// -------------------------------------------------------------
// BLE Callbacks
// -------------------------------------------------------------
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* s) {
    Serial.println("[BLE] Connected");
    tft.fillScreen(COL_BG);
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(COL_OK);
    tft.drawString("App Connected!", W/2, H/2, 4);
  }
  
  void onDisconnect(BLEServer* s) {
    Serial.println("[BLE] Disconnected");
    if (setupMode && !bleCredentialsReceived) {
      s->startAdvertising();
    }
  }
};

class CharCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) {
    String val = c->getValue().c_str();
    Serial.printf("[BLE] RX: %s\n", val.c_str());
    
    StaticJsonDocument<256> doc;
    if (deserializeJson(doc, val)) {
      c->setValue("{\"success\":false,\"error\":\"Invalid JSON\"}");
      c->notify();
      return;
    }
    
    if (!doc.containsKey("ssid")) {
      c->setValue("{\"success\":false,\"error\":\"Missing ssid\"}");
      c->notify();
      return;
    }
    
    String newSSID = doc["ssid"].as<String>();
    String newPass = doc["password"] | "";
    
    if (newSSID.length() == 0) {
      c->setValue("{\"success\":false,\"error\":\"Empty SSID\"}");
      c->notify();
      return;
    }
    
    // Save credentials
    prefs.putString("ssid", newSSID);
    prefs.putString("pass", newPass);
    bleCredentialsReceived = true;
    
    String resp = "{\"success\":true,\"deviceId\":" + String(DEVICE_ID) + "}";
    c->setValue(resp.c_str());
    c->notify();
    
    Serial.printf("[BLE] Saved: %s\n", newSSID.c_str());
    
    tft.fillScreen(COL_BG);
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(COL_OK);
    tft.drawString("Credentials saved!", W/2, 100, 2);
    tft.setTextColor(COL_TEXT);
    tft.drawString("Connecting...", W/2, 140, 2);
  }
};

// -------------------------------------------------------------
// BLE Setup
// -------------------------------------------------------------
void startBLE() {
  setupMode = true;
  bleCredentialsReceived = false;
  
  String name = "SmartMonitor_" + String(DEVICE_ID);
  BLEDevice::init(name.c_str());
  
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());
  
  BLEService* svc = pServer->createService(SERVICE_UUID);
  pCharacteristic = svc->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharacteristic->setCallbacks(new CharCallbacks());
  pCharacteristic->addDescriptor(new BLE2902());
  
  svc->start();
  
  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
  
  Serial.printf("[BLE] Advertising: %s\n", name.c_str());
  
  // Show setup screen
  tft.fillScreen(COL_BG);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(0x001F);
  tft.drawString("BLUETOOTH", W/2, 40, 4);
  tft.setTextColor(COL_OK);
  tft.drawString("SETUP MODE", W/2, 80, 4);
  tft.setTextColor(COL_WARN);
  tft.drawString(name, W/2, 130, 4);
  tft.setTextColor(COL_TEXT);
  tft.drawString("Open VeaHome app", W/2, 180, 2);
  tft.drawString("Add Device > AirGuard", W/2, 205, 2);
  
  digitalWrite(BLUE_LED_PIN, HIGH);
}

void stopBLE() {
  if (pServer) {
    BLEDevice::deinit(true);
    pServer = nullptr;
  }
}

// -------------------------------------------------------------
// WiFi Connect
// -------------------------------------------------------------
void connectWiFi() {
  ssid = prefs.getString("ssid", "");
  password = prefs.getString("pass", "");
  
  if (ssid.length() == 0) {
    startBLE();
    return;
  }
  
  Serial.printf("[WiFi] Connecting to %s\n", ssid.c_str());
  
  tft.fillScreen(COL_BG);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(COL_TEXT);
  tft.drawString("Connecting WiFi...", W/2, 100, 2);
  tft.setTextColor(COL_WARN);
  tft.drawString(ssid, W/2, 130, 2);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    digitalWrite(BLUE_LED_PIN, !digitalRead(BLUE_LED_PIN));
    attempts++;
  }
  
  digitalWrite(BLUE_LED_PIN, LOW);
  
  if (WiFi.status() == WL_CONNECTED) {
    setupMode = false;
    stopBLE();
    
    Serial.printf("[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    
    tft.fillScreen(COL_BG);
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(COL_OK);
    tft.drawString("CONNECTED!", W/2, 100, 4);
    tft.setTextColor(COL_TEXT);
    tft.drawString(WiFi.localIP().toString(), W/2, 140, 2);
    delay(2000);
    
    mqtt.setServer(MQTT_HOST, MQTT_PORT);
    connectMQTT();
    drawMainUI();
  } else {
    Serial.println("[WiFi] Failed!");
    tft.fillScreen(COL_BG);
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(COL_ALERT);
    tft.drawString("WiFi Failed!", W/2, 100, 4);
    delay(2000);
    
    prefs.remove("ssid");
    prefs.remove("pass");
    startBLE();
  }
}

// -------------------------------------------------------------
// MQTT
// -------------------------------------------------------------
void connectMQTT() {
  if (mqtt.connected() || WiFi.status() != WL_CONNECTED) return;
  
  if (mqtt.connect(mqttClientId.c_str(), NULL, NULL, topicStatus.c_str(), 1, true, "offline")) {
    Serial.println("[MQTT] Connected");
    mqtt.publish(topicStatus.c_str(), "online", true);
  }
}

void publishTelemetry(int temp, int hum, int dust, int mq2) {
  if (!mqtt.connected()) return;
  
  StaticJsonDocument<256> doc;
  doc["id"] = DEVICE_ID;
  doc["temp"] = temp;
  doc["hum"] = hum;
  doc["dust"] = dust;
  doc["mq2"] = mq2;
  doc["rssi"] = WiFi.RSSI();
  
  char buf[256];
  serializeJson(doc, buf);
  mqtt.publish(topicTelemetry.c_str(), buf);
}

// -------------------------------------------------------------
// UI
// -------------------------------------------------------------
void drawMainUI() {
  tft.fillScreen(COL_BG);
  tft.setTextDatum(TL_DATUM);
  tft.setTextColor(COL_TEXT);
  tft.drawString("Vealive360", 10, 5, 2);
  tft.drawString("ID:" + String(DEVICE_ID), W - 60, 5, 2);
}

void updateDisplay(int temp, int hum, int dust, int mq2, bool alert) {
  // Clear data area
  tft.fillRect(0, 40, W, H - 40, COL_BG);
  
  tft.setTextDatum(MC_DATUM);
  
  // Temperature
  tft.setTextColor(temp < tempMin || temp > tempMax ? COL_WARN : COL_TEXT);
  tft.drawString(String(temp) + "C", 80, 80, 6);
  tft.setTextColor(COL_TEXT);
  tft.drawString("TEMP", 80, 120, 2);
  
  // Humidity
  tft.setTextColor(hum < humMin || hum > humMax ? COL_WARN : COL_TEXT);
  tft.drawString(String(hum) + "%", 240, 80, 6);
  tft.setTextColor(COL_TEXT);
  tft.drawString("HUM", 240, 120, 2);
  
  // Dust
  tft.setTextColor(dust > dustThreshold ? COL_WARN : COL_TEXT);
  tft.drawString(String(dust), 80, 170, 4);
  tft.setTextColor(COL_TEXT);
  tft.drawString("DUST ug/m3", 80, 200, 2);
  
  // Gas
  tft.setTextColor(mq2 > mq2Threshold ? COL_WARN : COL_TEXT);
  tft.drawString(String(mq2), 240, 170, 4);
  tft.setTextColor(COL_TEXT);
  tft.drawString("GAS ppm", 240, 200, 2);
  
  // Status
  uint16_t statusCol = alert ? COL_ALERT : COL_OK;
  tft.fillCircle(W - 20, 220, 8, statusCol);
}

// -------------------------------------------------------------
// Setup
// -------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  
  // Build topics
  String id = String(DEVICE_ID);
  topicTelemetry = "vealive/smartmonitor/" + id + "/telemetry";
  topicStatus = "vealive/smartmonitor/" + id + "/status";
  mqttClientId = "SM" + id + "_" + String((uint32_t)ESP.getEfuseMac(), HEX);
  
  // TFT
  tft.init();
  tft.setRotation(1);
  tft.fillScreen(COL_BG);
  
  // Sensors
  dht.begin();
  
  // Pins
  pinMode(DUSTLEDPIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(BLUE_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);
  
  // Preferences
  prefs.begin("monitor", false);
  
  // Load thresholds
  tempMin = prefs.getInt("tempMin", 18);
  tempMax = prefs.getInt("tempMax", 30);
  humMin = prefs.getInt("humMin", 30);
  humMax = prefs.getInt("humMax", 70);
  dustThreshold = prefs.getInt("dustHigh", 400);
  mq2Threshold = prefs.getInt("mq2High", 60);
  buzzerEnabled = prefs.getBool("buzzer", true);
  
  // Connect or start BLE
  connectWiFi();
}

// -------------------------------------------------------------
// Loop
// -------------------------------------------------------------
void loop() {
  // Check reset button (3s hold)
  static uint32_t resetStart = 0;
  if (digitalRead(RESET_BUTTON_PIN) == LOW) {
    if (resetStart == 0) resetStart = millis();
    if (millis() - resetStart > 3000) {
      Serial.println("RESET!");
      prefs.remove("ssid");
      prefs.remove("pass");
      ESP.restart();
    }
  } else {
    resetStart = 0;
  }
  
  // Setup mode - wait for BLE credentials
  if (setupMode) {
    if (bleCredentialsReceived) {
      delay(500);
      connectWiFi();
    }
    digitalWrite(BLUE_LED_PIN, (millis() / 500) % 2);
    return;
  }
  
  // Normal mode
  mqtt.loop();
  
  if (!mqtt.connected()) {
    connectMQTT();
  }
  
  // Read sensors every 2s
  if (millis() - lastTelemetry >= 2000) {
    float tf = dht.readTemperature();
    float hf = dht.readHumidity();
    
    if (!isnan(tf) && !isnan(hf)) {
      // Dust
      digitalWrite(DUSTLEDPIN, LOW);
      delayMicroseconds(280);
      int dustRaw = analogRead(DUSTPIN);
      digitalWrite(DUSTLEDPIN, HIGH);
      float dustV = dustRaw * (3.3f / 4095.0f);
      int dust = (int)fabs((dustV - 0.6f) * 200.0f);
      
      // Gas
      float mq2V = analogRead(MQ2PIN) * (3.3f / 4095.0f);
      int mq2 = (int)(mq2V * 1000.0f);
      
      int temp = (int)roundf(tf);
      int hum = (int)roundf(hf);
      
      // Check alerts
      bool alert = (temp < tempMin || temp > tempMax ||
                    hum < humMin || hum > humMax ||
                    dust > dustThreshold || mq2 > mq2Threshold);
      
      // Buzzer
      if (alert && buzzerEnabled) {
        digitalWrite(BUZZER_PIN, (millis() / 400) % 2);
      } else {
        digitalWrite(BUZZER_PIN, LOW);
      }
      
      // LEDs
      digitalWrite(RED_LED_PIN, alert);
      digitalWrite(GREEN_LED_PIN, !alert && WiFi.status() == WL_CONNECTED);
      
      // Update display
      updateDisplay(temp, hum, dust, mq2, alert);
      
      // Publish
      publishTelemetry(temp, hum, dust, mq2);
      lastTelemetry = millis();
    }
  }
  
  // WiFi recovery
  if (WiFi.status() != WL_CONNECTED) {
    static uint32_t wifiLost = 0;
    if (wifiLost == 0) wifiLost = millis();
    if (millis() - wifiLost > 30000) {
      wifiLost = 0;
      startBLE();
    }
  }
}
