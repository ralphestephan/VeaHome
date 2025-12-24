// -------------------------------------------------------------
// VeaHub Coordinator - ESP32 Mesh Coordinator
// Lightweight alternative to Raspberry Pi VeaHub
//
// FEATURES:
// - WiFi Access Point ("veahub" SSID)
// - Local MQTT Broker (lightweight)
// - Device coordination
// - Basic local automations
// - Web interface for configuration
// -------------------------------------------------------------

#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <ESPmDNS.h>

// -------------------------------------------------------------
// Configuration
// -------------------------------------------------------------
static const char* AP_SSID = "veahub";
static const char* AP_PASSWORD = "vealive360";
static const char* HUB_HOSTNAME = "veahub.local";

IPAddress apIP(192, 168, 10, 1);
IPAddress apGateway(192, 168, 10, 1);
IPAddress apSubnet(255, 255, 255, 0);

// MQTT Configuration
static const int MQTT_PORT = 1883;
static const int MAX_CLIENTS = 10;
static const int MAX_SUBSCRIPTIONS = 50;

// -------------------------------------------------------------
// Objects
// -------------------------------------------------------------
WebServer webServer(80);
DNSServer dnsServer;
Preferences prefs;

WiFiServer mqttServer(MQTT_PORT);
WiFiClient mqttClients[MAX_CLIENTS];
bool clientConnected[MAX_CLIENTS];

// Automation Rules
struct AutomationRule {
  bool enabled;
  String sourceTopic;      // e.g., "vealive/smartmonitor/1/telemetry"
  String condition;        // e.g., "temp > 30"
  String targetTopic;      // e.g., "vealive/smartplug/2/command/state"
  String targetPayload;    // e.g., "{\"state\":\"OFF\"}"
};

std::vector<AutomationRule> automationRules;

// -------------------------------------------------------------
// Forward Declarations
// -------------------------------------------------------------
void startAccessPoint();
void handleMQTT();
void processMQTTMessage(const String& topic, const String& payload);
void evaluateAutomations(const String& topic, const String& payload);
void setupWebInterface();
void handleRoot();
void handleAutomations();
void handleAddRule();
void handleDeleteRule();
void handleStats();

// -------------------------------------------------------------
// Setup
// -------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println("\n=== VeaHub Coordinator v1.0 ===");
  Serial.println("Starting mesh coordinator...");

  // Initialize preferences
  prefs.begin("veahub", false);
  loadAutomationRules();

  // Start Access Point
  startAccessPoint();

  // Start MQTT Server
  mqttServer.begin();
  Serial.printf("[MQTT] Server started on port %d\n", MQTT_PORT);

  // Initialize client tracking
  for (int i = 0; i < MAX_CLIENTS; i++) {
    clientConnected[i] = false;
  }

  // Start web interface
  setupWebInterface();

  // Start mDNS responder
  if (MDNS.begin("veahub")) {
    Serial.println("[mDNS] Responder started: veahub.local");
    MDNS.addService("http", "tcp", 80);
    MDNS.addService("mqtt", "tcp", MQTT_PORT);
  }

  Serial.println("\n=== VeaHub Ready ===");
  Serial.printf("WiFi SSID: %s\n", AP_SSID);
  Serial.printf("WiFi Password: %s\n", AP_PASSWORD);
  Serial.printf("IP Address: %s\n", apIP.toString().c_str());
  Serial.printf("Web Interface: http://%s or http://veahub.local\n", apIP.toString().c_str());
  Serial.printf("MQTT Broker: %s:%d\n", apIP.toString().c_str(), MQTT_PORT);
}

// -------------------------------------------------------------
// Access Point Setup
// -------------------------------------------------------------
void startAccessPoint() {
  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(apIP, apGateway, apSubnet);
  WiFi.softAP(AP_SSID, AP_PASSWORD);

  Serial.printf("[AP] Started: %s @ %s\n", AP_SSID, apIP.toString().c_str());
  Serial.printf("[AP] Password: %s\n", AP_PASSWORD);

  // Start DNS server for captive portal
  dnsServer.start(53, "*", apIP);
}

