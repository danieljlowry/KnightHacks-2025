
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
int onTaskFlag = 1; // 0 mean off task, 1 means on task
int breakTimeFlag = 0; // if 0 means off break, if 1 on break.

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

  Serial.println("Arduino ready over USB serial!");
  Serial.println("Send 'on_task' or 'off_task'");

  pinMode(BUZZER, OUTPUT);

  noTone(BUZZER);
}

void loop() {
  // tone(BUZZER, 10);
  // show smile

  bool phonePresent = sensor.phoneIn();
  Serial.print("Phone in? ");

  float dist = sensor.distanceCM();  

  delay(500); // delay for unexpected spike in ultrasonic sensor reading. Outliers 

  // logic to account for outliers in ultrasonic sensor reading. 
  if (dist < 2.32 || dist > 2.34)
  {
    phonePresent = true;
  }
  else
  {
    phonePresent = false;
  }

  Serial.println(phonePresent ? "YES" : "NO");

  if (Serial.available()) 
  {
    String command = Serial.readStringUntil('\n');
    command.trim(); // remove whitespace

      if (command == "break_time")
      {
        breakTimeFlag = 1;
        Serial.println("Time for a break.");
      }
      else if (command == "off_task" || !phonePresent) 
      {
        Serial.println("😞 User off task!");
        sad.draw();
        breakTimeFlag = 0;

        // for scenario where command = "on_task" 
        // and if statement was entered because of !phonePresent
        if (command == "off_task")
        {
          onTaskFlag = 0;
        }
        else
        {
          onTaskFlag = 1;
        }
        tone(BUZZER, 85);
      }
      else if (command == "on_task") 
      {
        Serial.println("😊 User on task!");
        smile.draw();
        noTone(BUZZER);
        onTaskFlag = 1;
      } 
      else 
      {
        Serial.println("Unknown command: " + command);
      }

  }

  // Keeps screen from flickering 
  static bool lastPresent = !phonePresent; // force initial draw
  if (phonePresent != lastPresent) {
    if ((phonePresent && onTaskFlag == 1) || breakTimeFlag == 1)
    {
        smile.draw();
        noTone(BUZZER);
    }
    else
    {
        sad.draw();
        tone(BUZZER, 85);
    }

    lastPresent = phonePresent;
  }  
}
