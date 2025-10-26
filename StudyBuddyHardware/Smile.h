#pragma once
#include <Adafruit_GFX.h>
#include <Adafruit_GC9A01A.h>

class SmileFace {
public:
  explicit SmileFace(Adafruit_GC9A01A* screen) : tft(screen) {}

  void draw() {
    uint16_t FACE = tft->color565(255, 205, 0); // yellow
    uint16_t OUT  = 0x0000;                     // black
    int cx = 120, cy = 120, r = 90;

    // face background
    tft->fillCircle(cx, cy, r, FACE);

    // eyes (exactly as in your code)
    int ey = cy - r/4;        // slightly higher eyes
    int exOffset = r/3;       // horizontal spacing
    int er = r/10;            // eye radius
    tft->fillCircle(cx - exOffset, ey, er, OUT);
    tft->fillCircle(cx + exOffset, ey, er, OUT);

    // smile (exactly as in your code)
    int mr = r/2;             // mouth radius
    int my = cy + r/3;        // lower center for mouth
    for (int t = 0; t < 3; ++t) {
      tft->drawCircle(cx, my, mr - t, OUT);
    }
    // mask the top half so only the lower arc remains
    tft->fillRect(cx - mr - 2, my - mr, (mr * 2) + 4, mr, FACE);

    // caption
    tft->setTextColor(OUT);
    tft->setTextSize(2);
    tft->setCursor(65, 210);
    tft->print(F("Phone In :)"));
  }

private:
  Adafruit_GC9A01A* tft;
};

