// The packed package installs in an empty project and loads in ESM and CommonJS: node --test test/*.test.mjs (from
// packages/api, after building packages/toolkit-types and this package). npm packs both packages and installs the
// two tarballs with --offline into a new project; qs is linked from the monorepo's node_modules, so the install asks
// nothing of the registry or of npm's cache. Each import then starts a timer through a stand-in fetch. The server
// entry (@ever-teams/api/server) loads the same way and exchanges a credential; under the browser condition, Node,
// esbuild and webpack's resolver refuse it, and TypeScript finds its types under each module resolution.
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
const esbuild = require('esbuild');
// The resolver webpack itself loads (webpack is a dependency of the monorepo; enhanced-resolve is webpack's).
const webpackDir = path.dirname(require.resolve('webpack/package.json'));
const { CachedInputFileSystem, ResolverFactory } = require(
	require.resolve('enhanced-resolve', { paths: [webpackDir] })
);
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

// Exchanges a credential through a stand-in fetch, then meets a refusal, as a host's server does.
const SERVER_SCRIPT = `
const answers = [
	{ status: 200, body: { token: 'embed-token', expiresAt: '2026-11-18T18:15:00.000Z' } },
	{ status: 403, body: { statusCode: 403, code: 'EMBED_MEMBER_NOT_ALLOWED', message: 'Not a member.' } }
];
const sent = [];
const fetch = async (url, init) => {
	sent.push({ url, body: JSON.parse(init.body) });
	const answer = answers[sent.length - 1];
	return new Response(JSON.stringify(answer.body), { status: answer.status });
};
const options = {
	apiUrl: 'https://api.example.com/api',
	credential: 'gze_packed',
	email: 'lina@example.com',
	origin: 'https://app.example.com',
	fetch
};
server.exchangeEmbedToken(options).then(async (answer) => {
	const refusal = await server.exchangeEmbedToken(options).catch((error) => error);
	console.log(JSON.stringify({
		answer,
		url: sent[0].url,
		getClientReport: typeof server.getClientReport,
		code: refusal.code,
		isForbiddenError: refusal instanceof api.EverTeamsForbiddenError
	}));
});
`;

const expectedServer = {
	answer: { token: 'embed-token', expiresAt: '2026-11-18T18:15:00.000Z' },
	url: 'https://api.example.com/api/embed/token',
	getClientReport: 'function',
	code: 'EMBED_MEMBER_NOT_ALLOWED',
	isForbiddenError: true
};

test('the server entry is imported as ESM, exchanges a credential and throws the main entry errors', () => {
	const imports = "import * as server from '@ever-teams/api/server';\nimport * as api from '@ever-teams/api';";
	const output = run(process.execPath, ['--input-type=module', '-e', `${imports}\n${SERVER_SCRIPT}`], projectDir);

	assert.deepEqual(loaded(output), expectedServer);
});

test('the server entry is required as CommonJS, exchanges a credential and throws the main entry errors', () => {
	const requires = "const server = require('@ever-teams/api/server');\nconst api = require('@ever-teams/api');";
	const output = run(process.execPath, ['-e', `${requires}\n${SERVER_SCRIPT}`], projectDir);

	assert.deepEqual(loaded(output), expectedServer);
});

test('Node refuses the server entry under the browser condition, in ESM and CommonJS', () => {
	const esm = run(
		process.execPath,
		[
			'--conditions=browser',
			'--input-type=module',
			'-e',
			"import('@ever-teams/api/server').then(() => console.log('loaded'), (error) => console.log(error.code));"
		],
		projectDir
	);
	const cjs = run(
		process.execPath,
		[
			'--conditions=browser',
			'-e',
			"try { require('@ever-teams/api/server'); console.log('loaded'); } catch (error) { console.log(error.code); }"
		],
		projectDir
	);

	assert.equal(esm.trim(), 'ERR_PACKAGE_PATH_NOT_EXPORTED');
	assert.equal(cjs.trim(), 'ERR_PACKAGE_PATH_NOT_EXPORTED');
});

// esbuild, as the bundler of a page, then of a server, a Cloudflare Worker (wrangler's conditions) and a Next.js edge
// route, which also name the browser condition.
const bundleServerEntry = (options) =>
	esbuild.build({
		stdin: {
			contents: "import { exchangeEmbedToken } from '@ever-teams/api/server';\nconsole.log(exchangeEmbedToken);",
			resolveDir: projectDir
		},
		bundle: true,
		write: false,
		logLevel: 'silent',
		...options
	});

