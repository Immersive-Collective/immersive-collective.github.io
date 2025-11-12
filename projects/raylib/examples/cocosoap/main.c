// main.c — Squares + Circles + per-shape textures + twist-to-rotate + music loop + bottom-right audio UI
#include "raylib.h"
#include <math.h>
#include <stdlib.h>
#include <stdio.h>
#include <stdbool.h>

// ---- Optional raygui integration -------------------------------------------
// Compile with -DUSE_RAYGUI and have raygui.h available to use the raygui panel.
// Otherwise a minimal raylib-only panel will be used automatically.
#ifdef USE_RAYGUI
    #define RAYGUI_IMPLEMENTATION
    #include "raygui.h"
#endif
// ----------------------------------------------------------------------------

#ifdef PLATFORM_WEB
    #include <emscripten/emscripten.h>
    #include <emscripten/html5.h>
#endif

// ------------ Build-time toggles ------------
#define DEBUG_DRAW        0
#define SHAPE_SHAPE_PUSH  1
#define ROTATE_TEXTURES   1   // twist / right-drag rotates (squares = geom, circles = texture)
// -------------------------------------------

// ---------------- Tunables -----------------
#define NUM_BALLS   3000
#define NUM_SHAPES  10

// --- GUI + music state ---
static float gMusicVol    = 0.35f;  // 0..1
static int   gMusicPaused = 1;      // start paused
static const float BALL_RADIUS_MIN = 1.0f;
static const float BALL_RADIUS_MAX = 20.0f;
static const float SPEED_MIN       = 0.0f;
static const float SPEED_MAX       = 50.0f;

static const float SQUARE_MIN_SIDE = 1.0f;
static const float SQUARE_MAX_SIDE = 50.0f;

static const float CIRCLE_R_MIN    = 20.0f;
static const float CIRCLE_R_MAX    = 300.0f;

static const float SPAWN_MARGIN         = 6.0f;
static const int   MAX_SUBSTEPS         = 2;
static const float SEP_BIAS             = 0.50f;
static const float TOUCH_DELTA_DEADZONE = 0.5f;
// -------------------------------------------

// ---------- Tap sound config ----------
static const int   TAP_SR        = 48000;
static const float TAP_BASE_IN   = 660.0f;
static const float TAP_BASE_OUT  = 440.0f;
static const float TAP_MS        = 70.0f;
static const float TAP_GAIN      = 0.20f;

static const float FREQ_MIN      = 320.0f;
static const float FREQ_MAX      = 1600.0f;
// -------------------------------------

// Gradient stops for ball colors
static const Color GRADIENT_STOPS[] = {
    (Color){255,255,255,255},
    (Color){255,141,161,255}
};
static const int GRADIENT_COUNT = (int)(sizeof(GRADIENT_STOPS)/sizeof(GRADIENT_STOPS[0]));

// ================== CONFIG BLOCK (EDIT HERE) ==================
typedef enum { SHAPE_SQUARE = 0, SHAPE_CIRCLE = 1 } ShapeType;
typedef enum { TEX_FIT_COVER=0, TEX_FIT_CONTAIN=1 } TexFit;

#define TEX_COUNT 5
static const char* TEX_PATHS[TEX_COUNT] = {
    "assets/characters/comp/1.png",
    "assets/characters/comp/2.png",
    "assets/characters/comp/3.png",
    "assets/characters/comp/4.png",
    "assets/characters/comp/5.png",
};

typedef struct {
    ShapeType type;
    float     x, y;
    float     size;       // squares = side px, circles = diameter px
    float     angle;      // squares: geometry rotation; circles: texture rotation
    int       texId;      // -1 = no texture, else index into TEX_PATHS
    TexFit    fit;        // TEX_FIT_COVER | TEX_FIT_CONTAIN
    Color     tint;       // WHITE = no tint
} ShapeInit;

static const ShapeInit SHAPES_PRESET[NUM_SHAPES] = {
    { SHAPE_CIRCLE,  640, 620, 200,  0, 0, TEX_FIT_COVER,   WHITE },
    { SHAPE_CIRCLE, 240, 820, 200,  0, 1, TEX_FIT_COVER,   WHITE },
    { SHAPE_CIRCLE, 940, 920, 200,  0, 2, TEX_FIT_COVER,   WHITE },
    { SHAPE_CIRCLE, 240, 920, 200,  0, 3, TEX_FIT_COVER,   WHITE },
    { SHAPE_CIRCLE, 540, 920, 200,  0, 4, TEX_FIT_COVER,   WHITE },
    { SHAPE_CIRCLE,  920, 320, 200,  0, 0, TEX_FIT_COVER,   WHITE },
    { SHAPE_CIRCLE, 280, 420, 200,  0, 1, TEX_FIT_COVER,   WHITE },
    { SHAPE_CIRCLE, 640, 320, 200,  0, 2, TEX_FIT_COVER,   WHITE },
    { SHAPE_CIRCLE, 840, 320, 200,  0, 3, TEX_FIT_COVER,   WHITE },
    { SHAPE_CIRCLE, 640, 920, 200,  0, 4, TEX_FIT_COVER,   WHITE },
};
// ================= END CONFIG BLOCK =================

// ----- Texture bank -----
static Texture2D gTextures[TEX_COUNT] = {0};
static int gTexLoaded = 0;

static inline int TextureOk(Texture2D t){ return (t.id != 0) && (t.width > 0) && (t.height > 0); }
static inline int TextureIndexOk(int idx){ return (idx >= 0 && idx < TEX_COUNT && TextureOk(gTextures[idx])); }

static void LoadTextureBank(void){
    if (gTexLoaded) return;
    for (int i=0;i<TEX_COUNT;++i){
        if (FileExists(TEX_PATHS[i])){
            gTextures[i] = LoadTexture(TEX_PATHS[i]);
            if (TextureOk(gTextures[i])) SetTextureFilter(gTextures[i], TEXTURE_FILTER_BILINEAR);
        }
    }
    gTexLoaded = 1;
}
static void UnloadTextureBank(void){
    if (!gTexLoaded) return;
    for (int i=0;i<TEX_COUNT;++i){
        if (TextureOk(gTextures[i])) UnloadTexture(gTextures[i]);
        gTextures[i] = (Texture2D){0};
    }
    gTexLoaded = 0;
}

// ----- Types -----
typedef struct { float x, y, vx, vy, r; int trappedFrames; Color col; } Ball;

typedef struct {
    ShapeType type;
    float x, y;     // center
    float half;     // for squares (half side)
    float radius;   // for circles
    float angle;    // squares: geometry; circles: texture
    int   texId;    // -1 = no texture; else index into gTextures[]
    TexFit fit;     // scaling mode
    Color tint;     // tint for texture
} Shape;

