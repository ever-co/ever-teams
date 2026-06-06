import { IServerError } from '@ever-teams/toolkit-types';
import { ApiCall } from '../fetch';

interface TokenResponse {
	token: string;
}

/**
 * Refreshes an authentication token using a refresh token.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.refresh_token - The refresh token used to obtain new access tokens
 * @returns {Promise<TokenResponse | IServerError>} A promise that resolves to either:
 *   - TokenResponse: Object containing new access token
 *   - IServerError: Error object with message/error details if the refresh failed
 *
 * @throws {Error} If refresh_token is not provided
 *
 */
export async function refreshToken({
	refresh_token
}: {
	refresh_token: string;
}): Promise<TokenResponse | IServerError> {
	try {
		if (!refresh_token) {
			throw new Error('Refresh token is required');
		}
		const newTokens = await ApiCall<TokenResponse>({
			path: '/auth/refresh-token',
			method: 'POST',
			body: { refresh_token }
		});

		if ('error' in newTokens || 'message' in newTokens) {
			return newTokens as IServerError;
		}

		if ('data' in newTokens) {
			return newTokens.data;
		}

		return { message: 'Unexpected response format', error: JSON.stringify(newTokens) } as IServerError;
	} catch (error) {
		return { error: (error as Error).message } as IServerError;
	}
}
