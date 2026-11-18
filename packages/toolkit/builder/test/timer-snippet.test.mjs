// The snippet the builder gives for <ever-teams-timer>: node --test test/*.test.mjs (from packages/toolkit/builder).
// esbuild compiles the module.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const esbuild = createRequire(import.meta.url)('esbuild');
let snippets;

before(async () => {
	const outfile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'timer-snippet-')), 'timer-snippet.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'libs', 'timer-snippet.ts')],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		outfile,
		logLevel: 'error'
	});
	snippets = await import(pathToFileURL(outfile).href);
});

test('the snippet is the script tag and the element, with only the attributes that differ from the defaults', () => {
	const snippet = snippets.timerSnippet({ apiUrl: 'https://api.example.com/api', colorScheme: 'system', lang: 'en' });

	assert.equal(
		snippet,
		'<script type="module" src="/ever-teams/ever-teams-embed.js"></script>\n' +
			'<ever-teams-timer api-url="https://api.example.com/api"></ever-teams-timer>'
	);
});

test('a chosen scheme and language become attributes', () => {
	const snippet = snippets.timerSnippet({ apiUrl: 'https://api.example.com/api', colorScheme: 'dark', lang: 'fr' });

	assert.match(
		snippet,
		/<ever-teams-timer api-url="https:\/\/api\.example\.com\/api" color-scheme="dark" lang="fr">/
	);
});

test('an empty API address gives the default one, and a typed one cannot break out of its attribute', () => {
	const empty = snippets.timerAttributes({ apiUrl: '  ', colorScheme: 'system', lang: 'en' });
	const typed = snippets.timerSnippet({ apiUrl: 'https://x"><script>', colorScheme: 'system', lang: 'en' });

	assert.equal(empty['api-url'], 'https://api.ever.team/api');
	assert.match(typed, /api-url="https:\/\/x&quot;&gt;&lt;script&gt;"/);
	assert.equal(typed.match(/<script/g).length, 1);
});

test('the preview runs against the builder API whatever address the person typed', () => {
	const options = { apiUrl: 'https://attacker.example.com/api', colorScheme: 'dark', lang: 'en' };

	assert.deepEqual(snippets.previewAttributes(options, 'https://api.builder.example.com/api'), {
		'api-url': 'https://api.builder.example.com/api',
		'color-scheme': 'dark'
	});
	assert.equal(snippets.previewAttributes(options, undefined)['api-url'], 'https://api.ever.team/api');
});
