#pragma once
#include <Adafruit_GFX.h>
#include <Adafruit_GC9A01A.h>

class SadFace {
public:
  SadFace(Adafruit_GC9A01A* screen, int cx = 120, int cy = 120, int r = 90)
    : tft(screen), cx(cx), cy(cy), r(r) {}

  void draw() {   // <-- no parameters now
    uint16_t FACE = tft->color565(255, 205, 0);
    uint16_t OUT  = 0x0000;

    tft->fillCircle(cx, cy, r, FACE);

    // eyes
    int ey = cy - r/4;
    int ex = r/3;
    int er = r/10;
    tft->fillCircle(cx - ex, ey, er, OUT);
    tft->fillCircle(cx + ex, ey, er, OUT);

    // mouth (frown)
    int mr = r/2;
    int my = cy + r/2;
    for (int t = 0; t < 3; ++t)
      tft->drawCircle(cx, my, mr - t, OUT);
    tft->fillRect(cx - mr - 2, my, (mr*2) + 4, mr + 4, FACE);

    // caption
    tft->setTextColor(OUT);
    tft->setTextSize(2);
    tft->setCursor(65, 210);
    tft->print(F("Phone Out :("));
  }

private:
  Adafruit_GC9A01A* tft;
  int cx, cy, r;
};
