import * as THREE from './three/build/three.module.js';
import { ARButton } from './three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from './three/examples/jsm/loaders/GLTFLoader.js';

let canvasElem;
let camera, scene, renderer;
let controller;

let reticle;

let potScene;
let mixer;
let clips;

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
    let path = './assets/models/potNoodle_Anim.glb';

    loader.load(path, (gltf) => {
        potScene = gltf.scene;
        console.log(potScene);
        for (const mesh of potScene.children) {
            mesh.scale.set(0.5, 0.5, 0.5);
        }

        potScene.position.z = -4;
        potScene.position.y = -1;
        scene.add(potScene);

        console.log(gltf.animations);

        mixer = new THREE.AnimationMixer(potScene);
        clips = gltf.animations;

        for (const clip of clips) {
            let anim = mixer.clipAction(clip);
            anim.setLoop(THREE.LoopOnce);
            anim.clampWhenFinished = true;
        }
    });

    function onSelect() {
        if (reticle.visible) {
            if (potScene) {
                potScene.position.setFromMatrixPosition(reticle.matrix);
                //console.log(camera.getWorldDirection());
                potScene.lookAt(camera.getWorldPosition());
                potScene.rotation.x = 0;
                potScene.rotation.z = 0;
                for (const clip of clips) {
                    mixer.clipAction(clip).stop();
                    mixer.clipAction(clip).play();
                }
            }
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

let prevTime = Date.now();

function render(timestamp, frame) {
    if (potScene) {
        let timer = Date.now();

        mixer.update((timer - prevTime) * 0.0003);

        prevTime = timer;
    }

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
