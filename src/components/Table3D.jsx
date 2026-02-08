import React, { useMemo } from 'react';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';

export default function Table3D({ config, id, seated }) {
  // --- 1. BETTER SCALING MATH ---
  // We double the multiplier (0.2 instead of 0.08) to match the 2D visual weight
  const x = (config.x - 50) * 0.4; 
  const z = (config.y - 50) * 0.4; 

  // Make tables wider and lower
  const width = (config.width || 10) * 0.25; 
  const depth = (config.height || config.width || 10) * 0.25;
  const tableHeight = 0.8; // Standard dining height (lower than before)

  // --- 2. CHAIR GENERATION LOGIC ---
  const chairs = useMemo(() => {
    const items = [];
    const capacity = config.capacity || 8;
    const guestList = seated || [];

    // Calculate Chair Positions
    for (let i = 0; i < capacity; i++) {
      const guest = guestList[i];
      let chairX = 0;
      let chairZ = 0;
      let rotation = 0;

      if (config.shape === 'circle') {
        // Circular arrangement
        const angle = (i / capacity) * Math.PI * 2;
        const radius = (width / 2) + 0.6; // Distance from center
        chairX = Math.cos(angle) * radius;
        chairZ = Math.sin(angle) * radius;
        rotation = -angle + Math.PI / 2; // Face center
      } else {
        // Rectangular arrangement (simplified perimeter distribution)
        const perimeter = (width + depth) * 2;
        const posOnPerimeter = (perimeter / capacity) * i;
        
        // Basic box-mapping logic (distribute along 4 sides)
        if (posOnPerimeter < width) { // Top side
             chairX = (posOnPerimeter - width/2); chairZ = -depth/2 - 0.6; rotation = 0;
        } else if (posOnPerimeter < width + depth) { // Right side
             chairX = width/2 + 0.6; chairZ = (posOnPerimeter - width - depth/2); rotation = -Math.PI/2;
        } else if (posOnPerimeter < (width * 2) + depth) { // Bottom side
             chairX = (width/2 - (posOnPerimeter - width - depth)); chairZ = depth/2 + 0.6; rotation = Math.PI;
        } else { // Left side
             chairX = -width/2 - 0.6; chairZ = (depth/2 - (posOnPerimeter - width*2 - depth)); rotation = Math.PI/2;
        }
      }

      items.push({ x: chairX, z: chairZ, rotation, guest });
    }
    return items;
  }, [config, width, depth, seated]);

  return (
    <group position={[x, 0, z]}>
      {/* --- TABLE IDENTIFIER --- */}
      <Text 
        position={[0, 3.5, 0]} 
        fontSize={0.8} 
        color="#0f172a" 
        anchorX="center" 
        anchorY="middle"
        outlineWidth={0.04}
        outlineColor="white"
      >
        {`Table ${id}`}
      </Text>

      {/* --- TABLE TOP --- */}
      <mesh position={[0, tableHeight, 0]} castShadow receiveShadow>
        {config.shape === 'circle' ? (
          <cylinderGeometry args={[width/2, width/2, 0.08, 64]} />
        ) : (
          <boxGeometry args={[width, 0.08, depth]} />
        )}
        <meshStandardMaterial color="white" roughness={0.2} metalness={0.1} />
      </mesh>

      {/* --- TABLE LEG (Thicker & Lower) --- */}
      <mesh position={[0, tableHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, tableHeight, 16]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.05, 16]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* --- CHAIRS & NAMES --- */}
      {chairs.map((chair, index) => (
        <group key={index} position={[chair.x, 0, chair.z]} rotation={[0, chair.rotation, 0]}>
          {/* Chair Seat */}
          <mesh position={[0, 0.5, 0]} castShadow>
             <boxGeometry args={[0.5, 0.1, 0.5]} />
             <meshStandardMaterial color={chair.guest ? "#6366f1" : "#cbd5e1"} /> {/* Blue if occupied */}
          </mesh>
          {/* Chair Back */}
          <mesh position={[0, 0.8, -0.23]} castShadow>
             <boxGeometry args={[0.5, 0.6, 0.05]} />
             <meshStandardMaterial color={chair.guest ? "#6366f1" : "#cbd5e1"} />
          </mesh>
          {/* Chair Legs */}
          <mesh position={[-0.2, 0.25, -0.2]}> <cylinderGeometry args={[0.04, 0.04, 0.5]} /> <meshStandardMaterial color="#64748b" /> </mesh>
          <mesh position={[0.2, 0.25, -0.2]}> <cylinderGeometry args={[0.04, 0.04, 0.5]} /> <meshStandardMaterial color="#64748b" /> </mesh>
          <mesh position={[-0.2, 0.25, 0.2]}> <cylinderGeometry args={[0.04, 0.04, 0.5]} /> <meshStandardMaterial color="#64748b" /> </mesh>
          <mesh position={[0.2, 0.25, 0.2]}> <cylinderGeometry args={[0.04, 0.04, 0.5]} /> <meshStandardMaterial color="#64748b" /> </mesh>

          {/* GUEST NAME (Billboarded HTML Text) */}
          {chair.guest && (
            <group position={[0, 1.8, 0]}>
                 {/* 3D Text Label - Rotated to be readable */}
                 <Text 
                    fontSize={0.25} 
                    color="black" 
                    outlineWidth={0.02} 
                    outlineColor="white"
                    anchorX="center"
                    anchorY="bottom"
                    rotation={[0, -chair.rotation, 0]} // Counter-rotate so text always faces mostly front
                 >
                    {chair.guest.name}
                 </Text>
            </group>
          )}
        </group>
      ))}
    </group>
  );
}