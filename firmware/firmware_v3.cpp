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
void setLED(const String& status);

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

  Serial.println("\n=== Vealive360 SmartMonitor v3 ===");
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
    Serial.println("[PREF] No WiFi saved. Starting AP.");
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
// Loop
// -------------------------------------------------------------
void loop() {
  // Handle buttons
  handleButtons();

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
      
      if (state == "ON" || state == "1" || state == "TRUE") {
        buzzerEnabled = true;
        Serial.println("[MQTT] Buzzer => ON");
      } else if (state == "OFF" || state == "0" || state == "FALSE") {
        buzzerEnabled = false;
        digitalWrite(BUZZER_PIN, LOW);
        Serial.println("[MQTT] Buzzer => OFF (muted)");
      }
      
      prefs.putBool("buzzer", buzzerEnabled);
      forceTelemetryPublish = true;
      lastMuteState = !lastMuteState; // Force UI update
    }
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

    Serial.printf("[MQTT] Subscribed:\n  - %s\n  - %s\n", 
                  topicCmdBuzzer.c_str(), topicCmdThresholds.c_str());

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
  drawTopBar();
  
  // Draw card frames
  for (int i = 0; i < 4; i++) {
    int x = MARGIN_X + i * (CARD_W + GAP_X);
    tft.fillRoundRect(x, CARDS_Y, CARD_W, CARD_H, 8, COL_CARD);
    tft.drawRoundRect(x, CARDS_Y, CARD_W, CARD_H, 8, COL_EDGE);
  }

  // Card labels
  const char* labels[] = {"TEMP", "HUM", "DUST", "GAS"};
  const char* units[]  = {"C", "%", "ug", "ppm"};
  
  for (int i = 0; i < 4; i++) {
    int x = MARGIN_X + i * (CARD_W + GAP_X);
    drawCentered(x + CARD_W/2, CARDS_Y + CARD_H - 10, labels[i], 1, COL_MUTED, COL_CARD);
    drawRight(x + CARD_W - 4, CARDS_Y + 4, units[i], 1, COL_MUTED, COL_CARD);
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
  tft.fillRect(0, 0, W, TOP_H, COL_TOPBAR);
  tft.drawFastHLine(0, TOP_H - 1, W, COL_EDGE);
  
  drawLeft(8, 6, "Vealive360", 2, COL_TEXT, COL_TOPBAR);
  drawRight(W - 8, 6, "ID:" + String(DEVICE_ID), 2, COL_TEXT, COL_TOPBAR);
}

void drawHeader(const String& timeStr, bool alert) {
  bool timeChanged = (timeStr != lastTimeStr);
  bool alertChanged = (alert != lastAlertState);

  if (!timeChanged && !alertChanged) return;

  // Clear header area
  tft.fillRect(0, TOP_H, W, HEAD_H, COL_BG);

  if (apModeActive) {
    // Setup mode display
    tft.fillRoundRect(10, TOP_H + 4, W - 20, HEAD_H - 8, 8, COL_CARD);
    tft.drawRoundRect(10, TOP_H + 4, W - 20, HEAD_H - 8, 8, COL_EDGE);
    
    drawLeft(20, TOP_H + 10, "SETUP MODE", 2, COL_WARN, COL_CARD);
    drawLeft(20, TOP_H + 28, "WiFi: SmartMonitor_Setup", 2, COL_MUTED, COL_CARD);
  } else {
    // Time display
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(COL_TEXT, COL_BG);
    tft.drawString(timeStr, W/2, TOP_H + HEAD_H/2, 6);

    // Status pill
    int pillW = 90;
    int pillH = 20;
    int pillX = W - pillW - 10;
    int pillY = TOP_H + HEAD_H - pillH - 8;

    uint16_t pillBg = alert ? COL_ALERT : COL_OK;
    tft.fillRoundRect(pillX, pillY, pillW, pillH, 10, pillBg);
    
    String statusText = alert ? "ALERT" : "OK";
    drawCentered(pillX + pillW/2, pillY + pillH/2, statusText, 2, COL_TEXT, pillBg);

    // Status dot
    uint16_t dotColor = alert ? COL_ALERT : COL_OK;
    tft.fillCircle(15, TOP_H + HEAD_H/2, 6, dotColor);
  }

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
    
    // Clear value area
    tft.fillRect(x + 2, CARDS_Y + 16, CARD_W - 4, CARD_H - 34, COL_CARD);

    // Draw value with color based on alert
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
  
  String footerStr;
  if (apModeActive) {
    footerStr = "AP: 192.168.4.1";
  } else {
    String shortSsid = ssid;
    if (shortSsid.length() > 12) {
      shortSsid = shortSsid.substring(0, 11) + "..";
    }
    footerStr = shortSsid + " " + String(WiFi.RSSI()) + "dBm";
  }

  if (footerStr == lastFooterStr) return;

  tft.fillRect(0, H - FOOT_H + 1, W - 50, FOOT_H - 1, COL_BG);
  drawLeft(8, H - FOOT_H + 4, footerStr, 2, COL_MUTED, COL_BG);
  
  lastFooterStr = footerStr;
}

void drawMuteIcon(bool muted) {
  int ix = W - 36;
  int iy = H - FOOT_H + 2;
  int iw = 32;
  int ih = FOOT_H - 4;

  // Clear area
  tft.fillRect(ix, iy, iw, ih, COL_BG);

  if (muted) {
    // Draw muted speaker icon
    uint16_t col = COL_WARN;
    
    // Speaker body
    tft.fillRect(ix + 4, iy + 5, 6, 6, col);
    tft.fillTriangle(ix + 10, iy + 8, ix + 18, iy + 2, ix + 18, iy + 14, col);
    
    // X mark
    tft.drawLine(ix + 20, iy + 4, ix + 28, iy + 12, COL_ALERT);
    tft.drawLine(ix + 20, iy + 5, ix + 28, iy + 13, COL_ALERT);
    tft.drawLine(ix + 28, iy + 4, ix + 20, iy + 12, COL_ALERT);
    tft.drawLine(ix + 28, iy + 5, ix + 20, iy + 13, COL_ALERT);
  } else {
    // Draw speaker with waves
    uint16_t col = COL_OK;
    
    // Speaker body
    tft.fillRect(ix + 4, iy + 5, 6, 6, col);
    tft.fillTriangle(ix + 10, iy + 8, ix + 18, iy + 2, ix + 18, iy + 14, col);
    
    // Sound waves
    tft.drawArc(ix + 18, iy + 8, 6, 4, 315, 45, col, COL_BG);
    tft.drawArc(ix + 18, iy + 8, 10, 8, 315, 45, col, COL_BG);
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
