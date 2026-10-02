import * as THREE from "three";

export const KM_PER_UNIT = 1_000_000;
export const FIXED_STEP_SECONDS = 2;
export const MAX_SUBSTEPS = 12;
export const SOFTENING_KM = 250;
export const VISUAL_RADIUS_REFERENCE_KM = 2_439.7;
export const VISUAL_RADIUS_K = 0.34;

export interface CelestialBodyData {
  id: string; name: string; massKg: number; radiusKm: number; muKm3S2: number;
  semiMajorKm: number; periodDays: number; axialTiltDeg: number; rotationHours: number;
  surfaceGravity: number; collisionRadiusKm: number; phase: number; texture: string;
  source: string; ring?: { innerKm: number; outerKm: number; tiltDeg: number };
}

export const CELESTIAL_BODIES: CelestialBodyData[] = [
  { id:"mercury",name:"Mercury",massKg:3.3011e23,radiusKm:2439.7,muKm3S2:22031.86855,semiMajorKm:57.909e6,periodDays:87.969,axialTiltDeg:0.034,rotationHours:1407.6,surfaceGravity:3.70,collisionRadiusKm:2439.7,phase:0.2,texture:"Mercury",source:"https://science.nasa.gov/mercury/facts/" },
  { id:"venus",name:"Venus",massKg:4.8675e24,radiusKm:6051.8,muKm3S2:324858.592,semiMajorKm:108.210e6,periodDays:224.701,axialTiltDeg:177.36,rotationHours:-5832.5,surfaceGravity:8.87,collisionRadiusKm:6051.8,phase:1.0,texture:"Venus",source:"https://science.nasa.gov/venus/facts/" },
  { id:"earth",name:"Earth",massKg:5.97237e24,radiusKm:6371,muKm3S2:398600.4355,semiMajorKm:149.598e6,periodDays:365.256,axialTiltDeg:23.44,rotationHours:23.934,surfaceGravity:9.81,collisionRadiusKm:6371,phase:1.9,texture:"Earth",source:"https://science.nasa.gov/earth/facts/" },
  { id:"mars",name:"Mars",massKg:6.4171e23,radiusKm:3389.5,muKm3S2:42828.3752,semiMajorKm:227.956e6,periodDays:686.98,axialTiltDeg:25.19,rotationHours:24.623,surfaceGravity:3.71,collisionRadiusKm:3389.5,phase:2.7,texture:"Mars",source:"https://science.nasa.gov/mars/facts/" },
  { id:"jupiter",name:"Jupiter",massKg:1.8982e27,radiusKm:69911,muKm3S2:126686534,semiMajorKm:778.479e6,periodDays:4332.59,axialTiltDeg:3.13,rotationHours:9.925,surfaceGravity:24.79,collisionRadiusKm:69911,phase:3.5,texture:"Jupiter",source:"https://science.nasa.gov/jupiter/facts/" },
  { id:"saturn",name:"Saturn",massKg:5.6834e26,radiusKm:58232,muKm3S2:37931187,semiMajorKm:1433.53e6,periodDays:10759.22,axialTiltDeg:26.73,rotationHours:10.7,surfaceGravity:10.44,collisionRadiusKm:58232,phase:4.15,texture:"Saturn",source:"https://science.nasa.gov/saturn/facts/",ring:{innerKm:74500,outerKm:140220,tiltDeg:26.73} },
  { id:"uranus",name:"Uranus",massKg:8.681e25,radiusKm:25362,muKm3S2:5793939,semiMajorKm:2872.46e6,periodDays:30688.5,axialTiltDeg:97.77,rotationHours:-17.24,surfaceGravity:8.69,collisionRadiusKm:25362,phase:5.0,texture:"Uranus",source:"https://science.nasa.gov/uranus/facts/" },
  { id:"neptune",name:"Neptune",massKg:1.02413e26,radiusKm:24622,muKm3S2:6836529,semiMajorKm:4495.06e6,periodDays:60182,axialTiltDeg:28.32,rotationHours:16.11,surfaceGravity:11.15,collisionRadiusKm:24622,phase:5.7,texture:"Neptune",source:"https://science.nasa.gov/neptune/facts/" },
];

