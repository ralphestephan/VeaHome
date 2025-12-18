// -------------------------------------------------------------
// Vealive360 SmartMonitor (ESP32) - Device ID: 1
// TFT: 240x320 (ILI9341) using TFT_eSPI
//
// MQTT Broker: 63.34.243.171:1883
// 
// === MQTT TOPICS ===
//
// PUBLISH (ESP -> App/Node-RED):
//   vealive/smartmonitor/1/telemetry       - Full sensor data + per-stat alerts (retained)
//   vealive/smartmonitor/1/status          - LWT: "online" / "offline" (retained)
//   vealive/smartmonitor/1/last_command    - Last command received (retained)
//   vealive/smartmonitor/1/thresholds      - Current threshold config (retained)
//
// SUBSCRIBE (App -> ESP):
//   vealive/smartmonitor/1/command/buzzer      - {"state":"ON"} or {"state":"OFF"}
//   vealive/smartmonitor/1/command/thresholds  - Set new thresholds from app
//   vealive/smartmonitor/1/command/get_config  - Request current thresholds
//
// === TELEMETRY JSON FORMAT ===
// {
//   "id": 1,
//   "temp": 25,
//   "hum": 55,
//   "dust": 120,
//   "mq2": 40,
//   "alert": true,                    // ANY threshold breached
//   "alerts": {                       // WHICH stats are breaching
//     "temp": true,
//     "hum": false,
//     "dust": false,
//     "mq2": true
//   },
//   "thresholds": {                   // Current thresholds
//     "tempMin": 20,
//     "tempMax": 28,
//     "humMin": 30,
//     "humMax": 60,
//     "dust": 400,
//     "mq2": 60
//   },
//   "buzzer": true,
//   "ssid": "MyWiFi",
//   "rssi": -45,
//   "uptime": 12345
// }
//
// === SET THRESHOLDS JSON FORMAT ===
// Publish to: vealive/smartmonitor/1/command/thresholds
// {
//   "tempMin": 18,
//   "tempMax": 30,
//   "humMin": 25,
//   "humMax": 70,
//   "dust": 300,
//   "mq2": 80
// }
// (All fields optional - only provided fields are updated)
//
// -------------------------------------------------------------

#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <WiFiClientSecure.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <DHT.h>
#include <SPI.h>
#include <TFT_eSPI.h>
#include "esp_wifi.h"
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <set>
#include <math.h>

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
#define RESET_BUTTON_PIN     17  // TX2
#define BUZZER_BUTTON_PIN    16  // RX2

// -------------------------------------------------------------
// Device / MQTT
// -------------------------------------------------------------
static const int   DEVICE_ID = 1;
static const char* MQTT_HOST = "63.34.243.171";
static const int   MQTT_PORT = 1883;

// MQTT Topics
static String topicTelemetry;
static String topicStatus;
static String topicLastCmd;
static String topicThresholds;      // Publish current thresholds
static String topicCmdBuzzer;       // Subscribe: buzzer control
static String topicCmdThresholds;   // Subscribe: set thresholds from app
static String topicCmdGetConfig;    // Subscribe: request current config

static String mqttClientId;

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
// Settings (prefs) - These can now be updated via MQTT!
// -------------------------------------------------------------
String ssid, password, email;

int tempMin       = 20;
int tempMax       = 28;
int humMin        = 30;
int humMax        = 60;
int dustThreshold = 400;
int mq2Threshold  = 60;

int timezoneOffset       = 10800;  // seconds (GMT+3 default)
int mq2AlertInterval     = 10;     // seconds
int tempHumAlertInterval = 180;    // seconds
int dustAlertInterval    = 10;     // seconds

bool buzzerEnabled = true;

// -------------------------------------------------------------
// Runtime - Track which specific alerts are active
// -------------------------------------------------------------
bool apModeActive        = false;
bool alertActive         = false;

// Per-stat alert flags (NEW!)
bool alertTemp = false;
bool alertHum  = false;
bool alertDust = false;
bool alertMq2  = false;

unsigned long wifiLostAt = 0;
unsigned long lastMqttAttempt = 0;
unsigned long lastMqttPublish = 0;
unsigned long lastThresholdPublish = 0;

unsigned long lastBeepTime = 0;
bool beepState = false;

static const uint32_t TELEMETRY_PERIOD_MS = 1000;
static const uint32_t THRESHOLD_PUBLISH_PERIOD_MS = 30000; // Publish thresholds every 30s

// Flag to force threshold publish (after update)
bool forceThresholdPublish = false;

// -------------------------------------------------------------
// UI (LANDSCAPE 320x240)
// -------------------------------------------------------------
static const int W = 320;
static const int H = 240;

static const int TOP_H    = 26;
static const int HEAD_H   = 52;
static const int FOOT_H   = 18;

static const int CARDS_Y  = TOP_H + HEAD_H + 4;
static const int CARDS_H  = H - FOOT_H - CARDS_Y - 4;

static const int MARGIN_X = 10;
static const int GAP_X    = 8;

static const int CARD_W   = (W - (2 * MARGIN_X) - (3 * GAP_X)) / 4;
static const int CARD_H   = CARDS_H;

