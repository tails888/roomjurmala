"""Deterministic tileable material maps, no external texture dependencies."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
out=Path(__file__).resolve().parents[1]/'assets/tour'
rng=np.random.default_rng(27)
n=1024
y,x=np.mgrid[:n,:n]/n
def save(name,base,grain):
    rgb=np.clip(np.array(base)[None,None,:]+grain[:,:,None],0,255).astype('uint8')
    Image.fromarray(rgb).save(out/name,quality=91,optimize=True)
grain=np.zeros((n,n))
for width,height,strength in [(24,8,.28),(140,14,.12),(640,26,.06)]:
    noise=Image.fromarray(rng.integers(55,200,(height,width),dtype='uint8')).resize((n,n),Image.Resampling.BICUBIC)
    grain+=(np.asarray(noise).astype(float)-128)*strength
# Uneven long fibres and a small knot, without repeated uniform stripes.
drift=(np.sin(y*6.283)*8+np.sin(y*18.85)*3).astype(int)
grain=np.take_along_axis(grain,(np.arange(n)[None,:]+drift)%n,axis=1)
r=np.sqrt(((x-.31)*1.4)**2+((y-.57)*.19)**2)
grain+=np.sin(r*880)*np.exp(-r*32)*5
grain+=rng.normal(0,1.4,(n,n))
save('oak.jpg',[171,139,102],grain)
grain=rng.normal(0,9,(n,n))+np.sin(x*6.283*256)*2+np.sin(y*6.283*256)*2
save('carpet.jpg',[138,136,131],grain)
small=Image.fromarray(rng.integers(80,180,(32,32),dtype='uint8')).resize((n,n),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(12))
grain=(np.asarray(small).astype(float)-128)*.065+rng.normal(0,1.2,(n,n))
save('vinyl.jpg',[183,185,176],grain)
