# glb2fbx_batch.py
# Import GLB -> clear parents -> delete empties -> rotate -90Z -> scale 1.8
# -> move bottom to Z=0 and center XY at origin -> apply transforms
# -> save .blend + export .fbx next to the GLB (same base name)
#
# Single file:
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P glb2fbx_batch.py -- "/path/to/model.glb"
#
# Folder:
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P glb2fbx_batch.py -- "/path/to/catalog"
#
# Recursive folder:
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P glb2fbx_batch.py -- "/path/to/catalog" --rec

import bpy
import sys
import argparse
from pathlib import Path
from math import radians
from mathutils import Matrix, Vector


def parse_args():
    argv = sys.argv
    if "--" not in argv:
        raise SystemExit('Usage: blender -b -P glb2fbx_batch.py -- "<file.glb | folder>" [--rec]\n')
    user_argv = argv[argv.index("--") + 1 :]
    p = argparse.ArgumentParser()
    p.add_argument("path", type=Path, help="A .glb file or a folder containing .glb files")
    p.add_argument("--rec", action="store_true", help="If path is a folder: process recursively")
    p.add_argument("--rotz", type=float, default=-90.0, help="Rotate Z degrees (default -90)")
    p.add_argument("--scale", type=float, default=1.8, help="Uniform scale (default 1.8)")
    return p.parse_args(user_argv)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    try:
        bpy.ops.object.mode_set(mode="OBJECT")
    except Exception:
        pass


def import_glb(path: Path) -> list[str]:
    before = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=str(path))
    after = set(bpy.data.objects.keys())
    return sorted(list(after - before))  # NAMES only


def get_objects_by_names(names: list[str]):
    return [bpy.data.objects.get(n) for n in names if bpy.data.objects.get(n) is not None]


def clear_parent_keep_world(obj: bpy.types.Object):
    if obj.parent is None:
        return
    mw = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = mw


def delete_objects_by_names(names: list[str]):
    for n in names:
        obj = bpy.data.objects.get(n)
        if obj is not None:
            bpy.data.objects.remove(obj, do_unlink=True)


def compute_world_bounds(mesh_objects):
    min_v = Vector((1e9, 1e9, 1e9))
    max_v = Vector((-1e9, -1e9, -1e9))
    any_mesh = False

    for obj in mesh_objects:
        if obj.type != "MESH":
            continue
        any_mesh = True
        for corner in obj.bound_box:
            v = obj.matrix_world @ Vector(corner)
            min_v.x = min(min_v.x, v.x); min_v.y = min(min_v.y, v.y); min_v.z = min(min_v.z, v.z)
            max_v.x = max(max_v.x, v.x); max_v.y = max(max_v.y, v.y); max_v.z = max(max_v.z, v.z)

    return (min_v, max_v) if any_mesh else None


def apply_transform_to_objects(objs, rot_z_deg: float, scale: float):
    R = Matrix.Rotation(radians(rot_z_deg), 4, "Z")
    S = Matrix.Scale(scale, 4)
    X = R @ S
    for obj in objs:
        obj.matrix_world = X @ obj.matrix_world


def move_bounds_bottom_to_origin_center_xy(objs):
    mesh_objs = [o for o in objs if o.type == "MESH"]
    bounds = compute_world_bounds(mesh_objs)
    if not bounds:
        return
    min_v, max_v = bounds

    dx = -((min_v.x + max_v.x) * 0.5)
    dy = -((min_v.y + max_v.y) * 0.5)
    dz = -(min_v.z)

    offset = Vector((dx, dy, dz))
    for obj in objs:
        mw = obj.matrix_world
        mw.translation = mw.translation + offset
        obj.matrix_world = mw


def apply_transforms(objs):
    if not objs:
        return
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def save_blend(path: Path):
    bpy.ops.wm.save_as_mainfile(filepath=str(path), compress=True)


def export_fbx(path: Path):
    bpy.ops.export_scene.fbx(
        filepath=str(path),
        use_selection=False,
        add_leaf_bones=False,
        apply_unit_scale=True,
        bake_space_transform=False,
    )


def process_one(glb_path: Path, rotz: float, scale: float):
    reset_scene()

    imported_names = import_glb(glb_path)
    imported_objs = get_objects_by_names(imported_names)

    for obj in imported_objs:
        clear_parent_keep_world(obj)

    empty_names = [o.name for o in imported_objs if o.type == "EMPTY"]
    delete_objects_by_names(empty_names)

    imported_objs = [o for o in get_objects_by_names(imported_names) if o.type != "EMPTY"]

    apply_transform_to_objects(imported_objs, rot_z_deg=rotz, scale=scale)
    bpy.context.view_layer.update()

    move_bounds_bottom_to_origin_center_xy(imported_objs)
    bpy.context.view_layer.update()

    apply_transforms(imported_objs)
    bpy.context.view_layer.update()

    out_blend = glb_path.with_suffix(".blend")
    out_fbx = glb_path.with_suffix(".fbx")

    save_blend(out_blend)
    export_fbx(out_fbx)

    print(f"[OK] {glb_path} -> {out_fbx.name} + {out_blend.name}")


def main():
    args = parse_args()
    p = args.path.expanduser().resolve()

    if p.is_file():
        if p.suffix.lower() != ".glb":
            raise SystemExit(f"File is not a .glb: {p}")
        process_one(p, args.rotz, args.scale)
        return

    if not p.is_dir():
        raise SystemExit(f"Path is neither file nor folder: {p}")

    glbs = sorted(p.rglob("*.glb") if args.rec else p.glob("*.glb"))
    if not glbs:
        raise SystemExit(f"No .glb files found in: {p} (rec={args.rec})")

    for glb in glbs:
        process_one(glb.resolve(), args.rotz, args.scale)

    print(f"[DONE] Processed {len(glbs)} GLB files.")


main()
