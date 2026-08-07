import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

function initialsOf(name) {
	return String(name)
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0].toUpperCase())
		.join('');
}

function formatNetWorth(value) {
	return `$${Math.round(value).toLocaleString('en-US')}`;
}

function buildPhoto(person) {
	const photo = document.createElement('div');
	photo.className = 'photo';

	if (!person.photo) {
		photo.textContent = initialsOf(person.name);
		return photo;
	}

	const img = document.createElement('img');
	img.src = person.photo;
	img.alt = '';

	// Photos are hotlinked from static.kasatria.com; fall back to initials so a
	// 404 never leaves a broken image in the grid.
	img.addEventListener('error', () => {
		photo.textContent = initialsOf(person.name);
	});

	photo.appendChild(img);
	return photo;
}

function addLine(parent, className, text) {
	const line = document.createElement('div');
	line.className = className;
	line.textContent = text;
	parent.appendChild(line);
}

// Layout follows "Image B" in the brief: small labels in the top corners, the
// photo as the visual anchor, name and interest stacked below it.
export function createPersonTile(person) {
	const element = document.createElement('div');
	element.className = `element ${person.colour}`;

	addLine(element, 'age', person.age);
	addLine(element, 'country', person.country);
	element.appendChild(buildPhoto(person));
	addLine(element, 'name', person.name);
	addLine(element, 'interest', person.interest);
	addLine(element, 'worth', formatNetWorth(person.netWorth));

	return new CSS3DObject(element);
}
