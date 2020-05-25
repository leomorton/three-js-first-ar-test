import * as THREE from './three/build/three.module.js';
import { GLTFLoader } from './three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
import { OutlineEffect } from './three/examples/jsm/effects/OutlineEffect.js';

let canvasElem;
let camera, scene, renderer;
let effect;

let controls;

init();

function init() {
    // canvas

    canvasElem = document.querySelector('#c');

    // scene setup

    scene = new THREE.Scene();

    const fov = 13;
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(fov, aspect, 0.01, 200);
    camera.position.set(3, 2.5, 3);

    const fogColor = 0xa0ffee;
    //scene.fog = new THREE.Fog(fogColor, 4, 10);

    //lights

    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.7);
    hemiLight.color.setHSL(0.6, 1, 1);
    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    let dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.color.setHSL(0.1, 1, 0.95);
    dirLight.position.set(2, 3, 2);
    scene.add(dirLight);

    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;

    let d = 1;

    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;

    dirLight.shadow.camera.far = 400;
    dirLight.shadow.bias = -0.00001;

    /*
    let dirLightHeper = new THREE.DirectionalLightHelper(dirLight, 10);
    scene.add(dirLightHeper);

    let dirLightShadowHelper = new THREE.CameraHelper(dirLight.shadow.camera);
    scene.add(dirLightShadowHelper);
*/
    // renderer

    renderer = new THREE.WebGLRenderer({
        canvas: canvasElem,
        antialias: true,
        alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(-0.02, 0, -0.05);
    controls.update();

    // Outline effect

    effect = new OutlineEffect(renderer);

    // geometry

    const loader = new GLTFLoader();
    let path = './assets/models/leedsUni.glb';

    loader.load(path, (gltf) => {
        let cityScene = gltf.scene;

        for (const mesh of cityScene.children) {
            mesh.scale.set(0.2, 0.2, 0.2);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            if (mesh.children.length > 0) {
                for (const meshChild of mesh.children) {
                    meshChild.castShadow = true;
                    meshChild.receiveShadow = true;
                }
            }
        }
        scene.add(cityScene);
    });

    window.addEventListener('resize', onWindowResize, false);
    renderer.setAnimationLoop(render);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function render(timestamp, frame) {
    controls.update();
    renderer.render(scene, camera);
}
