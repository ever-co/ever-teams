// login and logout, against a stand-in API that answers what the API recorded: node --test test/*.test.mjs (from
// apps/cli, after tsc).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { configFileOf, readLogin, writeLogin } from '../dist/config.js';
import { newHome, placeOf, runCli } from './support/cli.mjs';
import {
	ACCESS_TOKEN,
	API_URL,
	PERSONAL_TOKEN,
	everythingOf,
	json,
	recorded,
	signedIn,
	standInApi
} from './support/stand-in-api.mjs';

const loginApi = (routes = {}) =>
	standInApi({ ...signedIn(), 'GET /timesheet/timer/status': recorded('timer.status'), ...routes });

function assertNoToken(result, api) {
	const everything = everythingOf(result, api);
	assert.doesNotMatch(everything, new RegExp(PERSONAL_TOKEN));
	assert.doesNotMatch(everything, new RegExp(ACCESS_TOKEN));
}

// A terminal that types `keys`: the token is read in raw mode, so the terminal does not echo it.
function terminalTyping(keys) {
	const input = new PassThrough();
	input.isTTY = true;
	input.modes = [];
	input.setRawMode = (mode) => {
		input.modes.push(mode);
		return input;
	};
	input.write(keys);
	return input;
}

test('login checks a piped token once through the SDK, then keeps it with the address', async () => {
	const api = loginApi();

	const result = await runCli(['login', '--token-stdin', '--api-url', `${API_URL}/`], {
		stdin: `${PERSONAL_TOKEN}\n`,
		fetch: api.fetch
	});

	const file = configFileOf(placeOf(result.home));
	assert.equal(result.code, 0);
	assert.equal(result.stdout, `Signed in to ${API_URL}. The token is kept in ${file}.\n`);
	assert.equal(result.stderr, '');
	assert.deepEqual(api.routesSent(), [
		'POST /auth/api-token/exchange',
		'GET /user/me',
		'GET /timesheet/timer/status'
	]);
	assert.equal(api.requests[0].body.token, PERSONAL_TOKEN);
	assert.deepEqual(readLogin(placeOf(result.home)), { apiUrl: API_URL, token: PERSONAL_TOKEN });
	assertNoToken(result, api);
});

test('login --json answers where it signed in, never the token', async () => {
	const api = loginApi();

	const result = await runCli(['login', '--token-stdin', '--json'], {
		stdin: PERSONAL_TOKEN,
		env: { EVER_TEAMS_API_URL: API_URL },
		fetch: api.fetch
	});

	assert.equal(result.code, 0);
	assert.deepEqual(JSON.parse(result.stdout), {
		signedIn: true,
		apiUrl: API_URL,
		settingsFile: configFileOf(placeOf(result.home))
	});
	assertNoToken(result, api);
});

test(
	'the login file may be read by its owner only',
	{ skip: process.platform === 'win32' && 'POSIX modes' },
	async () => {
		const api = loginApi();

		const result = await runCli(['login', '--token-stdin', '--api-url', API_URL], {
			stdin: PERSONAL_TOKEN,
			fetch: api.fetch
		});

		assert.equal(result.code, 0);
		assert.equal(fs.statSync(configFileOf(placeOf(result.home))).mode & 0o777, 0o600);
	}
);

test('a token typed in the terminal is read without being shown', async () => {
	const api = loginApi();
	const input = terminalTyping(`gzp_wrong\u007f\u007f\u007f\u007f\u007f${PERSONAL_TOKEN.slice(4)}\r`);

	const result = await runCli(['login', '--api-url', API_URL], { stdin: input, fetch: api.fetch });

	assert.equal(result.code, 0);
	assert.deepEqual(input.modes, [true, false]);
	assert.equal(result.stderr, 'Personal API token (hidden while you type or paste it): \n');
	assert.equal(api.requests[0].body.token, PERSONAL_TOKEN);
	assertNoToken(result, api);
});

test('Ctrl+C at the prompt cancels the login and stores nothing', async () => {
	const api = loginApi();

	const result = await runCli(['login', '--api-url', API_URL], {
		stdin: terminalTyping('gzp_abc\u0003'),
		fetch: api.fetch
	});

	assert.equal(result.code, 1);
	assert.match(result.stderr, /Sign-in cancelled: nothing was stored\.\n$/);
	assert.equal(readLogin(placeOf(result.home)), null);
	assert.equal(api.requests.length, 0);
});

