import * as THREE from './three.module.js';
import { ARButton } from './ARButton.js';

let canvasElem;
let camera, scene, renderer;
let controller;

let reticle;

let hitTestSource = null;
let hitTestSourceRequested = false;

init();

function init() {
    canvasElem = document.querySelector('#c');

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

    renderer = new THREE.WebGLRenderer({
        canvas: canvasElem,
        antialias: true,
        alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    //

    document.body.appendChild(
        ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] })
    );

    //geometry

    const boxWidth = 1;
    const boxHeight = 1;
    const boxDepth = 1;
    const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

    function onSelect() {
        if (reticle.visible) {
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
}
