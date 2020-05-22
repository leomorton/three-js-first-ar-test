import * as THREE from './three/build/three.module.js';
import { ARButton } from './three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from './three/examples/jsm/loaders/GLTFLoader.js';

let canvasElem;
let camera, scene, renderer;
let controller;

let reticle;

let potLoaded = false;
let potNoodle;

let hitTestSource = null;
let hitTestSourceRequested = false;

init();
animate();

function init() {
    // canvas

    canvasElem = document.querySelector('#c');

    // scene setup

    scene = new THREE.Scene();

    const fov = 70;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.01;
    const far = 20;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    const skyColour = 0xffffff;
    const groundColour = 0xbbbbff;
    const intensity = 1;
    const light = new THREE.HemisphereLight(skyColour, groundColour, intensity);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // renderer

    renderer = new THREE.WebGLRenderer({
        canvas: canvasElem,
        antialias: true,
        alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    // add button

    document.body.appendChild(
        ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] })
    );

    // geometry

    const loader = new GLTFLoader();

    loader.load(
        '../assets/models/potNoodle.glb',
        (gltf) => {
            potLoaded(gltf);
        },
        undefined,
        function (error) {
            console.error(error);
        }
    );

    function potLoaded(gltf) {
        console.log(gltf.scene);
        for (const mesh of gltf.scene.children) {
            mesh.scale.x = 0.05;
            mesh.scale.y = 0.05;
            mesh.position.z = -4;
            const phongMaterial = new THREE.MeshPhongMaterial({
                color: 0x555555,
            });
            mesh.material = phongMaterial;
        }
        scene.add(gltf.scene);
        potNoodle = gltf.scene;
        potLoaded = true;
    }

    const boxWidth = 0.2;
    const boxHeight = 0.2;
    const boxDepth = 0.2;
    const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

    function onSelect() {
        if (reticle.visible) {
            console.log(reticle.matrix);
            if (potLoaded) {
                const pot = potNoodle.clone();
                pot.setFromtMatrixPosition(reticle.matrix);
                scene.add(pot);
            }

            const material = new THREE.MeshPhongMaterial({
                color: 0xffffff * Math.random(),
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.setFromMatrixPosition(reticle.matrix);
            mesh.scale.y = Math.random() * 2 + 1;
            scene.add(mesh);
        }
    }

    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    reticle = new THREE.Mesh(
        new THREE.RingBufferGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial()
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (hitTestSourceRequested === false) {
            session
                .requestReferenceSpace('viewer')
                .then(function (referenceSpace) {
                    session
                        .requestHitTestSource({ space: referenceSpace })
                        .then(function (source) {
                            hitTestSource = source;
                        });
                });

            session.addEventListener('end', function () {
                hitTestSourceRequested = false;
                hitTestSource = null;
            });

            hitTestSourceRequested = true;
        }

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length) {
                const hit = hitTestResults[0];

                reticle.visible = true;
                reticle.matrix.fromArray(
                    hit.getPose(referenceSpace).transform.matrix
                );
            } else {
                reticle.visible = false;
            }
        }
    }
    renderer.render(scene, camera);
}
