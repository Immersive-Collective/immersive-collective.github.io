// main.c — move/rotate/scale square ONLY when the pointer/gesture starts over the square.
// Keeps previous behaviors (drag, two-finger rotate, pinch-to-scale) but ignores input that begins outside.
#include "raylib.h"
#include <math.h>
#include <stdlib.h>

#ifdef PLATFORM_WEB
#include <emscripten/emscripten.h>
#include <emscripten/html5.h>
#endif

// ---------------- Tunables ----------------
#define NUM_BALLS              500
static const float BALL_RADIUS_MIN = 1.0f;
static const float BALL_RADIUS_MAX = 50.0f;
static const float SPEED_MIN       = 20.0f;
static const float SPEED_MAX       = 100.0f;
static const float SQUARE_SIZE     = 440.0f;   // initial side length (px)
static const float SQUARE_MIN_SIDE = 64.0f;    // pinch floor (px)
static const float SQUARE_MAX_SIDE = 800.0f;   // pinch ceiling (px)
static const float SPAWN_MARGIN    = 6.0f;
static const int   MAX_SUBSTEPS    = 2;
static const float SEP_BIAS        = 0.50f;
static const int   TRAP_FRAMES_TO_KILL = 3;
static const float TOUCH_DELTA_DEADZONE = 0.5f; // px
// ------------------------------------------

// Gradient stops for ball colors (compile-time constants).
static const Color GRADIENT_STOPS[] = {
    (Color){255,255,255,255},          // WHITE
    (Color){148,  0,211,255}           // Violet (approx. #9400D3)
};
static const int   GRADIENT_COUNT   = (int)(sizeof(GRADIENT_STOPS)/sizeof(GRADIENT_STOPS[0]));

// ----- Types -----
typedef struct { float x, y, vx, vy, r; int trappedFrames; Color col; } Ball;

typedef struct {
    float *squareX;
    float *squareY;
    float  squareHalf;
    Ball  *balls;
    int    ballCount;
} AppState;

typedef struct { int id; Vector2 pos; } TrackedTouch; // -1 id when empty

// --------- Math helpers ---------
static inline Vector2 V2(float x, float y){ Vector2 v=(Vector2){x,y}; return v; }
static inline Vector2 RotateCS(Vector2 v, float c, float s){ return (Vector2){ c*v.x - s*v.y, s*v.x + c*v.y }; }
static inline Vector2 InvRotateCS(Vector2 v, float c, float s){ return (Vector2){ c*v.x + s*v.y, -s*v.x + c*v.y }; }
static inline Vector2 Reflect(Vector2 v, Vector2 n){ float d=v.x*n.x + v.y*n.y; return (Vector2){ v.x-2.0f*d*n.x, v.y-2.0f*d*n.y }; }
static inline Vector2 ClosestPointOnSquare(Vector2 p, float h){
    float cx = (p.x < -h) ? -h : (p.x >  h) ?  h : p.x;
    float cy = (p.y < -h) ? -h : (p.y >  h) ?  h : p.y;
    return (Vector2){cx, cy};
}
static inline int PointInRotatedSquare(float px, float py, float sx, float sy, float half, float angDeg){
    const float PI_F = 3.14159265358979323846f;
    float a = angDeg*(PI_F/180.0f), c=cosf(a), s=sinf(a);
    Vector2 pl = InvRotateCS((Vector2){ px - sx, py - sy }, c, s);
    return (fabsf(pl.x) <= half && fabsf(pl.y) <= half);
}
// --------------------------------

// --------- Color gradient helpers ---------
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
// ------------------------------------------

static inline void EnsureOutsideSquareHull(float sx, float sy, float h, float r, float *bx, float *by){
    const float halfDiag = h * 1.41421356237f;
    float dx = *bx - sx, dy = *by - sy;
    float len2 = dx*dx + dy*dy, minD = halfDiag + r + SPAWN_MARGIN, minD2 = minD*minD;
    if (len2 < 1e-8f){ dx=1.0f; dy=0.0f; len2=1.0f; }
    if (len2 < minD2){
        float s = minD / sqrtf(len2);
        *bx = sx + dx*s; *by = sy + dy*s;
    }
}

