import './style.css';
import { initAuth, requestAccessToken, revokeAccessToken } from './auth.js';
import { fetchPeople } from './sheets.js';
import { initScene, showLayout, disposeScene } from './scene.js';
import { createDetailPanel } from './detail.js';

const LAYOUTS = ['table', 'sphere', 'helix', 'grid'];

const signinView = document.getElementById('signin-view');
const signinButton = document.getElementById('signin');
const signoutButton = document.getElementById('signout');
const statusEl = document.getElementById('status');
const sceneView = document.getElementById('scene-view');
const infoEl = document.getElementById('info');

// Built once, not per sign-in: the panel attaches a document-level key handler,
// and the layout buttons outlive any single session.
const detail = createDetailPanel(document.getElementById('detail'));

const confirmRoot = document.getElementById('confirm');

let accessToken = null;

// In-page confirmation rather than window.confirm: a native dialog blocks the
// whole page, including the render loop behind it.
function askConfirm() {
	return new Promise((resolve) => {
		const ok = document.getElementById('confirm-ok');
		const cancel = document.getElementById('confirm-cancel');

		const close = (answer) => {
			confirmRoot.hidden = true;
			ok.removeEventListener('click', onOk);
			cancel.removeEventListener('click', onCancel);
			document.removeEventListener('keydown', onKey);
			resolve(answer);
		};

		const onOk = () => close(true);
		const onCancel = () => close(false);
		const onKey = (event) => {
			if (event.key === 'Escape') close(false);
		};

		ok.addEventListener('click', onOk);
		cancel.addEventListener('click', onCancel);
		confirmRoot.querySelector('.confirm-backdrop').addEventListener('click', onCancel, { once: true });
		document.addEventListener('keydown', onKey);

		confirmRoot.hidden = false;
		cancel.focus();
	});
}

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

	initScene(document.getElementById('container'), people, detail.show);
}

async function signInAndLoad() {
	signinButton.disabled = true;

	try {
		setStatus('Requesting access…');
		accessToken = await requestAccessToken();

		setStatus('Fetching sheet…');
		const { people } = await fetchPeople(accessToken);

		startScene(people);
	} catch (error) {
		setStatus(error.message, true);
	} finally {
		// Always re-armed: a cancelled popup, a failed fetch, or a throw inside
		// startScene must all leave the button usable without a page reload.
		signinButton.disabled = false;
	}
}

async function signOut() {
	if (!(await askConfirm())) return;

	signoutButton.disabled = true;

	detail.hide();
	disposeScene();

	const token = accessToken;
	accessToken = null;

	try {
		await revokeAccessToken(token);
	} finally {
		document.body.classList.remove('scene-active');
		sceneView.hidden = true;
		signinView.hidden = false;
		infoEl.textContent = '';

		setStatus('');
		signinButton.disabled = false;
		signoutButton.disabled = false;
	}
}

for (const layout of LAYOUTS) {
	document.getElementById(layout).addEventListener('click', () => {
		detail.hide();
		showLayout(layout);
	});
}

signoutButton.addEventListener('click', signOut);

// `npm run dev` plus /?demo loads a generated dataset through the same
// startScene path, for checking the scene without a Google account. Vite
// inlines DEV as false for production, so this block and the import are dropped
// from the build.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) {
	const { demoPeople } = await import('./demoData.js');
	startScene(demoPeople());
} else {
	try {
		await initAuth();
		signinButton.addEventListener('click', signInAndLoad);
		setStatus('');
	} catch (error) {
		setStatus(error.message, true);
		signinButton.disabled = true;
	}
}
