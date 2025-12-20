// Add this to firmware_v3.cpp after the existing /saveAll endpoint
// around line 560 in launchCaptivePortal()

// JSON API endpoint for seamless provisioning from mobile app
server.on("/api/provision", HTTP_POST, [](){
  // Parse JSON body
  String body = server.arg("plain");
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, body);
  
  if (error) {
    StaticJsonDocument<128> response;
    response["success"] = false;
    response["error"] = "Invalid JSON";
    String jsonResponse;
    serializeJson(response, jsonResponse);
    server.send(400, "application/json", jsonResponse);
    return;
  }

  // Extract credentials
  if (!doc.containsKey("ssid") || !doc.containsKey("password")) {
    StaticJsonDocument<128> response;
    response["success"] = false;
    response["error"] = "Missing ssid or password";
    String jsonResponse;
    serializeJson(response, jsonResponse);
    server.send(400, "application/json", jsonResponse);
    return;
  }

  ssid = doc["ssid"].as<String>();
  password = doc["password"].as<String>();
  
  // Optional email
  if (doc.containsKey("email")) {
    email = doc["email"].as<String>();
  }

  // Save to preferences
  savePrefs();

  // Return device ID and success
  StaticJsonDocument<256> response;
  response["success"] = true;
  response["deviceId"] = DEVICE_ID;
  response["message"] = "WiFi credentials saved. Device will restart and connect.";
  response["ssid"] = ssid;
  
  String jsonResponse;
  serializeJson(response, jsonResponse);
  server.send(200, "application/json", jsonResponse);

  // Restart after short delay to allow response to be sent
  delay(1000);
  ESP.restart();
});

// Also add CORS headers for API endpoint
server.on("/api/provision", HTTP_OPTIONS, [](){
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
});
