import * as THREE from 'three';
import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import tubePerPlyVertexShader from '../shaders/tubePerPlyVertexShader.glsl';
import tubePerPlyFragmentShader from '../shaders/tubePerPlyFragmentShader.glsl';

import fragmentShaderByPly from '../shaders/clothFragmentColorByPly.glsl'
import fragmentShaderByFiberType from '../shaders/tubePerPlyFragmentShader.glsl'
import fragmentShaderByColor from '../shaders/clothFragmentColor.glsl'
import fragmentShaderPeriod from '../shaders/clothFragmentColorPeriod.glsl'


const fragmentShadersByType = {
    colorByPly: fragmentShaderByPly,
    byFiberType: fragmentShaderByFiberType,
    periodFiber: fragmentShaderPeriod,
    color: fragmentShaderByColor
};

const FIBER_SETTINGS = {
    fiberCount: { min: 1, max: 64 },
    fiberTwistRate: { min: 0, max: 10 },
    fiberRadiusMin: { min: 0.001, max: 0.1 },
    fiberRadiusMax: { min: 0.001, max: 0.1 },
    ellipseCos: { min: 1.0, max: 2.0 },
    ellipseSin: { min: 1.0, max: 2.0 },
    migrationFrequency: { min: 0, max: 30 },
    hairWiggleFrequency: { min: 0.5, max: 10 },
    hairWiggleStrength: { min: 0.0, max: 1.5 }
  };
  

function createCurveTexture2D(curves) {
    const allPoints = [];
  
    for (const curve of curves) {
      for (const [x, y, z] of curve.points) {
        allPoints.push(x, y, z, 1.0);
      }
    }
  
    const totalPoints = allPoints.length / 4;
  
    const texWidth = 512;
    const texHeight = Math.ceil(totalPoints / texWidth);
  
    // Preencher com zeros até completar texWidth * texHeight
    while (allPoints.length < texWidth * texHeight * 4) {
      allPoints.push(0, 0, 0, 1);
    }
  
    const texture = new THREE.DataTexture(
      new Float32Array(allPoints),
      texWidth,
      texHeight,
      THREE.RGBAFormat,
      THREE.FloatType
    );
  
    texture.needsUpdate = true;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
  
    return {
      texture,
      totalPoints,
      texWidth,
      texHeight
    };
  }
  
//Each fiber can have three types
//Migration -> Distance to ply center varies between Rmin and Rmax
//Loop -> Replace Rmax por RloopMax
//Hair -> Have open ends
function getFiberType(ply, totalPlies) {
    // ex: 70% migration, 20% loop, 10% hair
    const ratio = ply / totalPlies;
    if (ratio < 0.7) return 0;       // migration
    else if (ratio < 0.9) return 1;  // loop
    else return 2;                   // hair
}
function getRandomFiberType() {
    const ratio = Math.random()
    if (ratio < 0.5) return 0;       // migration
    else if (ratio < 0.8) return 1;  // loop
    else return 2;                   // hair
}

function oscillate(uTime, min, max, period = 10) {
    const t = (uTime % period) / period;
    const angle = t * 2 * Math.PI;
    const mid = (min + max) / 2;
    const amp = (max - min) / 2;
    return mid + amp * Math.sin(angle);
  }
  

