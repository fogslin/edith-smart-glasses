/*
 * EDITH Smart Glasses firmware -- "EDITH + Bluetooth audio" HYPOTHETICAL VARIANT
 * Same as firmware/edith_glasses/edith_glasses.ino plus control of a classic-Bluetooth audio module
 * (ElectroDragon NBL1111, Beken BK3266: A2DP + HFP + mic input) that sits in the LEFT temple pod.
 * The phone pairs to the module like an earbud; the ESP32-S3 keeps AI / HUD / touch over Wi-Fi.
 * UNTESTED DESIGN: the dual-use control line (UART + key press through a diode) and the exact
 * COM+ line ending are taken from the module's wiki and have not been verified on hardware.
 * Board : Seeed Studio XIAO ESP32-S3 Sense (Arduino-ESP32 core 3.x, board "XIAO_ESP32S3")
 * Tools : PSRAM = "OPI PSRAM", USB CDC On Boot = "Enabled", Partition = "Huge APP" or default 8MB
 *
 * Libraries (Library Manager):
 *   - Adafruit SSD1306  + Adafruit GFX Library
 *   - SparkFun MAX3010x Pulse and Proximity Sensor Library (works with MAX30101/MAX30102)
 *   - ArduinoJson (v7)
 *   (esp_camera.h, ESP_I2S.h, WiFi, HTTPClient ship with the Espressif core)
 *
 * PIN MAP (must match the build guide's master GPIO table):
 *   D0  / GPIO1  (TOUCH1) -> Touch pad A (front, nearest hinge)  copper foil
 *   D1  / GPIO2  (TOUCH2) -> Touch pad B (middle)                 copper foil
 *   D3  / GPIO4  (TOUCH4) -> Touch pad C (rear, toward ear)       copper foil
 *   D2  / GPIO3           -> MAX98357A DIN
 *   D6  / GPIO43          -> MAX98357A BCLK
 *   D7  / GPIO44          -> MAX98357A LRC (word select)
 *   D4  / GPIO5           -> I2C SDA (SSD1306 OLED 0x3C + MAX3010x 0x57)
 *   D5  / GPIO6           -> I2C SCL
 *   D8  / GPIO7           -> Push button to GND (INPUT_PULLUP)
 *   D10 / GPIO9           -> Status LED anode via 330 ohm (cathode to GND)
 *   D9  / GPIO8           -> BT CONTROL LINE (variant):
 *                              - 1 kohm -> BK3266 module RX (pin 11): UART TX only, 9600 8N1, "COM+.." commands
 *                              - BAT54 Schottky (cathode at D9, anode at module P.P/CALL pin 6) + 10 kohm
 *                                pull-up from P.P/CALL to module VDD3IO (pin 39): holding D9 LOW ~150 ms
 *                                = a short press of the module's own Play/Pause/Answer key
 *   GPIO42 / GPIO41 -> onboard PDM mic CLK / DATA (Sense board, do not wire)
 *   Camera: onboard (Sense board), pins below per Seeed wiki
 *   BAT+ / BAT- pads (underside) -> LiPo via slide switch on the + lead
 *   NOTE: D8/D9/D10 are shared with the Sense board's microSD slot (SCK/MISO/MOSI).
 *         This build does not use the SD card - leave the slot EMPTY.
 *
 * Controls:
 *   button short press  = do the action of the current mode
 *   button long press   = next mode   (>= 700 ms)
 *   touch strip: swipe forward (C->B->A) = volume up, swipe back (A->B->C) = volume down
 *                (Edith's volume AND the phone's Bluetooth volume via COM+VP / COM+VD),
 *                single tap = Edith audio playing ? pause Edith : phone play/pause OR answer call
 *                             (module key press; the module decides from its own call state),
 *                double tap = wake Edith (start listening),
 *                long press (>= 0.9 s, no swipe) = hang up (COM+CE) / reject (COM+CJ)
 *   button held >= 3 s = put the Bluetooth module into pairing mode (COM+PR)
 *   Modes: ASSIST -> TRANSLATE -> VISION(AR) -> MUSIC -> HEART -> NOTIFY
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>
#include "esp_camera.h"
#include "ESP_I2S.h"
#include "MAX30105.h"     // SparkFun MAX3010x library (supports MAX30101/30102)
#include "heartRate.h"

// ---------------- user settings (placeholders) ----------------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
// Backend base URL, no trailing slash. LAN example: http://192.168.1.50:8000
const char* BACKEND_URL   = "http://192.168.1.50:8000";
// Shared secret, must equal DEVICE_TOKEN in backend/.env
const char* DEVICE_TOKEN  = "change-me-device-token";
const char* TRANSLATE_TO  = "English";

// ---------------- pins ----------------
#define PIN_TOUCH_A   1   // D0  TOUCH1 (front)
#define PIN_TOUCH_B   2   // D1  TOUCH2 (middle)
#define PIN_TOUCH_C   4   // D3  TOUCH4 (rear)
#define PIN_I2S_DIN   3   // D2
#define PIN_I2S_BCLK  43  // D6
#define PIN_I2S_LRC   44  // D7
#define PIN_SDA       5   // D4
#define PIN_SCL       6   // D5
#define PIN_BUTTON    7   // D8
#define PIN_LED       9   // D10
#define PIN_BT_CTRL   8   // D9  -> BK3266 RX (UART TX only) + diode to its P.P/CALL key (variant)
#define PIN_MIC_CLK   42  // onboard PDM
#define PIN_MIC_DATA  41  // onboard PDM

// Camera pins for XIAO ESP32S3 Sense (Seeed wiki / CAMERA_MODEL_XIAO_ESP32S3)
#define PWDN_GPIO_NUM  -1
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM  10
#define SIOD_GPIO_NUM  40
#define SIOC_GPIO_NUM  39
#define Y9_GPIO_NUM    48
#define Y8_GPIO_NUM    11
#define Y7_GPIO_NUM    12
#define Y6_GPIO_NUM    14
#define Y5_GPIO_NUM    16
#define Y4_GPIO_NUM    18
#define Y3_GPIO_NUM    17
#define Y2_GPIO_NUM    15
#define VSYNC_GPIO_NUM 38
#define HREF_GPIO_NUM  47
#define PCLK_GPIO_NUM  13

#define SAMPLE_RATE 16000   // mic + speaker, backend returns 16 kHz mono 16-bit WAV

// ---------------- Bluetooth audio module (variant) ----------------
// Set to 1 for ONE boot to name the module "EDITH", force mono + single-ended mic, then set back to 0.
#define BT_FIRST_SETUP 0
const char* BT_EOL = "\r\n";       // UNVERIFIED: the wiki shows "COM+PP" without a line ending
HardwareSerial BT(1);              // UART1, TX only on D9 (RX = -1 so no pin is claimed)

// ---------------- globals ----------------
Adafruit_SSD1306 display(128, 64, &Wire, -1);
bool haveDisplay = false;
MAX30105 pulse;
bool havePulse = false;
I2SClass mic;   // PDM RX (I2S0)
I2SClass spk;   // STD TX (I2S1) -> MAX98357A
bool haveSpk = false;
bool haveCam = false;

enum Mode { M_ASSIST, M_TRANSLATE, M_VISION, M_MUSIC, M_HEART, M_NOTIFY, M_COUNT };
const char* MODE_NAMES[] = {"ASSIST", "TRANSLATE", "VISION", "MUSIC", "HEART", "NOTIFY"};
Mode mode = M_ASSIST;

// heart-rate state
const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
int beatAvg = 0;
bool fingerOn = false;

String hudLine = "Hello. I'm Edith.";
unsigned long lastNotifyPoll = 0;
volatile bool stopAudio = false;


// ---------------- capacitive touch strip ----------------
// ESP32-S3: touchRead() value RISES when touched (opposite of the original ESP32).
const uint8_t TOUCH_PINS[3] = {PIN_TOUCH_A, PIN_TOUCH_B, PIN_TOUCH_C};
uint32_t touchBase[3];
float    TOUCH_RATIO = 1.12f;          // touched if value > baseline * ratio (tune 1.05-1.30)
const uint16_t TAP_MAX_MS       = 280; // a tap is shorter than this
const uint16_t DOUBLE_GAP_MS    = 350; // second tap must start within this after the first ends
const uint16_t SWIPE_MAX_MS     = 700; // whole swipe must finish within this
const uint16_t SWIPE_MIN_STEP   = 15;  // pads must light up at least this far apart (ms)
const uint16_t TOUCH_DEBOUNCE   = 3;   // consecutive samples to change pad state

enum Gesture { G_NONE, G_SWIPE_FWD, G_SWIPE_BACK, G_TAP, G_DOUBLE_TAP, G_HOLD };
const uint16_t HOLD_MIN_MS      = 900; // variant: finger held this long without swiping = G_HOLD
float volumeGain = 0.6f;               // 0.0 - 1.0 software volume
bool  paused = false;

bool padState[3] = {false, false, false};
uint8_t padCount[3] = {0, 0, 0};
unsigned long padFirstOn[3];
bool gestureActive = false;
unsigned long gestureStart = 0;
unsigned long lastTapEnd = 0;
bool tapPending = false;

void calibrateTouch() {
  for (int p = 0; p < 3; p++) {
    uint64_t sum = 0;
    for (int i = 0; i < 32; i++) { sum += touchRead(TOUCH_PINS[p]); delay(2); }
    touchBase[p] = (uint32_t)(sum / 32);
    Serial.printf("touch pad %d (GPIO%d) baseline %u\n", p, TOUCH_PINS[p], touchBase[p]);
  }
}

// Call often (every loop / every audio chunk). Returns a gesture once when recognised.
Gesture pollTouch() {
  unsigned long now = millis();
  bool anyOn = false;
  for (int p = 0; p < 3; p++) {
    uint32_t v = touchRead(TOUCH_PINS[p]);
    bool raw = v > (uint32_t)(touchBase[p] * TOUCH_RATIO);
    if (raw != padState[p]) {
      if (++padCount[p] >= TOUCH_DEBOUNCE) {
        padState[p] = raw; padCount[p] = 0;
        if (raw) {
          if (!gestureActive) { gestureActive = true; gestureStart = now; for (int k = 0; k < 3; k++) padFirstOn[k] = 0; }
          if (padFirstOn[p] == 0) padFirstOn[p] = now;
        }
      }
    } else padCount[p] = 0;
    if (!raw && !padState[p]) {
      // slow drift compensation while untouched
      touchBase[p] = (touchBase[p] * 63 + v) / 64;
    }
    anyOn |= padState[p];
  }

  if (gestureActive && !anyOn) {                 // finger lifted: classify
    gestureActive = false;
    unsigned long dur = now - gestureStart;
    unsigned long a = padFirstOn[0], b = padFirstOn[1], c = padFirstOn[2];
    int lit = (a > 0) + (b > 0) + (c > 0);
    if (lit >= 2 && dur <= SWIPE_MAX_MS) {
      // order of first activation decides direction
      unsigned long first = 0, last = 0; int fi = -1, li = -1;
      for (int p = 0; p < 3; p++) if (padFirstOn[p]) {
        if (fi < 0 || padFirstOn[p] < first) { first = padFirstOn[p]; fi = p; }
        if (li < 0 || padFirstOn[p] >= last) { last = padFirstOn[p]; li = p; }
      }
      if (last - first >= SWIPE_MIN_STEP && fi != li) {
        tapPending = false;
        return (fi > li) ? G_SWIPE_FWD : G_SWIPE_BACK;   // C->A = forward, A->C = back
      }
    }
    if (dur >= HOLD_MIN_MS) { tapPending = false; return G_HOLD; }   // variant: long press
    if (dur <= TAP_MAX_MS) {
      if (tapPending && (gestureStart - lastTapEnd) <= DOUBLE_GAP_MS) { tapPending = false; return G_DOUBLE_TAP; }
      tapPending = true; lastTapEnd = now;
    }
  }
  if (tapPending && !gestureActive && now - lastTapEnd > DOUBLE_GAP_MS) { tapPending = false; return G_TAP; }
  return G_NONE;
}

// ---------------- helpers ----------------
void led(bool on) { digitalWrite(PIN_LED, on ? HIGH : LOW); }

void hud(const String& body, const char* title = nullptr) {
  if (!haveDisplay) { Serial.println(body); return; }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(title ? title : MODE_NAMES[mode]);
  if (beatAvg > 0) {               // BPM always in the corner when known
    display.setCursor(92, 0);
    display.printf("%3d\x03", beatAvg);
  }
  display.drawFastHLine(0, 9, 128, SSD1306_WHITE);
  display.setCursor(0, 12);
  display.setTextWrap(true);
  display.print(body.substring(0, 150));   // ~7 lines x 21 chars
  display.display();
  Serial.printf("[HUD] %s\n", body.c_str());
}

bool initCamera() {
  camera_config_t c = {};
  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM; c.pin_d1 = Y3_GPIO_NUM; c.pin_d2 = Y4_GPIO_NUM; c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM; c.pin_d5 = Y7_GPIO_NUM; c.pin_d6 = Y8_GPIO_NUM; c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk = XCLK_GPIO_NUM; c.pin_pclk = PCLK_GPIO_NUM;
  c.pin_vsync = VSYNC_GPIO_NUM; c.pin_href = HREF_GPIO_NUM;
  c.pin_sccb_sda = SIOD_GPIO_NUM; c.pin_sccb_scl = SIOC_GPIO_NUM;
  c.pin_pwdn = PWDN_GPIO_NUM; c.pin_reset = RESET_GPIO_NUM;
  c.xclk_freq_hz = 20000000;
  c.pixel_format = PIXFORMAT_JPEG;
  c.frame_size = FRAMESIZE_VGA;          // 640x480 is plenty for a vision LLM
  c.jpeg_quality = 12;
  c.fb_count = 2;
  c.fb_location = CAMERA_FB_IN_PSRAM;
  c.grab_mode = CAMERA_GRAB_LATEST;
  esp_err_t err = esp_camera_init(&c);
  if (err != ESP_OK) { Serial.printf("Camera init failed 0x%x\n", err); return false; }
  return true;
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  hud("Connecting WiFi...", "EDITH");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) { delay(250); led(!digitalRead(PIN_LED)); }
  led(false);
  if (WiFi.status() == WL_CONNECTED) hud("WiFi OK " + WiFi.localIP().toString(), "EDITH");
  else hud("WiFi failed - check SSID/pass", "EDITH");
}

// Build multipart/form-data in PSRAM and POST it. Returns HTTP body.
String postMultipart(const char* path, const char* modeName,
                     const uint8_t* jpg, size_t jpgLen,
                     const uint8_t* wav, size_t wavLen) {
  const String boundary = "----edithBoundary7MA4YWxk";
  String head;
  head += "--" + boundary + "\r\nContent-Disposition: form-data; name=\"mode\"\r\n\r\n" + modeName + "\r\n";
  head += "--" + boundary + "\r\nContent-Disposition: form-data; name=\"target_lang\"\r\n\r\n" + TRANSLATE_TO + "\r\n";
  String imgHead = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"image\"; filename=\"frame.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
  String audHead = "\r\n--" + boundary + "\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"clip.wav\"\r\nContent-Type: audio/wav\r\n\r\n";
  String tail = "\r\n--" + boundary + "--\r\n";

  size_t total = head.length() + tail.length();
  if (jpg) total += imgHead.length() + jpgLen;
  if (wav) total += audHead.length() + wavLen;
  uint8_t* body = (uint8_t*)ps_malloc(total + 4);
  if (!body) return "";
  size_t p = 0;
  auto put = [&](const uint8_t* d, size_t n) { memcpy(body + p, d, n); p += n; };
  put((const uint8_t*)head.c_str(), head.length());
  if (jpg) { put((const uint8_t*)imgHead.c_str(), imgHead.length()); put(jpg, jpgLen); }
  if (wav) {
    if (!jpg) { String h = audHead.substring(2); put((const uint8_t*)h.c_str(), h.length()); }
    else put((const uint8_t*)audHead.c_str(), audHead.length());
    put(wav, wavLen);
  }
  put((const uint8_t*)tail.c_str(), tail.length());

  HTTPClient http;
  http.setTimeout(60000);
  http.begin(String(BACKEND_URL) + path);
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  int code = http.POST(body, p);
  String resp = code > 0 ? http.getString() : "";
  Serial.printf("POST %s -> %d (%u bytes sent)\n", path, code, (unsigned)p);
  http.end();
  free(body);
  return resp;
}

bool wakeRequested = false;

// ---------------- Bluetooth module control (variant) ----------------
// The ESP32 cannot hear back from the module (no free pin for RX), so it never knows the call
// state. That is why "tap" is sent as a press of the module's own P.P/CALL key: the module itself
// decides between play/pause and answering a ringing call.
void btBegin() { BT.begin(9600, SERIAL_8N1, -1, PIN_BT_CTRL); }
void btCmd(const char* c) {                      // e.g. btCmd("PP") -> "COM+PP\r\n"
  BT.print("COM+"); BT.print(c); BT.print(BT_EOL); BT.flush();
  Serial.printf("[BT] COM+%s\n", c);
}
void btRaw(const char* c) { BT.print(c); BT.print(BT_EOL); BT.flush(); delay(120); }
void btKeyPress(uint16_t ms = 150) {             // short press of P.P/CALL through the BAT54 diode
  BT.flush(); BT.end();
  pinMode(PIN_BT_CTRL, OUTPUT); digitalWrite(PIN_BT_CTRL, LOW);
  delay(ms);                                     // keep well under 1 s (8 s = clears pairings!)
  digitalWrite(PIN_BT_CTRL, HIGH); delay(30);
  btBegin();
}

void applyGesture(Gesture g, bool inAudio) {
  switch (g) {
    case G_SWIPE_FWD:  volumeGain = min(1.0f, volumeGain + 0.1f); btCmd("VP"); hud("Volume " + String((int)(volumeGain * 100)) + "%", "VOL+"); break;
    case G_SWIPE_BACK: volumeGain = max(0.0f, volumeGain - 0.1f); btCmd("VD"); hud("Volume " + String((int)(volumeGain * 100)) + "%", "VOL-"); break;
    case G_TAP:
      if (inAudio) { paused = !paused; hud(paused ? "Paused" : "Playing", "MEDIA"); }   // Edith's own audio
      else { btKeyPress(); hud("Play/pause\nor answer call", "PHONE"); }            // phone via Bluetooth
      break;
    case G_DOUBLE_TAP: wakeRequested = true; if (inAudio) stopAudio = true; break;
    case G_HOLD:       btCmd("CE"); delay(150); btCmd("CJ"); hud("Hang up / reject", "PHONE"); break;  // whichever applies
    default: break;
  }
}

// Stream a 16 kHz mono 16-bit WAV from the backend to the MAX98357A.
void playUrl(const String& url) {
  if (!haveSpk || url.length() == 0) return;
  HTTPClient http;
  http.useHTTP10(true);                      // no chunked encoding -> raw PCM on the socket
  http.setTimeout(30000);
  http.begin(url.startsWith("http") ? url : String(BACKEND_URL) + url);
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  int code = http.GET();
  if (code != 200) { Serial.printf("audio GET %d\n", code); http.end(); return; }
  WiFiClient* s = http.getStreamPtr();
  static uint8_t buf[2048];
  size_t skipped = 0;                        // skip the 44-byte WAV header
  unsigned long t0 = millis();
  while (skipped < 44 && millis() - t0 < 5000) { if (s->available()) { s->read(); skipped++; } else delay(1); }
  stopAudio = false; paused = false;
  int remaining = http.getSize();            // -1 when length is unknown (music stream)
  if (remaining > 0) remaining -= 44;
  unsigned long lastData = millis();
  while ((s->connected() || s->available()) && (remaining > 0 || remaining == -1) && !stopAudio) {
    applyGesture(pollTouch(), true);
    if (digitalRead(PIN_BUTTON) == LOW) stopAudio = true;   // button press = stop
    if (paused) { delay(10); lastData = millis(); continue; }
    size_t avail = s->available();
    if (avail) {
      size_t n = s->readBytes(buf, min(avail, sizeof(buf)) & ~1U);
      int16_t* smp = (int16_t*)buf;
      for (size_t i = 0; i < n / 2; i++) smp[i] = (int16_t)(smp[i] * volumeGain);
      spk.write(buf, n);
      if (remaining > 0) remaining -= n;
      lastData = millis();
    } else {
      if (millis() - lastData > 4000) break;
      delay(1);
    }
  }
  http.end();
}

void handleReply(const String& resp) {
  if (resp.length() == 0) { hud("No reply from backend."); return; }
  JsonDocument doc;
  if (deserializeJson(doc, resp)) { hud("Bad JSON from backend."); return; }
  String text = doc["hud"] | doc["text"] | "";
  JsonArray labels = doc["labels"].as<JsonArray>();
  if (!labels.isNull() && labels.size() > 0) {     // AR-style label list
    String l;
    for (JsonVariant v : labels) { l += "> "; l += v.as<const char*>(); l += "\n"; }
    text = l;
  }
  hud(text);
  String audio = doc["audio_url"] | "";
  if (audio.length()) playUrl(audio);
}

// ---------------- mode actions ----------------
void actionAssistOrTranslate(bool translate) {
  hud(translate ? "Listening (6s)..." : "Listening (4s)...");
  led(true);
  camera_fb_t* fb = nullptr;
  if (!translate && haveCam) fb = esp_camera_fb_get();     // snapshot when you start talking
  size_t wavLen = 0;
  uint8_t* wav = mic.recordWAV(translate ? 6 : 4, &wavLen);
  led(false);
  hud("Thinking...");
  String resp = postMultipart(translate ? "/api/v1/translate" : "/api/v1/assist",
                              translate ? "translate" : "assist",
                              fb ? fb->buf : nullptr, fb ? fb->len : 0, wav, wavLen);
  if (fb) esp_camera_fb_return(fb);
  if (wav) free(wav);
  handleReply(resp);
}

void actionVision() {
  if (!haveCam) { hud("Camera not detected"); return; }
  hud("Scanning scene...");
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) { hud("Capture failed"); return; }
  String resp = postMultipart("/api/v1/vision", "vision", fb->buf, fb->len, nullptr, 0);
  esp_camera_fb_return(fb);
  handleReply(resp);
}

void actionMusic() {
  hud("Streaming music...\n(press to stop)");
  playUrl("/api/v1/music/stream");
  hud("Music stopped.");
  delay(400);
}

void pollNotify(bool force) {
  if (!force && millis() - lastNotifyPoll < 15000) return;
  lastNotifyPoll = millis();
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.setTimeout(5000);
  http.begin(String(BACKEND_URL) + "/api/v1/notify");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  if (http.GET() == 200) {
    JsonDocument doc;
    if (!deserializeJson(doc, http.getString())) {
      String t = doc["text"] | "";
      if (t.length()) { hudLine = t; if (mode == M_NOTIFY) hud(hudLine); else hud(t, "NOTICE"); }
    }
  }
  http.end();
}

void updateHeart() {
  if (!havePulse) return;
  long ir = pulse.getIR();
  fingerOn = ir > 50000;
  if (fingerOn && checkForBeat(ir)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();
    float bpm = 60.0f / (delta / 1000.0f);
    if (bpm > 30 && bpm < 220) {
      rates[rateSpot++] = (byte)bpm;
      rateSpot %= RATE_SIZE;
      int sum = 0; for (byte i = 0; i < RATE_SIZE; i++) sum += rates[i];
      beatAvg = sum / RATE_SIZE;
    }
  }
  if (!fingerOn && millis() - lastBeat > 5000) beatAvg = 0;
}

// ---------------- setup / loop ----------------
void setup() {
  Serial.begin(115200);
  delay(300);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  led(false);

  Wire.begin(PIN_SDA, PIN_SCL, 400000);
  haveDisplay = display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (haveDisplay) { display.setRotation(0); display.clearDisplay(); display.display(); }
  // Mirror text for a beam-splitter optic? Use display.setRotation(2) or flip in firmware.

  havePulse = pulse.begin(Wire, I2C_SPEED_FAST);
  if (havePulse) { pulse.setup(); pulse.setPulseAmplitudeRed(0x0A); pulse.setPulseAmplitudeGreen(0); }

  haveCam = initCamera();

  mic.setPinsPdmRx(PIN_MIC_CLK, PIN_MIC_DATA);
  if (!mic.begin(I2S_MODE_PDM_RX, SAMPLE_RATE, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO))
    Serial.println("Mic init failed");

  spk.setPins(PIN_I2S_BCLK, PIN_I2S_LRC, PIN_I2S_DIN);
  haveSpk = spk.begin(I2S_MODE_STD, SAMPLE_RATE, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO);
  if (!haveSpk) Serial.println("Speaker I2S init failed");

  btBegin();                               // variant: Bluetooth module control line (D9)
#if BT_FIRST_SETUP
  btRaw("RECV+SNAME+EDITH"); btRaw("RECV+MONO"); btRaw("RECV+MICSINGLE"); btRaw("RECV+CALLON");
  btRaw("COM+REBOOT");
#endif
  calibrateTouch();                        // keep fingers off the temple while booting
  connectWiFi();
  Serial.printf("cam=%d oled=%d pulse=%d spk=%d psram=%u\n", haveCam, haveDisplay, havePulse, haveSpk, ESP.getPsramSize());
  hud(hudLine);
}

void loop() {
  static unsigned long pressedAt = 0;
  static bool wasDown = false;
  static unsigned long lastHeartDraw = 0;

  updateHeart();
  applyGesture(pollTouch(), false);
  if (wakeRequested) { wakeRequested = false; connectWiFi(); actionAssistOrTranslate(false); }
  bool down = digitalRead(PIN_BUTTON) == LOW;
  if (down && !wasDown) pressedAt = millis();
  if (!down && wasDown) {
    unsigned long held = millis() - pressedAt;
    if (held > 30) {                           // debounce
      if (held >= 3000) { btCmd("PR"); hud("Pair your phone with\n\"EDITH\" in its\nBluetooth settings", "PAIRING"); wasDown = down; return; }
      connectWiFi();
      if (held >= 700) {
        mode = (Mode)((mode + 1) % M_COUNT);
        hud(String("Mode: ") + MODE_NAMES[mode]);
      } else {
        switch (mode) {
          case M_ASSIST:    actionAssistOrTranslate(false); break;
          case M_TRANSLATE: actionAssistOrTranslate(true);  break;
          case M_VISION:    actionVision();                 break;
          case M_MUSIC:     actionMusic();                  break;
          case M_HEART:     hud(havePulse ? "Hold sensor still..." : "No MAX3010x found"); break;
          case M_NOTIFY:    pollNotify(true); hud(hudLine); break;
          default: break;
        }
      }
    }
  }
  wasDown = down;

  if (mode == M_HEART && millis() - lastHeartDraw > 500) {
    lastHeartDraw = millis();
    hud(fingerOn ? String("BPM: ") + (beatAvg ? String(beatAvg) : String("...")) : String("Place sensor on skin"));
  }
  if (mode != M_HEART && mode != M_MUSIC) pollNotify(false);
  delay(mode == M_HEART ? 0 : 5);
}