static const uint16_t COL_BG     = 0x0862;
static const uint16_t COL_CARD   = 0x1148;
static const uint16_t COL_EDGE   = TFT_CYAN;
static const uint16_t COL_TEXT   = TFT_WHITE;
static const uint16_t COL_MUTED  = TFT_LIGHTGREY;
static const uint16_t COL_WARN   = TFT_YELLOW;
static const uint16_t COL_ALERT  = TFT_RED;
static const uint16_t COL_OK     = TFT_GREEN;
static const uint16_t COL_TOPBAR = TFT_DARKCYAN;
static const uint16_t COL_TEXT_DIM = TFT_DARKGREY;

enum UiMode { UI_SETUP, UI_LIVE };
UiMode uiModeDrawn = UI_SETUP;
bool uiStaticDrawn = false;

String lastTimeStr = "";
bool   lastAlert = false;
bool   lastMuted = false;
String lastFooter = "";

int lastTemp = INT32_MIN;
int lastHum  = INT32_MIN;
int lastDust = INT32_MIN;
int lastMq2  = INT32_MIN;

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
static inline String truncSsid(const String& s, int maxLen) {
  if ((int)s.length() <= maxLen) return s;
  return s.substring(0, maxLen - 1) + "...";
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

static void drawCenteredT(int x, int y, const String& s, int font, uint16_t fg) {
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(fg);
  tft.drawString(s, x, y, font);
}

static void drawLeftT(int x, int y, const String& s, int font, uint16_t fg) {
  tft.setTextDatum(TL_DATUM);
  tft.setTextColor(fg);
  tft.drawString(s, x, y, font);
}

static void drawRightT(int x, int y, const String& s, int font, uint16_t fg) {
  tft.setTextDatum(TR_DATUM);
  tft.setTextColor(fg);
  tft.drawString(s, x, y, font);
}

static void drawMuteIcon(bool muted) {
  const int ix = W - 34;
  const int topY = H - FOOT_H - 26;
  const int bottomY = topY + 24;

  tft.fillRect(ix - 4, topY, 36, 26, COL_BG);

  if (!muted) return;

  const uint16_t spk = TFT_WHITE;
  const uint16_t slash = TFT_RED;

  tft.fillRect(ix, bottomY - 18, 6, 12, spk);
  tft.fillTriangle(ix + 6, bottomY - 12, ix + 18, bottomY - 22, ix + 18, bottomY - 2, spk);

  tft.drawLine(ix - 2, bottomY - 2, ix + 24, bottomY - 24, slash);
  tft.drawLine(ix - 1, bottomY - 2, ix + 25, bottomY - 24, slash);
}

// -------------------------------------------------------------
// Forward declarations
// -------------------------------------------------------------
void startAPMode();
void launchCaptivePortal();
bool loadPrefs();
void savePrefs();

void mqttCallback(char* topic, byte* payload, unsigned int length);
void connectMQTT();
void publishTelemetry(int temp, int hum, int dust, int mq2);
void publishThresholds();

void updateSensorsAndUI();
void handleButtons();

void drawStaticUI(UiMode mode);
void drawHeader(UiMode mode, const String& timeStr, bool alert);
void drawCards(int temp, int hum, int dust, int mq2);
void drawFooter(UiMode mode);

void setLED(const String& status);
void sendAlert(const String& topic);

static inline void forceTelemetrySoon() { lastMqttPublish = 0; }

// -------------------------------------------------------------
// Setup
// -------------------------------------------------------------
void setup() {
  esp_wifi_set_ps(WIFI_PS_NONE);
  WiFi.setTxPower(WIFI_POWER_19_5dBm);
  WiFi.setSleep(false);

  Serial.begin(115200);
  delay(200);

  // Build MQTT topics
  String devId = String(DEVICE_ID);
  topicTelemetry     = "vealive/smartmonitor/" + devId + "/telemetry";
  topicStatus        = "vealive/smartmonitor/" + devId + "/status";
  topicLastCmd       = "vealive/smartmonitor/" + devId + "/last_command";
  topicThresholds    = "vealive/smartmonitor/" + devId + "/thresholds";
  topicCmdBuzzer     = "vealive/smartmonitor/" + devId + "/command/buzzer";
  topicCmdThresholds = "vealive/smartmonitor/" + devId + "/command/thresholds";
  topicCmdGetConfig  = "vealive/smartmonitor/" + devId + "/command/get_config";

  // Unique client ID
  uint64_t mac = ESP.getEfuseMac();
  char macTail[9];
  snprintf(macTail, sizeof(macTail), "%08X", (uint32_t)(mac & 0xFFFFFFFF));
  mqttClientId = "SM_" + devId + "_" + String(macTail);

  Serial.println();
  Serial.println("=== Vealive360 SmartMonitor v2 boot ===");
  Serial.printf("Device ID: %d\n", DEVICE_ID);
  Serial.printf("MQTT clientId: %s\n", mqttClientId.c_str());
  Serial.println("New features: App-controlled thresholds, per-stat alerts");

  // TFT
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

  // prefs
  prefs.begin("monitor", false);

  // MQTT
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setKeepAlive(6);
  mqtt.setSocketTimeout(3);

  // Load settings
  if (!loadPrefs()) {
    Serial.println("[PREF] No saved WiFi. Starting AP setup.");
    startAPMode();
    return;
  }

  // Try STA
  Serial.printf("[WiFi] Connecting to SSID: %s\n", ssid.c_str());
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());

  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 12000) {
    delay(250);
    digitalWrite(BLUE_LED_PIN, !digitalRead(BLUE_LED_PIN));
  }
  digitalWrite(BLUE_LED_PIN, LOW);

  if (WiFi.status() == WL_CONNECTED) {
    apModeActive = false;
    Serial.printf("[WiFi] Connected. IP: %s RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());

    timeClient.setUpdateInterval(3600000);
    timeClient.begin();
    timeClient.setTimeOffset(timezoneOffset);
    unsigned long start = millis();
    while (!timeClient.update() && millis() - start < 5000) delay(50);

    connectMQTT();
  } else {
    Serial.println("[WiFi] Failed to connect. Starting AP setup.");
    startAPMode();
    return;
  }

  uiStaticDrawn = false;
  updateSensorsAndUI();
}

