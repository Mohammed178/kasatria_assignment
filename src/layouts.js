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

// Pyramid: regular tetrahedron, apex up, 50 people on each of the four
// triangular faces.
//
// 1700 puts ~160 between neighbours in both directions, which clears the
// 120 x 160 tile.
const TETRA_EDGE = 1700;
// Tiles are rectangles, so a full-size one at a triangle's corner hangs off
// both edges. Scale falls off with nearness to the nearest corner: full size
// until a tile is within CORNER_FALLOFF of one, then down to MIN_SCALE.
const TETRA_MIN_SCALE = 0.3;
const TETRA_CORNER_FALLOFF = 0.35;

// Bowling-pin rows: row r holds r + 1 tiles. 50 is not a triangular number, so
// take as many whole rows as fit (9, holding 45) and spread the 5 left over
// across them in proportion to row width, which keeps the spacing even.
function triangleRowCounts(count) {
	let rows = 1;
	while (((rows + 1) * (rows + 2)) / 2 <= count) rows++;

	const total = (rows * (rows + 1)) / 2;
	const counts = [];
	let placed = 0;

	for (let r = 0; r < rows; r++) {
		const upTo = Math.round((count * (r + 1) * (r + 2)) / (2 * total));
		counts.push(upTo - placed);
		placed = upTo;
	}

	return counts;
}

// Three base corners on a circle plus the apex, centred on the origin.
function tetrahedronVertices(edge) {
	const radius = edge * Math.sqrt(3 / 8);
	const baseRadius = (2 * Math.SQRT2 * radius) / 3;

	const base = [0, 1, 2].map((i) => {
		const angle = Math.PI / 2 + (i * 2 * Math.PI) / 3;
		return new THREE.Vector3(baseRadius * Math.cos(angle), -radius / 3, baseRadius * Math.sin(angle));
	});

	return [...base, new THREE.Vector3(0, radius, 0)];
}

export function buildTetraTargets(count) {
	const [v0, v1, v2, apex] = tetrahedronVertices(TETRA_EDGE);
	// Each face is [A, B, C], where C is the row apex and A-B the opposite edge.
	const faces = [[v0, v1, apex], [v1, v2, apex], [v2, v0, apex], [v0, v2, v1]];

	const targets = [];
	const centre = new THREE.Vector3();
	const normal = new THREE.Vector3();
	const edgeVector = new THREE.Vector3();
	const right = new THREE.Vector3();
	const up = new THREE.Vector3();
	const rowStart = new THREE.Vector3();
	const rowEnd = new THREE.Vector3();
	const basis = new THREE.Matrix4();

	for (let f = 0; f < faces.length; f++) {
		// Shared out rather than count / 4, so an incomplete dataset still fills
		// every face.
		const from = Math.floor((f * count) / faces.length);
		const perFace = Math.floor(((f + 1) * count) / faces.length) - from;
		if (perFace === 0) continue;

		const [cornerA, cornerB, c] = faces[f];
		let a = cornerA;
		let b = cornerB;

		normal.subVectors(b, a).cross(edgeVector.subVectors(c, a)).normalize();

		// Wind the face so the normal points away from the centre; otherwise its
		// tiles face into the pyramid and read upside down.
		centre.copy(a).add(b).add(c);
		if (normal.dot(centre) < 0) {
			[a, b] = [b, a];
			normal.negate();
		}

		right.subVectors(b, a).normalize();
		up.crossVectors(normal, right);
		basis.makeBasis(right, up, normal);

		const counts = triangleRowCounts(perFace);
		let index = from;

		for (let r = 0; r < counts.length; r++) {
			const t = (r + 0.5) / counts.length;
			rowStart.lerpVectors(c, a, t);
			rowEnd.lerpVectors(c, b, t);

			for (let j = 0; j < counts[r]; j++) {
				const u = (j + 0.5) / counts[r];

				const object = new THREE.Object3D();
				object.position.lerpVectors(rowStart, rowEnd, u);
				object.setRotationFromMatrix(basis);

				// Barycentric weights of the slot; the largest is how close it is to
				// the corner that weight belongs to.
				const corner = Math.max(1 - t, t * (1 - u), t * u);
				object.scale.setScalar(
					Math.min(1, Math.max(TETRA_MIN_SCALE, (1 - corner) / TETRA_CORNER_FALLOFF)));

				targets[index++] = object;
			}
		}
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
