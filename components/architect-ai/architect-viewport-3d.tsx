"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, SoftShadows, ContactShadows, Environment } from "@react-three/drei";
import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "@/lib/architect-ai/bim-types";
import { BuildingScene, SunLighting } from "./building-scene";

type ArchitectViewport3DProps = {
  schema: ArchitecturalSchema | null;
  materialsById: Map<string, ArchitecturalLibraryRow>;
};

function SceneContent({ schema, materialsById }: ArchitectViewport3DProps) {
  return (
    <>
      <color attach="background" args={["#050a12"]} />
      <fog attach="fog" args={["#050a12", 18, 52]} />
      <SoftShadows size={32} samples={18} focus={0.45} />
      <SunLighting />
      <BuildingScene schema={schema} materialsById={materialsById} />
      <ContactShadows opacity={0.35} scale={36} blur={2.2} far={28} position={[0, 0.02, 0]} />
      <Suspense fallback={null}>
        <Environment preset="city" environmentIntensity={0.55} />
      </Suspense>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.06}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2 - 0.04}
        maxDistance={42}
        minDistance={4}
      />
    </>
  );
}

export function ArchitectViewport3D({ schema, materialsById }: ArchitectViewport3DProps) {
  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-lg border border-slate-700/80 bg-[#050a12]">
      <Canvas
        shadows
        gl={{ antialias: true, preserveDrawingBuffer: true, alpha: false }}
        camera={{ position: [11, 9, 11], fov: 42 }}
      >
        <Suspense fallback={null}>
          <SceneContent schema={schema} materialsById={materialsById} />
        </Suspense>
      </Canvas>
    </div>
  );
}