typedef struct { int id; Vector2 pos; } TrackedTouch;

typedef struct {
    float *dummy;
    Ball  *balls;
    int    ballCount;
} AppState;

// ---------- Gesture-safe audio + size→pitch ----------
static int   gAudioReady = 0;
static Sound gTapIn = (Sound){0}, gTapOut = (Sound){0};

static Wave MakeTapWave(float freqHz, float ms, float gain, int sr){
    const float durSec = ms * (1.0f/1000.0f);
    int frames = (int)(durSec * (float)sr);
    if (frames < 1) frames = 1;

    float *buf = (float*)MemAlloc(sizeof(float) * frames);
    const float twopi = 6.28318530717958647692f;
    const float dphi  = twopi * freqHz / (float)sr;

    int attack = (int)(0.003f * sr); if (attack < 1) attack = 1; if (attack > frames) attack = frames;
    int decay  = frames - attack;    if (decay  < 1) decay  = 1;

    float phase = 0.0f;
    for (int i=0;i<frames;++i){
        float s = sinf(phase);
        float env = (i < attack) ? ((float)i / (float)attack)
                                 : expf(-6.0f * (float)(i-attack) / (float)decay);
        buf[i] = s * env * gain;
        phase += dphi;
        if (phase > twopi) phase -= twopi;
    }

    Wave w = (Wave){0};
    w.frameCount = (unsigned int)frames;
    w.sampleRate = sr;
    w.sampleSize = 32;
    w.channels   = 1;
    w.data       = buf;
    return w;
}

static void EnsureAudioReady(void){
    if (gAudioReady) return;
    InitAudioDevice();
    SetMasterVolume(1.0f);
    Wave wIn  = MakeTapWave(TAP_BASE_IN,  TAP_MS, TAP_GAIN, TAP_SR);
    Wave wOut = MakeTapWave(TAP_BASE_OUT, TAP_MS, TAP_GAIN, TAP_SR);
    gTapIn  = LoadSoundFromWave(wIn);
    gTapOut = LoadSoundFromWave(wOut);
    UnloadWave(wIn);
    UnloadWave(wOut);
    gAudioReady = 1;
}

static inline float ShapeSizeForPitch(const Shape *s){
    float side = (s->type==SHAPE_SQUARE) ? (s->half*2.0f) : (s->radius*2.0f);
    float minSide = (s->type==SHAPE_SQUARE) ? SQUARE_MIN_SIDE : (CIRCLE_R_MIN*2.0f);
    float maxSide = (s->type==SHAPE_SQUARE) ? SQUARE_MAX_SIDE : (CIRCLE_R_MAX*2.0f);
    if (side < minSide) side = minSide;
    if (side > maxSide) side = maxSide;
    float t = (side - minSide) / (maxSide - minSide);
    return FREQ_MAX + (FREQ_MIN - FREQ_MAX) * t;
}
static inline void PlayTapInForShape(const Shape *s){
    if (!gAudioReady) EnsureAudioReady(); if (!gAudioReady) return;
    float want = ShapeSizeForPitch(s);
    float pitch = want / TAP_BASE_IN;
    if (pitch < 0.25f) pitch = 0.25f; if (pitch > 4.0f) pitch = 4.0f;
    SetSoundPitch(gTapIn, pitch);
    PlaySound(gTapIn);
}
static inline void PlayTapOutForShape(const Shape *s){
    if (!gAudioReady) EnsureAudioReady(); if (!gAudioReady) return;
    float want = ShapeSizeForPitch(s);
    float pitch = want / TAP_BASE_OUT;
    if (pitch < 0.25f) pitch = 0.25f; if (pitch > 4.0f) pitch = 4.0f;
    SetSoundPitch(gTapOut, pitch);
    PlaySound(gTapOut);
}

// ---------- Music loop ----------
static Music gLoop = (Music){0};
static int gMusicLoaded  = 0;
static int gMusicPlaying = 0;
static int gGestureOk    = 0;   // set to 1 after any user input (needed on Web)

static void EnsureMusicLoaded(void){
    if (!gAudioReady) EnsureAudioReady();
    if (!gMusicLoaded){
        gLoop = LoadMusicStream("assets/audio/loop1.mp3");
        if (gLoop.ctxData != NULL){
            SetMusicVolume(gLoop, gMusicVol);
            gMusicLoaded = 1;
        }
    }
}
static void MusicPlay(void){
    EnsureMusicLoaded();
    if (gMusicLoaded && !gMusicPlaying){
        PlayMusicStream(gLoop);
        gMusicPlaying = 1;
        gMusicPaused  = 0;
    }
}
static void MusicPause(void){
    if (gMusicLoaded && gMusicPlaying){
        PauseMusicStream(gLoop);
        gMusicPlaying = 0;
        gMusicPaused  = 1;
    }
}

// --------- Helpers ---------
static inline Vector2 V2(float x, float y){ Vector2 v=(Vector2){x,y}; return v; }
static inline Vector2 RotateCS(Vector2 v, float c, float s){ return (Vector2){ c*v.x - s*v.y, s*v.x + c*v.y }; }
static inline Vector2 InvRotateCS(Vector2 v, float c, float s){ return (Vector2){ c*v.x + s*v.y, -s*v.x + c*v.y }; }
static inline Vector2 Reflect(Vector2 v, Vector2 n){ float d=v.x*n.x + v.y*n.y; return (Vector2){ v.x-2.0f*d*n.x, v.y-2.0f*d*n.y }; }

static inline Color LerpColor(Color a, Color b, float t){
    if (t < 0.0f) t = 0.0f; if (t > 1.0f) t = 1.0f;
    Color c;
    c.r = (unsigned char)(a.r + (b.r - a.r) * t);
    c.g = (unsigned char)(a.g + (b.g - a.g) * t);
    c.b = (unsigned char)(a.b + (b.b - a.b) * t);
    c.a = (unsigned char)(a.a + (b.a - a.a) * t);
    return c;
}
static inline Color GradientSample(const Color *stops, int count, float t){
    if (count <= 0) return WHITE;
    if (count == 1) return stops[0];
    if (t <= 0.0f) return stops[0];
    if (t >= 1.0f) return stops[count-1];
    float seg = t * (float)(count - 1);
    int   i   = (int)seg;
    float ft  = seg - (float)i;
    if (i >= count - 1) { i = count - 2; ft = 1.0f; }
    return LerpColor(stops[i], stops[i+1], ft);
}

