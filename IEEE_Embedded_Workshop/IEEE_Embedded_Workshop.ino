#include <Adafruit_GFX.h>
#include <Adafruit_GC9A01A.h>
#include <SPI.h>
#include "Smile.h"
#include "Sad.h"
#include "IEEE.h"

// pin definitions

#define TFT_CS   15
#define TFT_DC   2
#define TFT_RST  4

// binding pins to SPI
// some unmentioned pins are hardware default
Adafruit_GC9A01A tft(TFT_CS, TFT_DC, TFT_RST);

void showImage(const uint16_t *img)
{
  tft.fillScreen(GC9A01A_BLACK);
  tft.drawRGBBitmap(0, 0, img, 240, 240);
}

void setup() {
  // put your setup code here, to run once:

  tft.begin();
  tft.fillScreen(GC9A01A_BLACK);
  delay(200);
  showImage(SadFace); // start on IEEE logo

  // Serial.begin(115200); // set baudrate

  // // display initialization 
  // tft.begin();
  // tft.fillScreen(GC9A01A_BLACK);
  // delay(200);

  // // black and yellow
  // uint16_t black  = GC9A01A_BLACK;
  // uint16_t yellow = tft.color565(180, 135, 0); // IEEE yellow

  // for (int i = 0; i < 8; i++) {
  //   uint16_t color = (i % 2 == 0) ? yellow : black;
  //   tft.fillRect(0, i * 30, 240, 30, color);
  // }

}

void loop() {
  // put your main code here, to run repeatedly:
  // rainbow text colors
    // static int index = 0;
    // uint16_t rainbow[] = {
    //   GC9A01A_RED,
    //   tft.color565(255,140,0), // orange
    //   GC9A01A_YELLOW,
    //   GC9A01A_GREEN,
    //   GC9A01A_CYAN,
    //   GC9A01A_BLUE,
    //   GC9A01A_MAGENTA
    // };
    // int n = sizeof(rainbow)/sizeof(rainbow[0]);

    // uint16_t black  = GC9A01A_BLACK;
    // uint16_t yellow = tft.color565(180, 135, 0);

    // // repaint stripes
    // for (int i = 0; i < 8; i++) {
    //   uint16_t color = (i % 2 == 0) ? yellow : black;
    //   tft.fillRect(0, i * 30, 240, 30, color);
    // }


    // // rainbow text
    // tft.setTextSize(4);
    // tft.setTextColor(rainbow[index]);
    // tft.setCursor(55, 85);
    // tft.print("Hello");
    // tft.setCursor(70, 150);
    // tft.print("IEEE");

    // delay(500);
    // index = (index + 1) % n;
}
