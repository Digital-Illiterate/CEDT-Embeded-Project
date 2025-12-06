#include <esp_now.h>
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

// KY-013 Temperature Pin
#define TEMP_PIN 33
#define LIGHT_PIN 32

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Thermistor constants
const float R1 = 10000.0; 
const float c1 = 0.001129148;
const float c2 = 0.000234125;
const float c3 = 0.0000000876741;

// --------------------- Temperature Function ---------------------
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

double readLight() {
  int raw = analogRead(LIGHT_PIN);   // ADC value 0-4095
  // Optional: convert to percentage
  double percent = (raw / 4095.0) * 100.0;
  return percent; // returns 0–100%
}

// Define the struct from the Transmitter
typedef struct sensorPacket {
  float temp;
  float humid;
  int sound;
  int gas;
  int dust;
} sensorPacket;

sensorPacket receivedSensorData;

void OnDataRecv(const esp_now_recv_info *info, const uint8_t *data, int len) {
    memcpy(&receivedSensorData, data, sizeof(receivedSensorData));

  // --- PRINT RECEIVED DATA ---
  Serial.print("\n[RECEIVED ESP-NOW] From: ");
  for (int i = 0; i < 6; i++) {
    Serial.printf("%02X:", info->src_addr[i]);
  }
  Serial.println();

  Serial.print("  Temp (DHT): "); Serial.println(receivedSensorData.temp);
  Serial.print("  Humidity: "); Serial.println(receivedSensorData.humid);
  Serial.print("  Sound (ADC): "); Serial.println(receivedSensorData.sound);
  Serial.print("  Gas (ADC): "); Serial.println(receivedSensorData.gas);
  Serial.print("  Dust (ADC): "); Serial.println(receivedSensorData.dust);
}

void setup() {
  Serial.begin(115200);
  pinMode(TEMP_PIN, INPUT);
  delay(1000);

  Serial.println("ESP32 Receiver Booting...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // ---- WiFi Connection ----
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
  }
  Serial.println("\nWiFi Connected.");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  if (!WiFi.softAP(AP_SSID, AP_PASSWORD)) {
    Serial.println("AP Setup Failed.");
  }

  if (esp_now_init() != ESP_OK) {
      Serial.println("ESP-NOW init failed");
      return;
  }
  // Register the callback function to handle incoming data
  esp_now_register_recv_cb(OnDataRecv);

  // ---- Firebase Setup ----
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  Serial.println("Connecting to Firebase...");
  Firebase.begin(&config, &auth);
  Firebase.reconnectNetwork(true);
  Serial.println("Firebase Ready.");
}

void loop() {
  double localTempC = calcTemp();
  double localLightPercent = readLight(); 

  float espNowTemp = receivedSensorData.temp;
  float espNowHumid = receivedSensorData.humid;
  int espNowSound = receivedSensorData.sound;
  int espNowGas = receivedSensorData.gas;
  int espNowDust = receivedSensorData.dust;

  // Data read LOCALLY on this (Receiver) ESP32:
  Serial.println("--> [LOCAL SENSORS] (Original Receiver Data):");
  Serial.print("    Thermistor Temp: ");
  Serial.print(localTempC);
  Serial.print(" °C | LDR Light: ");
  Serial.print(localLightPercent);
  Serial.println(" %");

  // Data RECEIVED via ESP-NOW from the Transmitter:
  Serial.println("--> [ESP-NOW DATA] (Data from Transmitter Board):");
  Serial.print("    DHT Temp: "); Serial.print(espNowTemp);
  Serial.print(" °C | Humidity: "); Serial.print(espNowHumid);
  Serial.println(" %");
  Serial.print("    Sound: "); Serial.print(espNowSound);
  Serial.println(" ADC");
  Serial.print("    Gas (MQ-135): "); Serial.print(espNowGas);
  Serial.print(" ADC | Dust (GP2Y1014): "); Serial.print(espNowDust);
  Serial.println(" ADC");

  Serial.println("=================================");  

  Firebase.RTDB.setFloat(&fbdo, "/remote/temp", espNowTemp);
  Firebase.RTDB.setFloat(&fbdo, "/remote/humid", espNowHumid);
  Firebase.RTDB.setInt(&fbdo, "/remote/sound", espNowSound);
  Firebase.RTDB.setInt(&fbdo, "/remote/gas", espNowGas);
  Firebase.RTDB.setInt(&fbdo, "/remote/dust", espNowDust);
  
  Firebase.RTDB.setInt(&fbdo, "/local/temp", localTempC);
  Firebase.RTDB.setInt(&fbdo, "/local/light", localLightPercent);

  delay(500);
  WiFi.mode(WIFI_STA); 
  
  Serial.println("-------------------------------------");
  Serial.print("ESP32 Wi-Fi MAC Address: ");
  // Print the MAC address
  Serial.println(WiFi.macAddress()); 
  Serial.println("-------------------------------------");
}