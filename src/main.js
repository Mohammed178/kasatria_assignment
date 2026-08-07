import './style.css';
import { initAuth, requestAccessToken } from './auth.js';
import { fetchPeople } from './sheets.js';
import { initScene, showLayout } from './scene.js';

const LAYOUTS = ['table', 'sphere', 'helix', 'grid'];

const signinView = document.getElementById('signin-view');
const signinButton = document.getElementById('signin');
const statusEl = document.getElementById('status');
const sceneView = document.getElementById('scene-view');
const infoEl = document.getElementById('info');

function setStatus(message, isError = false) {
	statusEl.textContent = message;
	statusEl.classList.toggle('error', isError);
}

function summarise(people) {
	const counts = { red: 0, orange: 0, green: 0 };
	for (const person of people) counts[person.colour]++;

	return `${people.length} people: ${counts.red} red / ${counts.orange} orange / ${counts.green} green`;
}

function startScene(people) {
	setStatus('');
	signinView.hidden = true;
	sceneView.hidden = false;
	document.body.classList.add('scene-active');

	infoEl.textContent = summarise(people);

	initScene(document.getElementById('container'), people);

	for (const layout of LAYOUTS) {
		document.getElementById(layout).addEventListener('click', () => showLayout(layout));
	}
}

async function signInAndLoad() {
	signinButton.disabled = true;

	try {
		setStatus('Requesting access…');
		const accessToken = await requestAccessToken();

		setStatus('Fetching sheet…');
		const { people } = await fetchPeople(accessToken);

		startScene(people);
	} catch (error) {
		setStatus(error.message, true);
		signinButton.disabled = false;
	}
}

try {
	await initAuth();
	signinButton.addEventListener('click', signInAndLoad);
	setStatus('');
} catch (error) {
	setStatus(error.message, true);
	signinButton.disabled = true;
}