// ----- Shape queries -----
static inline int PointInSquare(float px, float py, const Shape *sq){
    const float PI_F = 3.14159265358979323846f;
    float a = sq->angle*(PI_F/180.0f), c=cosf(a), s=sinf(a);
    Vector2 pl = InvRotateCS((Vector2){ px - sq->x, py - sq->y }, c, s);
    return (fabsf(pl.x) <= sq->half && fabsf(pl.y) <= sq->half);
}
static inline int PointInCircle(float px, float py, const Shape *sc){
    float dx = px - sc->x, dy = py - sc->y;
    return (dx*dx + dy*dy) <= (sc->radius*sc->radius);
}
static inline int PointInShape(float px, float py, const Shape *sh){
    return (sh->type==SHAPE_SQUARE) ? PointInSquare(px,py,sh) : PointInCircle(px,py,sh);
}
static int TopShapeAt(float px, float py, const Shape *shapes, int count){
    for (int i=count-1;i>=0;--i) if (PointInShape(px, py, &shapes[i])) return i;
    return -1;
}
static inline float ShapeHullRadius(const Shape *sh){
    return (sh->type==SHAPE_SQUARE)? (sh->half*1.41421356237f) : sh->radius;
}
static inline void PushOutsideHull(const Shape *sh, float r, float *bx, float *by){
    float dx = *bx - sh->x, dy = *by - sh->y;
    float len2 = dx*dx + dy*dy;
    float minD = ShapeHullRadius(sh) + r + SPAWN_MARGIN;
    float minD2 = minD*minD;
    if (len2 < 1e-8f){ dx=1.0f; dy=0.0f; len2=1.0f; }
    if (len2 < minD2){
        float s = minD / sqrtf(len2);
        *bx = sh->x + dx*s; *by = sh->y + dy*s;
    }
}

// ----- Ball helpers -----
static inline void AssignBallKinematicsAndColor(Ball *b){
    const float PI_F = 3.14159265358979323846f;
    float angle = (float)GetRandomValue(0, 359) * (PI_F/180.0f);
    float speed = (float)GetRandomValue((int)SPEED_MIN, (int)SPEED_MAX);
    float t01   = (float)GetRandomValue(0,1000)/1000.0f;
    b->r   = BALL_RADIUS_MIN + t01 * (BALL_RADIUS_MAX - BALL_RADIUS_MIN);
    b->col = GradientSample(GRADIENT_STOPS, GRADIENT_COUNT, t01);
    b->vx  = cosf(angle) * speed;
    b->vy  = sinf(angle) * speed;
    if (fabsf(b->vx) < 1e-3f && fabsf(b->vy) < 1e-3f){ b->vx = speed; b->vy = 0.0f; }
    b->trappedFrames = 0;
}

static int CenterInsideAnyShape(const Shape *shapes, int n, float px, float py){
    for (int i=0;i<n;++i) if (PointInShape(px, py, &shapes[i])) return 1;
    return 0;
}

static void RespawnBallOutsideAllShapes(Ball *b, const Shape *shapes, int n, float seedX, float seedY){
    AssignBallKinematicsAndColor(b);
    const int sw = GetScreenWidth();
    const int sh = GetScreenHeight();
    const float PI_F = 3.14159265358979323846f;

    for (int tries=0; tries<256; ++tries){
        float ang = (float)GetRandomValue(0, 359) * (PI_F/180.0f);
        float maxHull = 0.0f;
        for (int i=0;i<n;++i){
            float dx = seedX - shapes[i].x, dy = seedY - shapes[i].y;
            float d  = sqrtf(dx*dx + dy*dy);
            float hull = d + ShapeHullRadius(&shapes[i]) + b->r + SPAWN_MARGIN;
            if (hull > maxHull) maxHull = hull;
        }
        float extra  = (float)GetRandomValue(0, 200);
        float radial = (maxHull > 0.0f ? maxHull : 200.0f) + extra;

        float x = seedX + cosf(ang) * radial;
        float y = seedY + sinf(ang) * radial;

        if (x < b->r) x = b->r; if (x > sw - b->r) x = sw - b->r;
        if (y < b->r) y = b->r; if (y > sh - b->r) y = sh - b->r;

        for (int i=0;i<n;++i) PushOutsideHull(&shapes[i], b->r, &x, &y);

        if (!CenterInsideAnyShape(shapes, n, x, y)){ b->x = x; b->y = y; return; }
    }

    for (int tries=0; tries<2048; ++tries){
        float x = (float)GetRandomValue((int)BALL_RADIUS_MIN, (int)(sw - BALL_RADIUS_MIN));
        float y = (float)GetRandomValue((int)BALL_RADIUS_MIN, (int)(sh - BALL_RADIUS_MIN));
        if (!CenterInsideAnyShape(shapes, n, x, y)){ b->x = x; b->y = y; return; }
    }
    b->x = sw*0.5f; b->y = BALL_RADIUS_MAX + SPAWN_MARGIN;
    for (int i=0;i<n;++i) PushOutsideHull(&shapes[i], b->r, &b->x, &b->y);
}

// ----- Ball vs. shape collision -----
static inline void ResolveCircleVsSquare(const Shape *sq, float radius, float *bx, float *by, float *vx, float *vy){
    const float PI_F = 3.14159265358979323846f;
    float a = sq->angle*(PI_F/180.0f), c=cosf(a), s=sinf(a);

    Vector2 pW = (Vector2){ *bx - sq->x, *by - sq->y };
    Vector2 vW = (Vector2){ *vx, *vy };
    Vector2 pL = InvRotateCS(pW, c, s);
    Vector2 vL = InvRotateCS(vW, c, s);

    float h = sq->half;
    float cx = (pL.x < -h) ? -h : (pL.x >  h) ?  h : pL.x;
    float cy = (pL.y < -h) ? -h : (pL.y >  h) ?  h : pL.y;

    float dx = pL.x - cx, dy = pL.y - cy;
    float dist2 = dx*dx + dy*dy;

    if (dist2 <= radius*radius){
        float dist = (dist2 > 0.0f) ? sqrtf(dist2) : 0.0f;
        Vector2 nL = (dist > 1.0f)? (Vector2){ dx/dist, dy/dist }
                                  : (fabsf(vL.x) > fabsf(vL.y)) ? (Vector2){ (vL.x>0.0f)?1.0f:-1.0f, 0.0f }
                                                                 : (Vector2){ 0.0f, (vL.y>0.0f)?1.0f:-1.0f };
        float penetration = (radius - dist) + SEP_BIAS; if (penetration < 0.0f) penetration = 0.0f;
        Vector2 nW = RotateCS(nL, c, s);
        *bx += nW.x * penetration; *by += nW.y * penetration;

        Vector2 vRef = Reflect((Vector2){ *vx, *vy }, nW);
        *vx = vRef.x; *vy = vRef.y;

        *bx += (*vx) * (1.0f/8000.0f);
        *by += (*vy) * (1.0f/8000.0f);
    }
}
static inline void ResolveCircleVsCircle(const Shape *sc, float radius, float *bx, float *by, float *vx, float *vy){
    float dx = *bx - sc->x, dy = *by - sc->y;
    float rSum = radius + sc->radius;
    float d2   = dx*dx + dy*dy;
    if (d2 <= rSum*rSum){
        float d = (d2>0.0f)? sqrtf(d2) : 0.0f;
        Vector2 n = (d>1.0e-6f)? (Vector2){ dx/d, dy/d }
                               : (fabsf(*vx) > fabsf(*vy)) ? (Vector2){ (*vx>0.0f)?1.0f:-1.0f, 0.0f }
                                                           : (Vector2){ 0.0f, (*vy>0.0f)?1.0f:-1.0f };
        float penetration = (rSum - d) + SEP_BIAS; if (penetration < 0.0f) penetration = 0.0f;
        *bx += n.x * penetration; *by += n.y * penetration;

        Vector2 vRef = Reflect((Vector2){ *vx, *vy }, n);
        *vx = vRef.x; *vy = vRef.y;

        *bx += (*vx) * (1.0f/8000.0f);
        *by += (*vy) * (1.0f/8000.0f);
    }
}
static inline void ResolveCircleVsShape(const Shape *sh, float radius, float *bx, float *by, float *vx, float *vy){
    if (sh->type==SHAPE_SQUARE) ResolveCircleVsSquare(sh, radius, bx, by, vx, vy);
    else                        ResolveCircleVsCircle(sh, radius, bx, by, vx, vy);
}

