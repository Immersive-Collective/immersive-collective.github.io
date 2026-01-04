# glb_thumbnails_idle_recursive.py
# Recursively render 1080x1920 PNG thumbnails for all .glb files under a root folder.
# Tries to pick an "Idle" animation (name contains "idle"); if none, uses first action; if no actions, renders still.
# Outputs into a parallel folder tree: <root>/<out_subdir>/<relative_path_to_glb>.png
#
# Run:
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P glb_thumbnails_idle_recursive.py -- "/path/to/root"
#
# Optional:
#   --out "_thumbs"
#   --w 1080 --h 1920
#   --idle-key idle
#   --only-animated   (skip GLBs that have no actions)
#   --engine BLENDER_EEVEE_NEXT

import bpy
import sys
import argparse
from pathlib import Path
from math import tan, radians, atan
from mathutils import Vector


def parse_args():
    argv = sys.argv
    if "--" not in argv:
        raise SystemExit("Usage: blender -b -P glb_thumbnails_idle_recursive.py -- /path/to/root\n")
    user_argv = argv[argv.index("--") + 1 :]

    p = argparse.ArgumentParser()
    p.add_argument("root", type=Path, help="Root folder to scan recursively for .glb files")
    p.add_argument("--out", type=str, default="_thumbs", help='Output subfolder under root (default: "_thumbs")')
    p.add_argument("--w", type=int, default=1080, help="Width (default 1080)")
    p.add_argument("--h", type=int, default=1920, help="Height (default 1920)")
    p.add_argument("--idle-key", type=str, default="idle", help='Substring to match idle actions (default "idle")')
    p.add_argument("--only-animated", action="store_true", help="Skip GLBs with no actions")
    p.add_argument("--engine", type=str, default="BLENDER_EEVEE_NEXT", help="Render engine")
    return p.parse_args(user_argv)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Filmic"

    world = bpy.data.worlds.new("World") if not bpy.data.worlds else bpy.data.worlds[0]
    scene.world = world
    if world.node_tree:
        bg = world.node_tree.nodes.get("Background")
        if bg:
            bg.inputs[0].default_value = (0.9, 0.9, 0.9, 1.0)
            bg.inputs[1].default_value = 0.8


def add_lighting(scene):
    area = bpy.data.lights.new("Key", type="AREA")
    area.energy = 400
    area.size = 3.0
    area_obj = bpy.data.objects.new("KeyLight", area)
    scene.collection.objects.link(area_obj)
    area_obj.location = (2.5, -3.0, 3.0)
    area_obj.rotation_euler = (radians(60), 0, radians(35))

    fill = bpy.data.lights.new("Fill", type="AREA")
    fill.energy = 250
    fill.size = 4.0
    fill_obj = bpy.data.objects.new("FillLight", fill)
    scene.collection.objects.link(fill_obj)
    fill_obj.location = (-2.5, -2.0, 2.0)
    fill_obj.rotation_euler = (radians(65), 0, radians(-35))

    sun = bpy.data.lights.new("Rim", type="SUN")
    sun.energy = 0.9
    sun_obj = bpy.data.objects.new("RimLight", sun)
    scene.collection.objects.link(sun_obj)
    sun_obj.location = (0.0, 4.0, 4.0)
    sun_obj.rotation_euler = (radians(120), 0, 0)


