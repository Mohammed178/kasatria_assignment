import * as THREE from 'three';
import { table } from './periodicTableData.js';

export function buildTableTargets() {
	const targets = [];

	for (let i = 0; i < table.length; i += 5) {
		const object = new THREE.Object3D();
		object.position.x = (table[i + 3] * 140) - 1330;
		object.position.y = -(table[i + 4] * 180) + 990;

		targets.push(object);
	}

	return targets;
}

export function buildSphereTargets(count) {
	const targets = [];
	const vector = new THREE.Vector3();

	for (let i = 0; i < count; i++) {
		const phi = Math.acos(-1 + (2 * i) / count);
		const theta = Math.sqrt(count * Math.PI) * phi;

		const object = new THREE.Object3D();
		object.position.setFromSphericalCoords(800, phi, theta);

		vector.copy(object.position).multiplyScalar(2);
		object.lookAt(vector);

		targets.push(object);
	}

	return targets;
}

export function buildHelixTargets(count) {
	const targets = [];
	const vector = new THREE.Vector3();

	for (let i = 0; i < count; i++) {
		const theta = i * 0.175 + Math.PI;
		const y = -(i * 8) + 450;

		const object = new THREE.Object3D();
		object.position.setFromCylindricalCoords(900, theta, y);

		vector.x = object.position.x * 2;
		vector.y = object.position.y;
		vector.z = object.position.z * 2;
		object.lookAt(vector);

		targets.push(object);
	}

	return targets;
}

export function buildGridTargets(count) {
	const targets = [];

	for (let i = 0; i < count; i++) {
		const object = new THREE.Object3D();
		object.position.x = ((i % 5) * 400) - 800;
		object.position.y = (-(Math.floor(i / 5) % 5) * 400) + 800;
		object.position.z = (Math.floor(i / 25)) * 1000 - 2000;

		targets.push(object);
	}

	return targets;
}