// -------------------------------------------------------------
// Loop
// -------------------------------------------------------------
void loop() {
  // buttons
  static unsigned long lastBtn = 0;
  if (millis() - lastBtn > 10) {
    handleButtons();
    lastBtn = millis();
  }

  // captive portal
  if (apModeActive) {
    dnsServer.processNextRequest();
    server.handleClient();
  }

  // MQTT
  if (!apModeActive && WiFi.status() == WL_CONNECTED) {
    connectMQTT();
    mqtt.loop();
  }

  // update sensors + UI
  static unsigned long lastUi = 0;
  if (millis() - lastUi >= 350) {
    updateSensorsAndUI();
    lastUi = millis();
  }

  // WiFi drop handling
  if (!apModeActive && WiFi.status() != WL_CONNECTED) {
    if (wifiLostAt == 0) {
      wifiLostAt = millis();
      Serial.println("[WiFi] Lost connection. Waiting 15s before AP fallback...");
    } else if (millis() - wifiLostAt > 15000) {
      Serial.println("[WiFi] AP fallback.");
      startAPMode();
      wifiLostAt = 0;
    }
  } else {
    wifiLostAt = 0;
  }
}

// -------------------------------------------------------------
// AP mode + captive portal
// -------------------------------------------------------------
void startAPMode() {
  apModeActive = true;

  if (mqtt.connected()) mqtt.disconnect();

  WiFi.disconnect(true);
  WiFi.mode(WIFI_AP);
  WiFi.softAP("SmartMonitor_Setup");
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));

  Serial.printf("[AP] SSID: SmartMonitor_Setup  IP: %s\n", apIP.toString().c_str());

  dnsServer.start(DNS_PORT, "*", apIP);
  launchCaptivePortal();

  uiStaticDrawn = false;
  updateSensorsAndUI();
}

// -------------------------------------------------------------
// Captive portal (simplified - same as before)
// -------------------------------------------------------------
void launchCaptivePortal() {
  auto serveMain = []() {
    static const char* portalHTML = R"rawliteral(
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
  <title>Vealive360 - SmartMonitor Setup</title>
  <style>
    :root{--bg1:#00c6ff;--bg2:#7f00ff;--card:rgba(255,255,255,.10);--stroke:rgba(255,255,255,.22);--text:rgba(255,255,255,.92);--muted:rgba(255,255,255,.72);--shadow:0 18px 50px rgba(0,0,0,.35);--radius:22px;--mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;--sans:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
    *{box-sizing:border-box}html,body{height:100%}
    body{margin:0;font-family:var(--sans);color:var(--text);background:radial-gradient(1200px 600px at 20% 10%,rgba(255,255,255,.18),transparent 60%),radial-gradient(900px 500px at 85% 25%,rgba(255,255,255,.12),transparent 55%),linear-gradient(135deg,var(--bg1),var(--bg2))}
    .wrap{min-height:100svh;display:flex;align-items:center;justify-content:center;padding:max(14px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left))}
    .shell{width:min(600px,100%);display:grid;gap:14px}
    .card{border:1px solid var(--stroke);border-radius:var(--radius);overflow:hidden;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.08));box-shadow:var(--shadow);backdrop-filter:blur(10px)}
    .hd{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.18)}
    .hd h2{margin:0;font-size:16px}
    .hd span{display:block;color:var(--muted);font-size:12px;margin-top:4px}
    .bd{padding:14px 16px;display:grid;gap:12px}
    label{font-size:12.5px;color:rgba(255,255,255,.88)}
    input{width:100%;padding:14px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.16);color:rgba(255,255,255,.95);font-size:15px;outline:none}
    input:focus{box-shadow:0 0 0 4px rgba(255,255,255,.10);border-color:rgba(255,255,255,.35)}
    .btn{appearance:none;border:none;cursor:pointer;padding:14px;border-radius:16px;font-weight:900;background:linear-gradient(90deg,rgba(255,255,255,.92),rgba(255,255,255,.70));color:rgba(10,10,18,.92);width:100%}
    .note{color:var(--muted);font-size:12px;text-align:center;margin-top:8px}
    .note code{font-family:var(--mono);background:rgba(0,0,0,.18);padding:2px 6px;border-radius:8px}
  </style>
