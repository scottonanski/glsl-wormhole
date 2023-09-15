import * as THREE from 'three';

// Global Variables
let camera, scene, renderer, cylinder, texture, shaderMaterial;


const normal_speed = 0.005;
let speed_multiplier = 1.0;


// Get the containing element dimensions
function getWormholeDimensions() {
    const wormholeSection = document.querySelector('.wormhole');
    return {
        width: wormholeSection.clientWidth,
        height: wormholeSection.clientHeight
    };
}

function init() {
    setupRenderer();
    setupScene();
    setupCamera();
    setupLights();
    setupTextureAndMesh();
    window.addEventListener('resize', () => onWindowResize(shaderMaterial), false);
    document.addEventListener('wheel', handleScrollEvent);
}

function onWindowResize() {
    const {
        width,
        height
    } = getWormholeDimensions();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    if (shaderMaterial && shaderMaterial.uniforms) {
        shaderMaterial.uniforms.resolution.value.set(width, height);
    }
}

function handleScrollEvent(event) {
    if (shaderMaterial) {
        // Modify the uvOffset based on the scroll direction
        if (event.deltaY > 0) {
            shaderMaterial.uniforms.uvOffset.value += 0.05; // Amplify the change
        } else {
            shaderMaterial.uniforms.uvOffset.value -= 0.05; // Amplify the change
        }

        // Logging to see the adjusted uvOffset value
        console.log("Adjusted uvOffset:", shaderMaterial.uniforms.uvOffset.value);
    }
}

function setupRenderer() {
    const {
        width,
        height
    } = getWormholeDimensions();
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        glslVersion: 'THREE.GLSL3'
    });
    renderer.setSize(width, height);
    const wormholeSection = document.querySelector('.wormhole');
    wormholeSection.appendChild(renderer.domElement);
}

function setupScene() {
    scene = new THREE.Scene();

    // Add fog to the scene
    const fogColor = 0x000000; // black fog for example
    const nearDistance = 1;
    const farDistance = 2000;
    scene.fog = new THREE.Fog(fogColor, nearDistance, farDistance);
}

function setupCamera() {
    const {
        width,
        height
    } = getWormholeDimensions();
    camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.lookAt(scene.position);
    scene.add(camera);
}

function setupLights() {
    const directionalLight1 = createDirectionalLight('rgb(226, 136, 0)', 0, 1, 1, 0);
    scene.add(directionalLight1);
    const directionalLight2 = createDirectionalLight('rgb(226, 136, 0)', 0, -1, 1, 0);
    scene.add(directionalLight2);
    const pointLight1 = createPointLight('rgb(226, 136, 0)', 0.5, 0, -3, 0, 25);
    scene.add(pointLight1);
    const pointLight2 = createPointLight('rgb(226, 136, 0)', 0, 3, 3, 0, 30);
    scene.add(pointLight2);
}

function createDirectionalLight(color, intensity, x, y, z) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(x, y, z).normalize();
    return light;
}

function createPointLight(color, intensity, x, y, z, distance) {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.set(x, y, z);
    return light;
}


