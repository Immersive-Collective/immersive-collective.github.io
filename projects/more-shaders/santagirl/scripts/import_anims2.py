# folder_rework_anims.py
#
# Simplified pipeline:
# - You pass ONLY a folder path.
# - That folder must contain exactly ONE .blend (the base file) and any number of .fbx (animation clips).
# - Script opens the .blend, finds the base armature, imports each FBX, renames imported actions to FBX filename,
#   pushes each action onto the base armature as its own NLA track/strip, deletes imported objects,
#   then saves:
#     <foldername>-rework.blend
#     <foldername>-anims.glb
#   into the same folder.
#
# Run (macOS / zsh):
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P folder_rework_anims.py -- "/path/to/folder"
#
# Optional:
#   --base-armature Base
#   --ignore walk.fbx run.fbx
#   --no-draco --no-webp
#   --draco-level 6 --webp-quality 85 --webp-lossless
#   --checkpoint-each
#   --per-action

import bpy
import sys
import argparse
from pathlib import Path


def log(msg: str):
    print(f"[REWORK] {msg}")


def parse_args():
    argv = sys.argv
    if "--" not in argv:
        raise SystemExit(
            "\nMissing CLI args.\n"
            "Example:\n"
            "  blender -b -P folder_rework_anims.py -- /path/to/folder\n"
            "Optional:\n"
            "  --base-armature Base --ignore walk.fbx run.fbx --draco-level 6 --webp-quality 85\n"
        )

    user_argv = argv[argv.index("--") + 1 :]
    p = argparse.ArgumentParser()

    p.add_argument("folder", type=Path, help="Folder containing exactly one .blend and the .fbx animation files")

    p.add_argument("--base-armature", type=str, default="Base",
                   help='Preferred base armature object name (default: "Base"). If not found, script auto-picks.')

    p.add_argument("--ignore", nargs="*", default=[],
                   help="FBX filenames to ignore (match by name, e.g. walk.fbx run.fbx)")

    p.add_argument("--checkpoint-each", action="store_true",
                   help="Save a checkpoint .blend after each FBX import (in the same folder)")

    p.add_argument("--no-draco", action="store_true", help="Disable Draco compression")
    p.add_argument("--draco-level", type=int, default=6, help="Draco compression level (if enabled)")

    p.add_argument("--no-webp", action="store_true", help="Disable WebP texture export")
    p.add_argument("--webp-quality", type=int, default=85, help="WebP quality (if supported)")
    p.add_argument("--webp-lossless", action="store_true", help="WebP lossless (if supported)")

    p.add_argument("--per-action", action="store_true",
                   help="Export one GLB per action instead of a single combined GLB")

    args = p.parse_args(user_argv)

    args.folder = args.folder.expanduser().resolve()
    if not args.folder.exists():
        raise SystemExit(f"Folder does not exist: {args.folder}")

    args.ignore = {str(x).lower() for x in args.ignore}
    return args


def find_single_blend(folder: Path) -> Path:
    blends = sorted([p for p in folder.iterdir() if p.is_file() and p.suffix.lower() == ".blend"])

    # If your folder contains previous outputs, prefer a non "-rework.blend" file if possible
    non_rework = [p for p in blends if not p.stem.endswith("-rework")]
    candidates = non_rework if len(non_rework) == 1 else blends

    if len(candidates) != 1:
        names = ", ".join(p.name for p in blends) if blends else "(none)"
        raise RuntimeError(
            f"Expected exactly ONE .blend in {folder}, found {len(candidates)}.\n"
            f"Blend files present: {names}"
        )
    return candidates[0]


def list_fbx(folder: Path, ignore: set[str]) -> list[Path]:
    fbxs = sorted([p for p in folder.iterdir() if p.is_file() and p.suffix.lower() == ".fbx"])
    fbxs = [p for p in fbxs if p.name.lower() not in ignore]
    return fbxs


def open_blend(filepath: Path):
    log(f'Opening blend: "{filepath.name}"')
    bpy.ops.wm.open_mainfile(filepath=str(filepath))


def snapshot_datablocks():
    return {
        "objects": set(bpy.data.objects),
        "actions": set(bpy.data.actions),
        "armatures": set(bpy.data.armatures),
    }


def diff_new(before, after):
    return {k: [x for x in after[k] if x not in before[k]] for k in before.keys()}


def import_fbx(filepath: Path):
    bpy.ops.import_scene.fbx(filepath=str(filepath))


def unique_action_name(base: str) -> str:
    if base not in bpy.data.actions:
        return base
    idx = 1
    while True:
        cand = f"{base}_{idx:02d}"
        if cand not in bpy.data.actions:
            return cand
        idx += 1


def rename_new_actions(new_actions, stem: str):
    renamed = []
    if not new_actions:
        return renamed

    if len(new_actions) == 1:
        act = new_actions[0]
        act.name = unique_action_name(stem)
        act.use_fake_user = True
        renamed.append(act)
        return renamed

    for i, act in enumerate(sorted(new_actions, key=lambda a: a.name), start=1):
        act.name = unique_action_name(f"{stem}_{i:02d}")
        act.use_fake_user = True
        renamed.append(act)
    return renamed


def pick_base_armature(preferred_name: str) -> bpy.types.Object:
    # Prefer explicit name if it exists
    obj = bpy.data.objects.get(preferred_name)
    if obj and obj.type == "ARMATURE":
        if not obj.animation_data:
            obj.animation_data_create()
        return obj

    # Otherwise pick the armature with most bones
    arm_objs = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    if not arm_objs:
        raise RuntimeError("No armature objects found in the opened .blend.")
    arm_objs.sort(key=lambda o: len(o.data.bones), reverse=True)
    base = arm_objs[0]
    if not base.animation_data:
        base.animation_data_create()
    log(f'Preferred armature "{preferred_name}" not found; using "{base.name}" instead.')
    return base


