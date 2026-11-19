import { useSyncExternalStore } from 'react';
import { apiConfigManager } from '@ever-teams/api';

type Subscribe = (listener: () => void) => () => void;

const readPageApiUrl = (): string | undefined => apiConfigManager.getConfig().apiUrl;
const readNoAddress = (): string | undefined => undefined;
const hearNothing: Subscribe = () => () => {};

// Each setConfig() that changes the page's configuration. An @ever-teams/api from before subscribe() has nothing to
// tell: the address stays the one read first.
const hearPageConfig: Subscribe = (listener) => {
	if (typeof apiConfigManager.subscribe !== 'function') {
		return () => {};
	}
	return apiConfigManager.subscribe(listener);
};

/**
 * The page's address (apiConfigManager) while `followsPage`, kept current: a setConfig() that changes it, from the host
 * or from another TeamsProvider, renders the caller again. Undefined otherwise, and nothing is heard.
 */
export function usePageApiUrl(followsPage: boolean): string | undefined {
	let subscribe = hearNothing;
	let read = readNoAddress;
	if (followsPage) {
		subscribe = hearPageConfig;
		read = readPageApiUrl;
	}
	return useSyncExternalStore(subscribe, read, read);
}
