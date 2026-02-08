import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, ContactShadows, Grid } from '@react-three/drei';
import Table3D from './Table3D';

export default function Stage3D({ tables, tablePos }) {
  return (
    <div className="w-full h-full bg-slate-900 absolute top-0 left-0 z-0">
      <Canvas shadows camera={{ position: [0, 20, 25], fov: 45 }}>
        {/* --- ENVIRONMENT --- */}
        <Sky sunPosition={[100, 20, 100]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
        />

        {/* --- FLOOR & GRID --- */}
        <Grid position={[0, 0.01, 0]} args={[100, 100]} cellSize={2} cellThickness={1} cellColor="#cbd5e1" sectionSize={10} sectionThickness={1.5} sectionColor="#94a3b8" fadeDistance={50} infiniteGrid />
        
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.8} />
        </mesh>
        
        <ContactShadows opacity={0.5} scale={40} blur={2} far={4} resolution={256} color="#000000" />

        {/* --- RENDER TABLES --- */}
        {Object.keys(tables).map((tableId) => {
          const config = tablePos[tableId];
          if (!config) return null;
          return (
            <Table3D 
              key={tableId} 
              id={tableId} 
              config={config} 
            />
          );
        })}

        {/* --- NAVIGATION (User Story 1.2) --- */}
        <OrbitControls 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2.1} // Prevents camera going underground
          minDistance={5}
          maxDistance={60}
        />
      </Canvas>
    </div>
  );
}