static inline void RespawnBall(Ball *b, float sx, float sy, float squareHalf, float halfDiag){
    const float PI_F = 3.14159265358979323846f;
    float angle = (float)GetRandomValue(0, 359) * (PI_F/180.0f);
    float speed = (float)GetRandomValue((int)SPEED_MIN, (int)SPEED_MAX);
    float t01   = (float)GetRandomValue(0,1000)/1000.0f; // also used for radius + color

    b->r = BALL_RADIUS_MIN + t01 * (BALL_RADIUS_MAX - BALL_RADIUS_MIN);
    b->col = GradientSample(GRADIENT_STOPS, GRADIENT_COUNT, t01);

    Vector2 dir = (Vector2){ cosf(angle), sinf(angle) };
    float radial = halfDiag + b->r + SPAWN_MARGIN + (float)GetRandomValue(0, 200);
    b->x = sx + dir.x * radial; b->y = sy + dir.y * radial;
    float sw = (float)GetScreenWidth(), sh = (float)GetScreenHeight();
    if (b->x < b->r) b->x = b->r; if (b->x > sw - b->r) b->x = sw - b->r;
    if (b->y < b->r) b->y = b->r; if (b->y > sh - b->r) b->y = sh - b->r;
    EnsureOutsideSquareHull(sx, sy, squareHalf, b->r, &b->x, &b->y);
    b->vx = dir.x * speed; b->vy = dir.y * speed;
    if (fabsf(b->vx) < 1e-3f && fabsf(b->vy) < 1e-3f){ b->vx = speed; b->vy = 0.0f; }
    b->trappedFrames = 0;
}

static inline void ResolveCircleVsRotatingSquareCS(float sx, float sy, float squareHalf,
                                                   float cosA, float sinA,
                                                   float radius, float *bx, float *by, float *vx, float *vy)
{
    Vector2 pW = (Vector2){ *bx - sx, *by - sy };
    Vector2 vW = (Vector2){ *vx, *vy };
    Vector2 pL = InvRotateCS(pW, cosA, sinA);
    Vector2 vL = InvRotateCS(vW, cosA, sinA);

    Vector2 qL = ClosestPointOnSquare(pL, squareHalf);
    float dx = pL.x - qL.x, dy = pL.y - qL.y;
    float dist2 = dx*dx + dy*dy;

    if (dist2 <= radius*radius){
        float dist = (dist2 > 0.0f) ? sqrtf(dist2) : 0.0f;
        Vector2 nL = (dist > 1e-6f) ? (Vector2){ dx/dist, dy/dist }
                                    : (fabsf(vL.x) > fabsf(vL.y)) ? (Vector2){ (vL.x>0.0f)?1.0f:-1.0f, 0.0f }
                                                                   : (Vector2){ 0.0f, (vL.y>0.0f)?1.0f:-1.0f };

        float penetration = (radius - dist) + SEP_BIAS; if (penetration < 0.0f) penetration = 0.0f;
        Vector2 nW = RotateCS(nL, cosA, sinA);
        *bx += nW.x * penetration; *by += nW.y * penetration;

        Vector2 vRef = Reflect((Vector2){ *vx, *vy }, nW);
        *vx = vRef.x; *vy = vRef.y;

        *bx += (*vx) * (1.0f/8000.0f);
        *by += (*vy) * (1.0f/8000.0f);
    }
}

static inline int CircleFullyInsideSquare(float px, float py, float r, float sx, float sy, float half, float cosA, float sinA){
    Vector2 pW = (Vector2){ px - sx, py - sy };
    Vector2 pL = InvRotateCS(pW, cosA, sinA);
    return (fabsf(pL.x) <= (half - r)) && (fabsf(pL.y) <= (half - r));
}

#ifdef PLATFORM_WEB
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

    *s->squareX = sw * 0.5f;
    *s->squareY = sh * 0.5f;

    for (int i=0;i<s->ballCount;++i){
        Ball *b = &s->balls[i];
        if (b->x < b->r) b->x = b->r;
        if (b->y < b->r) b->y = b->r;
        if (b->x > sw - b->r) b->x = sw - b->r;
        if (b->y > sh - b->r) b->y = sh - b->r;
        EnsureOutsideSquareHull(*s->squareX, *s->squareY, s->squareHalf, b->r, &b->x, &b->y);
        b->trappedFrames = 0;
    }
    return EM_TRUE;
}
#endif

// ----- Touch utilities -----
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
// ---------------------------

