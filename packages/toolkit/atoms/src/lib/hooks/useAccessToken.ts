import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { accessTokenAtom } from '../teams-jotai/atoms/teams-atoms';

/**
 * useAccessToken hook returns an object with the current access token
 * and a setter function to update it.
 *
 * If NEXT_PUBLIC_TOKEN is set, it will be used as the initial token.
 * Otherwise, the hook will check local storage for a token and use that.
 * If no token is found in either, the hook will return a default value of null.
 *
 * @returns {Object} { accessToken, setAccessToken }
 * @returns {string | null} accessToken The current access token.
 * @returns {Function} setAccessToken A function to update the access token.
 */

export const useAccessToken = () => {
	const [accessToken, setAccessToken] = useAtom(accessTokenAtom);

	useEffect(() => {
		if (!accessToken) {
			// Then check localStorage
			const store = localStorage.getItem('_teams-store');
			if (store) {
				try {
					const parsedStore = JSON.parse(store);
					if (parsedStore?.persist?.token) {
						// Check if token has expired
						const expiryTime = parsedStore.persist.expiry;

						if (expiryTime && Date.now() > expiryTime) {
							const resetStore = {
								app: { user: null },
								persist: { token: null }
							};
							localStorage.setItem('_teams-store', JSON.stringify(resetStore));
							return;
						}

						setAccessToken(parsedStore.persist.token);
						return;
					}
				} catch (error) {
					console.error('Error parsing _teams-store from localStorage:', error);
				}
			}
		}
	}, [accessToken, setAccessToken]);

	return { accessToken, setAccessToken };
};
