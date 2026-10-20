#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YourWiFiSSID";
const char* password = "YourWiFiPassword";
const char* serverUrl = "http://192.168.1.100:3000/api/sensor/readings";
const char* apiKey = "cv_dev_your_api_key_here";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected.");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", apiKey);

    // Create JSON payload
    StaticJsonDocument<200> doc;
    JsonArray readings = doc.createNestedArray("readings");
    
    JsonObject r1 = readings.createNestedObject();
    r1["metric_id"] = "ph";
    r1["value"] = 6.1;

    JsonObject r2 = readings.createNestedObject();
    r2["metric_id"] = "ppm";
    r2["value"] = 1050;

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println(httpResponseCode);
      Serial.println(response);
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }
  
  // Post every 60 seconds
  delay(60000);
}
