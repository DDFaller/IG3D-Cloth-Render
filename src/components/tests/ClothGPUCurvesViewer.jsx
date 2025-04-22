import * as THREE from 'three'
import { useEffect, useState, useMemo, useRef } from 'react'
import vertexShader from '../shaders/clothVertex.glsl'
import fragmentShader from '../shaders/clothFragment.glsl'
import { useControls, folder } from 'leva'

export default function GpuClothFibers() {
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
      fiberCount: { value: 6, min: 1, max: 20, step: 1 },
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
      const res = await fetch('/data/glove.json')
      const data = await res.json()
      const resolution = 200
      
      const points = data.curves[0].points
      const pointCount = points.length

      const totalVertices = fiberCount * resolution

      const dataArray = new Float32Array(pointCount * 4)
      for (let i = 0; i < pointCount; i++) {
        const [x, y, z] = points[i]
        dataArray[i * 4 + 0] = x
        dataArray[i * 4 + 1] = y
        dataArray[i * 4 + 2] = z
        dataArray[i * 4 + 3] = 1.0
      }
      
      customAttributes = {}
      customAttributes.currArray = []
      console.log('Point count', pointCount)
      const currArray = new Float32Array(pointCount * 3)
      
      for (let i = 0; i < pointCount; i++) {
        const i3 = i * 3;
        const [x, y, z] = points[i]
        if (i < pointCount) {
          currArray[i3 + 0] = x
          currArray[i3 + 1] = y
          currArray[i3 + 2] = z
        }
        else {
          currArray[i3 + 0] = 0
          currArray[i3 + 1] = 0
          currArray[i3 + 2] = 0
        }
      }
      customAttributes.currArray.push(new THREE.Float32BufferAttribute(currArray, 3))
      
      const texture = new THREE.DataTexture(
        dataArray,
        pointCount, 1,
        THREE.RGBAFormat,
        THREE.FloatType
      )
      texture.needsUpdate = true
      texture.magFilter = THREE.NearestFilter
      texture.minFilter = THREE.NearestFilter

      // Dummy geometry
      const dummy = new Float32Array(totalVertices * 3)
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(dummy, 3))
      geometry.setAttribute('aCurrPosition', customAttributes.currArray[0])
      geometry.setDrawRange(0, totalVertices)

      // Shader material
      materialRef.current = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          curveTexture: { value: texture },
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
