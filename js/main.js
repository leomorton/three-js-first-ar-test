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

let potPlaced;

let hitTestSource = null;
let hitTestSourceRequested = false;

let camPos = new THREE.Vector3();
let camScale = new THREE.Vector3();
let camRot = new THREE.Quaternion();

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
        ARButton.createButton(
            renderer,
            { requiredFeatures: ['hit-test'] },
            arStart
        )
    );

    // geometry

    const loader = new GLTFLoader();
    let path = './assets/models/potNoodle_Anim.glb';

    loader.load(path, (gltf) => {
        potScene = gltf.scene;
        for (const mesh of potScene.children) {
            mesh.scale.set(0.3, 0.3, 0.3);
        }

        potScene.position.z = -4;
        potScene.position.y = -1;
        scene.add(potScene);

        //materials
        const c_green = new THREE.Color(0x0da335);
        const c_red = new THREE.Color(0xc20906);

        const c_noodle = new THREE.Color(0xcf9a17);

        const c_PotGreen = new THREE.Color(0x00db28);
        const c_PotWhite = new THREE.Color(0xffffff);

        const c_yellow = new THREE.Color(0xffaa00);
        const c_grey = new THREE.Color(0xdddddd);

        console.log(potScene.children);
        //stars
        potScene.children[0].children[0].material.color = c_green;
        potScene.children[0].children[1].material.color = c_green;
        potScene.children[0].children[2].material.color = c_green;
        potScene.children[0].children[3].material.color = c_red;
        potScene.children[0].children[4].material.color = c_red;

        //noodles
        potScene.children[0].children[5].material.color = c_noodle;
        potScene.children[0].children[6].material.color = c_noodle;
        potScene.children[0].children[7].material.color = c_noodle;

        //button / pot
        potScene.children[1].children[0].children[0].material.color = c_PotWhite;
        potScene.children[1].children[0].children[0].material.shininess = 0;

        potScene.children[1].children[0].children[1].material.color = c_PotGreen;
        potScene.children[1].children[0].children[2].material.color = c_yellow;

        //lid
        potScene.children[3].children[0].material.color = c_grey;
        potScene.children[3].children[1].material.color = c_PotGreen;

        mixer = new THREE.AnimationMixer(potScene);
        clips = gltf.animations;

        for (const clip of clips) {
            let anim = mixer.clipAction(clip);
            anim.timeScale = 2;
            anim.setLoop(THREE.LoopOnce);
            anim.clampWhenFinished = true;
        }
    });

    function onSelect() {
        if (reticle.visible) {
            if (potScene) {
                if (!potPlaced) {
                    potScene.position.setFromMatrixPosition(reticle.matrix);
                    potScene.scale.set(1, 1, 1);
                    potScene.rotation.y -= Math.PI / 2;
                    potPlaced = true;
                } else {
                    for (const clip of clips) {
                        mixer.clipAction(clip).stop();
                        mixer.clipAction(clip).play();
                    }
                }

                /*
                camera.matrixWorld.decompose(camPos, camRot, camScale);
                let camRotEuler = new THREE.Euler().setFromQuaternion(camRot);
                potScene.lookAt(camPos);
                
                console.log(potScene.rotation.y);
                potScene.rotation.x = 0;
                potScene.rotation.z = 0;
                */
            }
        }
    }

    function arStart() {
        console.log('start session callback');
        potScene.scale.set(0, 0, 0);
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
