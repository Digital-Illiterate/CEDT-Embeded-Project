#include <WiFi.h>
#include <esp_now.h>
#include <DHT.h>
#include "esp_wifi_types.h"

// Wi-Fi credentials
#define WIFI_SSID "Esp32Gateway123"
#define WIFI_PASSWORD "connectGateway321"

// Pin Configuration
#define DHT_PIN 2
#define MQ135_PIN 4
#define SOUND_PIN 5
//gp2y1014au0f dust sensor
#define GP_ADC_PIN 14      // Analog Vo (white wire) (analog input)
#define GP_LED_PIN 6      // controls IR LED

DHT dht(DHT_PIN, DHT11);

typedef struct sensorPacket {
  float temp;
  float humid;
  int sound;
  int gas;
  int dust;
} sensorPacket;

sensorPacket packet;

// Receiver's actual MAC address
uint8_t receiverMAC[] = { 0x28, 0x56, 0x2F, 0x4A, 0x33, 0x70 }; 

void OnDataSent(const wifi_tx_info_t *info, esp_now_send_status_t status) {
    if (status == ESP_NOW_SEND_SUCCESS) {
        Serial.println("ESP-NOW Delivery Status: Success");
    } else {
        Serial.println("ESP-NOW Delivery Status: Failed!");
    }
}

// -------- Dust Sensor Function --------
float readDustDensity() {
    digitalWrite(GP_LED_PIN, LOW);
    delayMicroseconds(280);
    float voltage = analogRead(GP_ADC_PIN) * (3.3 / 4095.0);
    delayMicroseconds(40);
    digitalWrite(GP_LED_PIN, HIGH);
    delayMicroseconds(9680);
    
    float density = 0.17 * voltage * 1000 - 0.1; // Convert V to mV if needed
    return density; // μg/m³
}

float R0 = 10000; //Rs_clean_air

int readGas(){
  float voltage = analogRead(MQ135_PIN)* (3.3 / 4095.0);
  float Rs = 10000*(3.3-voltage)/voltage;
  float ratio = Rs/R0;
  float ppm = 116.6020682 * pow(ratio, -2.769034857); //CO2 approximation
  return (int)ppm;
}

void setup() {
  Serial.begin(115200);
  delay(100); 
  Serial.println("--- Starting Setup ---");

// 1. Wi-Fi and ESP-NOW Initialization
  WiFi.mode(WIFI_STA); // Set device as a Station

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed");
    return; // Halt if initialization fails
  }

  esp_now_register_send_cb(OnDataSent); // Register callback function

// 2. Add Peer (Receiver)
  esp_now_peer_info_t peerInfo{};
  memcpy(peerInfo.peer_addr, receiverMAC, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK){
    Serial.println("Failed to add peer");
    return; // Halt if adding peer fails
  }

  dht.begin(); // Initialize DHT sensor

  pinMode(GP_LED_PIN, OUTPUT);
  digitalWrite(GP_LED_PIN, HIGH); 

  analogReadResolution(12);
}

void loop() {
// Read all sensor values
  packet.temp = dht.readTemperature();
  packet.humid = dht.readHumidity();
  packet.sound = analogRead(SOUND_PIN);
  packet.gas = readGas();
  packet.dust = readDustDensity();

// Send data via ESP-NOW
  esp_now_send(receiverMAC, (uint8_t *)&packet, sizeof(packet));

// ----- PRINT EVERYTHING -----
  Serial.print("Sent | ");
  Serial.print("Temp: "); Serial.print(packet.temp);
  Serial.print(" Humid: "); Serial.print(packet.humid);
  Serial.print(" Sound: "); Serial.print(packet.sound);
  Serial.print(" Gas: ");  Serial.print(packet.gas);  Serial.print(" ppm ");
  Serial.print("Dust Density: "); Serial.print(packet.dust); Serial.println(" μg/m³");

  delay(1000);
}