test('a page bundle refuses the server entry, and a server, worker or edge bundle takes it (esbuild)', async () => {
	const page = await bundleServerEntry({ platform: 'browser' }).then(
		() => assert.fail('the server entry went into a page bundle'),
		(error) => error
	);
	const node = await bundleServerEntry({ platform: 'node', format: 'esm' });
	const worker = await bundleServerEntry({ platform: 'browser', conditions: ['workerd', 'worker'] });
	const edge = await bundleServerEntry({ platform: 'browser', conditions: ['edge-light'] });

	assert.match(page.message, /@ever-teams\/api\/server/);
	for (const result of [node, worker, edge]) {
		assert.match(result.outputFiles[0].text, /embed\/token/);
	}
});

// webpack 5 resolves with enhanced-resolve: the conditions of a page, then of a Node server.
test("webpack's resolver refuses the server entry to a page and gives a server its builds", () => {
	const resolved = (conditionNames) =>
		ResolverFactory.createResolver({
			fileSystem: new CachedInputFileSystem(fs, 4000),
			useSyncFileSystemCalls: true,
			conditionNames,
			extensions: ['.js'],
			mainFields: ['browser', 'module', 'main']
		}).resolveSync({}, projectDir, '@ever-teams/api/server');

	assert.throws(() => resolved(['browser', 'import', 'module', 'webpack', 'production']), /server/);
	assert.match(resolved(['node', 'import', 'module', 'webpack', 'production']), /server\.es\.js$/);
	assert.match(resolved(['node', 'require', 'module', 'webpack', 'production']), /server\.cjs$/);
});

// The host's TypeScript: ES modules and CommonJS under nodenext, a bundler, and the older node10 resolution.
test("TypeScript finds the server entry's types under each module resolution", () => {
	const tsc = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
	const exchange =
		"{ apiUrl: 'https://api.example.com/api', credential: 'gze_', email: 'lina@example.com', origin: 'https://app.example.com' }";
	const report = "{ apiUrl: 'https://api.example.com/api', credential: 'gze_' }";
	fs.writeFileSync(
		path.join(projectDir, 'esm.mts'),
		"import { exchangeEmbedToken, type EverTeamsEmbedToken } from '@ever-teams/api/server';\n" +
			`export const answer: Promise<EverTeamsEmbedToken> = exchangeEmbedToken(${exchange});\n`
	);
	fs.writeFileSync(
		path.join(projectDir, 'cjs.cts'),
		"import server = require('@ever-teams/api/server');\n" +
			`export const answer: Promise<server.EverTeamsEmbedToken> = server.exchangeEmbedToken(${exchange});\n`
	);
	// With the options as process.env and a user record give them, too.
	fs.writeFileSync(
		path.join(projectDir, 'any-resolution.ts'),
		"import { exchangeEmbedToken, getClientReport, type IClientTimeReport } from '@ever-teams/api/server';\n" +
			`export const report: Promise<IClientTimeReport> = getClientReport(${report});\n` +
			'declare const env: { [name: string]: string | undefined };\n' +
			'declare const user: { email: string | null };\n' +
			'export const token = exchangeEmbedToken({\n' +
			'\tapiUrl: env.EVER_TEAMS_API_URL,\n' +
			'\tcredential: env.EVER_TEAMS_EMBED_CREDENTIAL,\n' +
			'\temail: user.email,\n' +
			'\torigin: env.APP_ORIGIN\n' +
			'});\n'
	);
	const check = (...args) =>
		run(
			process.execPath,
			[tsc, '--noEmit', '--strict', '--skipLibCheck', '--lib', 'es2022,dom', ...args],
			projectDir
		);

	assert.doesNotThrow(() => check('--module', 'nodenext', '--moduleResolution', 'nodenext', 'esm.mts', 'cjs.cts'));
	assert.doesNotThrow(() => check('--module', 'esnext', '--moduleResolution', 'bundler', 'any-resolution.ts'));
	assert.doesNotThrow(() => check('--module', 'commonjs', '--moduleResolution', 'node10', 'any-resolution.ts'));
});

test('the installed package holds the builds and declarations of the server entry', () => {
	const installed = path.join(projectDir, 'node_modules', '@ever-teams', 'api');
	const files = fs.readdirSync(installed, { recursive: true }).map((file) => file.split(path.sep).join('/'));

	assert.ok(files.includes('dist/server.es.js'));
	assert.ok(files.includes('dist/server.cjs'));
	assert.ok(files.includes('dist/server.d.ts'));
	assert.ok(files.includes('dist/cjs/server.d.ts'));
});

