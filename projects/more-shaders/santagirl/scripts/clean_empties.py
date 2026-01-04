import bpy

# Remove all empties in the current scene (and their datablocks)
empties = [obj for obj in bpy.context.scene.objects if obj.type == 'EMPTY']

# Select and delete them
bpy.ops.object.select_all(action='DESELECT')
for obj in empties:
    obj.select_set(True)

bpy.ops.object.delete()

print(f"Deleted {len(empties)} EMPTY objects.")