</head>
<body>
<div class="wrap">
  <div class="shell">
    <section class="card">
      <div class="hd">
        <h2>Vealive360 SmartMonitor Setup</h2>
        <span>Device ID: 1 | Connect to WiFi to enable app control</span>
      </div>
      <form action="/saveAll" method="POST">
        <div class="bd">
          <div><label>Wi-Fi SSID</label><input name="ssid" value="{{ssid}}" required></div>
          <div><label>Password</label><input name="password" type="password" value="{{password}}" required></div>
          <div><label>Email for Alerts</label><input name="email" type="email" value="{{email}}" required></div>
          <button class="btn" type="submit">Save & Connect</button>
        </div>
      </form>
      <div class="note">
        Thresholds can be set from the <b>Vealive app</b> after WiFi connection.<br>
        MQTT: <code>63.34.243.171:1883</code>
      </div>
    </section>
  </div>
</div>
</body>
</html>
)rawliteral";

    String page = portalHTML;
    page.replace("{{ssid}}", ssid);
    page.replace("{{password}}", password);
    page.replace("{{email}}", email);
    server.send(200, "text/html", page);
  };

  server.on("/generate_204", HTTP_GET, serveMain);
  server.on("/hotspot-detect.html", HTTP_GET, serveMain);
  server.on("/fwlink", HTTP_GET, serveMain);
  server.onNotFound(serveMain);

  server.on("/saveAll", HTTP_POST, [](){
    ssid     = server.arg("ssid");
    password = server.arg("password");
    email    = server.arg("email");
    savePrefs();

    server.send(200, "text/html",
      "<html><body style='font-family:system-ui;text-align:center;padding:40px'>"
      "<h2>Saved!</h2><p>Restarting and connecting to WiFi...</p>"
      "<p>Set thresholds from the Vealive app.</p></body></html>");
    delay(1200);
    ESP.restart();
  });

  server.begin();
}

// -------------------------------------------------------------
// Preferences
// -------------------------------------------------------------
bool loadPrefs() {
  if (!prefs.isKey("ssid")) return false;

  ssid           = prefs.getString("ssid");
  password       = prefs.getString("pass");
  email          = prefs.getString("email");

  tempMin        = prefs.getInt("tmin", 20);
  tempMax        = prefs.getInt("tmax", 28);
  humMin         = prefs.getInt("hmin", 30);
  humMax         = prefs.getInt("hmax", 60);
  dustThreshold  = prefs.getInt("dust", 400);
  mq2Threshold   = prefs.getInt("mq2", 60);

  buzzerEnabled  = prefs.getBool("buzzer", true);

  timezoneOffset       = prefs.getInt("tz", 10800);
  mq2AlertInterval     = prefs.getInt("mq2Int", 10);
  tempHumAlertInterval = prefs.getInt("thInt", 180);
  dustAlertInterval    = prefs.getInt("dustInt", 10);

  return true;
}

void savePrefs() {
  prefs.putString("ssid",  ssid);
  prefs.putString("pass",  password);
  prefs.putString("email", email);

  prefs.putInt("tmin", tempMin);
  prefs.putInt("tmax", tempMax);
  prefs.putInt("hmin", humMin);
  prefs.putInt("hmax", humMax);
  prefs.putInt("dust", dustThreshold);
  prefs.putInt("mq2",  mq2Threshold);

  prefs.putBool("buzzer", buzzerEnabled);

  prefs.putInt("tz", timezoneOffset);
  prefs.putInt("mq2Int", mq2AlertInterval);
  prefs.putInt("thInt",  tempHumAlertInterval);
  prefs.putInt("dustInt", dustAlertInterval);
}

