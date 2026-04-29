"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { CanvasTexture, RepeatWrapping } from "three";
import type { DirectionalLight, Texture } from "three";
import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "@/lib/architect-ai/bim-types";
import type { ArchitectFurnitureItem } from "@/lib/architect-ai/ollamaArchitect";

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
  furniture: ArchitectFurnitureItem[];
};

function makeTexture(kind: "wood" | "concrete" | "metal" | "plaster"): Texture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  if (!ctx) return new CanvasTexture(c);

  if (kind === "wood") {
    ctx.fillStyle = "#7c522f";
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 30; i += 1) {
      ctx.strokeStyle = i % 2 === 0 ? "rgba(96, 57, 22, 0.35)" : "rgba(150, 97, 45, 0.32)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, i * 9);
      ctx.bezierCurveTo(48, i * 9 + 5, 180, i * 9 - 4, 256, i * 9 + 2);
      ctx.stroke();
    }
  } else if (kind === "concrete") {
    ctx.fillStyle = "#7a7a80";
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 1200; i += 1) {
      const x = Math.random() * c.width;
      const y = Math.random() * c.height;
      const s = Math.random() * 1.7;
      ctx.fillStyle = `rgba(${120 + Math.random() * 45}, ${120 + Math.random() * 45}, ${120 + Math.random() * 45}, 0.35)`;
      ctx.fillRect(x, y, s, s);
    }
  } else if (kind === "metal") {
    const g = ctx.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, "#cbd5e1");
    g.addColorStop(1, "#94a3b8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 14; i += 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, i * 20);
      ctx.lineTo(256, i * 20 + 12);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 900; i += 1) {
      const x = Math.random() * c.width;
      const y = Math.random() * c.height;
      const s = Math.random() * 1.2;
      ctx.fillStyle = "rgba(226,232,240,0.5)";
      ctx.fillRect(x, y, s, s);
    }
  }
  const texture = new CanvasTexture(c);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

export function BuildingScene({ schema, materialsById, furniture }: BuildingSceneProps) {
  const textureSet = useMemo(
    () => ({
      wood: makeTexture("wood"),
      concrete: makeTexture("concrete"),
      metal: makeTexture("metal"),
      plaster: makeTexture("plaster"),
    }),
    []
  );
  const walls = useMemo(() => {
    if (!schema) return [];
    return schema.structure.walls
      .filter(
        (w) =>
          Number.isFinite(w.x1) &&
          Number.isFinite(w.x2) &&
          Number.isFinite(w.z1) &&
          Number.isFinite(w.z2) &&
          Number.isFinite(w.thickness_m)
      )
      .map((w) => {
      const dx = w.x2 - w.x1;
      const dz = w.z2 - w.z1;
      const len = Math.max(0.01, Math.hypot(dx, dz));
      const cx = (w.x1 + w.x2) / 2;
      const cz = (w.z1 + w.z2) / 2;
      const angle = Math.atan2(dx, dz);
      const mat = materialsById.get(w.material_ref_id);
      const pbr = pbrFor(mat?.material_family ?? "other");
      const texture =
        mat?.material_family === "wood"
          ? textureSet.wood
          : mat?.material_family === "metal"
            ? textureSet.metal
            : mat?.material_family === "concrete"
              ? textureSet.concrete
              : textureSet.plaster;
      return { id: w.id, cx, cz, len, h: 2.5, th: Math.max(0.05, w.thickness_m), angle, texture, ...pbr };
    });
  }, [materialsById, schema, textureSet]);

  const center = useMemo(() => {
    if (!walls.length) return { x: 0, z: 0 };
    const xs = walls.flatMap((w) => [w.cx - w.len / 2, w.cx + w.len / 2]);
    const zs = walls.flatMap((w) => [w.cz - 0.5, w.cz + 0.5]);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 };
  }, [walls]);

  return (
    <group position={[-center.x, 0, -center.z]}>
      <gridHelper args={[30, 30, "#334155", "#1e293b"]} position={[0, 0.01, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[48, 48]} />
        <meshStandardMaterial color="#101827" roughness={0.94} metalness={0.03} />
      </mesh>
      {walls.map((w) => (
        <mesh key={w.id} castShadow receiveShadow position={[w.cx, w.h / 2, w.cz]} rotation={[0, w.angle, 0]}>
          <boxGeometry args={[w.th, w.h, w.len]} />
          <meshStandardMaterial
            color={w.color}
            map={w.texture}
            roughness={w.roughness}
            metalness={w.metalness}
            envMapIntensity={0.6}
          />
        </mesh>
      ))}
      {furniture.map((item) => (
        <mesh key={item.id} castShadow receiveShadow position={[item.x, Math.max(0.1, item.height_m) / 2, item.z]}>
          <boxGeometry args={[Math.max(0.2, item.width_m), Math.max(0.2, item.height_m), Math.max(0.2, item.depth_m)]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.55} metalness={0.15} />
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
