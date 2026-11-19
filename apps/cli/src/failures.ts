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
import { Trail } from './command.js';
import { Failure } from './output.js';
import { EXIT_FAILED, EXIT_USAGE, Refusal, UsageError } from './refusals.js';

const ISSUES = 'https://github.com/ever-co/ever-teams/issues';

const TOKEN_PAGE = 'Settings > API tokens';

const ADDRESS_STEP = "check that it is the API's address, ending with /api";

const NOT_A_MEMBER =
	'Your account is not a member of an organization that tracks time: ask an administrator of your organization to ' +
	'add you as a member.';

// The client's codes for a token whose user does not track time in an organization.
const NOT_A_MEMBER_CODES = new Set(['NO_EMPLOYEE', 'NO_ORGANIZATION', 'NO_TENANT']);

const SERVER_FAILED =
	'The server failed on its side: try again in a moment, and tell its administrator if it keeps failing.';

/** What a failure of the API means for a person: a code for scripts, one sentence with what to do next. */
interface Explained {
	code: string;
	message: string;
}

function helpHint(command: string): string {
	if (command) {
		return `Run ever-teams ${command} --help to see how to use it.`;
	}
	return 'Run ever-teams --help to see the commands.';
}

function messageOf(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}

const addressOf = (trail: Trail): string => trail.apiUrl ?? 'The API';

// The API's own words: a validation answers one message per field.
function apiWords(error: EverTeamsError): string {
	if (error instanceof EverTeamsValidationError && error.messages.length > 0) {
		return error.messages.join('; ');
	}
	return error.message;
}

function tokenRefused(trail: Trail): Explained {
	const code = 'TOKEN_REFUSED';
	if (trail.tokenFrom === 'environment') {
		const message =
			`The token in EVER_TEAMS_TOKEN was refused: create a new one in ${TOKEN_PAGE}, then put it in ` +
			'EVER_TEAMS_TOKEN.';
		return { code, message };
	}
	if (trail.tokenFrom === 'typed') {
		return {
			code,
			message: `This token was refused: create a new one in ${TOKEN_PAGE}, then run ever-teams login.`
		};
	}
	return { code, message: `Your token was refused: create a new one in ${TOKEN_PAGE}, then run ever-teams login.` };
}

// The token exchange answers 404 when the server keeps personal API tokens off, as it does by default.
function notFound(trail: Trail): Explained {
	const address = addressOf(trail);
	if (trail.exchangeStatus === 404) {
		const message =
			`${address} does not accept personal API tokens: its administrator turns them on with ` +
			`GAUZY_USER_API_TOKENS_ENABLED (or ${ADDRESS_STEP}).`;
		return { code: 'PERSONAL_TOKENS_OFF', message };
	}
	return { code: 'NOT_FOUND', message: `${address} has nothing at this route: ${ADDRESS_STEP}.` };
}

function forbidden(error: EverTeamsError, trail: Trail): Explained {
	const code = error.code ?? 'FORBIDDEN';
	const isEmbedToken = error.code?.startsWith('EMBED_') === true;
	if (isEmbedToken) {
		return { code, message: `This token reaches the timer only: use a personal API token, from ${TOKEN_PAGE}.` };
	}
	if (trail.command === 'log') {
		const message =
			'Your organization does not allow adding time by hand, or your role may not: ask an administrator of ' +
			'your organization to allow manual time, or use ever-teams start and stop.';
		return { code: 'MANUAL_TIME_REFUSED', message };
	}
	const message = 'Your account may not do this: ask an administrator of your organization for the permission.';
	return { code, message };
}

function conflict(error: EverTeamsError): Explained {
	const code = error.code ?? 'CONFLICT';
	if (code === 'RUNNING_TIMER_OVERLAP') {
		const message = 'Your timer is running over this time: stop it with ever-teams stop, or pick another time.';
		return { code, message };
	}
	if (code === 'BREAK_OVERLAP') {
		return { code, message: 'This time overlaps a break: pick a time outside it.' };
	}
	const words = apiWords(error);
	const message = `The server refused this in the current state (${words}): run ever-teams status, then try again.`;
	return { code, message };
}

function refusedValues(error: EverTeamsError, trail: Trail): Explained {
	const code = error.code ?? 'REFUSED_VALUES';
	const words = apiWords(error);
	if (trail.command === 'log') {
		const message =
			`The server refused this entry (${words}): check the times; an entry in the future needs your ` +
			'organization to allow future dates.';
		return { code, message };
	}
	return { code, message: `The server refused the values sent (${words}): check them, then try again.` };
}

function tooMany(error: EverTeamsRateLimitError): Explained {
	let wait = 'a minute';
	if (error.retryAfter !== undefined) {
		wait = `${error.retryAfter} seconds`;
	}
	return { code: 'RATE_LIMITED', message: `Too many requests: wait ${wait}, then try again.` };
}

// The client's own codes, for a request it did not send or an answer it could not read.
function clientExplained(error: EverTeamsError, trail: Trail): Explained | null {
	const address = addressOf(trail);
	const code = error.code;
	if (code === 'NOT_JSON') {
		return { code, message: `${address} did not answer as the API does: ${ADDRESS_STEP}.` };
	}
	if (code === 'UNEXPECTED_ANSWER') {
		return { code, message: `${address} answered without your account: ${ADDRESS_STEP}.` };
	}
	if (code !== undefined && NOT_A_MEMBER_CODES.has(code)) {
		return { code, message: NOT_A_MEMBER };
	}
	return null;
}

function explained(error: EverTeamsError, trail: Trail): Explained {
	const own = clientExplained(error, trail);
	if (own) {
		return own;
	}
	if (error instanceof EverTeamsAuthError) {
		return tokenRefused(trail);
	}
	if (error instanceof EverTeamsNotFoundError) {
		return notFound(trail);
	}
	if (error instanceof EverTeamsForbiddenError) {
		return forbidden(error, trail);
	}
	if (error instanceof EverTeamsConflictError) {
		return conflict(error);
	}
	if (error instanceof EverTeamsValidationError) {
		return refusedValues(error, trail);
	}
	if (error instanceof EverTeamsRateLimitError) {
		return tooMany(error);
	}
	if (error instanceof EverTeamsServerError) {
		return { code: 'SERVER_FAILED', message: SERVER_FAILED };
	}
	if (error instanceof EverTeamsNetworkError) {
		const message = `No answer from ${addressOf(trail)}: check your network and the address.`;
		return { code: 'NO_ANSWER', message };
	}
	const message = `The server refused this (${error.message}): run ever-teams status, then try again.`;
	return { code: error.code ?? 'REFUSED', message };
}

function apiFailure(error: EverTeamsError, trail: Trail): Failure {
	const { code, message } = explained(error, trail);
	const failure: Failure = { code, message, exitCode: EXIT_FAILED };
	if (error.status > 0) {
		failure.status = error.status;
	}
	return failure;
}

/** The failure to report for what a command threw: one sentence with what to do next, and the exit code. */
export function failureOf(error: unknown, trail: Trail): Failure {
	if (error instanceof UsageError) {
		return { code: 'USAGE', message: `${error.message} ${helpHint(trail.command)}`, exitCode: EXIT_USAGE };
	}
	if (error instanceof Refusal) {
		return { code: error.code, message: error.message, exitCode: EXIT_FAILED };
	}
	if (error instanceof EverTeamsError) {
		return apiFailure(error, trail);
	}
	const reason = messageOf(error);
	const message = `Something went wrong (${reason}): try again, and report it at ${ISSUES} if it keeps happening.`;
	return { code: 'UNEXPECTED', message, exitCode: EXIT_FAILED };
}