// -------------------------------------------------------------
// MQTT Server (Simplified)
// -------------------------------------------------------------
void handleMQTT() {
  // Accept new clients
  if (mqttServer.hasClient()) {
    for (int i = 0; i < MAX_CLIENTS; i++) {
      if (!clientConnected[i] || !mqttClients[i].connected()) {
        if (clientConnected[i]) {
          mqttClients[i].stop();
        }
        mqttClients[i] = mqttServer.available();
        clientConnected[i] = true;
        Serial.printf("[MQTT] Client %d connected\n", i);
        break;
      }
    }
  }

  // Handle existing clients
  for (int i = 0; i < MAX_CLIENTS; i++) {
    if (clientConnected[i] && mqttClients[i].connected()) {
      if (mqttClients[i].available()) {
        String data = mqttClients[i].readStringUntil('\n');
        
        // Simple MQTT message parsing
        // Format: TOPIC|PAYLOAD
        int separator = data.indexOf('|');
        if (separator > 0) {
          String topic = data.substring(0, separator);
          String payload = data.substring(separator + 1);
          
          Serial.printf("[MQTT] Message: %s => %s\n", topic.c_str(), payload.c_str());
          
          // Forward to all other clients
          for (int j = 0; j < MAX_CLIENTS; j++) {
            if (j != i && clientConnected[j] && mqttClients[j].connected()) {
              mqttClients[j].println(data);
            }
          }
          
          // Process message for automations
          processMQTTMessage(topic, payload);
        }
      }
    } else if (clientConnected[i]) {
      clientConnected[i] = false;
      Serial.printf("[MQTT] Client %d disconnected\n", i);
    }
  }
}

// -------------------------------------------------------------
// MQTT Message Processing
// -------------------------------------------------------------
void processMQTTMessage(const String& topic, const String& payload) {
  // Parse telemetry messages
  if (topic.indexOf("/telemetry") > 0) {
    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, payload);
    
    if (!err) {
      // Extract sensor values
      int temp = doc["temp"] | 0;
      int hum = doc["hum"] | 0;
      int dust = doc["dust"] | 0;
      int mq2 = doc["mq2"] | 0;
      
      // Evaluate automation rules
      evaluateAutomations(topic, payload);
    }
  }
}

// -------------------------------------------------------------
// Automation Rule Evaluation
// -------------------------------------------------------------
void evaluateAutomations(const String& topic, const String& payload) {
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) return;

  for (const auto& rule : automationRules) {
    if (!rule.enabled) continue;
    
    // Check if topic matches
    if (topic != rule.sourceTopic) continue;
    
    // Evaluate condition (simple parser)
    bool triggered = false;
    
    // Example: "temp > 30"
    int spacePos = rule.condition.indexOf(' ');
    if (spacePos > 0) {
      String field = rule.condition.substring(0, spacePos);
      String rest = rule.condition.substring(spacePos + 1);
      
      int opPos = rest.indexOf(' ');
      if (opPos > 0) {
        String op = rest.substring(0, opPos);
        int value = rest.substring(opPos + 1).toInt();
        
        int fieldValue = doc[field] | 0;
        
        if (op == ">") triggered = (fieldValue > value);
        else if (op == "<") triggered = (fieldValue < value);
        else if (op == "==") triggered = (fieldValue == value);
        else if (op == ">=") triggered = (fieldValue >= value);
        else if (op == "<=") triggered = (fieldValue <= value);
      }
    }
    
    if (triggered) {
      Serial.printf("[AUTO] Rule triggered: %s\n", rule.condition.c_str());
      Serial.printf("[AUTO] Publishing to: %s\n", rule.targetTopic.c_str());
      
      // Publish to all connected clients
      String message = rule.targetTopic + "|" + rule.targetPayload;
      for (int i = 0; i < MAX_CLIENTS; i++) {
        if (clientConnected[i] && mqttClients[i].connected()) {
          mqttClients[i].println(message);
        }
      }
    }
  }
}

