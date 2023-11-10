import {arrToVector} from "../../utils/helpers.js";

const MagneticFieldIndicator = ({fieldVector, visible}) => {
    const arr = [[8, 5, -8], [8, 5, 8], [-8, 5, 8], [-8, 5, -8]]

    return (
        <>
            <group>
                {arr.map((p, i) => <arrowHelper key={i} visible={visible}
                                             args={[
                                                 arrToVector(fieldVector).normalize(),
                                                 arrToVector(p),
                                                 5]}
                />)}
            </group>
        </>
    );
};

export default MagneticFieldIndicator;