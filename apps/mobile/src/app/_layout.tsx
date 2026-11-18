import '../../app/i18n';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { getDefaultStore, useAtomValue } from 'jotai';
import { holdSession } from '../../app/services/client/session';
import { followAppState, followConnection, QUERY_CACHE_MAX_AGE_MS, queryClient } from '../data/query-client';
import { queryPersister } from '../data/query-persister';
import { navigationThemeFor } from '../navigation/navigation-theme';
import { statusBarStyleFor } from '../navigation/status-bar-style';
import { useLoadSession } from '../state/load-session';
import { sessionHolderOf } from '../state/session-holder';
import { themePreferenceAtom } from '../state/preferences';
import { useTheme } from '../theme';

followConnection();

const persistOptions = { persister: queryPersister, maxAge: QUERY_CACHE_MAX_AGE_MS };

function forgetLoadedData(): void {
	queryClient.clear();
}

// The HTTP client renews the session through it, as the current app's authentication store lets it
function holdTheSession(): () => void {
	return holdSession(sessionHolderOf(getDefaultStore(), forgetLoadedData));
}

export default function RootLayout() {
	useLoadSession();
	useEffect(() => followAppState(), []);
	useEffect(holdTheSession, []);
	const preference = useAtomValue(themePreferenceAtom);
	const theme = useTheme(preference);

	return (
		<GestureHandlerRootView style={styles.root}>
			<PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
				<ThemeProvider value={navigationThemeFor(theme)}>
					<StatusBar style={statusBarStyleFor(theme.scheme)} />
					<Stack screenOptions={{ headerShown: false }} />
				</ThemeProvider>
			</PersistQueryClientProvider>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1
	}
});
