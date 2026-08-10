import { buildTableTargets, buildSphereTargets, buildHelixTargets, buildGridTargets, buildTetraTargets } from './src/layouts.js';

const N = 200;
const uniq = (arr) => [...new Set(arr.map((v) => Math.round(v * 1000) / 1000))];
const results = [];

function check(label, actual, expected) {
	const pass = String(actual) === String(expected);
	results.push(pass);
	console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}: ${actual}${pass ? '' : ` (expected ${expected})`}`);
}

const table = buildTableTargets(N);
console.log('--- Table: requirement 7, must be 20 x 10 ---');
check('distinct x (columns)', uniq(table.map((o) => o.position.x)).length, 20);
check('distinct y (rows)', uniq(table.map((o) => o.position.y)).length, 10);
check('all z are 0 (flat)', uniq(table.map((o) => o.position.z)).join(), '0');
check('x centred about 0', Math.round(Math.min(...table.map((o) => o.position.x)) + Math.max(...table.map((o) => o.position.x))), 0);
check('y centred about 0', Math.round(Math.min(...table.map((o) => o.position.y)) + Math.max(...table.map((o) => o.position.y))), 0);

const grid = buildGridTargets(N);
console.log('\n--- Grid: requirement 9, must be 5 x 4 x 10 ---');
check('distinct x (width)', uniq(grid.map((o) => o.position.x)).length, 5);
check('distinct y (height)', uniq(grid.map((o) => o.position.y)).length, 4);
check('distinct z (depth)', uniq(grid.map((o) => o.position.z)).length, 10);
check('every slot unique', new Set(grid.map((o) => `${o.position.x},${o.position.y},${o.position.z}`)).size, 200);

const helix = buildHelixTargets(N);
console.log('\n--- Helix: requirement 8, must be a DOUBLE helix ---');
const even = helix.filter((_, i) => i % 2 === 0);
const odd = helix.filter((_, i) => i % 2 === 1);
check('strand 0 length', even.length, 100);
check('strand 1 length', odd.length, 100);
// Partners share a height and sit on opposite sides: x and z both negate.
const pairOpposite = even.every((o, i) =>
	Math.abs(o.position.y - odd[i].position.y) < 0.001 &&
	Math.abs(o.position.x + odd[i].position.x) < 0.001 &&
	Math.abs(o.position.z + odd[i].position.z) < 0.001);
check('partners same height, opposite sides', pairOpposite, true);
check('strand 0 radius constant', uniq(even.map((o) => Math.hypot(o.position.x, o.position.z))).length, 1);

const sphere = buildSphereTargets(N);
console.log('\n--- Sphere: unchanged from demo ---');
check('all points on radius 800', uniq(sphere.map((o) => Math.round(Math.hypot(o.position.x, o.position.y, o.position.z)))).join(), '800');

const tetra = buildTetraTargets(N);
console.log('\n--- Pyramid: 4 triangular faces, 50 each ---');
check('every slot filled', tetra.filter(Boolean).length, 200);
// A face is a plane; tiles on it share one normal, so grouping by rotation
// recovers the faces without knowing the vertices here.
const byFacing = new Map();
for (const o of tetra) {
	const key = [o.rotation.x, o.rotation.y, o.rotation.z].map((v) => Math.round(v * 1000)).join();
	byFacing.set(key, (byFacing.get(key) ?? 0) + 1);
}
check('distinct facings (faces)', byFacing.size, 4);
check('tiles per face', [...byFacing.values()].join(), '50,50,50,50');
const radii = tetra.map((o) => Math.hypot(o.position.x, o.position.y, o.position.z));
check('all tiles inside the hull', Math.max(...radii) < 1700 * Math.sqrt(3 / 8), true);
const scales = tetra.map((o) => o.scale.x);
check('scales within [0.3, 1]', Math.min(...scales) >= 0.3 && Math.max(...scales) <= 1, true);
check('corner tiles shrunk, middle tiles not', Math.min(...scales) < 0.5 && Math.max(...scales) === 1, true);
check('scale is uniform', tetra.every((o) => o.scale.x === o.scale.y && o.scale.y === o.scale.z), true);

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
