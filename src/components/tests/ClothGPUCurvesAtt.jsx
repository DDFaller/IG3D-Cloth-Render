import * as THREE from 'three'
import { useEffect, useState, useMemo, useRef } from 'react'
import vertexShader from '../shaders/clothAttVertex.glsl'
import fragmentShader from '../shaders/clothFragment.glsl'
import fragmentShaderByPly from '../shaders/clothFragmentColorByPly.glsl'
import fragmentShaderByFiberType from '../shaders/clothFragmentColorByFiberType.glsl'
import fragmentShaderByColor from '../shaders/clothFragmentColor.glsl'

import { useControls, folder } from 'leva'

export default function GpuClothFibersAtt() {
    const [geometry, setGeometry] = useState(null)
    const [material, setMaterial] = useState(null)
    const materialRef = useRef()
    const {
        fiberCount,
        fiberTwistRate,
        fiberRadiusMin,
        fiberRadiusMax,
        migrationFrequency,
        enableMigration
    } = useControls({
        Fiber: folder({
        fiberCount: { value: 4, min: 1, max: 20, step: 1 },
        fiberTwistRate: { value: 10, min: 0, max: 50, step: 0.5 },
        fiberRadiusMin: { value: 0.01, min: 0.001, max: 0.1, step: 0.001 },
        fiberRadiusMax: { value: 0.03, min: 0.001, max: 0.1, step: 0.001 },
        migrationFrequency: { value: 4, min: 0, max: 30, step: 0.1 },
        enableMigration: { value: true }
        })
    })

        
    useEffect(() => {
        if (!materialRef.current) return
    
        materialRef.current.uniforms.fiberCount.value = fiberCount
        materialRef.current.uniforms.fiberTwistRate.value = fiberTwistRate
        materialRef.current.uniforms.fiberRadiusMin.value = fiberRadiusMin
        materialRef.current.uniforms.fiberRadiusMax.value = fiberRadiusMax
        materialRef.current.uniforms.migrationFrequency.value = migrationFrequency
        materialRef.current.uniforms.enableMigration.value = enableMigration
    }, [
        fiberCount,
        fiberTwistRate,
        fiberRadiusMin,
        fiberRadiusMax,
        migrationFrequency,
        enableMigration
    ])

    const gl = document.createElement('canvas').getContext('webgl2')
    console.log(gl.getParameter(gl.MAX_TEXTURE_SIZE)) // ex: 16384
    let customAttributes = null
    useEffect(() => {
    const load = async () => {
        const res = await fetch('/data/1_thread.json')
        const data = await res.json()
        const resolution = 1
        let totalVertices = 0
        console.log('Number of curves: ', data.curves.length)
        console.log('Desired resolution:', resolution)
        

        let totalPointCount = 0;
        for (const curve of data.curves) {
            totalPointCount += curve.points.length;
        }
        console.log('Total points:', totalPointCount)

        customAttributes = {}
        customAttributes.previousArrayFlatten = new Float32Array(totalPointCount * resolution * fiberCount * 3)
        customAttributes.currArrayFlatten = new Float32Array(totalPointCount * resolution * fiberCount * 3)
        customAttributes.nextArrayFlatten = new Float32Array(totalPointCount * resolution * fiberCount * 3)
        customAttributes.plyIndexArrayFlatten = new Float32Array(totalPointCount * resolution * fiberCount)
        let globalOffset = 0
        
        function areVec3Equal(a, b) {
            return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
        }
        
        function addPointsToFlattenArrays(index, prev, curr, next, resolution, fiberCount, previousArrayFlatten, currArrayFlatten, nextArrayFlatten) {
            const p = prev || curr;
            const c = curr;
            const n = next || curr;
        
            const offset = index * 3;
            
            if (areVec3Equal(p, c)) {
                console.log("Previous is equal to Current");
            }
            
            if (areVec3Equal(c, n)) {
                console.log("Current is equal to Next");
            }

            // Previous
            previousArrayFlatten[offset]     = p[0];
            previousArrayFlatten[offset + 1] = p[1];
            previousArrayFlatten[offset + 2] = p[2];
    
            // Current
            currArrayFlatten[offset]     = c[0];
            currArrayFlatten[offset + 1] = c[1];
            currArrayFlatten[offset + 2] = c[2];
    
            // Next
            nextArrayFlatten[offset]     = n[0];
            nextArrayFlatten[offset + 1] = n[1];
            nextArrayFlatten[offset + 2] = n[2];

        }
        
        let pointIndex = 0;
        for (const curve of data.curves) {
            const points = curve.points
            const pointCount = points.length
            totalVertices += pointCount * resolution
            
            
            const currArray = new Float32Array(pointCount * 3 * resolution)
            let localOffset = 0
            for (let i = 0; i < pointCount; i++) {
                const i3 = i * 3;
                const prev = i > 0 ? points[i - 1] : null;
                const curr = points[i];
                const next = i < pointCount - 1 ? points[i + 1] : null;
                if (prev == curr || curr == next) {
                    console.log(prev,curr,next)
                }
                for (let ply = 0; ply < fiberCount; ply++){
                    for (let res_index = 0; res_index < resolution; res_index++){
                        addPointsToFlattenArrays(
                            pointIndex,
                            prev,
                            curr,
                            next,
                            resolution,
                            fiberCount,
                            customAttributes.previousArrayFlatten,
                            customAttributes.currArrayFlatten,
                            customAttributes.nextArrayFlatten
                        );
                        customAttributes.plyIndexArrayFlatten[pointIndex] = ply
                        pointIndex++;
                    }
                    
                }
            }
        }

    


        console.log('Custom Attributes:', customAttributes)

        const dummy = new Float32Array(totalPointCount * resolution * fiberCount * 3)
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(dummy, 3))
        geometry.setAttribute('aPrevPosition', new THREE.Float32BufferAttribute(customAttributes.previousArrayFlatten, 3))
        geometry.setAttribute('aCurrPosition', new THREE.Float32BufferAttribute(customAttributes.currArrayFlatten, 3))
        geometry.setAttribute('aNextPosition', new THREE.Float32BufferAttribute(customAttributes.nextArrayFlatten,3))
        geometry.setAttribute('aPlyIndex', new THREE.Float32BufferAttribute(customAttributes.plyIndexArrayFlatten,1))
        geometry.setDrawRange(0, totalPointCount * resolution * fiberCount)


        
        // Shader material
        materialRef.current = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
            resolution: { value: resolution },
            fiberCount: { value: fiberCount },
            fiberRadiusMin: { value: fiberRadiusMin },
            fiberRadiusMax: { value: fiberRadiusMax },
            fiberTwistRate: { value: fiberTwistRate },
            migrationFrequency: { value: migrationFrequency },
            enableMigration: { value: enableMigration }
            }
        })

        setGeometry(geometry)
        setMaterial(materialRef.current)
        }

        load()
    }, [])

  return geometry && material ? (
    <line geometry={geometry} material={material} />
  ) : null
}