export const SUN = { id:"sun",name:"Sun",massKg:1.98847e30,radiusKm:695700,muKm3S2:132712440018,collisionRadiusKm:695700,source:"https://science.nasa.gov/sun/facts/" };

export interface DynamicBody { position: THREE.Vector3; velocity: THREE.Vector3; massKg: number; collisionRadiusKm: number; }
export interface ShipState extends DynamicBody { angularVelocity: THREE.Vector3; fuelKg: number; damage: number; }
export interface PhysicsInput { thrust: THREE.Vector3; brake: boolean; orbitAssistBody?: CelestialBodyData; }
export interface Impact { bodyId: string; speedKmS: number; severity: "minor"|"major"; direction: THREE.Vector3; }

export const visualRadius = (radiusKm:number) => VISUAL_RADIUS_K * Math.cbrt(radiusKm / VISUAL_RADIUS_REFERENCE_KM);
export const visualOrbitRadius = (km:number) => 3.4 + 7.1 * Math.log10(1 + km / 40_000_000);
export const bodyPositionAt = (body:CelestialBodyData, timeSeconds:number) => {
  const angle = body.phase + timeSeconds / (body.periodDays * 86400) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(angle)*body.semiMajorKm, 0, Math.sin(angle)*body.semiMajorKm);
};
export const bodyVelocityAt = (body:CelestialBodyData, timeSeconds:number) => {
  const angle = body.phase + timeSeconds / (body.periodDays * 86400) * Math.PI * 2;
  const omega = Math.PI * 2 / (body.periodDays * 86400);
  return new THREE.Vector3(-Math.sin(angle)*body.semiMajorKm*omega,0,Math.cos(angle)*body.semiMajorKm*omega);
};

export function softenedGravity(position:THREE.Vector3, timeSeconds:number) {
  const acceleration = new THREE.Vector3();
  const sources = [{ id:SUN.id, mu:SUN.muKm3S2, position:new THREE.Vector3() }, ...CELESTIAL_BODIES.map(body=>({id:body.id,mu:body.muKm3S2,position:bodyPositionAt(body,timeSeconds)}))];
  let closest = sources[0].id; let closestDistance = Infinity;
  for (const source of sources) {
    const delta = source.position.clone().sub(position); const r2 = delta.lengthSq(); const r = Math.sqrt(r2);
    if (r < closestDistance) { closestDistance = r; closest = source.id; }
    if (r > 0) acceleration.addScaledVector(delta.normalize(), source.mu / (r2 + SOFTENING_KM*SOFTENING_KM));
  }
  return { acceleration, closest, closestDistance };
}

export function orbitAssistVelocity(body:CelestialBodyData, shipPosition:THREE.Vector3, timeSeconds:number) {
  const center = bodyPositionAt(body,timeSeconds); const radial = shipPosition.clone().sub(center);
  const radius = Math.max(radial.length(), body.collisionRadiusKm + 20);
  const tangent = new THREE.Vector3(-radial.z, 0, radial.x).normalize();
  return bodyVelocityAt(body,timeSeconds).addScaledVector(tangent, Math.sqrt(body.muKm3S2 / Math.sqrt(radius*radius + SOFTENING_KM*SOFTENING_KM)));
}

export function sweptSphereHit(start:THREE.Vector3,end:THREE.Vector3,center:THREE.Vector3,radius:number) {
  const segment=end.clone().sub(start); const length2=segment.lengthSq();
  const t=length2===0?0:THREE.MathUtils.clamp(center.clone().sub(start).dot(segment)/length2,0,1);
  const closest=start.clone().addScaledVector(segment,t); const normal=closest.clone().sub(center);
  const hit=normal.lengthSq()<=radius*radius;
  return { hit,t,normal:normal.lengthSq()>0?normal.normalize():new THREE.Vector3(1,0,0) };
}