// -------------------------------------------------------------
// MQTT Callback - Handle commands from app
// -------------------------------------------------------------
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String t = String(topic);

  String msg;
  msg.reserve(length + 1);
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  msg.trim();

  Serial.printf("[MQTT] RX topic=%s payload=%s\n", t.c_str(), msg.c_str());

  // ===== BUZZER COMMAND =====
  if (t == topicCmdBuzzer) {
    bool known = false;
    bool en = buzzerEnabled;

    StaticJsonDocument<128> doc;
    DeserializationError err = deserializeJson(doc, payload, length);
    if (!err) {
      String st = doc["state"] | "";
      st.trim(); st.toUpperCase();
      if (st == "ON" || st == "1" || st == "TRUE")  { en = true;  known = true; }
      if (st == "OFF"|| st == "0" || st == "FALSE") { en = false; known = true; }
    } else {
      String up = msg; up.toUpperCase();
      if (up == "ON" || up == "1")  { en = true;  known = true; }
      if (up == "OFF"|| up == "0")  { en = false; known = true; }
    }

    if (known) {
      buzzerEnabled = en;
      prefs.putBool("buzzer", buzzerEnabled);
      if (!buzzerEnabled) digitalWrite(BUZZER_PIN, LOW);

      String last = String("BUZZER ") + (buzzerEnabled ? "ON" : "MUTED");
      mqtt.publish(topicLastCmd.c_str(), last.c_str(), true);

      Serial.printf("[BUZZER] Set by MQTT => %s\n", buzzerEnabled ? "ON" : "MUTED");
      forceTelemetrySoon();
    }
    return;
  }

  // ===== SET THRESHOLDS COMMAND (NEW!) =====
  if (t == topicCmdThresholds) {
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, payload, length);
    if (err) {
      Serial.printf("[MQTT] Threshold parse error: %s\n", err.c_str());
      return;
    }

    bool changed = false;

    if (doc.containsKey("tempMin")) {
      int v = doc["tempMin"].as<int>();
      if (v != tempMin) { tempMin = v; changed = true; }
    }
    if (doc.containsKey("tempMax")) {
      int v = doc["tempMax"].as<int>();
      if (v != tempMax) { tempMax = v; changed = true; }
    }
    if (doc.containsKey("humMin")) {
      int v = doc["humMin"].as<int>();
      if (v != humMin) { humMin = v; changed = true; }
    }
    if (doc.containsKey("humMax")) {
      int v = doc["humMax"].as<int>();
      if (v != humMax) { humMax = v; changed = true; }
    }
    if (doc.containsKey("dust")) {
      int v = doc["dust"].as<int>();
      if (v != dustThreshold) { dustThreshold = v; changed = true; }
    }
    if (doc.containsKey("mq2")) {
      int v = doc["mq2"].as<int>();
      if (v != mq2Threshold) { mq2Threshold = v; changed = true; }
    }

    if (changed) {
      savePrefs();
      Serial.println("[MQTT] Thresholds updated from app:");
      Serial.printf("  tempMin=%d tempMax=%d humMin=%d humMax=%d dust=%d mq2=%d\n",
                    tempMin, tempMax, humMin, humMax, dustThreshold, mq2Threshold);

      mqtt.publish(topicLastCmd.c_str(), "THRESHOLDS UPDATED", true);
      
      // Force publish new thresholds immediately
      forceThresholdPublish = true;
      forceTelemetrySoon();
    }
    return;
  }

  // ===== GET CONFIG COMMAND (NEW!) =====
  if (t == topicCmdGetConfig) {
    Serial.println("[MQTT] Config requested - publishing thresholds");
    forceThresholdPublish = true;
    return;
  }
}

// -------------------------------------------------------------
// MQTT Connect
// -------------------------------------------------------------
void connectMQTT() {
  if (mqtt.connected()) return;
  if (WiFi.status() != WL_CONNECTED) return;

  if (millis() - lastMqttAttempt < 2000) return;
  lastMqttAttempt = millis();

  Serial.printf("[MQTT] Connecting to %s:%d ...\n", MQTT_HOST, MQTT_PORT);

  bool ok = mqtt.connect(
    mqttClientId.c_str(),
    topicStatus.c_str(),
    1,
    true,
    "offline"
  );

  if (ok) {
    Serial.println("[MQTT] Connected.");
    mqtt.publish(topicStatus.c_str(), "online", true);
    
    // Subscribe to command topics
    mqtt.subscribe(topicCmdBuzzer.c_str());
    mqtt.subscribe(topicCmdThresholds.c_str());
    mqtt.subscribe(topicCmdGetConfig.c_str());
    
    Serial.printf("[MQTT] Subscribed to:\n");
    Serial.printf("  - %s\n", topicCmdBuzzer.c_str());
    Serial.printf("  - %s\n", topicCmdThresholds.c_str());
    Serial.printf("  - %s\n", topicCmdGetConfig.c_str());
    
    mqtt.publish(topicLastCmd.c_str(), "CONNECTED", true);
    
    // Publish current thresholds on connect
    forceThresholdPublish = true;
    forceTelemetrySoon();
  } else {
    Serial.printf("[MQTT] Failed rc=%d\n", mqtt.state());
  }
}

// -------------------------------------------------------------
// Publish Thresholds (NEW!)
// -------------------------------------------------------------
void publishThresholds() {
  StaticJsonDocument<256> doc;
  doc["tempMin"] = tempMin;
  doc["tempMax"] = tempMax;
  doc["humMin"]  = humMin;
  doc["humMax"]  = humMax;
  doc["dust"]    = dustThreshold;
  doc["mq2"]     = mq2Threshold;
  doc["buzzer"]  = buzzerEnabled;

  char buf[256];
  size_t n = serializeJson(doc, buf, sizeof(buf));
  mqtt.publish(topicThresholds.c_str(), (uint8_t*)buf, n, true);
  
  Serial.println("[MQTT] Published thresholds");
}

