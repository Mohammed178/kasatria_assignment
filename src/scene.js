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
let frameId = null;

const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };

// Undo functions for everything initScene attaches outside its own DOM, so
// signing out can put the page back the way it found it.
const cleanups = [];

// Pointer travel beyond this is treated as a camera drag, not a tile click.
const CLICK_SLOP = 5;

export function initScene(container, people, onSelect) {
	// Runs after an async fetch, so guard against a second call.
	if (started) return;
	started = true;

	// Far enough back that the deepest layout (the grid) sits entirely in front
	// of the camera, and wide enough for the 20 column table.
	camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
	camera.position.z = 4000;

	scene = new THREE.Scene();

	people.forEach((person, index) => {
		const objectCSS = createPersonTile(person);
		objectCSS.element.dataset.index = index;
		objectCSS.position.x = Math.random() * 4000 - 2000;
		objectCSS.position.y = Math.random() * 4000 - 2000;
		objectCSS.position.z = Math.random() * 4000 - 2000;
		scene.add(objectCSS);

		objects.push(objectCSS);
	});

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
	cleanups.push(() => window.removeEventListener('resize', onWindowResize));

	if (onSelect) {
		listenForTileClicks(container, people, onSelect);
	}

	// Draw once up front so tiles are on screen even before a transition runs.
	render();

	transform(targets.table, 2000);
	animate();
}

export function showLayout(name) {
	if (!started) return;
	transform(targets[name], 2000);
}

// Signing out returns to the sign-in card, and signing back in calls initScene
// again with a different dataset. Without this the `started` guard would make
// that second call a no-op, and the previous 200 tiles would still be on
// screen. Everything built in initScene is torn down here.
export function disposeScene() {
	if (!started) return;
	started = false;

	cancelAnimationFrame(frameId);
	frameId = null;

	tweens.removeAll();

	for (const undo of cleanups.splice(0)) undo();

	controls.dispose();
	renderer.domElement.remove();

	for (const object of objects) scene.remove(object);
	objects.length = 0;

	for (const name of Object.keys(targets)) targets[name] = [];

	camera = scene = renderer = controls = undefined;
}

// One delegated listener rather than 200. TrackballControls shares these
// events, so a pointer that travelled is a camera drag and must not open a
// tile.
function listenForTileClicks(container, people, onSelect) {
	let startX = 0;
	let startY = 0;
	let downTile = null;

	const onPointerDown = (event) => {
		startX = event.clientX;
		startY = event.clientY;
		downTile = event.target.closest?.('.element') || null;
	};

	const onPointerUp = (event) => {
		const pressedTile = downTile;
		downTile = null;

		const travelled = Math.abs(event.clientX - startX) > CLICK_SLOP
			|| Math.abs(event.clientY - startY) > CLICK_SLOP;

		if (travelled) return;

		// `event.target` is useless here: TrackballControls calls
		// setPointerCapture on the renderer element in its own pointerdown
		// handler, which retargets every later pointer event in the sequence to
		// that element. Hit test the release point instead, and fall back to
		// whatever the press landed on.
		const released = document.elementFromPoint(event.clientX, event.clientY);
		const tile = released?.closest?.('.element') || pressedTile;

		if (!tile) return;

		onSelect(people[Number(tile.dataset.index)], tile);
	};

	container.addEventListener('pointerdown', onPointerDown);
	container.addEventListener('pointerup', onPointerUp);

	cleanups.push(() => {
		container.removeEventListener('pointerdown', onPointerDown);
		container.removeEventListener('pointerup', onPointerUp);
	});
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
	frameId = requestAnimationFrame(animate);

	tweens.update();
	controls.update();
}

function render() {
	renderer.render(scene, camera);
}
