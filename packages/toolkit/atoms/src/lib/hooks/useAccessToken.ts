import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { accessTokenAtom } from '../teams-jotai/atoms/teams-atoms';
import { useKitOptions } from '@components/teams-provider/kit-options';
import { readStoredToken } from '@lib/session/stored-session';
import { apiUrlOf } from '@lib/utils/api-url';

/**
 * useAccessToken hook returns an object with the current access token
 * and a setter function to update it.
 *
 * Without a token in memory, the hook reads the one saved in the browser for the API address of its provider: a
 * session saved for another server is never read. If none is found, the token stays empty.
 *
 * @returns {Object} { accessToken, setAccessToken }
 * @returns {string | null} accessToken The current access token.
 * @returns {Function} setAccessToken A function to update the access token.
 */

export const useAccessToken = () => {
	const [accessToken, setAccessToken] = useAtom(accessTokenAtom);
	const { hostSignIn, api } = useKitOptions();

	useEffect(() => {
		// The host's getToken gives the token, in memory: none is read back from the browser's storage.
		if (hostSignIn) {
			return;
		}
		if (accessToken) {
			return;
		}
		const storedToken = readStoredToken(apiUrlOf(api));
		if (storedToken) {
			setAccessToken(storedToken);
		}
	}, [accessToken, setAccessToken, hostSignIn, api]);

	return { accessToken, setAccessToken };
};
