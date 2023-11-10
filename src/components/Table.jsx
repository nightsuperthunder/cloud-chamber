import {useTexture} from "@react-three/drei";

export const Table = ({position = [0, -0.1, 0], props}) => {

    return (
        <mesh position={[position[0], position[1] - 0.5, position[2]]} {...props}>
            <boxGeometry args={[60, 1, 60]}/>
            <meshBasicMaterial map={useTexture("/bg_wood.jpg")}/>
        </mesh>
    )
}