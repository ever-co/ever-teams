import { withoutTrailingSlashes } from '../client/address';
import { parseBody } from '../client/answer-body';
import { clientError, codeOf, errorFromResponse, networkError, NextStepsByStatus } from '../client/error-mapping';
import { EverTeamsError } from '../client/errors';

/** One request of a server helper to an embed route, whose body holds the credential. */
export interface EmbedPost<T> {
	/** The helper, as its errors name it. */
	caller: string;
	apiUrl: string;
	path: string;
	credential: string;
	body: { [field: string]: string };
	fetch: typeof fetch | undefined;
	/** Whether a success holds what the helper answers. */
	isAnswer: (value: unknown) => value is T;
	/** What the helper answers, as the error of another answer names it: "a token". */
	answerName: string;
}

const REDACTED = '[credential]';

const API_URL_STEP =
	"Pass apiUrl, the API's address ending with /api (https://api.example.com/api), for example " +
	'process.env.EVER_TEAMS_API_URL.';

const CREDENTIAL_STEP =
	'Pass the embed credential an administrator created in Settings > Embeds of the web app, from an environment ' +
	'variable such as process.env.EVER_TEAMS_EMBED_CREDENTIAL, never from the page.';

// What both embed routes answer alike: a credential that earns nothing, and an API with embeds off.
const STATUS_STEPS: NextStepsByStatus = {
	401:
		'The API refused the embed credential (unknown, malformed or revoked): check the credential you pass, or ask ' +
		'an administrator of the organization for a new one (Settings > Embeds of the web app).',
	404:
		'This API answers no embed route: its administrator turns embeds on (GAUZY_EMBED_TOKENS_ENABLED=true), or ' +
		'apiUrl is not its address (it ends with /api).'
};

// The codes of the embed routes (Gauzy, embed-credential.service.ts). Only the server helpers call those routes, so
// the main entry's mapping does not carry them.
const CODE_STEPS: { [code: string]: string } = {
	EMBED_MEMBER_NOT_ALLOWED:
		"The credential cannot sign this person in: they must be an active member of the credential's organization, " +
		'with an account and time tracking on. Check the email or employeeId, or ask an administrator to add the ' +
		'person or turn their time tracking on.',
	EMBED_ORIGIN_NOT_ALLOWED:
		'The organization does not allow this site: send the origin of the page the timer runs in ' +
		'(https://app.example.com), and ask an administrator to add it in Settings > Embeds of the web app.',
	EMBED_CLIENT_REQUIRED:
		'This credential is not limited to a client: ask an administrator for a credential of the client whose time ' +
		'the report shows (Settings > Embeds of the web app).',
	EMBED_CLIENT_GONE:
		"The credential's client was deleted: restore the client in the web app, or use a credential of another one.",
	EMBED_EXCHANGE_LIMITED:
		'Too many refused credentials came from this address: check the credential you send, then try again in a ' +
		'minute.'
};

export const isFilled = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

/** Whether the value is an http or https address. */
export function isWebAddress(value: string): boolean {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return false;
	}
	return url.protocol === 'https:' || url.protocol === 'http:';
}

// The messages never quote a value: a credential passed in the wrong option would end up in them.
export const optionsError = (message: string, nextStep: string): EverTeamsError =>
	clientError('CLIENT_OPTIONS', message, nextStep);

/** apiUrl without its trailing slashes, once it is an http or https address. */
export function apiUrlOf(caller: string, apiUrl: unknown): string {
	if (!isFilled(apiUrl)) {
		throw optionsError(`${caller} needs apiUrl.`, API_URL_STEP);
	}
	const address = withoutTrailingSlashes(apiUrl.trim());
	if (!isWebAddress(address)) {
		throw optionsError(`${caller} needs apiUrl as an http or https address.`, API_URL_STEP);
	}
	return address;
}

/** The credential, without the spaces or line break a secret store may add around it. */
export function credentialOf(caller: string, credential: unknown): string {
	if (!isFilled(credential)) {
		throw optionsError(`${caller} needs credential, the embed credential.`, CREDENTIAL_STEP);
	}
	return credential.trim();
}

const withoutCredential = (text: string, credential: string): string => text.split(credential).join(REDACTED);

/** What fetch threw, with a fresh error in its place when its message holds the credential. */
function causeWithoutCredential(error: unknown, credential: string): unknown {
	let text = String(error);
	if (error instanceof Error) {
		text = error.message;
	}
	if (text.indexOf(credential) === -1) {
		return error;
	}
	return new Error(withoutCredential(text, credential));
}

function nextStepsOf(status: number, body: unknown): NextStepsByStatus {
	const code = codeOf(body);
	const isKnownCode = code !== undefined && Object.prototype.hasOwnProperty.call(CODE_STEPS, code);
	if (!isKnownCode) {
		return STATUS_STEPS;
	}
	return { ...STATUS_STEPS, [status]: CODE_STEPS[code] };
}

async function send<T>(post: EmbedPost<T>, url: string): Promise<Response> {
	const fetchApi = post.fetch || globalThis.fetch;
	if (!fetchApi) {
		throw clientError(
			'NO_FETCH',
			'There is no fetch to send the request with.',
			`Pass fetch to ${post.caller}, or run it on Node 20 or later.`
		);
	}
	const init: RequestInit = {
		method: 'POST',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify(post.body)
	};
	try {
		return await fetchApi(url, init);
	} catch (error) {
		throw networkError(post.apiUrl, causeWithoutCredential(error, post.credential));
	}
}

async function textOf<T>(post: EmbedPost<T>, response: Response): Promise<string> {
	try {
		return await response.text();
	} catch (error) {
		throw networkError(post.apiUrl, causeWithoutCredential(error, post.credential));
	}
}

/**
 * Sends the request and answers what the helper answers, or throws a typed error. The answer's text loses any copy of
 * the credential before it is read, so no error carries it.
 */
export async function postEmbed<T>(post: EmbedPost<T>): Promise<T> {
	const url = post.apiUrl + post.path;
	const response = await send(post, url);
	const text = withoutCredential(await textOf(post, response), post.credential);
	const value = parseBody(text).value;
	if (!response.ok) {
		throw errorFromResponse(response, value, nextStepsOf(response.status, value));
	}
	if (!post.isAnswer(value)) {
		throw new EverTeamsError({
			status: response.status,
			code: 'UNEXPECTED_ANSWER',
			message: `The answer of ${url} is not ${post.answerName}.`,
			nextStep: "Check that apiUrl is the Ever Teams API's address (it ends with /api), not the web app's."
		});
	}
	return value;
}
