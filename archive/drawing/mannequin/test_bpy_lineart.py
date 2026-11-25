"""
Test 2: Blender 4.5 Headless (bpy) + Grease Pencil Line Art Modifier test.
Builds a smooth subdivided 3D anime head/bust + headphones + collar + hair ribbons
and extracts real Grease Pencil Line Art (contours + creases + material borders) to PNG,
so we can directly compare pure 3D Line Art extraction vs 3D-guided 2D calligraphic ink!
"""
import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler

# Reset scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 4
scene.cycles.use_denoising = False
scene.render.use_freestyle = True
scene.render.line_thickness_mode = 'ABSOLUTE'
scene.render.line_thickness = 3.2
vl = scene.view_layers[0]
vl.use_freestyle = True
fs = vl.freestyle_settings
ls = fs.linesets.new("AnimeLines")
ls.select_silhouette = True
ls.select_border = True
ls.select_crease = True
ls.select_external_contour = True
ls.select_edge_mark = False
ls.select_material_boundary = True
fs.crease_angle = math.radians(120)
ls.linestyle.color = (0.04, 0.04, 0.06)
ls.linestyle.thickness = 3.5
# Add calligraphic thickness along stroke modifier!
mod_th = ls.linestyle.thickness_modifiers.new("Calligraphy", 'CALLIGRAPHY')
mod_th.orientation = math.radians(55)
mod_th.thickness_min = 1.6
mod_th.thickness_max = 6.0
scene.render.resolution_x = 1024
scene.render.resolution_y = 1536
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'Standard'

# Pure white world background (so line art renders black on white!)
world = bpy.data.worlds.new("WhiteWorld")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
bg.inputs[0].default_value = (1.0, 1.0, 1.0, 1.0)
bg.inputs[1].default_value = 1.0

# Pure flat white emission material for meshes (so only Grease Pencil ink shows!)
white_mat = bpy.data.materials.new("PaperWhite")
white_mat.use_nodes = True
nt = white_mat.node_tree
nt.nodes.clear()
em = nt.nodes.new("ShaderNodeEmission")
em.inputs[0].default_value = (1.0, 1.0, 1.0, 1.0)
em.inputs[1].default_value = 1.0
out = nt.nodes.new("ShaderNodeOutputMaterial")
nt.links.new(em.outputs[0], out.inputs[0])

# Collection for line-art target meshes
col = bpy.data.collections.new("Character")
scene.collection.children.link(col)

def add_mesh_obj(name, bm, smooth=True, subdiv=1):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    col.objects.link(obj)
    obj.data.materials.append(white_mat)
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    if subdiv > 0:
        mod = obj.modifiers.new("Subsurf", 'SUBSURF')
        mod.levels = subdiv
        mod.render_levels = subdiv
    return obj

# 1. Sculpted 3D Anime Head (via lofted profiles, matching our TS head!)
bm = bmesh.new()
def head_ring(z_up, pts_xz):
    # pts_xz: half-profile from front (x=0, y=-front) to back (x=0, y=+back)
    full = [(x, -f, z_up) for (x, f) in pts_xz] + [(-x, -f, z_up) for (x, f) in reversed(pts_xz[1:-1])]
    return [bm.verts.new(p) for p in full]

rows_spec = [
    (0.50, [(0,0.04),(0.03,0.03),(0.05,0.01),(0.06,-0.02),(0.05,-0.06),(0.03,-0.10),(0,-0.12)]),
    (0.44, [(0,0.22),(0.10,0.20),(0.19,0.14),(0.24,0.02),(0.23,-0.14),(0.15,-0.30),(0,-0.36)]),
    (0.32, [(0,0.35),(0.13,0.34),(0.25,0.26),(0.33,0.10),(0.34,-0.10),(0.24,-0.36),(0,-0.45)]),
    (0.16, [(0,0.40),(0.14,0.39),(0.27,0.31),(0.36,0.13),(0.37,-0.08),(0.27,-0.40),(0,-0.48)]),
    (0.03, [(0,0.415),(0.13,0.395),(0.27,0.31),(0.35,0.13),(0.365,-0.07),(0.26,-0.38),(0,-0.46)]),
    (-0.06, [(0,0.405),(0.11,0.372),(0.26,0.30),(0.34,0.13),(0.355,-0.06),(0.25,-0.35),(0,-0.42)]),
    (-0.15, [(0,0.412),(0.09,0.378),(0.245,0.31),(0.33,0.12),(0.335,-0.05),(0.22,-0.30),(0,-0.36)]),
    (-0.22, [(0,0.455),(0.055,0.385),(0.205,0.295),(0.295,0.10),(0.295,-0.04),(0.18,-0.24),(0,-0.29)]),
    (-0.29, [(0,0.405),(0.065,0.375),(0.175,0.275),(0.255,0.10),(0.255,-0.02),(0.15,-0.18),(0,-0.22)]),
    (-0.37, [(0,0.392),(0.06,0.365),(0.135,0.265),(0.195,0.12),(0.19,0.02),(0.10,-0.10),(0,-0.13)]),
    (-0.45, [(0,0.375),(0.045,0.355),(0.085,0.285),(0.11,0.18),(0.10,0.08),(0.05,0.00),(0,-0.03)]),
    (-0.50, [(0,0.360),(0.025,0.348),(0.042,0.31),(0.045,0.24),(0.04,0.17),(0.02,0.12),(0,0.10)]),
]
rings = [head_ring(z, pts) for (z, pts) in rows_spec]
n = len(rings[0])
for j in range(len(rings) - 1):
    for i in range(n):
        bm.faces.new((rings[j][i], rings[j][(i+1)%n], rings[j+1][(i+1)%n], rings[j+1][i]))
