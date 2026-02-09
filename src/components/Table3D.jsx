import React, { useMemo, useState } from 'react';
import { Html } from '@react-three/drei';

// --- COLOR MAPPING ---
const GROUP_COLORS = {
  'Family': '#fb7185',
  'Friends': '#fdba74',
  'Work': '#38bdf8',
  'VIP': '#fcd34d',
  'Kids': '#34d399',
  'None': '#cbd5e1',
  'Empty': '#f1f5f9'
};

// --- CHAIR COMPONENT ---
const Chair = ({ x, z, rotation, guest }) => {
  const [hovered, setHover] = useState(false);
  
  // Safe guest check
  const guestGroup = guest && typeof guest === 'object' ? guest.group : 'None';
  const guestName = guest && typeof guest === 'object' ? guest.name : (typeof guest === 'string' ? guest : null);

  const cushionColor = guestName 
    ? (GROUP_COLORS[guestGroup] || GROUP_COLORS['None']) 
    : GROUP_COLORS['Empty'];

  return (
    <group 
      position={[x, 0, z]} 
      rotation={[0, rotation, 0]}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { setHover(false); document.body.style.cursor = 'auto'; }}
      scale={hovered ? 1.1 : 1} 
    >
      {/* Seat Cushion */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.5, 0.1, 0.5]} />
        <meshStandardMaterial color={cushionColor} roughness={0.5} />
      </mesh>
      
      {/* Backrest */}
      <mesh position={[0, 0.8, -0.23]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.05]} />
        <meshStandardMaterial color={cushionColor} roughness={0.5} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.2, 0.25, -0.2]}> <cylinderGeometry args={[0.04, 0.04, 0.5]} /> <meshStandardMaterial color="#64748b" /> </mesh>
      <mesh position={[0.2, 0.25, -0.2]}> <cylinderGeometry args={[0.04, 0.04, 0.5]} /> <meshStandardMaterial color="#64748b" /> </mesh>
      <mesh position={[-0.2, 0.25, 0.2]}> <cylinderGeometry args={[0.04, 0.04, 0.5]} /> <meshStandardMaterial color="#64748b" /> </mesh>
      <mesh position={[0.2, 0.25, 0.2]}> <cylinderGeometry args={[0.04, 0.04, 0.5]} /> <meshStandardMaterial color="#64748b" /> </mesh>

      {/* --- HTML OVERLAY FOR NAMES --- */}
      {guestName && (
        <Html 
            position={[0, 1.5, 0]} 
            center 
            transform 
            sprite 
            distanceFactor={7} 
            zIndexRange={[100, 0]}
        >
            <div className="bg-white/95 px-2 py-1 rounded-md shadow-lg border border-slate-200 backdrop-blur-sm flex items-center gap-2 select-none pointer-events-none">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cushionColor }}></div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-800 whitespace-nowrap leading-tight">{guestName}</span>
                </div>
            </div>
        </Html>
      )}
    </group>
  );
};

// --- TABLE COMPONENT ---
export default function Table3D({ config, id, seated }) {
  // Mapping logic
  const x = (config.x - 50) * 0.4; 
  const z = (config.y - 50) * 0.4; 
  const width = (config.width || 10) * 0.25; 
  const depth = (config.height || config.width || 10) * 0.25;
  const tableHeight = 0.8;

  // Chair Logic
  const chairs = useMemo(() => {
    const items = [];
    const capacity = Math.max(1, config.capacity || 8);
    const guests = seated || [];

    if (config.shape === 'circle') {
      const radius = (width / 2) + 0.6;
      for (let i = 0; i < capacity; i++) {
        const angle = (i / capacity) * Math.PI * 2;
        items.push({
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          rotation: -angle + Math.PI / 2, 
          guest: guests[i]
        });
      }
    } else {
      const perimeter = (width + depth) * 2;
      const spacing = perimeter / capacity;
      let currentDist = 0;

      for (let i = 0; i < capacity; i++) {
        let cx = 0, cz = 0, rot = 0;
        if (currentDist < width) { 
            cx = (currentDist - width / 2); cz = -(depth / 2) - 0.6; rot = 0;
        } else if (currentDist < width + depth) { 
            const sideDist = currentDist - width;
            cx = (width / 2) + 0.6; cz = (sideDist - depth / 2); rot = -Math.PI / 2;
        } else if (currentDist < (width * 2) + depth) { 
            const sideDist = currentDist - (width + depth);
            cx = (width / 2) - sideDist; cz = (depth / 2) + 0.6; rot = Math.PI;
        } else { 
            const sideDist = currentDist - ((width * 2) + depth);
            cx = -(width / 2) - 0.6; cz = (depth / 2) - sideDist; rot = Math.PI / 2;
        }
        items.push({ x: cx, z: cz, rotation: rot, guest: guests[i] });
        currentDist += spacing;
      }
    }
    return items;
  }, [config, width, depth, seated]);

  return (
    <group position={[x, 0, z]}>
      {/* Table Label */}
      <Html position={[0, 2.5, 0]} center distanceFactor={10}>
        <div className="text-slate-800 font-bold text-xs bg-white/80 px-2 rounded-full border border-slate-200">
            T-{id}
        </div>
      </Html>

      {/* Table Mesh */}
      <mesh position={[0, tableHeight, 0]} castShadow receiveShadow>
        {config.shape === 'circle' ? (
          <cylinderGeometry args={[width / 2, width / 2, 0.05, 64]} />
        ) : (
          <boxGeometry args={[width, 0.05, depth]} />
        )}
        <meshStandardMaterial color="#ffffff" roughness={0.9} metalness={0.0} />
      </mesh>

      <mesh position={[0, tableHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, tableHeight, 16]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.05, 16]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Chairs */}
      {chairs.map((chair, i) => (
        <Chair key={i} {...chair} />
      ))}
    </group>
  );
}