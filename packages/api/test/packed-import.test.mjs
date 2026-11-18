// The packed package installs in an empty project and loads in ESM and CommonJS: node --test test/*.test.mjs (from
// packages/api, after building packages/toolkit-types and this package). npm packs both packages and installs the
// two tarballs with --offline into a new project; qs is linked from the monorepo's node_modules, so the install asks
// nothing of the registry or of npm's cache. Each import then starts a timer through a stand-in fetch.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const packages = path.join(here, '..', '..');
const apiDir = path.join(packages, 'api');
const typesDir = path.join(packages, 'toolkit-types');

let workDir;
let projectDir;

// npm's own script next to the running node (Windows, then POSIX layouts); else `npm` through the shell.
const npmCommand = () => {
	const nodeDir = path.dirname(process.execPath);
	const candidates = [
		path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
		path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')
	];
	const script = candidates.find((candidate) => fs.existsSync(candidate));
	if (script) {
		return { command: process.execPath, prefix: [script], shell: false };
	}
	return { command: 'npm', prefix: [], shell: true };
};

// Through a shell, an argument with a space stays one argument.
const argsFor = (args, shell) => {
	if (!shell) {
		return args;
	}
	return args.map((arg) => `"${arg}"`);
};

const run = (command, args, cwd, shell = false) => {
	const result = spawnSync(command, argsFor(args, shell), { cwd, encoding: 'utf8', shell });
	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
	}
	return result.stdout;
};

const npm = (args, cwd) => {
	const { command, prefix, shell } = npmCommand();
	return run(command, [...prefix, ...args], cwd, shell);
};

const pack = (dir) => {
	assert.ok(fs.existsSync(path.join(dir, 'dist')), `build ${path.basename(dir)} first: rollup -c`);
	const output = npm(['pack', '--ignore-scripts', '--json', '--pack-destination', workDir], dir);
	const [packed] = JSON.parse(output);
	return path.join(workDir, packed.filename);
};

// Starts a timer the way a script does, against a stand-in fetch, and prints what it sent and got.
const SCRIPT = `
const answers = {
	'GET /api/user/me': { tenantId: 'tenant-1', employee: { id: 'employee-1', organizationId: 'org-1' } },
	'POST /api/timesheet/timer/start': { id: 'log-1', isRunning: true }
};
const fetch = async (url, init) => {
	const route = init.method + ' ' + new URL(url).pathname;
	return new Response(JSON.stringify(answers[route]), { status: 200 });
};
const teams = api.createClient({ apiUrl: 'https://api.example.com/api', token: 'access', fetch });
teams.timer.start({ projectId: 'project-1' }).then((log) => {
	console.log(JSON.stringify({
		createClient: typeof api.createClient,
		error: typeof api.EverTeamsError,
		getTimerStatus: typeof api.getTimerStatus,
		apiConfigManager: typeof api.apiConfigManager,
		log
	}));
});
`;

const loaded = (output) => JSON.parse(output.trim().split('\n').pop());

before(() => {
	workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'packed-import-'));
	projectDir = path.join(workDir, 'project');
	fs.mkdirSync(projectDir);
	fs.writeFileSync(
		path.join(projectDir, 'package.json'),
		JSON.stringify({ name: 'packed-import-check', version: '1.0.0', private: true })
	);
	const typesTarball = pack(typesDir);
	const apiTarball = pack(apiDir);
	const qsDir = path.dirname(require.resolve('qs/package.json', { paths: [apiDir] }));
	npm(
		[
			'install',
			'--offline',
			'--cache',
			path.join(workDir, 'npm-cache'),
			'--no-audit',
			'--no-fund',
			'--no-update-notifier',
			'--ignore-scripts',
			'--no-package-lock',
			typesTarball,
			apiTarball,
			`file:${qsDir}`
		],
		projectDir
	);
});

after(() => {
	fs.rmSync(workDir, { recursive: true, force: true });
});

const expected = {
	createClient: 'function',
	error: 'function',
	getTimerStatus: 'function',
	apiConfigManager: 'object',
	log: { id: 'log-1', isRunning: true }
};

test('the installed package is imported as ESM and starts a timer', () => {
	const output = run(
		process.execPath,
		['--input-type=module', '-e', `import * as api from '@ever-teams/api';\n${SCRIPT}`],
		projectDir
	);

	assert.deepEqual(loaded(output), expected);
});

test('the installed package is required as CommonJS and starts a timer', () => {
	const output = run(process.execPath, ['-e', `const api = require('@ever-teams/api');\n${SCRIPT}`], projectDir);

	assert.deepEqual(loaded(output), expected);
});

test('the installed package holds its builds and declarations, and no source', () => {
	const installed = path.join(projectDir, 'node_modules', '@ever-teams', 'api');
	const files = fs.readdirSync(installed, { recursive: true }).map((file) => file.split(path.sep).join('/'));

	assert.ok(files.includes('dist/index.es.js'));
	assert.ok(files.includes('dist/index.cjs'));
	assert.ok(files.includes('dist/index.d.ts'));
	assert.ok(files.includes('dist/cjs/index.d.ts'));
	assert.ok(files.every((file) => !file.startsWith('src/')));
});
