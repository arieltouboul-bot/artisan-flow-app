"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { DirectionalLight } from "three";
import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "@/lib/architect-ai/bim-types";

function pbrFor(family: ArchitecturalLibraryRow["material_family"]) {
  switch (family) {
    case "wood":
      return { color: "#6b4423", roughness: 0.82, metalness: 0.05 };
    case "concrete":
      return { color: "#6b6b6f", roughness: 0.92, metalness: 0.08 };
    case "metal":
      return { color: "#94a3b8", roughness: 0.35, metalness: 0.75 };
    case "glass":
      return { color: "#a5d8ff", roughness: 0.08, metalness: 0.15 };
    case "ceramic":
      return { color: "#e8e4dc", roughness: 0.45, metalness: 0.12 };
    default:
      return { color: "#64748b", roughness: 0.75, metalness: 0.2 };
  }
}

type BuildingSceneProps = {
  schema: ArchitecturalSchema | null;
  materialsById: Map<string, ArchitecturalLibraryRow>;
};

export function BuildingScene({ schema, materialsById }: BuildingSceneProps) {
  const walls = useMemo(() => {
    if (!schema) return [];
    return schema.structure.walls.map((w) => {
      const dx = w.x2 - w.x1;
      const dz = w.z2 - w.z1;
      const len = Math.max(0.01, Math.hypot(dx, dz));
      const cx = (w.x1 + w.x2) / 2;
      const cz = (w.z1 + w.z2) / 2;
      const angle = Math.atan2(dx, dz);
      const mat = materialsById.get(w.material_ref_id);
      const pbr = pbrFor(mat?.material_family ?? "other");
      return { id: w.id, cx, cz, len, h: w.height_m, th: w.thickness_m, angle, ...pbr };
    });
  }, [schema, materialsById]);

  const center = useMemo(() => {
    if (!walls.length) return { x: 0, z: 0 };
    const xs = walls.flatMap((w) => [w.cx - w.len / 2, w.cx + w.len / 2]);
    const zs = walls.flatMap((w) => [w.cz - 0.5, w.cz + 0.5]);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 };
  }, [walls]);

  return (
    <group position={[-center.x, 0, -center.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[48, 48]} />
        <meshStandardMaterial color="#0f172a" roughness={0.95} metalness={0.05} />
      </mesh>
      {walls.map((w) => (
        <mesh key={w.id} castShadow receiveShadow position={[w.cx, w.h / 2, w.cz]} rotation={[0, w.angle, 0]}>
          <boxGeometry args={[w.th, w.h, w.len]} />
          <meshStandardMaterial color={w.color} roughness={w.roughness} metalness={w.metalness} envMapIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/** Lumière « soleil » + remplissage doux, ombres douces (map 2k). */
export function SunLighting() {
  const dirRef = useRef<DirectionalLight>(null);
  useLayoutEffect(() => {
    const L = dirRef.current;
    if (!L?.shadow?.mapSize) return;
    L.shadow.mapSize.set(2048, 2048);
    L.shadow.bias = -0.00025;
    L.shadow.camera.near = 0.5;
    L.shadow.camera.far = 60;
    L.shadow.camera.left = -18;
    L.shadow.camera.right = 18;
    L.shadow.camera.top = 18;
    L.shadow.camera.bottom = -18;
  }, []);
  return (
    <>
      <ambientLight intensity={0.22} color="#b8d4ff" />
      <hemisphereLight args={["#87a7c7", "#1e293b", 0.35]} position={[0, 20, 0]} />
      <directionalLight
        ref={dirRef}
        castShadow
        position={[14, 22, 10]}
        intensity={1.25}
        color="#fff8e7"
      />
    </>
  );
}