int main(void){
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_VSYNC_HINT);
    InitWindow(800, 450, "raylib: pointer-over-only manipulation + gradient balls");
    SetTargetFPS(90);

    // Square state
    float squareHalf = SQUARE_SIZE * 0.5f;
    float squareX = GetScreenWidth()  * 0.5f;
    float squareY = GetScreenHeight() * 0.5f;
    float squareAngle = 0.0f;

    // Gesture baselines
    float pinchBaseDist = 0.0f;
    float pinchBaseSide = SQUARE_SIZE;

    // Input tracking
    TrackedTouch t0 = (TrackedTouch){ .id = -1, .pos = {0} };
    TrackedTouch t1 = (TrackedTouch){ .id = -1, .pos = {0} };
    int prevTouchCount = 0;

    // Over-object gating flags
    int dragMouseActive = 0;         // left mouse drag started over square
    int rotateMouseActive = 0;       // right mouse rotate started over square
    int dragTouchActive = 0;         // one-finger drag started over square
    int pinchRotateActive = 0;       // two-finger rotate/scale started over/within square
    int pinchActive = 0;

    // Balls
    Ball *balls = (Ball*)malloc(sizeof(Ball) * NUM_BALLS);
    if (!balls){ CloseWindow(); return 1; }
    {
        const float halfDiagInit = squareHalf * 1.41421356237f;
        for (int i=0;i<NUM_BALLS;++i) RespawnBall(&balls[i], squareX, squareY, squareHalf, halfDiagInit);
    }

#ifdef PLATFORM_WEB
    AppState state = { .squareX=&squareX, .squareY=&squareY, .squareHalf=squareHalf, .balls=balls, .ballCount=NUM_BALLS };
    OnResize(0, NULL, &state);
    emscripten_set_resize_callback(EMSCRIPTEN_EVENT_TARGET_WINDOW, &state, EM_TRUE, OnResize);
