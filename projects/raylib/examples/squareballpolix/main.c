// main.c — touch/mouse-driven square + bouncing circles (trap & respawn)
// Fix: no jump when a finger lifts after two-finger rotate — track pointers by ID and rebase deltas on transitions.
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
static const float BALL_RADIUS_MAX = 10.0f;
static const float SPEED_MIN       = 20.0f;
static const float SPEED_MAX       = 100.0f;
static const float SQUARE_SIZE     = 240.0f;
static const float SPAWN_MARGIN    = 6.0f;
static const int   MAX_SUBSTEPS    = 2;
static const float SEP_BIAS        = 0.50f;
static const int   TRAP_FRAMES_TO_KILL = 3;

static const float TOUCH_DELTA_DEADZONE = 0.5f; // px
// ------------------------------------------

typedef struct { float x, y, vx, vy, r; int trappedFrames; } Ball;

typedef struct {
    float *squareX;
    float *squareY;
    float  squareHalf;
    Ball  *balls;
    int    ballCount;
} AppState;

// Track up to two active touches by ID to avoid index reordering issues.
typedef struct {
    int   id;    // -1 when empty
    Vector2 pos; // last frame position for this id
} TrackedTouch;

// Vector helpers
static inline Vector2 V2(float x, float y){ Vector2 v=(Vector2){x,y}; return v; }
static inline Vector2 RotateCS(Vector2 v, float c, float s){ return (Vector2){ c*v.x - s*v.y, s*v.x + c*v.y }; }
static inline Vector2 InvRotateCS(Vector2 v, float c, float s){ return (Vector2){ c*v.x + s*v.y, -s*v.x + c*v.y }; }
static inline Vector2 Reflect(Vector2 v, Vector2 n){ float d=v.x*n.x + v.y*n.y; return (Vector2){ v.x-2.0f*d*n.x, v.y-2.0f*d*n.y }; }
static inline Vector2 ClosestPointOnSquare(Vector2 p, float h){
    float cx = (p.x < -h) ? -h : (p.x >  h) ?  h : p.x;
    float cy = (p.y < -h) ? -h : (p.y >  h) ?  h : p.y;
    return (Vector2){cx, cy};
}

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
    float t01 = (float)GetRandomValue(0,1000)/1000.0f;
    b->r = BALL_RADIUS_MIN + t01 * (BALL_RADIUS_MAX - BALL_RADIUS_MIN);
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

