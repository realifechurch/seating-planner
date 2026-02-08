import React, { useMemo, useState } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// --- COLOR MAPPING (Story 2.3) ---
// Maps the string group names to Hex colors for 3D materials
const GROUP_COLORS = {
  'Family': '#fb7185', // Rose
  'Friends': '#fdba74', // Orange
  'Work': '#38bdf8',    // Sky
  'VIP': '#fcd34d',     // Amber
  'Kids': '#34d399',    // Emerald
  'None': '#cbd5e1',    // Slate (Default)
  'Empty': '#f1f5f9'    // Light Slate (Unoccupied)
};

// --- SUB-COMPONENT: CHAIR ---
const Chair = ({ x, z, rotation, guest }) => {
  const [hovered, setHover] = useState(false);

  // Determine Color based on Group (Story 2.3)
  const cushionColor = guest 
    ? (GROUP_COLORS[guest.group] || GROUP_COLORS['None']) 
    : GROUP_COLORS['Empty'];

  return (
    <group 
      position={[x, 0, z]} 
      rotation={[0, rotation, 0]}
      // Hover Interaction (Story 2.3 - Tooltip trigger)
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { setHover(false); document.body.style.cursor = 'auto'; }}
      // slight scale up on hover for feedback
      scale={hovered ? 1.1 : 1} 
    >
      {/* Seat Cushion (Color Coded) */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.5, 0.1, 0.5]} />
        <meshStandardMaterial color={cushionColor} roughness={0.5} />
      </mesh>
      
      {/* Backrest (Color Coded) */}
      <mesh position={[0, 0.8, -0.23]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.05]} />
        <meshStandardMaterial color={cushionColor} roughness={0.5} />
      </mesh>

      {/* Legs (Standard Wood/Metal) */}
      <mesh position={[-0.2, 0.25, -0.2]}> <cylinderGeometry args={[0.04, 0.04, 0.5]} /> <meshStandardMaterial color="#64748b" /> </mesh>
      <mesh position={[0.2, 0.25, -0.2]}> <cylinderGeometry args={[0.04, 0.04, 0.5]} /> <meshStandardMaterial color="#64748b" /> </mesh>
      <mesh position={[-0.2, 0.25, 0.2]}> <cylinderGeometry args={[0.04, 0.04, 0.5]} /> <meshStandardMaterial color="#64748b" /> </mesh>
      <mesh position={[0.2, 0.25, 0.2]}> <cylinderGeometry args={[0.04, 0.04, 0.5]} /> <meshStandardMaterial color="#64748b" /> </mesh>

      {/* Floating Name Tooltip (Story 2.3) */}
      {guest && (
        <group position={[0, 1.8, 0]}>
          {/* We show the text if hovered OR if it's just standard view. 
              To make it strictly a "Tooltip" (only on hover), change visible={true} to visible={hovered} 
              However, for planning, always visible + highlight on hover is usually better UX. */}
          <Text
            fontSize={hovered ? 0.35 : 0.25} // Grow text on hover
            color="#0f172a"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.03}
            outlineColor="white"
            rotation={[0, -rotation, 0]} // Billboard effect (face camera relative to chair)
            visible={true} 
          >
            {guest.name}
          </Text>
          {/* Optional: Group Label below name on hover */}
          {hovered && (
             <Text
                position={[0, -0.3, 0]}
                fontSize={0.15}
                color="#64748b"
                anchorX="center"
                anchorY="top"
                rotation={[0, -rotation, 0]}
             >
                {guest.group}
             </Text>
          )}
        </group>
      )}
    </group>
  );
};

export default function Table3D({ config, id, seated }) {
  // --- STORY 2.1: Dynamic Table Generation ---
  // Scale mapping
  const x = (config.x - 50) * 0.4; 
  const z = (config.y - 50) * 0.4; 
  const width = (config.width || 10) * 0.25; 
  const depth = (config.height || config.width || 10) * 0.25;
  const tableHeight = 0.8;

  // --- STORY 2.2: Chair Visualization ---
  const chairs = useMemo(() => {
    const items = [];
    const capacity = Math.max(1, config.capacity || 8);
    const guests = seated || [];

    // CIRCLE LOGIC
    if (config.shape === 'circle') {
      const radius = (width / 2) + 0.6;
      for (let i = 0; i < capacity; i++) {
        const angle = (i / capacity) * Math.PI * 2;
        items.push({
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          rotation: -angle + Math.PI / 2, // Faces Center
          guest: guests[i]
        });
      }
    } 
    // RECTANGLE LOGIC (Perimeter Walk)
    else {
      const perimeter = (width + depth) * 2;
      const spacing = perimeter / capacity;
      let currentDist = 0;

      for (let i = 0; i < capacity; i++) {
        let cx = 0, cz = 0, rot = 0;

        if (currentDist < width) { // Top
            cx = (currentDist - width / 2); cz = -(depth / 2) - 0.6; rot = 0;
        } else if (currentDist < width + depth) { // Right
            const sideDist = currentDist - width;
            cx = (width / 2) + 0.6; cz = (sideDist - depth / 2); rot = -Math.PI / 2;
        } else if (currentDist < (width * 2) + depth) { // Bottom
            const sideDist = currentDist - (width + depth);
            cx = (width / 2) - sideDist; cz = (depth / 2) + 0.6; rot = Math.PI;
        } else { // Left
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
      <Text position={[0, 2.5, 0]} fontSize={0.8} color="#0f172a" anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="white">
        {`T-${id}`}
      </Text>

      {/* --- STORY 2.1: Distinct Material (White Cloth) --- */}
      <mesh position={[0, tableHeight, 0]} castShadow receiveShadow>
        {config.shape === 'circle' ? (
          <cylinderGeometry args={[width / 2, width / 2, 0.05, 64]} />
        ) : (
          <boxGeometry args={[width, 0.05, depth]} />
        )}
        {/* White Tablecloth Texture */}
        <meshStandardMaterial color="#ffffff" roughness={0.9} metalness={0.0} />
      </mesh>

      {/* Central Pillar */}
      <mesh position={[0, tableHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, tableHeight, 16]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.05, 16]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* --- STORY 2.2 & 2.3: Chairs with Guests --- */}
      {chairs.map((chair, i) => (
        <Chair key={i} {...chair} />
      ))}
    </group>
  );
}