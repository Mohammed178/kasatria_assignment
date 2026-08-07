import { colourFor } from './sheets.js';

const COUNTRIES = ['Malaysia', 'Japan', 'Brazil', 'Kenya', 'Norway'];
const INTERESTS = ['Chess', 'Diving', 'Coding', 'Cooking', 'Cycling'];

// Stand-in dataset for `?demo` in dev, so the scene, the tile pop-out and the
// sign-out flow can be exercised without a Google account. Never bundled: the
// only import site is behind `import.meta.env.DEV`, which Vite replaces with
// `false` in a production build.
export function demoPeople(count = 200) {
	return Array.from({ length: count }, (_, i) => {
		const netWorth = 20000 + i * 1800;

		return {
			name: `Demo Person ${i + 1}`,
			photo: '',
			age: 20 + (i % 45),
			country: COUNTRIES[i % COUNTRIES.length],
			interest: INTERESTS[i % INTERESTS.length],
			netWorth,
			colour: colourFor(netWorth)
		};
	});
}