// ----- Web callbacks -----
#ifdef PLATFORM_WEB
static EM_BOOL FirstMouseCB(int eventType, const EmscriptenMouseEvent *e, void *ud){
    (void)eventType; (void)e; (void)ud;
    EnsureAudioReady();
    gGestureOk = 1;
    return EM_TRUE;
}
static EM_BOOL FirstTouchCB(int eventType, const EmscriptenTouchEvent *e, void *ud){
    (void)eventType; (void)e; (void)ud;
    EnsureAudioReady();
    gGestureOk = 1;
    return EM_TRUE;
}
static EM_BOOL FirstKeyCB(int eventType, const EmscriptenKeyboardEvent *e, void *ud){
    (void)eventType; (void)e; (void)ud;
    EnsureAudioReady();
    gGestureOk = 1;
    return EM_TRUE;
}
static EM_BOOL EatTouchCB(int eventType, const EmscriptenTouchEvent *e, void *ud){
    (void)eventType; (void)e; (void)ud; return EM_TRUE;
}
#endif

// ----- Touch tracking -----
static inline int FindTouchById(int id, Vector2 *outPos){
    int count = GetTouchPointCount();
    for (int i=0;i<count;++i){
        if (GetTouchPointId(i) == id){ *outPos = GetTouchPosition(i); return 1; }
    }
    return 0;
}
static void UpdateTrackedTouches(TrackedTouch *t0, TrackedTouch *t1){
    int count = GetTouchPointCount();
    TrackedTouch prev0 = *t0, prev1 = *t1;
    t0->id = -1; t1->id = -1;
    if (count <= 0) return;

    Vector2 pos;
    if (prev0.id != -1 && FindTouchById(prev0.id, &pos)){ t0->id = prev0.id; t0->pos = pos; }
    if (prev1.id != -1 && FindTouchById(prev1.id, &pos)){
        if (t0->id == -1){ t0->id = prev1.id; t0->pos = pos; }
        else             { t1->id = prev1.id; t1->pos = pos; }
    }
    for (int i=0;i<count && (t0->id == -1 || t1->id == -1); ++i){
        int id = GetTouchPointId(i);
        if (id == t0->id || id == t1->id) continue;
        Vector2 p = GetTouchPosition(i);
        if (t0->id == -1){ t0->id = id; t0->pos = p; }
        else             { t1->id = id; t1->pos = p; }
    }
}

// ----- Audio GUI (raygui if available, otherwise raylib-only) -----
static void DrawAudioGUI(void){
    const int sw = GetScreenWidth();
    const int sh = GetScreenHeight();

    const int pad = 12;
    const int panelW = 320;
    const int panelH = 86;
    Rectangle panel = { (float)sw - panelW - pad, (float)sh - panelH - pad, (float)panelW, (float)panelH };

#ifdef USE_RAYGUI
    GuiPanel(panel);
    DrawText("Audio", (int)(panel.x + 10), (int)(panel.y + 8), 20, (Color){40,40,40,255});

    Rectangle btn = { panel.x + 12, panel.y + 36, 112, 32 };
    const char *btnLabel = (gMusicPlaying ? "Pause" : "Play");
    if (GuiButton(btn, btnLabel)){
        if (gMusicPlaying) { MusicPause(); }
        else               { if (gGestureOk) MusicPlay(); }
    }

    Rectangle sld = { panel.x + 136, panel.y + 36, 132, 32 };
    float prevVol = gMusicVol;
    gMusicVol = GuiSliderBar(sld, NULL, NULL, gMusicVol, 0.0f, 1.0f);
    if (gMusicLoaded && gMusicVol != prevVol) SetMusicVolume(gLoop, gMusicVol);

    int pct = (int)(gMusicVol * 100.0f + 0.5f);
    char buf[16]; snprintf(buf, sizeof(buf), "%d%%", pct);
    DrawText(buf, (int)(sld.x + sld.width + 6), (int)(sld.y + 8), 16, (Color){40,40,40,255});
#else
    // Minimal raylib-only panel
    DrawRectangleRec(panel, (Color){245,245,245,230});
    DrawRectangleLinesEx(panel, 1.0f, (Color){200,200,200,255});
    DrawText("Audio", (int)(panel.x + 10), (int)(panel.y + 8), 18, (Color){40,40,40,255});

    // Button (toggle)
    Rectangle btn = { panel.x + 12, panel.y + 36, 112, 32 };
    Color bcol = (Color){230,230,230,255};
    Color bbor = (Color){160,160,160,255};
    Vector2 m = GetMousePosition();
    bool hover = CheckCollisionPointRec(m, btn);
    if (hover) { bcol = (Color){220,220,220,255}; }
    DrawRectangleRec(btn, bcol);
    DrawRectangleLinesEx(btn, 1.0f, bbor);
    const char *btnLabel = (gMusicPlaying ? "Pause" : "Play");
    int tw = MeasureText(btnLabel, 16);
    DrawText(btnLabel, (int)(btn.x + (btn.width - tw)/2), (int)(btn.y + 8), 16, (Color){30,30,30,255});
    if (hover && IsMouseButtonPressed(MOUSE_LEFT_BUTTON)){
        if (gMusicPlaying) { MusicPause(); }
        else               { if (gGestureOk) MusicPlay(); }
    }

    // Slider (0..1)
    Rectangle sld = { panel.x + 136, panel.y + 36, 132, 32 };
    DrawRectangleLinesEx(sld, 1.0f, (Color){160,160,160,255});
    float trackY = sld.y + sld.height*0.5f;
    DrawLine((int)(sld.x + 8), (int)trackY, (int)(sld.x + sld.width - 8), (int)trackY, (Color){160,160,160,255});
    float knobX = sld.x + 8 + (sld.width - 16) * gMusicVol;
    Rectangle knob = { knobX - 6, trackY - 10, 12, 20 };
    DrawRectangleRec(knob, (Color){210,210,210,255});
    DrawRectangleLinesEx(knob, 1.0f, (Color){150,150,150,255});

    if (IsMouseButtonDown(MOUSE_LEFT_BUTTON) && CheckCollisionPointRec(m, sld)){
        float t = (m.x - (sld.x + 8)) / (sld.width - 16);
        if (t < 0.0f) t = 0.0f; if (t > 1.0f) t = 1.0f;
        if (fabsf(t - gMusicVol) > 1e-6f){
            gMusicVol = t;
            if (gMusicLoaded) SetMusicVolume(gLoop, gMusicVol);
        }
    }

    int pct = (int)(gMusicVol * 100.0f + 0.5f);
    char buf[16]; snprintf(buf, sizeof(buf), "%d%%", pct);
    DrawText(buf, (int)(sld.x + sld.width + 6), (int)(sld.y + 8), 16, (Color){40,40,40,255});
#endif
}

