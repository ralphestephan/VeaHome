// -------------------------------------------------------------
// Vealive360 SmartMonitor (ESP32) - Device ID: 1
// AP MODE Version - HTTP WiFi Provisioning (NO SmartConfig)
// TFT: 240x320 (ILI9341) using TFT_eSPI
//
// SETUP MODE:
//   - Device creates AP: "SmartMonitor_Setup"
//   - Phone connects to AP
//   - App POSTs credentials to http://192.168.4.1/api/provision
//   - Device saves credentials and reboots
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
//
// === HTTP PROVISIONING API ===
// POST /api/provision
// Content-Type: application/json
// {"ssid":"YourNetwork","password":"YourPassword"}
//
// Response: {"success":true,"message":"Credentials saved. Rebooting..."}
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

// AP Mode Settings
static const char* AP_SSID = "SmartMonitor_Setup";
static const char* AP_PASSWORD = "";  // Open network for easier access

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
Preferences prefs;
WebServer server(80);
DNSServer dnsServer;

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
void startAPMode();
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
void handleProvisionRequest();
void handleRoot();

// -------------------------------------------------------------
// HTTP Handlers
// -------------------------------------------------------------
void handleRoot() {
  String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<style>body{font-family:Arial;margin:20px;background:#1a1a2e;color:#eee;}";
  html += "h1{color:#00d4ff;}input,button{display:block;width:100%;padding:12px;margin:10px 0;font-size:16px;border-radius:5px;}";
  html += "button{background:#00d4ff;color:#000;border:none;cursor:pointer;font-weight:bold;}";
  html += "button:hover{background:#00a8cc;}</style></head><body>";
  html += "<h1>SmartMonitor Setup</h1>";
  html += "<form id='f'><label>WiFi Network:</label>";
  html += "<input id='s' placeholder='Network Name (SSID)'>";
  html += "<label>Password:</label><input id='p' type='password' placeholder='WiFi Password'>";
  html += "<button type='submit'>Save & Connect</button></form>";
  html += "<div id='m'></div>";
  html += "<script>document.getElementById('f').onsubmit=function(e){";
  html += "e.preventDefault();var s=document.getElementById('s').value;";
  html += "var p=document.getElementById('p').value;";
  html += "fetch('/api/provision',{method:'POST',headers:{'Content-Type':'application/json'},";
  html += "body:JSON.stringify({ssid:s,password:p})}).then(r=>r.json()).then(d=>{";
  html += "document.getElementById('m').innerHTML='<p style=\"color:#0f0\">'+d.message+'</p>';";
  html += "setTimeout(()=>{window.location.href='http://192.168.4.1';},3000);";
  html += "}).catch(e=>{document.getElementById('m').innerHTML='<p style=\"color:#f00\">Error: '+e+'</p>';});};";
  html += "</script></body></html>";
  
  server.send(200, "text/html", html);
}

void handleProvisionRequest() {
  if (server.method() != HTTP_POST) {
    server.send(405, "application/json", "{\"success\":false,\"message\":\"Method not allowed\"}");
    return;
  }

  String body = server.arg("plain");
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, body);

  if (err) {
    server.send(400, "application/json", "{\"success\":false,\"message\":\"Invalid JSON\"}");
    return;
  }

  if (!doc.containsKey("ssid") || !doc.containsKey("password")) {
    server.send(400, "application/json", "{\"success\":false,\"message\":\"Missing ssid or password\"}");
    return;
  }

  String newSSID = doc["ssid"].as<String>();
  String newPass = doc["password"].as<String>();

  if (newSSID.length() == 0) {
    server.send(400, "application/json", "{\"success\":false,\"message\":\"SSID cannot be empty\"}");
    return;
  }

  // Save credentials
  prefs.putString("ssid", newSSID);
  prefs.putString("pass", newPass);

  Serial.printf("[AP] Credentials saved: %s\n", newSSID.c_str());

  // Show success on display
  tft.fillScreen(COL_BG);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(COL_OK);
  tft.drawString("SUCCESS!", W/2, 90, 4);
  tft.setTextColor(COL_TEXT);
  tft.drawString("WiFi configured!", W/2, 130, 2);
  tft.drawString("Restarting...", W/2, 155, 2);

  // Send response
  server.send(200, "application/json", "{\"success\":true,\"message\":\"Credentials saved. Rebooting...\"}");

  delay(1000);
  ESP.restart();
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

// Get signal strength bars (0-4) based on RSSI
static int getSignalBars(int rssi) {
  if (rssi >= -50) return 4;
  if (rssi >= -60) return 3;
  if (rssi >= -70) return 2;
  if (rssi >= -80) return 1;
  return 0;
}

// Display Setup Mode UI
void showSetupModeUI() {
  tft.fillScreen(COL_BG);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(COL_OK);
  tft.drawString("SETUP MODE", W/2, 50, 4);
  
  tft.setTextColor(COL_TEXT);
  tft.drawString("WiFi Network:", W/2, 90, 2);
  tft.setTextColor(COL_WARN);
  tft.drawString(AP_SSID, W/2, 110, 4);
  
  tft.setTextColor(COL_MUTED);
  tft.drawString("1. Connect phone to network above", W/2, 145, 2);
  tft.drawString("2. Open VeaHome app", W/2, 165, 2);
  tft.drawString("3. Add Device > AirGuard", W/2, 185, 2);
  tft.drawString("4. Enter your WiFi password", W/2, 205, 2);
  
  tft.setTextColor(COL_TEXT);
  tft.drawString("Waiting...", W/2, 230, 2);
}

// Start Access Point Mode
void startAPMode() {
  Serial.println("[AP] Starting Access Point mode...");
  setupMode = true;

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASSWORD);
  
  IPAddress ip = WiFi.softAPIP();
  Serial.printf("[AP] Access Point created: %s\n", AP_SSID);
  Serial.printf("[AP] IP Address: %s\n", ip.toString().c_str());
  Serial.println("[AP] Provisioning URL: http://192.168.4.1/api/provision");

  // Setup DNS server for captive portal
  dnsServer.start(53, "*", ip);

  // Setup HTTP server routes
  server.on("/", HTTP_GET, handleRoot);
  server.on("/api/provision", HTTP_POST, handleProvisionRequest);
  server.onNotFound(handleRoot);  // Captive portal redirect
  server.begin();

  Serial.println("[AP] HTTP server started on port 80");

  // Show setup mode UI
  showSetupModeUI();

  // Blink blue LED
  digitalWrite(BLUE_LED_PIN, HIGH);
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

  Serial.println("\n=== Vealive360 SmartMonitor v4 (AP Mode) ===");
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
    Serial.println("[AP] No WiFi credentials found");
    startAPMode();
    return;
  }

  // Load settings
  if (!loadPrefs()) {
    Serial.println("[AP] Failed to load credentials");
    startAPMode();
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
    setupMode = false;
    Serial.printf("[WiFi] Connected! IP: %s RSSI: %d\n", 
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());

    timeClient.setTimeOffset(timezoneOffset);
    timeClient.begin();
    
    // Try to get time
    for (int i = 0; i < 10 && !timeClient.update(); i++) {
      delay(200);
    }

    connectMQTT();
    drawFullUI();
  } else {
    Serial.println("[WiFi] Connection failed");
    startAPMode();
  }
}

// -------------------------------------------------------------
// Loop
// -------------------------------------------------------------
void loop() {
  // Handle Setup Mode
  if (setupMode) {
    dnsServer.processNextRequest();
    server.handleClient();
    
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
      Serial.println("[WiFi] Fallback to AP mode");
      startAPMode();
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
      
      // Clear WiFi credentials only
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
