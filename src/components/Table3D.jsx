import React from 'react';
import { Text } from '@react-three/drei';

export default function Table3D({ config, id }) {
  // --- 1. GEOMETRY MAPPING (The Math) ---
  // 2D X (0 to 100)  -> 3D X (-50 to 50)
  const x = (config.x - 50) * 0.2; 
  // 2D Y (0 to 100)  -> 3D Z (-50 to 50) - In 3D, Z is depth!
  const z = (config.y - 50) * 0.2; 

  // Scale dimensions relative to world
  const width = (config.width || 10) * 0.08;
  const depth = (config.height || config.width || 10) * 0.08;
  
  // Height of a standard table
  const tableHeight = 1.2; 

  return (
    <group position={[x, 0, z]}>
      {/* --- Floating Label --- */}
      <Text 
        position={[0, 2.5, 0]} 
        fontSize={0.5} 
        color="#334155" 
        anchorX="center" 
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="white"
      >
        {`T-${id}`}
      </Text>

      {/* --- The Table Top --- */}
      <mesh position={[0, tableHeight, 0]} castShadow receiveShadow>
        {config.shape === 'circle' ? (
          // Cylinder for Circle Tables
          <cylinderGeometry args={[width/2, width/2, 0.1, 32]} />
        ) : (
          // Box for Rect/Square Tables
          <boxGeometry args={[width, 0.1, depth]} />
        )}
        <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.1} />
      </mesh>

      {/* --- The Leg (Simplified Central Pillar) --- */}
      <mesh position={[0, tableHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, tableHeight, 8]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* --- The Base --- */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.1, 16]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
    </group>
  );
}