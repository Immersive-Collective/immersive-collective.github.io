// main.c — rotating square + multiple bouncing circles (no ball–ball interaction)
// Robust collision: substepped integration + biased separation to prevent trapping inside the rotating square.
#include "raylib.h"
#include <math.h>
#include <stdio.h>
#include <stdlib.h>

#ifdef PLATFORM_WEB
#include <emscripten/emscripten.h>
#include <emscripten/html5.h>
#endif

// ---------- Tunables ----------
#define NUM_BALLS 1000                // number of balls
static const float BALL_RADIUS_MIN = 1.0f;   // px
static const float BALL_RADIUS_MAX = 20.0f;   // px
static const float SPEED_MIN       = 20.0f;  // px/s
static const float SPEED_MAX       = 100.0f; // px/s
static const float SQUARE_SIZE     = 240.0f; // px (side length)
static const float SQUARE_ROT_DPS  = 90.0f;  // degrees per second
static const float SPAWN_MARGIN    = 6.0f;   // px beyond square half-diagonal
static const int   MAX_SUBSTEPS    = 8;      // cap on per-ball substeps (prevents tunneling)
static const float SEP_BIAS        = 0.75f;  // extra separation (px) to keep shapes apart
// --------------------------------

typedef struct { float x, y, vx, vy, r; } Ball;

typedef struct {
    float *squareX;
    float *squareY;
    float  squareHalf;
    Ball  *balls;
    int    ballCount;
} AppState;

// --- small helpers ---
static inline Vector2 V2(float x, float y){ Vector2 v=(Vector2){x,y}; return v; }
static inline Vector2 Rotate(Vector2 v, float a){ float c=cosf(a), s=sinf(a); return V2(c*v.x - s*v.y, s*v.x + c*v.y); }
static inline Vector2 InvRotate(Vector2 v, float a){ float c=cosf(a), s=sinf(a); return V2(c*v.x + s*v.y, -s*v.x + c*v.y); }
static inline Vector2 Reflect(Vector2 v, Vector2 n){ float d=v.x*n.x + v.y*n.y; return V2(v.x - 2.0f*d*n.x, v.y - 2.0f*d*n.y); }
static inline Vector2 ClosestPointOnSquare(Vector2 p, float h){
    float cx = (p.x < -h) ? -h : (p.x >  h) ?  h : p.x;
    float cy = (p.y < -h) ? -h : (p.y >  h) ?  h : p.y;
    return V2(cx, cy);
}

// Pushes a circle center outside the square's circumscribed circle (half-diagonal) by a margin.
static void EnsureOutsideSquareHull(float sx, float sy, float h, float r, float *bx, float *by){
    const float halfDiag = h * 1.41421356237f;
    Vector2 d = V2(*bx - sx, *by - sy);
    float len = sqrtf(d.x*d.x + d.y*d.y);
    const float minDist = halfDiag + r + SPAWN_MARGIN;
    if (len < 1e-5f){ d = V2(1.0f, 0.0f); len = 1.0f; }
    if (len < minDist){
        float s = minDist / len;
        *bx = sx + d.x * s;
        *by = sy + d.y * s;
    }
}

// Circle vs. rotating square: separates and reflects velocity; includes bias to avoid resting interpenetration.
static void ResolveCircleVsRotatingSquare(float sx, float sy, float squareHalf, float squareAngleDeg,
                                          float radius, float *bx, float *by, float *vx, float *vy)
{
    const float ang = squareAngleDeg * (3.14159265358979323846f / 180.0f);
    Vector2 pWorld = V2(*bx - sx, *by - sy);
    Vector2 vWorld = V2(*vx, *vy);
    Vector2 pLocal = InvRotate(pWorld, ang);
    Vector2 vLocal = InvRotate(vWorld, ang);

    Vector2 qLocal = ClosestPointOnSquare(pLocal, squareHalf);
    Vector2 delta  = V2(pLocal.x - qLocal.x, pLocal.y - qLocal.y);
    float dist2 = delta.x*delta.x + delta.y*delta.y;

    if (dist2 <= radius*radius){
        Vector2 nLocal;
        float dist = sqrtf((dist2 > 0.0f) ? dist2 : 0.0f);

        if (dist > 1e-6f){
            nLocal = V2(delta.x / dist, delta.y / dist);
        } else {
            nLocal = (fabsf(vLocal.x) > fabsf(vLocal.y)) ? V2((vLocal.x > 0.0f)?1.0f:-1.0f, 0.0f)
                                                         : V2(0.0f, (vLocal.y > 0.0f)?1.0f:-1.0f);
            dist = 0.0f;
        }

        float penetration = (radius - dist) + SEP_BIAS;
        if (penetration < 0.0f) penetration = 0.0f;

        Vector2 nWorld = Rotate(nLocal, ang);
        *bx += nWorld.x * penetration;
        *by += nWorld.y * penetration;

        Vector2 vRef = Reflect(V2(*vx, *vy), nWorld);
        *vx = vRef.x; *vy = vRef.y;

        *bx += (*vx) * (1.0f/6000.0f);
        *by += (*vy) * (1.0f/6000.0f);
    }
}

