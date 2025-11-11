// main.c — rotating square plus bouncing circle with edge collisions; includes proper circle–rotating-rectangle collision response (reflection and separation) and Web canvas resize sync.
#include "raylib.h"
#include <math.h>
#include <stdio.h>

#ifdef PLATFORM_WEB
#include <emscripten/emscripten.h>
#include <emscripten/html5.h>
#endif

// Holds pointers the resize callback uses to keep shapes within logical bounds.
typedef struct {
    float *squareX;
    float *squareY;
    float  squareHalf;
    float *ballX;
    float *ballY;
    float  ballR;
} AppState;

// Returns a 2D vector.
static inline Vector2 V2(float x, float y) { Vector2 v = { x, y }; return v; }

// Rotates a vector by +angle radians.
static inline Vector2 Rotate(Vector2 v, float angle) {
    float c = cosf(angle), s = sinf(angle);
    return V2(c*v.x - s*v.y, s*v.x + c*v.y);
}

// Rotates a vector by -angle radians (inverse rotation).
static inline Vector2 InvRotate(Vector2 v, float angle) {
    float c = cosf(angle), s = sinf(angle);
    return V2(c*v.x + s*v.y, -s*v.x + c*v.y);
}

// Reflects velocity about a unit normal.
static inline Vector2 Reflect(Vector2 v, Vector2 n) {
    float d = v.x*n.x + v.y*n.y;
    return V2(v.x - 2.0f*d*n.x, v.y - 2.0f*d*n.y);
}

// Projects point p (local space) onto the perimeter of an axis-aligned square centered at origin with half-extent h (clamped point).
static inline Vector2 ClosestPointOnSquare(Vector2 p, float h) {
    float cx = (p.x < -h) ? -h : (p.x >  h) ?  h : p.x;
    float cy = (p.y < -h) ? -h : (p.y >  h) ?  h : p.y;
    return V2(cx, cy);
}

// Circle vs. rotating-rectangle collision: resolves penetration and reflects velocity.
// squareCenter = (sx, sy). squareHalf = half side. squareAngleDeg = rotation degrees.
// (bx, by) and (vx, vy) are updated in place if a collision occurs.
static void ResolveCircleVsRotatingSquare(float sx, float sy, float squareHalf, float squareAngleDeg,
                                          float radius, float *bx, float *by, float *vx, float *vy)
{
    // Transform circle center and velocity to the square's local AABB space.
    const float angRad = squareAngleDeg * (3.14159265358979323846f / 180.0f);
    Vector2 pWorld = V2(*bx - sx, *by - sy);
    Vector2 vWorld = V2(*vx, *vy);
    Vector2 pLocal = InvRotate(pWorld, angRad);
    Vector2 vLocal = InvRotate(vWorld, angRad);

    // Find closest point on the square (AABB) to the circle center in local space.
    Vector2 qLocal = ClosestPointOnSquare(pLocal, squareHalf);
    Vector2 delta  = V2(pLocal.x - qLocal.x, pLocal.y - qLocal.y);
    float dist2 = delta.x*delta.x + delta.y*delta.y;

    // Collision if center inside corner radius band or center is inside square (delta ~ 0).
    if (dist2 <= radius*radius) {
        Vector2 nLocal;
        float dist = sqrtf((dist2 > 0.0f) ? dist2 : 0.0f);

        if (dist > 1e-6f) {
            // Normal from contact on square to circle center.
            nLocal = V2(delta.x / dist, delta.y / dist);
        } else {
            // Center lies inside the square (delta ~ 0). Choose separating normal by dominant velocity axis.
            if (fabsf(vLocal.x) > fabsf(vLocal.y)) {
                nLocal = V2((vLocal.x > 0.0f) ? 1.0f : -1.0f, 0.0f);
            } else {
                nLocal = V2(0.0f, (vLocal.y > 0.0f) ? 1.0f : -1.0f);
            }
        }

        // Minimum translation distance along normal (in local space).
        float penetration = radius - dist;
        if (penetration < 0.0f) penetration = 0.0f;

        // Convert normal back to world space and separate + reflect.
        Vector2 nWorld = Rotate(nLocal, angRad);
        *bx += nWorld.x * penetration;
        *by += nWorld.y * penetration;

        Vector2 vRef = Reflect(V2(*vx, *vy), nWorld);
        *vx = vRef.x;
        *vy = vRef.y;
    }
}

