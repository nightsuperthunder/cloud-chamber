import * as THREE from "three";

export const getRandomNum = (min, max) => {
    return min + Math.random() * (max - min)
}

export const arrToVector = (arr, vector) => {
    if (Array.isArray(arr)) {
        if (vector) {
            vector.set(arr[0], arr[1], arr[2])
            return vector;
        }
        return new THREE.Vector3(arr[0], arr[1], arr[2])
    }
    if (vector) {
        vector.set(arr.x, arr.y, arr.z)
        return vector;
    }
    return new THREE.Vector3(arr.x, arr.y, arr.z)

}