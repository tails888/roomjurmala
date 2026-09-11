"""Blender authoring source for ROOM. Run with Blender --background --python.

Scene helpers take browser coordinates (x, height, depth). P() converts them to
Blender Z-up. Export converts back to glTF Y-up. Dimensions are estimates.
"""
import bpy, math, random, json, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/tour'
OUT.mkdir(exist_ok=True)
random.seed(27)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block in bpy.data.materials: bpy.data.materials.remove(block)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.world.color = (.35, .35, .35)
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.8,.87,1,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .32
scene.view_settings.view_transform = 'AgX'
colliders = []
collection = None

def group(name):
    global collection
    collection = bpy.data.collections.new(name)
    scene.collection.children.link(collection)

def P(p): return Vector((p[0], -p[2], p[1]))
def lin(v): return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4
def color(hex): return tuple(lin(int(hex[i:i+2],16)/255) for i in (0,2,4)) + (1,)
def mat(name, hex, rough=.65, metal=0, emission=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    m.diffuse_color=color(hex)
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=color(hex)
    bs.inputs['Roughness'].default_value=rough
    bs.inputs['Metallic'].default_value=metal
    if emission:
        bs.inputs['Emission Color'].default_value=color(hex)
        bs.inputs['Emission Strength'].default_value=emission
    return m

def texture(m, path, scale=1):
    nodes=m.node_tree.nodes; links=m.node_tree.links
    tex=nodes.new('ShaderNodeTexImage'); tex.image=bpy.data.images.load(str(path),check_existing=True)
    links.new(tex.outputs['Color'],nodes['Principled BSDF'].inputs['Base Color'])
    m['uv_scale']=scale
    return m

white=mat('Warm white painted joinery','e9e8df',.78)
plaster=mat('White plaster','e5e3db',.88)
taupe=mat('Kitchen warm grey','c5bfae',.85)
sage=mat('Dining sage wall','c1cdb3',.87)
black=mat('Black chair upholstery','292b2a',.54)
steel=mat('Brushed stainless steel','a6aca9',.31,.72)
dark=mat('Black powder coated metal','222725',.44,.3)
cabinet=mat('Charcoal cabinet fronts','484a44',.56)
cream=mat('Linen storage bins','c7bea8',.95)
oak=texture(mat('Oak table top','c4a275',.55),OUT/'oak.jpg')
carpet=texture(mat('Grey loop pile carpet','91908b',1),OUT/'carpet.jpg',3)
floor=texture(mat('Grey vinyl floor','b6b8ae',.7),OUT/'vinyl.jpg',1)
brick=texture(mat('Exposed red brick','aa6953',.9),OUT/'brick.jpg',.9)
cloth=mat('Pleated white curtain','eceee6',.98)
cloth.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value=.58
cloth.surface_render_method='DITHERED'
window=mat('Daylight behind curtains','dce7da',1,emission=.6)
lamp=mat('Warm white fluorescent diffuser','fff6dc',.5,emission=2)
red=mat('Red plastic','b83139',.52)
yellow=mat('Yellow foam','f4c72b',.7)
orange=mat('Orange foam','ed762b',.74)
green=mat('Green foam','43a667',.75)
mint=mat('Mint foam','a9d4bb',.8)
blue=mat('Blue foam','a5c9df',.8)
pink=mat('Pink foam','e3b1c8',.8)
lilac=mat('Lilac foam','c1b5d2',.8)
ivory=mat('Ivory foam','e7e0b8',.8)
lime=mat('Child chair green','72ad42',.55)
fur=mat('Teddy fur','97673e',.98)
tan=mat('Teddy muzzle','c29a65',.95)
soil=mat('Potting soil','403526',1)
leaf=mat('Living plants','557043',.76)
rose=mat('Coffee machine red','962e48',.38)
palette=[red,yellow,orange,green,mint,blue,pink,lilac,ivory]

def register(obj,name,m):
    obj.name=name
    for c in list(obj.users_collection): c.objects.unlink(obj)
    collection.objects.link(obj)
    if m: obj.data.materials.append(m)
    return obj

def uv_world(obj,m):
    if not obj.data.uv_layers: obj.data.uv_layers.new()
    uv=obj.data.uv_layers.active.data
    factor=m.get('uv_scale',1)
    for f in obj.data.polygons:
        normal=f.normal; axis=max(range(3),key=lambda i:abs(normal[i]))
        axes=[i for i in range(3) if i!=axis]
        for i in f.loop_indices:
            v=obj.data.vertices[obj.data.loops[i].vertex_index].co
            uv[i].uv=(v[axes[0]]*factor,v[axes[1]]*factor)

def box(name,x,h,z,w,H,d,m,bevel=.008,turn=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=P((x,h,z)))
    o=register(bpy.context.object,name,m);o.dimensions=(w,d,H)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    uv_world(o,m)
    if bevel:
        mod=o.modifiers.new('Soft manufactured edge','BEVEL');mod.width=min(bevel,min(w,H,d)*.35);mod.segments=3
        mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    o.rotation_euler.z=turn
    return o

def ball(name,x,h,z,r,m,scale=(1,1,1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=r,location=P((x,h,z)))
    o=register(bpy.context.object,name,m);o.scale=(scale[0],scale[2],scale[1])
    for p in o.data.polygons:p.use_smooth=True
    return o

def rod(name,a,b,r,m,r2=None):
    a,b=P(a),P(b);v=b-a
    bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=r,radius2=r if r2 is None else r2,depth=v.length,location=(a+b)/2)
    o=register(bpy.context.object,name,m);o.rotation_euler=v.to_track_quat('Z','Y').to_euler()
    for p in o.data.polygons:p.use_smooth=True
    return o

def tube(name,points,r,m):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=1;curve.bevel_depth=r;curve.bevel_resolution=2
    s=curve.splines.new('POLY');s.points.add(len(points)-1)
    for a,b in zip(s.points,points):a.co=(*P(b),1)
    o=bpy.data.objects.new(name,curve);collection.objects.link(o);o.data.materials.append(m);return o

def solid(name,x,z,w,d):
    colliders.append(dict(name=name,minX=round(x-w/2,4),maxX=round(x+w/2,4),minZ=round(z-d/2,4),maxZ=round(z+d/2,4)))

group('01 Architecture')
box('Vinyl floor',0,-.065,0,10.2,.13,9.8,floor,0)
box('Carpet boundary',-2.15,.007,-1.68,5.7,.014,6.22,carpet,.002)
box('Ceiling',0,3.13,0,10.2,.16,9.8,plaster,0)
box('Exposed brick wall',-2.13,1.52,-4.87,5.75,3.05,.16,brick,0)
box('Rear service envelope',2.87,1.52,-4.87,4.27,3.05,.16,plaster,0)
box('Right wall',5.08,1.52,0,.16,3.05,9.8,plaster,0)
box('Front white wall',-2.12,1.52,4.87,5.75,3.05,.16,plaster,0)
box('Front sage wall',2.87,1.52,4.87,4.27,3.05,.16,sage,0)
box('Kitchen wall front',2.45,1.52,-2.86,3.4,3.05,.16,taupe,.005)
box('Kitchen return',.73,1.52,-3.87,.16,3.05,2.05,taupe,.005)
solid('Unsurveyed service block',2.86,-3.81,4.28,2.06)
box('Main painted brick column',.73,1.52,1.38,.46,3.05,.50,white,.008)
solid('Column',.73,1.38,.46,.50)
box('Cross beam',0,2.78,1.38,10,.55,.50,plaster,.01)
box('Kitchen ceiling beam',2.9,2.82,-2.15,4.2,.48,.36,plaster,.006)
for x,z in [(-4.91,1.38),(4.91,1.38),(-1.9,4.78)]:
    box('Wall pilaster',x,1.5,z,.23,3,.26,white,.005)
for x,z,w,d in [(0,4.77,10,.035),(4.96,0,.035,9.6),(-2.15,-4.77,5.7,.035)]:
    box('Skirting',x,.055,z,w,.11,d,white,.005)
# The service doors are visible, but their interiors are not surveyed.
def door(x,z,w=.84,m=white):
    box('Door surround',x,1.08,z,w+.12,2.16,.07,white,.008)
    box('Closed door',x,1.04,z+.046,w,2.06,.035,m,.009)
    for h,H in [(.48,.65),(1.39,.88)]:box('Door panel',x,h,z+.07,w-.16,H,.022,m,.008)
    rod('Door lever',(x+w*.34,1.02,z+.11),(x+w*.19,1.02,z+.11),.015,steel)
door(4.55,-4.68)
# Visible back-right side doors, rotate around vertical.
for z in [-2.8,-1.35]:
    o=box('Side door frame',4.95,1.07,z,.08,2.14,.93,white)
    box('Side closed door',4.895,1.02,z,.035,2.04,.82,taupe)
    rod('Side door lever',(4.83,1,z+.24),(4.83,1,z+.09),.014,steel)

group('02 Windows and entrance')
box('Window wall lower',-5.06,.19,0,.14,.38,9.8,white,0)
box('Window wall upper',-5.06,2.94,0,.14,.30,9.8,white,0)
# Window bays with actual tall lower panes and short transoms.
for a,b in [(-4.77,1.05),(1.85,4.77)]:
    width=b-a;mid=(a+b)/2
    box('Soft daylight',-5.09,1.6,mid,.04,2.55,width,window,0)
    for h in [.38,2.36,2.85]:box('Window horizontal frame',-4.99,h,mid,.11,.065,width,white,.003)
    n=round(width/.73)
    for i in range(n+1):box('Window mullion',-4.985,1.6,a+i*width/n,.12,2.55,.05,white,.003)
    box('Window sill',-4.9,.36,mid,.34,.075,width,white,.01)
    verts=[];faces=[];steps=int(width*45)
    for i in range(steps+1):
        z=a+i*width/steps;x=-4.77+.037*math.sin(i/steps*width*32)
        for h in [.10,1.38,2.92]:verts.append(tuple(P((x,h+.015*math.sin(i*.4),z))))
    for i in range(steps):
        for j in range(2):a1=i*3+j;faces.append((a1,a1+3,a1+4,a1+1))
    mesh=bpy.data.meshes.new('Pleated curtain mesh');mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new('Continuous pleated curtain',mesh);collection.objects.link(o);mesh.materials.append(cloth)
    for f in mesh.polygons:f.use_smooth=True
    # Open strips between curtain panels reveal the daylight without alpha sorting.
    cloth.use_backface_culling=False
    solid('Window curtain boundary',-4.88,mid,.24,width)
# Shallow entry recess between window bays, seen in entry video 0-3s.
box('Entrance wall pier',-4.92,1.52,1.45,.20,3.05,.78,white)
box('Entrance notice board',-4.78,1.67,1.45,.05,.78,.48,oak)
for h,z in [(1.83,1.34),(1.62,1.53),(1.48,1.32)]:box('Notice paper',-4.743,h,z,.007,.18,.17,ivory,.001)
box('Shoe bench cushion',-4.15,.45,1.46,.65,.075,.42,black,.02)
for x in [-4.42,-3.88]:box('Bench leg',x,.22,1.46,.035,.43,.38,dark)
box('Shoe shelf',-4.15,.18,1.46,.61,.025,.37,steel)
solid('Entry bench',-4.15,1.46,.67,.46)
box('Entrance mat',-3.66,.017,2.27,1.25,.023,.8,carpet)
for z in [-.01,.25,.51]:
    tube('Coat hook',[(-4.91,1.70,z),(-4.78,1.70,z),(-4.77,1.76,z)],.012,dark)
    tube('Coat hanger',[(-4.80,1.58,z-.12),(-4.80,1.70,z),(-4.80,1.58,z+.12),(-4.80,1.58,z-.12)],.008,dark)

def radiator(x,z,w,turn=0,h=.42,y=.49):
    box('Panel radiator',x,y,z,w,h,.10,white,.01,turn)
    for i in range(int(w/.048)):
        dx=-w/2+.025+i*.048
        box('Radiator flute',x+dx*math.cos(turn),y,z-dx*math.sin(turn)+.057,.014,h-.03,.024,white,.006,turn)
    rod('Heating pipe',(x-w/2-.04,.16,z),(x+w/2+.04,.16,z),.012,white)
radiator(-2.75,-4.68,1.55,y=1.21)
radiator(-3.56,4.69,1.43,math.pi)
radiator(-.61,4.69,1.05,math.pi)

group('03 Storage and toys')
def shelf(name,x,z,n,turn=0,bins=False):
    w=n*.40;H=.84;d=.39
    def part(a,h,c,W,hh,D,m):
        return box(name,x+a*math.cos(turn)+c*math.sin(turn),h,z-a*math.sin(turn)+c*math.cos(turn),W,hh,D,m,.005,turn)
    for h in [.04,.44,.84]:part(0,h,0,w,.04,d,white)
    for i in range(n+1):part(-w/2+i*.4,.44,0,.035,.80,d,white)
    for i in range(n):
        for row in range(2):
            a=-w/2+.2+i*.4;h=.09+row*.40
            if bins:
                part(a,h+.145,.005,.335,.29,.335,cream)
                part(a,h+.235,.178,.13,.028,.012,dark)
            elif (i+row)%3==0:
                for j in range(3):part(a-.095+j*.082,h+.13,0,.061,.23+random.random()*.07,.20,palette[(i+j+row)%9])
            else:
                xx=x+a*math.cos(turn);zz=z-a*math.sin(turn)
                ball('Toy in cubby',xx,h+.13,zz,.10,palette[(i+row*2)%9],(1,1,.85))
    solid(name,x,z,w if turn==0 else d,d if turn==0 else w)
shelf('Brick wall cubbies',-2.35,-4.54,12)
shelf('Divider storage',.73,-.52,9,math.pi/2,True)
# Large plush bear on top of the brick-wall cubbies.
for name,x,h,z,r,m,s in [
    ('Teddy body',-2.1,1.12,-4.49,.25,fur,(1,1.2,.72)),('Teddy head',-2.1,1.51,-4.47,.22,fur,(1,1,1)),
    ('Teddy muzzle',-2.1,1.45,-4.26,.105,tan,(1,.7,.6)),('Teddy nose',-2.1,1.49,-4.195,.032,dark,(1,.7,1))]:ball(name,x,h,z,r,m,s)
for sign in [-1,1]:
    ball('Teddy ear',-2.1+sign*.16,1.69,-4.46,.084,fur)
    ball('Teddy eye',-2.1+sign*.085,1.55,-4.273,.015,dark)
    ball('Teddy arm',-2.1+sign*.24,1.16,-4.43,.115,fur,(.9,1.6,1))
    ball('Teddy foot',-2.1+sign*.15,.88,-4.30,.13,fur,(1,.7,1.25))
# Toy kitchen in the far corner, visible in all soft-play views.
box('Toy kitchen body',.13,.34,-4.46,.63,.65,.33,white,.014);solid('Toy kitchen',.13,-4.46,.63,.35)
box('Toy kitchen worktop',.13,.69,-4.44,.66,.045,.36,oak)
box('Toy oven glass',.13,.38,-4.263,.27,.30,.025,dark,.024)
for x in [-.08,.32]:ball('Toy kitchen knob',x,.61,-4.25,.022,steel)
box('Toy backsplash',.13,.89,-4.59,.62,.37,.03,white)

group('04 Soft play')
box('Soft play padded base',-2.33,.10,-2.85,2.15,.18,1.63,lilac,.04)
solid('Soft play',-2.33,-2.85,2.18,1.67)
for x,z,w,d,m in [(-3.30,-2.85,.21,1.65,ivory),(-1.36,-2.85,.21,1.65,blue),(-2.33,-2.09,2.12,.21,mint),(-2.33,-3.61,2.12,.21,pink)]:
    box('Padded pit wall',x,.29,z,w,.40,d,m,.045)
for i in range(16):
    x=-3.06+random.random()*1.47;z=-3.37+random.random()*1.04
    ball('Ball pit ball',x,.32+random.random()*.06,z,.12+random.random()*.06,palette[i%9])
# Green triangular support and yellow slide, behind the pit.
def wedge(name,x,z,w,d,H,m):
    v=[(x-w/2,0,z-d/2),(x+w/2,0,z-d/2),(x-w/2,0,z+d/2),(x+w/2,0,z+d/2),(x-w/2,H,z-d/2),(x+w/2,H,z-d/2)]
    faces=[(0,2,3,1),(0,1,5,4),(0,4,2),(1,3,5),(4,5,3,2)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata([tuple(P(p)) for p in v],[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);collection.objects.link(o);mesh.materials.append(m)
    mod=o.modifiers.new('Rounded foam edge','BEVEL');mod.width=.025;mod.segments=3
    o.modifiers.new('Weighted foam normals','WEIGHTED_NORMAL')
wedge('Green ramp support',-1.22,-3.15,.77,1.5,.66,green)
wedge('Yellow padded slide',-.98,-3.13,.48,1.52,.69,yellow)
solid('Ramp',-1.12,-3.15,.85,1.6)
for i in range(3):box('Foam steps',-3.47,.09+i*.075,-3.0-i*.31,.53,.18+i*.15,.31,palette[2+i],.025)
solid('Foam steps',-3.47,-3.31,.55,.95)
box('Orange play sofa base',-2.25,.20,-3.94,1.25,.38,.40,orange,.035)
box('Red play sofa back',-2.25,.45,-4.10,1.25,.30,.15,red,.03)
solid('Play sofa',-2.25,-3.96,1.3,.46)
ball('Black beanbag',-.35,.26,-2.39,.60,black,(1,.55,1));solid('Beanbag',-.35,-2.39,1.04,1.04)
box('Green activity block',-1.13,.20,-1.46,.44,.39,.44,green,.06);solid('Activity block',-1.13,-1.46,.44,.44)
for i in range(4):ball('Activity toy',-1.25+i*.075,.44,-1.46,.04,palette[i])

group('05 Table football')
fx,fz=-3.55,-.35
box('Foosball housing',fx,.77,fz,.71,.18,1.21,dark,.055)
box('Green pitch',fx,.87,fz,.60,.02,1.08,green,.003)
solid('Table football',fx,fz,1.18,1.24)
for x in [fx-.25,fx+.25]:
    for z in [fz-.47,fz+.47]:
        rod('Red splayed leg',(x+(.035 if x>fx else -.035),.04,z+(.035 if z>fz else -.035)),(x,.72,z),.038,red)
        rod('Yellow foot',(x+(.035 if x>fx else -.035),.01,z+(.035 if z>fz else -.035)),(x+(.035 if x>fx else -.035),.09,z+(.035 if z>fz else -.035)),.04,yellow)
for x in [fx-.345,fx+.345]:box('Yellow side rail',x,.92,fz,.045,.09,1.17,yellow,.018)
for z in [fz-.575,fz+.575]:
    box('Black end rail',fx,.92,z,.71,.1,.05,dark,.018)
    box('Goal',fx,.90,z,.23,.095,.045,ivory,.008)
for i,n in enumerate([1,2,3,3,2,1]):
    z=fz-.43+i*.172;rod('Chrome playing rod',(fx-.56,.94,z),(fx+.56,.94,z),.011,steel)
    side=1 if i%2 else -1;rod('Rod grip',(fx+side*.40,.94,z),(fx+side*.58,.94,z),.024,orange)
    for j in range(n):
        x=fx+(j-(n-1)/2)*.17;m=dark if i%2 else blue
        box('Player body',x,.958,z,.058,.11,.044,m,.011)
        ball('Player head',x,1.045,z,.027,tan)
        box('Player foot',x,.891,z,.061,.045,.045,m,.008)
box('Pitch halfway stripe',fx,.884,fz,.59,.002,.012,white,0)
for x in [fx-.285,fx+.285]:box('Pitch touchline',x,.884,fz,.008,.002,1.04,white,0)

group('06 Kitchen')
box('Kitchen carcass',2.35,.43,-2.41,3.12,.85,.64,cabinet,.008)
box('Light worktop',2.35,.891,-2.40,3.2,.05,.72,ivory,.008)
solid('Kitchen cabinets',2.35,-2.4,3.23,.74)
for x in [1.10,1.72,2.34,2.96,3.58]:
    for h,H in [(.24,.27),(.54,.28),(.754,.12)]:
        box('Cabinet drawer',x,h,-2.071,.60,H,.025,cabinet,.006)
        box('Recessed drawer pull',x,h+H/2-.025,-2.05,.46,.018,.018,dark,.002)
box('Inset sink rim',1.27,.925,-2.41,.58,.022,.44,steel,.022)
box('Sink basin shadow',1.27,.933,-2.41,.47,.012,.34,dark,.045)
tube('Black curved faucet',[(1.12,.92,-2.63),(1.12,1.15,-2.63)]+[(1.23-.11*math.cos(t*math.pi/12),1.15+.11*math.sin(t*math.pi/12),-2.63) for t in range(13)]+[(1.34,1.12,-2.63)],.016,dark)
box('Induction hob',2.32,.925,-2.40,.58,.022,.49,dark,.008)
for x in [2.17,2.47]:
    for z in [-2.53,-2.29]:
        bpy.ops.mesh.primitive_torus_add(major_radius=.085,minor_radius=.003,major_segments=24,minor_segments=6,location=P((x,.94,z)))
        register(bpy.context.object,'Hob ring',steel)
box('Oven glass',2.34,.47,-2.04,.50,.39,.025,dark,.022)
rod('Oven bar',(2.12,.68,-1.997),(2.56,.68,-1.997),.012,steel)
box('Stainless fridge',4.25,1.01,-2.42,.64,2.02,.69,steel,.014);solid('Fridge',4.25,-2.42,.67,.73)
for h,H in [(.35,.65),(1.35,1.32)]:box('Fridge door',4.25,h,-2.057,.62,H,.04,steel,.011)
for h in [.70,.86]:rod('Fridge handle',(4.06,h,-2.003),(4.36,h,-2.003),.012,steel)
ball('Red coffee machine',3.28,1.04,-2.47,.145,rose,(.9,1.15,.80))
box('Coffee recess',3.28,1.04,-2.33,.11,.17,.07,dark,.018)
rod('Electric kettle',(3.66,.92,-2.48),(3.66,1.16,-2.48),.09,steel,.078)
tube('Kettle handle',[(3.72,1.13,-2.48),(3.82,1.13,-2.48),(3.82,.98,-2.48),(3.72,.97,-2.48)],.015,dark)
rod('Paper towel roll',(1.75,.92,-2.52),(1.75,1.17,-2.52),.06,white)
for x in [2.84,2.98]:rod('Ceramic mug',(x,.92,-2.52),(x,1.01,-2.52),.04,white)
rod('Black clock',(3.15,2.14,-2.75),(3.15,2.14,-2.79),.18,dark)
for i in range(12):
    a=i*math.pi/6;ball('Clock index',3.15+math.sin(a)*.14,2.14+math.cos(a)*.14,-2.72,.006,white)
rod('Clock hour',(3.15,2.14,-2.72),(3.09,2.20,-2.72),.006,white)
rod('Clock minute',(3.15,2.14,-2.72),(3.15,2.26,-2.72),.006,white)

group('07 Tables and chairs')
def table(name,x,z,w,d,h=.75):
    box(name+' oak top',x,h,z,w,.043,d,oak,.014)
    for a in [-1,1]:
        for b in [-1,1]:box(name+' steel leg',x+a*(w/2-.12),h/2,z+b*(d/2-.12),.045,h-.04,.045,dark,.004)
    solid(name,x,z,w,d)

def chair(name,x,z,turn=0,child=False):
    s=.70 if child else 1;H=.46*s;m=lime if child else black
    def part(a,h,c,w,hh,d,mat):return box(name,x+(a*math.cos(turn)+c*math.sin(turn))*s,h*s,z+(-a*math.sin(turn)+c*math.cos(turn))*s,w*s,hh*s,d*s,mat,.018*s,turn)
    part(0,.46,0,.43,.06,.42,m)
    part(0,.75,.19,.42,.49,.065,m)
    if not child:
        for h in [.62,.73,.84,.95]:part(0,h,.151,.38,.006,.006,dark)
    for a in [-.175,.175]:
        for c in [-.155,.155]:
            part(a,.235,c,.024,.43,.024,white if child else dark)
    solid(name,x,z,.44*s,.44*s)
for z in [.90,2.70]:table('Joined dining table',3.08,z,.97,1.78)
for z in [.20,.81,1.42,2.03,2.64,3.25]:
    chair('Black dining chair',2.27,z,-math.pi/2)
    chair('Black dining chair',3.89,z,math.pi/2)
chair('End dining chair',3.08,3.87,0)
# Small green chairs and a separate child-height table behind the main table.
for x in [1.66,2.95]:table('Children table',x,-1.21,1.27,.62,.55)
for x in [1.22,1.84,2.48,3.12,3.64]:
    chair('Green child chair',x,-.64,0,True)
    chair('Green child chair',x,-1.80,math.pi,True)

group('08 Dining wall details')
# Two small landscape frames on the brick wall, visible at 4-6s in June 17.
for x,h in [(-3.0,2.12),(-1.0,2.31)]:
    box('Dark landscape frame',x,h,-4.74,.66,.37,.055,dark,.007)
    box('Landscape mount',x,h,-4.706,.57,.28,.012,ivory,.002)
    box('Landscape sky',x,h+.035,-4.696,.51,.15,.008,blue,.001)
    box('Landscape distant land',x,h-.035,-4.685,.51,.04,.008,leaf,.001)
    box('Landscape water',x,h-.077,-4.679,.51,.045,.008,mint,.001)
box('Sage door frame',1.25,1.08,4.76,.94,2.16,.07,dark,.008)
box('Door frosted pane',1.25,1.32,4.705,.76,1.50,.025,window)
tube('Door pull',[(1.53,.92,4.66),(1.59,.98,4.62),(1.59,1.21,4.62),(1.53,1.27,4.66)],.014,steel)
box('High window surround',3.1,2.58,4.76,2.45,.52,.12,white)
box('High window glass',3.1,2.58,4.689,2.32,.39,.02,window)
for x in [2.37,3.12,3.87]:box('High window frame',x,2.58,4.667,.035,.43,.035,white,.002)
box('Recessed wall niche',3.20,1.41,4.764,.83,1.33,.035,taupe)
box('Niche sill',3.20,.77,4.62,.9,.07,.34,white)
for x in [2.97,3.43]:box('Niche speaker',x,.89,4.61,.15,.22,.12,dark,.009)
for x in [2.06,3.28,4.01]:
    rod('Plant pot',(x,2.35,4.51),(x,2.55,4.51),.105,ivory,.14)
    for i in range(7):
        a=i*2.4;tip=(x+.19*math.cos(a),2.56+random.random()*.20,4.51+.14*math.sin(a))
        tube('Plant stem',[(x,2.49,4.51),tip],.004,leaf)
        ball('Plant leaf',*tip,.068,leaf,(1,.22,.55))

group('09 Light fittings')
for x in [-2.5,2.7]:
    for z in [-3,-.3,2.9]:
        box('Fluorescent casing',x,3.027,z,.11,.055,1.18,white,.013)
        for a in [-.025,.025]:rod('Fluorescent tube',(x+a,2.99,z-.54),(x+a,2.99,z+.54),.014,lamp)
for x in [1.1,2.45,3.8]:
    rod('Kitchen wall spot',(x,2.6,-2.75),(x,2.53,-2.61),.038,steel)
    ball('Spot diffuser',x,2.515,-2.60,.031,lamp)

# Render lighting is kept editable in the .blend. The browser uses its own
# lightweight daylight rig, with ambient occlusion stored in mesh colours.
group('10 Lighting and cameras')
def area(name,at,target,energy,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size
    o=bpy.data.objects.new(name,data);collection.objects.link(o);o.location=P(at);o.rotation_euler=(P(target)-o.location).to_track_quat('-Z','Y').to_euler()
for z in [-2.6,3]:area('Window daylight',(-4.57,2.30,z),(1,.5,z),450,3)
for x,z in [(-2,-2),(2.8,.8)]:area('Ceiling fill',(x,2.92,z),(x,0,z),180,3)
def camera(name,at,target,lens=21):
    data=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,data);collection.objects.link(o);o.location=P(at);o.rotation_euler=(P(target)-o.location).to_track_quat('-Z','Y').to_euler();data.lens=lens;return o
cameras=[camera('Entrance overview',(-3.45,1.60,3.4),(-.9,1.2,-2.3)),camera('Play corner',(-3.65,1.62,.95),(-1.6,1.1,-3.5)),camera('Kitchen view',(4.45,1.60,3.85),(2.4,1.2,-2.3)),camera('Reverse view',(-2.8,1.6,-3.7),(.1,1.25,3.3))]
scene.camera=cameras[0]
scene.render.resolution_x=1440;scene.render.resolution_y=1000;scene.render.resolution_percentage=100

# Pack assets and preserve each editable object and bevel modifier in the source.
for image in bpy.data.images:
    if image.source=='FILE':image.pack()
scene['Source']='ROOM Jurmala supplied photo/video reconstruction; see blender/README.md'
scene['Survey status']='Approximate dimensions. No measured floor plan supplied.'
scene['Reference layout']='June empty-room tour, play and dining configuration'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/room-jurmala.blend'),compress=True)

# Convert/export a web copy, with evaluated bevels and meshes grouped by material.
export_objects=[]
deps=bpy.context.evaluated_depsgraph_get()
for o in list(scene.objects):
    if o.type not in {'MESH','CURVE'}:continue
    mesh=bpy.data.meshes.new_from_object(o.evaluated_get(deps))
    new=bpy.data.objects.new(o.name+' web',mesh);scene.collection.objects.link(new);new.matrix_world=o.matrix_world.copy()
    export_objects.append(new);o.hide_render=True;o.hide_set(True)
# Bake conservative floor/wall contact shading into vertex colour. This is
# geometry-derived ambient occlusion, not a substitute for measured lighting.
for o in export_objects:
    attr=o.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for poly in o.data.polygons:
        normal=(o.matrix_world.to_3x3()@poly.normal).normalized()
        for li in poly.loop_indices:
            p=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co
            X,Y,Z=p.x,p.z,-p.y
            # Crease shading near floor and walls, restrained to retain whites.
            contact=.12*math.exp(-max(0,Y)*7)
            wall=.07*math.exp(-max(0,min(5-abs(X),4.8-abs(Z)))*6)
            shade=max(.72,1-contact-wall-(.04 if normal.z<-.5 else 0))
            attr.data[li].color=(shade,shade,shade,1)
bpy.ops.object.select_all(action='DESELECT')
for o in export_objects:o.select_set(True)
bpy.context.view_layer.objects.active=export_objects[0]
bpy.ops.object.join()
web=bpy.context.object;web.name='ROOM_Jurmala_Blender'
bpy.ops.export_scene.gltf(filepath=str(OUT/'room-jurmala.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_cameras=False,export_lights=False,export_extras=True,export_image_format='JPEG',export_jpeg_quality=87,export_vertex_color='ACTIVE',export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
(OUT/'room-layout.json').write_text(json.dumps({'bounds':{'minX':-4.58,'maxX':4.72,'minZ':-4.52,'maxZ':4.52},'obstacles':colliders,'source':'blender/build_room.py','approximate':True},indent=2)+'\n')
print('ROOM_EXPORT',len(export_objects),'source objects',len(web.data.polygons),'web polygons',len(colliders),'colliders',flush=True)
# Restore original scene for previews; exported mesh is an implementation detail.
web.hide_render=True
for o in scene.objects:
    if o!=web and o.type in {'MESH','CURVE'}:o.hide_render=False
if '--renders' in sys.argv:
    for i,cam in enumerate(cameras):
        scene.camera=cam;scene.render.filepath=str(ROOT/f'blender/preview-{i+1}.jpg');scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=90
        bpy.ops.render.render(write_still=True)
