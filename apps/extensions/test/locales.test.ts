import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { refusalOf, type ApiFailure } from '../lib/refusal.ts';
import { twoFactorRefusalOf } from '../lib/two-factor.ts';

// The message bundles the extension ships (`locales/<language>/messages.json`), checked against English and the code
const ROOT = new URL('../', import.meta.url);
const LOCALES = new URL('locales/', ROOT);
const SOURCE_FOLDERS = ['components', 'hooks', 'lib', 'misc', 'typescript'];
const SOURCE_FILES = ['background.ts', 'options.tsx', 'popup.tsx'];

type Bundle = Record<string, { message?: unknown }>;

function bundleOf(language: string): Bundle {
	return JSON.parse(readFileSync(new URL(`${language}/messages.json`, LOCALES), 'utf8')) as Bundle;
}

function sourcesIn(folder: URL): URL[] {
	const found: URL[] = [];
	for (const entry of readdirSync(folder, { withFileTypes: true })) {
		const isSource = entry.isFile() && /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.');
		if (entry.isDirectory()) {
			found.push(...sourcesIn(new URL(`${entry.name}/`, folder)));
		} else if (isSource) {
			found.push(new URL(entry.name, folder));
		}
	}
	return found;
}

// Where the code writes a key as a literal, in any quotes (a template literal without `${}` included): a call of t, a
// refusal's `key`, and the two keys of a sign-in button's label. labelWhile's first argument is read up to its comma:
// a plain name (`busy`) at every call site, and a call or expression in it would be read too while it has no comma.
const KEY = String.raw`(['"\x60])([A-Za-z0-9_]+)\1`;
const LITERAL_KEYS = [
	new RegExp(String.raw`\bt\(\s*${KEY}`, 'g'),
	new RegExp(String.raw`\bkey:\s*${KEY}`, 'g'),
	new RegExp(String.raw`\blabelWhile\([^,]+,\s*${KEY},\s*(['"\x60])([A-Za-z0-9_]+)\3`, 'g')
];

/**
 * The keys the code names as literals (see LITERAL_KEYS). A key the code builds or passes on through a variable is
 * not seen here: refusalOf's and twoFactorRefusalOf's are checked by calling them (refusalKeys), and any other one
 * only through the check that each language holds every English key.
 */
function keysNamedInCode(): Set<string> {
	const files = [
		...SOURCE_FOLDERS.flatMap((folder) => sourcesIn(new URL(`${folder}/`, ROOT))),
		...SOURCE_FILES.map((file) => new URL(file, ROOT))
	];
	const keys = new Set<string>();
	for (const file of files) {
		const source = readFileSync(file, 'utf8');
		for (const pattern of LITERAL_KEYS) {
			for (const match of source.matchAll(pattern)) {
				keys.add(match[2]);
				if (match[4]) {
					keys.add(match[4]);
				}
			}
		}
	}
	return keys;
}

/** The keys refusalOf and twoFactorRefusalOf pick at run time, from their maps and rules: every case they tell apart. */
function refusalKeys(): Set<string> {
	const fields = [undefined, [], ['projectId'], ['organizationTeamId'], ['organizationTeamId', 'projectId']];
	const failures: ApiFailure[] = [
		...[0, 400, 401, 403, 404, 408, 409, 422, 429, 500, 501].map((status) => ({ status })),
		{ status: 400, message: 'Task is archived' },
		{ status: 403, message: 'The time tracking functionality has been disabled for you.' },
		{ status: 422, code: 'DAILY_PLAN_REQUIRED' },
		{ status: 422, code: 'TASK_NOT_PLANNED' },
		...fields.map((list) => ({ status: 400, code: 'TRACKING_FIELD_REQUIRED', details: { fields: list } }))
	];
	const now = Date.parse('2026-11-16T12:00:00Z');
	const keys = new Set(failures.map((failure) => refusalOf(failure).key));
	for (const expiresAt of ['2026-11-16T12:05:00Z', '2026-11-16T11:55:00Z']) {
		for (const status of [400, 401, 429, 500]) {
			keys.add(twoFactorRefusalOf({ status }, expiresAt, now).key);
		}
	}
	return keys;
}

const languages = readdirSync(LOCALES, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name);
const english = bundleOf('en');

describe('the message bundles', () => {
	it('ship English and the other languages', () => {
		assert.ok(languages.includes('en'));
		assert.ok(languages.length > 1);
	});

	it('hold every key the code names, in English', () => {
		const named = keysNamedInCode();

		assert.ok(named.has('signInTwoFactorIncomplete'), 'the scan finds the keys of SignIn.tsx');
		assert.ok(named.has('signInSendCode'), "the scan finds a sign-in button's label");
		assert.ok(named.has('tasksEstimateInvalid'), "the scan finds a refusal's key");
		for (const key of named) {
			assert.ok(key in english, `en lacks ${key}`);
		}
	});

	it('hold every key a refusal picks at run time, in English', () => {
		const picked = refusalKeys();

		assert.ok(picked.has('refusalRequiredTeamAndProject'));
		assert.ok(picked.has('signInTwoFactorExpired'));
		for (const key of picked) {
			assert.ok(key in english, `en lacks ${key}`);
		}
	});

	it('hold every English key in each language, with a message', () => {
		for (const language of languages) {
			const bundle = bundleOf(language);
			for (const key of Object.keys(english)) {
				const message = bundle[key]?.message;
				assert.ok(typeof message === 'string' && message.trim() !== '', `${language} lacks ${key}`);
			}
		}
	});
});