// -------------------------------------------------------------
// Web Interface
// -------------------------------------------------------------
void setupWebInterface() {
  webServer.on("/", handleRoot);
  webServer.on("/automations", handleAutomations);
  webServer.on("/add-rule", HTTP_POST, handleAddRule);
  webServer.on("/delete-rule", HTTP_POST, handleDeleteRule);
  webServer.on("/stats", handleStats);
  
  webServer.begin();
  Serial.println("[WEB] Server started on port 80");
}

void handleRoot() {
  String html = R"(
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>VeaHub Coordinator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui; background: #1a1a2e; color: #eee; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #00d4ff; margin-bottom: 10px; }
    .status { background: #16213e; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .status-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #0f3460; }
    .status-item:last-child { border-bottom: none; }
    .label { color: #aaa; }
    .value { color: #00d4ff; font-weight: bold; }
    .section { background: #16213e; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .section h2 { color: #00d4ff; margin-bottom: 15px; }
    .btn { background: #00d4ff; color: #1a1a2e; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; }
    .btn:hover { background: #00b8d4; }
    a { color: #00d4ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏠 VeaHub Coordinator</h1>
    <p style="color:#aaa;margin-bottom:20px;">Local mesh network controller for VeaHome devices</p>
    
    <div class="status">
      <h2 style="margin-bottom:15px;">System Status</h2>
      <div class="status-item">
        <span class="label">Mode</span>
        <span class="value">MESH AP</span>
      </div>
      <div class="status-item">
        <span class="label">SSID</span>
        <span class="value">)" + String(AP_SSID) + R"(</span>
      </div>
      <div class="status-item">
        <span class="label">IP Address</span>
        <span class="value">)" + apIP.toString() + R"(</span>
      </div>
      <div class="status-item">
        <span class="label">MQTT Broker</span>
        <span class="value">)" + apIP.toString() + ":" + String(MQTT_PORT) + R"(</span>
      </div>
      <div class="status-item">
        <span class="label">Uptime</span>
        <span class="value">)" + String(millis() / 1000) + R"( seconds</span>
      </div>
    </div>
    
    <div class="section">
      <h2>Quick Links</h2>
      <p><a href="/automations">📋 Manage Automations</a></p>
      <p><a href="/stats">📊 Device Statistics</a></p>
    </div>
    
    <div class="section">
      <h2>Configuration</h2>
      <p style="color:#aaa;margin-bottom:10px;">Connect your devices to this network:</p>
      <p><strong>SSID:</strong> )" + String(AP_SSID) + R"(</p>
      <p><strong>Password:</strong> )" + String(AP_PASSWORD) + R"(</p>
      <p style="color:#aaa;margin-top:10px;">MQTT Broker: )" + apIP.toString() + ":" + String(MQTT_PORT) + R"(</p>
    </div>
  </div>
</body>
</html>
)";
  webServer.send(200, "text/html", html);
}

void handleAutomations() {
  String html = R"(
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Automations - VeaHub</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui; background: #1a1a2e; color: #eee; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #00d4ff; margin-bottom: 20px; }
    .rule { background: #16213e; padding: 15px; border-radius: 8px; margin-bottom: 10px; }
    .rule-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .rule-condition { color: #00d4ff; font-weight: bold; }
    .rule-action { color: #aaa; font-size: 14px; }
    .btn-delete { background: #ff4444; color: white; border: none; padding: 5px 15px; border-radius: 5px; cursor: pointer; }
    .btn { background: #00d4ff; color: #1a1a2e; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-top: 10px; }
    a { color: #00d4ff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📋 Local Automations</h1>
    <p style="margin-bottom:20px;"><a href="/">← Back to Dashboard</a></p>
    
)";

  // List rules
  for (size_t i = 0; i < automationRules.size(); i++) {
    const auto& rule = automationRules[i];
    html += "<div class='rule'>";
    html += "<div class='rule-header'>";
    html += "<div class='rule-condition'>" + rule.condition + "</div>";
    html += "<form method='POST' action='/delete-rule' style='display:inline;'>";
    html += "<input type='hidden' name='index' value='" + String(i) + "'>";
    html += "<button type='submit' class='btn-delete'>Delete</button>";
    html += "</form>";
    html += "</div>";
    html += "<div class='rule-action'>If " + rule.condition + " then publish to " + rule.targetTopic + "</div>";
    html += "</div>";
  }

  html += R"(
    <h2 style="color:#00d4ff;margin-top:30px;">Add New Rule</h2>
    <form method="POST" action="/add-rule" style="background:#16213e;padding:20px;border-radius:8px;">
      <p><label>Source Topic:<br><input type="text" name="source" style="width:100%;padding:8px;margin-top:5px;" placeholder="vealive/smartmonitor/1/telemetry"></label></p>
      <p><label>Condition:<br><input type="text" name="condition" style="width:100%;padding:8px;margin-top:5px;" placeholder="temp > 30"></label></p>
      <p><label>Target Topic:<br><input type="text" name="target" style="width:100%;padding:8px;margin-top:5px;" placeholder="vealive/smartplug/2/command/state"></label></p>
      <p><label>Payload:<br><input type="text" name="payload" style="width:100%;padding:8px;margin-top:5px;" placeholder="{&quot;state&quot;:&quot;OFF&quot;}"></label></p>
      <button type="submit" class="btn">Add Rule</button>
    </form>
  </div>
</body>
</html>
)";
  webServer.send(200, "text/html", html);
}

void handleAddRule() {
  AutomationRule rule;
  rule.enabled = true;
  rule.sourceTopic = webServer.arg("source");
  rule.condition = webServer.arg("condition");
  rule.targetTopic = webServer.arg("target");
  rule.targetPayload = webServer.arg("payload");
  
  automationRules.push_back(rule);
  saveAutomationRules();
  
  webServer.sendHeader("Location", "/automations");
  webServer.send(303);
}

void handleDeleteRule() {
  int index = webServer.arg("index").toInt();
  if (index >= 0 && index < automationRules.size()) {
    automationRules.erase(automationRules.begin() + index);
    saveAutomationRules();
  }
  
  webServer.sendHeader("Location", "/automations");
  webServer.send(303);
}

void handleStats() {
  int connectedDevices = 0;
  for (int i = 0; i < MAX_CLIENTS; i++) {
    if (clientConnected[i] && mqttClients[i].connected()) {
      connectedDevices++;
    }
  }
  
  String html = "<html><body style='font-family:system-ui;background:#1a1a2e;color:#eee;padding:20px;'>";
  html += "<h1 style='color:#00d4ff;'>Device Statistics</h1>";
  html += "<p><a href='/' style='color:#00d4ff;'>← Back</a></p>";
  html += "<p><strong>Connected Devices:</strong> " + String(connectedDevices) + "</p>";
  html += "<p><strong>Active Rules:</strong> " + String(automationRules.size()) + "</p>";
  html += "<p><strong>Uptime:</strong> " + String(millis() / 1000) + " seconds</p>";
  html += "</body></html>";
  
  webServer.send(200, "text/html", html);
}

// -------------------------------------------------------------
// Persistence
// -------------------------------------------------------------
void loadAutomationRules() {
  int count = prefs.getInt("ruleCount", 0);
  for (int i = 0; i < count; i++) {
    String key = "rule" + String(i);
    String data = prefs.getString(key.c_str(), "");
    if (data.length() > 0) {
      // Parse stored rule (simplified)
      // Format: enabled|source|condition|target|payload
      // TODO: Implement proper parsing
    }
  }
}

void saveAutomationRules() {
  prefs.putInt("ruleCount", automationRules.size());
  for (size_t i = 0; i < automationRules.size(); i++) {
    String key = "rule" + String(i);
    // TODO: Serialize rule to string
    // prefs.putString(key.c_str(), serialized);
  }
}

// -------------------------------------------------------------
// Loop
// -------------------------------------------------------------
void loop() {
  dnsServer.processNextRequest();
  webServer.handleClient();
  handleMQTT();
  
  delay(1);
}
