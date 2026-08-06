import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { table } from './periodicTableData.js';
import { createElementTile } from './tile.js';
import { buildTableTargets, buildSphereTargets, buildHelixTargets, buildGridTargets } from './layouts.js';

let camera, scene, renderer, controls;
const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };

export function initScene(container) {
	camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
	camera.position.z = 3000;

	scene = new THREE.Scene();

	for (let i = 0, j = 0; i < table.length; i += 5, j++) {
		const objectCSS = createElementTile(table[i], table[i + 1], table[i + 2], j + 1);
		objectCSS.position.x = Math.random() * 4000 - 2000;
		objectCSS.position.y = Math.random() * 4000 - 2000;
		objectCSS.position.z = Math.random() * 4000 - 2000;
		scene.add(objectCSS);

		objects.push(objectCSS);
	}

	targets.table = buildTableTargets();
	targets.sphere = buildSphereTargets(objects.length);
	targets.helix = buildHelixTargets(objects.length);
	targets.grid = buildGridTargets(objects.length);

	renderer = new CSS3DRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	container.appendChild(renderer.domElement);

	controls = new TrackballControls(camera, renderer.domElement);
	controls.minDistance = 500;
	controls.maxDistance = 6000;
	controls.addEventListener('change', render);

	window.addEventListener('resize', onWindowResize);

	transform(targets.table, 2000);
	animate();
}

export function showLayout(name) {
	transform(targets[name], 2000);
}

function transform(newTargets, duration) {
	TWEEN.removeAll();

	for (let i = 0; i < objects.length; i++) {
		const object = objects[i];
		const target = newTargets[i];

		new TWEEN.Tween(object.position)
			.to({ x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration)
			.easing(TWEEN.Easing.Exponential.InOut)
			.start();

		new TWEEN.Tween(object.rotation)
			.to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, Math.random() * duration + duration)
			.easing(TWEEN.Easing.Exponential.InOut)
			.start();
	}

	new TWEEN.Tween({})
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

	TWEEN.update();
	controls.update();
}

function render() {
	renderer.render(scene, camera);
}
