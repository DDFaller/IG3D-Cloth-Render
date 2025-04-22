// ClothCurvesViewer.jsx
import { useMemo, useEffect, useState } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useControls, folder } from 'leva'

export default function ClothCurvesViewer({ mode = 'line', background, scene }) {
  const [curveData, setCurveData] = useState(null)

  const {
    file,
    fiberCount,
    fiberTwistRate,
    fiberRadiusMin,
    fiberRadiusMax,
    verticalDisplacementFactor,
    migrationFrequency,
    enableMigration,
    resolutionMultiplier,
    resolutionFollowsTwist,
    fiberColor,
    baseCurveColor
  } = useControls({
    Data: folder({
      file: {
        options: {
          '1-thread': '1_thread.json',
          'glove': 'glove.json',
          'fiber': 'fiber.json',
        },
        value: '1_thread.json'
      }
    }),
    Appearance: folder({
      fiberColor: { value: '#87ceeb' },
      baseCurveColor: { value: '#ff0000' }
    }),
    FiberParameters: folder({
      fiberCount: { value: 6, min: 1, max: 20, step: 1 },
      fiberTwistRate: { value: 0, min: 0, max: 50, step: 1 },
      fiberRadiusMin: { value: 0.01, min: 0.001, max: 0.1, step: 0.001 },
      fiberRadiusMax: { value: 0.03, min: 0.001, max: 0.1, step: 0.001 },
      verticalDisplacementFactor: { value: 0.1, min: -2, max: 2, step: 0.01 }
    }),
    Migration: folder({
      enableMigration: { value: true },
      migrationFrequency: { value: 4, min: 0, max: 360, step: 0.1 }
    }),
    Resolution: folder({
      resolutionMultiplier: { value: 20, min: 1, max: 100, step: 1 },
      resolutionFollowsTwist: { value: true }
    })
  })

  useEffect(() => {
    if (scene && background) {
      scene.background = new THREE.Color(background)
    }
  }, [background, scene])

  useEffect(() => {
    fetch(`/data/${file}`)
      .then(res => res.json())
      .then(setCurveData)
      .catch(console.error)
  }, [file])

  // Extract base curves from JSON data
  const curves = useMemo(() => {
    return curveData?.curves?.map((curve, i) => {
      const points = curve.points.map(p => new THREE.Vector3(...p))
      return { id: i, points, closed: curve.closed }
    }) || []
  }, [curveData])

  // Generate fibers (plies) twisting around each base curve
  const generatePlies = (basePoints) => {
    const plies = []
    const baseCurve = new THREE.CatmullRomCurve3(basePoints)

    let resolution = basePoints.length * resolutionMultiplier
    if (resolutionFollowsTwist) {
      resolution *= fiberTwistRate
    }
    const frenetFrames = baseCurve.computeFrenetFrames(resolution, false)

    for (let plyIndex = 0; plyIndex < fiberCount; plyIndex++) {
      const initialAngle = (2 * Math.PI * plyIndex) / fiberCount
      const plyPoints = []

      for (let segment = 0; segment <= resolution; segment++) {
        const t = segment / resolution
        const twistAngle = fiberTwistRate * 2 * Math.PI * t
        const combinedAngle = initialAngle + twistAngle

        let radius = fiberRadiusMax
        if (enableMigration) {
          const Ri = 1
          radius = (Ri / 2) * (
            fiberRadiusMax +
            fiberRadiusMin +
            (fiberRadiusMax - fiberRadiusMin) *
              Math.cos(initialAngle + migrationFrequency * twistAngle)
          )
        }

        const positionOnCurve = baseCurve.getPointAt(t)
        const normal = frenetFrames.normals[segment]
        const binormal = frenetFrames.binormals[segment]

        const radialOffset = new THREE.Vector3()
          .addScaledVector(normal, radius * Math.cos(combinedAngle))
          .addScaledVector(binormal, radius * Math.sin(combinedAngle))

        const finalPlyPoint = positionOnCurve.clone().add(radialOffset)
        plyPoints.push(finalPlyPoint)
      }

      plies.push(plyPoints)
    }

    return plies
  }

  const generatedPlies = useMemo(() => {
    return curves.map(({ id, points }) => ({
      id,
      basePoints: points,
      plies: generatePlies(points)
    }))
  }, [
    curves,
    fiberCount,
    fiberTwistRate,
    fiberRadiusMin,
    fiberRadiusMax,
    verticalDisplacementFactor,
    enableMigration,
    migrationFrequency,
    resolutionMultiplier,
    resolutionFollowsTwist
  ])


  return (
    <>
      {generatedPlies.map(({ id, basePoints, plies }) => (
        <group key={`curve-${id}`}>
          {(mode === 'line' || mode === 'both') && (
            <Line points={basePoints} color={baseCurveColor} lineWidth={1} />
          )}
  
          {(mode === 'fiber' || mode === 'both') &&
            plies.map((plyPoints, plyIndex) => (
              <Line
                key={`ply-${id}-${plyIndex}`}
                points={plyPoints}
                color={fiberColor}
                lineWidth={0.5}
              />
            ))}
        </group>
      ))}
    </>
  )
  
}