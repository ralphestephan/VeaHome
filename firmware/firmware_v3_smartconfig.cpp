// ESPTouch (SmartConfig) Version - AUTOMATIC WiFi Provisioning
// User stays on home WiFi, no manual switching needed!

#include <WiFi.h>
#include <Preferences.h>
#include <DHT.h>
#include <SPI.h>
#include <TFT_eSPI.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

// Same pins and config as before...
#define DHTPIN 33
#define DHTTYPE DHT22
// ... (all other defines)

Preferences prefs;
TFT_eSPI tft;
DHT dht(DHTPIN, DHTTYPE);

String ssid, password;
bool smartConfigActive = false;

// Display SmartConfig status on screen
void showSmartConfigStatus() {
  tft.fillScreen(0x0841);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(0xFFFF);
  tft.drawString("SETUP MODE", 160, 80, 4);
  tft.setTextColor(0xC618);
  tft.drawString("Open VeaHome App", 160, 120, 2);
  tft.drawString("and click 'Configure'", 160, 140, 2);
  tft.setTextColor(0x07E0);
  tft.drawString("Waiting for credentials...", 160, 180, 2);
}

void setup() {
  Serial.begin(115200);
  
  // TFT init
  tft.init();
  tft.setRotation(1);
  tft.fillScreen(0x0841);
  
  // Sensors
  dht.begin();
  
  // Preferences
  prefs.begin("monitor", false);
  
  // Check if WiFi credentials saved
  if (!prefs.isKey("ssid")) {
    Serial.println("[SmartConfig] No WiFi saved. Starting SmartConfig...");
    
    // Show status on screen
    showSmartConfigStatus();
    
    // Start SmartConfig
    WiFi.mode(WIFI_STA);
    WiFi.beginSmartConfig();
    smartConfigActive = true;
    
    Serial.println("[SmartConfig] Waiting for phone to broadcast credentials...");
    return;
  }
  
  // Load saved credentials
  ssid = prefs.getString("ssid", "");
  password = prefs.getString("pass", "");
  
  // Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());
  
  Serial.printf("[WiFi] Connecting to: %s\n", ssid.c_str());
  
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) {
    delay(500);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    // Continue with normal setup (MQTT, NTP, etc.)
  } else {
    Serial.println("\n[WiFi] Failed. Starting SmartConfig...");
    showSmartConfigStatus();
    WiFi.beginSmartConfig();
    smartConfigActive = true;
  }
}

void loop() {
  // Handle SmartConfig
  if (smartConfigActive) {
    if (WiFi.smartConfigDone()) {
      Serial.println("[SmartConfig] ✓ Credentials received!");
      
      // Get credentials
      ssid = WiFi.SSID();
      password = WiFi.psk();
      
      // Save to preferences
      prefs.putString("ssid", ssid);
      prefs.putString("pass", password);
      
      Serial.printf("[SmartConfig] Saved: %s\n", ssid.c_str());
      Serial.println("[SmartConfig] Restarting...");
      
      // Show success on screen
      tft.fillScreen(0x0841);
      tft.setTextDatum(MC_DATUM);
      tft.setTextColor(0x07E0);
      tft.drawString("SUCCESS!", 160, 100, 4);
      tft.setTextColor(0xFFFF);
      tft.drawString("Restarting device...", 160, 140, 2);
      
      delay(2000);
      ESP.restart();
    }
    
    // Blink LED while waiting
    static unsigned long lastBlink = 0;
    if (millis() - lastBlink > 500) {
      digitalWrite(BLUE_LED_PIN, !digitalRead(BLUE_LED_PIN));
      lastBlink = millis();
    }
    
    return;
  }
  
  // Normal operation
  if (WiFi.status() == WL_CONNECTED) {
    // MQTT, sensors, UI updates, etc.
  }
}