#endif

    while (!WindowShouldClose()){
        const float dt   = GetFrameTime();
        const int   swWin = GetScreenWidth();
        const int   shWin = GetScreenHeight();

        // ---------- INPUT ----------
        int touchCount = GetTouchPointCount();

        // Mouse (only when no touch)
        if (touchCount == 0){
            Vector2 mpos = GetMousePosition();

            // Begin drag only if press begins over the square
            if (IsMouseButtonPressed(MOUSE_LEFT_BUTTON)){
                dragMouseActive = PointInRotatedSquare(mpos.x, mpos.y, squareX, squareY, squareHalf, squareAngle);
            }
            if (IsMouseButtonReleased(MOUSE_LEFT_BUTTON)) dragMouseActive = 0;

            if (dragMouseActive && IsMouseButtonDown(MOUSE_LEFT_BUTTON)){
                Vector2 d = GetMouseDelta();
                if (fabsf(d.x) > TOUCH_DELTA_DEADZONE || fabsf(d.y) > TOUCH_DELTA_DEADZONE){
                    squareX += d.x; squareY += d.y;
                }
            }

            // Begin rotate only if right-press begins over the square
            if (IsMouseButtonPressed(MOUSE_RIGHT_BUTTON)){
                rotateMouseActive = PointInRotatedSquare(mpos.x, mpos.y, squareX, squareY, squareHalf, squareAngle);
            }
            if (IsMouseButtonReleased(MOUSE_RIGHT_BUTTON)) rotateMouseActive = 0;

            if (rotateMouseActive && IsMouseButtonDown(MOUSE_RIGHT_BUTTON)){
                Vector2 d = GetMouseDelta();
                if (fabsf(d.x) > TOUCH_DELTA_DEADZONE) squareAngle += d.x * 0.35f;
            }

            // Wheel zoom is always allowed
            float wheel = GetMouseWheelMove();
            if (wheel != 0.0f){
                float side = squareHalf * 2.0f;
                side += wheel * 8.0f;
                if (side < SQUARE_MIN_SIDE) side = SQUARE_MIN_SIDE;
                if (side > SQUARE_MAX_SIDE) side = SQUARE_MAX_SIDE;
                squareHalf = side * 0.5f;
            }

            // Reset touch gating
            t0.id = -1; t1.id = -1; prevTouchCount = 0; pinchActive = 0; dragTouchActive = 0; pinchRotateActive = 0;
        } else {
            // Touch: update tracked ids
            TrackedTouch prev0 = t0, prev1 = t1;
            UpdateTrackedTouches(&t0, &t1);
            int effectiveCount = (t0.id != -1) + (t1.id != -1);

            // Transitions
            if (prevTouchCount >= 2 && effectiveCount == 1){
                pinchActive = 0; pinchRotateActive = 0;
                // rebase remaining finger to avoid jump
                if (t0.id != -1) t0.pos = t0.pos; else if (t1.id != -1) t1.pos = t1.pos;
            }
            if (prevTouchCount == 0 && effectiveCount >= 1){
                if (t0.id != -1) prev0 = t0;
                if (t1.id != -1) prev1 = t1;
            }

            // One-finger drag: only if the touch began over the square
            if (effectiveCount == 1){
                const TrackedTouch *a = (t0.id != -1)? &t0 : &t1;
                if (prevTouchCount == 0){ // gesture start
                    dragTouchActive = PointInRotatedSquare(a->pos.x, a->pos.y, squareX, squareY, squareHalf, squareAngle);
                }
                if (dragTouchActive){
                    Vector2 base = (a->id == prev0.id) ? prev0.pos : prev1.pos;
                    Vector2 d = (Vector2){ a->pos.x - base.x, a->pos.y - base.y };
                    if (fabsf(d.x) > TOUCH_DELTA_DEADZONE || fabsf(d.y) > TOUCH_DELTA_DEADZONE){
                        squareX += d.x; squareY += d.y;
                    }
                }
                pinchActive = 0; pinchRotateActive = 0;
            }
            // Two-finger translate/rotate/scale: only if gesture started over/within the square
            else if (effectiveCount >= 2){
                if (prevTouchCount < 2){
                    // gate activation on start: centroid inside square OR either finger inside
                    Vector2 startC = (Vector2){ (t0.pos.x + t1.pos.x)*0.5f, (t0.pos.y + t1.pos.y)*0.5f };
                    int over = PointInRotatedSquare(t0.pos.x, t0.pos.y, squareX, squareY, squareHalf, squareAngle) ||
                               PointInRotatedSquare(t1.pos.x, t1.pos.y, squareX, squareY, squareHalf, squareAngle) ||
                               PointInRotatedSquare(startC.x, startC.y, squareX, squareY, squareHalf, squareAngle);
                    pinchRotateActive = over;
                    pinchActive = 0;
                }

                if (pinchRotateActive){
                    // translate by centroid delta
                    Vector2 curC = (Vector2){ (t0.pos.x + t1.pos.x)*0.5f, (t0.pos.y + t1.pos.y)*0.5f };
                    Vector2 prvC;
                    if      (t0.id == prev0.id && t1.id == prev1.id) prvC = (Vector2){ (prev0.pos.x+prev1.pos.x)*0.5f,(prev0.pos.y+prev1.pos.y)*0.5f };
                    else if (t0.id == prev1.id && t1.id == prev0.id) prvC = (Vector2){ (prev0.pos.x+prev1.pos.x)*0.5f,(prev0.pos.y+prev1.pos.y)*0.5f };
                    else                                              prvC = curC;
                    Vector2 cd = (Vector2){ curC.x - prvC.x, curC.y - prvC.y };
                    if (fabsf(cd.x) > TOUCH_DELTA_DEADZONE || fabsf(cd.y) > TOUCH_DELTA_DEADZONE){
                        squareX += cd.x; squareY += cd.y;
                    }

                    // rotation
                    Vector2 vPrev, vCurr;
                    int havePrev = ((t0.id == prev0.id && t1.id == prev1.id) || (t0.id == prev1.id && t1.id == prev0.id));
                    if (havePrev){
                        Vector2 pA = (t0.id == prev0.id)? prev0.pos : prev1.pos;
                        Vector2 pB = (t1.id == prev1.id)? prev1.pos : prev0.pos;
                        vPrev = (Vector2){ pB.x - pA.x, pB.y - pA.y };
                    } else vPrev = (Vector2){ 1.0f, 0.0f };
                    vCurr = (Vector2){ t1.pos.x - t0.pos.x, t1.pos.y - t0.pos.y };
                    float a0 = atan2f(vPrev.y, vPrev.x), a1 = atan2f(vCurr.y, vCurr.x);
                    float dAng = (a1 - a0) * (180.0f/PI);
                    if (dAng > 180.0f) dAng -= 360.0f;
                    if (dAng < -180.0f) dAng += 360.0f;
                    if (fabsf(dAng) > 0.2f) squareAngle += dAng;

                    // pinch (baseline-relative)
                    float currDist = sqrtf(vCurr.x*vCurr.x + vCurr.y*vCurr.y);
                    if (!havePrev || prevTouchCount < 2){
                        pinchBaseDist = (currDist > 0.0f) ? currDist : 1.0f;
                        pinchBaseSide = squareHalf * 2.0f;
                        pinchActive   = 1;
                    } else if (pinchActive && currDist > 0.0f && pinchBaseDist > 0.0f){
                        float side = pinchBaseSide * (currDist / pinchBaseDist);
                        if (side < SQUARE_MIN_SIDE) side = SQUARE_MIN_SIDE;
                        if (side > SQUARE_MAX_SIDE) side = SQUARE_MAX_SIDE;
                        squareHalf = side * 0.5f;
                    }
                }
            }
            prevTouchCount = effectiveCount;
        }
        // ---------------------------------

        // Clamp square inside window
        if (squareX < squareHalf) squareX = squareHalf;
        if (squareY < squareHalf) squareY = squareHalf;
        if (squareX > swWin - squareHalf) squareX = swWin - squareHalf;
        if (squareY > shWin - squareHalf) squareY = shWin - squareHalf;

        // ---------- Simulation ----------
        const float PI_F = 3.14159265358979323846f;
        const float angRad = squareAngle * (PI_F / 180.0f);
        const float cosA = cosf(angRad), sinA = sinf(angRad);
        const float halfDiag = squareHalf * 1.41421356237f;

        for (int i=0;i<NUM_BALLS;++i){
            Ball *b = &balls[i];

            float spd = hypotf(b->vx, b->vy);
            int steps = (spd > 0.0f) ? 1 + (int)((spd * GetFrameTime()) / fmaxf(b->r*2.0f, 2.0f)) : 1;
            if (steps > MAX_SUBSTEPS) steps = MAX_SUBSTEPS; if (steps < 1) steps = 1;
            float sdt = dt / (float)steps;

            for (int s=0;s<steps;++s){
                b->x += b->vx * sdt;
                b->y += b->vy * sdt;

                if (b->x - b->r < 0.0f){ b->x = b->r;       b->vx = -b->vx; }
                if (b->x + b->r > swWin){ b->x = swWin-b->r; b->vx = -b->vx; }
                if (b->y - b->r < 0.0f){ b->y = b->r;       b->vy = -b->vy; }
                if (b->y + b->r > shWin){ b->y = shWin-b->r; b->vy = -b->vy; }

                float dx = b->x - squareX, dy = b->y - squareY;
                float maxR = halfDiag + b->r;
                if (dx*dx + dy*dy <= maxR*maxR){
                    ResolveCircleVsRotatingSquareCS(squareX, squareY, squareHalf, cosA, sinA, b->r, &b->x, &b->y, &b->vx, &b->vy);
                }
            }

            if (CircleFullyInsideSquare(b->x, b->y, b->r, squareX, squareY, squareHalf, cosA, sinA)){
                if (++b->trappedFrames >= TRAP_FRAMES_TO_KILL){
                    RespawnBall(b, squareX, squareY, squareHalf, halfDiag);
                }
            } else {
                b->trappedFrames = 0;
            }
        }

        // ---------- Draw ----------
        BeginDrawing();
            ClearBackground(WHITE);
            const float sideNow = squareHalf * 2.0f;
            const Rectangle rec = (Rectangle){ squareX, squareY, sideNow, sideNow };
            const Vector2   origin = (Vector2){ squareHalf, squareHalf };
            DrawRectanglePro(rec, origin, squareAngle, RED);

            for (int i=0;i<NUM_BALLS;++i){
                if (balls[i].r <= 1.5f) DrawPixelV(V2(balls[i].x, balls[i].y), balls[i].col);
                else                     DrawCircleV(V2(balls[i].x, balls[i].y), balls[i].r, balls[i].col);
            }
        EndDrawing();
    }

    free(balls);
    CloseWindow();
    return 0;
}
