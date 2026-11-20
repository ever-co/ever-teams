// The day windows the kit's statistics ask the API for (src/lib/utils/utils.ts): node --test test/*.test.mjs (from
// packages/toolkit-ui). esbuild bundles the module; each date is built in the zone the test runs in, as the browser's.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

let utils;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(here, '.day-windows-'));
	const outfile = path.join(bundleDir, 'utils.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'lib', 'utils', 'utils.ts')],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		mainFields: ['module', 'main'],
		outfile,
		logLevel: 'error'
	});
	utils = await import(pathToFileURL(outfile).href);
});

after(() => {
	if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

test('getStartAndEndOfDay keeps its window: the 24 hours before the call', () => {
	const call = new Date(2026, 10, 20, 7, 18, 53);

	assert.deepEqual(utils.getStartAndEndOfDay(call), {
		dayStart: '2026-11-19 07:18:53',
		dayEnd: '2026-11-20 07:18:53'
	});
});

test('getTodaySoFar asks for today since local midnight, as the web app does (#5585)', () => {
	assert.deepEqual(utils.getTodaySoFar(new Date(2026, 10, 20, 7, 18, 53)), {
		dayStart: '2026-11-20 00:00:00',
		dayEnd: '2026-11-20 07:18:53'
	});
	assert.deepEqual(utils.getTodaySoFar(new Date(2026, 10, 20, 0, 0, 30)), {
		dayStart: '2026-11-20 00:00:00',
		dayEnd: '2026-11-20 00:00:30'
	});
});
