// The dev scripts build the element only when it has no build yet: node --test test/*.test.mjs (from
// packages/toolkit/embed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildIfMissing } from '../scripts/build-if-missing.mjs';

function elementPath() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'embed-dist-'));
	return path.join(dir, 'ever-teams-embed.js');
}

function countingBuild(exitCode) {
	const build = () => {
		build.calls += 1;
		return exitCode;
	};
	build.calls = 0;
	return build;
}

test('an existing build is kept: nothing is built and the dev server starts at once', () => {
	const built = elementPath();
	fs.writeFileSync(built, '');
	const build = countingBuild(0);

	assert.equal(buildIfMissing({ built, build }), 0);
	assert.equal(build.calls, 0);
});

test('without a build, the element is built once and a failed build stops the dev script', () => {
	const built = elementPath();
	const build = countingBuild(2);

	assert.equal(buildIfMissing({ built, build }), 2);
	assert.equal(build.calls, 1);
});
