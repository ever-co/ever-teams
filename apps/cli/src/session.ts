import { createClient, EverTeamsClient } from '@ever-teams/api';
import { textOption } from './args.js';
import { CommandContext, Trail } from './command.js';
import { readLogin, StoredLogin } from './config.js';
import { CliIo } from './io.js';
import { Refusal, UsageError } from './refusals.js';

/** The hosted service's API, for a person who gives no other address. */
export const DEFAULT_API_URL = 'https://api.ever.team/api';

const EXCHANGE_PATH = '/auth/api-token/exchange';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function withoutTrailingSlashes(url: string): string {
	let end = url.length;
	while (end > 0 && url[end - 1] === '/') {
		end -= 1;
	}
	return url.slice(0, end);
}

function addressOf(text: string, givenBy: string): string {
	const example = 'give the address of the API, such as https://api.example.com/api.';
	let url: URL;
	try {
		url = new URL(text);
	} catch {
		throw new UsageError(`${givenBy} is not an address: ${example}`);
	}
	const isWebAddress = url.protocol === 'https:' || url.protocol === 'http:';
	if (!isWebAddress) {
		throw new UsageError(`${givenBy} is not a web address: ${example}`);
	}
	return withoutTrailingSlashes(text);
}

/** The address this run was given: --api-url, else EVER_TEAMS_API_URL; undefined when it was given neither. */
function givenApiUrl(context: CommandContext): string | undefined {
	// A flag given empty is refused as no address, never read as no flag: the run would go to another API.
	const flag = textOption(context.values, 'api-url');
	if (flag !== undefined) {
		return addressOf(flag, '--api-url');
	}
	// An empty variable counts as unset, as a shell clears one with VAR=.
	const fromEnvironment = context.io.env.EVER_TEAMS_API_URL;
	if (fromEnvironment) {
		return addressOf(fromEnvironment, 'EVER_TEAMS_API_URL');
	}
	return undefined;
}

function apiUrlFrom(given: string | undefined, stored: StoredLogin | null): string {
	if (given !== undefined) {
		return given;
	}
	if (stored) {
		return stored.apiUrl;
	}
	return DEFAULT_API_URL;
}

/** The API to talk to: --api-url, else EVER_TEAMS_API_URL, else the stored login's, else the hosted service's. */
export function apiUrlOf(context: CommandContext, stored: StoredLogin | null): string {
	return apiUrlFrom(givenApiUrl(context), stored);
}

/** Whether a token sent to `apiUrl` travels unencrypted over a network. */
export function isUnencrypted(apiUrl: string): boolean {
	const url = new URL(apiUrl);
	const isLocal = LOCAL_HOSTS.has(url.hostname);
	return url.protocol === 'http:' && !isLocal;
}

function urlOfRequest(input: string | URL | Request): string {
	if (typeof input === 'string') {
		return input;
	}
	if (input instanceof URL) {
		return input.href;
	}
	return input.url;
}

// The sentence of a failure tells a server that keeps personal API tokens off by the exchange's answer.
function watchedFetch(io: CliIo, trail: Trail): typeof fetch {
	return async (input, init) => {
		const response = await io.fetch(input, init);
		const { pathname } = new URL(urlOfRequest(input));
		if (pathname.endsWith(EXCHANGE_PATH)) {
			trail.exchangeStatus = response.status;
		}
		return response;
	};
}

/** A client of the SDK for `apiUrl` and `token`, which the output of the command never shows. */
export function clientFor(
	context: CommandContext,
	apiUrl: string,
	token: string,
	tokenFrom: NonNullable<Trail['tokenFrom']>
): EverTeamsClient {
	context.output.hide(token);
	context.trail.apiUrl = apiUrl;
	context.trail.tokenFrom = tokenFrom;
	return createClient({ apiUrl, token, fetch: watchedFetch(context.io, context.trail) });
}

/**
 * The client of a signed-in command: EVER_TEAMS_TOKEN when it is set, else the stored token, which is sent only to
 * the API it was stored for.
 */
export function openSession(context: CommandContext): EverTeamsClient {
	const given = givenApiUrl(context);
	const fromEnvironment = context.io.env.EVER_TEAMS_TOKEN?.trim();
	// The settings file is read only when a value comes from it: a damaged one stops no run that does not need it.
	if (fromEnvironment && given !== undefined) {
		return clientFor(context, given, fromEnvironment, 'environment');
	}
	const stored = readLogin(context.io);
	const apiUrl = apiUrlFrom(given, stored);
	if (fromEnvironment) {
		return clientFor(context, apiUrl, fromEnvironment, 'environment');
	}
	if (!stored) {
		throw new Refusal('NOT_SIGNED_IN', 'You are not signed in: run ever-teams login, or set EVER_TEAMS_TOKEN.');
	}
	context.output.hide(stored.token);
	if (stored.apiUrl !== apiUrl) {
		throw new Refusal(
			'OTHER_API',
			`You signed in to ${stored.apiUrl}, not ${apiUrl}: run ever-teams login --api-url ${apiUrl}, or set ` +
				'EVER_TEAMS_TOKEN.'
		);
	}
	return clientFor(context, apiUrl, stored.token, 'login');
}
