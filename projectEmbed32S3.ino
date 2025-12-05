#include <WiFi.h>
#include <esp_now.h>
#include <DHT.h>

// Wi-Fi credentials
#define WIFI_SSID "Esp32Gateway123"
#define WIFI_PASSWORD "connectGateway321"

// Pin Configuration
#define DHT_PIN 2
#define LIGHT_PIN 12
#define MQ135_PIN 4 
#define SOUND_PIN 5

DHT dht(DHT_PIN, DHT11);

struct DHTreading {
  float temp;
  float humid;
};

DHTreading readDHT() {
  DHTreading reading;
  reading.temp = dht.readTemperature();
  reading.humid = dht.readHumidity(); 
  return reading;
}

double calcSound() {
  int value = analogRead(SOUND_PIN);
  //Serial.println(value);
  return value;
}

double calcLight() {
  int value = analogRead(LIGHT_PIN);
  return value;
}

int readMQ135() {
  int value = analogRead(MQ135_PIN); // 0–4095
  return value;
}

void setup() {
  Serial.begin(115200);
  // pinMode(/, INPUT);

  // WiFi.mode(WIFI_STA);
  // WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  dht.begin();  
  analogReadResolution(12);   // ESP32-S3 ADC is 12-bit
  analogSetAttenuation(ADC_11db);

  delay(2000);   // allow DHT to stabilize

}

void loop() {

  DHTreading reading = readDHT();

  Serial.print("Temp: ");
  Serial.print(reading.temp);
  Serial.print(" Humid: ");
  Serial.print(reading.humid);
  Serial.print(" Sound: ");
  Serial.println(calcSound());
  Serial.print(" Gas: ");
  Serial.println(readMQ135());
  Serial.print(" Light: ");
  Serial.println(calcLight());
  delay(500);
}