#ifdef PLATFORM_WEB
// Synchronizes canvas pixel size with CSS size * devicePixelRatio and clamps shapes inside new bounds.
static EM_BOOL OnResize(int eventType, const EmscriptenUiEvent *ui, void *userData) {
    (void)eventType; (void)ui;
    AppState *s = (AppState*)userData;

    double cssW = 0.0, cssH = 0.0;
    emscripten_get_element_css_size("#canvas", &cssW, &cssH);
    const double dpr = emscripten_get_device_pixel_ratio();

    const int pixelW = (int)(cssW * dpr);
    const int pixelH = (int)(cssH * dpr);

    emscripten_set_canvas_element_size("#canvas", pixelW, pixelH);
    SetWindowSize((int)cssW, (int)cssH);

    const float sw = (float)GetScreenWidth();
    const float sh = (float)GetScreenHeight();

    *s->squareX = sw * 0.5f;
    *s->squareY = sh * 0.5f;
    const float h = s->squareHalf;
    if (*s->squareX < h)      *s->squareX = h;
    if (*s->squareY < h)      *s->squareY = h;
    if (*s->squareX > sw - h) *s->squareX = sw - h;
    if (*s->squareY > sh - h) *s->squareY = sh - h;

    const float r = s->ballR;
    if (*s->ballX < r)        *s->ballX = r;
    if (*s->ballY < r)        *s->ballY = r;
    if (*s->ballX > sw - r)   *s->ballX = sw - r;
    if (*s->ballY > sh - r)   *s->ballY = sh - r;

    printf("[resize] window:%dx%d render(px):%dx%d\n",
           GetScreenWidth(), GetScreenHeight(), GetRenderWidth(), GetRenderHeight());
    fflush(stdout);
    return EM_TRUE;
}
#endif

int main(void) {
    // Window init (resizable + vsync).
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_VSYNC_HINT);
    InitWindow(800, 450, "raylib: rotating square + bouncing circle (edge collisions)");
    SetTargetFPS(90);

    // Square state (center, size, rotation).
    const float squareSize = 240.0f;
    const float squareHalf = squareSize * 0.5f;
    float squareX = GetScreenWidth()  * 0.5f;
    float squareY = GetScreenHeight() * 0.5f;
    float squareAngle = 180.0f; // degrees

    // Circle state (position, velocity).
    float ballX = squareX;
    float ballY = squareY - (squareHalf + 40.0f);
    const float ballR = 48.0f;

    // Random initial direction and speed.
    const float PI_F = 3.14159265358979323846f; // distinct name; raylib defines PI macro
    float angleDeg = (float)GetRandomValue(0, 359);
    float angleRad = angleDeg * (PI_F / 180.0f);
    const float speed = 1420.0f; // px/sec
    float vx = cosf(angleRad) * speed;
    float vy = sinf(angleRad) * speed;
    if (fabsf(vx) < 1e-3f && fabsf(vy) < 1e-3f) { vx = speed; vy = 0.0f; }

#ifdef PLATFORM_WEB
    AppState state = { .squareX = &squareX, .squareY = &squareY, .squareHalf = squareHalf,
                       .ballX = &ballX, .ballY = &ballY, .ballR = ballR };
    OnResize(0, NULL, &state);
    emscripten_set_resize_callback(EMSCRIPTEN_EVENT_TARGET_WINDOW, &state, EM_TRUE, OnResize);
#endif

    while (!WindowShouldClose()) {
        const float dt = GetFrameTime();

        // Update square rotation (constant speed).
        squareAngle += 90.0f * dt;

        // Integrate circle.
        ballX += vx * dt;
        ballY += vy * dt;

        // Bounce on window bounds (logical coordinates).
        const int sw = GetScreenWidth();
        const int sh = GetScreenHeight();
        if (ballX - ballR < 0.0f) { ballX = ballR;        vx = -vx; }
        if (ballX + ballR > sw)   { ballX = sw - ballR;   vx = -vx; }
        if (ballY - ballR < 0.0f) { ballY = ballR;        vy = -vy; }
        if (ballY + ballR > sh)   { ballY = sh - ballR;   vy = -vy; }

        // Resolve circle vs. rotating square collision.
        ResolveCircleVsRotatingSquare(squareX, squareY, squareHalf, squareAngle, ballR, &ballX, &ballY, &vx, &vy);

        BeginDrawing();
            ClearBackground(DARKGRAY);

            // Draw square (centered at squareX/squareY, rotated by squareAngle).
            const Rectangle rec = (Rectangle){ squareX, squareY, squareSize, squareSize };
            const Vector2   origin = (Vector2){ squareHalf, squareHalf };
            DrawRectanglePro(rec, origin, squareAngle, RED);

            // Draw circle.
            DrawCircleV(V2(ballX, ballY), ballR, WHITE);
        EndDrawing();
    }

    CloseWindow();
    return 0;
}