// A delivery signed as the API signs it (Gauzy, webhook-signature.ts): `t=<seconds>,v1=<hex HMAC-SHA256>` over
// `<seconds>.<raw body>`. verifyWebhook checks it with the Web Crypto API, then meets a wrong secret.
const WEBHOOK_SCRIPT = `
const body = JSON.stringify({
	id: 'event-1',
	name: 'time_log.stopped',
	version: 1,
	occurredAt: '2026-11-18T10:00:00.000Z',
	data: {
		timeLogId: 'log-1', employeeId: 'employee-1', projectId: null, taskId: null, organizationContactId: null,
		organizationTeamId: null, startedAt: '2026-11-18T09:00:00.000Z', stoppedAt: '2026-11-18T10:00:00.000Z',
		isRunning: false, isBillable: true, source: 'DESKTOP', logType: 'TRACKED'
	}
});
const t = Math.floor(Date.now() / 1000);
const signature = 't=' + t + ',v1=' + createHmac('sha256', 'secret-1').update(t + '.' + body, 'utf8').digest('hex');
(async () => {
	const event = await server.verifyWebhook({ body: Buffer.from(body), signature, secret: 'secret-1' });
	const refusal = await server.verifyWebhook({ body, signature, secret: 'secret-2' }).catch((error) => error);
	console.log(JSON.stringify({
		name: event.name,
		timeEntry: server.isTimeEntryEvent(event),
		refusal: refusal.code,
		mainEntryError: refusal instanceof api.EverTeamsError
	}));
})();
`;

const expectedWebhook = {
	name: 'time_log.stopped',
	timeEntry: true,
	refusal: 'WEBHOOK_SIGNATURE',
	mainEntryError: true
};

test('the installed server entry checks a webhook delivery in ESM and CommonJS, and a worker or edge bundle takes it', async () => {
	const imports =
		"import { createHmac } from 'node:crypto';\nimport * as server from '@ever-teams/api/server';\n" +
		"import * as api from '@ever-teams/api';";
	const requires =
		"const { createHmac } = require('node:crypto');\nconst server = require('@ever-teams/api/server');\n" +
		"const api = require('@ever-teams/api');";
	const esm = run(process.execPath, ['--input-type=module', '-e', `${imports}\n${WEBHOOK_SCRIPT}`], projectDir);
	const cjs = run(process.execPath, ['-e', `${requires}\n${WEBHOOK_SCRIPT}`], projectDir);
	const bundle = (conditions) =>
		esbuild.build({
			stdin: {
				contents: "import { verifyWebhook } from '@ever-teams/api/server';\nconsole.log(verifyWebhook);",
				resolveDir: projectDir
			},
			bundle: true,
			write: false,
			logLevel: 'silent',
			platform: 'browser',
			conditions
		});

	assert.deepEqual(loaded(esm), expectedWebhook);
	assert.deepEqual(loaded(cjs), expectedWebhook);
	for (const result of [await bundle(['workerd', 'worker']), await bundle(['edge-light'])]) {
		assert.match(result.outputFiles[0].text, /X-Signature/);
	}
});

test("TypeScript narrows a webhook event to a time entry's with isTimeEntryEvent", () => {
	const tsc = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
	fs.writeFileSync(
		path.join(projectDir, 'webhook.ts'),
		"import { isTimeEntryEvent, verifyWebhook } from '@ever-teams/api/server';\n" +
			'declare const env: { [name: string]: string | undefined };\n' +
			'declare const rawBody: Uint8Array;\n' +
			'declare const header: string | string[] | undefined;\n' +
			'export async function employeeWhoStarted(): Promise<string | null> {\n' +
			'\tconst event = await verifyWebhook({ body: rawBody, signature: header, secret: env.WEBHOOK_SECRET });\n' +
			"\tif (isTimeEntryEvent(event) && event.name === 'time_log.started') {\n" +
			'\t\treturn event.data.employeeId;\n' +
			'\t}\n' +
			'\treturn null;\n' +
			'}\n'
	);
	const check = (...args) =>
		run(
			process.execPath,
			[tsc, '--noEmit', '--strict', '--skipLibCheck', '--lib', 'es2022,dom', ...args, 'webhook.ts'],
			projectDir
		);

	assert.doesNotThrow(() => check('--module', 'esnext', '--moduleResolution', 'bundler'));
	assert.doesNotThrow(() => check('--module', 'commonjs', '--moduleResolution', 'node10'));
});
