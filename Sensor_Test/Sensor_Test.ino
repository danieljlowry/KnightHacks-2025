#include "ultrasonic.h"

UltrasonicSensor sensor(3, 4, 0.5); // trig, echo, threshold in cm

void setup() {
  Serial.begin(115200);
  sensor.begin();
}

void loop() {
  bool phonePresent = sensor.phoneIn();
  Serial.print("Phone in? ");
  Serial.println(phonePresent ? "YES" : "NO");

  delay(500);
}


