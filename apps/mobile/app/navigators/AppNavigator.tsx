/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import {
	NavigationContainer,
	NavigatorScreenParams // @demo remove-current-line
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StackScreenProps } from '@react-navigation/stack';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import Config from '../config';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useStores } from '../models'; // @demo remove-current-line
import {
	LoginScreen // @demo remove-current-line
} from '../screens';
import {
	AuthenticatedDrawerParamList,
	AuthenticatedNavigator,
	AuthenticatedTabParamList
} from './AuthenticatedNavigator';
import { DemoTabParamList } from './DemoNavigator'; // @demo remove-current-line
import { navigationRef, useBackButtonHandler } from './navigationUtilities';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * This type allows TypeScript to know what routes are defined in this navigator
 * as well as what properties (if any) they might take when navigating to them.
 *
 * If no params are allowed, pass through `undefined`. Generally speaking, we
 * recommend using your MobX-State-Tree store(s) to keep application state
 * rather than passing state through navigation params.
 *
 * For more information, see this documentation:
 *   https://reactnavigation.org/docs/params/
 *   https://reactnavigation.org/docs/typescript#type-checking-the-navigator
 *   https://reactnavigation.org/docs/typescript/#organizing-types
 */
export type AppStackParamList = {
	Welcome: undefined;
	Login: undefined; // @demo remove-current-line
	Demo: NavigatorScreenParams<DemoTabParamList>; // @demo remove-current-line
	// 🔥 Your screens go here
	Authenticated: NavigatorScreenParams<AuthenticatedTabParamList & AuthenticatedDrawerParamList>; // @demo remove-current-line
};

/**
 * This is a list of all the route names that will exit the app if the back button
 * is pressed while in that screen. Only affects Android.
 */
const exitRoutes = Config.exitRoutes;

export type AppStackScreenProps<T extends keyof AppStackParamList> = StackScreenProps<AppStackParamList, T>;

// Documentation: https://reactnavigation.org/docs/stack-navigator/
const Stack = createNativeStackNavigator<AppStackParamList>();

const AppStack = observer(function AppStack() {
	// @demo remove-block-start
	const {
		authenticationStore: { isAuthenticated }
	} = useStores();

	// @demo remove-block-end
	return (
		<Stack.Navigator
			screenOptions={{ headerShown: false }}
			initialRouteName={isAuthenticated ? 'Authenticated' : 'Login'} // @demo remove-current-line
		>
			{/* @demo remove-block-start */}
			{isAuthenticated ? (
				<>
					{/* @demo remove-block-end */}
					{/* <Stack.Screen name="Welcome" component={WelcomeScreen} /> */}
					{/* @demo remove-block-start */}
					{/* <Stack.Screen name="Demo" component={DemoNavigator} /> */}
					{/* @app custom-block */}
					<Stack.Screen name="Authenticated" component={AuthenticatedNavigator} />
				</>
			) : (
				<>
					<Stack.Screen name="Login" component={LoginScreen} />
				</>
			)}
			{/* @demo remove-block-end */}
			{/** 🔥 Your screens go here */}
		</Stack.Navigator>
	);
});

interface NavigationProps extends Partial<React.ComponentProps<typeof NavigationContainer>> {}

export const AppNavigator = observer(function AppNavigator(props: NavigationProps) {
	const {
		authenticationStore: { isDarkMode, toggleTheme }
	} = useStores();

	useEffect(() => {
		const checkAppInstallAndSetTheme = async () => {
			const firstTimeAppOpen = await AsyncStorage.getItem('initialThemeSetupDone');

			if (!firstTimeAppOpen) {
				const colorsScheme = Appearance.getColorScheme();
				if (colorsScheme === 'dark' && !isDarkMode) {
					toggleTheme();
				} else if (colorsScheme === 'light' && isDarkMode) {
					toggleTheme();
				}
				await AsyncStorage.setItem('initialThemeSetupDone', JSON.stringify(true));
			}
		};
		checkAppInstallAndSetTheme();
	}, []);

	useBackButtonHandler((routeName) => exitRoutes.includes(routeName));
	const queryClient = new QueryClient();
	return (
		<NavigationContainer ref={navigationRef} {...props}>
			<QueryClientProvider client={queryClient}>
				<AppStack />
			</QueryClientProvider>
		</NavigationContainer>
	);
});
