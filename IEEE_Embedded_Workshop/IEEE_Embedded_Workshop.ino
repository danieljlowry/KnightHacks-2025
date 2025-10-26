
// // ---- Fix for UNO R4 (Renesas core has no wiring_private.h) ----
// #if defined(ARDUINO_UNOR4_WIFI) || defined(ARDUINO_UNOR4_MINIMA)
//   #define ARDUINO_ARCH_RENESAS 1
//   #define wiring_private_h           // dummy guard so library skips it
// #endif
// // ----------------------------------------------------------------

#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_GC9A01A.h>
#include "Smile.h"
#include "Sad.h"
#include "ultrasonic.h"

//Buzzer wiring
#define BUZZER 5

// TFT wiring (UNO)
#define TFT_CS   10
#define TFT_DC    9
#define TFT_RST   8

UltrasonicSensor sensor(12, 2, 2.5);
Adafruit_GC9A01A tft(TFT_CS, TFT_DC, TFT_RST);

// Create face objects
SmileFace smile(&tft);
SadFace   sad(&tft);

int shortBeep = 100;
int countDown = 1000;

void setup() {
  tft.begin();
  tft.setRotation(2); // flips image 180 degrees
  tft.fillScreen(0x0000);

  tft.setTextColor(0xFFFF);
  tft.setTextSize(2);
  tft.setCursor(40, 10);
  //tft.println(F("Face Class Test"));

  Serial.begin(115200);
  sensor.begin();

  pinMode(BUZZER, OUTPUT);

  noTone(BUZZER);
}

void loop() {
  // tone(BUZZER, 10);
  // show smile

  bool phonePresent = sensor.phoneIn();
  Serial.print("Phone in? ");
  Serial.println(phonePresent ? "YES" : "NO");

  static bool lastPresent = !phonePresent; // force initial draw
  if (phonePresent != lastPresent) {
    if (phonePresent)
    {
      //tft.fillScreen(0x0000);
        smile.draw();
        noTone(BUZZER);
    }
    else
    {
        // show sad
        //tft.fillScreen(0x0000);
        sad.draw();
        tone(BUZZER, 85);
        //delay(shortBeep);
        // noTone(BUZZER);

        // delay(countDown);
        // countDown = countDown - 50;
    }

    lastPresent = phonePresent;
  }

}
