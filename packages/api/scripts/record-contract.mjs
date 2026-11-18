// Records the answer of every client method from a local Ever Teams API into test/contract/<name>.json, through the
// built client (rollup -c first), with personal values replaced by placeholders. It starts the account's timer and
// stops it, then deletes the time entry it created: run it with an account whose timer is stopped. The account's role
// must list members (a manager), or members.list is refused.
//
//   EVER_TEAMS_API_URL=http://localhost:3000/api EVER_TEAMS_EMAIL=... EVER_TEAMS_PASSWORD=... \
//     node scripts/record-contract.mjs
//
// EVER_TEAMS_TOKEN (a personal API token, or an access token) can replace the email and the password.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '../dist/index.es.js';
import { CONTRACT_ANSWERS, contractAnswer, routeMatches } from './contract/answers.mjs';
import { redactRecordings } from './contract/redact.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

export const FIXTURES_DIR = path.join(here, '..', 'test', 'contract');

// The real values the placeholders replaced, for the fixtures' privacy test; outside the repository.
export const FORBIDDEN_FILE = path.join(os.tmpdir(), 'ever-teams-api-contract-forbidden.json');

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function assertLocal(apiUrl, allowRemote) {
	const host = new URL(apiUrl).hostname;
	if (LOCAL_HOSTS.has(host) || allowRemote) {
		return;
	}
	throw new Error(
		`${host} is not a local API, and the recording starts and deletes a time entry: record from a local API, or ` +
			'set EVER_TEAMS_CONTRACT_REMOTE=1 for an API of your own.'
	);
}