def add_action_as_nla_strip(arm_obj: bpy.types.Object, action: bpy.types.Action):
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()
    ad = arm_obj.animation_data

    track = ad.nla_tracks.new()
    track.name = f"{action.name}_Track"

    start, end = action.frame_range

    # Blender 4.5+: expects int start frame
    strip_start = 0
    strip = track.strips.new(name=action.name, start=strip_start, action=action)

    a0 = int(round(float(start)))
    a1 = int(round(float(end)))
    length = max(1, a1 - a0)

    strip.action_frame_start = a0
    strip.action_frame_end = a1
    strip.frame_start = strip_start
    strip.frame_end = strip_start + length

    action.use_fake_user = True


def delete_objects(objs):
    if not objs:
        return
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        if o and o.name in bpy.data.objects:
            o.select_set(True)
    bpy.ops.object.delete()


def safe_orphans_purge():
    try:
        bpy.ops.outliner.orphans_purge(do_recursive=True)
    except Exception:
        pass


def save_blend(filepath: Path):
    log(f'Saving blend: "{filepath.name}"')
    bpy.ops.wm.save_as_mainfile(filepath=str(filepath), compress=True)


def export_glb(filepath: Path, enable_draco: bool, draco_level: int,
               export_webp: bool, webp_quality: int, webp_lossless: bool):
    op = bpy.ops.export_scene.gltf
    props = {p.identifier for p in op.get_rna_type().properties}
    kwargs = {}

    def set_if_exists(key, value):
        if key in props:
            kwargs[key] = value

    set_if_exists("filepath", str(filepath))
    set_if_exists("export_format", "GLB")

    set_if_exists("export_animations", True)
    set_if_exists("export_nla_strips", True)
    set_if_exists("export_all_actions", True)

    if export_webp:
        set_if_exists("export_image_format", "WEBP")
        set_if_exists("export_image_quality", webp_quality)
        set_if_exists("export_webp_quality", webp_quality)
        set_if_exists("export_webp_lossless", webp_lossless)
        set_if_exists("export_image_webp_lossless", webp_lossless)

    if enable_draco:
        set_if_exists("export_draco_mesh_compression_enable", True)
        set_if_exists("export_draco_mesh_compression_level", draco_level)
        set_if_exists("export_draco_position_quantization", 14)
        set_if_exists("export_draco_normal_quantization", 10)
        set_if_exists("export_draco_texcoord_quantization", 12)
        set_if_exists("export_draco_color_quantization", 10)
        set_if_exists("export_draco_generic_quantization", 12)

    set_if_exists("use_selection", False)

    log(f'Exporting GLB: "{filepath.name}"')
    op(**kwargs)


def main():
    args = parse_args()

    folder = args.folder
    folder_name = folder.name

    base_blend = find_single_blend(folder)
    fbx_files = list_fbx(folder, args.ignore)

    if not fbx_files:
        raise RuntimeError(f"No FBX files to process in: {folder}")

    out_blend = folder / f"{folder_name}-rework.blend"
    out_glb = folder / f"{folder_name}-anims.glb"

    open_blend(base_blend)

    base = pick_base_armature(args.base_armature)

    # Keep everything that existed before imports (so we don't delete your mesh/rig/etc.)
    pre_import_objects = set(bpy.data.objects)
    pre_import_armatures = set(bpy.data.armatures)

    log(f'Base armature: "{base.name}"')
    log(f"FBX files to process: {len(fbx_files)}")

    all_actions_added = []

    for fbx in fbx_files:
        log(f'Importing FBX: "{fbx.name}"')

        before = snapshot_datablocks()
        import_fbx(fbx)
        after = snapshot_datablocks()

        new = diff_new(before, after)
        new_actions = list(new["actions"])
        new_objects = list(new["objects"])
        new_armatures = list(new["armatures"])

        renamed_actions = rename_new_actions(new_actions, fbx.stem)

        if not renamed_actions:
            log(f'  WARNING: No new actions detected in "{fbx.name}"')
        else:
            for act in renamed_actions:
                add_action_as_nla_strip(base, act)
                all_actions_added.append(act)
                log(f"  Added NLA track for action: {act.name}")

        # Delete objects imported by this FBX (anything not in the pre-import object set),
        # but never delete the base armature.
        to_delete = [o for o in new_objects if o not in pre_import_objects and o.name != base.name]
        delete_objects(to_delete)

        # Remove unused armature datablocks imported by this FBX
        for arm_data in new_armatures:
            if arm_data not in pre_import_armatures and arm_data.users == 0:
                bpy.data.armatures.remove(arm_data)

        safe_orphans_purge()

        if args.checkpoint_each:
            save_blend(folder / f"{fbx.stem}_checkpoint.blend")

    # Save reworked blend (auto-named)
    save_blend(out_blend)

    enable_draco = not args.no_draco
    export_webp = not args.no_webp

    if not args.per_action:
        export_glb(
            out_glb,
            enable_draco=enable_draco,
            draco_level=args.draco_level,
            export_webp=export_webp,
            webp_quality=args.webp_quality,
            webp_lossless=args.webp_lossless,
        )
    else:
        # Export one GLB per action name (still same scene; filename differs)
        for act in all_actions_added:
            export_glb(
                folder / f"{act.name}.glb",
                enable_draco=enable_draco,
                draco_level=args.draco_level,
                export_webp=export_webp,
                webp_quality=args.webp_quality,
                webp_lossless=args.webp_lossless,
            )

    log("Done.")


main()
