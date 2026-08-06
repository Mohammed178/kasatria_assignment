const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

let tokenClient = null;

function loadGisScript() {
	return new Promise((resolve, reject) => {
		if (window.google?.accounts?.oauth2) {
			resolve();
			return;
		}

		const script = document.createElement('script');
		script.src = GIS_SRC;
		script.async = true;
		script.onload = resolve;
		script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
		document.head.appendChild(script);
	});
}

export async function initAuth() {
	if (!CLIENT_ID) {
		throw new Error('VITE_GOOGLE_CLIENT_ID is not set');
	}

	await loadGisScript();

	// Token model: origins-only client, no redirect URIs. See PROJECT.md §0 constraint 4.
	tokenClient = window.google.accounts.oauth2.initTokenClient({
		client_id: CLIENT_ID,
		scope: SCOPE,
		callback: () => {}
	});
}

export function requestAccessToken() {
	return new Promise((resolve, reject) => {
		tokenClient.callback = (response) => {
			if (response.error) {
				reject(new Error(response.error_description || response.error));
				return;
			}

			resolve(response.access_token);
		};

		tokenClient.requestAccessToken();
	});
}
