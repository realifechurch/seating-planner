import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, ContactShadows, Grid, Environment } from '@react-three/drei';
import Table3D from './Table3D';

export default function Stage3D({ tables, tablePos }) {
  return (
    <div className="w-full h-full bg-slate-900 absolute top-0 left-0 z-0">
      <Canvas shadows camera={{ position: [0, 40, 40], fov: 45 }}>
        {/* --- LIGHTING --- */}
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.7} />
        <directionalLight 
          position={[50, 50, 25]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
        />
        <Environment preset="city" />

        {/* --- FIX 2: Z-FIGHTING PREVENTION --- */}
        {/* The Grid stays at 0.01 */}
        <Grid position={[0, 0.01, 0]} args={[100, 100]} cellSize={5} cellThickness={1} cellColor="#94a3b8" sectionSize={25} sectionThickness={1.5} sectionColor="#64748b" fadeDistance={80} infiniteGrid />
        
        {/* The Solid Floor is moved DOWN to -0.1. This gap stops the flashing. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} />
        </mesh>
        
        <ContactShadows opacity={0.4} scale={50} blur={2} far={4} resolution={512} color="#000000" />

        {/* --- DYNAMIC TABLES --- */}
        {Object.keys(tables).map((tableId) => {
          const config = tablePos[tableId];
          const guests = tables[tableId] || [];

          if (!config) return null;
          
          return (
            <Table3D 
              key={tableId} 
              id={tableId} 
              config={config} 
              seated={guests}
            />
          );
        })}

        <OrbitControls 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2.2} 
          minDistance={10}
          maxDistance={100}
        />
      </Canvas>
    </div>
  );
}