import React, {Suspense, useEffect, useMemo, useRef} from 'react';
import {extend, useThree} from "@react-three/fiber";
import {useFrame} from "@react-three/fiber/"
import {Noise} from 'noisejs'
import * as THREE from 'three'
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer.js";
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass.js";
import {SavePass} from "three/examples/jsm/postprocessing/SavePass.js";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass.js";


extend({ EffectComposer, ShaderPass, SavePass, RenderPass });

export const shader = {
    uniforms: {
        uSize: { value: null },
        u_numRows: { value: null },
        u_slicesPerRow: { value: null },
        noiseSample: { value: null },
        tDiffuse: { value: null },
        uTime: { value: null },
        uResolution: { value: null },
        camPos: { value: null },
        cameraWorldMatrix: { value: null },
        cameraProjectionMatrixInverse: { value: null }
    },
    vertexShader: `
  varying vec2 vUv;
  varying vec3 pos;
    void main() {
      vUv = uv;
      pos = position.xyz;
      vec4 modelViewPosition = modelViewMatrix * vec4(position , 1.0);
      gl_Position = projectionMatrix * modelViewPosition;     
    }
  `,
    fragmentShader: `
    uniform vec3 camPos;
    uniform vec2 uResolution;
    uniform sampler2D tDiffuse;
    uniform mat4 cameraWorldMatrix;
    uniform mat4 cameraProjectionMatrixInverse;
    uniform float uTime;
    uniform sampler2D noiseSample;
    varying vec2 vUv;
    varying vec3 pos;

    uniform float uSize;
    uniform float u_numRows;
    uniform float u_slicesPerRow;

    vec2 computeSliceOffset(float slice, float slicesPerRow, vec2 sliceSize) {
      return sliceSize * vec2(mod(slice, slicesPerRow), 
                              floor(slice / slicesPerRow));
    }
    
    vec4 sampleAs3DTexture(
        sampler2D tex, vec3 texCoord, float size, float numRows, float slicesPerRow) {
      float slice   = texCoord.z * size;
      float sliceZ  = floor(slice);                         // slice we need
      float zOffset = fract(slice);                         // dist between slices
    
      vec2 sliceSize = vec2(1.0 / slicesPerRow,             // u space of 1 slice
                            1.0 / numRows);                 // v space of 1 slice
    
      vec2 slice0Offset = computeSliceOffset(sliceZ, slicesPerRow, sliceSize);
      vec2 slice1Offset = computeSliceOffset(sliceZ + 1.0, slicesPerRow, sliceSize);
    
      vec2 slicePixelSize = sliceSize / size;               // space of 1 pixel
      vec2 sliceInnerSize = slicePixelSize * (size - 1.0);  // space of size pixels

      vec2 uv = slicePixelSize * 0.5 + texCoord.xy * sliceInnerSize;
      vec4 slice0Color = texture2D(tex, slice0Offset + uv);
      vec4 slice1Color = texture2D(tex, slice1Offset + uv);
      return mix(slice0Color, slice1Color, zOffset);
      return slice0Color;
    }    

    float epsilon  = 0.1;
    // Define a function to generate 3D noise
    float noise(vec3 p) {
        return sampleAs3DTexture(noiseSample, p, uSize, u_numRows
          ,u_slicesPerRow).r;
    }
    
    // Define a function to calculate the flow vector at a given position
    vec3 flowVector(vec3 p) {
        // Calculate the gradient of the noise function at the current position
        vec3 grad = vec3(
            noise(p + vec3(epsilon, 0.0, 0.0)) - noise(p - vec3(epsilon, 0.0, 0.0)),
            noise(p + vec3(0.0, epsilon, 0.0)) - noise(p - vec3(0.0, epsilon, 0.0)),
            noise(p + vec3(0.0, 0.0, epsilon)) - noise(p - vec3(0.0, 0.0, epsilon))
        ) / (2.0 * epsilon);
    
        // Add some random noise to the flow vector
        vec3 noise_vec = vec3(
            noise(p * 2.0 + vec3(0.0, 0.0, 0.0)),
            noise(p * 2.0 + vec3(1.0, 0.0, 0.0)),
            noise(p * 2.0 + vec3(0.0, 1.0, 0.0))
        );
        float main_flow_strength = 1.0;
        float noise_strength = 1.0;
        vec3 flow = normalize(grad) * main_flow_strength + normalize(noise_vec) * noise_strength;
    
        return flow;
    }
    

    // MiN/Max for inside bounding box
    float value = 2.0;
    float xMin = -2.0;
    float xMax = 2.0;
    float yMin = -2.0 ;
    float yMax = 2.0;
    float zMin  = -10.0;
    float zMax = 10.0;

    bool insideCuboid (vec3 position) {
        float x = position.x;
        float y = position.y;
        float z = position.z;
        return x > xMin && x < xMax && y > yMin && y < yMax && z > zMin && z < zMax;
    }

    void main() {
      vec2 uv =( gl_FragCoord.xy * 2.0 - (uResolution - vec2(0.5,0.5)) ) / uResolution;
      vec2 p = gl_FragCoord.xy / uResolution.xy;

      vec2 screenPos = uv;
      
      vec3 ray = (cameraWorldMatrix * cameraProjectionMatrixInverse * vec4( screenPos.xy, 1.0, 1.0 )).xyz;
      ray = normalize( ray );
      
      vec3 cameraPosition = camPos;

      // Ray Marching Variables
      vec3 rayOrigin = cameraPosition;
      vec3 rayDirection =ray;
      vec3 sphereOirgin =  vec3(0.0, 0.0,0.0);

      vec3 sum = texture(tDiffuse, p).xyz;
      float rayDistance = 0.0;
      float MAX_DISTANCE =20.0;
      vec3 color = vec3(0.20,0.20,0.20);

      for (int i = 0; i< 1000;i ++) {
        vec3 currentStep = rayOrigin + rayDirection * rayDistance ;

        // float dist = sphereSDF(currentStep, .00);

        // Limit the clouds to a certain box, only within
        // this box will be rendered.
        bool insideBoundries = insideCuboid(currentStep);

        float density = 0.1;
        float trans = 0.03;
  
        if ( insideBoundries ) {
          for (int i = 0; i< 2; i++) {
            float distance = length(currentStep);
            float s = sampleAs3DTexture(noiseSample, currentStep + uTime, uSize, u_numRows
              ,u_slicesPerRow).r;
             
            if ( 0.1003 < abs(s)) {
              density += abs(s);   
            }

            if (density > 1.0) {
              break;
            }
            }
            sum = mix(sum, color, density * trans ); 
        }
        if (rayDistance > MAX_DISTANCE) {  
          break;
        }
        rayDistance += 0.1; 
      }


      gl_FragColor = vec4(sum.xyz, 1.0);
    }
  `
};


