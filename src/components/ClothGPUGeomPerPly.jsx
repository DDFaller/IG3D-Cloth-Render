import * as THREE from 'three'
import { useEffect, useState, useRef } from 'react'
import vertexShader from '../shaders/clothAttVertex.glsl'
import vertexPeriodShader from '../shaders/vertexShaderFiberPeriod.glsl'
import fragmentShader from '../shaders/clothFragment.glsl'
import fragmentShaderByPly from '../shaders/clothFragmentColorByPly.glsl'
import fragmentShaderByFiberType from '../shaders/clothFragmentColorByFiberType.glsl'
import fragmentShaderByColor from '../shaders/clothFragmentColor.glsl'
import fragmentShaderPeriod from '../shaders/clothFragmentColorPeriod.glsl'
import { useControls, folder } from 'leva'

export default function GpuClothGeomPerFiber() {
    const [geometries, setGeometries] = useState(null)
    const [material, setMaterial] = useState(null)
    const materialRef = useRef()

    const {
        useCustomShader,
        shaderType,
        modelJson,
        visiblePly,
        fiberCount,
        fiberTwistRate,
        fiberRadiusMin,
        fiberRadiusMax,
        migrationFrequency,
        ellipseCos,
        ellipseSin,
        enableMigration,
        hairAcceptanceThreshold,
        hairWiggleFrequency,
        hairWiggleStrength,
        hairSharpnessIn,
        hairSharpnessOut,
        enableRandomFiberType,
        resolution
    } = useControls({
        Render: folder({
            useCustomShader: { value: true },
            shaderType: {
                options: {
                    colorByPly: 'colorByPly',
                    pointsDebug: 'pointsDebug',
                    noOffset: 'noOffset',
                    byFiberType: 'byFiberType',
                    periodFiber: 'periodFiber'
                },
                value: 'colorByPly'
            },
            modelJson: {
                options: {
                    thread: '1_thread.json',
                    glove: 'glove.json',
                    fiber: 'fiber.json'
                },
                value: 'fiber.json'
            }
        }),
        Fiber: folder({
            fiberCount: { value: 6, min: 1, max: 64, step: 1 },
            fiberTwistRate: { value: 1, min: 0, max: 50, step: 1.0 },
            fiberRadiusMin: { value: 0.01, min: 0.001, max: 0.1, step: 0.001 },
            fiberRadiusMax: { value: 0.03, min: 0.001, max: 0.1, step: 0.001 },
            migrationFrequency: { value: 4, min: 0, max: 30, step: 0.1 },
            ellipseCos: { value: 1.0, min: 1.0, max: 2.0, step: 0.01 },
            ellipseSin: { value: 1.0, min: 1.0, max: 2.0, step: 0.01 },
            enableMigration: { value: true },
            hairAcceptanceThreshold: { value: 0.5, min: 0.0, max: 5.0, step: 0.05 },
            visiblePly: { value: -1, min: -1, max: 20 - 1, step: 1 },
            hairWiggleFrequency: { value: 5.0, min: 0.5, max: 20.0, step: 0.1 },
            hairWiggleStrength: { value: 0.7, min: 0.0, max: 2.0, step: 0.01 },
            hairSharpnessIn: { value: 0.7, min: 0.0, max: 5.0, step: 0.01 },
            hairSharpnessOut: { value: 0.7, min: 0.0, max: 5.0, step: 0.01 },
        }),
        Geometry: folder({
            resolution: { value: 64, min: 1, max: 100, step: 1 },
            enableRandomFiberType: { value: true }
        })
    })

    useEffect(() => {
        if (!materialRef.current) return

        materialRef.current.uniforms.fiberCount.value = fiberCount
        materialRef.current.uniforms.fiberTwistRate.value = fiberTwistRate
        materialRef.current.uniforms.fiberRadiusMin.value = fiberRadiusMin
        materialRef.current.uniforms.fiberRadiusMax.value = fiberRadiusMax
        materialRef.current.uniforms.migrationFrequency.value = migrationFrequency
        materialRef.current.uniforms.ellipseCos.value = ellipseCos
        materialRef.current.uniforms.ellipseSin.value = ellipseSin
        materialRef.current.uniforms.enableMigration.value = enableMigration
        materialRef.current.uniforms.resolution.value = resolution
    }, [
        fiberCount,
        fiberTwistRate,
        fiberRadiusMin,
        fiberRadiusMax,
        migrationFrequency,
        ellipseSin,
        ellipseCos,
        enableMigration,
        resolution
    ])
    
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

    useEffect(() => {
    const load = async () => {
        const res = await fetch('/data/'+modelJson)
        const data = await res.json()

        const geometries = []
        for (let ply = 0; ply < fiberCount; ply++) {
            const prevArray = []
            const currArray = []
            const nextArray = []
            const plyIndexArray = []
            const curveTArray = []
            const nextCurveTArray = []
            const fiberTypeArray = []
            const fiberType = enableRandomFiberType ? getRandomFiberType(): getFiberType(ply, fiberCount) 
            
            for (const curve of data.curves) {
                const points = curve.points
                const curveLength = points.length

                for (let i = 0; i < curveLength; i++) {
                    const prev = i > 0 ? points[i - 1] : points[i]
                    const curr = points[i]
                    const next = i < curveLength - 1 ? points[i + 1] : points[i]
                    const tGlobal = curveLength > 1 ? i / (curveLength - 1) : 0
                    const tNext = i < curveLength - 1 ? (i + 1) / (curveLength - 1) : tGlobal

                    for (let r = 0; r < resolution; r++) {
                        prevArray.push(...prev)
                        currArray.push(...curr)
                        nextArray.push(...next)
                        plyIndexArray.push(ply)
                        curveTArray.push(tGlobal)
                        nextCurveTArray.push(tNext)
                        fiberTypeArray.push(fiberType)
                    }
                }
            }

            const numVerts = currArray.length / 3
            const geometry = new THREE.BufferGeometry()

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(currArray, 3))
            geometry.setAttribute('aPrevPosition', new THREE.Float32BufferAttribute(prevArray, 3))
            geometry.setAttribute('aCurrPosition', new THREE.Float32BufferAttribute(currArray, 3))
            geometry.setAttribute('aNextPosition', new THREE.Float32BufferAttribute(nextArray, 3))
            geometry.setAttribute('aPlyIndex', new THREE.Float32BufferAttribute(plyIndexArray, 1))
            geometry.setAttribute('aCurveT', new THREE.Float32BufferAttribute(curveTArray, 1))
            geometry.setAttribute('aNextCurveT', new THREE.Float32BufferAttribute(nextCurveTArray, 1))
            geometry.setAttribute('aFiberType', new THREE.Float32BufferAttribute(fiberTypeArray, 1))
            
            // Index to generate connections
            const indices = []
            for (let i = 0; i < numVerts - 1; i++) {
                indices.push(i, i + 1)
            }
            geometry.setIndex(indices)
            geometry.setDrawRange(0, indices.length)

            geometries.push(geometry)
        }

    
        setGeometries(geometries)
    }

    load()
    }, [fiberCount, resolution, enableRandomFiberType, modelJson])

    useEffect(() => {
        let selectedFragmentShader
        switch (shaderType) {
            case 'colorByPly':
                selectedFragmentShader = fragmentShaderByPly
                break
            case 'byFiberType':
                selectedFragmentShader = fragmentShaderByFiberType
                break
            case 'pointsDebug':
                selectedFragmentShader = fragmentShaderByColor
                break
            case 'periodFiber':
                selectedFragmentShader = fragmentShaderPeriod
                break
            default:
                selectedFragmentShader = fragmentShaderByColor
        }
    
        let mat
        if (useCustomShader) {
          mat = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: selectedFragmentShader,
            uniforms: {
                resolution: { value: resolution },
                fiberCount: { value: fiberCount },
                fiberRadiusMin: { value: fiberRadiusMin },
                fiberRadiusMax: { value: fiberRadiusMax },
                fiberTwistRate: { value: fiberTwistRate },
                migrationFrequency: { value: migrationFrequency },
                ellipseCos: {value: ellipseCos},
                ellipseSin: {value: ellipseSin},
                enableMigration: { value: enableMigration },
                hairAcceptanceThreshold: { value: hairAcceptanceThreshold },
                hairWiggleFrequency: { value: hairWiggleFrequency },
                hairWiggleStrength: { value: hairWiggleStrength },
                hairSharpnessIn: { value: hairSharpnessIn },
                hairSharpnessOut: { value: hairSharpnessOut }
                
            }
          })
        } else if (shaderType === 'pointsDebug') {
          mat = new THREE.PointsMaterial({ size: 5, color: 0xff00ff })
        } else {
          mat = new THREE.LineBasicMaterial({ color: 0xffffff })
        }
    
        materialRef.current = mat
        setMaterial(mat)
    }, [useCustomShader,
        shaderType,
        fiberCount,
        resolution,
        fiberTwistRate,
        fiberRadiusMin,
        fiberRadiusMax,
        migrationFrequency,
        enableMigration,
        hairAcceptanceThreshold,
        hairWiggleFrequency,
        hairWiggleStrength,
        hairSharpnessIn,
        hairSharpnessOut
    ])
    




    return geometries && material ? (
        <group>
            {geometries.map((geo, i) => (
            visiblePly === -1 || visiblePly === i ? (
                <line key={i} geometry={geo} material={material} />
            ) : null
            ))}
        </group>
    ) : null
}
