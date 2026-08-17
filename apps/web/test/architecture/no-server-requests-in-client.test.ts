/**
 * Architecture guard: browser code must never import the server-only request helpers.
 *
 * `core/services/server/requests/*` is built on `serverFetch`, which targets GAUZY_API_SERVER_URL —
 * a SERVER env var. Inside the browser bundle that variable is undefined and the constant falls back
 * to the hard-coded production host, so a client component calling it silently talks to
 * https://api.ever.team no matter which environment it runs in. On 2026-08-17 that had two live
 * consequences on stage/dev: the Weekly Limit report sent the user's token to prod (401, empty page),
 * and the proactive token refresh posted refresh tokens to prod (401 → forced logout).
 *
 * Client code must go through core/services/client/** (runtime NEXT_PUBLIC base URL) instead.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const ROOT = join(__dirname, '..', '..');

// Directories that are (or contain) browser-side code.
const CLIENT_DIRS = ['core/hooks', 'core/components', 'core/stores', 'core/lib', 'app/[locale]'];

// The forbidden import targets. `services/server/fetch` (svgFetch) and `services/server/livekitroom`
// use relative/public URLs and are tolerated; the *requests* family and serverFetch itself are not.
const FORBIDDEN = [/@\/core\/services\/server\/requests(\/|['"])/, /services\/server\/requests(\/|['"])/, /serverFetch/];

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const st = statSync(full);
		if (st.isDirectory()) {
			if (entry === 'node_modules' || entry === '.next') continue;
			walk(full, out);
		} else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry) && !/\.d\.ts$/.test(entry)) {
			out.push(full);
		}
	}
	return out;
}

describe('client code does not import server-only request helpers', () => {
	const files = CLIENT_DIRS.flatMap((d) => walk(join(ROOT, d)));

	it('scans a meaningful number of files (sanity)', () => {
		expect(files.length).toBeGreaterThan(200);
	});

	it('finds no forbidden imports', () => {
		const offenders: string[] = [];
		for (const file of files) {
			// app/api/** are route handlers — server-side, allowed. (They live under app/api, not app/[locale].)
			const src = readFileSync(file, 'utf8');
			const importLines = src.split('\n').filter((l) => /^\s*import\s|require\(/.test(l));
			for (const line of importLines) {
				if (FORBIDDEN.some((re) => re.test(line))) {
					offenders.push(`${relative(ROOT, file).split(sep).join('/')}: ${line.trim()}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});
});
