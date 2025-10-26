#ifndef ULTRASONIC_SENSOR_H
#define ULTRASONIC_SENSOR_H

#include <Arduino.h>

class UltrasonicSensor {
private:
  uint8_t trigPin;
  uint8_t echoPin;
  float threshold;   // cm threshold to decide "phone in"

  // get one distance reading in cm
  float readRawCM() {
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    long duration = pulseIn(echoPin, HIGH, 25000); // timeout 25ms
    if (duration == 0) return 999.0; // no echo
    return duration * 0.0343 / 2.0;
  }

  // simple median filter (3 samples)
  float filteredDistance() {
    float a = readRawCM(); delay(10);
    float b = readRawCM(); delay(10);
    float c = readRawCM();
    float mid = max(min(a, max(b,c)), min(max(a,b), c));
    return mid;
  }

public:
  UltrasonicSensor(uint8_t trig, uint8_t echo, float threshCM = 1.0)
    : trigPin(trig), echoPin(echo), threshold(threshCM) {}

  void begin() {
    pinMode(trigPin, OUTPUT);
    pinMode(echoPin, INPUT);
  }

  // Returns true if phone is detected (distance <= threshold)
  bool phoneIn() {
    float d = filteredDistance();
    return (d >= threshold); // Noramlly should be less than, but there is a bug where it goes over threshold (can't be less than 2cm)
  }

  // Optional helper if you just want the distance
  float distanceCM() {
    return filteredDistance();
  }
};

#endif
