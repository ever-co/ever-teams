import { clientError } from './error-mapping';
import { EverTeamsClientOptions } from './types';

// Gauzy's personal API tokens start with it (USER_API_TOKEN_PREFIX): they are exchanged, never sent as a bearer.
const PERSONAL_TOKEN_PREFIX = 'gzp_';

export interface AccessToken {
	/** The access token requests send, asked for or exchanged once and kept. */
	current(): Promise<string>;
	/** After the API refused `used` (401): another access token, or null when nothing can give one. */
	renew(used: Promise<string>): Promise<string> | null;
}

export const isPersonalApiToken = (token: string): boolean => token.startsWith(PERSONAL_TOKEN_PREFIX);

const noToken = () =>
	clientError(
		'NO_TOKEN',
		'The client has no token to send.',
		'Pass token, or a getToken that resolves to a token (a string or { token }).'
	);

const nonEmpty = (token: string): string => {
	if (!token) {
		throw noToken();
	}
	return token;
};

/** The token of a getToken's or an exchange's answer: a string, or an object holding it. */
export function tokenOf(answer: unknown): string {
	if (typeof answer === 'string') {
		return nonEmpty(answer);
	}
	const isObject = typeof answer === 'object' && answer !== null;
	if (isObject && 'token' in answer) {
		const token = answer.token;
		if (typeof token === 'string') {
			return nonEmpty(token);
		}
	}
	throw noToken();
}

export function createAccessToken(
	options: Pick<EverTeamsClientOptions, 'token' | 'getToken'>,
	exchange: (personalToken: string) => Promise<string>
): AccessToken {
	// Dropped after a 401 when getToken can give the next tokens; a personal token is kept and exchanged again.
	let fixedToken = options.token;
	let access: Promise<string> | null = null;

	async function credential(): Promise<string> {
		if (fixedToken) {
			return fixedToken;
		}
		if (options.getToken) {
			const answer = await options.getToken();
			return tokenOf(answer);
		}
		throw noToken();
	}

	async function resolve(): Promise<string> {
		const given = await credential();
		if (isPersonalApiToken(given)) {
			return exchange(given);
		}
		return given;
	}

	const forget = (pending: Promise<string>) => {
		if (access === pending) {
			access = null;
		}
	};

	function current(): Promise<string> {
		if (access) {
			return access;
		}
		const pending = resolve();
		access = pending;
		// A failed ask is not kept: the next request asks again.
		pending.then(undefined, () => forget(pending));
		return pending;
	}

	function renew(used: Promise<string>): Promise<string> | null {
		const renewedMeanwhile = access !== null && access !== used;
		if (renewedMeanwhile) {
			return current();
		}
		const keepsPersonalToken = fixedToken !== undefined && isPersonalApiToken(fixedToken);
		if (!keepsPersonalToken && !options.getToken) {
			return null;
		}
		if (!keepsPersonalToken) {
			fixedToken = undefined;
		}
		access = null;
		return current();
	}

	return { current, renew };
}