// ----- Drawing helper -----
static void DrawShapeWithTexture(const Shape *sh){
    if (sh->type == SHAPE_SQUARE){
        float sideNow = sh->half * 2.0f;
        if (TextureIndexOk(sh->texId)){
            Texture2D tex = gTextures[sh->texId];
            float sx = (float)tex.width, sy = (float)tex.height;
            float sCover   = fmaxf(sideNow/sx, sideNow/sy);
            float sContain = fminf(sideNow/sx, sideNow/sy);
            float scale = (sh->fit == TEX_FIT_COVER) ? sCover : sContain;
            Rectangle src  = (Rectangle){0,0,sx,sy};
            Rectangle dest = (Rectangle){sh->x, sh->y, sx*scale, sy*scale};
            Vector2   org  = (Vector2){dest.width*0.5f, dest.height*0.5f};
            DrawTexturePro(tex, src, dest, org, sh->angle, sh->tint);
        } else {
            DrawRectanglePro((Rectangle){ sh->x, sh->y, sideNow, sideNow },
                             (Vector2){ sh->half, sh->half }, sh->angle, (Color){230,230,230,255});
        }
#if DEBUG_DRAW
        DrawCircleLines((int)sh->x, (int)sh->y, (int)ShapeHullRadius(sh), (Color){255,0,0,80});
#endif
    } else { // circle
        float d = sh->radius * 2.0f;
        if (TextureIndexOk(sh->texId)){
            Texture2D tex = gTextures[sh->texId];
            float sx = (float)tex.width, sy = (float)tex.height;
            float sCover   = fmaxf(d/sx, d/sy);
            float sContain = fminf(d/sx, d/sy);
            float scale    = (sh->fit == TEX_FIT_COVER) ? sCover : sContain;
            Rectangle src  = (Rectangle){ 0, 0, sx, sy };
            Rectangle dest = (Rectangle){ sh->x, sh->y, sx*scale, sy*scale };
            Vector2   org  = (Vector2){ dest.width*0.5f, dest.height*0.5f };
            float     ang  = ROTATE_TEXTURES ? sh->angle : 0.0f;
            DrawTexturePro(tex, src, dest, org, ang, sh->tint);
        } else {
            DrawCircleV(V2(sh->x, sh->y), sh->radius, (Color){245,245,245,255});
        }
#if DEBUG_DRAW
        DrawCircleLines((int)sh->x, (int)sh->y, (int)sh->radius, RED);
#endif
    }
}

#ifdef PLATFORM_WEB
// ----- Resize callback (file scope) -----
static EM_BOOL OnResize(int eventType, const EmscriptenUiEvent *ui, void *userData){
    (void)eventType; (void)ui;
    AppState *s = (AppState*)userData;

    double cssW = 0.0, cssH = 0.0;
    emscripten_get_element_css_size("#canvas", &cssW, &cssH);
    const double dpr = emscripten_get_device_pixel_ratio();
    emscripten_set_canvas_element_size("#canvas", (int)(cssW*dpr), (int)(cssH*dpr));
    SetWindowSize((int)cssW, (int)cssH);

    const float sw = (float)GetScreenWidth();
    const float sh = (float)GetScreenHeight();
    for (int i=0;i<s->ballCount;++i){
        Ball *b = &s->balls[i];
        if (b->x < b->r) b->x = b->r;
        if (b->y < b->r) b->y = b->r;
        if (b->x > sw - b->r) b->x = sw - b->r;
        if (b->y > sh - b->r) b->y = sh - b->r;
        b->trappedFrames = 0;
    }
    return EM_TRUE;
}
#endif

// -----------------------------------------------
int main(void){
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_VSYNC_HINT);
    InitWindow(1024, 600, "raylib: Shapes + balls + textures");
    SetTargetFPS(90);
    SetTraceLogLevel(LOG_DEBUG);

    LoadTextureBank();

#ifdef PLATFORM_WEB
    emscripten_set_mousedown_callback("#canvas", NULL, EM_TRUE, FirstMouseCB);
    emscripten_set_touchstart_callback("#canvas", NULL, EM_TRUE, FirstTouchCB);
    emscripten_set_keydown_callback(EMSCRIPTEN_EVENT_TARGET_WINDOW, NULL, EM_TRUE, FirstKeyCB);
    emscripten_set_touchmove_callback ("#canvas", NULL, EM_TRUE, EatTouchCB);
    emscripten_set_touchend_callback  ("#canvas", NULL, EM_TRUE, EatTouchCB);
    emscripten_set_touchcancel_callback("#canvas", NULL, EM_TRUE, EatTouchCB);
