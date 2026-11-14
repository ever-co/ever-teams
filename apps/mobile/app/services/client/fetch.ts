import { showMessage } from 'react-native-flash-message';
import Config from '../../config';
import { translate } from '../../i18n/translate';
import { renewSession, RenewalMeans, sessionTokens, tokenToSend } from './session';

type ServerRequest = {
	path: string;
	method: 'POST' | 'GET' | 'PUT' | 'DELETE';
	body?: any;
	bearer_token?: string;
	init?: RequestInit;
	tenantId?: string;
};

/** Sends the request once and answers whatever the API answers. */
function send<T>({ path, method, body, init, bearer_token, tenantId }: ServerRequest) {
	const headers: HeadersInit = {
		'Content-Type': 'application/json',
		Accept: 'application/json'
	};

	if (bearer_token) {
		headers.authorization = `Bearer ${bearer_token}`;
	}

	if (tenantId) {
		headers['tenant-id'] = tenantId;
	}

	const datas: { body?: string } = {};
	if (body) {
		datas.body = JSON.stringify(body);
	}

	return fetch((Config.API_URL || '') + path, {
		...datas,
		...(init || {}),
		headers: {
			...headers,
			...(init?.headers || {})
		},
		method
	}).then(async (res) => {
		return {
			data: (await res.json().catch(console.error)) as T,
			response: res
		};
	});
}

/** What a renewal of the session needs from this client (session.ts). */
const renewalMeans: RenewalMeans = {
	askForNewPair: (refresh_token) =>
		send<{ token?: string; refresh_token?: string }>({
			path: '/auth/refresh-token',
			method: 'POST',
			body: { refresh_token }
		}).then(({ data, response }) => ({ status: response.status, pair: data ?? undefined })),
	tellSessionEnded: () => {
		showMessage({
			message: translate('session.endedTitle'),
			description: translate('session.endedMessage'),
			type: 'warning',
			duration: 6000
		});
	}
};

/**
 * Renews the session now, for a screen that needs a fresh token. A request the API refuses does not need this: it
 * is renewed and sent again by `serverFetch`.
 */
export function renewSessionNow() {
	return renewSession(null, renewalMeans);
}

/**
 * Sends a request to the API. One the API refuses with 401 because the session's access token expired renews the
 * session with the refresh token and is sent again once, with the new token (session.ts). Any other answer, refusals
 * included, is answered as it is: the callers read `response`.
 */
export function serverFetch<T>(request: ServerRequest) {
	// A screen may still name a token a renewal has replaced: it is sent with the session's
	const token = request.bearer_token ? tokenToSend(request.bearer_token) : undefined;

	return send<T>({ ...request, bearer_token: token }).then(async (answer) => {
		if (answer.response.status !== 401 || !token) {
			return answer;
		}
		const renewal = await renewSession(token, renewalMeans);
		const renewedToken = sessionTokens().accessToken;
		if (renewal !== 'renewed' || !renewedToken) {
			return answer;
		}
		return send<T>({ ...request, bearer_token: renewedToken });
	});
}