// -------------------------------------------------------------
// Publish Telemetry (ENHANCED with per-stat alerts!)
// -------------------------------------------------------------
void publishTelemetry(int temp, int hum, int dust, int mq2) {
  StaticJsonDocument<512> doc;
  
  // Basic sensor data
  doc["id"]     = DEVICE_ID;
  doc["temp"]   = temp;
  doc["hum"]    = hum;
  doc["dust"]   = dust;
  doc["mq2"]    = mq2;
  
  // Overall alert flag
  doc["alert"]  = alertActive;
  
  // NEW: Per-stat alert flags - tells app WHICH stat is the problem!
  JsonObject alerts = doc.createNestedObject("alerts");
  alerts["temp"] = alertTemp;
  alerts["hum"]  = alertHum;
  alerts["dust"] = alertDust;
  alerts["mq2"]  = alertMq2;
  
  // Include current thresholds so app always knows them
  JsonObject thresholds = doc.createNestedObject("thresholds");
  thresholds["tempMin"] = tempMin;
  thresholds["tempMax"] = tempMax;
  thresholds["humMin"]  = humMin;
  thresholds["humMax"]  = humMax;
  thresholds["dust"]    = dustThreshold;
  thresholds["mq2"]     = mq2Threshold;
  
  // Status
  doc["buzzer"] = buzzerEnabled;
  doc["ssid"]   = ssid;
  doc["rssi"]   = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : 0;
  doc["uptime"] = (uint32_t)(millis() / 1000);

  char buf[512];
  size_t n = serializeJson(doc, buf, sizeof(buf));

  mqtt.publish(topicTelemetry.c_str(), (uint8_t*)buf, n, true);
}

// -------------------------------------------------------------
// Buttons
// -------------------------------------------------------------
void handleButtons() {
  // RESET (hold 1s)
  static uint32_t resetStart = 0;
  bool resetDown = (digitalRead(RESET_BUTTON_PIN) == LOW);
  if (resetDown) {
    if (resetStart == 0) resetStart = millis();
    if (millis() - resetStart > 1000) {
      Serial.println("[BTN] RESET: clearing prefs + reboot");
      tft.fillScreen(COL_BG);
      drawCenteredT(W/2, H/2, "Resetting...", 4, COL_TEXT);
      delay(250);
      prefs.clear();
      delay(250);
      ESP.restart();
    }
  } else {
    resetStart = 0;
  }

  // BUZZER toggle
  static bool buzzerPressed = false;
  static uint32_t lastBuzzerChange = 0;

  bool pressed = (digitalRead(BUZZER_BUTTON_PIN) == LOW);
  if (pressed != buzzerPressed && (millis() - lastBuzzerChange) > 30) {
    buzzerPressed = pressed;
    lastBuzzerChange = millis();

    if (buzzerPressed) {
      buzzerEnabled = !buzzerEnabled;
      prefs.putBool("buzzer", buzzerEnabled);
      if (!buzzerEnabled) digitalWrite(BUZZER_PIN, LOW);

      Serial.printf("[BTN] BUZZER toggle => %s\n", buzzerEnabled ? "ON" : "MUTED");

      lastFooter = "";
      drawMuteIcon(!buzzerEnabled);
      lastMuted = !buzzerEnabled;

      if (mqtt.connected()) {
        String last = String("BUZZER ") + (buzzerEnabled ? "ON" : "MUTED");
        mqtt.publish(topicLastCmd.c_str(), last.c_str(), true);
      }
      forceTelemetrySoon();
    }
  }
}

// -------------------------------------------------------------
// UI Drawing Functions
// -------------------------------------------------------------
static inline UiMode currentMode() {
  return (apModeActive || WiFi.status() != WL_CONNECTED) ? UI_SETUP : UI_LIVE;
}

static void drawTopBar() {
  tft.fillRect(0, 0, W, TOP_H, COL_TOPBAR);
  tft.drawFastHLine(0, TOP_H - 1, W, COL_EDGE);
  drawLeft(10, 4, "Vealive360", 2, COL_TEXT, COL_TOPBAR);
  drawRight(W - 10, 4, "D" + String(DEVICE_ID), 2, COL_TEXT, COL_TOPBAR);
}

static void drawCardFrame(int idx, const String& label, const String& unit) {
  int x = MARGIN_X + idx * (CARD_W + GAP_X);
  int y = CARDS_Y;
  tft.fillRoundRect(x, y, CARD_W, CARD_H, 10, COL_CARD);
  tft.drawRoundRect(x, y, CARD_W, CARD_H, 10, COL_EDGE);
  drawCentered(x + CARD_W/2, y + CARD_H - 12, label, 2, COL_MUTED, COL_CARD);
  drawRight(x + CARD_W - 6, y + 6, unit, 2, COL_MUTED, COL_CARD);
}

void drawStaticUI(UiMode mode) {
  (void)mode;
  tft.fillScreen(COL_BG);
  drawTopBar();

  drawCardFrame(0, "TEMP", "C");
  drawCardFrame(1, "HUM",  "%");
  drawCardFrame(2, "DUST", "ug");
  drawCardFrame(3, "GAS",  "ppm");

  tft.fillRect(0, H - FOOT_H, W, FOOT_H, COL_BG);
  tft.drawFastHLine(0, H - FOOT_H, W, COL_EDGE);

  drawMuteIcon(!buzzerEnabled);

  lastTimeStr = "";
  lastAlert = !alertActive;
  lastMuted = !buzzerEnabled;
  lastFooter = "";

  lastTemp = INT32_MIN;
  lastHum  = INT32_MIN;
  lastDust = INT32_MIN;
  lastMq2  = INT32_MIN;

  uiStaticDrawn = true;
  uiModeDrawn = currentMode();
}

