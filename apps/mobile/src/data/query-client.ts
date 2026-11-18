import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The one query client of the new app, created once outside React so a render never replaces it with its cache.
 * Answers are kept a day, the time the saved cache is trusted at the next start.
 */
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: ONE_DAY_MS,
			staleTime: 30 * 1000,
			retry: 2
		}
	}
});

export const QUERY_CACHE_MAX_AGE_MS = ONE_DAY_MS;

/** Queries pause while the phone has no connection, and refetch once it is back. */
export function followConnection(): void {
	onlineManager.setEventListener((setOnline) =>
		NetInfo.addEventListener((state) => {
			setOnline(state.isConnected === true);
		})
	);
}

function setFocusFromAppState(status: AppStateStatus): void {
	focusManager.setFocused(status === 'active');
}

/** A query refetches when the app comes back to the foreground, as a web page does when its tab is shown again. */
export function followAppState(): () => void {
	const subscription = AppState.addEventListener('change', setFocusFromAppState);
	return () => subscription.remove();
}