#endif

    const int swInit = GetScreenWidth();
    const int shInit = GetScreenHeight();

    // ----- Build shapes from preset -----
    Shape shapes[NUM_SHAPES] = {0};
    for (int i=0;i<NUM_SHAPES;++i){
        const ShapeInit *S = &SHAPES_PRESET[i];
        shapes[i].type  = S->type;
        shapes[i].x     = S->x;
        shapes[i].y     = S->y;
        shapes[i].angle = S->angle;
        shapes[i].texId = (S->texId >= 0 && S->texId < TEX_COUNT && TextureOk(gTextures[S->texId])) ? S->texId : -1;
        shapes[i].fit   = S->fit;
        shapes[i].tint  = S->tint;
        if (S->type == SHAPE_SQUARE){
            float side = (S->size <= 0 ? 160.0f : S->size);
            if (side < SQUARE_MIN_SIDE) side = SQUARE_MIN_SIDE;
            if (side > SQUARE_MAX_SIDE) side = SQUARE_MAX_SIDE;
            shapes[i].half   = side * 0.5f;
            shapes[i].radius = 0.0f;
        } else {
            float diam = (S->size <= 0 ? 160.0f : S->size);
            float r = diam * 0.5f;
            if (r < CIRCLE_R_MIN) r = CIRCLE_R_MIN;
            if (r > CIRCLE_R_MAX) r = CIRCLE_R_MAX;
            shapes[i].radius = r;
            shapes[i].half   = 0.0f;
        }
    }

    // Pinch bases
    float pinchBaseDist[NUM_SHAPES]={0}, pinchBaseSide[NUM_SHAPES]={0}, pinchBaseAngleDeg[NUM_SHAPES]={0}, pinchStartVecDeg[NUM_SHAPES]={0};
    for (int i=0;i<NUM_SHAPES;++i){
        pinchBaseSide[i] = (shapes[i].type==SHAPE_SQUARE)? (shapes[i].half*2.0f):(shapes[i].radius*2.0f);
    }

    // Input state
    TrackedTouch t0 = (TrackedTouch){ .id = -1, .pos = (Vector2){0} };
    TrackedTouch t1 = (TrackedTouch){ .id = -1, .pos = (Vector2){0} };
    int prevTouchCount = 0;

    int dragMouseShape    = -1;
    int rotateMouseShape  = -1; // right-drag rotates
    int dragTouchShape    = -1;
    int pinchShape        = -1;
    int pinchActive       = 0;

    // Balls
    Ball *balls = (Ball*)malloc(sizeof(Ball) * NUM_BALLS);
    if (!balls){ CloseWindow(); return 1; }
    {
        float seedX = swInit * 0.5f, seedY = shInit * 0.5f;
        for (int i=0;i<NUM_BALLS;++i) RespawnBallOutsideAllShapes(&balls[i], shapes, NUM_SHAPES, seedX, seedY);
    }

#ifdef PLATFORM_WEB
    AppState state = { .dummy=NULL, .balls=balls, .ballCount=NUM_BALLS };
    OnResize(0, NULL, &state);
    emscripten_set_resize_callback(EMSCRIPTEN_EVENT_TARGET_WINDOW, &state, EM_TRUE, OnResize);
