import './style.css';
import { initAuth, requestAccessToken } from './auth.js';
import { fetchPeople } from './sheets.js';

const signinButton = document.getElementById('signin');
const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');

function setStatus(message, isError = false) {
	statusEl.textContent = message;
	statusEl.classList.toggle('error', isError);
}

function summarise(people) {
	const counts = { red: 0, orange: 0, green: 0 };
	for (const person of people) counts[person.colour]++;

	return `${people.length} people — ${counts.red} red / ${counts.orange} orange / ${counts.green} green`;
}

function renderList(people) {
	listEl.innerHTML = '';

	for (const person of people) {
		const item = document.createElement('li');
		item.className = person.colour;
		item.textContent = `${person.name} — ${person.age} — ${person.country} — ${person.interest} — $${person.netWorth.toLocaleString()}`;
		listEl.appendChild(item);
	}
}

async function signInAndLoad() {
	signinButton.disabled = true;

	try {
		setStatus('Requesting access…');
		const accessToken = await requestAccessToken();

		setStatus('Fetching sheet…');
		const { people, tabTitle, allTabs } = await fetchPeople(accessToken);

		renderList(people);
		setStatus(`Tab "${tabTitle}" (of: ${allTabs.join(', ')}) — ${summarise(people)}`);
	} catch (error) {
		setStatus(error.message, true);
	} finally {
		signinButton.disabled = false;
	}
}

try {
	await initAuth();
	signinButton.addEventListener('click', signInAndLoad);
	setStatus('Ready. Sign in to load the sheet.');
} catch (error) {
	setStatus(error.message, true);
	signinButton.disabled = true;
}
