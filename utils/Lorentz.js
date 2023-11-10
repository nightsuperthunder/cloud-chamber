import * as THREE from 'three'

export const useLorentz = (particleCharge, particleMass, magneticField) => {
    const calculateLorentzForce = (velocity) => {
        const crossProduct = new THREE.Vector3();
        crossProduct.crossVectors(velocity, magneticField);
        return crossProduct.multiplyScalar(particleCharge);
    }

    const updateParticlePositionAndVelocity = (particleVelocity, timeStep) => {
        const lorentzForce = calculateLorentzForce(particleVelocity);

        // Оновлення швидкості за допомогою другого закону Ньютона
        particleVelocity.add(lorentzForce.multiplyScalar(timeStep / particleMass));
    }

    return {updateParticlePositionAndVelocity, calculateLorentzForce}
}