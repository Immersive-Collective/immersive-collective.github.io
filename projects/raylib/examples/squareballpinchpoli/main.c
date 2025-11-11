// main.c — N independent squares (drag/rotate/pinch per-square) + gradient balls.
// Respawn spawns balls strictly OUTSIDE all squares (no spawning inside any square area).
#include "raylib.h"
#include <math.h>
#include <stdlib.h>

#ifdef PLATFORM_WEB
#include <emscripten/emscripten.h>
#include <emscripten/html5.h>
#endif

// ---------------- Tunables ----------------
#define NUM_BALLS                1000
#define NUM_SQUARES              3

static const float BALL_RADIUS_MIN = 1.0f;
static const float BALL_RADIUS_MAX = 30.0f;
static const float SPEED_MIN       = 20.0f;
static const float SPEED_MAX       = 100.0f;

static const float SQUARE_SIZE_DEFAULT = 240.0f;  // px
static const float SQUARE_MIN_SIDE     = 64.0f;   // px
static const float SQUARE_MAX_SIDE     = 800.0f;  // px

static const float SPAWN_MARGIN        = 6.0f;
static const int   MAX_SUBSTEPS        = 2;
static const float SEP_BIAS            = 0.50f;
static const int   TRAP_FRAMES_TO_KILL = 3;
static const float TOUCH_DELTA_DEADZONE= 0.5f;    // px
// ------------------------------------------

// Gradient stops for ball colors.
static const Color GRADIENT_STOPS[] = {
    (Color){255,255,255,255},          // WHITE
    (Color){148,  0,211,255}           // Violet (#9400D3 approx)
};
static const int   GRADIENT_COUNT   = (int)(sizeof(GRADIENT_STOPS)/sizeof(GRADIENT_STOPS[0]));

// ----- Types -----
typedef struct { float x, y, vx, vy, r; int trappedFrames; Color col; } Ball;

typedef struct {
    float x, y;     // center
    float half;     // half side
    float angle;    // degrees
} Square;

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

