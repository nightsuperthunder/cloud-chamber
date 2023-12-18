import './App.css'
import {Canvas} from "@react-three/fiber/";
import {CameraControls} from "@react-three/drei/";
import Aquarium from './components/Aquarium';
import {Physics} from "@react-three/cannon";
import ParticleSource from './components/ParticleSource';
import {Table} from "./components/Table.jsx";

function App() {
    return (
        <>
            <Canvas shadows camera={{ position: [0, 8, 15], fov: 90, near: 0.001, far: 100 }}>
                <color attach='background' args={['#323232']} />
                <color attach='background' args={['#6a8894']} />
                <fog attach="fog" args={["#323232", 35, 55]} />

                <Physics gravity={[0, 0, 0]} stepSize={1 / 60}>
                    <Aquarium size={[10, 7, 10]}>
                        <ParticleSource position={[0, 5, 0]} />
                    </Aquarium>
                </Physics>
                {/*<FogEffect/>*/}

                <Table />

                <gridHelper args={[20, 20]}/>
                {/*<axesHelper args={[10]} />*/}
                <CameraControls truckSpeed={1} dollySpeed={1} minPolarAngle={0} maxPolarAngle={Math.PI / 2} maxDistance={40} minDistance={7} />
            </Canvas >
        </>
    )
}

export default App
