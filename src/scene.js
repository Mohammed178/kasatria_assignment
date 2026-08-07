import * as THREE from 'three';
import { Tween, Easing, Group } from '@tweenjs/tween.js';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { createPersonTile } from './tile.js';
import { buildTableTargets, buildSphereTargets, buildHelixTargets, buildGridTargets } from './layouts.js';

// tween.js v25 no longer auto-registers `new Tween(obj)` with the global group,
// so tweens must be given an explicit group and that group updated by hand.
// The original three.js demo predates this change.
const tweens = new Group();

let camera, scene, renderer, controls;
let started = false;

const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };

export function initScene(container, people) {
	// Runs after an async fetch, so guard against a second call.
	if (started) return;
	started = true;

	// Far enough back that the deepest layout (the grid) sits entirely in front
	// of the camera, and wide enough for the 20 column table.
	camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
	camera.position.z = 4000;

	scene = new THREE.Scene();

	for (const person of people) {
		const objectCSS = createPersonTile(person);
		objectCSS.position.x = Math.random() * 4000 - 2000;
		objectCSS.position.y = Math.random() * 4000 - 2000;
		objectCSS.position.z = Math.random() * 4000 - 2000;
		scene.add(objectCSS);

		objects.push(objectCSS);
	}

	targets.table = buildTableTargets(objects.length);
	targets.sphere = buildSphereTargets(objects.length);
	targets.helix = buildHelixTargets(objects.length);
	targets.grid = buildGridTargets(objects.length);

	renderer = new CSS3DRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	container.appendChild(renderer.domElement);

	controls = new TrackballControls(camera, renderer.domElement);
	controls.minDistance = 500;
	controls.maxDistance = 8000;
	controls.addEventListener('change', render);

	window.addEventListener('resize', onWindowResize);

	// Draw once up front so tiles are on screen even before a transition runs.
	render();

	transform(targets.table, 2000);
	animate();
}

export function showLayout(name) {
	if (!started) return;
	transform(targets[name], 2000);
}

function transform(newTargets, duration) {
	tweens.removeAll();

	for (let i = 0; i < objects.length; i++) {
		const object = objects[i];
		const target = newTargets[i];

		new Tween(object.position, tweens)
			.to({ x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration)
			.easing(Easing.Exponential.InOut)
			.start();

		new Tween(object.rotation, tweens)
			.to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, Math.random() * duration + duration)
			.easing(Easing.Exponential.InOut)
			.start();
	}

	// Drives a redraw for the duration of the transition.
	new Tween({}, tweens)
		.to({}, duration * 2)
		.onUpdate(render)
		.start();
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

	render();
}

function animate() {
	requestAnimationFrame(animate);

	tweens.update();
	controls.update();
}

function render() {
	renderer.render(scene, camera);
}
