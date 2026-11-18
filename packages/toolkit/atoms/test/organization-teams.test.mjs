// The timer's teams read follows the sign-in mode: node --test test/*.test.mjs (from packages/toolkit/atoms).
// esbuild bundles useOrganizationTeams with the API's teams read replaced by one that records what it is asked, and the
// teams context by a signed-in person; React renders it in jsdom.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const { JSDOM } = require('jsdom');
const lib = path.join(here, '..', 'src', 'lib');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const stubs = {
	'@ever-teams/api': `export const getOrganisationTeams = async (options) => {
			globalThis.__teamsReads.push(options);
			return { items: [], total: 0 };
		};`,
	'@ever-teams/toolkit-ui': 'export const toast = () => undefined;',
	'@lib/context/teams-context': `export const useTeamsContext = () => globalThis.__teamsContext;`
};
// The stub an import names: the alias has already turned an `@lib/...` import into a path ending the same way.
const stubOf = (importPath) => {
	const normalized = importPath.replace(/\\/g, '/');
	return Object.keys(stubs).find((name) => {
		const isLibModule = name.startsWith('@lib/');
		return normalized === name || (isLibModule && normalized.endsWith(name.slice('@lib'.length)));
	});
};

let React;
let act;
let createRoot;
let kit;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(here, '.organization-teams-'));
	const entry = path.join(bundleDir, 'entry.mjs');
	const source = lib.replace(/\\/g, '/');
	fs.writeFileSync(
		entry,
		`export { useOrganizationTeams } from '${source}/hooks/useOrganizationTeams.ts';
		export { KitOptionsProvider } from '${source}/components/teams-provider/kit-options.ts';`
	);
	const outfile = path.join(bundleDir, 'teams.mjs');
	await esbuild.build({
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		external: ['react', 'react/jsx-runtime'],
		alias: { '@components': path.join(lib, 'components'), '@lib': lib },
		plugins: [
			{
				name: 'stubs',
				setup(build) {
					build.onResolve({ filter: /.*/ }, (args) => {
						const stub = stubOf(args.path);
						if (stub === undefined) {
							return undefined;
						}
						return { path: stub, namespace: 'stub' };
					});
					build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
						contents: stubs[args.path],
						loader: 'js',
						resolveDir: here
					}));
				}
			}
		]
	});
	React = require('react');
	({ act } = React);
	({ createRoot } = require('react-dom/client'));
	kit = await import(pathToFileURL(outfile).href);
});

after(() => {
	if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

// What the timer's teams read asks, in a provider with or without the host's getToken
async function teamsReadIn({ hostSignIn }) {
	globalThis.__teamsReads = [];
	globalThis.__teamsContext = {
		authenticatedUser: { id: 'user-1', tenantId: 'tenant-1', employee: { id: 'employee-1' } },
		token: 'token',
		selectedOrganization: 'org-1'
	};
	const Teams = () => {
		kit.useOrganizationTeams({ projectId: null });
		return null;
	};
	const root = createRoot(document.createElement('div'));
	const options = { scoped: true, hostSignIn };
	await act(async () =>
		root.render(React.createElement(kit.KitOptionsProvider, { value: options }, React.createElement(Teams)))
	);
	await act(async () => root.unmount());
	return globalThis.__teamsReads;
}

test("with the host's getToken the teams read is the embedded one, which the API's embed guard accepts", async () => {
	const reads = await teamsReadIn({ hostSignIn: true });

	assert.equal(reads.length, 1);
	assert.equal(reads[0].embedded, true);
});

test('without getToken the teams read is the full one, as before', async () => {
	const reads = await teamsReadIn({ hostSignIn: false });

	assert.equal(reads.length, 1);
	assert.notEqual(reads[0].embedded, true);
});
