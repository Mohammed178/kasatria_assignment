const SHEET_ID = import.meta.env.VITE_SHEET_ID;
const SHEET_RANGE = import.meta.env.VITE_SHEET_RANGE;
const API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export function parseNetWorth(raw) {
	return Number(String(raw).replace(/[$,\s]/g, ''));
}

export function colourFor(netWorth) {
	if (netWorth < 100000) return 'red';
	if (netWorth <= 200000) return 'orange';
	return 'green';
}

function toPerson(row) {
	const [name, photo, age, country, interest, netWorthRaw] = row;
	const netWorth = parseNetWorth(netWorthRaw);

	return {
		name,
		photo,
		age: Number(age),
		country,
		interest,
		netWorth,
		colour: colourFor(netWorth)
	};
}

async function callApi(path, accessToken) {
	const response = await fetch(`${API_BASE}/${SHEET_ID}${path}`, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});

	if (!response.ok) {
		throw new Error(`Sheets API ${response.status}: ${await response.text()}`);
	}

	return response.json();
}

// The tab name is not stable — it has been renamed at least once, and a wrong
// name surfaces as "Unable to parse range", which reads like a malformed A1
// string rather than a missing tab. Read the real name instead of assuming it.
export async function fetchTabTitles(accessToken) {
	const data = await callApi('?fields=sheets.properties.title', accessToken);
	return (data.sheets || []).map((sheet) => sheet.properties.title);
}

// Strip any tab prefix from the configured range, keeping only the A1 part.
function a1Part() {
	const bang = SHEET_RANGE.lastIndexOf('!');
	return bang === -1 ? SHEET_RANGE : SHEET_RANGE.slice(bang + 1);
}

export async function fetchPeople(accessToken) {
	if (!SHEET_ID || !SHEET_RANGE) {
		throw new Error('VITE_SHEET_ID or VITE_SHEET_RANGE is not set');
	}

	const titles = await fetchTabTitles(accessToken);

	if (titles.length === 0) {
		throw new Error('Spreadsheet has no tabs');
	}

	// Data lives on the first tab. Quotes make names with spaces valid A1 notation.
	const range = `'${titles[0]}'!${a1Part()}`;
	const data = await callApi(`/values/${encodeURIComponent(range)}`, accessToken);
	const values = data.values;

	if (!values || values.length === 0) {
		throw new Error(`Tab '${titles[0]}' returned no rows for range ${a1Part()}`);
	}

	// Row 0 is the header.
	const people = values.slice(1)
		.filter((row) => row && row[0])
		.map(toPerson);

	return { people, tabTitle: titles[0], allTabs: titles };
}
