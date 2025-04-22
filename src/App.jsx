import { useControls, folder } from 'leva';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import GpuClothGeomPerFiber from './components/ClothGPUGeomPerPly';
import GpuClothTubesPerPly from './components/ClothTubeShader';
import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';

export default function App() {
  const {
    renderMode,
  } = useControls({
    Render: folder({
      renderMode: {
        label: 'Renderizar como',
        options: {
          Line: 'line',
          Tube: 'tube'
        },
        value: 'tube'
      },
    }),
  });


  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }} gl={{ version: 2 }}>
        <OrbitControls />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />  
        {renderMode === 'tube' && (
          <GpuClothTubesPerPly
          />
        )}
        {renderMode === 'line' && (
          <GpuClothGeomPerFiber />
        )}
      </Canvas>
    </div>
  );
}