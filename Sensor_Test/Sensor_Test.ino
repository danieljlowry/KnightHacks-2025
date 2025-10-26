#include "ultrasonic.h"

UltrasonicSensor sensor(12, 2, 2.5); // trig, echo, threshold in cm

void setup() {
  Serial.begin(115200);
  sensor.begin();
}

void loop() {
  bool phonePresent = sensor.phoneIn();
  Serial.print("Phone in? ");

  float dist = sensor.distanceCM();  

  if (dist < 2.32 || dist > 2.34)
  {
    phonePresent = true;
  }
  else
  {
    phonePresent = false;
  }

  Serial.println(phonePresent ? "YES" : "NO");
  Serial.print("Distance: ");
  Serial.print(dist);
  Serial.println(" cm");

  delay(1000);
}