export default function GpuClothTubesPerPly() {
  const [meshes, setMeshes] = useState(null);
  const [geometries, setGeometries] = useState([])
    
  const {
    shaderType,
    useCustomShader,
    modelJson,
    visiblePly
  } = useControls('Render (local)', {
    shaderType: {
      options: {
        colorByPly: 'colorByPly',
        byFiberType: 'byFiberType',
        periodFiber: 'periodFiber',
        color: 'color'
      },
      value: 'colorByPly'
    },
    useCustomShader: { value: true },
    modelJson: {
      options: {
        thread: '1_thread.json',
        fiber: 'fiber.json'
      },
      value: '1_thread.json'
    },
    visiblePly: { value: -1, min: -1, max: 19, step: 1 }
  });

    const {
        fiberCount,
        fiberTwistRate,
        fiberRadiusMin,
        fiberRadiusMax,
        ellipseSin,
        ellipseCos,
        migrationFrequency,
        hairWiggleFrequency,
        hairWiggleStrength
    
  } = useControls('Fiber', {
        fiberCount: { value: 6, min: FIBER_SETTINGS.fiberCount.min, max: FIBER_SETTINGS.fiberCount.max, step: 1 },
        fiberTwistRate: { value: 1, min: FIBER_SETTINGS.fiberTwistRate.min, max: FIBER_SETTINGS.fiberTwistRate.max, step: 1.0 },
        fiberRadiusMin: { value: 0.01, min: FIBER_SETTINGS.fiberRadiusMin.min, max: FIBER_SETTINGS.fiberRadiusMin.max, step: 0.001 },
        fiberRadiusMax: { value: 0.03, min: FIBER_SETTINGS.fiberRadiusMax.min, max: FIBER_SETTINGS.fiberRadiusMax.max, step: 0.001 },
        ellipseCos: { value: 1.0, min: FIBER_SETTINGS.ellipseCos.min, max: FIBER_SETTINGS.ellipseCos.max, step: 0.01 },
        ellipseSin: { value: 1.0, min: FIBER_SETTINGS.ellipseSin.min, max: FIBER_SETTINGS.ellipseSin.max, step: 0.01 },
        migrationFrequency: { value: 4, min: FIBER_SETTINGS.migrationFrequency.min, max: FIBER_SETTINGS.migrationFrequency.max, step: 0.1 },
        hairWiggleFrequency: { value: 5.0, min: FIBER_SETTINGS.hairWiggleFrequency.min, max: FIBER_SETTINGS.hairWiggleFrequency.max, step: 0.1 },
        hairWiggleStrength: { value: 0.7, min: FIBER_SETTINGS.hairWiggleStrength.min, max: FIBER_SETTINGS.hairWiggleStrength.max, step: 0.01 }
    });
    
  const { coreRadius } = useControls('Tube Settings', {
    coreRadius: { value: 0.005, min: 0.0, max: 1.0, step: 0.001 }
  });
    
    const {
    animationPeriod,
    animateRadiusMax,
    animateRadiusMin,
    animateTwist,
    animateWiggleStrength,
    animateMigrationFreq
  } = useControls('Animate', {
    animationPeriod: {value: 10, min: 2, max: 20},
    animateRadiusMax: false,
    animateRadiusMin: false,
    animateTwist: false,
    animateWiggleStrength: false,
    animateMigrationFreq: false
  });
    
    
    useFrame((state) => {
        const t = state.clock.getElapsedTime();


        if (animateRadiusMax) {
            material.uniforms.uFiberRadiusMax.value = oscillate(t, FIBER_SETTINGS.fiberRadiusMax.min, FIBER_SETTINGS.fiberRadiusMax.max, animationPeriod);
        }
        if (animateRadiusMin) {
            material.uniforms.uFiberRadiusMin.value = oscillate(t, FIBER_SETTINGS.fiberRadiusMin.min, FIBER_SETTINGS.fiberRadiusMin.max, animationPeriod);
        }
        if (animateTwist) {
            material.uniforms.uTwistRate.value = oscillate(t, FIBER_SETTINGS.fiberTwistRate.min + 0.5, FIBER_SETTINGS.fiberTwistRate.max, animationPeriod);
        }
        if (animateWiggleStrength) {
            material.uniforms.uWiggleStrength.value = oscillate(t, FIBER_SETTINGS.hairWiggleStrength.min, FIBER_SETTINGS.hairWiggleStrength.max, animationPeriod);
        }
        if (animateMigrationFreq) {
            material.uniforms.uMigrationFrequency.value = oscillate(t, FIBER_SETTINGS.migrationFrequency.min, FIBER_SETTINGS.migrationFrequency.max, animationPeriod);
        }
    });
    
  useEffect(() => {
    const load = async () => {
      const res = await fetch('/data/' + modelJson);
      const data = await res.json();
      const curves = data.curves;
      const resolution = curves[0].points.length;
      const radialSegments = 16;

      const { texture: curveTexture, totalPoints, texWidth, texHeight } = createCurveTexture2D(curves);
      const newGeometries = [];
      const group = [];
      let curveOffset = 0;
      for (let ply = 0; ply < fiberCount; ply++) {
        const positions = [];
        const aCurveT = [];
        const aRadialT = [];
        const aPlyIndex = [];
        const aCurveIndex = [];
        const enableRandomFiberType = true;
        const fiberType = enableRandomFiberType ? getRandomFiberType() : getFiberType(ply, fiberCount);
        const aFiberTypeArray = new Array(resolution * radialSegments).fill(fiberType);
        const indices = [];

        for (let i = 0; i < resolution; i++) {
          for (let j = 0; j < radialSegments; j++) {
            positions.push(0, 0, 0); // placeholder
            aCurveT.push(i / (resolution - 1));
            aRadialT.push(j / radialSegments);
            aPlyIndex.push(ply);
            aCurveIndex.push(i + curveOffset);
          }
        }

        for (let i = 0; i < resolution - 1; i++) {
          for (let j = 0; j < radialSegments; j++) {
            const a = i * radialSegments + j;
            const b = i * radialSegments + (j + 1) % radialSegments;
            const c = (i + 1) * radialSegments + j;
            const d = (i + 1) * radialSegments + (j + 1) % radialSegments;
            indices.push(a, b, d, a, d, c);
          }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('aCurveT', new THREE.Float32BufferAttribute(aCurveT, 1));
        geometry.setAttribute('aRadialT', new THREE.Float32BufferAttribute(aRadialT, 1));
        geometry.setAttribute('aPlyIndex', new THREE.Float32BufferAttribute(aPlyIndex, 1));
        geometry.setAttribute('aCurveIndex', new THREE.Float32BufferAttribute(aCurveIndex, 1));
        geometry.setAttribute('aFiberType', new THREE.Float32BufferAttribute(aFiberTypeArray, 1));
        geometry.setIndex(indices);

        newGeometries.push({
          geometry,
          curveTexture,
          totalPoints,
          texWidth,
          texHeight
        });
      }

      setGeometries(newGeometries);
    };

    load();
  }, [fiberCount, modelJson]);

  const material = useMemo(() => {
    const fragmentShader = fragmentShadersByType[shaderType] ?? fragmentColorByPly;
  
    return new THREE.ShaderMaterial({
      vertexShader: tubePerPlyVertexShader,
      fragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uFiberRadiusMax: { value: fiberRadiusMax },
            uFiberRadiusMin: { value: fiberRadiusMin },
            uTwistRate: { value: fiberTwistRate },
            uFiberCount: { value: fiberCount },
            uCoreRadius: { value: coreRadius },
            uCurveTex: { value: null },
            uCurveTexSize: { value: 0 },
            uCurveTexWidth: { value: 0 },
            uCurveTexHeight: { value: 0 },
            uEllipseCos: { value: ellipseCos },
            uEllipseSin: { value: ellipseSin },
            uMigrationFrequency: { value: migrationFrequency },
            uWiggleFrequency: { value: hairWiggleFrequency },
            uWiggleStrength: {value: hairWiggleStrength}
      }
    });
  }, [shaderType,
      fiberRadiusMin,
      fiberRadiusMax,
      fiberTwistRate,
      fiberCount,
      coreRadius,
      ellipseCos,
      ellipseSin,
      migrationFrequency,
      hairWiggleFrequency,
      hairWiggleStrength]);
    
    
  if (!geometries.length) return null;
  return (
    <group>
      {geometries.map((data, i) => {
        // Atualiza textura específica por mesh
        material.uniforms.uCurveTex.value = data.curveTexture;
        material.uniforms.uCurveTexSize.value = data.totalPoints;
        material.uniforms.uCurveTexWidth.value = data.texWidth;
        material.uniforms.uCurveTexHeight.value = data.texHeight;

        return (
          <mesh key={i} geometry={data.geometry} material={material} />
        );
      })}
    </group>
  );
}
