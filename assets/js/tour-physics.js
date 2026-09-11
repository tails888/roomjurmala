export const bounds={minX:-4.58,maxX:4.72,minZ:-4.52,maxZ:4.52};
export const playerRadius=.23;
export function canStand(x,z,obstacles){
  if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return false;
  return !obstacles.some(b=>{
    const nearX=Math.max(b.minX,Math.min(x,b.maxX));
    const nearZ=Math.max(b.minZ,Math.min(z,b.maxZ));
    return (x-nearX)**2+(z-nearZ)**2<playerRadius**2;
  });
}
export function movePlayer(position,dx,dz,obstacles){
  // Substeps prevent tunnelling through furniture even after a slow frame.
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.09));
  for(let i=0;i<steps;i++){
    if(canStand(position.x+dx/steps,position.z,obstacles))position.x+=dx/steps;
    if(canStand(position.x,position.z+dz/steps,obstacles))position.z+=dz/steps;
  }
  return position;
}
export const stops=[
  {x:-3.45,z:3.4,yaw:-.42,pitch:-.04},
  {x:-2.7,z:.92,yaw:-.20,pitch:-.12},
  {x:1.4,z:3.5,yaw:-.62,pitch:-.09},
  {x:4.65,z:-.8,yaw:.73,pitch:-.10},
];
