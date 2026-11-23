import { parseBody } from '../client/answer-body';
import {
	clientError,
	codeOf,
	errorFromResponse,
	isRecord,
	networkError,
	NextStepsByStatus
} from '../client/error-mapping';
import { EverTeamsError } from '../client/errors';
import { checkedApiUrl, isFilled, optionsError } from '../client/option-checks';

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
		"The credential's client is archived or deleted: restore the client from the web app's client list, or use a " +
		'credential of another client.',
	EMBED_EXCHANGE_LIMITED:
		'Too many refused credentials came from this address: check the credential you send, then try again in a ' +
		'minute.'
};

/** apiUrl without its trailing slashes, once it is an http or https address. */
export function apiUrlOf(caller: string, apiUrl: unknown): string {
	return checkedApiUrl(caller, apiUrl, API_URL_STEP);
}

/** The credential, without the spaces or line break a secret store may add around it. */
export function credentialOf(caller: string, credential: unknown): string {
	if (!isFilled(credential)) {
		throw optionsError(`${caller} needs credential, the embed credential.`, CREDENTIAL_STEP);
	}
	return credential.trim();
}

const withoutCredential = (text: string, credential: string): string => text.split(credential).join(REDACTED);

// How many causes of a thrown error are copied: enough for fetch failed > connect ECONNREFUSED.
const MAX_CAUSES = 3;

/**
 * What fetch threw, copied from its name, message and code, and the same of its causes, without the credential. The
 * original is never kept: a custom fetch may hold the request, whose body holds the credential, in any other field.
 */
function causeWithoutCredential(error: unknown, credential: string, depth = 0): Error {
	if (!(error instanceof Error)) {
		return new Error(withoutCredential(String(error), credential));
	}
	const copy: Error & { code?: string; cause?: unknown } = new Error(withoutCredential(error.message, credential));
	copy.name = withoutCredential(error.name, credential);
	const { code, cause } = error as { code?: unknown; cause?: unknown };
	if (typeof code === 'string') {
		copy.code = withoutCredential(code, credential);
	}
	if (cause !== undefined && depth < MAX_CAUSES) {
		copy.cause = causeWithoutCredential(cause, credential, depth + 1);
	}
	return copy;
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

// The parsed answer with the credential out of every text in it, keys too: a JSON escape (\u0067 for g) would have
// kept a copy of it out of reach of the raw text's redaction.
function valueWithoutCredential(value: unknown, credential: string): unknown {
	if (typeof value === 'string') {
		return withoutCredential(value, credential);
	}
	if (Array.isArray(value)) {
		return value.map((item) => valueWithoutCredential(item, credential));
	}
	if (isRecord(value)) {
		const copy: { [key: string]: unknown } = {};
		for (const key of Object.keys(value)) {
			// Defined, not assigned: a "__proto__" key stays a key, as JSON.parse made it, and never sets the prototype.
			Object.defineProperty(copy, withoutCredential(key, credential), {
				value: valueWithoutCredential(value[key], credential),
				enumerable: true,
				writable: true,
				configurable: true
			});
		}
		return copy;
	}
	return value;
}

/**
 * Sends the request and answers what the helper answers, or throws a typed error. The answer loses any copy of the
 * credential before it is read, as text and once parsed, so no error carries it.
 */
export async function postEmbed<T>(post: EmbedPost<T>): Promise<T> {
	const url = post.apiUrl + post.path;
	const response = await send(post, url);
	const text = withoutCredential(await textOf(post, response), post.credential);
	const value = valueWithoutCredential(parseBody(text).value, post.credential);
	if (!response.ok) {
		// The status text is the message of a refusal with no text in its body: it loses the credential too.
		const head = {
			status: response.status,
			statusText: withoutCredential(response.statusText, post.credential),
			headers: response.headers
		};
		throw errorFromResponse(head, value, nextStepsOf(response.status, value));
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
