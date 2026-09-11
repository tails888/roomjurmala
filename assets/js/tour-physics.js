export const bounds={minX:-4.72,maxX:4.72,minZ:-6.22,maxZ:6.22};
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
  {x:-.8,z:5.3,yaw:-.03,pitch:-.08},
  {x:-.9,z:-1.85,yaw:.5,pitch:-.2},
  {x:1.15,z:4.7,yaw:-.45,pitch:-.16},
  {x:3.7,z:-3.05,yaw:.12,pitch:-.15},
];
