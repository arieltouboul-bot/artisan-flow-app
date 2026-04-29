"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, SoftShadows, ContactShadows, Environment } from "@react-three/drei";
import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "@/lib/architect-ai/bim-types";
import type { ArchitectFurnitureItem } from "@/lib/architect-ai/ollamaArchitect";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import { BuildingScene, SunLighting } from "./building-scene";

type ArchitectViewport3DProps = {
  schema: ArchitecturalSchema | null;
  materialsById: Map<string, ArchitecturalLibraryRow>;
  furniture: ArchitectFurnitureItem[];
};

type ErrorBoundaryProps = { children: React.ReactNode; fallbackText: string };
type ErrorBoundaryState = { hasError: boolean };

class ViewportErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[architect.3d] render failed", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/80 text-sm text-slate-400">
          {this.props.fallbackText}
        </div>
      );
    }
    return this.props.children;
  }
}

function SceneContent({ schema, materialsById, furniture }: ArchitectViewport3DProps) {
  return (
    <>
      <color attach="background" args={["#050a12"]} />
      <fog attach="fog" args={["#050a12", 18, 52]} />
      <SoftShadows size={32} samples={18} focus={0.45} />
      <SunLighting />
      <BuildingScene schema={schema} materialsById={materialsById} furniture={furniture} />
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

export function ArchitectViewport3D({ schema, materialsById, furniture }: ArchitectViewport3DProps) {
  const { language } = useLanguage();
  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-lg border border-slate-700/80 bg-[#050a12]">
      <ViewportErrorBoundary fallbackText={t("architect3dFallback", language)}>
        <Canvas
          orthographic
          shadows
          gl={{ antialias: true, preserveDrawingBuffer: true, alpha: false }}
          camera={{ position: [12, 12, 12], zoom: 52 }}
        >
          <Suspense fallback={null}>
            <SceneContent schema={schema} materialsById={materialsById} furniture={furniture} />
          </Suspense>
        </Canvas>
      </ViewportErrorBoundary>
    </div>
  );
}
