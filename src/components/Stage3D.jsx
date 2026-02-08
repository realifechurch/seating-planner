import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, ContactShadows } from '@react-three/drei';
import Table3D from './Table3D';

export default function Stage3D({ tables, tablePos }) {
  return (
    <div className="w-full h-full bg-slate-900 absolute top-0 left-0 z-0">
      <Canvas shadows camera={{ position: [0, 15, 25], fov: 45 }}>
        {/* --- 1. ENVIRONMENT --- */}
        <Sky sunPosition={[100, 20, 100]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
        />

        {/* --- 2. THE FLOOR --- */}
        {/* We use a large plane to catch shadows */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
        </mesh>
        
        {/* Contact Shadows make objects look "grounded" */}
        <ContactShadows opacity={0.6} scale={40} blur={2} far={4} resolution={256} color="#000000" />

        {/* --- 3. THE FURNITURE --- */}
        {Object.keys(tables).map((tableId) => {
          const config = tablePos[tableId];
          // Only render if it's a valid table
          if (!config) return null;
          return (
            <Table3D 
              key={tableId} 
              id={tableId} 
              config={config} 
            />
          );
        })}

        {/* --- 4. CONTROLS (Story 1.2) --- */}
        {/* maxPolarAngle limits the camera so you can't go under the floor */}
        <OrbitControls 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2.1} 
          minDistance={5}
          maxDistance={50}
        />
      </Canvas>
    </div>
  );
}