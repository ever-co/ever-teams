// Each typed error of the SDK becomes one sentence for a person, with what to do next, and the exit code 1: against
// the built command line, node --test test/*.test.mjs (from apps/cli, after tsc).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	EverTeamsAuthError,
	EverTeamsConflictError,
	EverTeamsError,
	EverTeamsForbiddenError,
	EverTeamsNetworkError,
	EverTeamsNotFoundError,
	EverTeamsRateLimitError,
	EverTeamsServerError,
	EverTeamsValidationError
} from '@ever-teams/api';
import { failureOf } from '../dist/failures.js';
import { Refusal, UsageError } from '../dist/refusals.js';

const API_URL = 'http://127.0.0.1:3000/api';

const init = (status, extra = {}) => ({ status, message: 'From the API', nextStep: 'For a developer.', ...extra });

const trailOf = (extra = {}) => ({ command: 'status', apiUrl: API_URL, tokenFrom: 'login', ...extra });

function reported(error, trail = trailOf()) {
	const failure = failureOf(error, trail);
	assert.equal(failure.exitCode, 1);
	assert.doesNotMatch(failure.message, /\n/);
	assert.doesNotMatch(failure.message, /For a developer/);
	return failure;
}

test('a refused token says to create a new one, wherever it came from', () => {
	const error = new EverTeamsAuthError(init(401));

	const stored = reported(error);
	const fromEnvironment = reported(error, trailOf({ tokenFrom: 'environment' }));

	assert.equal(
		stored.message,
		'Your token was refused: create a new one in Settings > API tokens, then run ever-teams login.'
	);
	assert.equal(stored.code, 'TOKEN_REFUSED');
	assert.equal(stored.status, 401);
	assert.match(
		fromEnvironment.message,
		/^The token in EVER_TEAMS_TOKEN was refused: .* put it in EVER_TEAMS_TOKEN\.$/
	);
});

test('a 404 of the token exchange says the server keeps personal API tokens off', () => {
	const error = new EverTeamsNotFoundError(init(404));

	const tokensOff = reported(error, trailOf({ exchangeStatus: 404 }));
	const otherRoute = reported(error, trailOf({ exchangeStatus: 201 }));

	assert.equal(tokensOff.code, 'PERSONAL_TOKENS_OFF');
	assert.match(tokensOff.message, /^http:\/\/127\.0\.0\.1:3000\/api does not accept personal API tokens: /);
	assert.match(tokensOff.message, /GAUZY_USER_API_TOKENS_ENABLED/);
	assert.equal(otherRoute.code, 'NOT_FOUND');
	assert.match(otherRoute.message, /ending with \/api\.$/);
});

test('a forbidden answer names the permission, manual time, or the embed token', () => {
	const permission = reported(new EverTeamsForbiddenError(init(403)));
	const manualTime = reported(new EverTeamsForbiddenError(init(403)), trailOf({ command: 'log' }));
	const embed = reported(new EverTeamsForbiddenError(init(403, { code: 'EMBED_SCOPE' })));

	assert.match(permission.message, /^Your account may not do this: ask an administrator/);
	assert.equal(manualTime.code, 'MANUAL_TIME_REFUSED');
	assert.match(manualTime.message, /allow manual time, or use ever-teams start and stop\.$/);
	assert.equal(embed.code, 'EMBED_SCOPE');
	assert.match(embed.message, /personal API token/);
});

test("a conflict or a validation says the API's reason and what to do", () => {
	const overlap = reported(
		new EverTeamsConflictError(init(409, { code: 'RUNNING_TIMER_OVERLAP', messages: ['A timer is running'] }))
	);
	const onBreak = reported(new EverTeamsConflictError(init(409, { code: 'BREAK_OVERLAP', messages: [] })));
	const values = reported(new EverTeamsValidationError(init(400, { messages: ['note is too long', 'id is bad'] })));
	const entry = reported(
		new EverTeamsValidationError(init(400, { messages: ['Please select valid Date, start time and end time'] })),
		trailOf({ command: 'log' })
	);

	assert.equal(overlap.code, 'RUNNING_TIMER_OVERLAP');
	assert.match(overlap.message, /stop it with ever-teams stop/);
	assert.equal(onBreak.code, 'BREAK_OVERLAP');
	assert.equal(
		values.message,
		'The server refused the values sent (note is too long; id is bad): check them, then try again.'
	);
	assert.match(entry.message, /^The server refused this entry \(Please select valid Date, start time and end time\)/);
	assert.match(entry.message, /future dates\.$/);
});

test('too many requests, a failing server or no answer each say when or where to look', () => {
	const waitSaid = reported(new EverTeamsRateLimitError(init(429, { retryAfter: 30 })));
	const waitUnsaid = reported(new EverTeamsRateLimitError(init(429, { retryAfter: undefined })));
	const server = reported(new EverTeamsServerError(init(502)));
	const network = reported(new EverTeamsNetworkError(init(0)));

	assert.equal(waitSaid.message, 'Too many requests: wait 30 seconds, then try again.');
	assert.equal(waitUnsaid.message, 'Too many requests: wait a minute, then try again.');
	assert.match(server.message, /^The server failed on its side/);
	assert.equal(server.status, 502);
	assert.equal(network.message, `No answer from ${API_URL}: check your network and the address.`);
	assert.equal(network.status, undefined);
});

test("the client's own codes say the address is not the API's, or the account tracks no time", () => {
	const notJson = reported(new EverTeamsError(init(200, { code: 'NOT_JSON' })));
	const notAMember = reported(new EverTeamsError(init(0, { code: 'NO_EMPLOYEE' })));

	assert.equal(
		notJson.message,
		`${API_URL} did not answer as the API does: check that it is the API's address, ending with /api.`
	);
	assert.equal(notAMember.code, 'NO_EMPLOYEE');
	assert.match(notAMember.message, /^Your account is not a member of an organization that tracks time/);
});

test('a usage error exits with 2, a refusal or an unexpected error with 1', () => {
	const usage = failureOf(new UsageError('--from needs a value.'), trailOf({ command: 'log' }));
	const refusal = failureOf(new Refusal('NOT_SIGNED_IN', 'You are not signed in.'), trailOf());
	const unexpected = failureOf(new TypeError('boom'), trailOf());

	assert.deepEqual(usage, {
		code: 'USAGE',
		message: '--from needs a value. Run ever-teams log --help to see how to use it.',
		exitCode: 2
	});
	assert.deepEqual(refusal, { code: 'NOT_SIGNED_IN', message: 'You are not signed in.', exitCode: 1 });
	assert.equal(unexpected.exitCode, 1);
	assert.equal(unexpected.code, 'UNEXPECTED');
	assert.match(unexpected.message, /^Something went wrong \(boom\): try again/);
});
