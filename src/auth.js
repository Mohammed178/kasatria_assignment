const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

let tokenClient = null;

// GIS error types, mapped to something a user can act on.
const ERROR_MESSAGES = {
	popup_closed: 'Sign-in was cancelled. Click the button to try again.',
	popup_failed_to_open: 'The sign-in popup was blocked. Allow popups for this site, then try again.'
};

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
		callback: () => {},
		error_callback: () => {}
	});
}

export function requestAccessToken() {
	return new Promise((resolve, reject) => {
		// Both handlers are replaced on every request, and either one can fire
		// first, so settle once and ignore the rest.
		let settled = false;

		const settle = (action, value) => {
			if (settled) return;
			settled = true;
			action(value);
		};

		tokenClient.callback = (response) => {
			if (response.error) {
				settle(reject, new Error(response.error_description || response.error));
				return;
			}

			settle(resolve, response.access_token);
		};

		// A dismissed or blocked popup is reported here, never through
		// `callback`. Without this the promise would never settle, leaving the
		// sign-in button disabled until a full page reload.
		tokenClient.error_callback = (error) => {
			const message = ERROR_MESSAGES[error?.type] || error?.message || 'Sign-in failed. Try again.';
			settle(reject, new Error(message));
		};

		// `select_account` makes the chooser appear every time, so signing out
		// and back in can land on a different account. Google still shows the
		// consent screen on the first grant.
		tokenClient.requestAccessToken({ prompt: 'select_account' });
	});
}

// Drops the granted scope as well as the token, so the next sign-in is a clean
// one rather than a silent re-grant to the same account.
export function revokeAccessToken(accessToken) {
	return new Promise((resolve) => {
		if (!accessToken) {
			resolve();
			return;
		}

		window.google.accounts.oauth2.revoke(accessToken, resolve);
	});
}
