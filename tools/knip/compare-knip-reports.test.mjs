import assert from 'node:assert/strict';
import test from 'node:test';

import { compareKnipReports } from './compare-knip-reports.mjs';

const issue = (file, values) => ({
	file,
	dependencies: [],
	devDependencies: [],
	optionalPeerDependencies: [],
	unlisted: [],
	binaries: [],
	unresolved: [],
	exports: [],
	types: [],
	enumMembers: {},
	duplicates: [],
	catalog: [],
	...values
});

test('does not report an existing finding in a changed file', () => {
	const base = { files: [], issues: [issue('src/a.ts', { exports: [{ name: 'oldExport', line: 2 }] })] };
	const head = { files: [], issues: [issue('src/a.ts', { exports: [{ name: 'oldExport', line: 20 }] })] };

	assert.deepEqual(compareKnipReports(base, head, ['apps/web/src/a.ts']), []);
});

test('reports new semantic findings in changed files', () => {
	const base = { files: [], issues: [issue('package.json', {})] };
	const head = {
		files: ['src/unused.ts'],
		issues: [
			issue('package.json', { unlisted: [{ name: 'missing-package', line: 10 }] }),
			issue('src/a.ts', { exports: [{ name: 'newExport', line: 4 }] })
		]
	};

	assert.deepEqual(
		compareKnipReports(base, head, ['apps/web/package.json', 'apps/web/src/a.ts', 'apps/web/src/unused.ts']),
		['unlisted: package.json -> missing-package', 'exports: src/a.ts -> newExport', 'file: src/unused.ts']
	);
});

test('ignores new findings in files outside the pull request', () => {
	const head = {
		files: ['src/old-unused.ts'],
		issues: [issue('src/old.ts', { types: [{ name: 'OldType' }] })]
	};

	assert.deepEqual(compareKnipReports({ files: [], issues: [] }, head, ['apps/web/src/new.ts']), []);
});

test('normalizes Windows paths and compares enum members semantically', () => {
	const base = {
		files: [],
		issues: [issue('src/status.ts', { enumMembers: { Status: [{ name: 'Existing', line: 3 }] } })]
	};
	const head = {
		files: [],
		issues: [
			issue('src/status.ts', {
				enumMembers: {
					Status: [
						{ name: 'Existing', line: 30 },
						{ name: 'Added', line: 31 }
					]
				}
			})
		]
	};

	assert.deepEqual(compareKnipReports(base, head, ['apps\\web\\src\\status.ts']), [
		'enumMembers: src/status.ts -> Status.Added'
	]);
});

test('uses stable object content when a finding has no name', () => {
	const base = { files: [], issues: [] };
	const head = {
		files: [],
		issues: [issue('src/a.ts', { duplicates: [{ symbol: 'duplicate', line: 8, pos: 100 }] })]
	};

	assert.deepEqual(compareKnipReports(base, head, ['src/a.ts']), ['duplicates: src/a.ts -> {"symbol":"duplicate"}']);
});
