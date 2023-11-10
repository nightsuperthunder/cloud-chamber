import {
    Environment,
    MeshTransmissionMaterial,
    useGLTF
} from "@react-three/drei/";
import { usePlane } from "@react-three/cannon";

const Aquarium = ({ children, size = [5, 5, 5], ...props }) => {
    const { nodes } = useGLTF('/shapes-transformed.glb')

    // usePlane(() => ({ position: [size[0], size[1], 0], rotation: [0, -Math.PI / 2, 0] })) //x
    usePlane(() => ({ position: [-size[0], size[1], 0], rotation: [0, Math.PI / 2, 0] })) //-x
    usePlane(() => ({ position: [0, size[1], size[2]], rotation: [0, Math.PI, 0] })) //z
    usePlane(() => ({ position: [0, size[1], -size[2]], rotation: [0, 0, 0] })) //-z
    usePlane(() => ({ position: [0, size[1] * 2, 0], rotation: [Math.PI / 2, 0, 0] })) //y
    usePlane(() => ({ position: [0, 0, 0], rotation: [-Math.PI / 2, 0, 0] })) //-y


    return (
        <group>
            <group {...props} dispose={null}>
                <mesh scale={size} geometry={nodes.Cube.geometry} position={[0, size[1], 0]}>
                    <MeshTransmissionMaterial distortionScale={0.1} temporalDistortion={0.2} />
                </mesh>
                <group>{children}</group>
            </group>


            <Environment resolution={1024}>
                <group>
                    {/*<Lightformer intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} />*/}
                    {/*/!*{[2, 0, 2, 0, 2, 0, 2, 0].map((x, i) => (*!/*/}
                    {/*/!*    <Lightformer key={i} form="circle" intensity={4} rotation={[Math.PI / 2, 0, 0]} position={[x, 4, i * 4]} scale={[4, 1, 1]} />*!/*/}
                    {/*/!*))}*!/*/}
                    {/*<Lightformer intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[50, 2, 1]} />*/}
                    {/*<Lightformer intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[50, 2, 1]} />*/}
                </group>
            </Environment>
        </group>
    )
};

export default Aquarium;