void drawHeader(UiMode mode, const String& timeStr, bool alert) {
  tft.fillRect(0, TOP_H, W, HEAD_H, COL_BG);

  if (mode == UI_SETUP) {
    const int bx = 12;
    const int by = TOP_H + 8;
    const int bw = W - 24;
    const int bh = HEAD_H - 16;

    tft.fillRoundRect(bx, by, bw, bh, 10, COL_CARD);
    tft.drawRoundRect(bx, by, bw, bh, 10, COL_EDGE);

    drawLeft(bx + 10, by + 4, "SETUP MODE", 2, COL_TEXT_DIM, COL_CARD);
    drawLeft(bx + 10, by + 18, "WiFi", 2, COL_MUTED, COL_CARD);
    drawLeft(bx + 54, by + 18, "SmartMonitor_Setup", 2, COL_TEXT, COL_CARD);
    drawLeft(bx + 10, by + 32, "Open", 2, COL_MUTED, COL_CARD);
    drawLeft(bx + 54, by + 32, "192.168.4.1", 2, COL_TEXT, COL_CARD);
    return;
  }

  drawCenteredT(W/2, TOP_H + 18, timeStr, 6, COL_TEXT);
  lastTimeStr = timeStr;

  const int pw = 110;
  const int ph = 18;
  const int px = W - pw - 10;
  const int py = TOP_H + 32;

  uint16_t pillBg = alert ? COL_ALERT : TFT_DARKGREEN;
  uint16_t pillFg = COL_TEXT;

  tft.fillRoundRect(px, py, pw, ph, 9, pillBg);
  tft.drawRoundRect(px, py, pw, ph, 9, COL_EDGE);

  String st = alert ? "ALERT" : "ALL GOOD";
  drawCentered(px + pw/2, py + ph/2 + 1, st, 2, pillFg, pillBg);

  static bool blink = false;
  static unsigned long lastBlink = 0;
  if (millis() - lastBlink > 500) { blink = !blink; lastBlink = millis(); }

  uint16_t dot = alert ? (blink ? COL_TEXT : COL_ALERT) : COL_OK;
  tft.fillCircle(14, TOP_H + 42, 5, dot);
}

static void drawCardValue(int idx, int value, uint16_t fg) {
  int x = MARGIN_X + idx * (CARD_W + GAP_X);
  int y = CARDS_Y;

  const int pad = 4;
  const int vx = x + pad;
  const int vy = y + 22;
  const int vw = CARD_W - 2*pad;
  const int vh = CARD_H - 22 - 22;

  tft.fillRect(vx, vy, vw, vh, COL_CARD);

  String s = String(value);

  int fontVal = 6;
  if ((int)s.length() >= 3) fontVal = 4;
  if ((int)s.length() >= 5) fontVal = 2;

  drawCenteredT(x + CARD_W/2, y + CARD_H/2, s, fontVal, fg);
}

void drawCards(int temp, int hum, int dust, int mq2) {
  // Use per-stat alert flags for coloring
  uint16_t cTemp = alertTemp ? COL_WARN : COL_EDGE;
  uint16_t cHum  = alertHum  ? COL_WARN : COL_EDGE;
  uint16_t cDust = alertDust ? COL_WARN : COL_EDGE;
  uint16_t cMq2  = alertMq2  ? COL_WARN : COL_EDGE;

  if (temp != lastTemp) { drawCardValue(0, temp, cTemp); lastTemp = temp; }
  if (hum  != lastHum)  { drawCardValue(1, hum,  cHum ); lastHum  = hum;  }
  if (dust != lastDust) { drawCardValue(2, dust, cDust); lastDust = dust; }
  if (mq2  != lastMq2)  { drawCardValue(3, mq2,  cMq2 ); lastMq2  = mq2;  }
}

void drawFooter(UiMode mode) {
  String line;

  if (mode == UI_SETUP) {
    line = "AP SmartMonitor_Setup   -   192.168.4.1";
  } else {
    String s = truncSsid(ssid, 14);
    line = "WiFi " + s + "  " + String(WiFi.RSSI());
  }

  if (line == lastFooter) return;
  lastFooter = line;

  tft.fillRect(0, H - FOOT_H + 1, W, FOOT_H - 1, COL_BG);
  tft.drawFastHLine(0, H - FOOT_H, W, COL_EDGE);
  drawLeft(8, H - FOOT_H + 3, line, 2, COL_EDGE, COL_BG);
  drawMuteIcon(!buzzerEnabled);
}