test('without a terminal, login asks for --token-stdin (usage error, 2)', async () => {
	const result = await runCli(['login'], { stdin: '' });

	assert.equal(result.code, 2);
	assert.match(result.stderr, /^There is no terminal to type the token in: pipe it in with --token-stdin\./);
});

test('a token that is not a personal API token is refused before any request', async () => {
	const api = loginApi();

	const result = await runCli(['login', '--token-stdin', '--api-url', API_URL], {
		stdin: ACCESS_TOKEN,
		fetch: api.fetch
	});

	assert.equal(result.code, 2);
	assert.match(result.stderr, /^This is not a personal API token, which starts with gzp_/);
	assert.equal(api.requests.length, 0);
	assertNoToken(result, api);
});

test('a refused token is not stored, and the failure says to create a new one', async () => {
	const api = loginApi({
		'POST /auth/api-token/exchange': () => json(401, { statusCode: 401, message: 'Unauthorized' })
	});

	const result = await runCli(['login', '--token-stdin', '--api-url', API_URL], {
		stdin: PERSONAL_TOKEN,
		fetch: api.fetch
	});

	assert.equal(result.code, 1);
	assert.equal(
		result.stderr,
		'This token was refused: create a new one in Settings > API tokens, then run ever-teams login.\n'
	);
	assert.equal(readLogin(placeOf(result.home)), null);
	assertNoToken(result, api);
});

test('a server that keeps personal API tokens off is named, with the variable that turns them on', async () => {
	const api = loginApi({ 'POST /auth/api-token/exchange': undefined });

	const result = await runCli(['login', '--token-stdin', '--api-url', API_URL, '--json'], {
		stdin: PERSONAL_TOKEN,
		fetch: api.fetch
	});

	const { error } = JSON.parse(result.stderr);
	assert.equal(result.code, 1);
	assert.equal(result.stdout, '');
	assert.equal(error.code, 'PERSONAL_TOKENS_OFF');
	assert.equal(error.status, 404);
	assert.match(
		error.message,
		/does not accept personal API tokens: its administrator turns them on with GAUZY_USER_API_TOKENS_ENABLED/
	);
	assert.equal(readLogin(placeOf(result.home)), null);
});

test('an answer that repeats the token never prints it', async () => {
	const echoing = (request) => json(400, { statusCode: 400, message: [`token ${request.body.token} is malformed`] });
	const api = loginApi({ 'POST /auth/api-token/exchange': echoing });

	const result = await runCli(['login', '--token-stdin', '--api-url', API_URL], {
		stdin: PERSONAL_TOKEN,
		fetch: api.fetch
	});

	assert.equal(result.code, 1);
	assert.match(result.stderr, /token \[hidden\] is malformed/);
	assertNoToken(result, api);
});

test('a token sent over plain http to another machine is warned about', async () => {
	const api = loginApi();

	const result = await runCli(['login', '--token-stdin', '--api-url', 'http://teams.example.com/api'], {
		stdin: PERSONAL_TOKEN,
		fetch: api.fetch
	});

	assert.equal(result.code, 0);
	assert.match(
		result.stderr,
		/^Warning: http:\/\/teams\.example\.com\/api is not https, so the token travels unencrypted\.\n/
	);
});

test('an address that is not one is a usage error', async () => {
	const result = await runCli(['login', '--token-stdin', '--api-url', 'teams.example.com'], {
		stdin: PERSONAL_TOKEN
	});

	assert.equal(result.code, 2);
	assert.match(result.stderr, /^--api-url is not an address/);
});

test('login replaces a settings file it cannot read', async () => {
	const api = loginApi();
	const home = newHome();
	const file = configFileOf(placeOf(home));
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, 'not a login');

	const result = await runCli(['login', '--token-stdin', '--api-url', API_URL], {
		home,
		stdin: PERSONAL_TOKEN,
		fetch: api.fetch
	});

	assert.equal(result.code, 0);
	assert.deepEqual(readLogin(placeOf(home)), { apiUrl: API_URL, token: PERSONAL_TOKEN });
});

test('logout removes the stored token, and says so when there was none', async () => {
	const home = newHome();
	writeLogin(placeOf(home), { apiUrl: API_URL, token: PERSONAL_TOKEN });

	const first = await runCli(['logout'], { home });
	const second = await runCli(['logout', '--json'], { home });

	assert.equal(first.code, 0);
	assert.match(first.stdout, /^Signed out: the stored token is removed\. It keeps working until you revoke it/);
	assert.equal(readLogin(placeOf(home)), null);
	assert.equal(second.code, 0);
	assert.deepEqual(JSON.parse(second.stdout), { signedOut: false });
});
