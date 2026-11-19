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
} from './errors';

const AUTH_STEP =
	'The token expired or was revoked: get a new one (a personal API token from Settings > API tokens in the web ' +
	'app, or a new embed token from your server) and create the client with it, or give the client a getToken.';

// The codes the API's embed guard answers with (Gauzy, embed.guards.ts).
const FORBIDDEN_STEPS: { [code: string]: string } = {
	EMBED_SCOPE: 'An embed token reaches only the timer: make this call with a personal API token.',
	EMBED_ORIGIN: 'This embed token works only from the site it was exchanged for: exchange a new one for this site.',
	EMBED_CLIENT_PROJECT:
		"This embed token tracks time only on its client's projects: start the timer on one of them (projectId)."
};

const FORBIDDEN_STEP =
	"The token's member lacks the permission for this: ask an administrator of the organization for it, or use the " +
	'token of a member who has it.';

const NOT_FOUND_STEP =
	'Nothing answers at this address: check apiUrl (the API address, ending with /api) and the ids you passed.';

const VALIDATION_STEP = 'The API refused the values sent: fix the fields its messages name (error.messages).';

const CONFLICT_STEP = 'The request conflicts with the current state (another timer may be running): read it again.';

const SERVER_STEP =
	'The API failed on its side: try again in a moment, and tell its administrator if it keeps failing.';

const OTHER_STEP = 'The API refused the request: error.message says why.';

export const isRecord = (value: unknown): value is { [key: string]: unknown } =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string => typeof value === 'string';

/** The API's messages: Gauzy answers one message, or a list for a validation. */
function messagesOf(body: unknown): string[] {
	if (!isRecord(body)) {
		return [];
	}
	const message = body['message'];
	if (Array.isArray(message)) {
		return message.filter(isText);
	}
	if (isText(message)) {
		return [message];
	}
	return [];
}

/** What the typed error of an answer reads of it: its status, status text and headers. */
export type AnswerHead = Pick<Response, 'status' | 'statusText' | 'headers'>;

function textOf(response: AnswerHead, body: unknown): string {
	const messages = messagesOf(body);
	if (messages.length > 0) {
		return messages.join('; ');
	}
	if (isRecord(body) && isText(body['error'])) {
		return body['error'];
	}
	return response.statusText || `HTTP ${response.status}`;
}

export function codeOf(body: unknown): string | undefined {
	if (isRecord(body) && isText(body['code'])) {
		return body['code'];
	}
	return undefined;
}

// The embed guard refuses a token before the route runs: its code says more than the route's own next step.
function forbiddenStep(code: string | undefined, ownStep: string | undefined): string {
	if (code !== undefined && Object.prototype.hasOwnProperty.call(FORBIDDEN_STEPS, code)) {
		return FORBIDDEN_STEPS[code];
	}
	return ownStep || FORBIDDEN_STEP;
}

function rateLimitStep(retryAfter: number | undefined): string {
	if (retryAfter === undefined) {
		return 'Too many requests: wait a minute before trying again.';
	}
	return `Too many requests: wait ${retryAfter} seconds (error.retryAfter) before trying again.`;
}

// A throttler with a name answers `Retry-After-<name>` (@nestjs/throttler).
function namedRetryAfter(headers: Headers): string | null {
	let found: string | null = null;
	headers.forEach((value, name) => {
		const isNamedRetryAfter = name.toLowerCase().startsWith('retry-after-');
		if (found === null && isNamedRetryAfter) {
			found = value;
		}
	});
	return found;
}

/** The wait the answer asks for, in seconds: Retry-After holds seconds or an HTTP date. */
function retryAfterOf(headers: Headers, now: number): number | undefined {
	const value = headers.get('retry-after') ?? namedRetryAfter(headers);
	if (value === null) {
		return undefined;
	}
	const text = value.trim();
	if (/^\d+$/.test(text)) {
		return Number.parseInt(text, 10);
	}
	const date = Date.parse(text);
	if (Number.isNaN(date)) {
		return undefined;
	}
	return Math.max(0, Math.ceil((date - now) / 1000));
}

/** The next steps a call gives in place of the general ones, by HTTP status. */
export type NextStepsByStatus = { [status: number]: string };

/** The typed error of an answer that is not a success, from the answer and its body (read as JSON, else null). */
export function errorFromResponse(
	response: AnswerHead,
	body: unknown,
	nextSteps: NextStepsByStatus = {}
): EverTeamsError {
	const status = response.status;
	const code = codeOf(body);
	const fields = { status, code, body, message: textOf(response, body) };
	const ownStep = nextSteps[status];

	if (status === 401) {
		return new EverTeamsAuthError({ ...fields, nextStep: ownStep || AUTH_STEP });
	}
	if (status === 403) {
		return new EverTeamsForbiddenError({ ...fields, nextStep: forbiddenStep(code, ownStep) });
	}
	if (status === 404) {
		return new EverTeamsNotFoundError({ ...fields, nextStep: ownStep || NOT_FOUND_STEP });
	}
	if (status === 409) {
		return new EverTeamsConflictError({
			...fields,
			messages: messagesOf(body),
			nextStep: ownStep || CONFLICT_STEP
		});
	}
	if (status === 400 || status === 422) {
		return new EverTeamsValidationError({
			...fields,
			messages: messagesOf(body),
			nextStep: ownStep || VALIDATION_STEP
		});
	}
	if (status === 429) {
		const retryAfter = retryAfterOf(response.headers, Date.now());
		return new EverTeamsRateLimitError({ ...fields, retryAfter, nextStep: ownStep || rateLimitStep(retryAfter) });
	}
	if (status >= 500) {
		return new EverTeamsServerError({ ...fields, nextStep: ownStep || SERVER_STEP });
	}
	return new EverTeamsError({ ...fields, nextStep: ownStep || OTHER_STEP });
}

/** The error of a request that got no answer. */
export function networkError(apiUrl: string, cause: unknown): EverTeamsNetworkError {
	let message = `No answer from ${apiUrl}`;
	if (cause instanceof Error) {
		message = `${message}: ${cause.message}`;
	}
	return new EverTeamsNetworkError({
		status: 0,
		message,
		nextStep: `Check apiUrl (${apiUrl}), the network, and in a browser that the API allows this page's origin (CORS).`,
		cause
	});
}

/** An error the client finds before or after a request, with no HTTP status of its own to give (status 0). */
export function clientError(code: string, message: string, nextStep: string): EverTeamsError {
	return new EverTeamsError({ status: 0, code, message, nextStep });
}
