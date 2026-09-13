import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import MiningVessel from "@/components/space/scene/MiningVessel";

const ShipPreviewTmp = () => (
  <div className="fixed inset-0 bg-black">
    <Canvas camera={{ position: [6, 2.5, 7], fov: 45 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 8, 6]} intensity={2.4} />
      <Suspense fallback={null}>
        <MiningVessel animate={false} throttle={0.4} crew={false} scale={1} />
        <Environment>
          <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} />
          <Lightformer intensity={1} color="#8bb" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
        </Environment>
      </Suspense>
      <OrbitControls />
    </Canvas>
  </div>
);

export default ShipPreviewTmp;
