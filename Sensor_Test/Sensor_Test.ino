#include "ultrasonic.h"

UltrasonicSensor sensor(12, 2, 2.5); // trig, echo, threshold in cm

void setup() {
  Serial.begin(115200);
  sensor.begin();
}

void loop() {
  bool phonePresent = sensor.phoneIn();
  Serial.print("Phone in? ");
  Serial.println(phonePresent ? "YES" : "NO");
  float dist = sensor.distanceCM();  
  Serial.print("Distance: ");
  Serial.print(dist);
  Serial.println(" cm");

  delay(1000);
}