#ifdef PLATFORM_WEB
// Resize: sync canvas pixels with CSS*DPR, recenter square, clamp balls to window and ensure they remain outside the hull.
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
    }

    printf("[resize] window:%dx%d render(px):%dx%d balls:%d\n",
           GetScreenWidth(), GetRenderHeight(), GetRenderWidth(), GetRenderHeight(), s->ballCount);
    fflush(stdout);
    return EM_TRUE;
}
#endif

int main(void){
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_VSYNC_HINT);
    InitWindow(800, 450, "raylib: rotating square + robust bouncing circles");
    SetTargetFPS(90);

    // Square state.
    const float squareSize = SQUARE_SIZE;
    const float squareHalf = squareSize * 0.5f;
    float squareX = GetScreenWidth()  * 0.5f;
    float squareY = GetScreenHeight() * 0.5f;
    float squareAngle = 180.0f; // degrees

    // Balls (spawned outside the square hull) — heap-allocated to avoid stack overflow with large NUM_BALLS.
    Ball *balls = (Ball*)malloc(sizeof(Ball) * NUM_BALLS);
    if (!balls){ CloseWindow(); return 1; }

    const float PI_F = 3.14159265358979323846f;

    for (int i=0;i<NUM_BALLS;++i){
        float angleDeg = (float)GetRandomValue(0, 359);
        float angleRad = angleDeg * (PI_F / 180.0f);
        float speed    = (float)GetRandomValue((int)SPEED_MIN, (int)SPEED_MAX);

        float t01 = (float)GetRandomValue(0,1000)/1000.0f;
        float r   = BALL_RADIUS_MIN + t01 * (BALL_RADIUS_MAX - BALL_RADIUS_MIN);

        Vector2 dir = V2(cosf(angleRad), sinf(angleRad));
        float halfDiag = squareHalf * 1.41421356237f;
        float radial = halfDiag + r + SPAWN_MARGIN + (float)GetRandomValue(0, 200);
        float x = squareX + dir.x * radial;
        float y = squareY + dir.y * radial;

        float sw = (float)GetScreenWidth(), sh = (float)GetScreenHeight();
        if (x < r) x = r; if (x > sw - r) x = sw - r;
        if (y < r) y = r; if (y > sh - r) y = sh - r;
        EnsureOutsideSquareHull(squareX, squareY, squareHalf, r, &x, &y);

        balls[i] = (Ball){ x, y, dir.x*speed, dir.y*speed, r };
        if (fabsf(balls[i].vx) < 1e-3f && fabsf(balls[i].vy) < 1e-3f){ balls[i].vx = speed; balls[i].vy = 0.0f; }
    }

#ifdef PLATFORM_WEB
    AppState state = { .squareX=&squareX, .squareY=&squareY, .squareHalf=squareHalf, .balls=balls, .ballCount=NUM_BALLS };
    OnResize(0, NULL, &state);
    emscripten_set_resize_callback(EMSCRIPTEN_EVENT_TARGET_WINDOW, &state, EM_TRUE, OnResize);
#endif

    while (!WindowShouldClose()){
        float dt = GetFrameTime();

        // Rotate square.
        squareAngle += SQUARE_ROT_DPS * dt;

        // Substepped integration to reduce tunneling through the rotating square.
        const int sw = GetScreenWidth();
        const int sh = GetScreenHeight();

        for (int i=0;i<NUM_BALLS;++i){
            Ball *b = &balls[i];

            float speed = hypotf(b->vx, b->vy);
            int steps = (int)ceilf((speed * dt) / (fmaxf(b->r * 0.5f, 1.0f)));
            if (steps < 1) steps = 1;
            if (steps > MAX_SUBSTEPS) steps = MAX_SUBSTEPS;

            float sdt = dt / (float)steps;

            for (int s=0;s<steps;++s){
                b->x += b->vx * sdt;
                b->y += b->vy * sdt;

                if (b->x - b->r < 0.0f){ b->x = b->r;       b->vx = -b->vx; }
                if (b->x + b->r > sw)  { b->x = sw - b->r;  b->vx = -b->vx; }
                if (b->y - b->r < 0.0f){ b->y = b->r;       b->vy = -b->vy; }
                if (b->y + b->r > sh)  { b->y = sh - b->r;  b->vy = -b->vy; }

                ResolveCircleVsRotatingSquare(squareX, squareY, squareHalf, squareAngle, b->r, &b->x, &b->y, &b->vx, &b->vy);
            }
        }

        BeginDrawing();
            ClearBackground(DARKGRAY);

            const Rectangle rec = (Rectangle){ squareX, squareY, SQUARE_SIZE, SQUARE_SIZE };
            const Vector2   origin = (Vector2){ SQUARE_SIZE*0.5f, SQUARE_SIZE*0.5f };
            DrawRectanglePro(rec, origin, squareAngle, RED);

            for (int i=0;i<NUM_BALLS;++i)
                DrawCircleV(V2(balls[i].x, balls[i].y), balls[i].r, WHITE);
        EndDrawing();
    }

    free(balls);
    CloseWindow();
    return 0;
}
