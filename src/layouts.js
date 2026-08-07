import * as THREE from 'three';

// Requirements 7-9 override the demo's defaults: the table is 20 x 10, the
// helix is a double helix, and the grid is 5 x 4 x 10. With exactly 200 people
// the table and grid both fill completely.

const TABLE_COLUMNS = 20;
const TABLE_COLUMN_SPACING = 140;
const TABLE_ROW_SPACING = 180;

const SPHERE_RADIUS = 800;

// Tuned so the two strands stay legible: ~2.5 turns over the full height, which
// leaves a clear gap between successive turns of one strand for the other
// strand to sit in. Tighter twisting packs the tiles into an unreadable
// cylinder; more rise pushes the ends off screen.
const HELIX_RADIUS = 900;
const HELIX_TWIST = 0.16;       // radians advanced per step along one strand
const HELIX_RISE = 13;          // vertical spacing per step along one strand

const GRID_COLUMNS = 5;
const GRID_ROWS = 4;
const GRID_SPACING = 400;
// 10 layers at the demo's 1000 spacing would be 9000 deep, which swallows the
// camera. 400 keeps the whole block in front of it while still separating the
// layers clearly.
const GRID_DEPTH_SPACING = 400;

// Table: flat 20 x 10 wall. The demo read hardcoded periodic-table
// coordinates, which is what produced its characteristic gaps; position is
// derived from the index instead.
export function buildTableTargets(count) {
	const targets = [];
	const xOffset = ((TABLE_COLUMNS - 1) * TABLE_COLUMN_SPACING) / 2;
	const rows = Math.ceil(count / TABLE_COLUMNS);
	const yOffset = ((rows - 1) * TABLE_ROW_SPACING) / 2;

	for (let i = 0; i < count; i++) {
		const column = i % TABLE_COLUMNS;
		const row = Math.floor(i / TABLE_COLUMNS);

		const object = new THREE.Object3D();
		object.position.x = (column * TABLE_COLUMN_SPACING) - xOffset;
		object.position.y = -(row * TABLE_ROW_SPACING) + yOffset;
		object.position.z = 0;

		targets.push(object);
	}

	return targets;
}

// Sphere: unchanged from the demo, per the brief.
export function buildSphereTargets(count) {
	const targets = [];
	const vector = new THREE.Vector3();

	for (let i = 0; i < count; i++) {
		const phi = Math.acos(-1 + (2 * i) / count);
		const theta = Math.sqrt(count * Math.PI) * phi;

		const object = new THREE.Object3D();
		object.position.setFromSphericalCoords(SPHERE_RADIUS, phi, theta);

		// Turn each tile to face away from the centre.
		vector.copy(object.position).multiplyScalar(2);
		object.lookAt(vector);

		targets.push(object);
	}

	return targets;
}

// Helix: DOUBLE. The demo winds every tile onto one strand. Alternating
// people between two strands and offsetting the second by half a turn puts
// each pair at the same height on opposite sides of the axis, which is what
// makes the two strands read as intertwined rather than as unrelated spirals.
export function buildHelixTargets(count) {
	const targets = [];
	const vector = new THREE.Vector3();
	const steps = Math.ceil(count / 2);
	const yOffset = ((steps - 1) * HELIX_RISE) / 2;

	for (let i = 0; i < count; i++) {
		const strand = i % 2;
		const step = Math.floor(i / 2);

		const theta = (step * HELIX_TWIST) + Math.PI + (strand * Math.PI);
		const y = -(step * HELIX_RISE) + yOffset;

		const object = new THREE.Object3D();
		object.position.setFromCylindricalCoords(HELIX_RADIUS, theta, y);

		// Face outward from the vertical axis, not from the origin.
		vector.x = object.position.x * 2;
		vector.y = object.position.y;
		vector.z = object.position.z * 2;
		object.lookAt(vector);

		targets.push(object);
	}

	return targets;
}

// Grid: 5 wide x 4 high x 10 deep. The demo is 5 x 5 x 5; the divisors below
// are what change it. 200 people fill exactly 10 layers of 20.
export function buildGridTargets(count) {
	const targets = [];
	const perLayer = GRID_COLUMNS * GRID_ROWS;
	const layers = Math.ceil(count / perLayer);

	const xOffset = ((GRID_COLUMNS - 1) * GRID_SPACING) / 2;
	const yOffset = ((GRID_ROWS - 1) * GRID_SPACING) / 2;
	const zOffset = ((layers - 1) * GRID_DEPTH_SPACING) / 2;

	for (let i = 0; i < count; i++) {
		const object = new THREE.Object3D();
		object.position.x = ((i % GRID_COLUMNS) * GRID_SPACING) - xOffset;
		object.position.y = -((Math.floor(i / GRID_COLUMNS) % GRID_ROWS) * GRID_SPACING) + yOffset;
		object.position.z = ((Math.floor(i / perLayer)) * GRID_DEPTH_SPACING) - zOffset;

		targets.push(object);
	}

	return targets;
}