function setupTextureAndMesh() {
    shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            fogColor: { value: new THREE.Color(scene.fog.color) },
        fogNear: { value: scene.fog.near },
        fogFar: { value: scene.fog.far },

            time: {
                value: 2.0
            },
            resolution: {
                value: new THREE.Vector2()
            },
            uvOffset: {
                value: 0.0
            }
        },
        vertexShader: `
            varying vec2 vUv;
                
            void main() {
                vUv = uv; 
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1);
            }
        `,
        fragmentShader: `
                    precision highp float;
            
                    varying vec2 vUv; 
                    uniform float time;
                    uniform float uvOffset;
                    uniform vec2 mouse;
                    uniform vec2 resolution;
                    uniform vec3 lightPosition;
                    uniform vec3 lightColor;
                    uniform vec3 fogColor;
                    uniform float fogNear;
                    uniform float fogFar;
                    
                    mat2 rotate2D(float r) {
                        return mat2(cos(r), sin(r), -sin(r), cos(r));
                    }
                    
                    void main() {
                        vec2 uv = vUv * 2.0;
                        uv = mix(uv, 2.0 - uv, step(1.0, uv));
            
                        vec3 col = vec3(0);
                        float t = time * 1.0;
                        vec2 n = vec2(0);
                        vec2 q = vec2(0);
                        vec2 p = uv;
                        float d = dot(p, p);
                        float S = 20.0;
                        float a = 0.005;
                        mat2 m = rotate2D(1.0);
                        
                        for (float j = 0.; j < 30.; j++) {
                            p *= m;
                            n *= m;
                            t = time * 0.05 + j * 0.05;
                            q = p * S - t * 1.0 + sin(t * 1.25 - d * 1.25) * 2.5 + j + n;
                            a += dot(cos(q) / S, vec2(0.1));
                            n -= sin(q);
                            S *= 1.6;
                        }
                        
                        col = vec3(10, 1, 1) * (a + 0.025) + a + a - (0.05 * d);
            
                        // Increase the red component
                        col.r *= 1.0;
            
                        vec3 position = vec3(uv, 1.0);
                        vec3 normal = normalize(cross(dFdx(position), dFdy(position)));
                        float diff = max(dot(normal, lightPosition), 0.25);
                        vec3 diffuse = diff * lightColor;
            
                        vec3 viewDir = normalize(vec3(uv, 0.5));
                        vec3 reflectDir = reflect(-lightPosition, normal);
                        float spec = pow(max(dot(viewDir, reflectDir), 0.25), 100.0);
                        vec3 specular = spec * vec3(1.0, 0.5, 0.5);
            
                        vec3 ambient = vec3(1.0, 0.001, 0.2); // Reduce the ambient values
            
                        col = mix(col, diffuse, 0.1) + specular + ambient * 0.05;
                        
                        vec3 gloss_viewDir = normalize(vec3(0.0, 0.0, -1.0));
                        vec3 gloss_normal = normalize(vec3(1.0, 1.0, 1.0));
                        vec3 gloss_reflectDir = reflect(-lightPosition, gloss_normal);
                        float gloss_spec = pow(max(dot(gloss_viewDir, gloss_reflectDir), 0.0), 1.0);
                        vec3 gloss_specular = gloss_spec * vec3(100, 100, 100); // Brighter white

                        col += gloss_specular;  // Add specular component to final color

                        float depth = gl_FragCoord.z / gl_FragCoord.w;
                        float fogFactor = smoothstep(fogNear, fogFar, depth);
                        col = mix(col, fogColor, fogFactor);
                        gl_FragColor = vec4(col, 1.0);
                    }
                `
    });

    shaderMaterial.extensions.derivatives = true; // Enable the derivatives extension
    shaderMaterial.transparent = true;

    const {
        width,
        height
    } = getWormholeDimensions();
    shaderMaterial.uniforms.resolution.value.set(width, height);

    const material = shaderMaterial;
    const cylinder_geometry = new THREE.CylinderGeometry(1, 1, 20, 30, 1, true);
    cylinder = new THREE.Mesh(cylinder_geometry, material);
    material.side = THREE.BackSide;
    cylinder.rotation.x = Math.PI / 2;
    scene.add(cylinder);

    checkShaderCylinderLinkage();

    animate();
}

function animate() {

    requestAnimationFrame(animate);
    render();
}

function render() {
    if (shaderMaterial) {
        shaderMaterial.uniforms.time.value = performance.now() * 0.009;
        console.log("Current uvOffset increment:", normal_speed * speed_multiplier);

        shaderMaterial.uniforms.uvOffset.value += normal_speed * speed_multiplier;


        shaderMaterial.uniforms.uvOffset.value %= 10.0;
    }

    const seconds = Date.now() / 1000;
    const angle = 0.1 * seconds;
    camera.rotation.z = angle;





    // Rotate the cylinder
    if (cylinder) {
        cylinder.rotation.y += 0.001; // Adjust the rotation speed as needed
    }

    renderer.render(scene, camera);
}

// Function to check the linkage between the cylinder and shader
function checkShaderCylinderLinkage() {
    if (cylinder && shaderMaterial) {
        console.log("Cylinder and Shader are linked properly.");
    } else {
        console.warn("Cylinder and Shader linkage is not complete.");
    }
}

init();
animate();