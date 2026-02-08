import React, { useMemo, useState } from 'react';
import { Text, Billboard } from '@react-three/drei'; // Added Billboard
import * as THREE from 'three';

// --- COLOR MAPPING ---
const GROUP_COLORS = {
  'Family': '#fb7185', // Rose
  'Friends': '#fdba74', // Orange
  'Work': '#38bdf8',    // Sky
  'VIP': '#fcd34d',     // Amber
  'Kids': '#34d399',    // Emerald
  'None': '#cbd5e1',    // Slate
  'Empty': '#f1f5f9'    // Light Slate
};

// --- SUB-COMPONENT: CHAIR ---
const Chair = ({ x, z, rotation, guest }) => {
  const [hovered, setHover] = useState(false);

  const cushionColor = guest 
    ? (GROUP_COLORS[guest.group] || GROUP_COLORS['None']) 
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

      {/* --- NAME CARD (BILLBOARD) --- */}
      {/* This wrapper forces the content to always face the camera */}
      {guest && (
        <Billboard
          position={[0, 1.8, 0]} // Float above chair
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
        >
            {/* The White Card Background */}
            <mesh position={[0, 0, -0.02]}>
                <planeGeometry args={[1.2, 0.4]} />
                <meshBasicMaterial color="white" side={THREE.DoubleSide} />
                <lineSegments>
                    <edgesGeometry args={[new THREE.PlaneGeometry(1.2, 0.4)]} />
                    <lineBasicMaterial color="#cbd5e1" />
                </lineSegments>
            </mesh>

            {/* The Name Text */}
            <Text
                fontSize={0.2}
                color="#0f172a"
                anchorX="center"
                anchorY="middle"
                maxWidth={1.1}
                overflowWrap="break-word"
            >
                {guest.name}
            </Text>
            
            {/* Small Group Indicator Dot */}
            <mesh position={[-0.5, 0, 0.01]}>
                <circleGeometry args={[0.05, 16]} />
                <meshBasicMaterial color={cushionColor} />
            </mesh>
        </Billboard>
      )}
    </group>
  );
};

export default function Table3D({ config, id, seated }) {
  // Mapping
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
      <Billboard position={[0, 2.5, 0]}>
        <Text fontSize={0.8} color="#0f172a" anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="white">
            {`T-${id}`}
        </Text>
      </Billboard>

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