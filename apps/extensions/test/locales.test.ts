import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

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

/** The keys the code names literally in `t('key')`; keys picked at run time (a refusal's) are checked through English. */
function keysNamedInCode(): Set<string> {
	const files = [
		...SOURCE_FOLDERS.flatMap((folder) => sourcesIn(new URL(`${folder}/`, ROOT))),
		...SOURCE_FILES.map((file) => new URL(file, ROOT))
	];
	const keys = new Set<string>();
	for (const file of files) {
		for (const match of readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'/g)) {
			keys.add(match[1]);
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
		for (const key of named) {
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