bm.faces.new(rings[0])
bm.faces.new(list(reversed(rings[-1])))
head_obj = add_mesh_obj("AnimeHead", bm, smooth=True, subdiv=2)
head_obj.location = (0, 0, 1.55)
head_obj.rotation_euler = Euler((math.radians(-8), math.radians(-14), math.radians(-24)), 'XYZ')

# 2. Neck, Shoulders, High-Neck Torso & Jacket Collar + Headphones (real smooth 3D meshes!)
bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.15, depth=0.45, location=(0, 0.04, 1.05))
neck = bpy.context.active_object
neck.data.materials.append(white_mat)
for c in list(neck.users_collection): c.objects.unlink(neck)
col.objects.link(neck)

bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=0.52, location=(0, 0.05, 0.50))
torso = bpy.context.active_object
torso.scale = (1.15, 0.65, 1.25)
torso.data.materials.append(white_mat)
for c in list(torso.users_collection): c.objects.unlink(torso)
col.objects.link(torso)

# Headphones earcup + band (hard-surface!)
bpy.ops.mesh.primitive_torus_add(major_radius=0.46, minor_radius=0.045, location=(0.04, 0.04, 1.62), rotation=(math.radians(82), math.radians(-14), math.radians(-24)))
band = bpy.context.active_object
band.data.materials.append(white_mat)
for c in list(band.users_collection): c.objects.unlink(band)
col.objects.link(band)

bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.20, depth=0.16, location=(0.38, -0.05, 1.48), rotation=(math.radians(8), math.radians(76), math.radians(-24)))
cup = bpy.context.active_object
cup.data.materials.append(white_mat)
for c in list(cup.users_collection): c.objects.unlink(cup)
col.objects.link(cup)

# 3. 3D Bezier Hair Ribbons using Blender Curves with bevel taper!
def add_hair_curve(name, pts, widths):
    cd = bpy.data.curves.new(name, 'CURVE')
    cd.dimensions = '3D'
    cd.bevel_depth = 0.06
    cd.bevel_resolution = 3
    cd.extrude = 0.04
    sp = cd.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for i, (p, w) in enumerate(zip(pts, widths)):
        sp.points[i].co = (p[0], p[1], p[2], 1.0)
        sp.points[i].radius = w
    obj = bpy.data.objects.new(name, cd)
    col.objects.link(obj)
    obj.parent = head_obj
    obj.data.materials.append(white_mat)
    return obj

add_hair_curve("BangC", [(0.04,-0.22,0.44),(-0.04,-0.45,0.28),(-0.03,-0.47,0.04),(0.04,-0.45,-0.14)], [1.1, 1.3, 0.85, 0.05])
add_hair_curve("BangL", [(-0.04,-0.22,0.42),(-0.22,-0.42,0.26),(-0.32,-0.38,0.05),(-0.26,-0.36,-0.12)], [1.0, 1.1, 0.75, 0.05])
add_hair_curve("BangR", [(0.10,-0.20,0.42),(0.24,-0.37,0.26),(0.32,-0.32,0.06),(0.26,-0.31,-0.10)], [0.9, 1.0, 0.65, 0.05])
add_hair_curve("SideL", [(-0.14,-0.16,0.40),(-0.38,-0.26,0.22),(-0.44,-0.24,-0.08),(-0.34,-0.25,-0.36),(-0.18,-0.27,-0.50)], [1.2, 1.3, 1.1, 0.7, 0.05])
add_hair_curve("SideR", [(0.16,-0.16,0.38),(0.38,-0.24,0.20),(0.42,-0.20,-0.08),(0.34,-0.21,-0.36),(0.20,-0.23,-0.48)], [1.0, 1.1, 0.95, 0.6, 0.05])
add_hair_curve("Flip1", [(-0.12,0.12,0.34),(-0.48,0.14,0.14),(-0.82,0.16,-0.04),(-1.02,0.18,0.04)], [1.6, 1.8, 1.2, 0.05])
add_hair_curve("Flip2", [(-0.14,0.18,0.16),(-0.50,0.18,-0.08),(-0.82,0.16,-0.30),(-0.98,0.14,-0.34)], [1.5, 1.7, 1.1, 0.05])

# 4. Camera (65mm portrait lens!)
cam_data = bpy.data.cameras.new("Cam")
cam_data.lens = 65
cam_obj = bpy.data.objects.new("Cam", cam_data)
scene.collection.objects.link(cam_obj)
cam_obj.location = (0.0, -4.4, 1.20)
cam_obj.rotation_euler = (math.radians(90), 0, 0)
scene.camera = cam_obj

# Note: Using Freestyle with Calligraphy thickness modifier on Cycles CPU (renders cleanly headless on macOS!)
# Render!
os.makedirs("exp/out", exist_ok=True)
scene.render.filepath = os.path.abspath("exp/out/test2-blender-lineart.png")
bpy.ops.render.render(write_still=True)
print("Wrote exp/out/test2-blender-lineart.png")
