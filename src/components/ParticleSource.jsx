import { useSphere } from '@react-three/cannon';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three'
import { useLorentz } from "../../utils/Lorentz.js";
import { button, useControls } from "leva";
import MagneticFieldIndicator from "./MagneticFieldIndicator.jsx";
import {arrToVector, getRandomNum} from "../../utils/helpers.js";

const ParticleSource = ({ position = [0.5, 0.5, 0] }) => {
    const Particle = ({ radius, startPoint = [0, 0, 0] }) => {
        const lineGroupRef = useRef(new THREE.Group())
        const geometryRef = useRef(new THREE.BufferGeometry())
        const { particleCharge, particleDelay, particleTrailTime, distance } = useControls('Particle', {
            particleCharge: {
                value: 0.005,
                min: -0.01,
                max: 0.01,
                step: 0.0001,
                label: 'Charge'
            },
            particleDelay: {
                value: 1,
                min: 0.1,
                label: "Delay (sec)"
            },
            particleTrailTime: {
                value: 3,
                step: 1,
                min: 1,
                label: "Trail visible (sec)"
            },
            distance: {
                value: 8,
                max: 10,
                min: 4,
                label: 'Distance'
            }
        }, { collapsed: false })

        const [{ magneticFieldVector, visibleField }, set] = useControls('Magnetic field', () => ({
            magneticFieldVector: {
                value: { x: 0, y: -1, z: 0 },
                label: 'Vector'
            },
            power: {
                value: 'get',
                editable: false,
                label: 'Value'
            },
            visibleField: {
                value: false,
                label: 'Visible',
            }
        }))

        useEffect(() => {
            set({ power: arrToVector(magneticFieldVector).length().toFixed(2) + ' Tl' })
        }, [magneticFieldVector]);

        useControls('Controls', {
            "Clear trails": button(() => {
                lineGroupRef.current.clear()
            }),
            "Stop simulation": button(() => {
                api.sleep()
            }),
            "Start simulation": button(() => {
                api.wakeUp()
            }),
        })

        const [meshRef, api] = useSphere(
            () => ({
                args: [radius],
                mass: 1,
                // position: [startPoint[0] + 0.5, startPoint[1] + getRandomNum(0.3, 0.7), startPoint[2] + getRandomNum(-0.3, 0.3)],
                // velocity: [0, 0, 0],
            }),
        )

        const particlePosition = useRef([...startPoint])
        useEffect(() => {
            return api.position.subscribe(pos => particlePosition.current = pos)
        }, [])
        const particleVelocity = useRef([0, 0, 0])
        useEffect(() => {
            return api.velocity.subscribe(v => particleVelocity.current = v)
        }, [])

        const { calculateLorentzForce } = useLorentz(particleCharge, api.mass, magneticFieldVector)

        const arrPoints = [...particlePosition.current]

        let savedPoint = true
        let travelledDistance = 0
        const vec1 = new THREE.Vector3()
        const vec2 = new THREE.Vector3()
        let firstPoint = [startPoint[0] + 0.5, startPoint[1] + getRandomNum(0.3, 0.7), startPoint[2] + getRandomNum(-0.3, 0.3)]
        let lastFrameTime = 0
        useFrame((state, delta) => {
            savePathPoint();

            // забираємо старі полоси
            lineGroupRef.current.children.forEach(line => {
                if (line.userData.removeTime < state.clock.elapsedTime) {
                    lineGroupRef.current.remove(line)
                }
            })

            //сила лоренца
            vec1.set(particleVelocity.current[0], particleVelocity.current[1], particleVelocity.current[2])
            const force = calculateLorentzForce(vec1)
            force.multiplyScalar(delta / 0.01) // за 2 ньютоном
            vec1.add(force)
            api.velocity.set(vec1.x, vec1.y, vec1.z)


            // якшо дистанція пройдена
            if (travelledDistance > distance) {
                api.position.set(...firstPoint)
                api.velocity.set(0, 0, 0)
                savePath(state.clock.elapsedTime + particleTrailTime)
            }

            // ділей між вистрілами
            if (!(state.clock.elapsedTime - lastFrameTime >= particleDelay)) {
                return;
            }
            lastFrameTime = state.clock.elapsedTime;
            travelledDistance = 0

            // готовий трек
            savePath(state.clock.elapsedTime + particleTrailTime)

            // заупск точки
            api.position.set(...firstPoint)
            api.velocity.set(getRandomNum(-10, 10), getRandomNum(-1, 1), getRandomNum(-10, 10))
            savedPoint = false

            // очищення, підготовка до нового треку
            arrPoints.splice(0, arrPoints.length)
            arrPoints.push(...firstPoint)
            firstPoint = [startPoint[0] + 0.5, startPoint[1] + getRandomNum(0.3, 0.7), startPoint[2] + getRandomNum(-0.3, 0.3)]
        })

        const savePathPoint = () => {
            if (!savedPoint) {
                vec1.set(arrPoints[arrPoints.length - 3], arrPoints[arrPoints.length - 2], arrPoints[arrPoints.length - 1])
                arrPoints.push(...particlePosition.current)
                vec2.set(arrPoints[arrPoints.length - 3], arrPoints[arrPoints.length - 2], arrPoints[arrPoints.length - 1])

                travelledDistance += vec1.distanceTo(vec2)

                const tempAtr = new THREE.BufferAttribute(new Float32Array([].concat(...arrPoints)), 3)
                //домальовуємо трейл
                geometryRef.current.setAttribute('position', tempAtr);
            }
        }

        const savePath = (removeTime) => {
            // зберігання шляху
            if (savedPoint) {
                return
            }
            const completedVertices = new Float32Array([].concat(...arrPoints))
            const completedGeometry = new THREE.BufferGeometry();
            completedGeometry.setAttribute('position', new THREE.BufferAttribute(completedVertices, 3));
            const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
            const completedSplineObject = new THREE.Line(completedGeometry, material);
            completedSplineObject.userData = { removeTime: removeTime }
            lineGroupRef.current.add(completedSplineObject)
            savedPoint = true
        }

        return (<>
                <mesh ref={meshRef} name='particle'>
                    <sphereGeometry args={[radius]}/>
                    <meshNormalMaterial/>
                </mesh>
                <line>
                    <bufferGeometry attach='geometry' ref={geometryRef}/>
                    <lineBasicMaterial color={0xff0000} attach='material'/>
                </line>
                <group ref={lineGroupRef}/>
                <MagneticFieldIndicator position={[15, 5, 0]} visible={visibleField} fieldVector={magneticFieldVector}/>
            </>
        )
    }

    return (
        <>
            <mesh position={position} >
                <sphereGeometry args={[0.5]} />
                <meshBasicMaterial map={useTexture("/rock_texture.jpg")} />
            </mesh>
            <mesh position={position.map((value, i) => i === 1 ? position[i] / 2 : position[i])}>
                <boxGeometry args={[0.15, position[1], 0.2]} />
                <meshStandardMaterial color={0x7e8991} roughness={0.8} metalness={1} />
            </mesh>
            <Particle radius={0.05} startPoint={position.map((value, i) => i !== 2 ? (position[i]) - 0.5 : (position[i]))} />
        </>
    );
};

export default ParticleSource;
