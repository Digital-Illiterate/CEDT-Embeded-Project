#include <Firebase_ESP_Client.h>
#include <WiFi.h>

// Wi-Fi credentials
#define WIFI_SSID "iPhone 1,000,000"
#define WIFI_PASSWORD "22222222"

#define AP_SSID "Esp32Gateway123"
#define AP_PASSWORD "connectGateway321"

// Firebase credentials
#define DATABASE_URL "https://cedt-embed-project-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define API_KEY "AIzaSyC8T3UFDrfpUAvO2o4KsaCQICCzZ1HAL04"

#define USER_EMAIL "6733003221@student.chula.ac.th"
#define USER_PASSWORD "passwordNotSecure123"

// Pin Configuration
#define TEMP_PIN 33
#define SOUND_PIN 34

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

const float R1 = 10000; 
const float c1 = 0.001129148;
const float c2 = 0.000234125;
const float c3 = 0.0000000876741;

double calcTemp() {

  // Averaging
  float V = 0;
  int N = 20;
  for (int i = 0; i < N; i++) {
    V += analogRead(TEMP_PIN);
  }
  V /= N;
  
  double logR2 = log(R1 * (4095.0 / (float)V - 1.0)); // calculate log resistance on thermistor
  double T = (1.0 / (c1 + c2*logR2 + c3*logR2*logR2*logR2)); // temperature in Kelvin
  return T - 273.15; //convert Kelvin to Celcius
}

double calcSound() {
  int value = analogRead(SOUND_PIN);
  Serial.println(value);
  return value;
}

void setup() {
  Serial.begin(115200);
  pinMode(TEMP_PIN, INPUT);

  WiFi.mode(WIFI_AP_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
  }
  Serial.println("Connected to WiFi.");

  if (!WiFi.softAP(AP_SSID, AP_PASSWORD)) {
    Serial.println("AP Setup Failed.");
  }

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  Firebase.begin(&config, &auth);
  Firebase.reconnectNetwork(true);
}

void loop() {
  Firebase.RTDB.setInt(&fbdo, "/demo/temp", calcTemp());
  Firebase.RTDB.setInt(&fbdo, "/demo/sound", calcSound());
  delay(100);
}