#endif

    while (!WindowShouldClose()){
        const float dt   = GetFrameTime();
        const int   swWin = GetScreenWidth();
        const int   shWin = GetScreenHeight();

        // ---------- INPUT ----------
        int touchCount = GetTouchPointCount();

        if (touchCount == 0){
            Vector2 mpos = GetMousePosition();

            if (IsMouseButtonPressed(MOUSE_LEFT_BUTTON)){
                gGestureOk = 1;
                int top = TopShapeAt(mpos.x, mpos.y, shapes, NUM_SHAPES);
                dragMouseShape = top;
                if (dragMouseShape != -1) PlayTapInForShape(&shapes[dragMouseShape]); else { EnsureAudioReady(); PlaySound(gTapIn); }
            }
            if (IsMouseButtonReleased(MOUSE_LEFT_BUTTON)){
                int idx = (dragMouseShape != -1) ? dragMouseShape : TopShapeAt(mpos.x, mpos.y, shapes, NUM_SHAPES);
                if (idx < 0) idx = 0;
                PlayTapOutForShape(&shapes[idx]);
                dragMouseShape = -1;
            }
            if (dragMouseShape != -1 && IsMouseButtonDown(MOUSE_LEFT_BUTTON)){
                Vector2 d = GetMouseDelta();
                if (fabsf(d.x) > TOUCH_DELTA_DEADZONE || fabsf(d.y) > TOUCH_DELTA_DEADZONE){
                    shapes[dragMouseShape].x += d.x;
                    shapes[dragMouseShape].y += d.y;
                }
            }

            if (IsMouseButtonPressed(MOUSE_RIGHT_BUTTON)){
                gGestureOk = 1;
                rotateMouseShape = TopShapeAt(mpos.x, mpos.y, shapes, NUM_SHAPES);
                if (rotateMouseShape != -1) PlayTapInForShape(&shapes[rotateMouseShape]); else { EnsureAudioReady(); PlaySound(gTapIn); }
            }
            if (IsMouseButtonReleased(MOUSE_RIGHT_BUTTON)){
                int idx = (rotateMouseShape != -1) ? rotateMouseShape : TopShapeAt(mpos.x, mpos.y, shapes, NUM_SHAPES);
                if (idx < 0) idx = 0;
                PlayTapOutForShape(&shapes[idx]);
                rotateMouseShape = -1;
            }
            if (rotateMouseShape != -1 && IsMouseButtonDown(MOUSE_RIGHT_BUTTON)){
                Vector2 d = GetMouseDelta();
                if (fabsf(d.x) > TOUCH_DELTA_DEADZONE) shapes[rotateMouseShape].angle += d.x * 0.35f;
            }

            float wheel = GetMouseWheelMove();
            if (wheel != 0.0f){
                int idx = TopShapeAt(mpos.x, mpos.y, shapes, NUM_SHAPES);
                if (idx < 0) idx = NUM_SHAPES-1;
                if (shapes[idx].type==SHAPE_SQUARE){
                    float side = shapes[idx].half * 2.0f + wheel * 8.0f;
                    if (side < SQUARE_MIN_SIDE) side = SQUARE_MIN_SIDE;
                    if (side > SQUARE_MAX_SIDE) side = SQUARE_MAX_SIDE;
                    shapes[idx].half = side * 0.5f;
                } else {
                    float r = shapes[idx].radius + wheel * 8.0f;
                    if (r < CIRCLE_R_MIN) r = CIRCLE_R_MIN;
                    if (r > CIRCLE_R_MAX) r = CIRCLE_R_MAX;
                    shapes[idx].radius = r;
                }
            }

            // reset touch state
            t0.id = -1; t1.id = -1; prevTouchCount = 0; pinchActive = 0; dragTouchShape = -1; pinchShape = -1;
        } else {
            TrackedTouch prev0 = t0, prev1 = t1;
            UpdateTrackedTouches(&t0, &t1);
            int effectiveCount = (t0.id != -1) + (t1.id != -1);

            if (prevTouchCount >= 2 && effectiveCount == 1){ pinchActive = 0; pinchShape = -1; }
            if (prevTouchCount == 0 && effectiveCount >= 1){ if (t0.id != -1) prev0 = t0; if (t1.id != -1) prev1 = t1; }

            if (effectiveCount == 1){
                const TrackedTouch *a = (t0.id != -1)? &t0 : &t1;
                if (prevTouchCount == 0){
                    gGestureOk = 1;
                    dragTouchShape = TopShapeAt(a->pos.x, a->pos.y, shapes, NUM_SHAPES);
                    if (dragTouchShape != -1) PlayTapInForShape(&shapes[dragTouchShape]); else { EnsureAudioReady(); PlaySound(gTapIn); }
                }
                if (dragTouchShape != -1){
                    Vector2 base = (a->id == prev0.id) ? prev0.pos : prev1.pos;
                    Vector2 d = (Vector2){ a->pos.x - base.x, a->pos.y - base.y };
                    if (fabsf(d.x) > TOUCH_DELTA_DEADZONE || fabsf(d.y) > TOUCH_DELTA_DEADZONE){
                        shapes[dragTouchShape].x += d.x;
                        shapes[dragTouchShape].y += d.y;
                    }
                }
                pinchActive = 0; pinchShape = -1;
            } else if (effectiveCount >= 2){
                if (prevTouchCount < 2 && pinchShape == -1){
                    gGestureOk = 1;
                    Vector2 c = (Vector2){ (t0.pos.x+t1.pos.x)*0.5f, (t0.pos.y+t1.pos.y)*0.5f };
                    int sIdx = TopShapeAt(c.x, c.y, shapes, NUM_SHAPES);
                    if (sIdx < 0){
                        int a = TopShapeAt(t0.pos.x, t0.pos.y, shapes, NUM_SHAPES);
                        int b = TopShapeAt(t1.pos.x, t1.pos.y, shapes, NUM_SHAPES);
                        sIdx = (a>=0)? a : b;
                    }
                    pinchShape = sIdx;
                    if (pinchShape != -1) PlayTapInForShape(&shapes[pinchShape]); else { EnsureAudioReady(); PlaySound(gTapIn); }
                    pinchActive = 0;
                }

                if (pinchShape != -1){
                    Shape *sh = &shapes[pinchShape];

                    Vector2 curC = (Vector2){ (t0.pos.x + t1.pos.x)*0.5f, (t0.pos.y + t1.pos.y)*0.5f };
                    Vector2 prvC;
                    if      (t0.id == prev0.id && t1.id == prev1.id) prvC = (Vector2){ (prev0.pos.x+prev1.pos.x)*0.5f,(prev0.pos.y+prev1.pos.y)*0.5f };
                    else if (t0.id == prev1.id && t1.id == prev0.id) prvC = (Vector2){ (prev0.pos.x+prev1.pos.x)*0.5f,(prev0.pos.y+prev1.pos.y)*0.5f };
                    else                                              prvC = curC;
                    Vector2 cd = (Vector2){ curC.x - prvC.x, curC.y - prvC.y };
                    if (fabsf(cd.x) > TOUCH_DELTA_DEADZONE || fabsf(cd.y) > TOUCH_DELTA_DEADZONE){
                        sh->x += cd.x; sh->y += cd.y;
                    }

                    Vector2 vCurr = (Vector2){ t1.pos.x - t0.pos.x, t1.pos.y - t0.pos.y };
                    float currDist = sqrtf(vCurr.x*vCurr.x + vCurr.y*vCurr.y);
                    float currAngDeg = atan2f(vCurr.y, vCurr.x) * 57.2957795f;

                    int havePrevPair = ((t0.id == prev0.id && t1.id == prev1.id) || (t0.id == prev1.id && t1.id == prev0.id));
                    if (!havePrevPair || prevTouchCount < 2){
                        pinchBaseDist[pinchShape]     = (currDist > 0.0f) ? currDist : 1.0f;
                        pinchBaseSide[pinchShape]     = (sh->type==SHAPE_SQUARE)? (sh->half*2.0f):(sh->radius*2.0f);
                        pinchBaseAngleDeg[pinchShape] = sh->angle;
                        pinchStartVecDeg[pinchShape]  = currAngDeg;
                        pinchActive = 1;
                    } else if (pinchActive){
                        if (currDist > 0.0f && pinchBaseDist[pinchShape] > 0.0f){
                            float side = pinchBaseSide[pinchShape] * (currDist / pinchBaseDist[pinchShape]);
                            if (sh->type==SHAPE_SQUARE){
                                if (side < SQUARE_MIN_SIDE) side = SQUARE_MIN_SIDE;
                                if (side > SQUARE_MAX_SIDE) side = SQUARE_MAX_SIDE;
                                sh->half = side * 0.5f;
                            } else {
                                float r = side*0.5f;
                                if (r < CIRCLE_R_MIN) r = CIRCLE_R_MIN;
                                if (r > CIRCLE_R_MAX) r = CIRCLE_R_MAX;
                                sh->radius = r;
                            }
                        }
#if ROTATE_TEXTURES
                        float delta = currAngDeg - pinchStartVecDeg[pinchShape];
                        while (delta > 180.0f)  delta -= 360.0f;
                        while (delta < -180.0f) delta += 360.0f;
                        sh->angle = pinchBaseAngleDeg[pinchShape] + delta;
#endif
                    }
                }
            }

            if (effectiveCount == 0 && prevTouchCount > 0){
                int idx = -1;
                if (dragTouchShape != -1) idx = dragTouchShape;
                else if (pinchShape != -1) idx = pinchShape;
                if (idx < 0) idx = 0;
                PlayTapOutForShape(&shapes[idx]);
            }
            prevTouchCount = effectiveCount;
        }

        // Clamp shapes inside window
        for (int i=0;i<NUM_SHAPES;++i){
            if (shapes[i].type==SHAPE_SQUARE){
                if (shapes[i].x < shapes[i].half) shapes[i].x = shapes[i].half;
                if (shapes[i].y < shapes[i].half) shapes[i].y = shapes[i].half;
                if (shapes[i].x > swWin - shapes[i].half) shapes[i].x = swWin - shapes[i].half;
                if (shapes[i].y > shWin - shapes[i].half) shapes[i].y = shWin - shapes[i].half;
            } else {
                if (shapes[i].x < shapes[i].radius) shapes[i].x = shapes[i].radius;
                if (shapes[i].y < shapes[i].radius) shapes[i].y = shapes[i].radius;
                if (shapes[i].x > swWin - shapes[i].radius) shapes[i].x = swWin - shapes[i].radius;
                if (shapes[i].y > shWin - shapes[i].radius) shapes[i].y = shWin - shapes[i].radius;
            }
        }

#if SHAPE_SHAPE_PUSH
        // Shape↔shape pushing (bounding-circle based)
        int activeIdxPush = -1;
        if (pinchShape        != -1) activeIdxPush = pinchShape;
        else if (rotateMouseShape != -1) activeIdxPush = rotateMouseShape;
        else if (dragTouchShape   != -1) activeIdxPush = dragTouchShape;
        else if (dragMouseShape   != -1) activeIdxPush = dragMouseShape;

        for (int pass=0; pass<2; ++pass){
            for (int i=0;i<NUM_SHAPES;++i){
                for (int j=i+1;j<NUM_SHAPES;++j){
                    float ri = ShapeHullRadius(&shapes[i]);
                    float rj = ShapeHullRadius(&shapes[j]);
                    float dx = shapes[j].x - shapes[i].x;
                    float dy = shapes[j].y - shapes[i].y;
                    float d2 = dx*dx + dy*dy;
                    float need = ri + rj + 0.001f;
                    if (d2 < need*need){
                        float d = (d2>1e-8f)? sqrtf(d2) : 0.0f;
                        float nx = (d>1e-8f)? (dx/d) : 1.0f;
                        float ny = (d>1e-8f)? (dy/d) : 0.0f;
                        float pen = need - d;

                        float wi = (i==activeIdxPush) ? 0.25f : 0.5f;
                        float wj = (j==activeIdxPush) ? 0.25f : 0.5f;
                        float sum = wi + wj; wi/=sum; wj/=sum;

                        shapes[i].x -= nx * pen * wi;
                        shapes[i].y -= ny * pen * wi;
                        shapes[j].x += nx * pen * wj;
                        shapes[j].y += ny * pen * wj;

                        // re-clamp
                        if (shapes[i].type==SHAPE_SQUARE){
                            float h=shapes[i].half;
                            if (shapes[i].x < h) shapes[i].x = h;
                            if (shapes[i].y < h) shapes[i].y = h;
                            if (shapes[i].x > swWin-h) shapes[i].x = swWin-h;
                            if (shapes[i].y > shWin-h) shapes[i].y = shWin-h;
                        } else {
                            float r=shapes[i].radius;
                            if (shapes[i].x < r) shapes[i].x = r;
                            if (shapes[i].y < r) shapes[i].y = r;
                            if (shapes[i].x > swWin-r) shapes[i].x = swWin-r;
                            if (shapes[i].y > shWin-r) shapes[i].y = shWin-r;
                        }
                        if (shapes[j].type==SHAPE_SQUARE){
                            float h=shapes[j].half;
                            if (shapes[j].x < h) shapes[j].x = h;
                            if (shapes[j].y < h) shapes[j].y = h;
                            if (shapes[j].x > swWin-h) shapes[j].x = swWin-h;
                            if (shapes[j].y > shWin-h) shapes[j].y = shWin-h;
                        } else {
                            float r=shapes[j].radius;
                            if (shapes[j].x < r) shapes[j].x = r;
                            if (shapes[j].y < r) shapes[j].y = r;
                            if (shapes[j].x > swWin-r) shapes[j].x = swWin-r;
                            if (shapes[j].y > shWin-r) shapes[j].y = shWin-r;
                        }
                    }
                }
            }
        }
#endif

        // ---------- Simulation (balls) ----------
        for (int i=0;i<NUM_BALLS;++i){
            Ball *b = &balls[i];

            float spd = hypotf(b->vx, b->vy);
            int steps = (spd > 0.0f) ? 1 + (int)((spd * dt) / fmaxf(b->r*2.0f, 2.0f)) : 1;
            if (steps > MAX_SUBSTEPS) steps = MAX_SUBSTEPS; if (steps < 1) steps = 1;
            float sdt = dt / (float)steps;

            for (int s=0;s<steps;++s){
                b->x += b->vx * sdt;
                b->y += b->vy * sdt;

                if (b->x - b->r < 0.0f){ b->x = b->r;       b->vx = -b->vx; }
                if (b->x + b->r > swWin){ b->x = swWin-b->r; b->vx = -b->vx; }
                if (b->y - b->r < 0.0f){ b->y = b->r;       b->vy = -b->vy; }
                if (b->y + b->r > shWin){ b->y = shWin-b->r; b->vy = -b->vy; }

                for (int k=0;k<NUM_SHAPES;++k){
                    float dx = b->x - shapes[k].x, dy = b->y - shapes[k].y;
                    float reach = ShapeHullRadius(&shapes[k]) + b->r;
                    if (dx*dx + dy*dy <= reach*reach){
                        ResolveCircleVsShape(&shapes[k], b->r, &b->x, &b->y, &b->vx, &b->vy);
                    }
                }
            }

            int insideAny = 0;
            for (int k=0;k<NUM_SHAPES && !insideAny;++k){
                if (PointInShape(b->x, b->y, &shapes[k])) insideAny = 1;
            }
            if (insideAny){
                RespawnBallOutsideAllShapes(b, shapes, NUM_SHAPES, swWin*0.5f, shWin*0.5f);
            } else {
                b->trappedFrames = 0;
            }
        }

        // ---------- Draw ----------
        BeginDrawing();
            ClearBackground(WHITE);

            int activeIdx = -1;
            if (pinchShape        != -1) activeIdx = pinchShape;
            else if (rotateMouseShape != -1) activeIdx = rotateMouseShape;
            else if (dragTouchShape   != -1) activeIdx = dragTouchShape;
            else if (dragMouseShape   != -1) activeIdx = dragMouseShape;

            for (int i = 0; i < NUM_SHAPES; ++i){
                if (i == activeIdx) continue;
                DrawShapeWithTexture(&shapes[i]);
            }
            if (activeIdx != -1) DrawShapeWithTexture(&shapes[activeIdx]);

            for (int i=0;i<NUM_BALLS;++i){
                if (balls[i].r <= 1.5f) DrawPixelV(V2(balls[i].x, balls[i].y), balls[i].col);
                else                     DrawCircleV(V2(balls[i].x, balls[i].y), balls[i].r, balls[i].col);
            }

            // Bottom-right audio controls
            DrawAudioGUI();

        EndDrawing();

        // ---------- Music stream pump ----------
        if (gMusicPlaying) UpdateMusicStream(gLoop);
    }

    // ---------- Cleanup ----------
    if (gMusicLoaded){
        StopMusicStream(gLoop);
        UnloadMusicStream(gLoop);
    }
    if (gAudioReady){ UnloadSound(gTapIn); UnloadSound(gTapOut); CloseAudioDevice(); }
    UnloadTextureBank();
    free(balls);
    CloseWindow();
    return 0;
}
