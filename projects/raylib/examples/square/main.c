// main.c — rotating square (restored) plus white circle with random initial direction bouncing on edges; keeps canvas in sync with CSS size on Web and clamps both shapes after resizes.
#include "raylib.h"
#include <stdio.h>
#include <math.h>

#ifdef PLATFORM_WEB
#include <emscripten/emscripten.h>
#include <emscripten/html5.h>
#endif

// Carries pointers the resize callback needs to keep shapes within the logical window.
typedef struct {
    float *squareX;
    float *squareY;
    float  squareHalf;   // half side length for centering/clamping
    float *ballX;
    float *ballY;
    float  ballR;
} AppState;

// Synchronizes canvas pixel size with CSS size * devicePixelRatio (Web only) and clamps square/circle inside new bounds.
#ifdef PLATFORM_WEB
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

    // Recenter square to window center; clamp defensively.
    *s->squareX = sw * 0.5f;
    *s->squareY = sh * 0.5f;
    const float shh = s->squareHalf;
    if (*s->squareX < shh)     *s->squareX = shh;
    if (*s->squareY < shh)     *s->squareY = shh;
    if (*s->squareX > sw-shh)  *s->squareX = sw - shh;
    if (*s->squareY > sh-shh)  *s->squareY = sh - shh;

    // Clamp ball inside bounds.
    const float r = s->ballR;
    if (*s->ballX < r)       *s->ballX = r;
    if (*s->ballY < r)       *s->ballY = r;
    if (*s->ballX > sw - r)  *s->ballX = sw - r;
    if (*s->ballY > sh - r)  *s->ballY = sh - r;

    printf("[resize] window:%dx%d render(px):%dx%d square:(%.1f,%.1f) ball:(%.1f,%.1f)\n",
           GetScreenWidth(), GetScreenHeight(), GetRenderWidth(), GetRenderHeight(),
           *s->squareX, *s->squareY, *s->ballX, *s->ballY);
    fflush(stdout);
    return EM_TRUE;
}
#endif

int main(void) {
    // Window initialization (resizable + vsync for stable timing).
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_VSYNC_HINT);
    InitWindow(800, 450, "raylib: rotating square + bouncing circle");
    SetTargetFPS(90);

    // Square state (rotating around its center).
    const float squareSize  = 100.0f;
    const float squareHalf  = squareSize * 0.5f;
    float squareX = GetScreenWidth()  * 0.5f;
    float squareY = GetScreenHeight() * 0.5f;
    float squareAngle = 0.0f;

    // Circle state (random initial direction; constant speed).
    float ballX = squareX;
    float ballY = squareY;
    const float ballR = 20.0f;
    const float PI_F = 3.14159265358979323846f;     // distinct name; raylib defines PI as a macro
    float angleDeg = (float)GetRandomValue(0, 359);
    float angleRad = angleDeg * (PI_F / 180.0f);
    const float speed = 1480.0f;                     // pixels per second
    float vx = cosf(angleRad) * speed;
    float vy = sinf(angleRad) * speed;
    if (fabsf(vx) < 1e-3f && fabsf(vy) < 1e-3f) { vx = speed; vy = 0.0f; } // guard rare zero vector

#ifdef PLATFORM_WEB
    // Web: keep canvas in sync with CSS size * DPR and clamp shapes on resizes.
    AppState state = { .squareX=&squareX, .squareY=&squareY, .squareHalf=squareHalf,
                       .ballX=&ballX, .ballY=&ballY, .ballR=ballR };
    OnResize(0, NULL, &state); // initial sync
    emscripten_set_resize_callback(EMSCRIPTEN_EVENT_TARGET_WINDOW, &state, EM_TRUE, OnResize);
#endif

    // Main loop: update square rotation and ball movement; bounce ball on edges; render both.
    while (!WindowShouldClose()) {
        const float dt = GetFrameTime();

        // Square rotation.
        squareAngle += 120.0f * dt;

        // Ball movement and bouncing against logical window edges.
        ballX += vx * dt;
        ballY += vy * dt;

        const int sw = GetScreenWidth();
        const int sh = GetScreenHeight();

        if (ballX - ballR < 0.0f) { ballX = ballR;        vx = -vx; }
        if (ballX + ballR > sw)   { ballX = sw - ballR;   vx = -vx; }
        if (ballY - ballR < 0.0f) { ballY = ballR;        vy = -vy; }
        if (ballY + ballR > sh)   { ballY = sh - ballR;   vy = -vy; }

        BeginDrawing();
            ClearBackground(DARKGRAY);

            // Draw rotating square centered at (squareX, squareY).
            const Rectangle rec = (Rectangle){ squareX, squareY, squareSize, squareSize };
            const Vector2   origin = (Vector2){ squareHalf, squareHalf };
            DrawRectanglePro(rec, origin, squareAngle, RED);

            // Draw bouncing circle.
            DrawCircleV((Vector2){ ballX, ballY }, ballR, WHITE);
        EndDrawing();
    }

    CloseWindow();
    return 0;
}