async function signIn(apiUrl, email, password, fetchApi) {
	const response = await fetchApi(`${apiUrl}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify({ email, password })
	});
	if (!response.ok) {
		throw new Error(
			`The API refused the sign-in (${response.status}): check EVER_TEAMS_EMAIL and EVER_TEAMS_PASSWORD.`
		);
	}
	const answer = await response.json();
	return { token: answer.token };
}

function credentialsOf(options, apiUrl, fetchApi) {
	if (options.token) {
		return { token: options.token };
	}
	const hasPassword = Boolean(options.email) && Boolean(options.password);
	if (!hasPassword) {
		throw new Error('Set EVER_TEAMS_TOKEN, or EVER_TEAMS_EMAIL and EVER_TEAMS_PASSWORD.');
	}
	return { getToken: () => signIn(apiUrl, options.email, options.password, fetchApi) };
}

// The local day, YYYY-MM-DD, as the client reads it.
function localDay(date) {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

// As the client reads an answer: an empty body is null.
function parseAnswer(text) {
	if (!text) {
		return null;
	}
	return JSON.parse(text);
}

// The client's errors say what to do next.
function failureOf(name, error) {
	const failure = `${name} failed: ${error.message}.`;
	if (!error.nextStep) {
		return failure;
	}
	return `${failure} ${error.nextStep}`;
}

function withoutTrailingSlashes(url) {
	let end = url.length;
	while (end > 0 && url[end - 1] === '/') {
		end -= 1;
	}
	return url.slice(0, end);
}

/**
 * Calls every client method against `apiUrl` and writes each answer the client received to `outDir`, redacted.
 * Leaves the account's timer as it found it and deletes only the time entries it created. Answers the fixtures
 * written, and `leftBehind`, the ids of the time entries it could not delete.
 */
export async function recordContract(options) {
	const apiUrl = withoutTrailingSlashes(options.apiUrl ?? '');
	if (!apiUrl) {
		throw new Error('Set EVER_TEAMS_API_URL, the address of a local API ending with /api.');
	}
	assertLocal(apiUrl, options.allowRemote);
	const fetchApi = options.fetch ?? globalThis.fetch;
	const outDir = options.outDir ?? FIXTURES_DIR;
	const forbiddenFile = options.forbiddenFile ?? FORBIDDEN_FILE;
	const log = options.log ?? console.log;
	const today = localDay(options.now ?? new Date());
	const apiPath = new URL(apiUrl).pathname;
	const exchanges = [];

	const recordingFetch = async (url, init) => {
		const response = await fetchApi(url, init);
		const text = await response.clone().text();
		exchanges.push({ url, init, status: response.status, text });
		return response;
	};

	const client = createClient({
		apiUrl,
		...credentialsOf(options, apiUrl, fetchApi),
		fetch: recordingFetch
	});

	const routeOf = (exchange) => {
		const pathname = new URL(exchange.url).pathname;
		return `${exchange.init.method} ${pathname.slice(apiPath.length)}`;
	};

	const recordings = [];

	function keep(name, exchange) {
		const contract = contractAnswer(name);
		const route = routeOf(exchange);
		if (!routeMatches(contract.route, route)) {
			throw new Error(`${name} sent ${route}, not ${contract.route}: update scripts/contract/answers.mjs.`);
		}
		recordings.push({
			name,
			route,
			status: exchange.status,
			answer: parseAnswer(exchange.text),
			idKind: contract.idKind
		});
	}

	async function record(name) {
		let result;
		try {
			result = await contractAnswer(name).call(client, today);
		} catch (error) {
			throw new Error(failureOf(name, error), { cause: error });
		}
		keep(name, exchanges[exchanges.length - 1]);
		return result;
	}

	async function deleteTimeLogs(ids) {
		// The client's own headers: its current token, tenant and organization.
		const headers = new Headers(exchanges[exchanges.length - 1].init.headers);
		const query = new URLSearchParams({
			forceDelete: 'true',
			tenantId: headers.get('tenant-id'),
			organizationId: headers.get('organization-id')
		});
		ids.forEach((id, index) => query.set(`logIds[${index}]`, id));
		const response = await fetchApi(`${apiUrl}/timesheet/time-log?${query}`, { method: 'DELETE', headers });
		await response.text();
		return response.ok;
	}

	// Stops the timer when a failure left it running, and deletes the time entries the recording created.
	async function putBack(created) {
		const status = await client.timer.status();
		if (status.running) {
			await client.timer.stop();
		}
		const deleted = await deleteTimeLogs(created);
		if (deleted) {
			return [];
		}
		log(
			`The time entries ${created.join(', ')} the recording created could not be deleted: delete them in the app.`
		);
		return created;
	}

	// A time entry is listed, and counted in the totals, once its timer has run a moment and stopped.
	const runAMoment = () => new Promise((resolve) => setTimeout(resolve, options.runMs ?? 2000));

	const before = await client.timer.status();
	if (before.running) {
		throw new Error(
			"The account's timer runs: stop it, then record again, so the recording leaves the timer as it found it."
		);
	}
	await record('projects.list');
	const tasks = await record('tasks.list');
	await record('members.list');

	const created = [];
	let leftBehind = [];
	try {
		// As the README's quick start does: no project, task or team.
		const bare = await record('timer.start');
		created.push(bare.id);
		await record('timer.status');
		await runAMoment();
		await record('timer.stop');
		// Then on one of the member's tasks, so the list holds an entry with its project and task too.
		const task = tasks.find((candidate) => candidate.projectId);
		if (task) {
			const onTask = await client.timer.start({ projectId: task.projectId, taskId: task.id });
			created.push(onTask.id);
			await runAMoment();
			await client.timer.stop();
		}
		await record('timeEntries.list');
		await record('totals.today');
		await record('totals.week');
	} finally {
		if (created.length > 0) {
			leftBehind = await putBack(created);
		}
	}

	const me = exchanges.find((exchange) => routeOf(exchange) === 'GET /user/me');
	if (me) {
		keep('user.me', me);
	}
	const order = CONTRACT_ANSWERS.map((answer) => answer.name);
	recordings.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

	const { fixtures, forbidden } = redactRecordings(recordings);
	fs.mkdirSync(outDir, { recursive: true });
	for (const { name, ...fixture } of fixtures) {
		fs.writeFileSync(path.join(outDir, `${name}.json`), `${JSON.stringify(fixture, null, '\t')}\n`);
	}
	fs.writeFileSync(forbiddenFile, JSON.stringify(forbidden), { mode: 0o600 });
	return { fixtures: fixtures.map((fixture) => fixture.name), leftBehind };
}

async function main() {
	const result = await recordContract({
		apiUrl: process.env.EVER_TEAMS_API_URL,
		email: process.env.EVER_TEAMS_EMAIL,
		password: process.env.EVER_TEAMS_PASSWORD,
		token: process.env.EVER_TEAMS_TOKEN,
		allowRemote: process.env.EVER_TEAMS_CONTRACT_REMOTE === '1'
	});
	console.log(`Recorded ${result.fixtures.join(', ')} into ${path.relative(process.cwd(), FIXTURES_DIR)}.`);
	if (result.leftBehind.length > 0) {
		process.exitCode = 1;
	}
}

const isRunDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isRunDirectly) {
	main().catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
}
