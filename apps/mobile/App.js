// This is the entry point if you run `yarn expo:start`
// If you run `yarn ios` or `yarn android`, it'll use ./index.js instead.
import App from './app/app.tsx';
import React from 'react';
import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import EStyleSheet from 'react-native-extended-stylesheet';
import * as Sentry from '@sentry/react-native';

// Sentry initialization moved to app/utils/crash-reporting.ts

EStyleSheet.build({
	// always call EStyleSheet.build() even if you don't use global variables!
	$textColor: '#0275d8'
});

SplashScreen.preventAutoHideAsync();

function IgniteApp() {
	return <App hideSplashScreen={SplashScreen.hideAsync} />;
}

const WrappedApp = Sentry.wrap(IgniteApp);
registerRootComponent(WrappedApp);
export default WrappedApp;
