// first: the language starts before any screen is loaded
import { useLanguageStarted } from '../../app/i18n';
import '../../app/utils/ignore-warnings';
import React, { useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import EStyleSheet from 'react-native-extended-stylesheet';
import { useFonts } from 'expo-font';
import { observer } from 'mobx-react-lite';
import { Provider as PaperProvider } from 'react-native-paper';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FlashMessage from 'react-native-flash-message';
import { ClickOutsideProvider } from 'react-native-click-outside';
import Config from '../../app/config';
import { useInitialRootStore, useStores } from '../../app/models';
import { markRouterMounted } from '../../app/navigators/routes';
import { ErrorBoundary } from '../../app/screens/error-screen/error-boundary';
import { tellSessionEnded } from '../../app/services/client/fetch';
import { AppQueryProvider } from '../../app/services/client/query-provider';
import { setupReactotron } from '../../app/services/reactotron';
import { customDarkTheme, customFontsToLoad, customLightTheme } from '../../app/theme';
import { navigationThemeFor } from '../navigation/navigation-theme';
import { themeFor } from '../theme/use-theme';
import { colorSchemeOf } from '../theme/color-scheme';
import { initCrashReporting } from '../../app/utils/crash-reporting';
import { useOnceReady } from '../../app/utils/use-once-ready';
import { useSessionFromStore } from '../state/session-from-store';

// What App.js and app/app.tsx did before a screen rendered, in the same order
initCrashReporting();
setupReactotron({
	clearOnLoad: true,
	host: 'localhost',
	useAsyncStorage: true,
	logInitialState: true,
	logSnapshots: false
});
EStyleSheet.build({
	// always call EStyleSheet.build() even if you don't use global variables!
	$textColor: '#0275d8'
});
void SplashScreen.preventAutoHideAsync();
markRouterMounted();

function hideSplashScreen(): void {
	void SplashScreen.hideAsync();
}

/**
 * The root of the app: the current app's state, theme and providers around Expo Router's stack. Until the store, the
 * fonts and the language are ready it draws nothing, over the native splash screen, as before.
 */
/** The navigators' theme on the web's tokens: page, cards, lines and the brand color of their own controls. */
function navigatorsThemeOf(dark: boolean) {
	const scheme = colorSchemeOf(dark);
	return navigationThemeFor(themeFor(scheme));
}

const RootLayout = observer(function RootLayout() {
	const {
		authenticationStore: {
			isDarkMode,
			followsSystemTheme,
			isAuthenticated,
			authToken,
			refreshToken,
			tenantId,
			organizationId
		}
	} = useStores();
	const [areFontsLoaded] = useFonts(customFontsToLoad);
	const systemColorScheme = useColorScheme();
	const [sessionEnded, setSessionEnded] = useState(false);
	const languageStarted = useLanguageStarted();

	const { rehydrated } = useInitialRootStore(({ sessionEnded: ended }) => {
		// a little longer than the store takes, so the splash screen does not flicker
		setTimeout(hideSplashScreen, 500);
		setSessionEnded(ended);
	});

	// the new Home (EXPO_PUBLIC_APP_SHELL=next) reads the session of the store
	useSessionFromStore(rehydrated, { accessToken: authToken, refreshToken, tenantId, organizationId });

	const ready = rehydrated && areFontsLoaded && languageStarted;
	// told on the first render that shows the message host, however long the fonts take
	useOnceReady(sessionEnded, ready, tellSessionEnded);

	if (!ready) {
		return null;
	}

	const systemIsDark = systemColorScheme === 'dark';
	const dark = followsSystemTheme ? systemIsDark : isDarkMode;
	const theme = dark ? customDarkTheme : customLightTheme;
	return (
		<GestureHandlerRootView style={styles.root}>
			<SafeAreaProvider initialMetrics={initialWindowMetrics}>
				<PaperProvider theme={theme}>
					<ErrorBoundary catchErrors={Config.catchErrors}>
						<FlashMessage position="top" />
						<ClickOutsideProvider>
							<AppQueryProvider signedIn={isAuthenticated}>
								<ThemeProvider value={navigatorsThemeOf(dark)}>
									<Stack screenOptions={{ headerShown: false }} />
								</ThemeProvider>
							</AppQueryProvider>
						</ClickOutsideProvider>
					</ErrorBoundary>
				</PaperProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
});

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
	root: {
		flex: 1
	}
});
