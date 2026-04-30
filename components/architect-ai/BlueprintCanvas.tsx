"use client";

type WallLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  id: string;
  internal?: boolean;
};

type ZoneShape = {
  id: string;
  points: string;
  secure: boolean;
  floor: "beton_poli" | "dalle_technique" | "carrelage_anti_derapant" | "resine";
  type: "piece" | "circulation" | "technique" | "exterieur";
  label: string;
};

type FurnitureShape = { id: string; x: number; y: number; w: number; h: number; label: string };
type OpeningShape = { x: number; y: number; type: "porte" | "fenetre" | "baie"; id: string; r: number };
type DimText = { x: number; y: number; t: string };

type BlueprintCanvasProps = {
  viewBox: string;
  zones: ZoneShape[];
  rooms?: Array<{ id: string; name: string; x: number; y: number; width: number; height: number; floor_material: string }>;
  lines: WallLine[];
  openings: OpeningShape[];
  furnitureRects: FurnitureShape[];
  dims: DimText[];
};

function applyFloorPatterns(zones: ZoneShape[]) {
  return zones.map((z) => {
    const floorPattern = z.type === "technique" || z.floor === "dalle_technique" ? "url(#zone-floor-technique)" : "url(#zone-floor-beton)";
    return (
      <g key={z.id}>
        <polygon points={z.points} fill={floorPattern} />
        {z.secure ? <polygon points={z.points} fill="url(#zone-hatch-secure)" /> : null}
      </g>
    );
  });
}

function drawInternalWalls(lines: WallLine[]) {
  return lines
    .filter((ln) => ln.internal)
    .map((ln) => <line key={`int-${ln.id}`} x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} stroke="#cbd5e1" strokeWidth={3} strokeDasharray="6 4" />);
}

function drawFurniture(furnitureRects: FurnitureShape[]) {
  return furnitureRects.map((f) => (
    <g key={f.id}>
      <rect x={f.x - f.w / 2} y={f.y - f.h / 2} width={f.w} height={f.h} fill="#f59e0b33" stroke="#fbbf24" strokeWidth="1" rx="2" />
      <text x={f.x} y={f.y} fill="#fde68a" fontSize="10" textAnchor="middle" fontFamily="Inter, Arial, sans-serif">
        {f.label}
      </text>
    </g>
  ));
}

export function BlueprintCanvas({ viewBox, zones, rooms = [], lines, openings, furnitureRects, dims }: BlueprintCanvasProps) {
  const roomPolygons: ZoneShape[] =
    rooms.length > 0
      ? rooms.map((r) => ({
          id: `room-${r.id}`,
          label: r.name,
          secure: /sas|safe/i.test(r.name),
          type: r.name.toLowerCase().includes("tech") ? "technique" : "piece",
          floor:
            r.floor_material === "dalle_technique"
              ? "dalle_technique"
              : r.floor_material === "carrelage_anti_derapant"
                ? "carrelage_anti_derapant"
                : "beton_poli",
          points: `${r.x},${r.y} ${r.x + r.width},${r.y} ${r.x + r.width},${r.y + r.height} ${r.x},${r.y + r.height}`,
        }))
      : zones;
  return (
    <svg viewBox={viewBox} className="h-full w-full text-sky-200/90">
      <defs>
        <pattern id="bp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e3a5f" strokeWidth="0.5" opacity="0.6" />
        </pattern>
        <pattern id="bp-grid-mm" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.4" opacity="0.6" />
        </pattern>
        <pattern id="zone-hatch-secure" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="#1f2937" opacity="0.28" />
          <line x1="0" y1="0" x2="0" y2="10" stroke="#ef4444" strokeWidth="1" opacity="0.55" />
        </pattern>
        <pattern id="zone-floor-beton" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#94a3b81f" />
          <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#94a3b85a" strokeWidth="0.6" />
        </pattern>
        <pattern id="zone-floor-technique" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#a3e63566" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bp-grid-mm)" />
      <rect width="100%" height="100%" fill="url(#bp-grid)" />
      {applyFloorPatterns(roomPolygons)}
      {lines.map((ln) => (
        <line key={ln.id} x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} stroke="#38bdf8" strokeWidth={ln.internal ? 3 : 6} strokeLinecap="square" />
      ))}
      {drawInternalWalls(lines)}
      {openings.map((o) => (
        <g key={o.id}>
          {o.type === "porte" ? (
            <>
              <circle cx={o.x} cy={o.y} r={o.r} fill="none" stroke="#bef264" strokeWidth="1.5" />
              <path d={`M ${o.x} ${o.y} L ${o.x + o.r} ${o.y - o.r}`} stroke="#bef264" strokeWidth="1.5" />
            </>
          ) : (
            <rect x={o.x - o.r} y={o.y - 2} width={o.r * 2} height={4} fill="#93c5fd" />
          )}
        </g>
      ))}
      {drawFurniture(furnitureRects)}
      {dims.map((d, i) => (
        <text key={i} x={d.x} y={d.y} fill="#cbd5e1" fontSize="11" textAnchor="middle" fontFamily="Inter, Arial, sans-serif">
          {d.t}
        </text>
      ))}
      {roomPolygons.map((z) => {
        const firstPoint = z.points.split(" ")[0];
        const [x, y] = firstPoint.split(",").map(Number);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return (
          <text key={`label-${z.id}`} x={x + 10} y={y + 14} fill="#e2e8f0" fontSize="10" fontFamily="Inter, Arial, sans-serif">
            {z.label}
          </text>
        );
      })}
    </svg>
  );
}