// ----- Square queries -----
static inline int PointInRotatedSquare(float px, float py, const Square *sq){
    const float PI_F = 3.14159265358979323846f;
    float a = sq->angle*(PI_F/180.0f), c=cosf(a), s=sinf(a);
    Vector2 pl = InvRotateCS((Vector2){ px - sq->x, py - sq->y }, c, s);
    return (fabsf(pl.x) <= sq->half && fabsf(pl.y) <= sq->half);
}
static inline int CenterInsideSquare(const Square *sq, float px, float py){
    return PointInRotatedSquare(px, py, sq);
}
static inline int CenterInsideAnySquare(const Square *sqs, int n, float px, float py){
    for (int i=0;i<n;++i) if (CenterInsideSquare(&sqs[i], px, py)) return 1;
    return 0;
}
// Push circle center outside a square’s circumscribed hull (half-diagonal + r + margin).
static inline void PushOutsideSquareHull(const Square *sq, float r, float *bx, float *by){
    float dx = *bx - sq->x, dy = *by - sq->y;
    float len2 = dx*dx + dy*dy;
    float halfDiag = sq->half * 1.41421356237f;
    float minD = halfDiag + r + SPAWN_MARGIN;
    float minD2 = minD*minD;
    if (len2 < 1e-8f){ dx=1.0f; dy=0.0f; len2=1.0f; }
    if (len2 < minD2){
        float s = minD / sqrtf(len2);
        *bx = sq->x + dx*s; *by = sq->y + dy*s;
    }
}
// Topmost hit square index at point (or -1).
static int TopSquareAt(float px, float py, const Square *sqs, int count){
    for (int i=count-1;i>=0;--i) if (PointInRotatedSquare(px, py, &sqs[i])) return i;
    return -1;
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

// Respawn strictly outside all squares; attempts random rays from a seed center and rejects inside hits.
static void RespawnBallOutsideAllSquares(Ball *b, const Square *sqs, int n, float seedX, float seedY){
    AssignBallKinematicsAndColor(b);
    const int   sw = GetScreenWidth();
    const int   sh = GetScreenHeight();
    const float PI_F = 3.14159265358979323846f;

    for (int tries=0; tries<256; ++tries){
        float ang   = (float)GetRandomValue(0, 359) * (PI_F/180.0f);
        float maxHull = 0.0f;
        // Choose distance beyond the furthest square hull from seed.
        for (int i=0;i<n;++i){
            float dx = seedX - sqs[i].x, dy = seedY - sqs[i].y;
            float d  = sqrtf(dx*dx + dy*dy);
            float hull = d + sqs[i].half * 1.41421356237f + b->r + SPAWN_MARGIN;
            if (hull > maxHull) maxHull = hull;
        }
        float extra = (float)GetRandomValue(0, 200);
        float radial = (maxHull > 0.0f ? maxHull : 200.0f) + extra;

        float x = seedX + cosf(ang) * radial;
        float y = seedY + sinf(ang) * radial;

        // Clamp to screen and push out of each square hull just in case.
        if (x < b->r) x = b->r; if (x > sw - b->r) x = sw - b->r;
        if (y < b->r) y = b->r; if (y > sh - b->r) y = sh - b->r;

        for (int i=0;i<n;++i) PushOutsideSquareHull(&sqs[i], b->r, &x, &y);

        // Reject if center lies inside any square (no spawning “in taken areas”).
        if (!CenterInsideAnySquare(sqs, n, x, y)){
            b->x = x; b->y = y;
            return;
        }
    }

    // Fallback (rare): random screen position outside squares.
    for (int tries=0; tries<2048; ++tries){
        float x = (float)GetRandomValue((int)BALL_RADIUS_MIN, (int)(sw - BALL_RADIUS_MIN));
        float y = (float)GetRandomValue((int)BALL_RADIUS_MIN, (int)(sh - BALL_RADIUS_MIN));
        if (!CenterInsideAnySquare(sqs, n, x, y)){
            b->x = x; b->y = y;
            return;
        }
    }
    // Worst-case: place at screen center top and push out.
    b->x = sw*0.5f; b->y = BALL_RADIUS_MAX + SPAWN_MARGIN;
    for (int i=0;i<n;++i) PushOutsideSquareHull(&sqs[i], b->r, &b->x, &b->y);
}

// Resolve circle vs. specific rotating square.
static inline void ResolveCircleVsSquare(const Square *sq, float radius, float *bx, float *by, float *vx, float *vy){
    const float PI_F = 3.14159265358979323846f;
    float a = sq->angle*(PI_F/180.0f), c=cosf(a), s=sinf(a);

    Vector2 pW = (Vector2){ *bx - sq->x, *by - sq->y };
    Vector2 vW = (Vector2){ *vx, *vy };
    Vector2 pL = InvRotateCS(pW, c, s);
    Vector2 vL = InvRotateCS(vW, c, s);

    Vector2 qL = ClosestPointOnSquare(pL, sq->half);
    float dx = pL.x - qL.x, dy = pL.y - qL.y;
    float dist2 = dx*dx + dy*dy;

    if (dist2 <= radius*radius){
        float dist = (dist2 > 0.0f) ? sqrtf(dist2) : 0.0f;
        Vector2 nL = (dist > 1e-6f) ? (Vector2){ dx/dist, dy/dist }
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

int main(void){
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_VSYNC_HINT);
    InitWindow(1024, 600, "raylib: N squares (drag/rotate/pinch) + gradient balls (safe respawn)");
    SetTargetFPS(90);

    const int swInit = GetScreenWidth();
    const int shInit = GetScreenHeight();

    // Squares init
    Square squares[NUM_SQUARES];
    for (int i=0;i<NUM_SQUARES;++i){
        squares[i].half  = SQUARE_SIZE_DEFAULT * 0.5f;
        squares[i].angle = 0.0f;
    }
    if (NUM_SQUARES >= 1){ squares[0].x = swInit * 0.35f; squares[0].y = shInit * 0.5f; }
    if (NUM_SQUARES >= 2){ squares[1].x = swInit * 0.65f; squares[1].y = shInit * 0.5f; }
    for (int i=2;i<NUM_SQUARES;++i){ squares[i].x = swInit*0.5f; squares[i].y = shInit*0.5f; }

    float pinchBaseDist[NUM_SQUARES]; for (int i=0;i<NUM_SQUARES;++i) pinchBaseDist[i]=0.0f;
    float pinchBaseSide[NUM_SQUARES]; for (int i=0;i<NUM_SQUARES;++i) pinchBaseSide[i]=squares[i].half*2.0f;

    // Input state
    TrackedTouch t0 = (TrackedTouch){ .id = -1, .pos = {0} };
    TrackedTouch t1 = (TrackedTouch){ .id = -1, .pos = {0} };
    int prevTouchCount = 0;

    int dragMouseSquare   = -1;
    int rotateMouseSquare = -1;
    int dragTouchSquare   = -1;
    int pinchSquare       = -1;
    int pinchActive       = 0;

    // Balls: spawn outside all squares
    Ball *balls = (Ball*)malloc(sizeof(Ball) * NUM_BALLS);
    if (!balls){ CloseWindow(); return 1; }
    {
        float seedX = swInit * 0.5f, seedY = shInit * 0.5f;
        for (int i=0;i<NUM_BALLS;++i) RespawnBallOutsideAllSquares(&balls[i], squares, NUM_SQUARES, seedX, seedY);
    }

#ifdef PLATFORM_WEB
    AppState state = { .squareX=&squares[0].x, .squareY=&squares[0].y, .squareHalf=squares[0].half, .balls=balls, .ballCount=NUM_BALLS };
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
                dragMouseSquare = TopSquareAt(mpos.x, mpos.y, squares, NUM_SQUARES);
            }
            if (IsMouseButtonReleased(MOUSE_LEFT_BUTTON)) dragMouseSquare = -1;

            if (dragMouseSquare != -1 && IsMouseButtonDown(MOUSE_LEFT_BUTTON)){
                Vector2 d = GetMouseDelta();
                if (fabsf(d.x) > TOUCH_DELTA_DEADZONE || fabsf(d.y) > TOUCH_DELTA_DEADZONE){
                    squares[dragMouseSquare].x += d.x;
                    squares[dragMouseSquare].y += d.y;
                }
            }

            if (IsMouseButtonPressed(MOUSE_RIGHT_BUTTON)){
                rotateMouseSquare = TopSquareAt(mpos.x, mpos.y, squares, NUM_SQUARES);
            }
            if (IsMouseButtonReleased(MOUSE_RIGHT_BUTTON)) rotateMouseSquare = -1;

            if (rotateMouseSquare != -1 && IsMouseButtonDown(MOUSE_RIGHT_BUTTON)){
                Vector2 d = GetMouseDelta();
                if (fabsf(d.x) > TOUCH_DELTA_DEADZONE) squares[rotateMouseSquare].angle += d.x * 0.35f;
            }

            float wheel = GetMouseWheelMove();
            if (wheel != 0.0f){
                int idx = TopSquareAt(mpos.x, mpos.y, squares, NUM_SQUARES);
                if (idx < 0) idx = NUM_SQUARES-1;
                float side = squares[idx].half * 2.0f;
                side += wheel * 8.0f;
                if (side < SQUARE_MIN_SIDE) side = SQUARE_MIN_SIDE;
                if (side > SQUARE_MAX_SIDE) side = SQUARE_MAX_SIDE;
                squares[idx].half = side * 0.5f;
            }

            t0.id = -1; t1.id = -1; prevTouchCount = 0; pinchActive = 0; dragTouchSquare = -1; pinchSquare = -1;
        } else {
            TrackedTouch prev0 = t0, prev1 = t1;
            UpdateTrackedTouches(&t0, &t1);
            int effectiveCount = (t0.id != -1) + (t1.id != -1);

            if (prevTouchCount >= 2 && effectiveCount == 1){
                pinchActive = 0; pinchSquare = -1;
                if (t0.id != -1) t0.pos = t0.pos; else if (t1.id != -1) t1.pos = t1.pos;
            }
            if (prevTouchCount == 0 && effectiveCount >= 1){
                if (t0.id != -1) prev0 = t0;
                if (t1.id != -1) prev1 = t1;
            }

            if (effectiveCount == 1){
                const TrackedTouch *a = (t0.id != -1)? &t0 : &t1;
                if (prevTouchCount == 0){
                    dragTouchSquare = TopSquareAt(a->pos.x, a->pos.y, squares, NUM_SQUARES);
                }
                if (dragTouchSquare != -1){
                    Vector2 base = (a->id == prev0.id) ? prev0.pos : prev1.pos;
                    Vector2 d = (Vector2){ a->pos.x - base.x, a->pos.y - base.y };
                    if (fabsf(d.x) > TOUCH_DELTA_DEADZONE || fabsf(d.y) > TOUCH_DELTA_DEADZONE){
                        squares[dragTouchSquare].x += d.x;
                        squares[dragTouchSquare].y += d.y;
                    }
                }
                pinchActive = 0; pinchSquare = -1;
            } else if (effectiveCount >= 2){
                if (prevTouchCount < 2 && pinchSquare == -1){
                    Vector2 c = (Vector2){ (t0.pos.x+t1.pos.x)*0.5f, (t0.pos.y+t1.pos.y)*0.5f };
                    int sIdx = TopSquareAt(c.x, c.y, squares, NUM_SQUARES);
                    if (sIdx < 0){
                        int a = TopSquareAt(t0.pos.x, t0.pos.y, squares, NUM_SQUARES);
                        int b = TopSquareAt(t1.pos.x, t1.pos.y, squares, NUM_SQUARES);
                        sIdx = (a>=0)? a : b;
                    }
                    pinchSquare = sIdx;
                    pinchActive = 0;
                }

                if (pinchSquare != -1){
                    Square *sq = &squares[pinchSquare];

                    Vector2 curC = (Vector2){ (t0.pos.x + t1.pos.x)*0.5f, (t0.pos.y + t1.pos.y)*0.5f };
                    Vector2 prvC;
                    if      (t0.id == prev0.id && t1.id == prev1.id) prvC = (Vector2){ (prev0.pos.x+prev1.pos.x)*0.5f,(prev0.pos.y+prev1.pos.y)*0.5f };
                    else if (t0.id == prev1.id && t1.id == prev0.id) prvC = (Vector2){ (prev0.pos.x+prev1.pos.x)*0.5f,(prev0.pos.y+prev1.pos.y)*0.5f };
                    else                                              prvC = curC;
                    Vector2 cd = (Vector2){ curC.x - prvC.x, curC.y - prvC.y };
                    if (fabsf(cd.x) > TOUCH_DELTA_DEADZONE || fabsf(cd.y) > TOUCH_DELTA_DEADZONE){
                        sq->x += cd.x; sq->y += cd.y;
                    }

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
                    if (fabsf(dAng) > 0.2f) sq->angle += dAng;

                    float currDist = sqrtf(vCurr.x*vCurr.x + vCurr.y*vCurr.y);
                    if (!havePrev || prevTouchCount < 2){
                        pinchBaseDist[pinchSquare] = (currDist > 0.0f) ? currDist : 1.0f;
                        pinchBaseSide[pinchSquare] = sq->half * 2.0f;
                        pinchActive = 1;
                    } else if (pinchActive && currDist > 0.0f && pinchBaseDist[pinchSquare] > 0.0f){
                        float side = pinchBaseSide[pinchSquare] * (currDist / pinchBaseDist[pinchSquare]);
                        if (side < SQUARE_MIN_SIDE) side = SQUARE_MIN_SIDE;
                        if (side > SQUARE_MAX_SIDE) side = SQUARE_MAX_SIDE;
                        sq->half = side * 0.5f;
                    }
                }
            }
            prevTouchCount = effectiveCount;
        }

        // Clamp squares inside window
        for (int i=0;i<NUM_SQUARES;++i){
            if (squares[i].x < squares[i].half) squares[i].x = squares[i].half;
            if (squares[i].y < squares[i].half) squares[i].y = squares[i].half;
            if (squares[i].x > swWin - squares[i].half) squares[i].x = swWin - squares[i].half;
            if (squares[i].y > shWin - squares[i].half) squares[i].y = shWin - squares[i].half;
        }

        // ---------- Simulation ----------
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

                for (int k=0;k<NUM_SQUARES;++k){
                    float halfDiag = squares[k].half * 1.41421356237f;
                    float dx = b->x - squares[k].x, dy = b->y - squares[k].y;
                    float maxR = halfDiag + b->r;
                    if (dx*dx + dy*dy <= maxR*maxR){
                        ResolveCircleVsSquare(&squares[k], b->r, &b->x, &b->y, &b->vx, &b->vy);
                    }
                }
            }

            // Kill/respawn if inside any square area
            int insideAny = 0;
            for (int k=0;k<NUM_SQUARES && !insideAny;++k){
                if (CenterInsideSquare(&squares[k], b->x, b->y)) insideAny = 1;
            }
            if (insideAny){
                // Seed at screen center (or could seed at last interacted square centroid).
                RespawnBallOutsideAllSquares(b, squares, NUM_SQUARES, swWin*0.5f, shWin*0.5f);
            } else {
                b->trappedFrames = 0;
            }
        }

        // ---------- Draw ----------
        BeginDrawing();
            ClearBackground(WHITE);

            for (int i=0;i<NUM_SQUARES;++i){
                float sideNow = squares[i].half * 2.0f;
                Rectangle rec = (Rectangle){ squares[i].x, squares[i].y, sideNow, sideNow };
                Vector2   origin = (Vector2){ squares[i].half, squares[i].half };
                DrawRectanglePro(rec, origin, squares[i].angle, RED);
            }

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