export function saturnRingHit(start:THREE.Vector3,end:THREE.Vector3,saturnPosition:THREE.Vector3,ring:NonNullable<CelestialBodyData["ring"]>) {
  const localStart=start.clone().sub(saturnPosition); const localEnd=end.clone().sub(saturnPosition);
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(-ring.tiltDeg),0,0));
  localStart.applyQuaternion(q); localEnd.applyQuaternion(q); const dy=localEnd.y-localStart.y;
  if (Math.abs(dy)<1e-9) return {hit:false,t:0};
  const t=-localStart.y/dy; if(t<0||t>1)return {hit:false,t};
  const p=localStart.lerp(localEnd,t); const radial=Math.hypot(p.x,p.z);
  return {hit:radial>=ring.innerKm&&radial<=ring.outerKm,t};
}

export function canDock(relativeSpeedKmS:number,distanceKm:number,zoneRadiusKm:number){ return relativeSpeedKmS<=0.08&&distanceKm<=zoneRadiusKm; }

export function stepShip(ship:ShipState,input:PhysicsInput,dt:number,timeSeconds:number):Impact|null {
  const previous=ship.position.clone();
  if(input.orbitAssistBody) ship.velocity.lerp(orbitAssistVelocity(input.orbitAssistBody,ship.position,timeSeconds),1-Math.exp(-0.8*dt));
  const thrust=input.thrust.clone(); const thrustMagnitude=Math.min(thrust.length(),1);
  if(thrustMagnitude>0&&ship.fuelKg>0){ const burn=Math.min(ship.fuelKg,thrustMagnitude*0.32*dt); ship.fuelKg-=burn; ship.velocity.addScaledVector(thrust.normalize(),0.014*dt); }
  if(input.brake) ship.velocity.multiplyScalar(Math.exp(-0.08*dt));
  ship.velocity.addScaledVector(softenedGravity(ship.position,timeSeconds).acceleration,dt);
  ship.position.addScaledVector(ship.velocity,dt);
  for(const body of CELESTIAL_BODIES){ const center=bodyPositionAt(body,timeSeconds+dt); const hit=sweptSphereHit(previous,ship.position,center,body.collisionRadiusKm+ship.collisionRadiusKm); if(hit.hit){ const speed=Math.abs(ship.velocity.dot(hit.normal)); ship.position.copy(center).addScaledVector(hit.normal,body.collisionRadiusKm+ship.collisionRadiusKm+1); ship.velocity.reflect(hit.normal).multiplyScalar(speed<0.15?0.32:0.08); ship.damage=Math.min(100,ship.damage+(speed<0.15?4:speed*18)); return {bodyId:body.id,speedKmS:speed,severity:speed<0.45?"minor":"major",direction:hit.normal}; } if(body.ring&&saturnRingHit(previous,ship.position,center,body.ring).hit){ const speed=Math.abs(ship.velocity.y); ship.velocity.y*=-0.2; ship.damage=Math.min(100,ship.damage+(speed<0.15?3:speed*14)); return {bodyId:"saturn-rings",speedKmS:speed,severity:speed<0.45?"minor":"major",direction:new THREE.Vector3(0,1,0)}; }}
  return null;
}

export function runFixedSteps(accumulator:number,frameSeconds:number,speed:number,step:(dt:number)=>void){ let next=accumulator+Math.min(frameSeconds,0.05)*speed; let steps=0; while(next>=FIXED_STEP_SECONDS&&steps<MAX_SUBSTEPS){step(FIXED_STEP_SECONDS);next-=FIXED_STEP_SECONDS;steps++;} if(steps===MAX_SUBSTEPS)next=0; return {accumulator:next,steps}; }
