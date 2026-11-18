// The answers recorded from the API (test/contract) fit the types the client declares for them: node --test
// test/*.test.mjs (from packages/api, after `rollup -c`). Each fixture becomes a TypeScript check that assigns the
// recorded answer, each value typed as the literal it is, to the declared type, and tsc fails on a value the type
// does not allow or a required field the answer lacks. A field the type does not name passes: the API may answer
// more than the client declares.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { CONTRACT_ANSWERS, contractAnswer } from '../scripts/contract/answers.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const declarations = path.join(here, '..', 'dist', 'index.js').split(path.sep).join('/');

// The answers that do not fit the client's types yet, with what the recording found.
const KNOWN_DISAGREEMENTS = new Map([
	['members.list', 'endWork is absent; the user holds a few fields, and its timeFormat is a number'],
	['timeEntries.list', 'project, task, organizationContact... are null; the employee and its user hold a few fields']
]);

const fixtureOf = (name) => JSON.parse(fs.readFileSync(path.join(here, 'contract', `${name}.json`), 'utf8'));

// The type of a JSON value, each value as its literal: "TRACKED" stays "TRACKED", a list is a tuple of its items.
function literalTypeOf(value) {
	if (Array.isArray(value)) {
		return `[${value.map(literalTypeOf).join(', ')}]`;
	}
	if (typeof value === 'object' && value !== null) {
		const fields = Object.entries(value).map(([key, field]) => `${JSON.stringify(key)}: ${literalTypeOf(field)};`);
		return `{ ${fields.join(' ')} }`;
	}
	return JSON.stringify(value);
}

function checkSource(answerType, recorded) {
	return [
		`import type { EverTeamsClient } from '${declarations}';`,
		`type Recorded = ${literalTypeOf(recorded)};`,
		'declare const recorded: Recorded;',
		`export const answer: ${answerType} = recorded;`,
		''
	].join('\n');
}

const withoutField = (record, field) => {
	const copy = { ...record };
	delete copy[field];
	return copy;
};

// Two checks that must fail, so a check that passes says something: a value the type does not allow, and a
// required field missing.
function negativeChecks() {
	const start = contractAnswer('timer.start');
	const answer = fixtureOf('timer.start').answer;
	return [
		{ name: 'wrong-value', source: checkSource(start.answerType, { ...answer, isRunning: 'yes' }) },
		{ name: 'missing-field', source: checkSource(start.answerType, withoutField(answer, 'tenantId')) }
	];
}

let checkDir;
let diagnostics;

// `file(line,col): error TS....: message`, or `error TS....: message` for an error of no file (filed under `tsc`),
// then the lines that explain it, indented.
function diagnosticsByFile(output) {
	const byFile = new Map();
	let current = null;
	const start = (file, message) => {
		current = byFile.get(file) ?? [];
		current.push(message);
		byFile.set(file, current);
	};
	for (const line of output.split(/\r?\n/)) {
		const inFile = /^(.+?)\(\d+,\d+\): error (TS\d+: .*)$/.exec(line);
		const ofNoFile = /^error (TS\d+: .*)$/.exec(line);
		if (inFile) {
			start(path.basename(inFile[1]), inFile[2]);
		} else if (ofNoFile) {
			start('tsc', ofNoFile[1]);
		} else if (current && line.trim()) {
			current.push(line.trim());
		}
	}
	return byFile;
}

before(() => {
	assert.ok(fs.existsSync(path.join(here, '..', 'dist', 'index.d.ts')), 'build the package first: rollup -c');
	checkDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contract-types-'));
	const checks = CONTRACT_ANSWERS.map((contract) => ({
		name: contract.name,
		source: checkSource(contract.answerType, fixtureOf(contract.name).answer)
	}));
	const files = [...checks, ...negativeChecks()].map((check) => {
		const file = `${check.name}.check.ts`;
		fs.writeFileSync(path.join(checkDir, file), check.source);
		return file;
	});
	const tsconfig = {
		compilerOptions: {
			strict: true,
			noEmit: true,
			skipLibCheck: true,
			target: 'es2022',
			lib: ['es2022', 'dom'],
			module: 'esnext',
			moduleResolution: 'bundler',
			types: []
		},
		files
	};
	fs.writeFileSync(path.join(checkDir, 'tsconfig.json'), JSON.stringify(tsconfig));
	const tsc = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
	const run = spawnSync(process.execPath, [tsc, '-p', checkDir, '--pretty', 'false'], { encoding: 'utf8' });
	diagnostics = diagnosticsByFile(run.stdout);
});

after(() => {
	fs.rmSync(checkDir, { recursive: true, force: true });
});

for (const contract of CONTRACT_ANSWERS) {
	const todo = KNOWN_DISAGREEMENTS.get(contract.name);
	test(`${contract.name}: the recorded answer fits ${contract.answerType}`, { todo }, () => {
		assert.deepEqual(diagnostics.get(`${contract.name}.check.ts`) ?? [], []);
	});
}

test('the check fails on a recorded value the type does not allow', () => {
	const errors = diagnostics.get('wrong-value.check.ts') ?? [];

	assert.ok(errors.some((error) => error.startsWith('TS2322')));
	assert.ok(errors.some((error) => error.includes("'isRunning'")));
});

test('the check fails on a required field the recorded answer lacks', () => {
	const errors = diagnostics.get('missing-field.check.ts') ?? [];

	assert.ok(errors.some((error) => error.includes("'tenantId'")));
});

test('the check compiles: no error outside the checks, such as an import that does not resolve', () => {
	const checkFiles = [...CONTRACT_ANSWERS.map((contract) => contract.name), 'wrong-value', 'missing-field'];
	const others = [...diagnostics.keys()].filter((file) => !checkFiles.includes(file.replace(/\.check\.ts$/, '')));

	assert.deepEqual(others, []);
	for (const errors of diagnostics.values()) {
		assert.equal(
			errors.some((error) => error.startsWith('TS2307')),
			false
		);
	}
});
