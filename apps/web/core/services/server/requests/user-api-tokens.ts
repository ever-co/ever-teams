import type { TCreateUserApiTokenInput } from '@/core/types/schemas/user/user-api-token.schema';
import { serverFetch } from '../fetch';

interface IUserApiTokenCall {
	bearer_token: string;
	tenantId: string;
}

/**
 * Gauzy's `GET /user-api-tokens/config`: whether the server has personal API tokens on. A refusal keeps its HTTP status
 * even without a body, so that an API without the route (its 404) still reads as tokens off.
 */
export function getUserApiTokenConfigRequest({ bearer_token, tenantId }: IUserApiTokenCall) {
	return serverFetch<unknown>({
		path: '/user-api-tokens/config',
		method: 'GET',
		bearer_token,
		tenantId,
		keepsStatusOnError: true
	});
}

/** Gauzy's `GET /user-api-tokens`: the caller's own tokens that are not revoked, never their secrets. */
export function getUserApiTokensRequest({ bearer_token, tenantId }: IUserApiTokenCall) {
	return serverFetch<unknown>({ path: '/user-api-tokens', method: 'GET', bearer_token, tenantId });
}

/** Gauzy's `POST /user-api-tokens`: creates a token for the caller and answers its secret this once. */
export function createUserApiTokenRequest({
	input,
	bearer_token,
	tenantId
}: IUserApiTokenCall & { input: TCreateUserApiTokenInput }) {
	return serverFetch<unknown>({
		path: '/user-api-tokens',
		method: 'POST',
		body: input,
		bearer_token,
		tenantId,
		init: { cache: 'no-store' }
	});
}

/** Gauzy's `DELETE /user-api-tokens/:id`: revokes one of the caller's own tokens at once. */
export function revokeUserApiTokenRequest({ id, bearer_token, tenantId }: IUserApiTokenCall & { id: string }) {
	return serverFetch<unknown>({
		path: `/user-api-tokens/${encodeURIComponent(id)}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}