// -------------------------------------------------------------
// Main Update Routine
// -------------------------------------------------------------
void updateSensorsAndUI() {
  // Read DHT
  float tf = dht.readTemperature();
  float hf = dht.readHumidity();
  if (isnan(tf) || isnan(hf)) return;

  // Dust
  digitalWrite(DUSTLEDPIN, LOW); delayMicroseconds(280);
  int raw = analogRead(DUSTPIN); delayMicroseconds(40);
  digitalWrite(DUSTLEDPIN, HIGH); delayMicroseconds(9680);
  float voltage = raw * (3.3f / 4095.0f);
  float dustValF = fabsf((voltage - 0.6f) * 200.0f);

  // MQ2
  float mq2Voltage = analogRead(MQ2PIN) * (3.3f / 4095.0f);
  float mq2F = mq2Voltage * 1000.0f;

  int temp = (int)roundf(tf);
  int hum  = (int)roundf(hf);
  int dust = (int)roundf(dustValF);
  int mq2  = (int)roundf(mq2F);

  // ===== PER-STAT ALERT DETECTION (NEW!) =====
  alertTemp = (temp < tempMin || temp > tempMax);
  alertHum  = (hum  < humMin  || hum  > humMax);
  alertDust = (dust > dustThreshold);
  alertMq2  = (mq2  > mq2Threshold);
  
  // Overall alert is OR of all individual alerts
  alertActive = alertTemp || alertHum || alertDust || alertMq2;

  // Alert handling + buzzer
  static unsigned long lastMQ2Sent     = 0;
  static unsigned long lastDustSent    = 0;
  static unsigned long lastTempHumSent = 0;

  if (alertActive) {
    setLED("ALERT");

    if (alertMq2 && millis() - lastMQ2Sent > (unsigned long)mq2AlertInterval * 1000UL) {
      sendAlert("Gas & Smoke: " + String(mq2) + " ppm (threshold: " + String(mq2Threshold) + ")");
      lastMQ2Sent = millis();
    }
    if ((alertTemp || alertHum) && millis() - lastTempHumSent > (unsigned long)tempHumAlertInterval * 1000UL) {
      String msg = "";
      if (alertTemp) msg += "Temp: " + String(temp) + "C (range: " + String(tempMin) + "-" + String(tempMax) + ") ";
      if (alertHum)  msg += "Humidity: " + String(hum) + "% (range: " + String(humMin) + "-" + String(humMax) + ")";
      sendAlert(msg);
      lastTempHumSent = millis();
    }
    if (alertDust && millis() - lastDustSent > (unsigned long)dustAlertInterval * 1000UL) {
      sendAlert("Dust: " + String(dust) + " ug/m3 (threshold: " + String(dustThreshold) + ")");
      lastDustSent = millis();
    }

    if (buzzerEnabled) {
      if (millis() - lastBeepTime > 500) {
        beepState = !beepState;
        digitalWrite(BUZZER_PIN, beepState ? HIGH : LOW);
        lastBeepTime = millis();
      }
    } else {
      digitalWrite(BUZZER_PIN, LOW);
    }
  } else {
    setLED(WiFi.status() == WL_CONNECTED ? "WIFI" : "DISCONNECTED");
    digitalWrite(BUZZER_PIN, LOW);
  }

  UiMode mode = currentMode();

  if (!uiStaticDrawn || mode != uiModeDrawn) {
    drawStaticUI(mode);
  }

  String timeStr = "";
  if (mode == UI_LIVE) {
    if (timeClient.update()) {
      timeStr = timeClient.getFormattedTime().substring(0, 5);
    } else {
      timeStr = (lastTimeStr.length() ? lastTimeStr : String("--:--"));
    }
  }

  drawHeader(mode, timeStr, alertActive);
  drawCards(temp, hum, dust, mq2);
  drawFooter(mode);

  bool muted = !buzzerEnabled;
  if (muted != lastMuted) {
    drawMuteIcon(muted);
    lastMuted = muted;
  }

  // Publish telemetry + thresholds (live only)
  if (mode == UI_LIVE && mqtt.connected()) {
    if (millis() - lastMqttPublish > TELEMETRY_PERIOD_MS) {
      publishTelemetry(temp, hum, dust, mq2);
      lastMqttPublish = millis();
    }
    
    // Publish thresholds periodically or when forced
    if (forceThresholdPublish || millis() - lastThresholdPublish > THRESHOLD_PUBLISH_PERIOD_MS) {
      publishThresholds();
      lastThresholdPublish = millis();
      forceThresholdPublish = false;
    }
  }
}

// -------------------------------------------------------------
// LEDs
// -------------------------------------------------------------
void setLED(const String& status) {
  digitalWrite(RED_LED_PIN,   status == "ALERT");
  digitalWrite(GREEN_LED_PIN, status == "WIFI");
  digitalWrite(BLUE_LED_PIN,  status == "DISCONNECTED");
}

// -------------------------------------------------------------
// Alerts via HTTPS GET
// -------------------------------------------------------------
void sendAlert(const String &topic) {
  if (WiFi.status() != WL_CONNECTED) return;

  String fullMessage = topic;
  fullMessage.replace(" ", "%20");
  fullMessage.replace(":", "%3A");
  char *message = strdup(fullMessage.c_str());

  xTaskCreate(
    [](void *param) {
      char *msg = (char *)param;

      WiFiClientSecure client;
      client.setInsecure();
      client.setTimeout(2500);

      if (client.connect("www.cielo628.com", 443)) {
        String url = "/publicralph.php?email=" + email + "&topic=" + String(msg);
        client.print(String("GET ") + url + " HTTP/1.1\r\n"
          + "Host: www.cielo628.com\r\n"
          + "Connection: close\r\n\r\n");

        unsigned long start = millis();
        while (client.connected() && millis() - start < 1500) {
          if (client.available()) break;
          delay(10);
        }
        client.stop();
      }

      free(msg);
      vTaskDelete(NULL);
    },
    "alert_task",
    5000,
    message,
    1,
    NULL
  );
}