def ensure_camera(scene):
    cam_data = bpy.data.cameras.new("Camera")
    cam = bpy.data.objects.new("Camera", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    cam_data.lens = 50
    cam_data.sensor_width = 36
    cam_data.clip_start = 0.01
    cam_data.clip_end = 2000
    return cam


def import_glb(path: Path):
    bpy.ops.import_scene.gltf(filepath=str(path))


def get_mesh_bounds_world():
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH" and o.visible_get()]
    if not meshes:
        return None

    min_v = Vector((1e9, 1e9, 1e9))
    max_v = Vector((-1e9, -1e9, -1e9))

    for obj in meshes:
        for corner in obj.bound_box:
            v = obj.matrix_world @ Vector(corner)
            min_v.x = min(min_v.x, v.x); min_v.y = min(min_v.y, v.y); min_v.z = min(min_v.z, v.z)
            max_v.x = max(max_v.x, v.x); max_v.y = max(max_v.y, v.y); max_v.z = max(max_v.z, v.z)

    return min_v, max_v


def look_at(obj, target: Vector):
    direction = target - obj.location
    rot_quat = direction.to_track_quat("-Z", "Y")
    obj.rotation_euler = rot_quat.to_euler()


def frame_camera_to_bounds(cam, bounds):
    min_v, max_v = bounds
    center = (min_v + max_v) * 0.5
    size = (max_v - min_v)

    padding = 1.25
    height = max(0.01, size.z * padding)
    width = max(0.01, max(size.x, size.y) * padding)

    scene = bpy.context.scene
    aspect = scene.render.resolution_x / max(1, scene.render.resolution_y)

    hfov = cam.data.angle
    vfov = 2.0 * atan(tan(hfov * 0.5) / max(1e-6, aspect))

    dist_h = (height * 0.5) / max(1e-6, tan(vfov * 0.5))
    dist_w = (width * 0.5) / max(1e-6, tan(hfov * 0.5))
    dist = max(dist_h, dist_w)

    cam.location = Vector((center.x, center.y - dist * 0.5, center.z + height * 0.2))
    look_at(cam, center)


def pick_idle_action(idle_key: str):
    actions = list(bpy.data.actions)
    if not actions:
        return None
    k = idle_key.lower()
    for a in actions:
        if k in a.name.lower():
            return a
    return actions[0]


def find_primary_armature():
    arms = [o for o in bpy.context.scene.objects if o.type == "ARMATURE"]
    if not arms:
        return None
    arms.sort(key=lambda o: len(o.data.bones), reverse=True)
    return arms[0]


def apply_action_and_set_frame(action):
    if not action:
        return
    arm = find_primary_armature()
    if not arm:
        return

    if not arm.animation_data:
        arm.animation_data_create()
    arm.animation_data.action = action

    start, end = action.frame_range
    mid = int(round((float(start) + float(end)) * 0.5))
    bpy.context.scene.frame_set(mid)


def render_png(out_path: Path, w: int, h: int, engine: str):
    scene = bpy.context.scene
    scene.render.engine = engine
    scene.render.resolution_x = w
    scene.render.resolution_y = h
    scene.render.resolution_percentage = 100
    scene.render.filepath = str(out_path)
    bpy.ops.render.render(write_still=True)


def main():
    args = parse_args()
    root = args.root.expanduser().resolve()
    if not root.exists():
        raise SystemExit(f"Root folder does not exist: {root}")

    out_root = (root / args.out).resolve()
    out_root.mkdir(parents=True, exist_ok=True)

    glbs = sorted([p for p in root.rglob("*.glb") if p.is_file()])

    # Don’t thumbnail outputs again
    glbs = [p for p in glbs if out_root not in p.parents]

    if not glbs:
        raise SystemExit(f"No .glb files found under: {root}")

    for glb in glbs:
        rel = glb.relative_to(root)
        #out_path = (out_root / rel).with_suffix(".png")
        out_path = glb.with_suffix(".png")  # same folder as the .glb
        out_path.parent.mkdir(parents=True, exist_ok=True)

        reset_scene()
        scene = bpy.context.scene
        add_lighting(scene)
        cam = ensure_camera(scene)

        import_glb(glb)
        bpy.context.view_layer.update()

        action = pick_idle_action(args.idle_key)
        if args.only_animated and action is None:
            print(f"[SKIP] {rel} (no actions)")
            continue

        apply_action_and_set_frame(action)

        bounds = get_mesh_bounds_world()
        if bounds:
            frame_camera_to_bounds(cam, bounds)

        print(f"[THUMB] {rel} -> {out_path.relative_to(root)} (action: {action.name if action else 'none'})")
        render_png(out_path, args.w, args.h, args.engine)

    print(f"[DONE] Thumbnails saved under: {out_root}")


main()