static inline bool CircleFullyInsideSquare(float px, float py, float r, float sx, float sy, float half, float cosA, float sinA){
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

// Finds a touch by id in current frame; returns {found,pos}
static inline bool FindTouchById(int id, Vector2 *outPos){
    int count = GetTouchPointCount();
    for (int i=0;i<count;++i){
        if (GetTouchPointId(i) == id){ *outPos = GetTouchPosition(i); return true; }
    }
    return false;
}

// Updates tracked touches from current frame; preserves IDs when possible.
static void UpdateTrackedTouches(TrackedTouch *t0, TrackedTouch *t1){
    int count = GetTouchPointCount();

    // Mark both empty initially (we will refill below).
    TrackedTouch prev0 = *t0, prev1 = *t1;
    t0->id = -1; t1->id = -1;

    if (count <= 0) return;

    // First, try to keep previous IDs if they still exist.
    Vector2 pos;
    if (prev0.id != -1 && FindTouchById(prev0.id, &pos)){ t0->id = prev0.id; t0->pos = pos; }
    if (prev1.id != -1 && FindTouchById(prev1.id, &pos)){
        if (t0->id == -1){ t0->id = prev1.id; t0->pos = pos; }
        else             { t1->id = prev1.id; t1->pos = pos; }
    }

    // Fill remaining slots with any other touches.
    for (int i=0;i<count && (t0->id == -1 || t1->id == -1); ++i){
        int id = GetTouchPointId(i);
        if (id == t0->id || id == t1->id) continue;
        Vector2 p = GetTouchPosition(i);
        if (t0->id == -1){ t0->id = id; t0->pos = p; }
        else             { t1->id = id; t1->pos = p; }
    }
}

int main(void){
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_VSYNC_HINT);
    InitWindow(800, 450, "raylib: touch/mouse-driven square + bouncing circles (no jump on finger lift)");
    SetTargetFPS(90);

    // Square state
    const float squareSize = SQUARE_SIZE;
    const float squareHalf = squareSize * 0.5f;
    const float halfDiag   = squareHalf * 1.41421356237f;
    float squareX = GetScreenWidth()  * 0.5f;
    float squareY = GetScreenHeight() * 0.5f;
    float squareAngle = 0.0f;

    // Touch tracking by ID
    TrackedTouch t0 = { .id = -1, .pos = {0} };
    TrackedTouch t1 = { .id = -1, .pos = {0} };
    int prevTouchCount = 0;

    // Balls
    Ball *balls = (Ball*)malloc(sizeof(Ball) * NUM_BALLS);
    if (!balls){ CloseWindow(); return 1; }
    for (int i=0;i<NUM_BALLS;++i) RespawnBall(&balls[i], squareX, squareY, squareHalf, halfDiag);

#ifdef PLATFORM_WEB
    AppState state = { .squareX=&squareX, .squareY=&squareY, .squareHalf=squareHalf, .balls=balls, .ballCount=NUM_BALLS };
    OnResize(0, NULL, &state);
    emscripten_set_resize_callback(EMSCRIPTEN_EVENT_TARGET_WINDOW, &state, EM_TRUE, OnResize);
#endif

    while (!WindowShouldClose()){
        const float dt = GetFrameTime();
        const int swWin = GetScreenWidth(), shWin = GetScreenHeight();

        // ---------- INPUT (mouse OR touch; never both in one frame) ----------
        int touchCount = GetTouchPointCount();

        if (touchCount == 0){
            // Mouse only when no touch is active.
            if (IsMouseButtonDown(MOUSE_LEFT_BUTTON)){
                Vector2 d = GetMouseDelta();
                if (fabsf(d.x) > TOUCH_DELTA_DEADZONE || fabsf(d.y) > TOUCH_DELTA_DEADZONE){
                    squareX += d.x; squareY += d.y;
                }
            }
            if (IsMouseButtonDown(MOUSE_RIGHT_BUTTON)){
                Vector2 d = GetMouseDelta();
                if (fabsf(d.x) > TOUCH_DELTA_DEADZONE) squareAngle += d.x * 0.35f;
            }
            float wheel = GetMouseWheelMove();
            if (wheel != 0.0f) squareAngle += wheel * 5.0f;

            // Reset tracked touches when leaving touch mode.
            t0.id = -1; t1.id = -1; prevTouchCount = 0;
        } else {
            // Update tracked touches by ID (stable across reordering/lifts).
            TrackedTouch prev0 = t0, prev1 = t1;
            UpdateTrackedTouches(&t0, &t1);
            int effectiveCount = (t0.id != -1) + (t1.id != -1);

            // Handle transitions cleanly by rebasing deltas (prevents jump on finger lift).
            if (prevTouchCount >= 2 && effectiveCount == 1){
                // Rebase remaining finger's stored position to its current, so first 1-finger delta is zero.
                Vector2 nowPos;
                if (t0.id != -1) { nowPos = t0.pos; t0.pos = nowPos; }
                else if (t1.id != -1) { nowPos = t1.pos; t1.pos = nowPos; }
            }
            if (prevTouchCount == 0 && effectiveCount >= 1){
                // Fresh touch begin: set baselines.
                if (t0.id != -1) prev0 = t0;
                if (t1.id != -1) prev1 = t1;
            }

            if (effectiveCount == 1){
                const TrackedTouch *a = (t0.id != -1)? &t0 : &t1;
                Vector2 d = (Vector2){ a->pos.x - ((a->id == prev0.id)? prev0.pos.x : prev1.pos.x),
                                       a->pos.y - ((a->id == prev0.id)? prev0.pos.y : prev1.pos.y) };
                if (fabsf(d.x) > TOUCH_DELTA_DEADZONE || fabsf(d.y) > TOUCH_DELTA_DEADZONE){
                    squareX += d.x; squareY += d.y;
                }
            } else if (effectiveCount >= 2){
                // Two-finger translate by centroid delta.
                Vector2 curC = (Vector2){ (t0.pos.x + t1.pos.x)*0.5f, (t0.pos.y + t1.pos.y)*0.5f };
                Vector2 prvC;
                if      (t0.id == prev0.id && t1.id == prev1.id) prvC = (Vector2){ (prev0.pos.x+prev1.pos.x)*0.5f,(prev0.pos.y+prev1.pos.y)*0.5f };
                else if (t0.id == prev1.id && t1.id == prev0.id) prvC = (Vector2){ (prev0.pos.x+prev1.pos.x)*0.5f,(prev0.pos.y+prev1.pos.y)*0.5f };
                else                                              prvC = curC; // new pair: no jump
                Vector2 cd = (Vector2){ curC.x - prvC.x, curC.y - prvC.y };
                if (fabsf(cd.x) > TOUCH_DELTA_DEADZONE || fabsf(cd.y) > TOUCH_DELTA_DEADZONE){
                    squareX += cd.x; squareY += cd.y;
                }

                // Rotation by angle delta of the line between touches.
                Vector2 vPrev, vCurr;
                bool havePrev =
                    ((t0.id == prev0.id && t1.id == prev1.id) || (t0.id == prev1.id && t1.id == prev0.id));
                if (havePrev){
                    // Map current touches to previous by ID for consistent vectors.
                    Vector2 pA = (t0.id == prev0.id)? prev0.pos : prev1.pos;
                    Vector2 pB = (t1.id == prev1.id)? prev1.pos : prev0.pos;
                    vPrev = (Vector2){ pB.x - pA.x, pB.y - pA.y };
                } else {
                    vPrev = (Vector2){ 1.0f, 0.0f };
                }
                vCurr = (Vector2){ t1.pos.x - t0.pos.x, t1.pos.y - t0.pos.y };
                float a0 = atan2f(vPrev.y, vPrev.x), a1 = atan2f(vCurr.y, vCurr.x);
                float dAng = (a1 - a0) * (180.0f/PI);
                if (dAng > 180.0f) dAng -= 360.0f;
                if (dAng < -180.0f) dAng += 360.0f;
                if (fabsf(dAng) > 0.2f) squareAngle += dAng;
            }

            prevTouchCount = effectiveCount;
        }
        // --------------------------------------------------------------------

        // Clamp square inside window
        if (squareX < squareHalf) squareX = squareHalf;
        if (squareY < squareHalf) squareY = squareHalf;
        if (squareX > swWin - squareHalf) squareX = swWin - squareHalf;
        if (squareY > shWin - squareHalf) squareY = shWin - squareHalf;

        // ---------- Balls update + trap handling ----------
        const float PI_F = 3.14159265358979323846f;
        const float angRad = squareAngle * (PI_F / 180.0f);
        const float cosA = cosf(angRad), sinA = sinf(angRad);

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
            ClearBackground(DARKGRAY);
            const Rectangle rec = (Rectangle){ squareX, squareY, SQUARE_SIZE, SQUARE_SIZE };
            const Vector2   origin = (Vector2){ SQUARE_SIZE*0.5f, SQUARE_SIZE*0.5f };
            DrawRectanglePro(rec, origin, squareAngle, RED);

            for (int i=0;i<NUM_BALLS;++i){
                if (balls[i].r <= 1.5f) DrawPixelV(V2(balls[i].x, balls[i].y), WHITE);
                else                     DrawCircleV(V2(balls[i].x, balls[i].y), balls[i].r, WHITE);
            }
        EndDrawing();
    }

    free(balls);
    CloseWindow();
    return 0;
}
