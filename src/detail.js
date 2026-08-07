const FIELDS = [
	['Age', (person) => person.age],
	['Country', (person) => person.country],
	['Interest', (person) => person.interest],
	['Net worth', (person) => `$${Math.round(person.netWorth).toLocaleString('en-US')}`]
];

function initialsOf(name) {
	return String(name)
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0].toUpperCase())
		.join('');
}

function buildPhoto(person) {
	const photo = document.createElement('div');
	photo.className = 'detail-photo';

	if (!person.photo) {
		photo.textContent = initialsOf(person.name);
		return photo;
	}

	const img = document.createElement('img');
	img.src = person.photo;
	img.alt = person.name;
	img.addEventListener('error', () => {
		photo.textContent = initialsOf(person.name);
	});

	photo.appendChild(img);
	return photo;
}

function buildFields(person) {
	const list = document.createElement('dl');
	list.className = 'detail-fields';

	for (const [label, read] of FIELDS) {
		const term = document.createElement('dt');
		term.textContent = label;

		const value = document.createElement('dd');
		value.textContent = read(person);

		list.append(term, value);
	}

	return list;
}

// The pop-out starts life sitting exactly on top of the tile that was clicked,
// then grows to the centre of the screen: the tile itself appears to pop out.
// The tile is a CSS3D element, so its on-screen box already accounts for the
// scene's perspective and can be read straight off getBoundingClientRect.
function transformFrom(tile, card) {
	if (!tile) return 'scale(0.85)';

	const from = tile.getBoundingClientRect();
	const to = card.getBoundingClientRect();

	if (!from.width || !to.width) return 'scale(0.85)';

	const dx = from.left + from.width / 2 - (to.left + to.width / 2);
	const dy = from.top + from.height / 2 - (to.top + to.height / 2);

	return `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`;
}

export function createDetailPanel(root) {
	const card = root.querySelector('.detail-card');
	const body = root.querySelector('.detail-body');
	let lastFocused = null;
	let closeTimer = null;

	function hide() {
		if (root.hidden) return;

		// Shrink back into the tile it came from before leaving the DOM.
		card.classList.remove('is-open');
		root.classList.remove('is-open');
		card.style.transform = card.dataset.from || 'scale(0.85)';

		clearTimeout(closeTimer);
		closeTimer = setTimeout(() => {
			root.hidden = true;
			body.replaceChildren();
		}, 280);

		if (lastFocused) {
			lastFocused.focus();
			lastFocused = null;
		}
	}

	function show(person, tile) {
		clearTimeout(closeTimer);
		lastFocused = document.activeElement;

		card.className = `detail-card ${person.colour}`;

		const name = document.createElement('h2');
		name.className = 'detail-name';
		name.textContent = person.name;

		body.replaceChildren(buildPhoto(person), name, buildFields(person));

		// Measure with the card laid out but still invisible, so the starting
		// transform can be worked out from its real size. Transitions are off
		// for this step: only the move to the centre should animate.
		card.style.transition = 'none';
		card.style.transform = 'none';
		root.hidden = false;

		const from = transformFrom(tile, card);
		card.dataset.from = from;
		card.style.transform = from;

		void card.offsetWidth;
		card.style.transition = '';

		// Next frame, so the transition runs from the collapsed state.
		requestAnimationFrame(() => {
			card.classList.add('is-open');
			root.classList.add('is-open');
			card.style.transform = 'translate(0px, 0px) scale(1)';
		});

		root.querySelector('.detail-close').focus();
	}

	root.querySelector('.detail-close').addEventListener('click', hide);
	root.querySelector('.detail-backdrop').addEventListener('click', hide);

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') hide();
	});

	return { show, hide };
}