const FogEffect = () => {
    const composer = useRef();
    const shaderPass = useRef();
    const { scene, size, camera, gl} = useThree();

    const textureSize = 4;
    const slicesPerRow = 3;
    const numRows = Math.floor((textureSize + slicesPerRow - 1) / slicesPerRow);

    const [texture] = useMemo(() => {
        // https://threejs.org/docs/#api/en/textures/DataTexture
        // https://coderedirect.com/questions/241043/3d-texture-in-webgl-three-js-using-2d-texture-workaround

        const pixels = new Float32Array(
            textureSize * slicesPerRow * textureSize * numRows * 4
        );
        const noiseRaw = new Noise(0.1);
        const pixelsAcross = slicesPerRow * textureSize;
        for (let slice = 0; slice < textureSize; ++slice) {
            const row = Math.floor(slice / slicesPerRow);
            const xOff = (slice % slicesPerRow) * textureSize;
            const yOff = row * textureSize;
            for (let y = 0; y < textureSize; ++y) {
                for (let x = 0; x < textureSize; ++x) {
                    const offset = ((yOff + y) * pixelsAcross + xOff + x) * 4;
                    const freq1 = 0.1;
                    const freq2 = Math.random();
                    const freq3 = Math.random();
                    const noise3D1 = noiseRaw.perlin3(
                        y * freq1,
                        slice * freq1,
                        x * freq1
                    );
                    const noise3D2 = noiseRaw.perlin3(
                        y * freq2,
                        slice * freq2,
                        x * freq2
                    );
                    const noise3D3 = noiseRaw.perlin3(
                        y * freq3,
                        slice * freq3,
                        x * freq3
                    );

                    pixels[offset] = noise3D1 + noise3D2 + noise3D3;
                    pixels[offset + 1] = noise3D1 + noise3D2 + noise3D3;
                    pixels[offset + 2] = noise3D1 + noise3D2 + noise3D3;
                    pixels[offset + 3] = noise3D1 + noise3D2 + noise3D3;
                }
            }
        }
        const width = textureSize * slicesPerRow;
        const height = textureSize * numRows;

        const texture = new THREE.DataTexture(
            pixels,
            width,
            height,
            THREE.RGBAFormat,
            THREE.FloatType
        );

        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        texture.needsUpdate = true;

        return [texture];
    }, [numRows]);

    console.log({ texture });

    useEffect(() => composer.current.setSize(size.width, size.height), [size]);
    useFrame((state) => {
        texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
        if (shaderPass?.current?.uniforms) {
            const m = new THREE.Matrix4();
            m.copy(camera.matrixWorld);
            shaderPass.current.uniforms["uSize"].value = textureSize;
            shaderPass.current.uniforms["u_numRows"].value = slicesPerRow;
            shaderPass.current.uniforms["u_slicesPerRow"].value = numRows;
            shaderPass.current.uniforms["noiseSample"].value = texture;
            shaderPass.current.uniforms["uResolution"].value = new THREE.Vector2(
                size.width,
                size.height
            );
            shaderPass.current.uniforms["uTime"].value = state.clock.elapsedTime;
            shaderPass.current.uniforms["camPos"].value = new THREE.Vector3().copy(
                camera.position
            );
            shaderPass.current.uniforms["cameraWorldMatrix"].value =
                camera.matrixWorld;
            shaderPass.current.uniforms[
                "cameraProjectionMatrixInverse"
                ].value = new THREE.Matrix4().copy(camera.projectionMatrix).invert();
        }
        composer.current.render();
    }, 1);
    return (
        <Suspense fallback={null}>
            <effectComposer ref={composer} args={[gl]}>
                <renderPass attachArray="passes" scene={scene} camera={camera} />
                <shaderPass
                    attachArray="passes"
                    ref={shaderPass}
                    args={[shader]}
                    needsSwap={false}
                    renderToScreen
                />
            </effectComposer>
        </Suspense>
    );
};

export default FogEffect;