import qs from 'qs';
import { createAccessToken, tokenOf } from './access-token';
import { withoutTrailingSlashes } from './address';
import { parseBody } from './answer-body';
import { embedScopeError, isEmbedToken } from './embed-scope';
import { clientError, errorFromResponse, networkError, NextStepsByStatus } from './error-mapping';
import { EverTeamsError } from './errors';
import { EverTeamsClientOptions } from './types';

/** One request of a client: its route under apiUrl, its query and body, and the tenant and organization it is for. */
export interface ClientCall {
	method: 'GET' | 'POST';
	path: string;
	query?: object;
	body?: object;
	tenantId?: string;
	organizationId?: string;
	/** The next steps this call gives in place of the general ones, by HTTP status. */
	nextSteps?: NextStepsByStatus;
	/** Whether an embed token reaches this route; with an embed token, any other call is refused without a request. */
	reachableByEmbedToken?: boolean;
}

export interface Transport {
	readonly apiUrl: string;
	/** Sends the call with the client's token and answers its JSON, or throws a typed error. */
	request<T>(call: ClientCall): Promise<T>;
}

const EXCHANGE_PATH = '/auth/api-token/exchange';

const PERSONAL_TOKEN_STEPS: NextStepsByStatus = {
	401:
		'The personal API token is unknown, expired or revoked: create a new one in Settings > API tokens in the ' +
		'web app.',
	404:
		'This API does not offer personal API tokens: ask its administrator to turn them on ' +
		'(GAUZY_USER_API_TOKENS_ENABLED).'
};

function assertOptions(options: EverTeamsClientOptions): void {
	const hasApiUrl = typeof options.apiUrl === 'string' && options.apiUrl.length > 0;
	if (!hasApiUrl) {
		throw clientError(
			'CLIENT_OPTIONS',
			'createClient needs apiUrl.',
			"Pass apiUrl, the API's address ending with /api, for example process.env.EVER_TEAMS_API_URL."
		);
	}
	if (!options.token && !options.getToken) {
		throw clientError(
			'CLIENT_OPTIONS',
			'createClient needs token or getToken.',
			'Pass token (a personal API token from Settings > API tokens in the web app, or an embed token), or getToken.'
		);
	}
}

export function createTransport(options: EverTeamsClientOptions): Transport {
	assertOptions(options);
	const apiUrl = withoutTrailingSlashes(options.apiUrl);
	const accessToken = createAccessToken(options, exchangePersonalToken);

	function urlOf(call: ClientCall): string {
		const url = apiUrl + call.path;
		if (!call.query) {
			return url;
		}
		const query = qs.stringify(call.query, { skipNulls: true });
		if (!query) {
			return url;
		}
		return `${url}?${query}`;
	}

	function headersOf(call: ClientCall, token: string | null): Headers {
		const headers = new Headers(options.headers);
		headers.set('Accept', 'application/json');
		if (call.body) {
			headers.set('Content-Type', 'application/json');
		}
		if (token) {
			headers.set('Authorization', `Bearer ${token}`);
		}
		// Gauzy's tenant guard opens its header path for these two spellings only: `tenant-id` or `Tenant-Id`.
		if (call.tenantId) {
			headers.set('tenant-id', call.tenantId);
		}
		if (call.organizationId) {
			headers.set('organization-id', call.organizationId);
		}
		return headers;
	}

	async function send(call: ClientCall, token: string | null): Promise<Response> {
		const fetchApi = options.fetch || globalThis.fetch;
		if (!fetchApi) {
			throw clientError(
				'NO_FETCH',
				'There is no fetch to send requests with.',
				'Pass fetch to createClient, or run the client on Node 20 or later or in a browser.'
			);
		}
		const init: RequestInit = { method: call.method, headers: headersOf(call, token) };
		if (call.body) {
			init.body = JSON.stringify(call.body);
		}
		try {
			return await fetchApi(urlOf(call), init);
		} catch (error) {
			throw networkError(apiUrl, error);
		}
	}

	async function textOf(response: Response): Promise<string> {
		try {
			return await response.text();
		} catch (error) {
			throw networkError(apiUrl, error);
		}
	}

	async function read<T>(response: Response, nextSteps?: NextStepsByStatus): Promise<T> {
		const body = parseBody(await textOf(response));
		if (!response.ok) {
			throw errorFromResponse(response, body.value, nextSteps);
		}
		if (!body.isJson) {
			throw new EverTeamsError({
				status: response.status,
				code: 'NOT_JSON',
				message: `The answer of ${apiUrl} is not JSON.`,
				nextStep: "Check that apiUrl is the API's address (it ends with /api), not the web app's."
			});
		}
		return body.value as T;
	}

	async function exchangePersonalToken(personalToken: string): Promise<string> {
		const call: ClientCall = {
			method: 'POST',
			path: EXCHANGE_PATH,
			body: { token: personalToken, organizationId: options.organizationId }
		};
		const response = await send(call, null);
		const answer = await read<unknown>(response, PERSONAL_TOKEN_STEPS);
		return tokenOf(answer);
	}

	// The refused answer's body is read and dropped, so its connection is free for the retry.
	const discard = (response: Response) => response.text().then(undefined, () => undefined);

	async function request<T>(call: ClientCall): Promise<T> {
		const used = accessToken.current();
		const token = await used;
		const refusedToEmbedToken = !call.reachableByEmbedToken && isEmbedToken(token);
		if (refusedToEmbedToken) {
			throw embedScopeError(call.nextSteps);
		}
		const response = await send(call, token);
		if (response.status !== 401) {
			return read<T>(response, call.nextSteps);
		}
		const renewed = accessToken.renew(used);
		if (!renewed) {
			return read<T>(response, call.nextSteps);
		}
		await discard(response);
		const retried = await send(call, await renewed);
		return read<T>(retried, call.nextSteps);
	}

	return { apiUrl, request };
}
